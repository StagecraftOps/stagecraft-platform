# StageCraft — Build Roadmap

_Living document. Status legend: ✅ done & deployed · 🚧 in progress · ⬜ not started._

**Goal:** reshape StageCraft from a flat, org-wide CI governance tool into a **multi-application platform** — each *application* (project) owns multiple microservice repos and workflows, fully isolated — with an ops-grade Insights page, a System/Custom agent fleet, and a split vulnerability agent.

**Locked decisions:** first-class `application_id` (real column, not a filter view) · Vulnerability RCA on **Trivy + Sonar** · Vulnerability Remediation deferred to a later phase (Bedrock) · phased so each phase is independently shippable.

**Key assumption:** within an org, a repo belongs to **exactly one application** (makes a single `application_id` per row coherent). Flag if a repo can span applications.

---

## Phase 0 — UI wins  ✅ DEPLOYED (2026-07-07)

- ✅ **PR Traces** — renamed from "Peer Review"; PR **author** now shown (data already existed in the API, was dropped in the UI).
- ✅ **Insights** — is now the landing page (was Dashboard); renamed from "Analytics".
  - ✅ Success-rate KPI removed; **Change Failure Rate** is the headline (over *completed* runs only — in-progress/queued excluded).
  - ✅ **Real MTTR** = `remediation.pr_raised_at − workflow_run.completed_at` (no mock data).
  - ✅ Added **MTTD**, **run frequency** (30d avg), **open vulns by severity**, **Top Failing Workflows**.
  - ✅ "PRs raised" counts real PRs (`pr_url` set), no longer over-counting "helpful".
- ✅ **Agent Fleet** — split into **System Agents** (run in StageCraft) and **Custom Agents** (publishable to GitHub), shown via **two selectable cards** (click one → only that group renders). Vulnerability RCA under System; a planned Vulnerability Remediation under Custom.
  - _Note: the fleet-UX toggle refinement ships with Phase 1's next frontend deploy._

---

## Phase 1 — Application isolation (first-class `application_id`)  ✅ DEPLOYED (2026-07-07, migration 0027)

### Data model (`stagecraft-api`)
- ✅ `applications` table (`id`, `org_id` FK, `name`, `slug`, unique per org).
- ✅ `application_repos` join (`application_id`, `repo_name`, unique per org+repo).
- ✅ Nullable, indexed `application_id` on 14 repo-scoped domain tables.
- ✅ Population: assigning repos to an app **stamps `application_id` onto existing/historical rows** (and clears on removal) via the applications route — so isolation is correct for all data present at assignment time.

### API (`stagecraft-api`)
- ✅ New `routes/applications.py` — CRUD + set-repo-membership.
- ✅ Threaded optional `application_id` filter through **analytics, vulnerabilities, remediations, pr-reviews, runs**. No app selected = org-wide (back-compat).
- ⬜ Not yet threaded: workflows (lists live from GitHub), agent-runs summary, standardization, governance, optimization — org-wide for now.

### Frontend (`stagecraft-frontend`)
- ✅ `ApplicationService` + sidebar **application switcher** ("All applications" / per-app). ApiService auto-scopes the threaded endpoints.
- ✅ **Settings restructure**: Onboarding / Applications / Organizations sections; onboarding wizard embedded; Applications create/list + repo selection + per-repo context upload.
- ✅ Removed Onboarding + Application Context from the sidebar (now in Settings).

### ⚠️ Known gap → address in Phase 2 (worker)
- The **worker does not yet stamp `application_id` on newly-written rows** (runs/remediations/vulns/etc). Historical rows are stamped at repo-assignment, so app-filtered views are correct for existing data, but events created *after* assignment appear only under "All applications" until the worker is updated to set `application_id` on insert (look up via `application_repos`). Quick follow-up during Phase 2.

---

## Phase 2 — Vulnerability agent split  ✅ DEPLOYED (2026-07-07)

### Worker application_id gap (from Phase 1)  ✅
- ✅ Worker now stamps `application_id` on newly-written workflow_runs, remediations, vulnerability_findings, pr_reviews and agent_runs (resolved from `application_repos`). The Phase 1 gap is closed — live events are attributed to their application immediately.

### 2a. Vulnerability RCA — System (Trivy + Sonar)  ✅ (Trivy live; Sonar templated)
- ✅ **Trivy** workflow added to the monorepo (`trivy-security-scan.yml`): SARIF → GitHub code scanning → `code_scanning_alert` webhook → existing Vulnerability RCA pipeline (dedup, app-context severity escalation, blast radius, Bedrock RCA narration, issue tracking).
- ✅ **Sonar** workflow added as a token-gated template (`sonar-security-scan.yml`); needs `SONAR_TOKEN` + SonarCloud→code-scanning wiring to go live.
- ✅ RCA page reframed as the "Vulnerability RCA" System agent, with **application scope** (sidebar switcher) + in-page **repository filter**.
- ⬜ Optional later: record vuln agent runs under a distinct `vulnerability_rca` name (currently `vulnerability_remediation`).

### 2b. Vulnerability Remediation — Custom (deferred, Bedrock)  ⬜ LATER (stubbed)
- ✅ Represented in the fleet as a **Planned Custom agent** card.
- ⬜ Publishable agent: list an app's repos + **"Publish to repo"** button.
- ⬜ Dependency-graph-ordered fixes (fix dependency-0 before A before B) via Bedrock.

---

## Verification checklist
- Phase 0: land on Insights; Success Rate gone; MTTR cross-checks DB; PR Traces shows author; fleet shows System/Custom. ✅
- Phase 1: run migration Job; `application_id` populated; create App A/B, assign repos, upload context; pages filter per app with org-wide fallback; no cross-app leakage.
- Phase 2: real Trivy/Sonar scan → `code_scanning_alert` → RCA issue with app-scoped severity; RCA filters correct.

_Full design detail: `C:\Users\chris\.claude\plans\1-add-runtime-monitoring-playful-hanrahan.md`._
