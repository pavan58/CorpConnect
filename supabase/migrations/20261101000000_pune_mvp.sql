-- =============================================================================
-- CorpConnect — Pune MVP (Phase 1) schema
--
-- Identity model: corporate email + 6-digit OTP only. No ID cards, payslips or
-- document uploads anywhere in the schema. A profile starts as 'unverified' and
-- is flipped to 'verified_employee' by the server (service role) once the OTP
-- sent to the corporate mailbox is confirmed.
--
-- Everything a client can touch is behind RLS. Tables the app only touches with
-- the service role (OTP codes, rate-limit log, domain requests, email
-- suppressions) have RLS on and NO policies, so anon/authenticated get nothing.
--
-- Helper functions live in `public` (hosted Supabase does not allow creating
-- functions in the `auth` schema).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Utility
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 1. Pune geography (reference data, readable by everyone)
-- ---------------------------------------------------------------------------
create table public.pune_zones (
  code       text primary key,
  name       text not null,
  sort_order smallint not null default 0
);

create table public.pune_hubs (
  code       text primary key,
  zone_code  text not null references public.pune_zones(code),
  name       text not null,
  sort_order smallint not null default 0
);

create table public.pickup_points (
  code       text primary key,
  zone_code  text not null references public.pune_zones(code),
  name       text not null,
  landmark   text,
  sort_order smallint not null default 0
);

