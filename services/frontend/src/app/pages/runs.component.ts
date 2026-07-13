import { Component, OnInit, effect, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { LucideAngularModule, AlertCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-angular'
import { PageHeaderComponent } from '../shared/page-header.component'
import { RunRowComponent } from '../shared/run-row.component'
import { ApiService } from '../core/api.service'
import { OrgService } from '../core/org.service'
import type { WorkflowRun } from '../core/types'

const PAGE_SIZE = 25

@Component({
  selector: 'app-runs',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, PageHeaderComponent, RunRowComponent],
  templateUrl: './runs.component.html',
})
export class RunsComponent implements OnInit {
  icons = { AlertCircle, ChevronLeft, ChevronRight, Loader2 }

  selectedRepo = signal('all')
  statusFilter = signal('all')
  conclusionFilter = signal('all')
  page = signal(0)

  repoOptions = signal<string[]>([])
  runs = signal<WorkflowRun[]>([])
  total = signal(0)
  isLoading = signal(false)
  error = signal(false)

  constructor(public org: OrgService, private api: ApiService) {
    effect(() => {
      const currentOrg = this.org.currentOrg()
      if (currentOrg) {
        queueMicrotask(() => {
          this.loadWorkflows()
          this.loadRuns()
        })
      }
    })
  }

  ngOnInit() {}

  get totalPages() {
    return Math.max(1, Math.ceil(this.total() / PAGE_SIZE))
  }

  async loadWorkflows() {
    const workflows = await this.api.fetchWorkflowsByOrg(this.org.currentOrg())
    this.repoOptions.set(Array.from(new Set(workflows.map((w) => w.repo_name))).sort())
  }

  async loadRuns() {
    this.isLoading.set(true)
    this.error.set(false)
    try {
      const data = await this.api.fetchRuns({
        org_login: this.org.currentOrg() || undefined,
        repo_name: this.selectedRepo() !== 'all' ? this.selectedRepo() : undefined,
        status: this.statusFilter() !== 'all' ? this.statusFilter() : undefined,
        conclusion: this.conclusionFilter() !== 'all' ? this.conclusionFilter() : undefined,
        limit: PAGE_SIZE,
        offset: this.page() * PAGE_SIZE,
      })
      this.runs.set(data.runs)
      this.total.set(data.total)
    } catch {
      this.error.set(true)
    } finally {
      this.isLoading.set(false)
    }
  }

  onFilterChange() {
    this.page.set(0)
    this.loadRuns()
  }

  prevPage() {
    this.page.set(Math.max(0, this.page() - 1))
    this.loadRuns()
  }

  nextPage() {
    this.page.set(Math.min(this.totalPages - 1, this.page() + 1))
    this.loadRuns()
  }
}
