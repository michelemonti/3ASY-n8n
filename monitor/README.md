# 3ASY Monitor prototype

A deliberately small, read-only operations view for n8n.

The full n8n editor remains the place to create, debug, and maintain workflows. This interface answers only four everyday questions:

1. Is the automation system healthy?
2. What ran recently?
3. What failed or needs human attention?
4. Where do I open the full n8n editor?

## Preview

No installation or build step is required:

```bash
cd monitor
python3 -m http.server 4173
```

Open `http://localhost:4173`.

The current prototype uses demo data and is safe to publish. It contains no credentials, private endpoints, customer data, or project-specific names.

## Intended integration

The browser must never receive an n8n API key. The production path will be:

```text
Browser → 3ASY server-side API → n8n Public API
```

The first read-only endpoints will expose:

- instance health;
- workflow status;
- recent executions and failures;
- aggregate success rate;
- direct links back to the corresponding workflow in n8n.

Any mutating action remains in n8n until there is a clear reason to expose it here.
