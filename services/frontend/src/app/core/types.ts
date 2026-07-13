export interface User {
  id: string
  login: string
  name: string
  avatar_url: string
  email: string | null
}

export type OrgSyncStatus = 'pending' | 'syncing' | 'completed' | 'failed'

export interface Organization {
  id: string
  login: string
  name: string
  avatar_url: string
  sync_status: OrgSyncStatus
}

export type WorkflowState = 'active' | 'disabled_manually' | 'disabled_inactivity' | 'deleted'

export interface Workflow {
  id: number
  name: string
  path: string
  repo_name: string
  state: WorkflowState
  badge_url: string
}

export type RunStatus = 'queued' | 'in_progress' | 'completed' | 'waiting'
export type RunConclusion =
  | 'success'
  | 'failure'
  | 'neutral'
  | 'cancelled'
  | 'skipped'
  | 'timed_out'
  | 'action_required'
  | null

export interface WorkflowRun {
  id: string
  github_run_id: number
  status: RunStatus
  conclusion: RunConclusion
  org_login?: string
  branch: string
  head_sha: string
  started_at: string | null
  completed_at: string | null
  html_url: string
  workflow_name?: string
  repo_name?: string
}

export type RemediationStatus = 'pending' | 'analyzing' | 'analyzed' | 'pr_raised' | 'helpful' | 'failed'

