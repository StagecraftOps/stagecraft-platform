import { Component, OnInit, signal } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { SidebarComponent } from './sidebar.component'
import { ApiService } from '../core/api.service'
import type { User } from '../core/types'

@Component({
  selector: 'app-dashboard-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  template: `
    <div class="app-shell flex h-screen bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      <app-sidebar [user]="user()"></app-sidebar>
      <main class="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
})
export class DashboardShellComponent implements OnInit {
  user = signal<User | null>(null)

  constructor(private api: ApiService) {}

  async ngOnInit() {
    try {
      this.user.set(await this.api.fetchCurrentUser())
    } catch {
      this.user.set(null)
    }
  }
}
