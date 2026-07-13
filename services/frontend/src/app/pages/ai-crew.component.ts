import { Component, OnInit, signal, computed } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterLink } from '@angular/router'
import { LucideAngularModule, Wrench, GitPullRequest, ShieldCheck, FileText, Gauge, GitCompare, ShieldAlert, Bug, ClipboardCheck, AlertCircle, Bot, ArrowUpRight, Layers, ShieldX } from 'lucide-angular'
import { PageHeaderComponent } from '../shared/page-header.component'
import { ApiService } from '../core/api.service'
import { OrgService } from '../core/org.service'
import { formatRelativeTime } from '../core/utils'
import type { AgentSummary } from '../core/types'

type AgentKind = 'system' | 'custom'

interface AgentMeta {
  key: string
  label: string
  blurb: string
  icon: any
  category: string
  kind: AgentKind
  live: boolean
  href?: string
  fragment?: string
}

// System agents run inside StageCraft. Custom agents are (or will be) published into
// the customer's GitHub repos.
const ROSTER: AgentMeta[] = [
  { key: 'failure_rca', label: 'Self-Healing RCA', blurb: 'Classifies pipeline failures and proposes a fix PR.', icon: Wrench, category: 'Remediation', kind: 'system', live: true, href: '/remediation' },
  { key: 'peer_review', label: 'PR Traces', blurb: 'Reviews PRs for removed gates, secrets, broad permissions.', icon: GitPullRequest, category: 'Review', kind: 'system', live: true, href: '/pr-reviews' },
  { key: 'compliance', label: 'Compliance', blurb: 'Audits workflows against HIPAA / PCI / SOC2 controls.', icon: ShieldCheck, category: 'Quality', kind: 'system', live: true, href: '/governance' },
  { key: 'governance', label: 'Governance', blurb: 'Compares pipelines to your uploaded policy documents.', icon: FileText, category: 'Quality', kind: 'system', live: true, href: '/governance' },
  { key: 'performance_optimization', label: 'Performance Tuner', blurb: 'Finds parallelization and bottleneck fixes, drafts YAML.', icon: Gauge, category: 'Optimization', kind: 'system', live: true, href: '/optimization' },
  { key: 'vulnerability_remediation', label: 'Vulnerability RCA', blurb: 'Turns Trivy / Sonar / CodeQL / Dependabot alerts into tracked, root-caused issues.', icon: Bug, category: 'Security', kind: 'system', live: true, href: '/vulnerabilities' },

  { key: 'drift_detector', label: 'Drift Detector', blurb: 'Flags live pipelines drifting from approved templates.', icon: GitCompare, category: 'Governance', kind: 'custom', live: true },
  { key: 'standardization', label: 'Reuse Detector', blurb: 'Flags job logic that repeats across workflows instead of a shared action/job/workflow.', icon: Layers, category: 'Standardization', kind: 'custom', live: true, href: '/standardization' },
  { key: 'compliance_watchdog', label: 'Compliance Watchdog', blurb: 'Continuous control checks; opens PRs for missing stages.', icon: ShieldAlert, category: 'Governance', kind: 'custom', live: false },
  { key: 'audit_evidence', label: 'Audit Evidence', blurb: 'Traverses the graph to build signed compliance reports.', icon: ClipboardCheck, category: 'Compliance', kind: 'custom', live: false },
  { key: 'vulnerability_remediation_publish', label: 'Vulnerability Remediation', blurb: 'Publishable agent that opens dependency-ordered fix PRs directly in a repo (checked against real npm/PyPI registries).', icon: ShieldX, category: 'Security', kind: 'custom', live: true, href: '/vulnerability-remediation' },
]

