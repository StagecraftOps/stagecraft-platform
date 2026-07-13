import { AfterViewInit, Component, ElementRef, Input, OnDestroy, signal } from '@angular/core'
import { CommonModule } from '@angular/common'

export interface Feature {
  number: string
  title: string
  description: string
  visual: string
}

@Component({
  selector: 'app-feature-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './feature-card.component.html',
})
export class FeatureCardComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) feature!: Feature
  @Input({ required: true }) index!: number

  visible = signal(false)
  aiSpokes = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * 60 * Math.PI) / 180
    const r = 52
    return { x2: 100 + Math.cos(angle) * r, y2: 80 + Math.sin(angle) * r, delay: `${i * 0.33}s` }
  })
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
}
