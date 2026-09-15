#!/usr/bin/env bash
set -euo pipefail

readonly DEPLOY_DIR=/home/dev/apps/taskly-production
readonly ENV_FILE="$DEPLOY_DIR/.env.production"
readonly COMPOSE_FILE="$DEPLOY_DIR/docker-compose.prod.yml"
readonly LOCK_FILE=/home/dev/apps/taskly-production.lock

sha="${1:-}"
if [[ ! "$sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Expected an exact 40-character commit SHA." >&2
  exit 2
fi

if [[ ! -d "$DEPLOY_DIR/.git" || ! -f "$ENV_FILE" ]]; then
  echo "Production checkout and .env.production must exist before deploy." >&2
  exit 1
fi

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Another Taskly production deploy is already running." >&2
  exit 1
fi

if [[ "$(stat -c '%a' "$ENV_FILE")" != 600 ]]; then
  echo ".env.production must have mode 600." >&2
  exit 1
fi

if ! rg -q '^APP_ENV=production$' "$ENV_FILE" \
  || ! rg -q '^APP_DEBUG=false$' "$ENV_FILE" \
  || ! rg -q '^APP_URL=https://taskly\.webarthem\.com\.br$' "$ENV_FILE" \
  || ! rg -q '^FRONTEND_URL=https://taskly\.webarthem\.com\.br$' "$ENV_FILE" \
  || ! rg -q '^SESSION_SECURE_COOKIE=true$' "$ENV_FILE" \
  || ! rg -q '^APP_KEY=base64:[A-Za-z0-9+/=]{43,}$' "$ENV_FILE" \
  || ! rg -q '^DB_PASSWORD=[^[:space:]]{32,}$' "$ENV_FILE" \
  || ! rg -q '^TASKLY_WEB_PORT=13080$' "$ENV_FILE" \
  || ! rg -q '^TASKLY_API_PORT=18081$' "$ENV_FILE"; then
  echo "Production environment is incomplete or unsafe." >&2
  exit 1
fi

if rg -q '^TASKLY_ENV_FILE=' "$ENV_FILE" \
  && ! rg -q '^TASKLY_ENV_FILE=\.env\.production$' "$ENV_FILE"; then
  echo "TASKLY_ENV_FILE must target .env.production." >&2
  exit 1
fi

cd "$DEPLOY_DIR"
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "Production checkout has tracked local modifications; refusing to overwrite them." >&2
  exit 1
fi

git fetch --no-tags origin "$sha"
git cat-file -e "$sha^{commit}"
git checkout --detach --quiet "$sha"
if [[ "$(git rev-parse HEAD)" != "$sha" ]]; then
  echo "Production checkout did not reach the requested SHA." >&2
  exit 1
fi

compose=(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE")
"${compose[@]}" config --quiet
"${compose[@]}" build api web
"${compose[@]}" up -d --wait --wait-timeout 120 postgres
"${compose[@]}" run --rm --no-deps --user www-data api php artisan migrate --force
"${compose[@]}" up -d --wait --wait-timeout 180 api web

curl --fail --silent --show-error --max-time 15 http://127.0.0.1:18081/up >/dev/null
curl --fail --silent --show-error --max-time 15 http://127.0.0.1:13080/ >/dev/null

echo "Taskly production SHA: $(git rev-parse HEAD)"
"${compose[@]}" ps
