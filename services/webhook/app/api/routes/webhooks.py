import logging
import re

from fastapi import APIRouter, Header, HTTPException, Request, status

from app.core.config import settings
from app.services.github_verifier import verify_signature
from app.services.sqs_publisher import SQSPublisher

logger = logging.getLogger(__name__)

router = APIRouter()

_publisher = SQSPublisher()

_MANIFEST_ECOSYSTEM = {"package.json": "npm", "requirements.txt": "pip", "go.mod": "go"}

def _parse_trivy_alert_text(text: str) -> dict:
    """Trivy's SARIF message text for dependency findings is structured, e.g.:
    'Package: python-dotenv\\nInstalled Version: 1.0.1\\n...\\nFixed Version: 1.2.2\\n...'
    Extract package_name/fixed_version so these alerts are actionable the same
    way native Dependabot alerts are, instead of being stuck as RCA-only."""
    package = re.search(r"^Package:\s*(.+)$", text, re.MULTILINE)
    fixed = re.search(r"^Fixed Version:\s*(.+)$", text, re.MULTILINE)
    return {
        "package_name": package.group(1).strip() if package else None,
        "fixed_version": fixed.group(1).strip() if fixed else None,
    }

@router.post("/github")
async def receive_github_webhook(
    request: Request,
    x_hub_signature_256: str | None = Header(default=None),
    x_github_event: str | None = Header(default=None),
) -> dict:
    if not settings.GITHUB_WEBHOOK_SECRET:
        logger.error("GITHUB_WEBHOOK_SECRET is not configured; rejecting webhook.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Webhook receiver is not configured.",
        )

    payload_body = await request.body()

    if not x_hub_signature_256 or not verify_signature(
        payload_body, x_hub_signature_256, settings.GITHUB_WEBHOOK_SECRET
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing webhook signature",
        )

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload",
        )

    if x_github_event == "installation":
        return await _handle_installation(payload)

    if x_github_event == "workflow_run":
        return await _handle_workflow_run(payload)

    if x_github_event == "pull_request":
        return await _handle_pull_request(payload)

    if x_github_event == "code_scanning_alert":
        return await _handle_code_scanning_alert(payload)

    if x_github_event == "dependabot_alert":
        return await _handle_dependabot_alert(payload)

    if x_github_event == "secret_scanning_alert":
        return await _handle_secret_scanning_alert(payload)

    return {"received": True, "published": False}

async def _handle_installation(payload: dict) -> dict:
    action = payload.get("action")
    installation = payload.get("installation", {})
    account = installation.get("account", {})
    installation_id = installation.get("id")
    org_login = account.get("login")
    org_type = account.get("type", "")

    if not installation_id or not org_login:
        logger.warning("Malformed installation payload: %s", payload)
        return {"received": True, "published": False}

    if org_type != "Organization":

        return {"received": True, "published": False}

    if action in ("created", "deleted"):
        sender = payload.get("sender", {})
        await _publisher.publish({
            "event_type": "app_installation",
            "action": action,
            "installation_id": installation_id,
            "org_login": org_login,
            "org_id": account.get("id"),
            "avatar_url": account.get("avatar_url"),
            "sender_id": sender.get("id"),
            "sender_login": sender.get("login"),
        })
        logger.info("Published app_installation %s for org %s", action, org_login)
        return {"received": True, "published": True}

    return {"received": True, "published": False}

async def _handle_workflow_run(payload: dict) -> dict:
    run = payload.get("workflow_run", {})
    repo = payload.get("repository", {})
    workflow = payload.get("workflow", {})

    action = payload.get("action")
    run_id = run.get("id")
    repo_owner = repo.get("owner", {}).get("login")
    repo_name = repo.get("name")

    if not isinstance(run_id, int) or not repo_owner or not repo_name:
        logger.warning(
            "Skipping malformed workflow_run payload (run_id=%r, owner=%r, repo=%r)",
            run_id, repo_owner, repo_name,
        )
        return {"received": True, "published": False}

    requires_analysis = action == "completed" and run.get("conclusion") == "failure"

    sqs_message = {
        "event_type": "workflow_run",
        "action": action,
        "status": run.get("status"),
        "conclusion": run.get("conclusion"),
        "requires_analysis": requires_analysis,
        "run_id": run_id,
        "workflow_id": run.get("workflow_id"),
        "workflow_name": run.get("name"),
        "workflow_file": workflow.get("path", run.get("path", "")),
        "repo_owner": repo_owner,
        "repo_name": repo_name,
        "branch": run.get("head_branch"),
        "head_sha": run.get("head_sha"),
        "started_at": run.get("run_started_at"),
        "completed_at": run.get("updated_at") if action == "completed" else None,
        "html_url": run.get("html_url"),
        "sender_login": payload.get("sender", {}).get("login"),
        "installation_id": payload.get("installation", {}).get("id")
        if payload.get("installation")
        else None,
    }

    await _publisher.publish(sqs_message)
    return {"received": True, "published": True, "requires_analysis": requires_analysis}

