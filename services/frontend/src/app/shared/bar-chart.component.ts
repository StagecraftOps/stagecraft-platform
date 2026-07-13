import { Component, Input } from '@angular/core'
import { CommonModule } from '@angular/common'

export interface BarDatum {
  label: string
  value: number
}

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-2.5">
      <div *ngFor="let d of data" class="flex items-center gap-3">
        <span class="w-28 flex-shrink-0 text-xs text-zinc-500 truncate text-right">{{ d.label }}</span>
        <div class="flex-1 h-4 rounded bg-zinc-100 overflow-hidden">
          <div class="h-full rounded" [style.width.%]="pct(d.value)" [style.background]="color"></div>
        </div>
        <span class="w-10 flex-shrink-0 text-xs text-zinc-500 tabular-nums">{{ d.value }}</span>
      </div>
    </div>
  `,
})
export class BarChartComponent {
  @Input() data: BarDatum[] = []
  @Input() color = '#f59e0b'

  get maxValue(): number {
    return Math.max(1, ...this.data.map((d) => d.value))
  }

  pct(value: number): number {
    return (100 * value) / this.maxValue
  }
}
