#!/usr/bin/env bash
set -Eeuo pipefail

N8N_SERVICE="${N8N_SERVICE:-n8n}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-Postgres}"
RAILWAY_ENVIRONMENT="${RAILWAY_ENVIRONMENT:-production}"
N8N_IMAGE="${N8N_IMAGE:-docker.n8n.io/n8nio/n8n:2.41.7}"
N8N_VOLUME_PATH="/home/node/.n8n"

info() {
  printf '\n==> %s\n' "$1"
}

fail() {
  printf '\nError: %s\n' "$1" >&2
  exit 1
}

command -v railway >/dev/null 2>&1 || fail "Railway CLI is missing. Run: npm install -g @railway/cli"
command -v openssl >/dev/null 2>&1 || fail "OpenSSL is required to generate the n8n encryption key."

info "Checking Railway authentication"
railway whoami >/dev/null 2>&1 || fail "Log in first with: railway login --browserless"

if ! railway status >/dev/null 2>&1; then
  info "Link this directory to your Railway project"
  railway link
fi

info "Using Railway environment: $RAILWAY_ENVIRONMENT"
railway environment "$RAILWAY_ENVIRONMENT"

service_exists() {
  railway service list 2>/dev/null | sed -E 's/ \(linked\)$//' | grep -Eq "^${1}([[:space:]]|$)"
}

if service_exists "$POSTGRES_SERVICE"; then
  info "Reusing PostgreSQL service: $POSTGRES_SERVICE"
else
  info "Creating PostgreSQL service: $POSTGRES_SERVICE"
  railway add --database postgres --json
fi

n8n_is_new=false
if service_exists "$N8N_SERVICE"; then
  info "Reusing n8n service: $N8N_SERVICE"
else
  info "Creating n8n service: $N8N_SERVICE"
  railway add --service "$N8N_SERVICE" --json
  n8n_is_new=true
fi

info "Pinning the n8n image: $N8N_IMAGE"
railway service source connect --service "$N8N_SERVICE" --image "$N8N_IMAGE"
railway service "$N8N_SERVICE"

if railway status 2>/dev/null | grep -Fq "$N8N_VOLUME_PATH"; then
  info "Reusing persistent volume at $N8N_VOLUME_PATH"
else
  info "Creating persistent volume at $N8N_VOLUME_PATH"
  railway volume add --mount-path "$N8N_VOLUME_PATH"
fi

info "Applying n8n and PostgreSQL configuration"
railway variable set --service "$N8N_SERVICE" --skip-deploys \
  'DB_TYPE=postgresdb' \
  "DB_POSTGRESDB_HOST=\${{${POSTGRES_SERVICE}.PGHOST}}" \
  "DB_POSTGRESDB_PORT=\${{${POSTGRES_SERVICE}.PGPORT}}" \
  "DB_POSTGRESDB_DATABASE=\${{${POSTGRES_SERVICE}.PGDATABASE}}" \
  "DB_POSTGRESDB_USER=\${{${POSTGRES_SERVICE}.PGUSER}}" \
  "DB_POSTGRESDB_PASSWORD=\${{${POSTGRES_SERVICE}.PGPASSWORD}}" \
  'PORT=5678' \
  'N8N_PORT=5678' \
  'N8N_PROTOCOL=https' \
  'N8N_PROXY_HOPS=1' \
  'GENERIC_TIMEZONE=Europe/Rome' \
  'TZ=Europe/Rome' \
  'RAILWAY_RUN_UID=0'

set_encryption_key=false
if railway variable list --service "$N8N_SERVICE" --kv 2>/dev/null | sed 's/=.*//' | grep -qx 'N8N_ENCRYPTION_KEY'; then
  info "Keeping the existing N8N_ENCRYPTION_KEY"
elif [[ "$n8n_is_new" == true ]]; then
  set_encryption_key=true
else
  printf '\nThe existing service has no readable N8N_ENCRYPTION_KEY.\n'
  printf 'It might be absent or sealed in Railway. Replacing a real key would make stored credentials unreadable.\n'
  read -r -p "Generate and set a new key? [y/N] " replace_key
  if [[ "$replace_key" =~ ^[Yy]$ ]]; then
    set_encryption_key=true
  fi
fi

if [[ "$set_encryption_key" == true ]]; then
  encryption_key="$(openssl rand -hex 32)"
  printf '%s' "$encryption_key" | railway variable set --service "$N8N_SERVICE" N8N_ENCRYPTION_KEY --stdin --skip-deploys
  printf '\nSave this N8N_ENCRYPTION_KEY in your password manager:\n%s\n' "$encryption_key"
  unset encryption_key
fi

info "Creating or reusing the Railway domain"
domain_output="$(railway domain list --service "$N8N_SERVICE" 2>/dev/null || true)"
domain="$(printf '%s\n' "$domain_output" | grep -Eo '[A-Za-z0-9.-]+\.up\.railway\.app' | head -n 1 || true)"

if [[ -z "$domain" ]]; then
  domain_output="$(railway domain --service "$N8N_SERVICE" --port 5678)"
  printf '%s\n' "$domain_output"
  domain="$(printf '%s\n' "$domain_output" | grep -Eo '[A-Za-z0-9.-]+\.up\.railway\.app' | head -n 1 || true)"
fi

if [[ -z "$domain" ]]; then
  read -r -p "Paste the generated Railway domain without https://: " domain
fi

domain="${domain#https://}"
domain="${domain%/}"
[[ "$domain" == *.up.railway.app ]] || fail "The Railway domain is not valid: $domain"

info "Configuring the public n8n URLs"
railway variable set --service "$N8N_SERVICE" --skip-deploys \
  "N8N_HOST=$domain" \
  "N8N_EDITOR_BASE_URL=https://$domain/" \
  "N8N_WEBHOOK_URL=https://$domain/"

info "Configuring the n8n healthcheck"
railway environment edit \
  --service-config "$N8N_SERVICE" deploy.healthcheckPath /healthz \
  --message "Configure n8n healthcheck"

info "Deploying n8n"
railway redeploy --service "$N8N_SERVICE" --yes

info "Current Railway status"
railway status

if command -v curl >/dev/null 2>&1; then
  info "Waiting for the health endpoint"
  healthy=false
  for _ in {1..24}; do
    if curl -fsS "https://$domain/healthz" >/dev/null 2>&1; then
      healthy=true
      break
    fi
    sleep 5
  done

  if [[ "$healthy" == true ]]; then
    printf '\nn8n is online: https://%s/\n' "$domain"
  else
    printf '\nn8n is still starting. Inspect it with:\nrailway logs --service %s --latest --lines 100\n' "$N8N_SERVICE"
  fi
else
  printf '\nOpen n8n: https://%s/\n' "$domain"
fi

printf '\nIn Railway, keep one replica and keep serverless disabled.\n'
