-- RLS / privilege test suite. Runs inside one transaction and rolls back.
-- Usage: scripts/test-db-local.sh   (or psql "$DATABASE_URL" -f tests/db/rls_test.sql)
\set ON_ERROR_STOP 1
begin;

create schema rls_t;
grant usage on schema rls_t to anon, authenticated;

create function rls_t.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAIL: %', msg; end if;
  raise notice 'ok - %', msg;
end $$;

-- true if the statement raises any error
create function rls_t.fails(stmt text) returns boolean language plpgsql as $$
begin
  execute stmt;
  return false;
exception when others then
  return true;
end $$;

create function rls_t.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;

create function rls_t.act_anon() returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
end $$;

grant execute on all functions in schema rls_t to anon, authenticated;
create table rls_t.ids (k text primary key, v uuid);
grant all on rls_t.ids to anon, authenticated;

-- ---------------------------------------------------------------- fixtures
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'alice@tcs.com'),
  ('00000000-0000-0000-0000-0000000000b2', 'bob@infosys.com'),
  ('00000000-0000-0000-0000-0000000000c3', 'carol@wipro.com'),
  ('00000000-0000-0000-0000-0000000000d4', 'dave@tcs.com');

insert into public.profiles (id, full_name, corporate_email, company_id, designation, work_location_pune, verification_status, role)
select u.id, u.name, u.email, (select id from public.companies where slug = u.co), 'Engineer', 'hinjawadi_ph1',
       u.status::public.verification_status, u.role::public.user_role
from (values
  ('00000000-0000-0000-0000-0000000000a1'::uuid, 'Alice', 'alice@tcs.com',   'tcs',     'verified_employee', 'member'),
  ('00000000-0000-0000-0000-0000000000b2'::uuid, 'Bob',   'bob@infosys.com', 'infosys', 'verified_employee', 'member'),
  ('00000000-0000-0000-0000-0000000000c3'::uuid, 'Carol', 'carol@wipro.com', 'wipro',   'unverified',        'member'),
  ('00000000-0000-0000-0000-0000000000d4'::uuid, 'Dave',  'dave@tcs.com',    'tcs',     'verified_employee', 'admin')
) as u(id, name, email, co, status, role);

\set alice '\'00000000-0000-0000-0000-0000000000a1\''
\set bob   '\'00000000-0000-0000-0000-0000000000b2\''
\set carol '\'00000000-0000-0000-0000-0000000000c3\''
\set dave  '\'00000000-0000-0000-0000-0000000000d4\''

-- ---------------------------------------------------------------- seed data
select rls_t.ok((select count(*) from public.pune_zones) = 6, 'six Pune zones seeded');
select rls_t.ok((select count(*) from public.companies) >= 12, 'Pune employers seeded');
select rls_t.ok(exists (select 1 from public.company_domains where domain = 'tcs.com'), 'tcs.com domain seeded');
select rls_t.ok((select count(*) from public.communities where slug in
  ('pune-tech-circle','hinjawadi-developers','kharadi-magarpatta-infra-hub')) = 3, 'brief communities seeded');
select rls_t.ok(not exists (select 1 from storage.buckets where id ilike '%verif%' or id ilike '%proof%'),
  'no ID-proof bucket exists');
select rls_t.ok(rls_t.fails($$insert into public.profiles (id, full_name, corporate_email, company_id, designation, work_location_pune, city)
  values ('00000000-0000-0000-0000-0000000000a1', 'X Y', 'x@tcs.com', (select id from public.companies limit 1), 'Eng', 'baner', 'Mumbai')$$),
  'city is locked to Pune');

-- ---------------------------------------------------------------- anon
select rls_t.act_anon();
select rls_t.ok((select count(*) from public.companies) > 0, 'anon can list companies (register form)');
select rls_t.ok(rls_t.fails('select id from public.profiles'), 'anon cannot read profiles');
select rls_t.ok(rls_t.fails('select id from public.product_listings'), 'anon cannot read listings');
reset role;

-- ---------------------------------------------------------------- unverified user
select rls_t.act_as(:carol);
select rls_t.ok((select count(*) from public.profiles) = 1, 'unverified user sees only own profile');
select rls_t.ok(rls_t.fails($$insert into public.product_listings (seller_id, title, description, category, condition, price_inr, zone_code, pickup_point)
  values (auth.uid(), 'Dell XPS 13', 'Lightly used laptop, 16GB RAM', 'laptops', 'good', 45000, 'hinjawadi', 'hjw_ph1_circle')$$),
  'unverified user cannot create listings');
