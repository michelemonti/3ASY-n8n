# 3ASY n8n

Self-hosted n8n on Railway with PostgreSQL, persistent storage, and public HTTPS webhooks.

This repository is a fork of [n8n](https://github.com/n8n-io/n8n). It keeps the upstream source available for future 3ASY customizations and adds a repeatable Railway deployment path. The default deployment uses the official pinned Docker image rather than building this monorepo.

## Fast path

### 1. Prepare Railway

Create an empty Railway project. Then clone this repository and open it in a WSL terminal:

```bash
git clone https://github.com/michelemonti/3ASY-n8n.git
cd 3ASY-n8n
npm install -g @railway/cli
railway login --browserless
railway link
```

Choose your Railway workspace, the empty project, and the `production` environment.

### 2. Run the guided setup

```bash
bash railway-setup.sh
```

The script safely creates or reuses:

- a `Postgres` database;
- an `n8n` service from `docker.n8n.io/n8nio/n8n:2.41.7`;
- a persistent volume at `/home/node/.n8n`;
- PostgreSQL references and the required n8n variables;
- a stable encryption key when the service is new;
- the Railway volume permission fix;
- a Railway HTTPS domain on port `5678`;
- the public editor and webhook URLs.

The script is designed to be rerun. It does not replace an existing `N8N_ENCRYPTION_KEY`.

### 3. Verify

At the end, open the URL printed by the script and create the owner account. Then create a workflow named `00 — Installation check`:

```text
Manual Trigger → Edit Fields
status = ok
```

Save it, redeploy n8n, and confirm that the workflow is still present.

## Architecture

| Component | Configuration |
| --- | --- |
| Runtime | Railway |
| Application | `docker.n8n.io/n8nio/n8n:2.41.7` |
| Database | Dedicated PostgreSQL service |
| Persistent data | Railway volume at `/home/node/.n8n` |
| Public traffic | HTTPS to port `5678` |
| Healthcheck | `/healthz` |
| Time zone | `Europe/Rome` |

See [RAILWAY.md](./RAILWAY.md) for manual installation, troubleshooting, updates, and recovery notes.

## Repository scope

The repository can also hold reviewed source customizations, custom nodes, and reusable workflow exports with credentials removed. Never commit credentials, encryption keys, database exports, or workflow exports that contain secrets.

The production service uses the official Docker image. Changes to this fork do not reach production until the Railway service is deliberately moved to a source build.

## Upstream and license

The upstream source is distributed under the [Sustainable Use License](./LICENSE.md) and [n8n Enterprise License](./LICENSE_EE.md). See the [official n8n documentation](https://docs.n8n.io/) for product documentation.
