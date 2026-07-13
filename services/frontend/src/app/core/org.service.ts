import { Injectable, signal, computed, effect } from '@angular/core'
import { ApiService } from './api.service'
import type { Organization } from './types'

const STORAGE_KEY = 'stagecraft.currentOrg'

@Injectable({ providedIn: 'root' })
export class OrgService {
  private orgsSignal = signal<Organization[]>([])
  private selected = signal<string>(typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) || '' : '')
  isLoading = signal(true)

  orgs = computed(() => this.orgsSignal())
  currentOrg = computed(() => {
    const list = this.orgsSignal()
    const sel = this.selected()
    return list.some((o) => o.login === sel) ? sel : list[0]?.login || ''
  })

  constructor(private api: ApiService) {
    this.load()
  }

  private async load() {
    try {
      const orgs = await this.api.fetchOrgs()
      this.orgsSignal.set(orgs)
      if (orgs.length > 0 && !orgs.some((o) => o.login === this.selected())) {
        this.setOrg(orgs[0].login)
      }
    } finally {
      this.isLoading.set(false)
    }
  }

  setOrg(login: string) {
    this.selected.set(login)
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, login)
  }

  async refresh() {
    await this.load()
  }
}
