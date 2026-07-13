import { Component, OnInit, signal, computed } from '@angular/core'
import { CommonModule } from '@angular/common'
import { LucideAngularModule, ShieldAlert, ExternalLink, AlertCircle, User } from 'lucide-angular'
import { PageHeaderComponent } from '../shared/page-header.component'
import { ApiService } from '../core/api.service'
import { OrgService } from '../core/org.service'
import { formatRelativeTime } from '../core/utils'
import type { ViolationItem } from '../core/types'

function severityClasses(sev: string): string {
  switch (sev) {
    case 'critical': return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20'
    case 'high': return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/20'
    case 'medium': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20'
    default: return 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700'
  }
}

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, PageHeaderComponent],
  template: `
    <div class="p-8">
      <app-page-header eyebrow="Governance Audit" title="Compliance Violation Feed" description="Every governance violation the Peer Review agent flagged, attributed to the GitHub author who raised the change. Counts are factual — for coaching, not blame."></app-page-header>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div class="bg-white border border-zinc-200 rounded-lg p-4 dark:bg-zinc-900 dark:border-zinc-800">
          <div class="text-2xl font-semibold text-zinc-800 tabular-nums dark:text-zinc-100">{{ violations().length }}</div>
          <div class="text-xs uppercase tracking-wider text-zinc-400 mt-1">Violations</div>
        </div>
        <div class="bg-white border border-zinc-200 rounded-lg p-4 dark:bg-zinc-900 dark:border-zinc-800">
          <div class="text-2xl font-semibold text-rose-600 tabular-nums">{{ criticalCount() }}</div>
          <div class="text-xs uppercase tracking-wider text-zinc-400 mt-1">Critical</div>
        </div>
        <div class="bg-white border border-zinc-200 rounded-lg p-4 dark:bg-zinc-900 dark:border-zinc-800">
          <div class="text-2xl font-semibold text-zinc-800 tabular-nums dark:text-zinc-100">{{ authorCount() }}</div>
          <div class="text-xs uppercase tracking-wider text-zinc-400 mt-1">Authors flagged</div>
        </div>
        <div class="bg-white border border-zinc-200 rounded-lg p-4 dark:bg-zinc-900 dark:border-zinc-800">
          <div class="text-2xl font-semibold text-zinc-800 tabular-nums dark:text-zinc-100">{{ repoCount() }}</div>
          <div class="text-xs uppercase tracking-wider text-zinc-400 mt-1">Repos</div>
        </div>
      </div>

      <div *ngIf="error()" class="flex items-center gap-3 text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-4 mb-6">
        <lucide-angular [img]="icons.AlertCircle" [size]="16"></lucide-angular>
        <p class="text-sm">Failed to load the violation feed. Check your connection.</p>
      </div>

      <div *ngIf="!isLoading() && violations().length === 0" class="flex flex-col items-center justify-center py-16 text-center bg-white border border-zinc-200 rounded-lg dark:bg-zinc-900 dark:border-zinc-800">
        <lucide-angular [img]="icons.ShieldAlert" [size]="24" class="text-zinc-300 mb-2"></lucide-angular>
        <p class="text-sm text-zinc-400">No governance violations recorded yet. They appear here as the Peer Review agent flags PRs.</p>
      </div>

      <div class="flex flex-col gap-2">
        <div *ngFor="let v of violations()" class="bg-white border border-zinc-200 rounded-lg p-4 flex items-start gap-4 dark:bg-zinc-900 dark:border-zinc-800">
          <div class="w-9 h-9 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center flex-shrink-0 dark:bg-zinc-800">
            <lucide-angular [img]="icons.User" [size]="16"></lucide-angular>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <span class="font-semibold text-zinc-800 dark:text-zinc-100">{{ v.author || 'unknown' }}</span>
              <span class="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border" [ngClass]="severityClasses(v.severity)">{{ v.severity }}</span>
              <span class="text-xs text-zinc-400">{{ v.repo_name }} · PR #{{ v.pr_number }}</span>
              <span class="text-xs text-zinc-300 ml-auto">{{ formatRelativeTime(v.created_at) }}</span>
            </div>
            <p class="text-sm text-zinc-600 dark:text-zinc-300">{{ v.violation }}</p>
          </div>
          <a *ngIf="v.pr_url" [href]="v.pr_url" target="_blank" rel="noopener noreferrer" class="text-zinc-400 hover:text-amber-600 transition-colors flex-shrink-0">
            <lucide-angular [img]="icons.ExternalLink" [size]="14"></lucide-angular>
          </a>
        </div>
      </div>
    </div>
  `,
})
export class AuditComponent implements OnInit {
  icons = { ShieldAlert, ExternalLink, AlertCircle, User }
  formatRelativeTime = formatRelativeTime
  severityClasses = severityClasses

  violations = signal<ViolationItem[]>([])
  isLoading = signal(true)
  error = signal(false)

  criticalCount = computed(() => this.violations().filter(v => v.severity === 'critical').length)
  authorCount = computed(() => new Set(this.violations().map(v => v.author || 'unknown')).size)
  repoCount = computed(() => new Set(this.violations().map(v => v.repo_name)).size)

  constructor(private api: ApiService, private org: OrgService) {}

  async ngOnInit() {
    try {
      const feed = await this.api.fetchViolations(this.org.currentOrg())
      this.violations.set(feed.violations)
    } catch {
      this.error.set(true)
    } finally {
      this.isLoading.set(false)
    }
  }
}
