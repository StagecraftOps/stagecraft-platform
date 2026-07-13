import { Component, effect, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { LucideAngularModule, RefreshCw, AlertCircle } from 'lucide-angular'
import { PageHeaderComponent } from '../shared/page-header.component'
import { DagViewerComponent } from '../shared/dag-viewer/dag-viewer.component'
import { ApiService } from '../core/api.service'
import { OrgService } from '../core/org.service'
import type { GraphDetail, Workflow } from '../core/types'

@Component({
  selector: 'app-dependency-graph',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, PageHeaderComponent, DagViewerComponent],
  templateUrl: './dependency-graph.component.html',
})
export class DependencyGraphComponent {
  icons = { RefreshCw, AlertCircle }

  workflows = signal<Workflow[]>([])
  selectedRepo = signal('')
  graph = signal<GraphDetail | null>(null)
  isLoading = signal(false)
  building = signal(false)
  error = signal(false)

  repos = () => Array.from(new Set(this.workflows().map((w) => w.repo_name))).sort()

  constructor(public org: OrgService, private api: ApiService) {
    effect(() => {
      if (this.org.currentOrg()) this.init()
    })
  }

  async init() {
    const workflows = await this.api.fetchWorkflowsByOrg(this.org.currentOrg())
    this.workflows.set(workflows)
    const repos = this.repos()
    if (repos.length > 0 && !this.selectedRepo()) this.selectedRepo.set(repos[0])
    await this.loadGraph()
  }

  onRepoChange(repo: string) {
    this.selectedRepo.set(repo)
    this.loadGraph()
  }

  async loadGraph() {
    if (!this.selectedRepo()) return
    this.isLoading.set(true)
    this.error.set(false)
    try {
      this.graph.set(await this.api.fetchDependencyGraph(this.org.currentOrg(), this.selectedRepo()))
    } catch {
      this.error.set(true)
      this.graph.set(null)
    } finally {
      this.isLoading.set(false)
    }
  }

  async build() {
    this.building.set(true)
    try {
      await this.api.buildDependencyGraph(this.org.currentOrg(), this.selectedRepo())
      await this.pollUntilDone()
    } finally {
      this.building.set(false)
    }
  }

  private async pollUntilDone() {
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 3000))
      try {
        const g = await this.api.fetchDependencyGraph(this.org.currentOrg(), this.selectedRepo())
        if (g.status === 'completed') {
          this.graph.set(g)
          this.error.set(false)
          return
        }
        if (g.status === 'failed') {
          this.error.set(true)
          return
        }
      } catch {}
    }
  }
}
