import { Component, effect, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { LucideAngularModule, RefreshCw, AlertTriangle, CheckCircle2, Sparkles, ChevronDown, ChevronRight } from 'lucide-angular'
import { PageHeaderComponent } from '../shared/page-header.component'
import { BadgeComponent } from '../shared/badge.component'
import { ApiService } from '../core/api.service'
import { OrgService } from '../core/org.service'
import type { WorkflowTemplate, TemplateDiff, PatternCluster } from '../core/types'

function scoreColor(score: number): string {
  if (score >= 90) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-600'
  return 'text-rose-600'
}

@Component({
  selector: 'app-standardization',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, PageHeaderComponent, BadgeComponent],
  templateUrl: './standardization.component.html',
})
export class StandardizationComponent {
  icons = { RefreshCw, AlertTriangle, CheckCircle2, Sparkles, ChevronDown, ChevronRight }
  scoreColor = scoreColor

  repos = signal<string[]>([])
  selectedRepo = signal('')
  showRegister = signal(false)
  tplName = signal('')
  tplDesc = signal('')
  tplYaml = signal('')
  expandedDraft = signal<string | null>(null)

  templates = signal<WorkflowTemplate[]>([])
  diffs = signal<TemplateDiff[]>([])
  patterns = signal<PatternCluster[]>([])
  analyzing = signal(false)
  registering = signal(false)
  registerError = signal(false)

  constructor(public org: OrgService, private api: ApiService) {
    effect(() => {
      if (this.org.currentOrg()) this.init()
    })
  }

  async init() {
    const workflows = await this.api.fetchWorkflowsByOrg(this.org.currentOrg())
    const repos = Array.from(new Set(workflows.map((w) => w.repo_name))).sort()
    this.repos.set(repos)
    if (repos.length > 0 && !this.selectedRepo()) this.selectedRepo.set(repos[0])
    this.templates.set(await this.api.fetchTemplates(this.org.currentOrg()))
    await this.loadDiffs()
    await this.loadPatterns()
  }

  onRepoChange(repo: string) {
    this.selectedRepo.set(repo)
    this.loadDiffs()
  }

  async loadDiffs() {
    if (!this.selectedRepo()) return
    this.diffs.set(await this.api.fetchTemplateDiffs(this.org.currentOrg(), this.selectedRepo()))
  }

  async loadPatterns() {
    this.patterns.set(await this.api.fetchPatternClusters(this.org.currentOrg()))
  }

  async analyze() {
    this.analyzing.set(true)
    try {
      await this.api.analyzeStandardization(this.org.currentOrg(), this.selectedRepo())
      await this.loadDiffs()
      await this.loadPatterns()
    } finally {
      this.analyzing.set(false)
    }
  }

  async register() {
    this.registering.set(true)
    this.registerError.set(false)
    try {
      await this.api.createTemplate(this.org.currentOrg(), {
        name: this.tplName().trim(),
        description: this.tplDesc().trim() || undefined,
        template_yaml: this.tplYaml(),
      })
      this.templates.set(await this.api.fetchTemplates(this.org.currentOrg()))
      this.showRegister.set(false)
      this.tplName.set('')
      this.tplDesc.set('')
      this.tplYaml.set('')
    } catch {
      this.registerError.set(true)
    } finally {
      this.registering.set(false)
    }
  }

  toggleDraft(id: string) {
    this.expandedDraft.set(this.expandedDraft() === id ? null : id)
  }

  isCompliant(diff: TemplateDiff): boolean {
    return diff.diff_summary.missing_components.length === 0 && diff.diff_summary.version_drift.length === 0
  }
}