-- ---------------------------------------------------------------------------
-- 2. Companies and the email domains that prove employment
-- ---------------------------------------------------------------------------
create table public.companies (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name        text not null,
  pune_campus text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.company_domains (
  domain     text primary key check (domain ~ '^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$'),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index company_domains_company_idx on public.company_domains(company_id);

-- Unknown (non-public) corporate domains land here for an admin to review.
-- Service role only.
create table public.company_domain_requests (
  id              uuid primary key default gen_random_uuid(),
  domain          text not null check (domain = lower(domain)),
  requested_email text not null check (requested_email = lower(requested_email)),
  company_hint    text,
  status          text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz,
  unique (domain, requested_email)
);

-- ---------------------------------------------------------------------------
-- 3. Profiles
-- ---------------------------------------------------------------------------
create type public.verification_status as enum ('unverified', 'verified_employee', 'suspended');
create type public.user_role as enum ('member', 'moderator', 'admin');

create table public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  full_name           text not null check (char_length(full_name) between 2 and 80),
  corporate_email     text not null unique check (corporate_email = lower(corporate_email) and corporate_email like '%_@_%._%'),
  company_id          uuid not null references public.companies(id),
  designation         text not null check (char_length(designation) between 2 and 80),
  work_location_pune  text not null references public.pune_hubs(code),
  city                text not null default 'Pune' check (city = 'Pune'),
  bio                 text check (char_length(bio) <= 500),
  verification_status public.verification_status not null default 'unverified',
  verified_at         timestamptz,
  role                public.user_role not null default 'member',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index profiles_company_idx on public.profiles(company_id);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Helper functions (SECURITY DEFINER so policies can call them without
--    recursing into the RLS of the tables they read)
-- ---------------------------------------------------------------------------
create or replace function public.is_verified_employee()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and verification_status = 'verified_employee'
  );
$$;

create or replace function public.current_role_is(p_roles public.user_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and verification_status = 'verified_employee'
      and role = any (p_roles)
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.current_role_is(array['admin']::public.user_role[]);
$$;

create or replace function public.is_moderator()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.current_role_is(array['moderator','admin']::public.user_role[]);
$$;

create or replace function public.my_company_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select company_id from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- 5. OTP + rate limiting + email suppression (service role only)
-- ---------------------------------------------------------------------------
create table public.email_otps (
  user_id    uuid not null references auth.users(id) on delete cascade,
  purpose    text not null check (purpose in ('verify_email', 'reset_password')),
  code_hash  text not null,
  attempts   smallint not null default 0,
  sent_at    timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (user_id, purpose)
);

create table public.otp_events (
  id         bigint generated always as identity primary key,
  identifier text not null,
  ip         inet,
  kind       text not null check (kind in ('send', 'verify')),
  created_at timestamptz not null default now()
);
create index otp_events_identifier_idx on public.otp_events(identifier, kind, created_at desc);
create index otp_events_ip_idx on public.otp_events(ip, kind, created_at desc);

-- Returns true and logs the attempt if under the limit:
--   5 per identifier per 15 min, 20 per IP per 15 min (per kind).
create or replace function public.check_otp_rate_limit(p_identifier text, p_ip text, p_kind text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_ip inet;
  v_id text := lower(btrim(p_identifier));
  v_since timestamptz := now() - interval '15 minutes';
begin
  begin
    v_ip := nullif(btrim(p_ip), '')::inet;
  exception when others then
    v_ip := null; -- malformed forwarded-for header: limit on identifier only
  end;
  if (select count(*) from public.otp_events
       where identifier = v_id and kind = p_kind and created_at > v_since) >= 5 then
    return false;
  end if;
  if v_ip is not null and (select count(*) from public.otp_events
       where ip = v_ip and kind = p_kind and created_at > v_since) >= 20 then
    return false;
  end if;
  insert into public.otp_events(identifier, ip, kind) values (v_id, v_ip, p_kind);
  delete from public.otp_events where created_at < now() - interval '1 day';
  return true;
end $$;

-- Server-side lookup used by registration / password reset (service role only).
create or replace function public.auth_user_id_by_email(p_email text)
returns uuid language sql stable security definer set search_path = '' as $$
  select id from auth.users where lower(email) = lower(btrim(p_email)) limit 1;
$$;

-- Addresses Resend reported as bounced / complained (via /api/webhooks/resend).
create table public.email_suppressions (
  email      text primary key check (email = lower(email)),
  reason     text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 6. Marketplace (electronics, Pune only)
-- ---------------------------------------------------------------------------
create table public.product_listings (
  id           uuid primary key default gen_random_uuid(),
  seller_id    uuid not null references public.profiles(id) on delete cascade,
  title        text not null check (char_length(title) between 4 and 100),
  description  text not null check (char_length(description) between 10 and 2000),
  category     text not null check (category in
                 ('laptops','phones','tablets','monitors','audio','wearables','cameras','gaming','accessories','other')),
  condition    text not null check (condition in ('new','like_new','good','fair')),
  price_inr    integer not null check (price_inr between 0 and 1000000),
  negotiable   boolean not null default false,
  zone_code    text not null references public.pune_zones(code),
  pickup_point text not null references public.pickup_points(code),
  city         text not null default 'Pune' check (city = 'Pune'),
  status       text not null default 'active' check (status in ('active','reserved','sold','removed')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index product_listings_browse_idx on public.product_listings(status, zone_code, category, created_at desc);
create index product_listings_seller_idx on public.product_listings(seller_id);
create trigger product_listings_updated_at before update on public.product_listings
  for each row execute function public.set_updated_at();

-- The pickup point must be inside the listing's zone.
create or replace function public.check_listing_pickup()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.pickup_points
                 where code = new.pickup_point and zone_code = new.zone_code) then
    raise exception 'pickup point % is not in zone %', new.pickup_point, new.zone_code
      using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger product_listings_pickup before insert or update of zone_code, pickup_point
  on public.product_listings for each row execute function public.check_listing_pickup();

create table public.product_images (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.product_listings(id) on delete cascade,
  storage_path text not null unique,
  position     smallint not null default 0 check (position between 0 and 5),
  created_at   timestamptz not null default now()
);
create index product_images_listing_idx on public.product_images(listing_id, position);

create or replace function public.check_listing_image_limit()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.product_images where listing_id = new.listing_id) >= 6 then
    raise exception 'a listing can have at most 6 photos' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger product_images_limit before insert on public.product_images
  for each row execute function public.check_listing_image_limit();

create table public.saved_listings (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.product_listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- ---------------------------------------------------------------------------
-- 7. Jobs + structured referrals
-- ---------------------------------------------------------------------------
create table public.job_listings (
  id              uuid primary key default gen_random_uuid(),
  posted_by       uuid not null references public.profiles(id) on delete cascade,
  company_id      uuid not null references public.companies(id),
  title           text not null check (char_length(title) between 4 and 120),
  description     text not null check (char_length(description) between 30 and 5000),
  employment_type text not null check (employment_type in ('full_time','contract','internship')),
  work_mode       text not null check (work_mode in ('onsite','hybrid','remote')),
  experience_min  smallint not null default 0 check (experience_min between 0 and 40),
  experience_max  smallint not null default 0 check (experience_max between 0 and 40),
  hub_code        text not null references public.pune_hubs(code),
  city            text not null default 'Pune' check (city = 'Pune'),
  apply_url       text check (apply_url is null or apply_url ~* '^https://'),
  status          text not null default 'open' check (status in ('open','closed')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (experience_max >= experience_min)
);
create index job_listings_browse_idx on public.job_listings(status, hub_code, created_at desc);
create index job_listings_company_idx on public.job_listings(company_id);
create trigger job_listings_updated_at before update on public.job_listings
  for each row execute function public.set_updated_at();

create table public.referral_requests (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid not null references public.job_listings(id) on delete cascade,
  requester_id  uuid not null references public.profiles(id) on delete cascade,
  referrer_id   uuid not null references public.profiles(id) on delete cascade,
  message       text not null check (char_length(message) between 20 and 1500),
  resume_url    text check (resume_url is null or resume_url ~* '^https://'),
  status        text not null default 'requested'
                  check (status in ('requested','in_review','referred','declined','withdrawn')),
  referrer_note text check (char_length(referrer_note) <= 500),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (job_id, requester_id)
);
create index referral_requests_referrer_idx on public.referral_requests(referrer_id, status);
create index referral_requests_requester_idx on public.referral_requests(requester_id);
create trigger referral_requests_updated_at before update on public.referral_requests
  for each row execute function public.set_updated_at();

-- referrer_id always comes from the job; requester cannot refer themselves;
-- only open jobs accept requests; status transitions are role-checked.
create or replace function public.referral_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_job public.job_listings%rowtype;
  v_uid uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    select * into v_job from public.job_listings where id = new.job_id;
    if not found or v_job.status <> 'open' then
      raise exception 'job is not open for referrals' using errcode = 'check_violation';
    end if;
    if v_job.posted_by = new.requester_id then
      raise exception 'you cannot request a referral on your own job' using errcode = 'check_violation';
    end if;
    new.referrer_id := v_job.posted_by;
    new.status := 'requested';
    new.referrer_note := null;
    return new;
  end if;

  -- UPDATE
  if new.job_id <> old.job_id or new.requester_id <> old.requester_id or new.referrer_id <> old.referrer_id then
    raise exception 'immutable referral fields' using errcode = 'check_violation';
  end if;
  if v_uid is null then
    return new; -- service role
  end if;
  if v_uid = old.requester_id then
    if new.status not in (old.status, 'withdrawn') or new.referrer_note is distinct from old.referrer_note then
      raise exception 'requester can only withdraw' using errcode = 'check_violation';
    end if;
    if new.status = 'withdrawn' and old.status in ('referred','declined') then
      raise exception 'request already closed' using errcode = 'check_violation';
    end if;
  elsif v_uid = old.referrer_id then
    if new.status not in ('in_review','referred','declined') or old.status = 'withdrawn'
       or new.message <> old.message or new.resume_url is distinct from old.resume_url then
      raise exception 'invalid referrer update' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;
create trigger referral_requests_guard before insert or update on public.referral_requests
  for each row execute function public.referral_guard();

-- ---------------------------------------------------------------------------
-- 8. Communities
-- ---------------------------------------------------------------------------
create table public.communities (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name        text not null,
  description text not null,
  zone_code   text references public.pune_zones(code),
  is_official boolean not null default false,
  created_at  timestamptz not null default now()
);

create table public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  joined_at    timestamptz not null default now(),
  primary key (community_id, user_id)
);
create index community_members_user_idx on public.community_members(user_id);

create or replace function public.is_community_member(p_community uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.community_members
                 where community_id = p_community and user_id = auth.uid());
$$;

create table public.community_posts (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  author_id    uuid not null references public.profiles(id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 3000),
  is_removed   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index community_posts_feed_idx on public.community_posts(community_id, created_at desc);
create trigger community_posts_updated_at before update on public.community_posts
  for each row execute function public.set_updated_at();

create table public.post_likes (
  post_id    uuid not null references public.community_posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.community_posts(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index post_comments_post_idx on public.post_comments(post_id, created_at);

-- ---------------------------------------------------------------------------
-- 9. Messaging (1-on-1, Realtime)
-- ---------------------------------------------------------------------------
create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid references public.product_listings(id) on delete set null,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  last_read_at    timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index conversation_members_user_idx on public.conversation_members(user_id);

-- SECURITY DEFINER: the conversation_members policy calls this, so it must not
-- go through RLS itself (otherwise: "infinite recursion detected in policy").
create or replace function public.is_conversation_member(p_conversation uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.conversation_members
                 where conversation_id = p_conversation and user_id = auth.uid());
$$;

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at      timestamptz not null default now()
);
create index messages_conversation_idx on public.messages(conversation_id, created_at);

create or replace function public.touch_conversation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  update public.conversation_members set last_read_at = new.created_at
    where conversation_id = new.conversation_id and user_id = new.sender_id;
  return new;
end $$;
create trigger messages_touch after insert on public.messages
  for each row execute function public.touch_conversation();

-- The only way to create a chat. Reuses an existing 1-on-1 for the same
-- (pair, listing) so tapping "Chat with seller" twice doesn't fork threads.
create or replace function public.start_conversation(p_peer uuid, p_listing uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_id uuid;
begin
  if v_me is null or not public.is_verified_employee() then
    raise exception 'only verified employees can start chats' using errcode = '42501';
  end if;
  if p_peer = v_me then
    raise exception 'cannot chat with yourself' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.profiles where id = p_peer and verification_status = 'verified_employee') then
    raise exception 'that member is not available' using errcode = 'check_violation';
  end if;
  if p_listing is not null and not exists (
      select 1 from public.product_listings
      where id = p_listing and seller_id in (v_me, p_peer) and status <> 'removed') then
    raise exception 'listing not found' using errcode = 'check_violation';
  end if;

  select c.id into v_id
  from public.conversations c
  join public.conversation_members a on a.conversation_id = c.id and a.user_id = v_me
  join public.conversation_members b on b.conversation_id = c.id and b.user_id = p_peer
  where c.listing_id is not distinct from p_listing
  limit 1;

  if v_id is null then
    insert into public.conversations(listing_id) values (p_listing) returning id into v_id;
    insert into public.conversation_members(conversation_id, user_id) values (v_id, v_me), (v_id, p_peer);
  end if;
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- 10. Trust & safety
-- ---------------------------------------------------------------------------
create table public.user_reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('listing','job','post','comment','user','message')),
  target_id   uuid not null,
  reason      text not null check (reason in ('spam','scam','offensive','fake_profile','prohibited_item','other')),
  details     text check (char_length(details) <= 1000),
  status      text not null default 'open' check (status in ('open','actioned','dismissed')),
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);
create index user_reports_status_idx on public.user_reports(status, created_at desc);

-- Written only by the server (service role) from admin actions.
create table public.audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid references public.profiles(id) on delete set null,
  action     text not null,
  target     text,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- 11. Privileges. Start from nothing, then grant exactly what the app needs.
-- =============================================================================
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated, public;

-- Reference data
grant select on public.pune_zones, public.pune_hubs, public.pickup_points,
                public.companies, public.company_domains to anon, authenticated;

-- Profiles: corporate_email is NOT readable through the API (column grants).
-- `select('*')` on profiles will therefore fail — always list columns.
grant select (id, full_name, company_id, designation, work_location_pune, city, bio,
              verification_status, verified_at, role, created_at)
  on public.profiles to authenticated;
grant update (full_name, designation, work_location_pune, bio) on public.profiles to authenticated;

grant select, insert, update, delete on public.product_listings to authenticated;
grant select, insert, delete on public.product_images, public.saved_listings to authenticated;
grant select, insert, update, delete on public.job_listings to authenticated;
grant select, insert, update on public.referral_requests to authenticated;
grant select on public.communities to authenticated;
grant select, insert, delete on public.community_members to authenticated;
grant select, insert, update, delete on public.community_posts to authenticated;
grant select, insert, delete on public.post_likes, public.post_comments to authenticated;
grant select on public.conversations to authenticated;
grant select on public.conversation_members to authenticated;
grant update (last_read_at) on public.conversation_members to authenticated;
grant select, insert on public.messages to authenticated;
grant select, insert on public.user_reports to authenticated;
grant select on public.audit_log to authenticated;

grant execute on function public.is_verified_employee(), public.is_admin(), public.is_moderator(),
  public.my_company_id(), public.is_community_member(uuid), public.is_conversation_member(uuid),
  public.current_role_is(public.user_role[]), public.start_conversation(uuid, uuid)
  to authenticated;
grant execute on function public.check_otp_rate_limit(text, text, text) to service_role;
grant execute on function public.auth_user_id_by_email(text) to service_role;

-- =============================================================================
-- 12. Row Level Security
-- =============================================================================
alter table public.pune_zones              enable row level security;
alter table public.pune_hubs               enable row level security;
alter table public.pickup_points           enable row level security;
alter table public.companies               enable row level security;
alter table public.company_domains         enable row level security;
alter table public.company_domain_requests enable row level security;
alter table public.profiles                enable row level security;
alter table public.email_otps              enable row level security;
alter table public.otp_events              enable row level security;
alter table public.email_suppressions      enable row level security;
alter table public.product_listings        enable row level security;
alter table public.product_images          enable row level security;
alter table public.saved_listings          enable row level security;
alter table public.job_listings            enable row level security;
alter table public.referral_requests       enable row level security;
alter table public.communities             enable row level security;
alter table public.community_members       enable row level security;
alter table public.community_posts         enable row level security;
alter table public.post_likes              enable row level security;
alter table public.post_comments           enable row level security;
alter table public.conversations           enable row level security;
alter table public.conversation_members    enable row level security;
alter table public.messages                enable row level security;
alter table public.user_reports            enable row level security;
alter table public.audit_log               enable row level security;

-- Reference data: public read
create policy "zones readable"   on public.pune_zones      for select to anon, authenticated using (true);
create policy "hubs readable"    on public.pune_hubs       for select to anon, authenticated using (true);
create policy "pickups readable" on public.pickup_points   for select to anon, authenticated using (true);
create policy "companies readable" on public.companies     for select to anon, authenticated using (is_active);
create policy "domains readable" on public.company_domains for select to anon, authenticated using (true);

-- Profiles
create policy "profiles: self or verified" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_verified_employee()));
create policy "profiles: update self" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Marketplace
create policy "listings: read" on public.product_listings for select to authenticated
  using ((select public.is_verified_employee())
         and (status <> 'removed' or seller_id = (select auth.uid()) or (select public.is_moderator())));
create policy "listings: create own" on public.product_listings for insert to authenticated
  with check ((select public.is_verified_employee()) and seller_id = (select auth.uid()) and status = 'active');
create policy "listings: update own" on public.product_listings for update to authenticated
  using (seller_id = (select auth.uid()) and (select public.is_verified_employee()))
  with check (seller_id = (select auth.uid()) and status in ('active','reserved','sold'));
create policy "listings: moderators" on public.product_listings for update to authenticated
  using ((select public.is_moderator())) with check ((select public.is_moderator()));
create policy "listings: delete own" on public.product_listings for delete to authenticated
  using (seller_id = (select auth.uid()));

create policy "images: read" on public.product_images for select to authenticated
  using ((select public.is_verified_employee()));
create policy "images: add to own listing" on public.product_images for insert to authenticated
  with check ((select public.is_verified_employee())
    and storage_path like ((select auth.uid())::text || '/%')
    and exists (select 1 from public.product_listings l where l.id = listing_id and l.seller_id = (select auth.uid())));
create policy "images: delete own" on public.product_images for delete to authenticated
  using (exists (select 1 from public.product_listings l where l.id = listing_id and l.seller_id = (select auth.uid())));

create policy "saved: own" on public.saved_listings for select to authenticated
  using (user_id = (select auth.uid()));
create policy "saved: add own" on public.saved_listings for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_verified_employee()));
create policy "saved: remove own" on public.saved_listings for delete to authenticated
  using (user_id = (select auth.uid()));

-- Jobs: you can only post jobs for the company your email verified you at.
create policy "jobs: read" on public.job_listings for select to authenticated
  using ((select public.is_verified_employee()));
create policy "jobs: create for own company" on public.job_listings for insert to authenticated
  with check ((select public.is_verified_employee()) and posted_by = (select auth.uid())
              and company_id = (select public.my_company_id()));
create policy "jobs: update own" on public.job_listings for update to authenticated
  using (posted_by = (select auth.uid()))
  with check (posted_by = (select auth.uid()) and company_id = (select public.my_company_id()));
create policy "jobs: delete own or mod" on public.job_listings for delete to authenticated
  using (posted_by = (select auth.uid()) or (select public.is_moderator()));

create policy "referrals: parties read" on public.referral_requests for select to authenticated
  using (requester_id = (select auth.uid()) or referrer_id = (select auth.uid()));
create policy "referrals: request" on public.referral_requests for insert to authenticated
  with check ((select public.is_verified_employee()) and requester_id = (select auth.uid()));
create policy "referrals: parties update" on public.referral_requests for update to authenticated
  using ((requester_id = (select auth.uid()) or referrer_id = (select auth.uid()))
         and (select public.is_verified_employee()));

-- Communities
create policy "communities: read" on public.communities for select to authenticated
  using ((select public.is_verified_employee()));

create policy "members: read" on public.community_members for select to authenticated
  using ((select public.is_verified_employee()));
create policy "members: join self" on public.community_members for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_verified_employee()));
create policy "members: leave self" on public.community_members for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "posts: read" on public.community_posts for select to authenticated
  using ((select public.is_verified_employee())
         and (not is_removed or author_id = (select auth.uid()) or (select public.is_moderator())));