export interface Remediation {
  id: string
  workflow_run_id: string
  org_login: string
  repo_name: string
  workflow_file: string
  root_cause: string
  suggested_yaml: string | null
  original_yaml: string | null
  likely_code_level: boolean
  code_level_reasoning: string | null
  pr_url: string | null
  pr_number: number | null
  pr_branch: string | null
  status: RemediationStatus
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface TopFailingRepo {
  repo: string
  count: number
}

export interface RunTrendPoint {
  date: string
  success: number
  failed: number
}

export interface SkillFile {
  name: string
  content: string
}

export interface CustomAgentConfig {
  agent_key: string
  repo_name?: string
  system_prompt: string | null
  skill_files: SkillFile[]
  updated_at: string | null
}

export interface Application {
  id: string
  org_login: string
  name: string
  slug: string
  description: string | null
  repo_names: string[]
  repo_count: number
  created_at: string | null
}

export interface TopFailingWorkflow {
  workflow: string
  count: number
}

export interface AnalyticsData {
  total_runs: number
  completed_runs: number
  success_count: number
  failure_count: number
  other_count: number
  failure_rate: number
  success_rate: number
  runs_per_day: number
  remediations_raised: number
  avg_analysis_seconds: number | null
  avg_time_to_pr_seconds: number | null
  mttr_seconds: number | null
  mttd_seconds: number | null
  open_vulns_total: number
  open_vulns_by_severity: Record<string, number>
  top_failing_repos: TopFailingRepo[]
  top_failing_workflows: TopFailingWorkflow[]
  run_trend: RunTrendPoint[]
}

export interface LongestJobEntry {
  job_name: string
  repo_name: string
  workflow_run_id: string
  duration_seconds: number
}

export interface LongestWorkflowEntry {
  workflow_name: string
  repo_name: string
  workflow_run_id: string
  duration_seconds: number
}

export interface RunnerBreakdownEntry {
  runner_labels: string[] | null
  job_count: number
  avg_duration_seconds: number | null
}

export type PRReviewStatus = 'pending' | 'analyzing' | 'completed' | 'failed'

export interface PRReview {
  id: string
  org_login: string
  repo_name: string
  pr_number: number
  pr_url: string
  author: string | null
  risk_score: number | null
  findings: string[] | null
  review_summary: string | null
  status: PRReviewStatus
  agent_trace: string[] | null
  created_at: string
  updated_at: string
}

export interface AgentRun {
  id: string
  org_login: string
  repo_name: string | null
  agent_name: string
  github_run_id: string | null
  outcome: string
  summary: string | null
  gaps_found: number
  prs_opened: string[] | null
  artifacts: string[] | null
  conditions_evaluated: Record<string, unknown>[] | null
  evidence: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface AgentSummary {
  agent_name: string
  total_runs: number
  last_run_at: string | null
  last_outcome: string | null
  gaps_found: number
  prs_opened: number
  failure_runs: number
}

export interface AgentFleetSummary {
  agents: AgentSummary[]
  total_runs: number
}

export interface ViolationItem {
  author: string | null
  repo_name: string
  pr_number: number
  pr_url: string
  violation: string
  severity: string
  risk_score: number | null
  source: string
  created_at: string
}

export interface ViolationFeed {
  violations: ViolationItem[]
  total: number
}

export interface VulnerabilityFinding {
  id: string
  org_login: string
  repo_name: string
  fingerprint: string
  alert_source: string
  alert_number: number | null
  identifier: string | null
  severity: string | null
  severity_in_context: string | null
  package_name: string | null
  description: string | null
  blast_radius: { affected_repos?: string[]; affected_files?: string[]; method?: string } | null
  fix_available: boolean
  status: string
  github_issue_number: number | null
  github_issue_url: string | null
  pr_url: string | null
  rca_summary: string | null
  html_url: string | null
  created_at: string
  updated_at: string
}

export interface VulnerabilityFindingList {
  findings: VulnerabilityFinding[]
  total: number
}

export interface ApplicationContext {
  id: string
  org_login: string
  repo_name: string
  app_name: string | null
  language: string | null
  framework: string | null
  regulatory_scope: string[] | null
  data_classification: string | null
  risk_tier: string | null
  team_owner: string | null
  security_contact: string | null
  notes: string | null
  source: string
  created_at: string
  updated_at: string
}

export interface ApplicationContextList {
  contexts: ApplicationContext[]
  total: number
}

export interface RunsPage {
  runs: WorkflowRun[]
  total: number
}

export interface FetchRunsParams {
  limit?: number
  offset?: number
  org_login?: string
  repo_name?: string
  status?: string
  conclusion?: string
}

export type GraphType = 'dependency' | 'knowledge'
export type GraphStatus = 'pending' | 'building' | 'completed' | 'failed'
export type GraphNodeType =
  | 'workflow'
  | 'job'
  | 'reusable_workflow'
  | 'composite_action'
  | 'service'
  | 'external_repo'
  | 'governance_rule'
  | 'app_requirement'
  | 'runtime_metric'
  | 'failure'
export type GraphEdgeType =
  | 'needs'
  | 'uses_reusable'
  | 'uses_composite'
  | 'workflow_call_input'
  | 'needs_output'
  | 'workflow_run_trigger'
  | 'orchestrator_service_dep'
  | 'repository_dispatch'
  | 'matrix_fanout'
  | 'governs'
  | 'applies_to'
  | 'caused_by'
  | 'measured_by'
export type GraphEdgeConfidence = 'certain' | 'heuristic' | 'ambiguous'

export interface GraphNodeData {
  id: string
  node_type: GraphNodeType
  external_key: string
  display_name: string
  workflow_file: string | null
  job_id: string | null
  node_metadata: Record<string, unknown> | null
}

export interface GraphEdgeData {
  id: string
  source_node_id: string
  target_node_id: string
  edge_type: GraphEdgeType
  confidence: GraphEdgeConfidence
  edge_metadata: Record<string, unknown> | null
}

export interface Graph {
  id: string
  org_login: string
  repo_name: string | null
  graph_type: GraphType
  ref: string | null
  status: GraphStatus
  node_count: number
  edge_count: number
  error_message: string | null
  built_at: string | null
  created_at: string
}

export interface GraphDetail extends Graph {
  nodes: GraphNodeData[]
  edges: GraphEdgeData[]
}

export interface JobRunData {
  id: string
  workflow_run_id: string
  github_job_id: number
  job_name: string
  status: string
  conclusion: string | null
  started_at: string | null
  completed_at: string | null
  duration_seconds: number | null
  runner_name: string | null
}

export interface CriticalPathData {
  id: string
  workflow_run_id: string
  total_duration_seconds: number
  critical_path_job_ids: string[]
  longest_job_id: string | null
  computed_at: string
}

export interface WorkflowTemplate {
  id: string
  org_login: string
  name: string
  description: string | null
  template_yaml: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface VersionDrift {
  component: string
  template_version: string
  workflow_version: string
}

export interface TemplateDiffSummary {
  missing_components: string[]
  extra_components: string[]
  version_drift: VersionDrift[]
  adoption_score: number
  narrative?: string
}

export interface TemplateDiff {
  id: string
  org_login: string
  repo_name: string
  workflow_file: string
  template_id: string
  diff_summary: TemplateDiffSummary
  adoption_score: number
  computed_at: string
}

export interface PatternClusterSignature {
  components: string[]
  match_type?: 'exact' | 'semantic'
  candidate_type?: 'ACTION' | 'JOB' | 'WORKFLOW'
  pattern_name?: string
  draft_template_yaml?: string
}

export interface PatternCluster {
  id: string
  org_login: string
  pattern_hash: string
  pattern_signature: PatternClusterSignature
  occurrence_count: number
  example_workflow_files: string[]
  computed_at: string
}

export type GovernanceDocType = 'governance_policy' | 'app_profile'

export interface GovernanceDocument {
  id: string
  org_login: string
  doc_type: GovernanceDocType
  title: string
  source_filename: string | null
  structured_requirements: { requirements: { id: string; description: string }[] } | null
  created_at: string
  updated_at: string
}

export type ComplianceStatus = 'compliant' | 'gap' | 'not_applicable'

export interface ComplianceFinding {
  id: string
  org_login: string
  repo_name: string
  workflow_file: string
  governance_document_id: string | null
  requirement_id: string
  status: ComplianceStatus
  finding_detail: string
  remediation_suggestion: string | null
  severity: string
  computed_at: string
}

export type OptimizationStatus = 'proposed' | 'accepted' | 'rejected' | 'applied'

export interface OptimizationRecommendation {
  id: string
  org_login: string
  repo_name: string
  workflow_file: string
  graph_id: string
  recommendation_type: string
  description: string
  proposed_yaml_diff: string | null
  estimated_time_savings_seconds: number
  confidence_score: number
  status: OptimizationStatus
  pr_url: string | null
  pr_number: number | null
  pr_branch: string | null
  agent_trace: string[] | null
  created_at: string
  updated_at: string
  original_yaml: string | null
}

export interface SimulationRun {
  id: string
  recommendation_id: string
  baseline_critical_path_seconds: number
  simulated_critical_path_seconds: number
  delta_seconds: number
  computed_at: string
}

export type WebSocketEventType = 'run_update' | 'remediation_created' | 'remediation_updated' | 'connected'

export interface WebSocketEvent {
  type: WebSocketEventType
  data?: Record<string, unknown>
}
