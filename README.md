# 3ASY n8n

A practical self-hosted n8n distribution plus a lightweight 3ASY operations view.

n8n already provides an excellent workflow editor, debugger, and administration interface. This project does not replace it. The 3ASY layer is a deliberately simpler, read-only dashboard for everyday monitoring: health, execution volume, failures, and the workflows that need human attention.

## What is included

| Layer | Purpose |
| --- | --- |
| n8n | Create, test, debug, and maintain workflows |
| 3ASY Monitor | Understand operational status in a few seconds |
| Railway setup | Reproduce a persistent self-hosted deployment |
| PostgreSQL | Store n8n workflows, credentials, and execution data |

The production deployment uses the official pinned n8n image. This repository remains a fork so upstream source and licensing stay explicit, while 3ASY-specific additions live in isolated directories.

## 3ASY Monitor prototype

The first interface draft is dependency-free and uses safe demo data:

```bash
cd monitor
python3 -m http.server 4173
```

Open `http://localhost:4173`.

The monitor is intentionally read-only. It shows:

- system health;
- active workflows and recent executions;
- success rate and estimated time saved;
- failures that need attention;
- a direct path back to the full n8n interface.

See [monitor/README.md](./monitor/README.md) for the integration boundary. In production, a server-side adapter will call the n8n Public API so an API key is never exposed in the browser.

## Railway fast path

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

### 3. Verify persistence

Open the URL printed by the script and create the owner account. Then create a workflow named `00 — Installation check`:

```text
Manual Trigger → Edit Fields
status = ok
```

Save it, redeploy n8n, and confirm that the workflow is still present.

See [RAILWAY.md](./RAILWAY.md) for manual installation, troubleshooting, updates, and recovery notes.

## Project boundary

Public, reusable material belongs here:

- deployment automation;
- the generic monitoring interface;
- sanitized workflow templates;
- generic operating patterns and documentation.

Private project configuration does not belong here. Never commit credentials, encryption keys, database exports, customer data, private endpoints, or workflow exports containing secrets.

## Upstream and license

The upstream source is distributed under the [Sustainable Use License](./LICENSE.md) and [n8n Enterprise License](./LICENSE_EE.md). See the [official n8n documentation](https://docs.n8n.io/) for product documentation.
