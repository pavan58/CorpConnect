#!/usr/bin/env bash
# Applies production Supabase Auth settings via the Management API.
# OTP emails are NOT sent by Supabase: the app generates the code and sends it
# through the Resend API itself, so no SMTP setup is needed here.
# Env: SUPABASE_ACCESS_TOKEN SUPABASE_PROJECT_REF [APP_URL]
set -euo pipefail
: "${SUPABASE_ACCESS_TOKEN:?}" "${SUPABASE_PROJECT_REF:?}"
APP_URL="${APP_URL:-https://corpconnect.in}"
command -v jq >/dev/null || { echo "install jq"; exit 1; }

body=$(jq -n --arg site "$APP_URL" '{
  disable_signup: true,
  external_email_enabled: true,
  mailer_autoconfirm: false,
  password_min_length: 10,
  jwt_exp: 3600,
  refresh_token_rotation_enabled: true,
  security_refresh_token_reuse_interval: 10,
  site_url: $site,
  uri_allow_list: ($site + "/**")
}')

curl -fsS -X PATCH "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" \
  -d "$body" | jq '{disable_signup, password_min_length, site_url, jwt_exp}'
echo "Auth configured: public sign-up disabled (accounts are created server-side after the corporate-domain check)."