select rls_t.ok(rls_t.fails($$update public.profiles set verification_status = 'verified_employee' where id = auth.uid()$$),
  'user cannot self-verify');
select rls_t.ok(rls_t.fails($$select public.start_conversation('00000000-0000-0000-0000-0000000000a1')$$),
  'unverified user cannot start chats');
reset role;

-- ---------------------------------------------------------------- profiles
select rls_t.act_as(:alice);
select rls_t.ok(rls_t.fails('select corporate_email from public.profiles'), 'corporate_email not readable via API');
select rls_t.ok(rls_t.fails($$update public.profiles set role = 'admin' where id = auth.uid()$$), 'user cannot self-promote');
update public.profiles set designation = 'Senior Engineer' where id = auth.uid();
update public.profiles set designation = 'Hacked' where id = '00000000-0000-0000-0000-0000000000b2';
reset role;
select rls_t.ok((select designation from public.profiles where id = :alice) = 'Senior Engineer', 'user can edit own designation');
select rls_t.ok((select designation from public.profiles where id = :bob) = 'Engineer', 'user cannot edit others');

-- ---------------------------------------------------------------- marketplace
select rls_t.act_as(:alice);
with x as (
  insert into public.product_listings (seller_id, title, description, category, condition, price_inr, zone_code, pickup_point)
  values (auth.uid(), 'MacBook Air M2', 'Barely used, with charger and box', 'laptops', 'like_new', 72000, 'kharadi_magarpatta', 'eon_gate1')
  returning id)
insert into rls_t.ids select 'listing', id from x;
select rls_t.ok(rls_t.fails($$insert into public.product_listings (seller_id, title, description, category, condition, price_inr, zone_code, pickup_point)
  values (auth.uid(), 'Pixel 8', 'Works perfectly fine, minor scratches', 'phones', 'good', 30000, 'hinjawadi', 'eon_gate1')$$),
  'pickup point must belong to the listing zone');
select rls_t.ok(rls_t.fails($$insert into public.product_listings (seller_id, title, description, category, condition, price_inr, zone_code, pickup_point)
  values ('00000000-0000-0000-0000-0000000000b2', 'Fake listing', 'Posting as somebody else', 'phones', 'good', 1, 'hinjawadi', 'hjw_ph1_circle')$$),
  'cannot create a listing as another user');
select rls_t.ok(rls_t.fails($$update public.product_listings set status = 'removed' where seller_id = auth.uid()$$),
  'seller cannot set moderator-only status');
select rls_t.ok(rls_t.fails($$update public.product_listings set seller_id = '00000000-0000-0000-0000-0000000000b2' where seller_id = auth.uid()$$),
  'seller cannot transfer listing');
insert into public.product_images (listing_id, storage_path)
  values ((select v from rls_t.ids where k = 'listing'), auth.uid()::text || '/a.jpg');
select rls_t.ok(rls_t.fails($$insert into public.product_images (listing_id, storage_path)
  values ((select v from rls_t.ids where k = 'listing'), '00000000-0000-0000-0000-0000000000b2/x.jpg')$$),
  'image path must be in own folder');
insert into storage.objects (bucket_id, name) values ('marketplace-photos', auth.uid()::text || '/a.jpg');
select rls_t.ok(rls_t.fails($$insert into storage.objects (bucket_id, name) values ('marketplace-photos', '00000000-0000-0000-0000-0000000000b2/evil.jpg')$$),
  'cannot upload into another user''s storage folder');
reset role;

select rls_t.act_as(:bob);
select rls_t.ok((select count(*) from public.product_listings) = 1, 'verified user sees listings');
select rls_t.ok((select count(*) from storage.objects where bucket_id = 'marketplace-photos') = 1, 'verified user can read photos');
update public.product_listings set price_inr = 1;
insert into public.saved_listings (user_id, listing_id) values (auth.uid(), (select v from rls_t.ids where k = 'listing'));
reset role;
select rls_t.ok((select price_inr from public.product_listings) = 72000, 'non-owner cannot edit listing');

select rls_t.act_as(:alice);
select rls_t.ok((select count(*) from public.saved_listings) = 0, 'saved listings are private');
reset role;

