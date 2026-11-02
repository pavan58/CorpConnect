#!/usr/bin/env bash
# Applies supabase/migrations to the linked production project.
# Env: SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD SUPABASE_PROJECT_REF
#      (+ NEXT_PUBLIC_SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY for the storage check)
set -euo pipefail
: "${SUPABASE_ACCESS_TOKEN:?missing}" "${SUPABASE_DB_PASSWORD:?missing}" "${SUPABASE_PROJECT_REF:?missing}"
command -v supabase >/dev/null || { echo "Install the Supabase CLI: https://supabase.com/docs/guides/cli"; exit 1; }
cd "$(dirname "$0")/.."

echo "==> Linking $SUPABASE_PROJECT_REF"
supabase link --project-ref "$SUPABASE_PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"

echo "==> Pending migrations"
supabase db push --dry-run --password "$SUPABASE_DB_PASSWORD"

echo "==> Applying"
supabase db push --password "$SUPABASE_DB_PASSWORD"

if [[ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" && -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  ./scripts/verify-storage.sh
fi
echo "DONE"
