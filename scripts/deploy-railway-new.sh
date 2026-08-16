#!/usr/bin/env bash
# Deploy THIS branch to a brand-new Railway project.
# Does NOT touch existing Railway projects (e.g. production).
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

echo "==> Configuring API"
railway environment edit --service-config api build.builder DOCKERFILE
railway environment edit --service-config api build.dockerfilePath "apps/api/Dockerfile"
railway environment edit --service-config api deploy.healthcheckPath "/health"
railway variable set \
  DATABASE_URL='${{Postgres.DATABASE_URL}}' \
  JWT_SECRET="change-me-notice-board-$(openssl rand -hex 12)" \
  SEED_ON_BOOT=true \
  WEB_ORIGIN='*' \
  --service api --skip-deploys

echo "==> Deploying API first (needed for public URL)"
railway up --service api --detach -m "$MSG (api)"
echo "Waiting for API SUCCESS..."
for i in $(seq 1 60); do
  STATUS=$(railway deployment list --service api --json | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d[0]["status"] if d else "NONE")')
  echo "  api status: $STATUS ($i)"
  case "$STATUS" in
    SUCCESS) break ;;
    FAILED|CRASHED) echo "API deploy failed"; railway logs --service api --build --lines 80; exit 1 ;;
  esac
  sleep 15
done

API_DOMAIN=$(railway domain --service api 2>/dev/null || true)
if [ -z "${API_DOMAIN:-}" ]; then
  railway domain --service api >/dev/null || true
  sleep 2
  API_DOMAIN=$(railway domain --service api 2>/dev/null || true)
fi
# Prefer JSON if available
API_URL=$(railway variable list --service api --json 2>/dev/null | python3 -c 'import json,sys
try:
  vars=json.load(sys.stdin)
except Exception:
  vars=[]
# fallback below
print("")' 2>/dev/null || true)

# Generate domain listing via status/JSON when possible
PUBLIC_API=$(railway status --json | python3 - <<'PY'
import json,sys,os
# best-effort empty; domain command output used below
print("")
PY
)

# Resolve domain from `railway domain` text or force create
DOMAIN_OUT=$(railway domain --service api 2>&1 || true)
echo "$DOMAIN_OUT"
API_HOST=$(echo "$DOMAIN_OUT" | python3 -c 'import sys,re; t=sys.stdin.read(); m=re.search(r"https?://[a-zA-Z0-9.-]+\.up\.railway\.app", t); print(m.group(0) if m else "")')
if [ -z "$API_HOST" ]; then
  # railway domain may print bare hostname
  API_HOST=$(echo "$DOMAIN_OUT" | python3 -c 'import sys,re; t=sys.stdin.read(); m=re.search(r"[a-zA-Z0-9.-]+\.up\.railway\.app", t); print(("https://"+m.group(0)) if m else "")')
fi
if [ -z "$API_HOST" ]; then
  echo "Could not resolve API public domain yet; web will need VITE_API_URL set manually."
  API_HOST="https://REPLACE_ME.up.railway.app"
fi

echo "==> Configuring Web with VITE_API_URL=${API_HOST}/api"
railway environment edit --service-config web build.builder DOCKERFILE
railway environment edit --service-config web build.dockerfilePath "apps/web/Dockerfile"
# Bake API URL into the web image build via ARG/ENV already in Dockerfile; also set service var for rebuilds
railway variable set VITE_API_URL="${API_HOST}/api" --service web --skip-deploys

# Patch Dockerfile ARG for this isolated deploy if needed
# Prefer build arg via railway if supported; otherwise sed a temporary value into Dockerfile for upload
if grep -q 'ARG VITE_API_URL=' apps/web/Dockerfile; then
  sed -i "s|ARG VITE_API_URL=.*|ARG VITE_API_URL=${API_HOST}/api|" apps/web/Dockerfile
fi

echo "==> Deploying Web"
railway up --service web --detach -m "$MSG (web)"
for i in $(seq 1 60); do
  STATUS=$(railway deployment list --service web --json | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d[0]["status"] if d else "NONE")')
  echo "  web status: $STATUS ($i)"
  case "$STATUS" in
    SUCCESS) break ;;
    FAILED|CRASHED) echo "Web deploy failed"; railway logs --service web --build --lines 80; exit 1 ;;
  esac
  sleep 15
done

railway domain --service web >/dev/null 2>&1 || true
echo "==> Done. New isolated project '$NAME' deployed."
railway status --json | python3 -m json.tool | head -80
railway domain --service web 2>&1 || true
railway domain --service api 2>&1 || true