select rls_t.act_as(:dave);
update public.product_listings set status = 'removed';
reset role;
select rls_t.ok((select status from public.product_listings) = 'removed', 'admin can remove listing');
select rls_t.act_as(:bob);
select rls_t.ok((select count(*) from public.product_listings) = 0, 'removed listing hidden from others');
reset role;
update public.product_listings set status = 'active';

-- ---------------------------------------------------------------- messaging
select rls_t.act_as(:bob);
insert into rls_t.ids select 'conv', public.start_conversation(:alice, (select v from rls_t.ids where k = 'listing'));
select rls_t.ok(public.start_conversation(:alice, (select v from rls_t.ids where k = 'listing'))
  = (select v from rls_t.ids where k = 'conv'), 'start_conversation is idempotent');
select rls_t.ok(rls_t.fails($$select public.start_conversation(auth.uid())$$), 'cannot chat with yourself');
select rls_t.ok(rls_t.fails($$select public.start_conversation('00000000-0000-0000-0000-0000000000c3')$$),
  'cannot chat with unverified user');
select rls_t.ok(rls_t.fails($$insert into public.conversations default values$$), 'no direct conversation inserts');
select rls_t.ok(rls_t.fails($$insert into public.conversation_members (conversation_id, user_id)
  values ((select v from rls_t.ids where k = 'conv'), '00000000-0000-0000-0000-0000000000d4')$$),
  'cannot add people to a conversation');
insert into public.messages (conversation_id, sender_id, body) values ((select v from rls_t.ids where k = 'conv'), auth.uid(), 'Is it still available?');
select rls_t.ok(rls_t.fails($$insert into public.messages (conversation_id, sender_id, body)
  values ((select v from rls_t.ids where k = 'conv'), '00000000-0000-0000-0000-0000000000a1', 'spoofed')$$),
  'cannot send as another user');
select rls_t.ok((select count(*) from public.conversation_members) = 2, 'member sees both participants (no recursion)');
reset role;

select rls_t.act_as(:alice);
select rls_t.ok((select count(*) from public.messages) = 1, 'other participant reads message');
insert into public.messages (conversation_id, sender_id, body) values ((select v from rls_t.ids where k = 'conv'), auth.uid(), 'Yes! EON Gate 1 at 6pm?');
reset role;

select rls_t.act_as(:dave);
select rls_t.ok((select count(*) from public.messages) = 0, 'non-participant (even admin) cannot read messages');
select rls_t.ok((select count(*) from public.conversations) = 0, 'non-participant cannot see conversation');
select rls_t.ok(rls_t.fails($$insert into public.messages (conversation_id, sender_id, body)
  values ((select v from rls_t.ids where k = 'conv'), auth.uid(), 'hi')$$), 'non-participant cannot post');
reset role;

-- ---------------------------------------------------------------- jobs + referrals
select rls_t.act_as(:alice);
with x as (
  insert into public.job_listings (posted_by, company_id, title, description, employment_type, work_mode, experience_min, experience_max, hub_code)
  values (auth.uid(), public.my_company_id(), 'Backend Engineer (Java)', 'Spring Boot microservices for a BFSI client in Hinjawadi Phase 3.', 'full_time', 'hybrid', 3, 6, 'hinjawadi_ph3')
  returning id)
insert into rls_t.ids select 'job', id from x;
select rls_t.ok(rls_t.fails($$insert into public.job_listings (posted_by, company_id, title, description, employment_type, work_mode, hub_code)
  values (auth.uid(), (select id from public.companies where slug = 'infosys'), 'Fake Infosys job', 'Posting a job for a company I do not work at.', 'full_time', 'onsite', 'hinjawadi_ph1')$$),
  'cannot post jobs for another company');
select rls_t.ok(rls_t.fails($$insert into public.referral_requests (job_id, requester_id, referrer_id, message)
  values ((select v from rls_t.ids where k = 'job'), auth.uid(), auth.uid(), 'Please refer me to my own job opening!!')$$),
  'cannot request referral on own job');
reset role;

select rls_t.act_as(:bob);
insert into public.referral_requests (job_id, requester_id, referrer_id, message)
  values ((select v from rls_t.ids where k = 'job'), auth.uid(), auth.uid(), '5 yrs Java/Spring, currently at Infosys Hinjawadi.');
