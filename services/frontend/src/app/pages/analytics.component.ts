import { Component, OnInit, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { LucideAngularModule, TrendingUp, Bot, AlertCircle, Timer, Search, Bug, Activity, AlertTriangle } from 'lucide-angular'
import { PageHeaderComponent } from '../shared/page-header.component'
import { LineChartComponent } from '../shared/line-chart.component'
import { BarChartComponent, BarDatum } from '../shared/bar-chart.component'
import { ApiService } from '../core/api.service'
import type { AnalyticsData } from '../core/types'

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '—'
  const abs = Math.abs(seconds)
  if (abs < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(abs / 60)
  const s = Math.round(abs % 60)
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ${m % 60}m`
  const d = Math.floor(h / 24)
  return `${d}d ${h % 24}h`
}

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'unknown']

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, PageHeaderComponent, LineChartComponent, BarChartComponent],
  templateUrl: './analytics.component.html',
})
export class AnalyticsComponent implements OnInit {
  icons = { TrendingUp, Bot, AlertCircle, Timer, Search, Bug, Activity, AlertTriangle }
  formatDuration = formatDuration

  analytics = signal<AnalyticsData | null>(null)
  isLoading = signal(true)
  error = signal(false)

  suggestion = signal<string | null>(null)
  suggestionSeverity = signal<string>('ok')
  suggestionLoading = signal(false)

  constructor(private api: ApiService) {}

  async ngOnInit() {
    try {
      const data = await this.api.fetchAnalytics()
      this.analytics.set(data)
      this.loadSuggestion(data)
    } catch {
      this.error.set(true)
    } finally {
      this.isLoading.set(false)
    }
  }

  private async loadSuggestion(data: AnalyticsData) {
    this.suggestionLoading.set(true)
    try {
      const { suggestion, severity } = await this.api.fetchInsightSuggestion('insights', {
        failure_rate: data.failure_rate,
        completed_runs: data.completed_runs,
        mttr_seconds: data.mttr_seconds,
        mttd_seconds: data.mttd_seconds,
        remediations_raised: data.remediations_raised,
        open_vulns_total: data.open_vulns_total,
        open_vulns_by_severity: data.open_vulns_by_severity,
        top_failing_repos: data.top_failing_repos,
        top_failing_workflows: data.top_failing_workflows,
      })
      this.suggestion.set(suggestion)
      this.suggestionSeverity.set(severity)
    } catch {
      this.suggestion.set(null)
    } finally {
      this.suggestionLoading.set(false)
    }
  }

  completed(): number {
    return this.analytics()?.completed_runs ?? 0
  }

  successPct(): number {
    const a = this.analytics()
    return a && this.completed() ? (a.success_count / this.completed()) * 100 : 0
  }

  failurePct(): number {
    const a = this.analytics()
    return a && this.completed() ? (a.failure_count / this.completed()) * 100 : 0
  }

  otherPct(): number {
    const a = this.analytics()
    return a && this.completed() ? (a.other_count / this.completed()) * 100 : 0
  }

  topFailingBars(): BarDatum[] {
    return (this.analytics()?.top_failing_repos ?? []).map((r) => ({ label: r.repo, value: r.count }))
  }

  topFailingWorkflowBars(): BarDatum[] {
    return (this.analytics()?.top_failing_workflows ?? []).map((w) => ({ label: w.workflow, value: w.count }))
  }

  severityEntries(): { sev: string; count: number }[] {
    const map = this.analytics()?.open_vulns_by_severity ?? {}
    return Object.keys(map)
      .map((sev) => ({ sev, count: map[sev] }))
      .sort((a, b) => SEVERITY_ORDER.indexOf(a.sev) - SEVERITY_ORDER.indexOf(b.sev))
  }

  severityDot(sev: string): string {
    switch (sev) {
      case 'critical': return 'bg-rose-600'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-amber-500'
      case 'low': return 'bg-zinc-400'
      default: return 'bg-zinc-300'
    }
  }
}