create policy "posts: members write" on public.community_posts for insert to authenticated
  with check ((select public.is_verified_employee()) and author_id = (select auth.uid())
              and public.is_community_member(community_id) and not is_removed);
create policy "posts: author edits" on public.community_posts for update to authenticated
  using (author_id = (select auth.uid()) and not is_removed)
  with check (author_id = (select auth.uid()) and not is_removed);
create policy "posts: moderators" on public.community_posts for update to authenticated
  using ((select public.is_moderator())) with check ((select public.is_moderator()));
create policy "posts: delete own or mod" on public.community_posts for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.is_moderator()));

create policy "likes: read" on public.post_likes for select to authenticated
  using ((select public.is_verified_employee()));
create policy "likes: add own" on public.post_likes for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_verified_employee()));
create policy "likes: remove own" on public.post_likes for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "comments: read" on public.post_comments for select to authenticated
  using ((select public.is_verified_employee()));
create policy "comments: add own" on public.post_comments for insert to authenticated
  with check (author_id = (select auth.uid()) and (select public.is_verified_employee())
    and exists (select 1 from public.community_posts p where p.id = post_id
                and not p.is_removed and public.is_community_member(p.community_id)));
create policy "comments: delete own or mod" on public.post_comments for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.is_moderator()));

-- Messaging: only participants. No direct inserts into conversations/members
-- (use start_conversation()).
create policy "conversations: members read" on public.conversations for select to authenticated
  using (public.is_conversation_member(id));
