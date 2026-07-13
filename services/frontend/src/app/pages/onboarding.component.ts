import { Component, OnDestroy, OnInit, signal, computed } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterLink } from '@angular/router'
import {
  LucideAngularModule,
  Github,
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  ExternalLink,
  Layers,
  ShieldCheck,
  Building2,
  Info,
} from 'lucide-angular'
import { PageHeaderComponent } from '../shared/page-header.component'
import { ApiService } from '../core/api.service'
import { OrgService } from '../core/org.service'
import type { WorkflowTemplate, ApplicationContext, GovernanceDocument } from '../core/types'

interface RepoRow {
  name: string
  private: boolean
  language: string | null
  is_active: boolean
}

interface StepDef {
  label: string
  guide: string
}

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, PageHeaderComponent],
  templateUrl: './onboarding.component.html',
})
export class OnboardingComponent implements OnInit, OnDestroy {
  icons = { Github, CheckCircle2, Circle, Loader2, XCircle, ExternalLink, Layers, ShieldCheck, Building2, Info }

  steps: StepDef[] = [
    { label: 'Connect', guide: 'Install the StageCraft GitHub App on the organization you want to govern.' },
    { label: 'Select Scope', guide: 'Choose which repositories StageCraft should monitor. You can widen this later.' },
    { label: 'Templates', guide: 'Review the workflow templates already registered for this organization.' },
    { label: 'Standards', guide: 'Check how much of your active scope has governance context configured.' },
    { label: 'Analysis', guide: 'StageCraft is discovering your estate and syncing pipeline history in the background.' },
  ]

  currentStep = signal(0)

  // step 1
  isLoadingOrgs = computed(() => this.org.isLoading())
  hasOrg = computed(() => this.org.orgs().length > 0)

  // step 2
  repos = signal<RepoRow[]>([])
  selectedRepos = signal<Set<string>>(new Set())
  isLoadingRepos = signal(false)
  savingScope = signal(false)
  repoError = signal<string | null>(null)

  // step 3
  templates = signal<WorkflowTemplate[]>([])
  isLoadingTemplates = signal(false)

  // step 4
  contexts = signal<ApplicationContext[]>([])
  governanceDocs = signal<GovernanceDocument[]>([])
  isLoadingStandards = signal(false)

  // step 5
  progress = signal<{
    org_login: string
    org_sync_status: string
    repos: { repo_name: string; status: string; runs_synced: number; error: string | null; updated_at: string | null }[]
    total: number
    completed: number
  } | null>(null)
  private pollTimer: ReturnType<typeof setInterval> | null = null

  contextedActiveCount = computed(() => {
    const active = new Set(Array.from(this.selectedRepos()))
    let count = 0
    for (const c of this.contexts()) {
      if (active.has(c.repo_name)) count++
    }
    return count
  })

  activeRepoCount = computed(() => this.selectedRepos().size)

  constructor(public org: OrgService, private api: ApiService) {}

  async ngOnInit() {
    await this.org.refresh()
    if (this.hasOrg()) {
      // If redirected back from GitHub install, org list is now populated - advance past Connect.
      this.currentStep.set(0)
    }
  }

  ngOnDestroy() {
    this.stopPolling()
  }

  install() {
    window.location.href = this.api.getOrgInstallUrl()
  }

  async next() {
    if (this.currentStep() === 1) {
      await this.saveScope()
    }
    if (this.currentStep() < this.steps.length - 1) {
      this.currentStep.set(this.currentStep() + 1)
      await this.onStepEnter(this.currentStep())
    }
  }

  back() {
    if (this.currentStep() > 0) {
      this.stopPolling()
      this.currentStep.set(this.currentStep() - 1)
    }
  }

  async goToStep(index: number) {
    if (index === this.currentStep()) return
    if (index > this.currentStep()) return // only allow going back via indicator
    this.stopPolling()
    this.currentStep.set(index)
  }

  async onStepEnter(step: number) {
    if (step === 1) await this.loadRepos()
    if (step === 2) await this.loadTemplates()
    if (step === 3) await this.loadStandards()
    if (step === 4) this.startPolling()
  }

  async loadRepos() {
    this.isLoadingRepos.set(true)
    this.repoError.set(null)
    try {
      const data = await this.api.fetchOrgRepos(this.org.currentOrg())
      this.repos.set(data.repos)
      this.selectedRepos.set(new Set(data.repos.filter((r) => r.is_active).map((r) => r.name)))
    } catch {
      this.repoError.set('Failed to load repositories.')
    } finally {
      this.isLoadingRepos.set(false)
    }
  }

  toggleRepo(name: string) {
    const next = new Set(this.selectedRepos())
    if (next.has(name)) next.delete(name)
    else next.add(name)
    this.selectedRepos.set(next)
  }

  selectAll() {
    this.selectedRepos.set(new Set(this.repos().map((r) => r.name)))
  }

  selectNone() {
    this.selectedRepos.set(new Set())
  }

  async saveScope() {
    this.savingScope.set(true)
    try {
      await this.api.setOrgRepoScope(this.org.currentOrg(), Array.from(this.selectedRepos()))
    } catch {
      this.repoError.set('Failed to save repository scope.')
    } finally {
      this.savingScope.set(false)
    }
  }

  async loadTemplates() {
    this.isLoadingTemplates.set(true)
    try {
      this.templates.set(await this.api.fetchTemplates(this.org.currentOrg()))
    } finally {
      this.isLoadingTemplates.set(false)
    }
  }

  async loadStandards() {
    this.isLoadingStandards.set(true)
    try {
      const [contextList, docs] = await Promise.all([
        this.api.fetchApplicationContexts(this.org.currentOrg()),
        this.api.fetchGovernanceDocuments(this.org.currentOrg()),
      ])
      this.contexts.set(contextList.contexts)
      this.governanceDocs.set(docs)
    } finally {
      this.isLoadingStandards.set(false)
    }
  }

  startPolling() {
    this.loadProgress()
    if (!this.pollTimer) this.pollTimer = setInterval(() => this.loadProgress(), 3000)
  }

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  }

  async loadProgress() {
    try {
      const data = await this.api.fetchSyncProgress(this.org.currentOrg())
      this.progress.set(data)
      if (data.completed >= data.total) this.stopPolling()
    } catch {
      // keep polling; transient errors are fine
    }
  }

  statusClasses(status: string): string {
    switch (status) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400'
      case 'syncing':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400'
      case 'failed':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400'
      default:
        return 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400'
    }
  }
}
