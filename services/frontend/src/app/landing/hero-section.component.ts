import { Component, OnDestroy, OnInit, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { LucideAngularModule, ArrowRight } from 'lucide-angular'

const rotatingWords = ['monitor', 'analyse', 'remediate', 'unify']

@Component({
  selector: 'app-hero-section',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './hero-section.component.html',
})
export class HeroSectionComponent implements OnInit, OnDestroy {
  icons = { ArrowRight }
  horizontalLines = Array.from({ length: 8 }, (_, i) => 12.5 * (i + 1))
  verticalLines = Array.from({ length: 10 }, (_, i) => 10 * (i + 1))
  bulletItems = [
    'All GitHub webhook events',
    'Real-time WebSocket updates',
    'AI root cause analysis',
    'Human-in-the-loop PRs',
    'Multi-org support',
  ]

  visible = signal(false)
  wordIndex = signal(0)
  currentChars = signal<string[]>(rotatingWords[0].split(''))

  private interval?: ReturnType<typeof setInterval>

  ngOnInit() {
    this.visible.set(true)
    this.interval = setInterval(() => {
      const next = (this.wordIndex() + 1) % rotatingWords.length
      this.wordIndex.set(next)
      this.currentChars.set(rotatingWords[next].split(''))
    }, 2800)
  }

  ngOnDestroy() {
    if (this.interval) clearInterval(this.interval)
  }
}