@Component({
  selector: 'app-ai-crew',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, PageHeaderComponent],
  template: `
    <div class="p-8">
      <app-page-header eyebrow="AI Crew" title="Agent Fleet" description="Every StageCraft agent, what it governs, and what it has done across your organization."></app-page-header>

      <!-- Selectable category cards: click one to reveal only that group. -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <button
          type="button"
          (click)="activeKind.set('system')"
          class="text-left rounded-xl border p-5 transition-all"
          [ngClass]="activeKind() === 'system'
            ? 'border-amber-300 bg-amber-50 ring-1 ring-amber-300 dark:bg-amber-500/10 dark:border-amber-500/40 dark:ring-amber-500/30'
            : 'border-zinc-200 bg-white hover:border-zinc-300 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:border-zinc-700'"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center dark:bg-amber-500/20 dark:text-amber-400">
                <lucide-angular [img]="icons.Bot" [size]="18"></lucide-angular>
              </div>
              <div>
                <div class="font-semibold text-zinc-800 dark:text-zinc-100">System Agents</div>
                <div class="text-xs text-zinc-400">Run inside StageCraft, across your estate</div>
              </div>
            </div>
            <span class="text-2xl font-bold text-zinc-800 tabular-nums dark:text-zinc-100">{{ systemAgents.length }}</span>
          </div>
        </button>

        <button
          type="button"
          (click)="activeKind.set('custom')"
          class="text-left rounded-xl border p-5 transition-all"
          [ngClass]="activeKind() === 'custom'
            ? 'border-sky-300 bg-sky-50 ring-1 ring-sky-300 dark:bg-sky-500/10 dark:border-sky-500/40 dark:ring-sky-500/30'
            : 'border-zinc-200 bg-white hover:border-zinc-300 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:border-zinc-700'"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-md bg-sky-100 text-sky-700 flex items-center justify-center dark:bg-sky-500/20 dark:text-sky-400">
                <lucide-angular [img]="icons.ArrowUpRight" [size]="18"></lucide-angular>
              </div>
              <div>
                <div class="font-semibold text-zinc-800 dark:text-zinc-100">Custom Agents</div>
                <div class="text-xs text-zinc-400">Publishable into your repos as GitHub-native agents</div>
              </div>
            </div>
            <span class="text-2xl font-bold text-zinc-800 tabular-nums dark:text-zinc-100">{{ customAgents.length }}</span>
          </div>
        </button>
      </div>

      <div *ngIf="error()" class="flex items-center gap-3 text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-4 mb-6">
        <lucide-angular [img]="icons.AlertCircle" [size]="16"></lucide-angular>
        <p class="text-sm">Failed to load agent activity. Check your connection.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <ng-container *ngFor="let a of (activeKind() === 'system' ? systemAgents : customAgents)">
          <ng-container *ngTemplateOutlet="card; context: { a: a }"></ng-container>
        </ng-container>
      </div>

      <ng-template #card let-a="a">
        <div class="bg-white border border-zinc-200 rounded-lg p-5 flex flex-col dark:bg-zinc-900 dark:border-zinc-800">
          <div class="flex items-start gap-3 mb-3">
            <div class="w-9 h-9 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 dark:bg-amber-500/10">
              <lucide-angular [img]="a.icon" [size]="18"></lucide-angular>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="font-semibold text-zinc-800 truncate dark:text-zinc-100">{{ a.label }}</span>
                <span *ngIf="a.live" class="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20">Live</span>
                <span *ngIf="!a.live" class="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700">Planned</span>
              </div>
              <div class="text-xs text-zinc-400 mt-0.5">{{ a.category }}</div>
            </div>
          </div>

          <p class="text-sm text-zinc-500 leading-snug flex-1 dark:text-zinc-400">{{ a.blurb }}</p>

          <div class="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div>
              <div class="text-sm font-semibold text-zinc-700 tabular-nums dark:text-zinc-200">{{ stat(a.key).total_runs }}</div>
              <div class="text-[10px] uppercase tracking-wider text-zinc-400">Runs</div>
            </div>
            <div>
              <div class="text-sm font-semibold text-zinc-700 tabular-nums dark:text-zinc-200">{{ stat(a.key).gaps_found }}</div>
              <div class="text-[10px] uppercase tracking-wider text-zinc-400">Gaps</div>
            </div>
            <div>
              <div class="text-sm font-semibold text-zinc-700 tabular-nums dark:text-zinc-200">{{ stat(a.key).prs_opened }}</div>
              <div class="text-[10px] uppercase tracking-wider text-zinc-400">PRs</div>
            </div>
          </div>

          <div class="flex items-center justify-between mt-3">
            <span class="text-xs text-zinc-400">
              {{ stat(a.key).last_run_at ? ('Last run ' + formatRelativeTime(stat(a.key).last_run_at!)) : (a.live ? 'No runs yet' : 'Not deployed') }}
            </span>
            <a *ngIf="a.href" [routerLink]="a.href" [fragment]="a.fragment" class="text-xs text-amber-600 hover:text-amber-700 inline-flex items-center gap-1 font-medium">
              Open <lucide-angular [img]="icons.ArrowUpRight" [size]="12"></lucide-angular>
            </a>
          </div>
        </div>
      </ng-template>
    </div>
  `,
})
export class AiCrewComponent implements OnInit {
  icons = { AlertCircle, Bot, ArrowUpRight }
  systemAgents = ROSTER.filter((a) => a.kind === 'system')
  customAgents = ROSTER.filter((a) => a.kind === 'custom')
  formatRelativeTime = formatRelativeTime

  activeKind = signal<AgentKind>('system')
  summaries = signal<Record<string, AgentSummary>>({})
  error = signal(false)

  totalRuns = computed(() => Object.values(this.summaries()).reduce((s, a) => s + a.total_runs, 0))
  totalGaps = computed(() => Object.values(this.summaries()).reduce((s, a) => s + a.gaps_found, 0))

  constructor(private api: ApiService, private org: OrgService) {}

  async ngOnInit() {
    try {
      const data = await this.api.fetchAgentFleetSummary(this.org.currentOrg())
      const map: Record<string, AgentSummary> = {}
      for (const a of data.agents) map[a.agent_name] = a
      this.summaries.set(map)
    } catch {
      this.error.set(true)
    }
  }

  stat(key: string): AgentSummary {
    return this.summaries()[key] ?? { agent_name: key, total_runs: 0, last_run_at: null, last_outcome: null, gaps_found: 0, prs_opened: 0, failure_runs: 0 }
  }
}
