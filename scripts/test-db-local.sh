#!/usr/bin/env bash
# Applies every migration to a throwaway PostgreSQL 16 cluster and runs the RLS
# test suite. Needs postgres 16 binaries (apt install postgresql-16) — no Docker.
# Against a real local Supabase instead:  DATABASE_URL=postgres://... scripts/test-db-local.sh
set -euo pipefail
shopt -s nullglob
cd "$(dirname "$0")/.."

run_suite() {
  local url="$1" stub="${2:-}"
  [[ -n "$stub" ]] && psql "$url" -q -v ON_ERROR_STOP=1 -f tests/db/supabase_stub.sql
  for m in supabase/migrations/*.sql; do
    echo "==> $m"; psql "$url" -q -v ON_ERROR_STOP=1 -f "$m"
  done
  echo "==> tests/db/rls_test.sql"
  psql "$url" -qAt -v ON_ERROR_STOP=1 -f tests/db/rls_test.sql 2>&1 | sed "s/^psql:[^ ]* NOTICE:  //"
}

if [[ -n "${DATABASE_URL:-}" ]]; then
  # Real Supabase stack: migrations were already applied by `supabase start`.
  psql "$DATABASE_URL" -qAt -v ON_ERROR_STOP=1 -f tests/db/rls_test.sql
  exit 0
fi

PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/16/bin 2>/dev/null || dirname "$(command -v initdb)")}"
DIR="$(mktemp -d)"; PORT="${PGPORT_TEST:-54329}"
RUNAS=(); [[ "$(id -u)" == 0 ]] && { chown -R postgres "$DIR"; RUNAS=(sudo -u postgres); command -v sudo >/dev/null || RUNAS=(runuser -u postgres --); }
cleanup() { "${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$DIR/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DIR"; }
trap cleanup EXIT
"${RUNAS[@]}" "$PGBIN/initdb" -D "$DIR/data" -U postgres -A trust >/dev/null
"${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$DIR/data" -o "-p $PORT -k $DIR -c wal_level=logical" -l "$DIR/log" -w start >/dev/null
run_suite "postgresql://postgres@localhost:$PORT/postgres?host=$DIR" stub
echo "ALL DB TESTS PASSED"
