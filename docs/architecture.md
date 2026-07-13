# StageCraft — Architecture

**AI-powered CI/CD intelligence and optimization platform.**

StageCraft watches your GitHub Actions pipelines and does more than tell you something broke.
It builds a dependency graph of your workflows, tracks runtime performance and standardization
drift, checks governance/compliance posture, finds and root-causes vulnerabilities, and runs a
fleet of Bedrock/Claude-backed agents that raise real pull requests — fixing failed runs,
remediating dependency vulnerabilities, optimizing slow workflows, and reviewing every PR —
instead of just surfacing a dashboard.

## What it does

| Area | Capability |
|---|---|
| **Dependency graph** | Parses workflow YAML (including composite actions, reusable workflow calls, matrix/dispatch fan-out) into a graph across an entire repo or org. |
| **Runtime monitoring** | Deterministic critical-path analysis over real job/step timings — no AI needed to know what's slow. |
| **Standardization** | Diffs workflows against shared templates and clusters recurring patterns to flag drift. |
| **Governance & Compliance** | A Compliance agent checks runs against framework controls (HIPAA/PCI/SOC2); a Governance agent compares behavior against your own uploaded policy docs (pgvector retrieval). |
| **Performance optimization** | Detects bottlenecks and parallelization opportunities, drafts a rewritten workflow, simulates the time saved, and opens a PR on accept. |
| **Vulnerability RCA** *(System agent)* | Trivy/Sonar findings get root-caused, scored against blast radius, and tracked as a GitHub issue. |
| **Vulnerability Remediation** *(Custom agent)* | A publishable Claude Code Action agent that fixes a single finding or a whole repo's findings in dependency order, verified against real npm/PyPI registries. |
| **PR Traces** | A peer-review agent runs on every pull request automatically. |
| **Failure remediation** | Classify → root cause → generate a fix → security-review the fix → PR, all in one agent chain. |
| **Knowledge graph** | Cross-links governance findings, remediation history, and optimization recommendations into one browsable graph. |
| **Pipeline Chat** | Natural-language questions answered over your own pipeline data. |
| **Applications** | Group repos into isolated applications; every page scopes to one application or "all," with no cross-application leakage. |

## Service map

```
GitHub Actions run / code scanning alert
  → webhook   (verify HMAC signature, publish to SQS)
  → worker    (SQS consumer → Celery: classify → root cause →
                draft fix → security review → write PR text)
       └─ mcp  (GitHub tools: read workflow YAML/logs, commit,
                open PRs — structured tool access for the agents)
  → AWS Bedrock (Claude)  (root cause, fix generation, RCA narration, chat)
  → PR / GitHub issue opened on the source repo
  ↕
api      (FastAPI: auth, org/application data, all read/query
          endpoints, WebSocket live updates)
  ↕
frontend (dashboard — every page above lives here)
```

| Service | Role | Stack | Port |
|---|---|---|---|
| [`services/api`](../services/api) | Backend API — OAuth, orgs/applications, workflows/runs, remediations, vulnerabilities, optimization, insights, WebSocket relay | FastAPI + async SQLAlchemy, Alembic | 8000 |
| [`services/frontend`](../services/frontend) | Dashboard — every page in the table above | Angular 18 (standalone, signals), served by nginx | 3000 |
| [`services/worker`](../services/worker) | Async analysis — Celery worker + a separate SQS→Celery consumer bridge; the LangGraph agent chains that call Bedrock | Celery + sync SQLAlchemy | — |
| [`services/webhook`](../services/webhook) | GitHub webhook receiver — signature verification, publishes to SQS. Kept separate so it stays up regardless of API load. | FastAPI | 8001 |
| [`services/mcp`](../services/mcp) | MCP server exposing GitHub tools (read workflow YAML/logs, commit, open PRs) to the worker's agents | FastMCP | 8010 |
| [`helm`](../helm) | Helm charts for all five services above, plus shared secrets/ingress plumbing | Helm (library chart + umbrella) | — |

`orchestrator.yaml` at the repo root declares the same service dependency graph (`worker` → `mcp`,
`frontend` → `api`) in the schema consumed by the platform's own dependency-graph analysis
(`app/analysis/orchestrator_parser.py`), so this monorepo is analyzable by StageCraft itself.

## Local development

Each service runs independently via its own `docker-compose.yml`:

```bash
cd services/webhook  && cp .env.example .env && docker compose up --build   # :8001
cd services/worker   && cp .env.example .env && docker compose up --build
cd services/api      && cp .env.example .env && docker compose up --build   # :8000, docs at /docs
cd services/frontend && docker compose up --build                           # :3000
```

`services/mcp` is called in-cluster over SSE by the worker's agents and isn't needed for most
frontend/API work.

## Deployment

Deployment infrastructure (Terraform: EKS/RDS/ElastiCache/SQS/IAM/Secrets Manager) lives in a
separate `stagecraft-infra` repo, not part of this monorepo. `helm/` here provides the Helm
charts for all 5 services; see [`helm/README.md`](../helm/README.md) for install instructions.

See [`roadmap.md`](roadmap.md) for active build status and [`security-architecture.md`](security-architecture.md)
for the full identity/trust-boundary writeup.