create policy "conv members: members read" on public.conversation_members for select to authenticated
  using (public.is_conversation_member(conversation_id));
create policy "conv members: mark read" on public.conversation_members for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "messages: members read" on public.messages for select to authenticated
  using (public.is_conversation_member(conversation_id));
create policy "messages: members send" on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and (select public.is_verified_employee())
              and public.is_conversation_member(conversation_id));

-- Reports
create policy "reports: file" on public.user_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and (select public.is_verified_employee())
              and status = 'open' and resolved_by is null);
create policy "reports: own or mod" on public.user_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.is_moderator()));

create policy "audit: admins read" on public.audit_log for select to authenticated
  using ((select public.is_admin()));

-- =============================================================================
-- 13. Storage: private bucket for marketplace photos (no ID-proof bucket).
--     Files live at <user_id>/<uuid>.<ext>. Read = any verified employee
--     (via short-lived signed URLs). Write/delete = owner folder only.
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marketplace-photos', 'marketplace-photos', false, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "marketplace photos: verified read" on storage.objects for select to authenticated
  using (bucket_id = 'marketplace-photos' and (select public.is_verified_employee()));
create policy "marketplace photos: owner upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'marketplace-photos'
              and (storage.foldername(name))[1] = (select auth.uid())::text
              and (select public.is_verified_employee()));
