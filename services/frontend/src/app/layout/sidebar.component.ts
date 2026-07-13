import { Component, Input } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterLink, RouterLinkActive } from '@angular/router'
import { LucideAngularModule, LayoutDashboard, GitBranch, Workflow, ListChecks, Wrench, Gauge, Layers, ShieldCheck, Zap, Network, BarChart2, MessageSquare, Settings, LogOut, Sun, Moon, Bot, ShieldAlert, Building2, Rocket } from 'lucide-angular'
import { OrgService } from '../core/org.service'
import { ApplicationService } from '../core/application.service'
import { ThemeService } from '../core/theme.service'
import { ApiService } from '../core/api.service'
import type { User } from '../core/types'

interface NavItem {
  label: string
  href: string
  icon: any
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  @Input() user: User | null = null

  icons = { LayoutDashboard, GitBranch, Workflow, ListChecks, Wrench, Gauge, Layers, ShieldCheck, Zap, Network, BarChart2, MessageSquare, Settings, LogOut, Sun, Moon, Bot, ShieldAlert, Building2, Rocket }

  navSections: { section: string; items: NavItem[] }[] = [
    {
      section: 'Overview',
      items: [
        { label: 'Insights', href: '/analytics', icon: BarChart2 },
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Performance', href: '/performance', icon: Gauge },
      ],
    },
    {
      section: 'Pipelines',
      items: [
        { label: 'Runs', href: '/runs', icon: ListChecks },
        { label: 'Workflows', href: '/workflows', icon: GitBranch },
        { label: 'Dependency Graph', href: '/dependency-graph', icon: Workflow },
      ],
    },
    {
      section: 'AI Crew',
      items: [
        { label: 'Agent Fleet', href: '/ai-crew', icon: Bot },
        { label: 'Remediation', href: '/remediation', icon: Wrench },
        { label: 'Pipeline Chat', href: '/chat', icon: MessageSquare },
      ],
    },
    {
      section: 'Quality',
      items: [
        { label: 'Governance', href: '/governance', icon: ShieldCheck },
        { label: 'Audit', href: '/audit', icon: ShieldAlert },
        { label: 'Standardization', href: '/standardization', icon: Layers },
        { label: 'Optimization', href: '/optimization', icon: Zap },
        { label: 'Knowledge Graph', href: '/knowledge-graph', icon: Network },
      ],
    },
  ]

  settingsItem: NavItem = { label: 'Settings', href: '/settings', icon: Settings }

  constructor(public org: OrgService, public appSvc: ApplicationService, public themeSvc: ThemeService, private api: ApiService) {}

  onOrgChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value
    this.org.setOrg(value)
  }

  onAppChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value
    this.appSvc.setApplication(value)
  }

  async logout() {
    await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' })
    window.location.href = '/'
  }
}
