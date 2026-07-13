import { Component, Input } from '@angular/core'
import { CommonModule } from '@angular/common'

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mb-8 flex items-start justify-between gap-4">
      <div>
        <p *ngIf="eyebrow" class="font-code text-[11px] uppercase tracking-[0.18em] text-amber-600 dark:text-amber-500 mb-1">
          {{ eyebrow }}
        </p>
        <h1 class="font-serif-display text-3xl leading-tight text-zinc-900 dark:text-zinc-100">{{ title }}</h1>
        <p *ngIf="description" class="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-2xl">{{ description }}</p>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        <ng-content select="[actions]"></ng-content>
      </div>
    </div>
  `,
})
export class PageHeaderComponent {
  @Input() eyebrow?: string
  @Input() title = ''
  @Input() description?: string
}
