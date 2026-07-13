import { Component, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { LucideAngularModule, Building2, Upload, AlertCircle, ShieldCheck } from 'lucide-angular'
import { PageHeaderComponent } from '../shared/page-header.component'
import { ApiService } from '../core/api.service'
import { OrgService } from '../core/org.service'
import { formatRelativeTime } from '../core/utils'
import type { ApplicationContext } from '../core/types'

const RISK_TIERS = ['critical', 'high', 'medium', 'low']
const REGULATORY_OPTIONS = ['PCI', 'SOC2', 'HIPAA', 'GDPR', 'FedRAMP', 'ISO27001']

function riskTierClasses(tier: string | null): string {
  switch (tier) {
    case 'critical': return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20'
    case 'high': return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/20'
    case 'medium': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20'
    case 'low': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20'
    default: return 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700'
  }
}

@Component({
  selector: 'app-application-context',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, PageHeaderComponent],
  templateUrl: './application-context.component.html',
})
export class ApplicationContextComponent {
  icons = { Building2, Upload, AlertCircle, ShieldCheck }
  formatRelativeTime = formatRelativeTime
  riskTierClasses = riskTierClasses
  riskTiers = RISK_TIERS
  regulatoryOptions = REGULATORY_OPTIONS

  repos = signal<string[]>([])
  contexts = signal<ApplicationContext[]>([])
  isLoading = signal(true)
  error = signal(false)

  selectedRepo = signal('')
  uploading = signal(false)
  uploadError = signal<string | null>(null)

  saving = signal(false)
  saveError = signal<string | null>(null)
  appName = signal('')
  language = signal('')
  framework = signal('')
  riskTier = signal('')
  dataClassification = signal('')
  teamOwner = signal('')
  securityContact = signal('')
  notes = signal('')
  selectedRegScope = signal<Set<string>>(new Set())

  constructor(public org: OrgService, private api: ApiService) {
    this.init()
  }

  async init() {
    this.isLoading.set(true)
    try {
      const [workflows, contextList] = await Promise.all([
        this.api.fetchWorkflowsByOrg(this.org.currentOrg()),
        this.api.fetchApplicationContexts(this.org.currentOrg()),
      ])
      const repos = Array.from(new Set(workflows.map((w) => w.repo_name))).sort()
      this.repos.set(repos)
      if (repos.length > 0 && !this.selectedRepo()) this.selectedRepo.set(repos[0])
      this.contexts.set(contextList.contexts)
    } catch {
      this.error.set(true)
    } finally {
      this.isLoading.set(false)
    }
  }

  async refreshContexts() {
    const contextList = await this.api.fetchApplicationContexts(this.org.currentOrg())
    this.contexts.set(contextList.contexts)
  }

  toggleRegScope(value: string) {
    const next = new Set(this.selectedRegScope())
    if (next.has(value)) next.delete(value)
    else next.add(value)
    this.selectedRegScope.set(next)
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file || !this.selectedRepo()) return
    this.uploading.set(true)
    this.uploadError.set(null)
    try {
      await this.api.uploadApplicationContext(this.org.currentOrg(), this.selectedRepo(), file)
      await this.refreshContexts()
    } catch {
      this.uploadError.set('Upload failed. Check the file has recognized key: value fields.')
    } finally {
      this.uploading.set(false)
      input.value = ''
    }
  }

  async saveManual() {
    if (!this.selectedRepo()) return
    this.saving.set(true)
    this.saveError.set(null)
    try {
      await this.api.createApplicationContext(this.org.currentOrg(), this.selectedRepo(), {
        app_name: this.appName().trim() || undefined,
        language: this.language().trim() || undefined,
        framework: this.framework().trim() || undefined,
        regulatory_scope: this.selectedRegScope().size ? Array.from(this.selectedRegScope()) : undefined,
        data_classification: this.dataClassification().trim() || undefined,
        risk_tier: this.riskTier() || undefined,
        team_owner: this.teamOwner().trim() || undefined,
        security_contact: this.securityContact().trim() || undefined,
        notes: this.notes().trim() || undefined,
      })
      await this.refreshContexts()
    } catch {
      this.saveError.set('Failed to save application context.')
    } finally {
      this.saving.set(false)
    }
  }

  contextForRepo(repo: string): ApplicationContext | undefined {
    return this.contexts().find((c) => c.repo_name === repo)
  }
}
