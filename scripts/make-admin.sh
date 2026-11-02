#!/usr/bin/env bash
# Promote an already-verified member to admin (run once for yourself after you register).
# Usage: SUPABASE_DB_URL=postgresql://... ./scripts/make-admin.sh you@yourcompany.com
set -euo pipefail
: "${SUPABASE_DB_URL:?set SUPABASE_DB_URL (Dashboard → Connect → Session pooler URI)}"
email="${1:?email}"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -v email="$email" <<'SQL'
update public.profiles set role = 'admin'
where corporate_email = lower(:'email') and verification_status = 'verified_employee'
returning id, full_name, role;
SQL
