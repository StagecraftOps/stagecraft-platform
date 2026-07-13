# StageCraft Platform

AI-powered CI/CD intelligence and optimization platform — monorepo.

## Layout

```
services/     one folder per microservice (api, mcp, webhook, worker, frontend)
helm/         Helm charts for all 5 services (umbrella chart + common library + per-service charts)
.github/      one CI workflow per service, path-filtered to its own services/<name>/ folder
orchestrator.yaml   service dependency graph (consumed by the platform's own dependency analysis)
docs/         architecture, roadmap, and security/identity documentation
```

## Services

| Service | Role | Port |
|---|---|---|
| `services/api` | FastAPI backend — auth, org/application data, workflows/runs, remediations | 8000 |
| `services/mcp` | MCP server exposing GitHub tools to the worker's agents | 8010 |
| `services/webhook` | GitHub webhook receiver — signature verification, publishes to SQS | 8001 |
| `services/worker` | Celery worker + SQS consumer — the LangGraph agent chains | — |
| `services/frontend` | Dashboard (Angular, served by nginx) | 3000 |

See [`docs/architecture.md`](docs/architecture.md) for the full picture.

## CI

Each service has its own workflow (`.github/workflows/ci-<service>.yml`), triggered only by
changes under its own `services/<name>/**` path. Each runs lint/test then, on push to `main`,
builds and pushes a Docker image.

## Local development

```bash
cd services/<name> && docker compose up --build
```

See each service's own README for environment variables.
