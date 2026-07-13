import { AfterViewInit, Component, ElementRef, OnDestroy, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { LucideAngularModule, GitBranch, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-angular'

interface MockRun {
  workflow: string
  repo: string
  branch: string
  sha: string
  status: string
  time: string
}

const mockRuns: MockRun[] = [
  { workflow: 'CI / Build & Test', repo: 'api-service', branch: 'main', sha: 'a3f2b19', status: 'success', time: '2m 14s' },
  { workflow: 'Deploy to Staging', repo: 'frontend', branch: 'main', sha: 'c7d8e01', status: 'in_progress', time: '—' },
  { workflow: 'CI / Build & Test', repo: 'webhook-service', branch: 'feature/auth', sha: '9b1a44c', status: 'failure', time: '1m 03s' },
  { workflow: 'Terraform Plan', repo: 'infra', branch: 'main', sha: 'f4e3c29', status: 'success', time: '45s' },
  { workflow: 'Security Scan', repo: 'api-service', branch: 'main', sha: 'a3f2b19', status: 'success', time: '3m 52s' },
  { workflow: 'CI / Build & Test', repo: 'remediation-worker', branch: 'fix/retry', sha: '2d9f883', status: 'queued', time: '—' },
]

const badgeClassMap: Record<string, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failure: 'bg-rose-50 text-rose-700 border-rose-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  queued: 'bg-zinc-100 text-zinc-500 border-zinc-200',
}

const badgeLabelMap: Record<string, string> = {
  success: 'Success',
  failure: 'Failed',
  in_progress: 'Running',
  queued: 'Queued',
}

const bulletItems = [
  'Filter by org, repo, status, or conclusion',
  'Syncs historical runs on org connect',
  'Live updates via WebSocket as runs progress',
  'Click any row → full run detail + AI analysis',
]

@Component({
  selector: 'app-runs-preview-section',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './runs-preview-section.component.html',
})
export class RunsPreviewSectionComponent implements AfterViewInit, OnDestroy {
  icons = { GitBranch, CheckCircle2, XCircle, Loader2, Clock }
  mockRuns = mockRuns
  bulletItems = bulletItems
  visible = signal(false)
  private observer?: IntersectionObserver

  constructor(private el: ElementRef<HTMLElement>) {}

  ngAfterViewInit() {
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) this.visible.set(true)
      },
      { threshold: 0.15 },
    )
    this.observer.observe(this.el.nativeElement)
  }

  ngOnDestroy() {
    this.observer?.disconnect()
  }

  statusIcon(status: string) {
    if (status === 'success') return this.icons.CheckCircle2
    if (status === 'failure') return this.icons.XCircle
    if (status === 'in_progress') return this.icons.Loader2
    return this.icons.Clock
  }

  statusIconClass(status: string): string {
    if (status === 'success') return 'text-emerald-500'
    if (status === 'failure') return 'text-rose-500'
    if (status === 'in_progress') return 'text-amber-500 animate-spin'
    return 'text-zinc-400'
  }

  badgeClass(status: string): string {
    return badgeClassMap[status] || badgeClassMap['queued']
  }

  badgeLabel(status: string): string {
    return badgeLabelMap[status] || status
  }

  rowDelay(i: number): number {
    return 300 + i * 60
  }
}
