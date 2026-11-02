#!/usr/bin/env bash
# Creates corpconnect.in in Resend (if missing), prints the exact DNS records, then triggers verification.
# Env: RESEND_API_KEY (full-access key)
set -euo pipefail
: "${RESEND_API_KEY:?missing}"
API=https://api.resend.com; H=(-H "Authorization: Bearer $RESEND_API_KEY" -H "Content-Type: application/json")

id=$(curl -fsS "${H[@]}" "$API/domains" | jq -r '.data[]? | select(.name=="corpconnect.in") | .id' | head -1)
if [[ -z "$id" ]]; then
  id=$(curl -fsS "${H[@]}" -X POST "$API/domains" -d '{"name":"corpconnect.in","region":"ap-northeast-1"}' | jq -r .id)
fi
echo "Domain id: $id"
curl -fsS "${H[@]}" "$API/domains/$id" | jq -r '.records[] | [.record,.type,.name,(.priority//""|tostring),.value,.status] | @tsv'
echo "--- add the records above at your DNS host, then verifying ---"
curl -fsS "${H[@]}" -X POST "$API/domains/$id/verify" >/dev/null
sleep 20
curl -fsS "${H[@]}" "$API/domains/$id" | jq '{status, records: [.records[]|{record,status}]}'
