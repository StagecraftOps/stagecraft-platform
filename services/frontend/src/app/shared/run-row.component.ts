import { Component, Input } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router } from '@angular/router'
import { LucideAngularModule, GitBranch, ExternalLink } from 'lucide-angular'
import { BadgeComponent } from './badge.component'
import { formatRelativeTime, calculateDuration, formatSha, truncate } from '../core/utils'
import type { WorkflowRun } from '../core/types'

@Component({
  // Attribute selector on <tr>: the host element IS the table row, so no
  // wrapper element sits between <tbody> and <tr>. This keeps the row a real
  // <tr> under table-fixed, so body cells line up with the header columns.
  selector: 'tr[app-run-row]',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, BadgeComponent],
  host: {
    class: 'hover:bg-zinc-50 transition-colors cursor-pointer',
    '(click)': 'goto()',
  },
  template: `
    <td *ngIf="showWorkflow" class="py-3 px-4 text-sm overflow-hidden">
      <div class="font-medium text-zinc-800 truncate">{{ truncate(run.workflow_name || ('Run #' + run.github_run_id), 40) }}</div>
    </td>
    <td *ngIf="showRepo" class="py-3 px-4 text-sm text-zinc-500 overflow-hidden">
      <div class="truncate">{{ run.repo_name || '—' }}</div>
    </td>
    <td class="py-3 px-4 overflow-hidden">
      <div class="flex items-center gap-1 text-xs text-zinc-500">
        <lucide-angular [img]="icons.GitBranch" [size]="11" class="text-zinc-400 flex-shrink-0"></lucide-angular>
        <span class="truncate">{{ run.branch }}</span>
      </div>
    </td>
    <td class="py-3 px-4 whitespace-nowrap">
      <code class="text-xs text-zinc-400 font-mono bg-zinc-50 px-1.5 py-0.5 rounded">{{ formatSha(run.head_sha) }}</code>
    </td>
    <td class="py-3 px-4 whitespace-nowrap">
      <app-badge [status]="displayStatus()"></app-badge>
    </td>
    <td class="py-3 px-4 text-xs text-zinc-500 tabular-nums whitespace-nowrap">
      {{ run.started_at ? calculateDuration(run.started_at, run.completed_at) : '—' }}
    </td>
    <td class="py-3 px-4 text-xs text-zinc-400 whitespace-nowrap">
      {{ run.started_at ? formatRelativeTime(run.started_at) : '—' }}
    </td>
    <td class="py-3 px-4 whitespace-nowrap">
      <a *ngIf="run.html_url" [href]="run.html_url" target="_blank" rel="noopener noreferrer" (click)="$event.stopPropagation()" class="text-zinc-400 hover:text-amber-600 transition-colors">
        <lucide-angular [img]="icons.ExternalLink" [size]="13"></lucide-angular>
      </a>
    </td>
  `,
})
export class RunRowComponent {
  @Input({ required: true }) run!: WorkflowRun
  @Input() showWorkflow = true
  @Input() showRepo = true

  icons = { GitBranch, ExternalLink }
  truncate = truncate
  formatSha = formatSha
  calculateDuration = calculateDuration
  formatRelativeTime = formatRelativeTime

  constructor(private router: Router) {}

  displayStatus(): string {
    return this.run.status === 'completed' ? this.run.conclusion || 'neutral' : this.run.status
  }

  goto() {
    this.router.navigate(['/runs', this.run.id])
  }
}
