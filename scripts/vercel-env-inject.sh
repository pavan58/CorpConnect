#!/usr/bin/env bash
# Bulk-inject production env vars into Vercel from a local, git-ignored file.
# Usage: VERCEL_TOKEN=... ./scripts/vercel-env-inject.sh [.env.production.local]
# Run once after `vercel link`. Existing values are overwritten (--force).
set -euo pipefail
FILE="${1:-.env.production.local}"
[[ -f "$FILE" ]] || { echo "Missing $FILE"; exit 1; }
: "${VERCEL_TOKEN:?missing}"
command -v vercel >/dev/null || npm i -g vercel@latest

set -a; source "$FILE"; set +a

PUBLIC=(NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY NEXT_PUBLIC_APP_URL RESEND_FROM_EMAIL)
SECRET=(SUPABASE_SERVICE_ROLE_KEY RESEND_API_KEY RESEND_WEBHOOK_SECRET OTP_SECRET)

for k in "${PUBLIC[@]}" "${SECRET[@]}"; do
  [[ -n "${!k:-}" ]] || { echo "Missing value for $k in $FILE"; exit 1; }
done
[[ "$NEXT_PUBLIC_APP_URL" == https://* ]] || { echo "NEXT_PUBLIC_APP_URL must be https (e.g. https://corpconnect.in)"; exit 1; }

for k in "${PUBLIC[@]}"; do
  printf '%s' "${!k}" | vercel env add "$k" production --force --token "$VERCEL_TOKEN" >/dev/null
  echo "set    $k"
done
for k in "${SECRET[@]}"; do
  printf '%s' "${!k}" | vercel env add "$k" production --sensitive --force --token "$VERCEL_TOKEN" >/dev/null
  echo "set    $k (sensitive)"
done
echo "Done. NEXT_PUBLIC_* are baked in at build time -> redeploy for changes to apply."
