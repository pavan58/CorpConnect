-- =============================================================================
-- Launch / growth support
--   * signup attribution (which channel/campaign brought each member)
--   * personal invite codes + who-invited-whom
--   * ambassador flag + "early member #N" numbering
--   * featured listings (admin-controlled)
-- =============================================================================

alter table public.profiles
  add column signup_source   text check (signup_source ~ '^[a-z0-9_-]{1,60}$'),
  add column signup_campaign text check (signup_campaign ~ '^[a-z0-9_-]{1,60}$'),
  add column referred_by     uuid references public.profiles(id) on delete set null,
  add column invite_code     text unique check (invite_code ~ '^[a-z0-9]{8}$'),
  add column is_ambassador   boolean not null default false,
  add column member_number   integer unique;

create index profiles_referred_by_idx on public.profiles(referred_by);

create sequence public.member_number_seq;

-- Every profile gets an invite code; verified members get a member number in
-- the order they verified (used for the "Early member" badge).
create or replace function public.profile_growth_defaults()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.invite_code is null then
    new.invite_code := substr(md5(gen_random_uuid()::text), 1, 8);
  end if;
  if new.verification_status = 'verified_employee' and new.member_number is null then
    new.member_number := nextval('public.member_number_seq');
  end if;
  return new;
end $$;

create trigger profiles_growth_defaults
  before insert or update of verification_status on public.profiles
  for each row execute function public.profile_growth_defaults();

-- Backfill existing members (oldest verified first).
update public.profiles set invite_code = substr(md5(gen_random_uuid()::text), 1, 8) where invite_code is null;
with ordered as (
  select id from public.profiles
  where verification_status = 'verified_employee' and member_number is null
  order by coalesce(verified_at, created_at)
)
update public.profiles p set member_number = nextval('public.member_number_seq')
from ordered o where p.id = o.id;

-- Badges are public to signed-in members; attribution and invite codes are not.
grant select (is_ambassador, member_number) on public.profiles to authenticated;

-- Own invite code + how many verified colleagues joined with it.
create or replace function public.my_invite_stats()
returns table (invite_code text, invited_total integer, invited_verified integer)
language sql stable security definer set search_path = '' as $$
  select p.invite_code,
         (select count(*)::int from public.profiles r where r.referred_by = p.id),
         (select count(*)::int from public.profiles r where r.referred_by = p.id and r.verification_status = 'verified_employee')
  from public.profiles p
  where p.id = auth.uid() and p.verification_status = 'verified_employee';
$$;
revoke all on function public.my_invite_stats() from public, anon;
grant execute on function public.my_invite_stats() to authenticated;

-- -----------------------------------------------------------------------------
-- Featured listings: only staff (service role) can set is_featured. Sellers keep
-- the same editable fields as before, via column-level grants.
-- -----------------------------------------------------------------------------
alter table public.product_listings add column is_featured boolean not null default false;
create index product_listings_featured_idx on public.product_listings(is_featured desc, created_at desc) where status = 'active';

revoke insert, update on public.product_listings from authenticated;
grant insert (seller_id, title, description, category, condition, price_inr, negotiable, zone_code, pickup_point)
  on public.product_listings to authenticated;
grant update (title, description, category, condition, price_inr, negotiable, zone_code, pickup_point, status)
  on public.product_listings to authenticated;
