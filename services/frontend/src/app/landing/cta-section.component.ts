import { AfterViewInit, Component, ElementRef, OnDestroy, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { LucideAngularModule, ArrowRight } from 'lucide-angular'

@Component({
  selector: 'app-cta-section',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './cta-section.component.html',
})
export class CtaSectionComponent implements AfterViewInit, OnDestroy {
  icons = { ArrowRight }
  visible = signal(false)
  private observer?: IntersectionObserver

  constructor(private el: ElementRef<HTMLElement>) {}

  ngAfterViewInit() {
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) this.visible.set(true)
      },
      { threshold: 0.2 },
    )
    this.observer.observe(this.el.nativeElement)
  }

  ngOnDestroy() {
    this.observer?.disconnect()
  }
}
