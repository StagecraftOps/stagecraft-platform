# StageCraft — Authentication & Security Architecture, End to End

> Snapshot as of the original writing (2026-07-10) — verify current cluster/pod state before
> relying on any operational claims below (pod counts, restart counts, sync status, etc).

**How every identity in this system is established, verified, scoped, and rotated — with the
actual files, YAML, and IAM JSON this project uses. Written against the live cluster
(2026-07-10), not a whiteboard.**

---

## Cluster status at time of writing

All 15 pods `1/1 Running`, **zero restarts** across the board (api ×3, frontend ×3, worker ×3,
worker-consumer ×2, webhook ×2, mcp ×1, neo4j ×1). ALB controller ×2 healthy in `kube-system`,
all 6 ExternalSecrets `SecretSynced/Ready`, no Warning events in the namespace. Known gap:
metrics-server is not installed, so `kubectl top` and any HPA based on resource metrics are
non-functional.

---

## The map: six distinct trust boundaries

This platform has six separate authentication planes. Each one uses a different mechanism, on
purpose — the failure of one plane must not cascade into another:

| # | Boundary | Mechanism | Where implemented |
|---|---|---|---|
| 1 | Human → dashboard | GitHub OAuth → HS256 JWT session cookie | `stagecraft-api/app/core/security.py` |
| 2 | GitHub → platform | HMAC-SHA256 webhook signatures | `stagecraft-webhook/app/services/github_verifier.py` |
| 3 | Platform → GitHub | GitHub App: RS256 app JWT → short-lived installation tokens; user OAuth tokens Fernet-encrypted at rest | `stagecraft-mcp/src/server.py`, api/worker github clients |
| 4 | Service → service (east-west) | Static shared key `INTERNAL_API_KEY` header | api `internal.py`, worker, mcp |
| 5 | Pod → AWS | IRSA: projected ServiceAccount token → `sts:AssumeRoleWithWebIdentity` | `stagecraft-infra/modules/iam/main.tf` + Helm SA annotation |
| 6 | Cluster → secrets | External Secrets Operator pulling Secrets Manager via its own IRSA identity | `stagecraft-helm/templates/clustersecretstore.yaml` + `common.externalSecret` |

The rest of this document walks each plane end to end, then covers TLS posture, the DevSecOps
gaps, and the production hardening list.

---

## Plane 5 first: IRSA — how a pod in this cluster gets AWS credentials

This is the one they will drill you on, so here is the complete mechanical chain as it exists
in *this* project, not the generic story.

### 5.1 The pieces Terraform creates

`stagecraft-infra`'s EKS module enables the cluster's **OIDC identity provider**: EKS runs an
OIDC discovery endpoint (`https://oidc.eks.us-east-1.amazonaws.com/id/<CLUSTER_HASH>`) that
publishes the public keys the cluster uses to sign ServiceAccount tokens. Terraform registers
that issuer as an `aws_iam_openid_connect_provider` in IAM — from that moment, IAM can
cryptographically verify "this JWT was minted by *that* cluster."

