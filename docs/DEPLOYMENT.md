# Deploying CorpConnect Pune to production

Allow about an hour. You need accounts on **Supabase** (Pro plan recommended, for daily backups and the PITR add-on), **Vercel**, **Resend**, and DNS access for `corpconnect.in`. Install these tools: `node 22`, `supabase` CLI, `vercel` CLI, `gh`, `jq`, `psql`.

## 1. Supabase project

1. Create a project in **ap-south-1 (Mumbai)**, which is next to Vercel's `bom1` region. Save the DB password.
2. Note these values from **Project Settings → API**: the project URL, the `anon` key and the `service_role` key. The **project ref** is the subdomain of the URL.
3. Create an access token at https://supabase.com/dashboard/account/tokens.
4. Apply the schema:

   ```bash
   export SUPABASE_ACCESS_TOKEN=... SUPABASE_DB_PASSWORD=... SUPABASE_PROJECT_REF=...
   export NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=...
   ./scripts/deploy-db.sh
   ```

5. Turn off public sign-up and set the site URL:

   ```bash
   APP_URL=https://corpconnect.in ./scripts/configure-auth.sh
   ```

6. In the dashboard, open **Realtime → Settings** and turn off **Allow public access**. Chat only uses authenticated `postgres_changes`, which respects RLS.

## 2. Resend (OTP email)

1. Add the domain and print the DNS records:

   ```bash
   RESEND_API_KEY=<full-access key> ./scripts/resend-dns.sh
   ```

2. Add the records from the output, plus `dns/corpconnect.in.zone`, at your DNS host. Then re-run the script until every record reads `verified`.
   - SPF goes on `send.corpconnect.in`, not the root domain.
   - DMARC starts at `p=none`. Move it to `quarantine`, then `reject`, after about 4 weeks of clean reports.
3. Create a **sending-only** API key for the app. That is `RESEND_API_KEY`.
4. Under **Webhooks**, add `https://corpconnect.in/api/webhooks/resend` for the `email.bounced` and `email.complained` events. Copy the signing secret: that is `RESEND_WEBHOOK_SECRET`.
5. Ask the IT or mail team at your launch companies to allow-list `no-reply@corpconnect.in`. Corporate filters (Mimecast, Proofpoint, M365 quarantine) often hold mail from new senders.

## 3. Vercel

1. Run `vercel link`. Create the project and choose framework "Next.js".
2. Copy `.env.production.local.example` to `.env.production.local` and fill it in. Generate `OTP_SECRET` with `openssl rand -base64 32`.
3. Push the variables to Vercel:

   ```bash
   VERCEL_TOKEN=... ./scripts/vercel-env-inject.sh
   ```

4. Under **Project → Settings → Deployment Protection**, create a **Protection Bypass for Automation** secret. That is `VERCEL_AUTOMATION_BYPASS_SECRET`.
5. Add the domains `corpconnect.in` and `www.corpconnect.in`. The DNS records are in `dns/corpconnect.in.zone`.

Vercel's GitHub integration deploys every push to `main`. Pull requests get preview deployments.

## 4. GitHub Actions (tests only)

`.github/workflows/ci.yml` runs on every push and pull request:
- lint, typecheck, unit tests and a production build
- the RLS suite on plain Postgres 16
- the RLS suite on a real `supabase start` stack, plus `supabase db lint`

No GitHub secrets are needed. Apply new database migrations with `./scripts/deploy-db.sh` before merging the code that depends on them.

## 5. First admin

Register yourself through the site with your corporate email and verify the code. Then promote yourself:

```bash
SUPABASE_DB_URL='postgresql://postgres.<ref>:<password>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres' \
  ./scripts/make-admin.sh you@yourcompany.com
```

## 6. Launch checklist

- [ ] `curl https://corpconnect.in/api/health` returns `"status":"ok"`.
- [ ] Register with a real `@tcs.com`, `@infosys.com` or other launch-company address. The code arrives within 1 minute and doesn't land in spam.
- [ ] `@gmail.com` is rejected on the form and on the server.
- [ ] An unknown corporate domain shows up under **Admin → Company domain requests**.
- [ ] Create a listing with photos. The photos load for a second verified account.
- [ ] Chat in two browsers. Messages appear live in both directions.
- [ ] Request a referral and mark it referred. The status updates for the requester.
- [ ] Privacy Policy and Terms reviewed by counsel (DPDP Act 2023). The current pages are drafts.
- [ ] Supabase backups: daily backups are on, and PITR is enabled if you need restores finer than one day.

## Rollback

- **App:** `VERCEL_TOKEN=... ./scripts/rollback.sh app` brings back the previous production deployment instantly.
- **Database:** write a forward-fixing migration. For data loss, run `CONFIRM_RESTORE=<ref> ./scripts/rollback.sh db "<ISO time>"`. This needs PITR and is destructive.

## Operating notes

- **OTP limits:** 5 sends and 5 verifies per email per 15 minutes, and 20 per IP. Codes expire after 10 minutes and allow 5 wrong tries. There is a 60-second resend cooldown.
- Bounced or complained addresses go into `email_suppressions`. Delete the row to let that address receive mail again.
- **Adding a company:** use **Admin → approve domain**, or run SQL: `insert into company_domains (domain, company_id) ...`.
- **Expanding beyond Pune:** this needs a migration. Relax the `city = 'Pune'` checks and add zones, hubs and pickup points.