create policy "marketplace photos: owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'marketplace-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- =============================================================================
-- 14. Realtime: stream new messages. postgres_changes honours the RLS above,
--     so a subscriber only receives rows from conversations they belong to.
-- =============================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

-- =============================================================================
-- 15. Seed: Pune geography, employers, official communities
-- =============================================================================
insert into public.pune_zones (code, name, sort_order) values
  ('hinjawadi',          'Hinjawadi (Phase 1, 2, 3)',               1),
  ('kharadi_magarpatta', 'Magarpatta City & Kharadi (EON IT Park)', 2),
  ('viman_kalyani',      'Viman Nagar & Kalyani Nagar',             3),
  ('baner_aundh',        'Baner, Balewadi & Aundh',                 4),
  ('yerwada_sb_road',    'Yerwada & Senapati Bapat Road',           5),
  ('pcmc_talegaon',      'Talegaon Dabhade & Pimpri-Chinchwad',     6);

insert into public.pune_hubs (code, zone_code, name, sort_order) values
  ('hinjawadi_ph1',   'hinjawadi',          'Hinjawadi Phase 1',                 1),
  ('hinjawadi_ph2',   'hinjawadi',          'Hinjawadi Phase 2',                 2),
  ('hinjawadi_ph3',   'hinjawadi',          'Hinjawadi Phase 3',                 3),
  ('magarpatta',      'kharadi_magarpatta', 'Magarpatta City',                   4),
  ('kharadi_eon',     'kharadi_magarpatta', 'Kharadi — EON IT Park',             5),
  ('kharadi_wtc',     'kharadi_magarpatta', 'Kharadi — World Trade Center',      6),
  ('viman_nagar',     'viman_kalyani',      'Viman Nagar',                       7),
  ('kalyani_nagar',   'viman_kalyani',      'Kalyani Nagar',                     8),
  ('baner',           'baner_aundh',        'Baner',                             9),
  ('balewadi',        'baner_aundh',        'Balewadi High Street',             10),
  ('aundh',           'baner_aundh',        'Aundh',                            11),
  ('yerwada',         'yerwada_sb_road',    'Yerwada (Commerzone / Panchshil)', 12),
  ('sb_road',         'yerwada_sb_road',    'Senapati Bapat Road',              13),
  ('pimpri_chinchwad','pcmc_talegaon',      'Pimpri-Chinchwad (PCMC)',          14),
  ('talegaon',        'pcmc_talegaon',      'Talegaon Dabhade',                 15);

