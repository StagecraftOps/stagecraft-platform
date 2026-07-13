import { Component, OnInit, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterLink, ActivatedRoute } from '@angular/router'
import { LucideAngularModule, ArrowLeft, GitBranch, AlertCircle, ExternalLink } from 'lucide-angular'
import { PageHeaderComponent } from '../shared/page-header.component'
import { BadgeComponent } from '../shared/badge.component'
import { ApiService } from '../core/api.service'
import type { Workflow } from '../core/types'

@Component({
  selector: 'app-workflow-repo-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, PageHeaderComponent, BadgeComponent],
  templateUrl: './workflow-repo-detail.component.html',
})
export class WorkflowRepoDetailComponent implements OnInit {
  icons = { ArrowLeft, GitBranch, AlertCircle, ExternalLink }

  owner = ''
  repo = ''
  workflows = signal<Workflow[]>([])
  isLoading = signal(true)
  error = signal(false)

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  async ngOnInit() {
    this.owner = this.route.snapshot.paramMap.get('owner') || ''
    this.repo = this.route.snapshot.paramMap.get('repo') || ''
    try {
      this.workflows.set(await this.api.fetchWorkflowsByRepo(this.owner, this.repo))
    } catch {
      this.error.set(true)
    } finally {
      this.isLoading.set(false)
    }
  }

  workflowUrl(wf: Workflow): string {
    return `https://github.com/${this.owner}/${this.repo}/actions/workflows/${wf.path.split('/').pop()}`
  }
}
