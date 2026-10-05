# Railway deployment guide

This guide deploys one n8n instance with one PostgreSQL database and one persistent volume.

## Target layout

- Service `Postgres`: Railway PostgreSQL.
- Service `n8n`: `docker.n8n.io/n8nio/n8n:2.41.7`.
- Volume `n8n-volume`: mounted at `/home/node/.n8n`.
- Public domain: HTTPS routed to port `5678`.
- One replica, serverless disabled, healthcheck `/healthz`.

The service names matter because the n8n configuration references `Postgres` by name.

## Automated installation

From the repository root:

```bash
npm install -g @railway/cli
railway login --browserless
railway link
bash railway-setup.sh
```

The script prints the generated encryption key only when it creates one. Save that key in a password manager. It must remain stable because n8n uses it to encrypt stored credentials.

## Manual installation

### 1. Confirm the target

```bash
railway status
railway environment production
railway service list
```

Always inspect the linked project and environment before creating resources. Railway resources are environment-scoped.

### 2. Create PostgreSQL

Skip this command if a service named `Postgres` already exists:

```bash
railway add --database postgres --json
```

### 3. Create n8n and connect its image

Skip the first command if `n8n` already exists:

```bash
railway add --service n8n --json
railway service source connect --service n8n --image docker.n8n.io/n8nio/n8n:2.41.7
railway service n8n
```

### 4. Add persistent storage

Skip this command if n8n already has a volume at this path:

```bash
railway volume add --mount-path /home/node/.n8n
```

Railway mounts volumes as root. The official n8n image normally runs as the non-root `node` user. `RAILWAY_RUN_UID=0` prevents `EACCES: permission denied` on `/home/node/.n8n/config`.

### 5. Configure n8n

Single quotes preserve Railway reference variables in Bash:

```bash
railway variable set --service n8n --skip-deploys \
  'DB_TYPE=postgresdb' \
  'DB_POSTGRESDB_HOST=${{Postgres.PGHOST}}' \
  'DB_POSTGRESDB_PORT=${{Postgres.PGPORT}}' \
  'DB_POSTGRESDB_DATABASE=${{Postgres.PGDATABASE}}' \
  'DB_POSTGRESDB_USER=${{Postgres.PGUSER}}' \
  'DB_POSTGRESDB_PASSWORD=${{Postgres.PGPASSWORD}}' \
  'PORT=5678' \
  'N8N_PORT=5678' \
  'N8N_PROTOCOL=https' \
  'N8N_PROXY_HOPS=1' \
  'GENERIC_TIMEZONE=Europe/Rome' \
  'TZ=Europe/Rome' \
  'RAILWAY_RUN_UID=0'
```

Generate the encryption key once:

```bash
openssl rand -hex 32
railway variable set --service n8n N8N_ENCRYPTION_KEY --stdin --skip-deploys
```

Paste the generated key, press Enter, then press `Ctrl+D`. Keep a copy in a password manager.

### 6. Deploy and inspect

```bash
railway redeploy --service n8n --yes
railway status
railway logs --service n8n --latest --lines 100
```

A healthy startup ends with `Editor is now accessible` and an `Online` service status. A Python task runner warning is non-blocking unless your workflows use Python Code nodes.

### 7. Create public networking

```bash
railway domain --service n8n --port 5678
railway domain list --service n8n
```

Copy the generated host without `https://`:

```bash
DOMAIN='replace-with-your-domain.up.railway.app'
railway variable set --service n8n --skip-deploys \
  "N8N_HOST=$DOMAIN" \
  "N8N_EDITOR_BASE_URL=https://$DOMAIN/" \
  "N8N_WEBHOOK_URL=https://$DOMAIN/"
railway environment edit \
  --service-config n8n deploy.healthcheckPath /healthz \
  --message "Configure n8n healthcheck"
railway redeploy --service n8n --yes
curl -fsS "https://$DOMAIN/healthz"
```

Keep one replica and keep serverless disabled.

## Troubleshooting

### `ServiceInstance not found`

The CLI is linked to the wrong service or environment, or the service is absent there:

```bash
railway status
railway environment production
railway service list
railway service n8n
```

### `EACCES: permission denied, open '/home/node/.n8n/config'`

```bash
railway variable set --service n8n RAILWAY_RUN_UID=0 --skip-deploys
railway redeploy --service n8n --yes
```

### Editor URL shows `localhost`

Create the public domain, set `N8N_HOST`, `N8N_EDITOR_BASE_URL`, and `N8N_WEBHOOK_URL`, then redeploy.

### Database connection failure

Confirm that the database is named exactly `Postgres` and that the five `DB_POSTGRESDB_*` values still contain Railway references. Do not replace them with public database credentials.

## Updating n8n

Pin upgrades deliberately. Change the Docker image only after checking the n8n release notes:

```bash
railway service source connect --service n8n --image docker.n8n.io/n8nio/n8n:VERSION
railway logs --service n8n --latest --lines 100
```

Back up PostgreSQL and the n8n volume before a major-version upgrade.

## Important operational rules

- Keep `N8N_ENCRYPTION_KEY` stable and outside Git.
- Back up PostgreSQL and the volume.
- Do not run `railway up` for this image-based service. It uploads the monorepo and changes the deployment source.
- Never expose PostgreSQL publicly unless an external client specifically requires it.
