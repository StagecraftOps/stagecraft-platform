# stagecraft-helm

Helm charts for running the Stagecraft platform on the EKS cluster
provisioned by `stagecraft-infra`. One shared library chart
(`charts/common`) captures the near-identical Deployment/Service/ConfigMap/
ServiceAccount shape all five services follow; each service gets a thin
chart depending on it. The root chart is an umbrella that installs all five
in one shot.

## Layout

| Chart | What it deploys |
|---|---|
| `charts/common` | Library chart — no resources of its own, just named templates the others `include`. |
| `charts/api` | `stagecraft-api` Deployment + Service + Ingress (shares one ALB with frontend) + a pre-upgrade migration Job (`alembic upgrade head`). |
| `charts/worker` | `stagecraft-worker`'s two processes as separate Deployments — the Celery worker and the SQS→Celery consumer bridge — sharing one ServiceAccount/ConfigMap. No Service (nothing calls it over HTTP). |
| `charts/webhook` | `stagecraft-webhook` Deployment + Service + Ingress. |
| `charts/frontend` | `stagecraft-frontend` Deployment + Service + Ingress (catch-all `/`, same ALB group as api's `/api`). |
| `charts/mcp` | `stagecraft-mcp` Deployment + ClusterIP Service only — called in-cluster over SSE, never exposed externally, no AWS IAM role. |

Namespace: `stagecraft`. Service names: `stagecraft-<service>` (matches the k8s DNS defaults baked into each service's `config.py` after the rebrand).

## Secrets

This chart never templates plaintext secrets — it templates the *mechanism* that pulls them from AWS Secrets Manager instead:

- The umbrella chart's `templates/clustersecretstore.yaml` installs one cluster-wide `ClusterSecretStore` (`external-secrets.io`), authenticated via the External Secrets Operator's own IRSA identity (`values.yaml`'s `externalSecrets.*`).
- Each service chart's `templates/externalsecret.yaml` (`common.externalSecret`) renders an `ExternalSecret` that pulls that service's JSON secret (`stagecraft-<service>-secrets` in Secrets Manager, created by `stagecraft-infra`'s `module.secrets`) and materializes it as a same-named Kubernetes `Secret`.
- Every Deployment's `envFrom` references that Secret as `optional: true`, so `helm install` doesn't hard-fail if ESO hasn't finished its first sync yet.

**Prerequisite**: the External Secrets Operator itself must already be running in the cluster (installed by `stagecraft-infra/cluster-bootstrap`) before this chart's `ExternalSecret` resources can resolve.

## Usage

```bash
helm dependency update .
helm upgrade --install stagecraft . -f values.yaml -f values-dev.yaml \
  --namespace stagecraft --create-namespace

# Confirm ESO synced all 5 secrets:
kubectl get externalsecret -n stagecraft
```

Swap `values-dev.yaml` for `values-staging.yaml` / `values-prod.yaml` as appropriate. Prod's overlay expects the IRSA role ARNs from `terraform output` in `stagecraft-infra` — fill those in before applying.

## AWS Load Balancer Controller

Already installed by `stagecraft-infra/cluster-bootstrap` (via `helm_release`, using the `lb_controller_role_arn` Terraform output for IRSA) — nothing to do here. This chart's `api`/`webhook`/`frontend` Ingress resources just assume the controller is present and share one ALB via an ingress group (`ingress.groupName: stagecraft`).
