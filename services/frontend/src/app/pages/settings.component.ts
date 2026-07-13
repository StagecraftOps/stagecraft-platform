import { Component, OnInit, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { LucideAngularModule, AlertCircle, ExternalLink, Github, Trash2, Rocket, Building2, Boxes, Upload, Plus, Check } from 'lucide-angular'
import { PageHeaderComponent } from '../shared/page-header.component'
import { OnboardingComponent } from './onboarding.component'
import { ApiService } from '../core/api.service'
import { ApplicationService } from '../core/application.service'
import { OrgService } from '../core/org.service'
import type { Organization, Application } from '../core/types'

type Section = 'onboarding' | 'applications' | 'organizations'

interface RepoRow {
  name: string
  private: boolean
  language: string | null
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, PageHeaderComponent, OnboardingComponent],
  templateUrl: './settings.component.html',
})
export class SettingsComponent implements OnInit {
  icons = { AlertCircle, ExternalLink, Github, Trash2, Rocket, Building2, Boxes, Upload, Plus, Check }

  section = signal<Section>('applications')

  // Organizations
  orgs = signal<Organization[]>([])
  isLoading = signal(true)
  removingLogin = signal<string | null>(null)

  // Applications
  applications = signal<Application[]>([])
  repos = signal<RepoRow[]>([])
  reposLoading = signal(false)
  newName = signal('')
  newDescription = signal('')
  selectedRepos = signal<Set<string>>(new Set())
  creating = signal(false)
  createError = signal<string | null>(null)
  deletingId = signal<string | null>(null)

  // Context upload
  contextRepo = signal<string>('')
  contextBusy = signal(false)
  contextMessage = signal<string | null>(null)

  constructor(private api: ApiService, public appSvc: ApplicationService, public org: OrgService) {}

  async ngOnInit() {
    await this.load()
    await this.loadApplications()
    await this.loadRepos()
  }

  setSection(s: Section) {
    this.section.set(s)
  }

  // --- Organizations ---
  async load() {
    this.isLoading.set(true)
    try {
      this.orgs.set(await this.api.fetchOrgs())
    } finally {
      this.isLoading.set(false)
    }
  }

  async remove(login: string) {
    this.removingLogin.set(login)
    try {
      await this.api.removeOrg(login)
      await this.load()
    } finally {
      this.removingLogin.set(null)
    }
  }

  install() {
    window.location.href = this.api.getOrgInstallUrl()
  }

  // --- Applications ---
  async loadApplications() {
    await this.appSvc.load()
    this.applications.set(this.appSvc.applications())
  }

  async loadRepos() {
    const orgLogin = this.org.currentOrg()
    if (!orgLogin) return
    this.reposLoading.set(true)
    try {
      const data = await this.api.fetchOrgRepos(orgLogin)
      this.repos.set(data.repos.map((r) => ({ name: r.name, private: r.private, language: r.language })))
    } catch {
      this.repos.set([])
    } finally {
      this.reposLoading.set(false)
    }
  }

  toggleRepo(name: string) {
    const next = new Set(this.selectedRepos())
    next.has(name) ? next.delete(name) : next.add(name)
    this.selectedRepos.set(next)
  }

  async createApplication() {
    const name = this.newName().trim()
    if (!name) {
      this.createError.set('Give the application a name.')
      return
    }
    this.creating.set(true)
    this.createError.set(null)
    try {
      await this.appSvc.create(name, this.newDescription().trim() || null, Array.from(this.selectedRepos()))
      this.newName.set('')
      this.newDescription.set('')
      this.selectedRepos.set(new Set())
      await this.loadApplications()
    } catch (e: any) {
      this.createError.set(e?.error?.detail || 'Failed to create application.')
    } finally {
      this.creating.set(false)
    }
  }

  async deleteApplication(app: Application) {
    this.deletingId.set(app.id)
    try {
      await this.appSvc.remove(app.id)
      await this.loadApplications()
    } finally {
      this.deletingId.set(null)
    }
  }

  onContextFile(event: Event, app: Application) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    const repo = this.contextRepo()
    if (!file || !repo) {
      this.contextMessage.set('Pick a repo first, then choose a file.')
      return
    }
    this.contextBusy.set(true)
    this.contextMessage.set(null)
    this.api
      .uploadApplicationContext(this.org.currentOrg(), repo, file)
      .then(() => this.contextMessage.set(`Context uploaded for ${repo}.`))
      .catch((e) => this.contextMessage.set(e?.error?.detail || 'Upload failed.'))
      .finally(() => {
        this.contextBusy.set(false)
        input.value = ''
      })
  }
}
