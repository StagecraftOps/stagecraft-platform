import { AfterViewInit, Component, ElementRef, OnDestroy, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FeatureCardComponent, Feature } from './feature-card.component'

const features: Feature[] = [
  {
    number: '01',
    title: 'Unified Runs View',
    description:
      'Every workflow run across every repo in your org — queued, running, succeeded, failed — in one live table. Filter by repo, status, or conclusion. No more clicking into each repository.',
    visual: 'table',
  },
  {
    number: '02',
    title: 'AI Root Cause Analysis',
    description:
      'When a run fails, AWS Bedrock reads the failure logs and pinpoints what went wrong. Not just "build failed" — a plain-English explanation of why, and where to look.',
    visual: 'ai',
  },
  {
    number: '03',
    title: 'Suggested YAML Fix',
    description:
      'Bedrock proposes a corrected workflow file. You see the full YAML diff before anything happens. Nothing is committed automatically — you are always in control.',
    visual: 'yaml',
  },
  {
    number: '04',
    title: 'One-Click PR',
    description:
      'Happy with the suggestion? Click "Raise PR" and Stagecraft creates the branch, commits the fix, and opens a pull request — using your own GitHub token, no write-scope stored on our side.',
    visual: 'pr',
  },
]

@Component({
  selector: 'app-features-section',
  standalone: true,
  imports: [CommonModule, FeatureCardComponent],
  templateUrl: './features-section.component.html',
})
export class FeaturesSectionComponent implements AfterViewInit, OnDestroy {
  features = features
  visible = signal(false)
  private observer?: IntersectionObserver

  constructor(private el: ElementRef<HTMLElement>) {}

  ngAfterViewInit() {
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) this.visible.set(true)
      },
      { threshold: 0.1 },
    )
    this.observer.observe(this.el.nativeElement)
  }

  ngOnDestroy() {
    this.observer?.disconnect()
  }
}
