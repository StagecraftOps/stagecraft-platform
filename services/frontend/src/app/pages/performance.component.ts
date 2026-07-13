import { Component, effect, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterLink } from '@angular/router'
import { LucideAngularModule, AlertTriangle } from 'lucide-angular'
import { PageHeaderComponent } from '../shared/page-header.component'
import { BarChartComponent, BarDatum } from '../shared/bar-chart.component'
import { ApiService } from '../core/api.service'
import { OrgService } from '../core/org.service'
import type { LongestJobEntry, LongestWorkflowEntry, RunnerBreakdownEntry } from '../core/types'

function formatDuration(seconds: number): string {
  const total = Math.round(seconds)
  if (total < 60) return `${total}s`
  const m = Math.floor(total / 60)
  return `${m}m ${total % 60}s`
}

@Component({
  selector: 'app-performance',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, PageHeaderComponent, BarChartComponent],
  templateUrl: './performance.component.html',
})
export class PerformanceComponent {
  icons = { AlertTriangle }
  formatDuration = formatDuration

  longestJobs = signal<LongestJobEntry[]>([])
  longestWorkflows = signal<LongestWorkflowEntry[]>([])
  runnerBreakdown = signal<RunnerBreakdownEntry[]>([])
  isLoading = signal(true)

  suggestion = signal<string | null>(null)
  suggestionSeverity = signal<string>('ok')
  suggestionLoading = signal(false)

  constructor(public org: OrgService, private api: ApiService) {
    effect(() => {
      if (this.org.currentOrg()) queueMicrotask(() => this.load())
    })
  }

  async load() {
    this.isLoading.set(true)
    try {
      const [jobs, workflows, runners] = await Promise.all([
        this.api.fetchLongestJobs(this.org.currentOrg()),
        this.api.fetchLongestWorkflows(this.org.currentOrg()),
        this.api.fetchRunnerBreakdown(this.org.currentOrg()),
      ])
      this.longestJobs.set(jobs)
      this.longestWorkflows.set(workflows)
      this.runnerBreakdown.set(runners)
      this.loadSuggestion(jobs, workflows, runners)
    } finally {
      this.isLoading.set(false)
    }
  }

  private async loadSuggestion(
    jobs: LongestJobEntry[], workflows: LongestWorkflowEntry[], runners: RunnerBreakdownEntry[],
  ) {
    this.suggestionLoading.set(true)
    try {
      const { suggestion, severity } = await this.api.fetchInsightSuggestion('performance', {
        longest_jobs: jobs.slice(0, 5).map((j) => ({ job: j.job_name, repo: j.repo_name, seconds: j.duration_seconds })),
        longest_workflows: workflows.slice(0, 5).map((w) => ({ workflow: w.workflow_name, repo: w.repo_name, seconds: w.duration_seconds })),
        runner_breakdown: runners.map((r) => ({
          runner: r.runner_labels?.length ? r.runner_labels.join(',') : 'no runner assigned',
          job_count: r.job_count,
          avg_duration_seconds: r.avg_duration_seconds,
        })),
      })
      this.suggestion.set(suggestion)
      this.suggestionSeverity.set(severity)
    } catch {
      this.suggestion.set(null)
    } finally {
      this.suggestionLoading.set(false)
    }
  }

  jobBars(): BarDatum[] {
    return this.longestJobs().map((j) => ({ label: j.job_name, value: j.duration_seconds }))
  }

  totalJobs(): number {
    return this.runnerBreakdown().reduce((sum, r) => sum + r.job_count, 0)
  }

  runnerPct(count: number): number {
    return this.totalJobs() ? (100 * count) / this.totalJobs() : 0
  }

  hasUnassigned(): boolean {
    return this.runnerBreakdown().some((r) => !r.runner_labels || r.runner_labels.length === 0)
  }
}
