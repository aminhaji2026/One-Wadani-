#!/usr/bin/env bash
# Deploy THIS branch to a brand-new Railway project.
# Does NOT touch existing Railway projects (e.g. production "waddani").
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NAME="${RAILWAY_NEW_PROJECT_NAME:-waddani-notice-board}"
MSG="${1:-Deploy events notice board (isolated new project)}"

echo "==> Creating new Railway project: $NAME"
railway init --name "$NAME"

echo "==> Adding Postgres"
railway add --database postgres --json

echo "==> Adding api + web services"
railway add --service api --json
railway add --service web --json

echo "==> Configuring API Dockerfile build"
railway environment edit --service-config api build.builder DOCKERFILE --message "API Dockerfile builder"
railway environment edit --service-config api build.dockerfilePath apps/api/Dockerfile --message "API Dockerfile path"
railway environment edit --service-config api deploy.healthcheckPath /health --message "API healthcheck"

JWT="change-me-notice-board-$(openssl rand -hex 12)"
railway variable set \
  'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  "JWT_SECRET=$JWT" \
  SEED_ON_BOOT=true \
  WEB_ORIGIN='*' \
  --service api --skip-deploys

echo "==> Deploying API"
railway up --service api --detach -m "$MSG (api)"
for i in $(seq 1 90); do
  STATUS=$(railway deployment list --service api --json | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d[0]["status"] if d else "NONE")')
  echo "  api status: $STATUS ($i)"
  case "$STATUS" in
    SUCCESS) break ;;
    FAILED|CRASHED) railway logs --service api --build --lines 100; exit 1 ;;
  esac
  sleep 12
done

# Public API domain (Railway injects PORT=8080 by default)
railway domain --service api --port 8080 --json >/tmp/api-domain.json || true
railway domain update "$(python3 -c 'import json; print(json.load(open("/tmp/api-domain.json"))["domain"].replace("https://",""))' 2>/dev/null || true)" --port 8080 --service api --json 2>/dev/null || true
API_HOST=$(railway domain list --service api --json | python3 -c 'import json,sys; d=json.load(sys.stdin); x=d[0] if isinstance(d,list) and d else d; print((x.get("domain") or x.get("domain",{}).get("domain","")).replace("https://",""))' 2>/dev/null || true)
if [ -z "${API_HOST:-}" ]; then
  API_HOST=$(python3 - <<'PY'
import json
try:
  print(json.load(open('/tmp/api-domain.json'))['domain'].replace('https://',''))
except Exception:
  pass
PY
)
fi
API_URL="https://${API_HOST}/api"
echo "API_URL=$API_URL"

echo "==> Configuring Web"
railway environment edit --service-config web build.builder DOCKERFILE --message "Web Dockerfile builder"
railway environment edit --service-config web build.dockerfilePath apps/web/Dockerfile --message "Web Dockerfile path"
sed -i "s|ARG VITE_API_URL=.*|ARG VITE_API_URL=${API_URL}|" apps/web/Dockerfile
railway variable set "VITE_API_URL=${API_URL}" --service web --skip-deploys

echo "==> Deploying Web"
railway up --service web --detach -m "$MSG (web)"
for i in $(seq 1 90); do
  STATUS=$(railway deployment list --service web --json | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d[0]["status"] if d else "NONE")')
  echo "  web status: $STATUS ($i)"
  case "$STATUS" in
    SUCCESS) break ;;
    FAILED|CRASHED) railway logs --service web --build --lines 100; exit 1 ;;
  esac
  sleep 12
done

railway domain --service web --port 80 --json >/tmp/web-domain.json || true
WEB_HOST=$(python3 - <<'PY'
import json
try:
  print(json.load(open('/tmp/web-domain.json'))['domain'].replace('https://',''))
except Exception:
  print('')
PY
)
if [ -n "$WEB_HOST" ]; then
  railway domain update "$WEB_HOST" --port 80 --service web --json || true
fi

echo "==> Isolated project ready"
echo "Project: $(railway status --json | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["id"], d["name"])')"
echo "Web: https://${WEB_HOST:-web.up.railway.app}"
echo "API: https://${API_HOST}/health"
