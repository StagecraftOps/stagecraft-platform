import { Component, effect, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { LucideAngularModule, Search, GitBranch, ArrowRight } from 'lucide-angular'
import { PageHeaderComponent } from '../shared/page-header.component'
import { BadgeComponent } from '../shared/badge.component'
import { ApiService } from '../core/api.service'
import { OrgService } from '../core/org.service'
import type { Workflow } from '../core/types'

type StatusFilter = 'all' | 'active' | 'failed' | 'disabled'

@Component({
  selector: 'app-workflows',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule, PageHeaderComponent, BadgeComponent],
  templateUrl: './workflows.component.html',
})
export class WorkflowsComponent {
  icons = { Search, GitBranch, ArrowRight }
  search = signal('')
  statusFilter = signal<StatusFilter>('all')
  filterButtons: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Failed', value: 'failed' },
    { label: 'Disabled', value: 'disabled' },
  ]

  workflows = signal<Workflow[]>([])
  isLoading = signal(true)
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
      this.workflows.set(await this.api.fetchWorkflowsByOrg(this.org.currentOrg()))
    } catch {
      this.error.set(true)
    } finally {
      this.isLoading.set(false)
    }
  }

  filtered(): Workflow[] {
    let result = this.workflows()
    const q = this.search().trim().toLowerCase()
    if (q) {
      result = result.filter(
        (wf) => wf.name.toLowerCase().includes(q) || wf.repo_name.toLowerCase().includes(q) || wf.path.toLowerCase().includes(q),
      )
    }
    const filter = this.statusFilter()
    if (filter !== 'all') {
      result = result.filter((wf) => {
        if (filter === 'active') return wf.state === 'active'
        if (filter === 'disabled') return wf.state === 'disabled_manually' || wf.state === 'disabled_inactivity'
        if (filter === 'failed') return wf.state !== 'active'
        return true
      })
    }
    return result
  }
}
