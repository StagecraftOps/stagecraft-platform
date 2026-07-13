import { Component, OnInit, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterLink } from '@angular/router'
import { LucideAngularModule, Bot, ExternalLink, AlertCircle } from 'lucide-angular'
import { PageHeaderComponent } from '../shared/page-header.component'
import { BadgeComponent } from '../shared/badge.component'
import { ApiService } from '../core/api.service'
import { truncate, formatRelativeTime } from '../core/utils'
import type { Remediation } from '../core/types'

@Component({
  selector: 'app-remediation-list',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, PageHeaderComponent, BadgeComponent],
  templateUrl: './remediation-list.component.html',
})
export class RemediationListComponent implements OnInit {
  icons = { Bot, ExternalLink, AlertCircle }
  truncate = truncate
  formatRelativeTime = formatRelativeTime

  remediations = signal<Remediation[]>([])
  isLoading = signal(true)
  error = signal(false)

  constructor(private api: ApiService) {}

  async ngOnInit() {
    try {
      this.remediations.set(await this.api.fetchRemediations())
    } catch {
      this.error.set(true)
    } finally {
      this.isLoading.set(false)
    }
  }
}
