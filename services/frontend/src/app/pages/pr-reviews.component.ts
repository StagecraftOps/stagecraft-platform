import { Component, OnInit, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { LucideAngularModule, GitPullRequest, ExternalLink, AlertCircle, Sparkles } from 'lucide-angular'
import { PageHeaderComponent } from '../shared/page-header.component'
import { BadgeComponent } from '../shared/badge.component'
import { ApiService } from '../core/api.service'
import { truncate, formatRelativeTime } from '../core/utils'
import type { PRReview } from '../core/types'

function riskColor(score: number | null): string {
  if (score === null) return 'text-zinc-400'
  if (score >= 8) return 'text-rose-600'
  if (score >= 4) return 'text-amber-600'
  return 'text-emerald-600'
}

@Component({
  selector: 'app-pr-reviews',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, PageHeaderComponent, BadgeComponent],
  templateUrl: './pr-reviews.component.html',
})
export class PrReviewsComponent implements OnInit {
  icons = { GitPullRequest, ExternalLink, AlertCircle, Sparkles }
  truncate = truncate
  formatRelativeTime = formatRelativeTime
  riskColor = riskColor

  reviews = signal<PRReview[]>([])
  isLoading = signal(true)
  error = signal(false)
  expandedId = signal<string | null>(null)

  constructor(private api: ApiService) {}

  async ngOnInit() {
    try {
      this.reviews.set(await this.api.fetchPRReviews())
    } catch {
      this.error.set(true)
    } finally {
      this.isLoading.set(false)
    }
  }

  toggle(id: string) {
    this.expandedId.set(this.expandedId() === id ? null : id)
  }
}
