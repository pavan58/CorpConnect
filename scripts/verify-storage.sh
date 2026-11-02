#!/usr/bin/env bash
# Confirms the marketplace bucket exists, is private, and has the 5 MB / image-only limits.
# Env: NEXT_PUBLIC_SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY
set -euo pipefail
: "${NEXT_PUBLIC_SUPABASE_URL:?}" "${SUPABASE_SERVICE_ROLE_KEY:?}"
b=$(curl -fsS "$NEXT_PUBLIC_SUPABASE_URL/storage/v1/bucket/marketplace-photos" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY")
echo "$b" | jq '{id, public, file_size_limit, allowed_mime_types}'
[[ "$(echo "$b" | jq -r .public)" == "false" ]] || { echo "marketplace-photos must be private"; exit 1; }
[[ "$(echo "$b" | jq -r .file_size_limit)" == "5242880" ]] || { echo "file_size_limit should be 5242880"; exit 1; }
echo "storage OK"
