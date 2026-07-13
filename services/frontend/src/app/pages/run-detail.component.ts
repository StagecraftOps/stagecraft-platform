import { Component, OnInit, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterLink, ActivatedRoute } from '@angular/router'
import { LucideAngularModule, ArrowLeft, ExternalLink, Bot, AlertCircle, GitBranch, Clock, Hash } from 'lucide-angular'
import { PageHeaderComponent } from '../shared/page-header.component'
import { BadgeComponent } from '../shared/badge.component'
import { JobTimelineComponent } from '../shared/job-timeline.component'
import { LogViewerComponent } from '../shared/log-viewer.component'
import { ApiService } from '../core/api.service'
import { formatDate, formatRelativeTime, calculateDuration, formatSha, truncate } from '../core/utils'
import type { WorkflowRun, Remediation, JobRunData, CriticalPathData } from '../core/types'

@Component({
  selector: 'app-run-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, BadgeComponent, JobTimelineComponent, LogViewerComponent],
  templateUrl: './run-detail.component.html',
})
export class RunDetailComponent implements OnInit {
  icons = { ArrowLeft, ExternalLink, Bot, AlertCircle, GitBranch, Clock, Hash }
  formatDate = formatDate
  formatRelativeTime = formatRelativeTime
  calculateDuration = calculateDuration
  formatSha = formatSha
  truncate = truncate

  runId = ''
  run = signal<WorkflowRun | null>(null)
  relatedRemediation = signal<Remediation | null>(null)
  jobs = signal<JobRunData[]>([])
  criticalPath = signal<CriticalPathData | null>(null)
  isLoading = signal(true)
  error = signal(false)

  showLogs = signal(false)
  logs = signal<string | null>(null)
  logsLoading = signal(false)
  logsError = signal(false)

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  async ngOnInit() {
    this.runId = this.route.snapshot.paramMap.get('run_id') || ''
    try {
      const [run, remediations, jobs, criticalPath] = await Promise.all([
        this.api.fetchRun(this.runId),
        this.api.fetchRemediations(),
        this.api.fetchRunJobs(this.runId),
        this.api.fetchRunCriticalPath(this.runId),
      ])
      this.run.set(run);
      this.relatedRemediation.set(remediations.find((r) => r.workflow_run_id === run.id) || null)
      this.jobs.set(jobs)
      this.criticalPath.set(criticalPath)
    } catch {
      this.error.set(true)
    } finally {
      this.isLoading.set(false)
    }
  }

  displayStatus(): string {
    const r = this.run()
    if (!r) return 'queued'
    return r.status === 'completed' ? r.conclusion || 'neutral' : r.status
  }

  async loadLogs() {
    this.showLogs.set(true)
    this.logsLoading.set(true)
    this.logsError.set(false)
    try {
      this.logs.set(await this.api.fetchRunLogs(this.runId))
    } catch {
      this.logsError.set(true)
    } finally {
      this.logsLoading.set(false)
    }
  }
}