insert into public.pickup_points (code, zone_code, name, landmark, sort_order) values
  ('hjw_ph1_circle',    'hinjawadi',          'Hinjawadi Phase 1 Circle',         'Shivaji Chowk, near Infosys Gate 1', 1),
  ('hjw_ph1_gate',      'hinjawadi',          'Rajiv Gandhi Infotech Park Ph 1 Gate', 'Main gate security cabin',      2),
  ('hjw_ph2_wipro',     'hinjawadi',          'Hinjawadi Phase 2 — Wipro Circle', 'Bus stop opposite Wipro SEZ',       3),
  ('hjw_ph3_megapolis', 'hinjawadi',          'Hinjawadi Phase 3 — Megapolis Circle', 'Near Megapolis main entrance',  4),
  ('eon_gate1',         'kharadi_magarpatta', 'EON Kharadi Gate 1',               'EON IT Park main security gate',    5),
  ('eon_free_zone',     'kharadi_magarpatta', 'EON Free Zone Lobby',              'Ground-floor reception',            6),
  ('magarpatta_t7',     'kharadi_magarpatta', 'Magarpatta Tower 7',               'Cybercity Tower 7 entrance',        7),
  ('seasons_mall',      'kharadi_magarpatta', 'Seasons Mall Entrance',            'Magarpatta, main entrance',         8),
  ('viman_metro',       'viman_kalyani',      'Viman Nagar Metro Station',        'Ramwadi side ticket counter',       9),
  ('phoenix_mall',      'viman_kalyani',      'Phoenix Marketcity Gate 2',        'Viman Nagar Road',                 10),
  ('kalyani_starbucks', 'viman_kalyani',      'Kalyani Nagar Central Avenue',     'Near Marigold Complex',            11),
  ('balewadi_high_st',  'baner_aundh',        'Balewadi High Street',             'Main plaza, near the fountain',    12),
  ('baner_d_mart',      'baner_aundh',        'Baner D-Mart',                     'Baner Road parking entrance',      13),
  ('aundh_westend',     'baner_aundh',        'Westend Mall Aundh',               'DP Road entrance',                 14),
  ('commerzone_gate',   'yerwada_sb_road',    'Commerzone Yerwada Main Gate',     'Samrat Ashok Road',                15),
  ('sb_road_icc',       'yerwada_sb_road',    'ICC Trade Tower, SB Road',         'Main lobby',                       16),
  ('pimpri_metro',      'pcmc_talegaon',      'PCMC Metro Station',               'Pimpri-Chinchwad, ticket counter', 17),
  ('talegaon_station',  'pcmc_talegaon',      'Talegaon Railway Station',         'Platform 1 entrance',              18);

