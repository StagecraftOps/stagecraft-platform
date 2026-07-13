import { Component, effect, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { LucideAngularModule, RefreshCw, AlertCircle } from 'lucide-angular'
import { PageHeaderComponent } from '../shared/page-header.component'
import { DagViewerComponent } from '../shared/dag-viewer/dag-viewer.component'
import { ApiService } from '../core/api.service'
import { OrgService } from '../core/org.service'
import type { GraphDetail } from '../core/types'

@Component({
  selector: 'app-knowledge-graph',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, PageHeaderComponent, DagViewerComponent],
  templateUrl: './knowledge-graph.component.html',
})
export class KnowledgeGraphComponent {
  icons = { RefreshCw, AlertCircle }

  graph = signal<GraphDetail | null>(null)
  isLoading = signal(false)
  building = signal(false)
  error = signal(false)

  constructor(public org: OrgService, private api: ApiService) {
    effect(() => {
      if (this.org.currentOrg()) queueMicrotask(() => this.load())
    })
  }

  async load() {
    this.isLoading.set(true)
    this.error.set(false)
    try {
      this.graph.set(await this.api.fetchKnowledgeGraph(this.org.currentOrg()))
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
      await this.api.buildKnowledgeGraph(this.org.currentOrg())
      await this.pollUntilDone()
    } finally {
      this.building.set(false)
    }
  }

  private async pollUntilDone() {
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 3000))
      try {
        const g = await this.api.fetchKnowledgeGraph(this.org.currentOrg())
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