select rls_t.ok((select referrer_id from public.referral_requests) = :alice, 'referrer_id forced to job poster');
select rls_t.ok(rls_t.fails($$update public.referral_requests set status = 'referred'$$), 'requester cannot mark self referred');
reset role;

select rls_t.act_as(:alice);
update public.referral_requests set status = 'referred', referrer_note = 'Submitted in portal';
reset role;
select rls_t.ok((select status from public.referral_requests) = 'referred', 'referrer can mark referred');

select rls_t.act_as(:dave);
select rls_t.ok((select count(*) from public.referral_requests) = 0, 'referrals private to the two parties');
reset role;

-- ---------------------------------------------------------------- communities
select rls_t.act_as(:bob);
select rls_t.ok(rls_t.fails($$insert into public.community_posts (community_id, author_id, body)
  values ((select id from public.communities where slug = 'hinjawadi-developers'), auth.uid(), 'hello')$$),
  'must join before posting');
insert into public.community_members (community_id, user_id)
  values ((select id from public.communities where slug = 'hinjawadi-developers'), auth.uid());
with x as (
  insert into public.community_posts (community_id, author_id, body)
  values ((select id from public.communities where slug = 'hinjawadi-developers'), auth.uid(), 'Phase 3 traffic is brutal today, leave early!')
  returning id)
insert into rls_t.ids select 'post', id from x;
reset role;

select rls_t.act_as(:alice);
select rls_t.ok(rls_t.fails($$insert into public.post_comments (post_id, author_id, body)
  values ((select v from rls_t.ids where k = 'post'), auth.uid(), '+1')$$), 'non-member cannot comment');
insert into public.post_likes (post_id, user_id) values ((select v from rls_t.ids where k = 'post'), auth.uid());
update public.community_posts set body = 'defaced';
reset role;
select rls_t.ok((select body from public.community_posts) like 'Phase 3%', 'cannot edit others'' posts');

-- ---------------------------------------------------------------- reports + audit + service tables
select rls_t.act_as(:alice);
insert into public.user_reports (reporter_id, target_type, target_id, reason)
  values (auth.uid(), 'post', (select v from rls_t.ids where k = 'post'), 'spam');
select rls_t.ok(rls_t.fails('select * from public.email_otps'), 'email_otps not reachable');
select rls_t.ok(rls_t.fails('select * from public.otp_events'), 'otp_events not reachable');
select rls_t.ok(rls_t.fails('select * from public.company_domain_requests'), 'domain requests not reachable');
select rls_t.ok(rls_t.fails($$select public.check_otp_rate_limit('a@tcs.com', null, 'send')$$), 'rate-limit fn not callable by users');
select rls_t.ok(rls_t.fails($$insert into public.audit_log (action) values ('forged')$$), 'audit log cannot be forged');
select rls_t.ok(rls_t.fails($$select public.auth_user_id_by_email('bob@infosys.com')$$), 'email lookup fn not callable by users');
reset role;

select rls_t.act_as(:bob);
select rls_t.ok((select count(*) from public.user_reports) = 0, 'reports private to reporter');
reset role;
select rls_t.act_as(:dave);
select rls_t.ok((select count(*) from public.user_reports) = 1, 'admin sees reports');
reset role;

-- ---------------------------------------------------------------- rate limit (service role)
select rls_t.ok(public.check_otp_rate_limit('Limit@TCS.com', '10.0.0.1', 'send'), 'rate limit 1');
select public.check_otp_rate_limit('limit@tcs.com', '10.0.0.1', 'send') from generate_series(1, 3);
select rls_t.ok(public.check_otp_rate_limit('limit@tcs.com', 'not-an-ip', 'send'), '5th send allowed, bad IP tolerated');
select rls_t.ok(not public.check_otp_rate_limit('limit@tcs.com', '10.0.0.1', 'send'), '6th send in 15 min blocked');
select rls_t.ok(public.check_otp_rate_limit('limit@tcs.com', '10.0.0.1', 'verify'), 'limits are per kind');

-- ---------------------------------------------------------------- suspension
update public.profiles set verification_status = 'suspended' where id = :bob;
select rls_t.act_as(:bob);
select rls_t.ok((select count(*) from public.product_listings) = 0, 'suspended user loses access');
reset role;

\echo 'rls_test.sql: all assertions passed'
rollback;
