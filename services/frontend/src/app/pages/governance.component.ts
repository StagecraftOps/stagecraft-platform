import { Component, effect, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { LucideAngularModule, Upload, FileText, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-angular'
import { PageHeaderComponent } from '../shared/page-header.component'
import { ApiService } from '../core/api.service'
import { OrgService } from '../core/org.service'
import type { GovernanceDocType, GovernanceDocument, ComplianceFinding } from '../core/types'

const FRAMEWORKS = ['HIPAA', 'PCI', 'SOC2']

@Component({
  selector: 'app-governance',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, PageHeaderComponent],
  templateUrl: './governance.component.html',
})
export class GovernanceComponent {
  icons = { Upload, FileText, RefreshCw, AlertTriangle, CheckCircle2 }
  frameworks = FRAMEWORKS

  selectedRepo = signal('')
  repos = signal<string[]>([])
  docType = signal<GovernanceDocType>('governance_policy')
  title = signal('')
  framework = signal(FRAMEWORKS[0])

  documents = signal<GovernanceDocument[]>([])
  findings = signal<ComplianceFinding[]>([])
  uploading = signal(false)
  analyzingFramework = signal(false)
  analyzingDocId = signal<string | null>(null)

  constructor(public org: OrgService, private api: ApiService) {
    effect(() => {
      if (this.org.currentOrg()) this.initRepos()
    })
  }

  async initRepos() {
    const workflows = await this.api.fetchWorkflowsByOrg(this.org.currentOrg())
    const repos = Array.from(new Set(workflows.map((w) => w.repo_name))).sort()
    this.repos.set(repos)
    if (repos.length > 0 && !this.selectedRepo()) this.selectedRepo.set(repos[0])
    await this.loadDocuments()
    await this.loadFindings()
  }

  async loadDocuments() {
    this.documents.set(await this.api.fetchGovernanceDocuments(this.org.currentOrg()))
  }

  async loadFindings() {
    if (!this.selectedRepo()) return
    this.findings.set(await this.api.fetchComplianceFindings(this.org.currentOrg(), this.selectedRepo()))
  }

  onRepoChange(repo: string) {
    this.selectedRepo.set(repo)
    this.loadFindings()
  }

  async onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return
    this.uploading.set(true)
    try {
      await this.api.uploadGovernanceDocument(this.org.currentOrg(), this.docType(), this.title() || file.name, file)
      this.title.set('')
      await this.loadDocuments()
    } finally {
      this.uploading.set(false)
    }
  }

  async analyzeFramework() {
    this.analyzingFramework.set(true)
    try {
      await this.api.analyzeGovernance(this.org.currentOrg(), this.selectedRepo(), { mode: 'framework', framework: this.framework() })
      await this.loadFindings()
    } finally {
      this.analyzingFramework.set(false)
    }
  }

  async analyzeDocument(documentId: string) {
    this.analyzingDocId.set(documentId)
    try {
      await this.api.analyzeGovernance(this.org.currentOrg(), this.selectedRepo(), { mode: 'document', document_id: documentId })
      await this.loadFindings()
    } finally {
      this.analyzingDocId.set(null)
    }
  }

  gapCount(): number {
    return this.findings().filter((f) => f.status === 'gap').length
  }

  complianceScore(): number | null {
    const total = this.findings().length
    return total > 0 ? Math.round((100 * (total - this.gapCount())) / total) : null
  }
}
