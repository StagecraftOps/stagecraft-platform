import { Component, Input } from '@angular/core'
import { CommonModule } from '@angular/common'

export interface LineSeriesPoint {
  date: string
  success: number
  failed: number
}

@Component({
  selector: 'app-line-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" class="w-full h-full">
      <line *ngFor="let y of gridLines" [attr.x1]="padding" [attr.x2]="width - padding" [attr.y1]="yFor(y)" [attr.y2]="yFor(y)" stroke="#f4f4f5" stroke-dasharray="3 3" />
      <polyline [attr.points]="successPoints()" fill="none" stroke="#10b981" stroke-width="2" />
      <polyline [attr.points]="failedPoints()" fill="none" stroke="#f43f5e" stroke-width="2" />
    </svg>
    <div class="flex items-center justify-center gap-6 mt-2 text-xs text-zinc-500">
      <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500"></span>Success</span>
      <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-rose-500"></span>Failed</span>
    </div>
  `,
})
export class LineChartComponent {
  @Input() data: LineSeriesPoint[] = []
  width = 600
  height = 220
  padding = 20

  get maxValue(): number {
    const values = this.data.flatMap((d) => [d.success, d.failed])
    return Math.max(1, ...values)
  }

  get gridLines(): number[] {
    const max = this.maxValue
    return [0, max / 2, max]
  }

  yFor(value: number): number {
    const usable = this.height - this.padding * 2
    return this.height - this.padding - (value / this.maxValue) * usable
  }

  private pointsFor(key: 'success' | 'failed'): string {
    if (this.data.length === 0) return ''
    const usable = this.width - this.padding * 2
    const step = this.data.length > 1 ? usable / (this.data.length - 1) : 0
    return this.data
      .map((d, i) => `${this.padding + i * step},${this.yFor(d[key])}`)
      .join(' ')
  }

  successPoints(): string {
    return this.pointsFor('success')
  }

  failedPoints(): string {
    return this.pointsFor('failed')
  }
}