Then `modules/iam/main.tf` creates **one role per service**, each with a trust policy that is
deliberately narrow. This is the actual policy shape (webhook's, verbatim structure):

```hcl
data "aws_iam_policy_document" "webhook_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [var.oidc_provider_arn]       # the cluster's OIDC provider
    }
    condition {
      test     = "StringEquals"
      variable = "<issuer>:sub"
      values   = ["system:serviceaccount:stagecraft:stagecraft-webhook"]
    }
    condition {
      test     = "StringEquals"
      variable = "<issuer>:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}
```

Read the two conditions carefully, because this is the answer to "how do you prevent a
different pod from assuming the role?": the token's `sub` claim **must equal the exact
namespace/ServiceAccount pair**. A pod running as `stagecraft-api`'s ServiceAccount presents a
token whose `sub` is `system:serviceaccount:stagecraft:stagecraft-api` — STS rejects it against
the webhook role. The `aud` condition (`sts.amazonaws.com`) blocks replay of ordinary
Kubernetes API tokens (whose audience is the cluster) against STS.

The permissions attached are minimal per service:

| Role | Inline policy — the entire permission set |
|---|---|
| `stagecraft-webhook` | `sqs:SendMessage` on the one queue ARN. Nothing else. |
| `stagecraft-worker` | SQS consume (`ReceiveMessage`/`DeleteMessage`/`GetQueueAttributes`) on that queue + `bedrock:InvokeModel*` (+ SES send when enabled) |
| `stagecraft-api` | `bedrock:InvokeModel*` for Pipeline Chat |
| ESO role | `secretsmanager:GetSecretValue`/`DescribeSecret` on the `stagecraft-*` secret ARNs |
| ALB controller role | The canonical AWS Load Balancer Controller policy JSON (vendored under `modules/iam/policies/`) |

`stagecraft-mcp` deliberately has **no IAM role at all** — it talks only to GitHub and the API,
so it gets zero AWS surface.

### 5.2 The pieces Helm creates

Each service chart renders its ServiceAccount through one shared template,
`common.serviceAccount` (`stagecraft-helm/common/`):

```yaml
kind: ServiceAccount
metadata:
  name: stagecraft-<service>
  annotations:
    eks.amazonaws.com/role-arn: {{ .Values.serviceAccount.roleArn }}
```

That single annotation is the entire Kubernetes side of the contract. The role ARNs come from
`terraform output` and are filled into `values-prod.yaml` — Helm never knows a credential, only
a role *name*.

### 5.3 What happens at pod start (the part to narrate in the meeting)

1. The **EKS pod identity webhook** (a mutating admission webhook AWS runs in every EKS control
   plane) sees a pod whose ServiceAccount carries the `eks.amazonaws.com/role-arn` annotation.
2. It **mutates the pod spec**: injects a projected volume containing a ServiceAccount token
   with `audience: sts.amazonaws.com` and a ~24 h expiry (auto-rotated by kubelet), mounted at
   `/var/run/secrets/eks.amazonaws.com/serviceaccount/token`, plus two env vars:
   `AWS_ROLE_ARN` and `AWS_WEB_IDENTITY_TOKEN_FILE`.
3. Inside the container, **boto3's default credential chain** finds those env vars (the
   `AssumeRoleWithWebIdentity` provider sits early in the chain, before instance metadata) and
   calls `sts:AssumeRoleWithWebIdentity`, presenting the projected JWT.
4. **STS validates** the JWT signature against the registered OIDC provider's published keys,
   checks `sub` and `aud` against the role's trust policy, and returns temporary credentials
   (~1 h, auto-refreshed by the SDK before expiry).
5. The application code is **completely unaware** — `boto3.client("sqs")` in
   `stagecraft-webhook` just works. Zero `AWS_ACCESS_KEY_ID` anywhere: not in code, not in a
   Kubernetes Secret, not in CI. There are no static AWS credentials in this entire platform.