async def _handle_pull_request(payload: dict) -> dict:
    action = payload.get("action")
    pr = payload.get("pull_request", {})
    repo = payload.get("repository", {})

    pr_number = pr.get("number")
    repo_owner = repo.get("owner", {}).get("login")
    repo_name = repo.get("name")

    if not isinstance(pr_number, int) or not repo_owner or not repo_name:
        logger.warning(
            "Skipping malformed pull_request payload (pr_number=%r, owner=%r, repo=%r)",
            pr_number, repo_owner, repo_name,
        )
        return {"received": True, "published": False}

    if action not in ("opened", "synchronize", "reopened"):
        return {"received": True, "published": False}

    await _publisher.publish({
        "event_type": "pull_request",
        "action": action,
        "repo_owner": repo_owner,
        "repo_name": repo_name,
        "pr_number": pr_number,
        "pr_title": pr.get("title", ""),
        "pr_url": pr.get("html_url", ""),
        "head_sha": pr.get("head", {}).get("sha", ""),
        "base_ref": pr.get("base", {}).get("ref", ""),
        "sender_login": payload.get("sender", {}).get("login"),
    })
    return {"received": True, "published": True}

_ALERT_ACTIONS = ("created", "reopened", "reopened_by_user")

async def _handle_code_scanning_alert(payload: dict) -> dict:
    action = payload.get("action")
    alert = payload.get("alert", {})
    repo = payload.get("repository", {})
    repo_owner = repo.get("owner", {}).get("login")
    repo_name = repo.get("name")

    if action not in _ALERT_ACTIONS or not repo_owner or not repo_name:
        return {"received": True, "published": False}

    rule = alert.get("rule", {})
    tool = alert.get("tool", {})
    instance = alert.get("most_recent_instance", {})
    message_text = instance.get("message", {}).get("text", "")
    manifest_path = instance.get("location", {}).get("path")
    parsed = _parse_trivy_alert_text(message_text) if message_text else {}
    ecosystem = _MANIFEST_ECOSYSTEM.get((manifest_path or "").rsplit("/", 1)[-1])

    await _publisher.publish({
        "event_type": "security_alert",
        "alert_source": "code_scanning",
        "action": action,
        "repo_owner": repo_owner,
        "repo_name": repo_name,
        "alert_number": alert.get("number"),
        "rule_id": rule.get("id"),
        "tool_name": tool.get("name"),
        "severity": rule.get("security_severity_level") or rule.get("severity"),
        "description": rule.get("description", ""),
        "package_name": parsed.get("package_name"),
        "fixed_version": parsed.get("fixed_version"),
        "manifest_path": manifest_path,
        "ecosystem": ecosystem,
        "html_url": alert.get("html_url", ""),
        "state": alert.get("state"),
        "most_recent_instance": instance,
    })
    return {"received": True, "published": True}

async def _handle_dependabot_alert(payload: dict) -> dict:
    action = payload.get("action")
    alert = payload.get("alert", {})
    repo = payload.get("repository", {})
    repo_owner = repo.get("owner", {}).get("login")
    repo_name = repo.get("name")

    if action not in _ALERT_ACTIONS or not repo_owner or not repo_name:
        return {"received": True, "published": False}

    advisory = alert.get("security_advisory", {})
    vulnerability = alert.get("security_vulnerability", {})
    dependency = alert.get("dependency", {})
    first_patched = vulnerability.get("first_patched_version") or {}

    await _publisher.publish({
        "event_type": "security_alert",
        "alert_source": "dependabot",
        "action": action,
        "repo_owner": repo_owner,
        "repo_name": repo_name,
        "alert_number": alert.get("number"),
        "ghsa_id": advisory.get("ghsa_id"),
        "cve_id": advisory.get("cve_id"),
        "severity": advisory.get("severity"),
        "description": advisory.get("summary", ""),
        "package_name": dependency.get("package", {}).get("name"),
        "ecosystem": dependency.get("package", {}).get("ecosystem"),
        "manifest_path": dependency.get("manifest_path"),
        "vulnerable_range": vulnerability.get("vulnerable_version_range"),
        "fixed_version": first_patched.get("identifier"),
        "html_url": alert.get("html_url", ""),
        "state": alert.get("state"),
    })
    return {"received": True, "published": True}

async def _handle_secret_scanning_alert(payload: dict) -> dict:
    action = payload.get("action")
    alert = payload.get("alert", {})
    repo = payload.get("repository", {})
    repo_owner = repo.get("owner", {}).get("login")
    repo_name = repo.get("name")

    if action not in _ALERT_ACTIONS or not repo_owner or not repo_name:
        return {"received": True, "published": False}

    await _publisher.publish({
        "event_type": "security_alert",
        "alert_source": "secret_scanning",
        "action": action,
        "repo_owner": repo_owner,
        "repo_name": repo_name,
        "alert_number": alert.get("number"),
        "secret_type": alert.get("secret_type_display_name") or alert.get("secret_type"),
        "severity": "critical",
        "description": f"Secret of type '{alert.get('secret_type_display_name') or alert.get('secret_type')}' detected in repository.",
        "html_url": alert.get("html_url", ""),
        "state": alert.get("state"),
    })
    return {"received": True, "published": True}
