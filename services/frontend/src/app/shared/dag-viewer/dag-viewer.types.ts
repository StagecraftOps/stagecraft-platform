export const NODE_WIDTH = 200
export const NODE_HEIGHT = 56

export const NODE_COLORS: Record<string, string> = {
  workflow: '#0ea5e9',
  job: '#3b82f6',
  reusable_workflow: '#8b5cf6',
  composite_action: '#ec4899',
  service: '#10b981',
  external_repo: '#6b7280',
  governance_rule: '#f59e0b',
  app_requirement: '#f59e0b',
  runtime_metric: '#06b6d4',
  failure: '#ef4444',
}

export const TYPE_LABELS: Record<string, string> = {
  workflow: 'Workflows',
  job: 'Jobs',
  reusable_workflow: 'Reusable workflows',
  composite_action: 'Composite actions',
  service: 'Services',
  external_repo: 'External repos',
  governance_rule: 'Governance rules',
  app_requirement: 'App requirements',
  runtime_metric: 'Runtime metrics',
  failure: 'Failures',
}

export const NODE_DESCRIPTIONS: Record<string, string> = {
  workflow: 'A GitHub Actions workflow file (.github/workflows/*.yml) — the top-level pipeline definition that triggers on events like push or pull_request.',
  job: 'A job within a workflow — a set of steps that run together on one runner. Jobs can depend on each other or run in parallel.',
  reusable_workflow: 'A reusable workflow called via "uses:" — shared CI/CD logic defined once and invoked from multiple pipelines.',
  composite_action: 'A composite GitHub Action — a packaged, reusable set of steps invoked as a single step in a job.',
  service: "A service in this repo's architecture, inferred from its dependency/orchestrator config — represents a deployable unit, not a workflow file.",
  external_repo: 'A cross-repository dependency, detected via repository_dispatch or a workflow_run trigger — this pipeline affects or is affected by another repo.',
  governance_rule: 'A compliance or governance requirement this pipeline is being measured against (e.g. a control from an uploaded policy document or framework).',
  app_requirement: 'An application-level requirement or context signal (e.g. regulatory scope, risk tier) used to interpret findings for this pipeline.',
  runtime_metric: 'A measured runtime signal (e.g. duration, failure rate) attached to this node from actual pipeline executions, not static analysis.',
  failure: 'A recorded failure or remediation event tied to this node, sourced from the AI remediation history.',
}

export interface DisplayNode {
  id: string
  label: string
  nodeType: string | null
  emphasize?: boolean
}

export interface DisplayEdge {
  id: string
  source_node_id: string
  target_node_id: string
  edge_type: string
  confidence: 'certain' | 'heuristic' | 'ambiguous'
  count?: number
}

export interface PositionedNode extends DisplayNode {
  x: number
  y: number
}