-- Major Pune employers and the domains their staff receive mail at.
-- Subdomains (e.g. in.ibm.com) match their parent domain in the app.
with c(slug, name, campus, domains) as (values
  ('tcs',          'Tata Consultancy Services', 'Hinjawadi Phase 3 / Sahyadri Park',  array['tcs.com']),
  ('infosys',      'Infosys',                   'Hinjawadi Phase 1 & 2',              array['infosys.com']),
  ('wipro',        'Wipro',                     'Hinjawadi Phase 2',                  array['wipro.com']),
  ('cognizant',    'Cognizant',                 'Hinjawadi Phase 3 / Kharadi',        array['cognizant.com']),
  ('tech-mahindra','Tech Mahindra',             'Hinjawadi Phase 3',                  array['techmahindra.com']),
  ('barclays',     'Barclays',                  'EON Free Zone, Kharadi',             array['barclays.com','barclayscorp.com']),
  ('bny',          'BNY',                       'Magarpatta / Kharadi',               array['bny.com','bnymellon.com']),
  ('deutsche-bank','Deutsche Bank',             'Magarpatta / Kharadi',               array['db.com']),
  ('amdocs',       'Amdocs',                    'Magarpatta City',                    array['amdocs.com']),
  ('nvidia',       'NVIDIA',                    'Baner / Kalyani Nagar',              array['nvidia.com']),
  ('cybage',       'Cybage Software',           'Kalyani Nagar / Hinjawadi',          array['cybage.com']),
  ('persistent',   'Persistent Systems',        'SB Road / Hinjawadi',                array['persistent.com']),
  ('accenture',    'Accenture',                 'Kharadi / Hinjawadi',                array['accenture.com']),
  ('capgemini',    'Capgemini',                 'Hinjawadi / Talawade',               array['capgemini.com']),
  ('ibm',          'IBM',                       'Hinjawadi / Kharadi',                array['ibm.com']),
  ('hcltech',      'HCLTech',                   'Hinjawadi',                          array['hcltech.com','hcl.com']),
  ('ltimindtree',  'LTIMindtree',               'Hinjawadi / Talawade',               array['ltimindtree.com']),
  ('kpit',         'KPIT Technologies',         'Hinjawadi Phase 1',                  array['kpit.com']),
  ('zensar',       'Zensar Technologies',       'Kharadi',                            array['zensar.com']),
  ('synechron',    'Synechron',                 'Hinjawadi Phase 3',                  array['synechron.com']),
  ('ubs',          'UBS',                       'Yerwada / Commerzone',               array['ubs.com']),
  ('mastercard',   'Mastercard',                'Yerwada',                            array['mastercard.com'])
), ins as (
  insert into public.companies (slug, name, pune_campus)
  select slug, name, campus from c
  returning id, slug
)
insert into public.company_domains (domain, company_id)
select d, ins.id from c join ins using (slug), unnest(c.domains) as d;

insert into public.communities (slug, name, description, zone_code, is_official) values
  ('pune-tech-circle', 'Pune Tech Circle',
   'City-wide space for Pune''s tech workforce: meetups, carpools, PG/flat leads and career talk.', null, true),
  ('hinjawadi-developers', 'Hinjawadi Developers',
   'Engineers across Hinjawadi Phase 1–3. Tech talks, traffic updates, lunch spots, referrals.', 'hinjawadi', true),
  ('kharadi-magarpatta-infra-hub', 'Kharadi & Magarpatta Infra Hub',
   'Cloud, DevOps, SRE and infra folks from EON, WTC and Magarpatta.', 'kharadi_magarpatta', true),
  ('baner-balewadi-builders', 'Baner & Balewadi Builders',
   'Product and startup people around Baner, Balewadi and Aundh.', 'baner_aundh', true),
  ('pcmc-tech-belt', 'PCMC Tech Belt',
   'Pimpri-Chinchwad, Talawade and Talegaon: automotive software, embedded and manufacturing IT.', 'pcmc_talegaon', true);
