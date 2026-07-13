import { Component, Input } from '@angular/core'
import { CommonModule } from '@angular/common'
import { LucideAngularModule, Zap } from 'lucide-angular'
import type { JobRunData, CriticalPathData } from '../core/types'

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—'
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

@Component({
  selector: 'app-job-timeline',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <p *ngIf="jobs.length === 0" class="text-sm text-zinc-400 py-4 text-center">No per-job timing data yet.</p>
    <div *ngIf="jobs.length > 0" class="space-y-2">
      <div *ngFor="let job of jobs" class="flex items-center gap-3">
        <div class="w-40 flex-shrink-0 truncate text-xs text-zinc-600 flex items-center gap-1">
          <lucide-angular *ngIf="criticalPath?.longest_job_id === job.id" [img]="icons.Zap" [size]="11" class="text-amber-500 flex-shrink-0"></lucide-angular>
          {{ job.job_name }}
        </div>
        <div class="flex-1 h-5 bg-zinc-100 rounded overflow-hidden">
          <div [ngClass]="criticalIds().has(job.id) ? 'h-full bg-amber-500 rounded' : 'h-full bg-zinc-400 rounded'" [style.width.%]="width(job)"></div>
        </div>
        <div class="w-16 flex-shrink-0 text-right text-xs font-mono text-zinc-500">{{ formatDuration(job.duration_seconds) }}</div>
      </div>
      <p *ngIf="criticalPath" class="text-xs text-zinc-400 pt-2">
        Critical path total: <span class="font-mono">{{ formatDuration(criticalPath.total_duration_seconds) }}</span>
        — amber bars are on the critical path, the lightning bolt marks the single longest job.
      </p>
    </div>
  `,
})
export class JobTimelineComponent {
  @Input() jobs: JobRunData[] = []
  @Input() criticalPath: CriticalPathData | null = null

  icons = { Zap }
  formatDuration = formatDuration

  criticalIds(): Set<string> {
    return new Set(this.criticalPath?.critical_path_job_ids ?? [])
  }

  maxDuration(): number {
    return Math.max(...this.jobs.map((j) => j.duration_seconds ?? 0), 1)
  }

  width(job: JobRunData): number {
    return Math.max(((job.duration_seconds ?? 0) / this.maxDuration()) * 100, 2)
  }
}
