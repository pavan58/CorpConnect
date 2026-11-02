# CorpConnect Pune: MVP Phase 1

A private network for verified employees in Pune's tech corridors: an electronics marketplace, structured job referrals, local tech communities, and realtime 1-on-1 chat.

**Identity is checked by corporate email OTP only.** A user registers with their work address, such as `@tcs.com`. The server emails a 6-digit code through the Resend API. Entering that code flips `profiles.verification_status` to `verified_employee`. There are no ID cards, payslips or document uploads anywhere.

| Layer | Choice |
|---|---|
| App | Next.js 15.5 (App Router, Server Actions, TypeScript), React 19.2 |
| UI | Tailwind CSS v4, lucide-react, shadcn-style primitives in `src/components/ui` |
| Data / auth | Supabase: Postgres (17 on new projects; schema also tested on 16) + RLS, Auth (password sessions), Storage (listing photos), Realtime (chat) |
| Email | Resend REST API (OTP + password-reset codes), bounce/complaint webhook |
| Hosting | Vercel (`bom1` / Mumbai), deployed by GitHub Actions |

## How verification works

1. `registerEmployee` (`src/features/auth/actions.ts`) runs these checks in order:
   - rejects free mail providers (`src/lib/email-domain.ts`)
   - maps the email domain (and its parent domains, so `in.ibm.com` matches `ibm.com`) to a company in `company_domains`
   - rate-limits sends to 5 per email and 20 per IP every 15 minutes
   - creates the Supabase Auth user and the profile (status `unverified`)
   - stores an HMAC of a 6-digit code and emails the code via Resend
   - signs the user in and redirects to `/verify`
2. Unknown corporate domains are **not** auto-approved. They're logged in `company_domain_requests` for an admin to approve in `/admin`.
3. `/verify` takes the 6-digit code, auto-submits when all six digits are in, and handles paste and one-time-code autofill. `verifyCorporateOtp` allows 5 attempts and a 10-minute TTL. On success it sets `verification_status = 'verified_employee'` and redirects to `/marketplace`.
4. Until then, RLS gives the user nothing but their own profile row. Every app page calls `requireVerified()`. Suspended users lose access the same way.

Public Supabase sign-up is **disabled**: accounts can only be created by the server action after the domain check.

## Pune lock-down

- `pune_zones`, `pune_hubs` and `pickup_points` are seeded for these areas:
  - Hinjawadi Ph 1/2/3
  - Magarpatta & Kharadi (EON)
  - Viman Nagar & Kalyani Nagar
  - Baner, Balewadi & Aundh
  - Yerwada & SB Road
  - Talegaon & PCMC
- `profiles`, `product_listings` and `job_listings` have `city text default 'Pune' check (city = 'Pune')`.
- A listing's handover spot must be inside its zone. A DB trigger enforces this, and so does the zod schema.
- 22 major Pune employers and their mail domains are seeded, plus 5 official communities (Pune Tech Circle, Hinjawadi Developers, Kharadi & Magarpatta Infra Hub, …).

## Repo map

```
supabase/migrations/20261101000000_pune_mvp.sql   schema, RLS, storage bucket + policies, realtime, seed
src/features/*/actions.ts                          server actions (auth, marketplace, jobs, communities, messaging, admin, reports)
src/app/(auth)/{register,verify,login,forgot-password}
src/app/(app)/{marketplace,jobs,communities,messages,profile}
src/app/admin                                      reports, domain approvals, members (server-gated)
src/components/messaging/chat-window.tsx           Supabase Realtime chat
src/app/api/health, src/app/api/webhooks/resend
tests/unit       vitest (email rules, OTP hashing, schema ↔ seed sync, webhook signatures)
tests/db         SQL RLS suite (62 checks): runs on plain Postgres 16 and on a real Supabase stack in CI
scripts/         deploy-db, configure-auth, verify-storage, vercel-env-inject, resend-dns, rollback, make-admin
docs/DEPLOYMENT.md   step-by-step production launch
```

## Local development

```bash
npm ci
cp .env.example .env.local          # fill OTP_SECRET (openssl rand -base64 32)
supabase start                      # needs Docker; applies the migration
supabase status -o env              # copy API_URL / ANON_KEY / SERVICE_ROLE_KEY into .env.local
npm run dev
```

If `RESEND_API_KEY` is empty and you're not in production, OTP codes are printed to the server console.

Checks:

```bash
npm run lint && npm run typecheck && npm test   # unit tests
npm run test:db                                 # RLS suite on a throwaway Postgres 16 (no Docker)
```

## Deploying

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.
