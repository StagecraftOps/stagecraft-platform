import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterLink, ActivatedRoute } from '@angular/router'
import { LucideAngularModule, ArrowLeft, ExternalLink, Bot, AlertCircle, CheckCircle2, Clock, GitPullRequest, Copy, Check, Loader2, Code2 } from 'lucide-angular'
import { PageHeaderComponent } from '../shared/page-header.component'
import { BadgeComponent } from '../shared/badge.component'
import { ApiService } from '../core/api.service'
import { formatDate, formatRelativeTime, diffYamlLines } from '../core/utils'
import type { YamlDiffLine } from '../core/utils'
import type { Remediation } from '../core/types'

@Component({
  selector: 'app-remediation-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, PageHeaderComponent, BadgeComponent],
  templateUrl: './remediation-detail.component.html',
})
export class RemediationDetailComponent implements OnInit, OnDestroy {
  icons = { ArrowLeft, ExternalLink, Bot, AlertCircle, CheckCircle2, Clock, GitPullRequest, Copy, Check, Loader2, Code2 }
  formatDate = formatDate
  formatRelativeTime = formatRelativeTime

  id = ''
  remediation = signal<Remediation | null>(null)
  isLoading = signal(true)
  error = signal(false)
  raising = signal(false)
  raiseError = signal<string | null>(null)
  copied = signal(false)
  private pollTimer: ReturnType<typeof setInterval> | null = null

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id') || ''
    this.load()
  }

  async load() {
    try {
      const rem = await this.api.fetchRemediation(this.id)
      this.remediation.set(rem)
      if (rem.status === 'pending' || rem.status === 'analyzing') {
        if (!this.pollTimer) this.pollTimer = setInterval(() => this.load(), 3000)
      } else if (this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }
    } catch {
      this.error.set(true)
    } finally {
      this.isLoading.set(false)
    }
  }

  async raisePr() {
    this.raising.set(true)
    this.raiseError.set(null)
    try {
      const updated = await this.api.raisePr(this.id)
      this.remediation.set(updated)
    } catch (e: any) {
      this.raiseError.set(e?.error?.detail || 'Failed to create PR on GitHub.')
    } finally {
      this.raising.set(false)
    }
  }

  async copyYaml() {
    const rem = this.remediation()
    if (!rem?.suggested_yaml) return
    try {
      await navigator.clipboard.writeText(rem.suggested_yaml)
      this.copied.set(true)
      setTimeout(() => this.copied.set(false), 2000)
    } catch {}
  }

  yamlDiff = computed<YamlDiffLine[]>(() => {
    const rem = this.remediation()
    if (!rem?.suggested_yaml) return []
    return diffYamlLines(rem.original_yaml, rem.suggested_yaml)
  })
  addedLineCount = computed(() => this.yamlDiff().filter(l => l.kind === 'added').length)

  isPending() { return this.remediation()?.status === 'pending' }
  isAnalyzing() { return this.remediation()?.status === 'analyzing' }
  isAnalyzed() { return this.remediation()?.status === 'analyzed' }
  isPrRaised() { return this.remediation()?.status === 'pr_raised' }
  isFailed() { return this.remediation()?.status === 'failed' }
  hasResult() { return this.isAnalyzed() || this.isPrRaised() }
  hasSuggestedYaml() { return Boolean(this.remediation()?.suggested_yaml) }
  canRaisePr() { return this.isAnalyzed() && this.hasSuggestedYaml() }

  ngOnDestroy() {
    if (this.pollTimer) clearInterval(this.pollTimer)
  }
}
