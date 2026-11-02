#!/usr/bin/env bash
# Usage:
#   ./scripts/rollback.sh app [deployment-url]     # instant app rollback (previous prod if omitted)
#   ./scripts/rollback.sh db "2026-10-31T09:30:00Z"  # PITR restore (DESTRUCTIVE, in-place, brief downtime)
set -euo pipefail
cmd="${1:-}"; arg="${2:-}"

case "$cmd" in
  app)
    : "${VERCEL_TOKEN:?}"
    if [[ -n "$arg" ]]; then vercel promote "$arg" --yes --token "$VERCEL_TOKEN"
    else vercel rollback --yes --token "$VERCEL_TOKEN"; fi
    vercel ls --prod --token "$VERCEL_TOKEN" | head -5
    ;;
  db)
    : "${SUPABASE_ACCESS_TOKEN:?}" "${SUPABASE_PROJECT_REF:?}"
    [[ -n "$arg" ]] || { echo "Provide an ISO8601 UTC time"; exit 1; }
    [[ "${CONFIRM_RESTORE:-}" == "$SUPABASE_PROJECT_REF" ]] || { echo "Set CONFIRM_RESTORE=$SUPABASE_PROJECT_REF to proceed"; exit 1; }
    ts=$(date -u -d "$arg" +%s)
    curl -fsS -X POST "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF/database/backups/restore-pitr" \
      -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" \
      -d "{\"recovery_time_target_unix\": $ts}"
    echo "Restore started. Project is unavailable until it finishes; watch the dashboard."
    ;;
  *) echo "usage: $0 app [url] | db <iso-time>"; exit 1 ;;
esac
