# stagecraft-webhook

The front door of [StageCraft](https://github.com/StagecraftOps): a deliberately tiny FastAPI service that receives GitHub webhooks, verifies them, and hands them off to SQS. Nothing else.

**Port**: 8001 · **Stack**: FastAPI, boto3 (SQS)

## How it works

```
GitHub (workflow_run, installation, code-scanning events)
   → POST /webhooks/github
   → HMAC-SHA256 signature check against GITHUB_WEBHOOK_SECRET
   → publish raw payload to SQS (stagecraft-webhooks queue)
   → 200 OK
```

It has **no database and no business logic** — that's the point. Webhook delivery must stay reliable regardless of API load or worker backlog, so this service does the minimum to accept an event durably and returns. Everything downstream (classification, analysis, persistence) happens in [stagecraft-worker](https://github.com/StagecraftOps/stagecraft-worker), which drains the queue.

Unverifiable signatures are rejected — GitHub retries failed deliveries, and the SQS queue's dead-letter queue (provisioned in [stagecraft-infra](https://github.com/StagecraftOps/stagecraft-infra)) parks messages that repeatedly fail downstream processing.

## What it needs

| Variable | Why |
|---|---|
| `GITHUB_WEBHOOK_SECRET` | Must match the secret configured on the GitHub App's webhook — signature verification fails closed |
| `SQS_QUEUE_URL`, `AWS_REGION` | Where events go (auth via IRSA in-cluster, or ambient AWS creds locally) |
| `ENVIRONMENT` | `prod`/`production` disables the interactive docs |

That's the entire config surface — see `app/core/config.py`.

## Run locally

```bash
cp .env.example .env
docker compose up --build
# POST http://localhost:8001/webhooks/github
```

To receive real GitHub events locally, tunnel with something like `smee.io` or `ngrok` and point the GitHub App's webhook URL at the tunnel.

Tests: `pytest tests/`