Kill chain if a pod is compromised: the attacker gets *that service's* role only — from the
webhook pod they can send SQS messages to one queue and nothing else. They cannot read Secrets
Manager (only ESO's role can), cannot touch RDS via IAM (DB auth is password-based inside the
VPC), cannot reach IMDS for the node role if IMDSv2 hop limit is enforced (see hardening list —
verify this, it's a real interview question).

---

## Plane 6: the secrets pipeline — Secrets Manager → ESO → pod env

### The resources, in Helm-hook order

The umbrella chart sequences everything with hook weights so ordering is deterministic:

1. **`ClusterSecretStore`** (hook-weight **-10**, `stagecraft-helm/templates/clustersecretstore.yaml`):

   ```yaml
   spec:
     provider:
       aws:
         service: SecretsManager
         region: us-east-1
         auth:
           jwt:
             serviceAccountRef:
               name: external-secrets       # ESO's own SA
               namespace: external-secrets
   ```

   Note `auth.jwt.serviceAccountRef` — the store authenticates via ESO's **own IRSA identity**
   (installed by `stagecraft-infra/cluster-bootstrap`, SA annotated with the ESO role ARN).
   Plane 5 and plane 6 are the same mechanism; ESO is just another IRSA consumer.

2. **`ExternalSecret` per service** (hook-weight **-5**, rendered by `common.externalSecret`):

   ```yaml
   spec:
     secretStoreRef: { name: stagecraft, kind: ClusterSecretStore }
     target: { name: stagecraft-<svc>-secrets, creationPolicy: Owner }
     refreshInterval: 1h
     dataFrom:
       - extract: { key: stagecraft-<svc>-secrets }   # the Secrets Manager JSON doc
   ```

   `dataFrom.extract` takes the whole JSON document and explodes each key into a Kubernetes
   Secret entry — which is why Terraform writes the secrets as JSON objects whose keys are
   *exactly the env var names* the services read (`app/core/config.py` field names).

3. **Deployments** mount via `envFrom.secretRef` with `optional: true` — a deliberate choice so
   a fresh `helm install` doesn't deadlock waiting for ESO's first reconcile; the pod starts,
   crashloops briefly on missing config if ESO is slow, and self-heals.

### Where the values originate

Terraform stage 1's `module.secrets` composes the JSON payloads. Two values are **computed, not
typed**: `DATABASE_URL` is assembled from the RDS endpoint plus the master password that RDS
auto-generated straight into its own Secrets Manager entry (the password never exists in tfvars
or in any human's clipboard), and `REDIS_URL` from the ElastiCache endpoint as `rediss://`
(TLS). Everything human-supplied lives in one gitignored `terraform.tfvars`.

### Rotation story (say this proactively)

Change tfvars → `terraform apply` updates the Secrets Manager version → ESO re-extracts on its
1 h `refreshInterval` and updates the k8s Secret → **but** `envFrom` env vars are read at
container start, so pods need a rollout to pick up the change. Honest answer: "rotation is
apply + wait-or-force-sync + `kubectl rollout restart`; if we want zero-touch we add Reloader
or stakater/reloader-style checksum annotations." Knowing that last clause is what separates
you from someone who read a blog post.

### Two real weaknesses to own before they find them

- **Terraform state contains every secret in plaintext** (Secrets Manager payloads pass through
  state) and that state is currently a **local file**. Migrating to an encrypted S3 backend
  with DynamoDB locking is step one of productionization — this is in the migration runbook §7.
- The k8s Secrets materialized by ESO are base64-plaintext in etcd unless **EKS envelope
  encryption with a KMS key** is enabled on the cluster. Check `aws eks describe-cluster
  --query 'cluster.encryptionConfig'`; if empty, enable secrets encryption (it's a
  one-way-enable on existing clusters, plan it).

---

## Plane 1: human authentication — GitHub OAuth → JWT cookie

Flow (`stagecraft-api/app/api/v1/routes/auth.py` + `app/core/security.py`):

1. Frontend redirects to GitHub's authorize URL with `GITHUB_CLIENT_ID`; GitHub calls back to
   `GITHUB_REDIRECT_URI` with a code; the API exchanges code → user access token server-side
   (client secret never reaches the browser).
2. The API mints its own session: `create_access_token()` — **HS256 JWT** signed with
   `SECRET_KEY`, `exp` = 30 days (`ACCESS_TOKEN_EXPIRE_DAYS`), delivered as a cookie.
   `verify_access_token()` rejects on any `JWTError`. Cookie `Secure` flag is forced on when
   `ENVIRONMENT=production` (`Settings.cookie_secure`), regardless of the `COOKIE_SECURE` var.
3. The GitHub user token is **not** put in the cookie or returned to the client. It's encrypted
   with **Fernet (AES-128-CBC + HMAC-SHA256, versioned tokens)** via `encrypt_token()` and
   stored in Postgres; decrypted only server-side when the platform needs to act as the user.

One subtlety worth volunteering — `_get_fernet()` has a **KDF fallback**: if
`TOKEN_ENCRYPTION_KEY` is unset, it derives the Fernet key as
`SHA256("stagecraft-token-encryption-v1:" + SECRET_KEY)`. That's a sane dev-mode fallback
(domain-separated derivation, so JWT-signing and encryption keys stay cryptographically
distinct even when sourced from one secret), but in production both must be set independently:
key separation means a leaked JWT secret doesn't also decrypt the token store.

Critique to pre-empt: a 30-day stateless HS256 session with no server-side revocation list is
long. Mitigations to propose: shorter `exp` + sliding refresh, a token-version column checked
per request (cheap revocation), and RS256 if any second service ever needs to *verify* without
being able to *mint*.

---

## Plane 2: GitHub → platform — webhook HMAC

`stagecraft-webhook/app/services/github_verifier.py`, 15 lines, and the details are exactly
right, which is what a reviewer checks:

- Computes `HMAC-SHA256(secret, raw_request_body)` and compares against the `X-Hub-Signature-256`
  header — over the **raw bytes**, before any JSON parsing (re-serialized JSON would break the
  MAC and, worse, could be attacker-influenced).
- Uses **`hmac.compare_digest`** — constant-time comparison, immune to timing side-channels.
- Rejects a missing header or a non-`sha256=` scheme outright (no fallback to the legacy SHA-1
  header). Fails closed.

Because this service holds no state and no business logic, its compromise surface is: one
shared HMAC secret + `sqs:SendMessage` on one queue. The worker treats queue contents as
untrusted input regardless — defense in depth: signature at the door, validation again at
consumption.

## Plane 3: platform → GitHub — the App identity and its guardrails

The platform acts on repos as a **GitHub App**, never as a user PAT, in production paths:

1. Mint an **app JWT**: RS256-signed with `GITHUB_APP_PRIVATE_KEY`, `iss` = App ID, ~10 min TTL
   (`_mint_installation_token` in `stagecraft-mcp/src/server.py`, PyJWT).
2. Exchange it at `POST /app/installations/{id}/access_tokens` for an **installation token** —
   scoped to the installed org's repos and granted permissions, ~1 h TTL. That token makes the
   actual API calls.

So write access to company repos is always: short-lived, org-scoped, permission-scoped, and
auditable (App-attributed in the audit log). On top of that, the MCP server adds
**application-layer guardrails** enforced in code (`src/server.py:165-219`), independent of
what the token could technically do:

- `_assert_allowed_org()` — every tool call verifies `owner == ALLOWED_ORG`; a prompt-injected
  agent cannot be steered at someone else's org.
- Branch namespace jail — `create_fix_branch`, `commit_workflow_fix`, `create_pull_request`
  all raise unless the branch starts with **`stagecraft/`**: the agent can never push to `main`
  or any human branch, only propose PRs from its own namespace.
- `commit_workflow_fix` additionally requires the path to start with `.github/workflows/` —
  the failure-remediation agent can touch CI files, not application code.

This is the LLM-security answer: the model's output is treated as untrusted; the *tool layer*
enforces invariants the model cannot talk its way out of.

## Plane 4: east-west — the honest weak point

Worker→API (result callbacks) and MCP→API (`search_remediations`, `query_graph`) authenticate
with a single static header, `INTERNAL_API_KEY`, checked by the API's `internal.py` routes.
In-cluster traffic is plaintext HTTP over the VPC CNI; there are **no NetworkPolicies** in the
charts, so any pod in the cluster can reach any service.

Say it before they do: "east-west is a shared static key on a flat network — adequate for a
single-team, single-namespace deployment; the production roadmap is NetworkPolicies first
(cheap, immediate), then mTLS/SPIFFE identities via a mesh or Cilium if the org standardizes on
one." Knowing the order (policy before mesh) reads as experience.

---

## TLS posture, edge to storage — current truth

| Hop | Today | Production requirement |
|---|---|---|
| Client → ALB | **Plain HTTP.** No ACM cert, no 443 listener, no redirect | ACM cert + `alb.ingress.kubernetes.io/certificate-arn` + `listen-ports` + `ssl-redirect` annotations, HSTS at nginx |
| ALB → pods | HTTP (target-type ip into pod IPs) | Acceptable inside VPC for most postures; mesh/mTLS if compliance demands |
| Pod → RDS | Driver-level; RDS supports TLS | Enforce `rds.force_ssl=1` parameter + `sslmode=require` in the URL |
| Pod → ElastiCache | **TLS already** — `rediss://`, in-transit + at-rest encryption enabled in the module | Done |
| Pod → AWS APIs / GitHub | HTTPS by definition | Done |
| ESO → Secrets Manager | HTTPS + SigV4 | Done |

The edge is the one real hole, and it's a migration-day fix, not an architecture change: the
cookie plane (plane 1) is only as safe as the transport it rides on.

---

## The DevSecOps production checklist (ordered by leverage)

**Transport & edge**
1. ACM + HTTPS + redirect at the ALB (above). Add **AWS WAF** on the ALB — the webhook endpoint
   is internet-facing by necessity.
2. Real domain + Route53 instead of the raw ALB hostname; update OAuth callback and webhook URL.

**Cluster**
3. **EKS secrets envelope encryption (KMS)** — verify, enable if absent.
4. **NetworkPolicies**: default-deny in `stagecraft`, then allow frontend→api, worker→api,
   worker→mcp, api/worker→postgres/redis egress, webhook→egress-SQS only.
5. **Pod Security Standards** (`restricted` on the namespace) + securityContext in the common
   chart: `runAsNonRoot`, `readOnlyRootFilesystem`, drop ALL capabilities, no privilege
   escalation.
6. **IMDSv2 hop-limit=1** on node groups so pods can't ride the node instance role.
7. EKS **control-plane logging** (audit, authenticator) → CloudWatch; **GuardDuty EKS
   protection**; metrics-server + Prometheus/Grafana or Container Insights (nothing pages
   anyone today).
8. RBAC review: EKS access entries / `aws-auth` currently effectively grants the creating
   account admin — define company admin/deployer/viewer roles on day one.

**Supply chain (CI/CD)**
9. Replace Docker Hub + stored `DOCKERHUB_TOKEN` with **ECR + GitHub OIDC federation** — the CI
   assumes a push-scoped IAM role via `aws-actions/configure-aws-credentials`; zero long-lived
   CI secrets. Same trust mechanism as IRSA, which makes a nice line in the meeting: "we use
   OIDC federation in both directions — pods into AWS, CI into AWS."
10. **Trivy image + IaC scan and SBOM generation in CI** (the platform ingests Trivy findings
    for its *users* — its own pipeline should eat the same food). Fail on HIGH/CRITICAL.
11. **cosign** keyless image signing + a policy controller (Kyverno `verifyImages`) so the
    cluster only runs images your CI signed. Kyverno also enforces "no `:latest`" — which
    today's webhook/mcp deployments would fail, correctly.
12. Pin GitHub Actions to commit SHAs; enable Dependabot/Renovate; branch protection +
    CODEOWNERS + required reviews on all repos post-transfer.

**Secrets & data**
13. S3+DynamoDB Terraform backend, encrypted; state access = its own IAM permission boundary.
14. Independent `TOKEN_ENCRYPTION_KEY` (kill the KDF fallback path in prod), all secrets
    regenerated fresh in the company account (migration runbook §2), Secrets Manager rotation
    schedules on the DB master password.
15. RDS: enforce TLS, enable Performance Insights + automated backups (retention is already a
    tfvars knob), consider snapshot copy to a second region for DR.

**Application**
16. Rate limiting exists (`app/core/limiter.py`) — confirm it fronts the auth and webhook
    endpoints, add it to chat (Bedrock cost protection).
17. OpenAPI docs already disabled in prod (`Settings.is_production`) — good, mention it.
18. The scrubber (`app/agents/scrubber.py`, `app/core/scrubber.py`) sanitizes what goes into
    prompts/logs — know it exists; "what stops secrets in CI logs from reaching the LLM" is a
    likely question, and the honest answer is "a scrubber pass plus Bedrock Guardrails hooks
    (`BEDROCK_GUARDRAIL_ID`) that are wired but not yet configured."

---

## Rapid-fire Q&A — the answers, compressed

- **"Walk me through pod→AWS auth."** Annotated SA → pod identity webhook injects projected
  OIDC token (aud `sts.amazonaws.com`, 24 h, kubelet-rotated) + `AWS_ROLE_ARN`/token-file env
  vars → boto3 default chain calls `AssumeRoleWithWebIdentity` → STS verifies signature against
  the cluster's registered OIDC provider and matches `sub` to
  `system:serviceaccount:stagecraft:<sa>` → 1 h STS creds, SDK auto-refresh. No static keys
  exist anywhere in the platform.
- **"Who can read the secrets?"** In AWS: only ESO's role (`GetSecretValue` scoped to
  `stagecraft-*` ARNs) and Terraform's operator. In-cluster: pods via their own mounted Secret
  only — but note flat network + no PSS yet; that's items 3–5 on the checklist.
- **"How does the AI get repo write access, and what limits it?"** GitHub App installation
  tokens (1 h, permission-scoped) minted by the MCP server, which also enforces org allowlist +
  `stagecraft/` branch jail + workflows-only file paths in code. The model never holds a
  credential; it calls tools that do.
- **"Blast radius of each pod?"** webhook: HMAC secret + SendMessage on one queue. api: DB +
  Bedrock invoke. worker: queue consume + Bedrock + App key via its secret. mcp: App key +
  API internal key, zero AWS. Each is its own IAM role; none can read another's secret from AWS.
- **"What would you fix first for production?"** TLS at the edge, KMS secrets encryption,
  NetworkPolicies, OIDC-to-ECR CI, S3 Terraform state. In that order, and I can defend the
  order: user-credential exposure > at-rest etcd > lateral movement > supply chain > operator
  resilience.

---

*Companions: `MIGRATION-HANDOVER.md` (account/org migration runbook),
`stagecraft-infra/README.md` (module rationale), `stagecraft-helm/README.md` (chart/secrets
templates).*
