import { Component, Input } from '@angular/core'
import { CommonModule } from '@angular/common'

interface StatusConfig {
  label: string
  className: string
  dotClass: string
}

const statusConfig: Record<string, StatusConfig> = {
  success: { label: 'Success', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dotClass: 'bg-emerald-500' },
  completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dotClass: 'bg-emerald-500' },
  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dotClass: 'bg-emerald-500' },
  failure: { label: 'Failed', className: 'bg-rose-50 text-rose-700 border border-rose-200', dotClass: 'bg-rose-500' },
  failed: { label: 'Failed', className: 'bg-rose-50 text-rose-700 border border-rose-200', dotClass: 'bg-rose-500' },
  timed_out: { label: 'Timed out', className: 'bg-rose-50 text-rose-700 border border-rose-200', dotClass: 'bg-rose-500' },
  action_required: { label: 'Action required', className: 'bg-orange-50 text-orange-700 border border-orange-200', dotClass: 'bg-orange-400' },
  in_progress: { label: 'In progress', className: 'bg-amber-50 text-amber-700 border border-amber-200', dotClass: 'bg-amber-500 animate-pulse' },
  analyzing: { label: 'Analyzing', className: 'bg-amber-50 text-amber-700 border border-amber-200', dotClass: 'bg-amber-500 animate-pulse' },
  analyzed: { label: 'Ready', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dotClass: 'bg-emerald-500' },
  pr_raised: { label: 'PR raised', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dotClass: 'bg-emerald-500' },
  helpful: { label: 'Accepted ✓', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dotClass: 'bg-emerald-500' },
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border border-amber-200', dotClass: 'bg-amber-400 animate-pulse' },
  queued: { label: 'Queued', className: 'bg-zinc-100 text-zinc-600 border border-zinc-200', dotClass: 'bg-zinc-400' },
  waiting: { label: 'Waiting', className: 'bg-zinc-100 text-zinc-600 border border-zinc-200', dotClass: 'bg-zinc-400' },
  skipped: { label: 'Skipped', className: 'bg-zinc-100 text-zinc-500 border border-zinc-200', dotClass: 'bg-zinc-400' },
  cancelled: { label: 'Cancelled', className: 'bg-zinc-100 text-zinc-500 border border-zinc-200', dotClass: 'bg-zinc-400' },
  neutral: { label: 'Neutral', className: 'bg-zinc-100 text-zinc-500 border border-zinc-200', dotClass: 'bg-zinc-400' },
  disabled_manually: { label: 'Disabled', className: 'bg-zinc-100 text-zinc-500 border border-zinc-200', dotClass: 'bg-zinc-400' },
  disabled_inactivity: { label: 'Inactive', className: 'bg-zinc-100 text-zinc-500 border border-zinc-200', dotClass: 'bg-zinc-400' },
}

const defaultConfig: StatusConfig = { label: 'Unknown', className: 'bg-zinc-100 text-zinc-600 border border-zinc-200', dotClass: 'bg-zinc-400' }

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium" [ngClass]="config.className">
      <span *ngIf="showDot" class="w-1.5 h-1.5 rounded-full flex-shrink-0" [ngClass]="config.dotClass"></span>
      {{ label || config.label }}
    </span>
  `,
})
export class BadgeComponent {
  @Input() status = ''
  @Input() label?: string
  @Input() showDot = true

  get config(): StatusConfig {
    return statusConfig[this.status] ?? defaultConfig
  }
}
