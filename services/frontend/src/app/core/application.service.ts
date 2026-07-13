import { Injectable, computed, signal } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { firstValueFrom } from 'rxjs'
import { API_URL } from './config'
import type { Application } from './types'

const ORG_KEY = 'stagecraft.currentOrg'
const APP_KEY = 'stagecraft.currentApp'

// Holds the currently-selected application and its CRUD. Deliberately depends
// ONLY on HttpClient (not OrgService/ApiService) so ApiService can inject it to
// auto-scope requests without creating a DI cycle. Current org is read from the
// same localStorage key OrgService persists to.
@Injectable({ providedIn: 'root' })
export class ApplicationService {
  applications = signal<Application[]>([])
  private selectedId = signal<string>(
    typeof window !== 'undefined' ? window.localStorage.getItem(APP_KEY) || '' : '',
  )
  isLoading = signal(false)

  // '' means "All applications" (org-wide, no filter).
  currentApplicationId = computed(() => {
    const list = this.applications()
    const sel = this.selectedId()
    return list.some((a) => a.id === sel) ? sel : ''
  })

  currentApplication = computed(() => {
    const id = this.currentApplicationId()
    return this.applications().find((a) => a.id === id) ?? null
  })

  constructor(private http: HttpClient) {
    this.load()
  }

  private currentOrg(): string {
    return typeof window !== 'undefined' ? window.localStorage.getItem(ORG_KEY) || '' : ''
  }

  async load(): Promise<void> {
    const org = this.currentOrg()
    if (!org) {
      this.applications.set([])
      return
    }
    this.isLoading.set(true)
    try {
      const data = await firstValueFrom(
        this.http.get<{ applications: Application[]; total: number }>(
          `${API_URL}/api/v1/orgs/${org}/applications`,
        ),
      )
      this.applications.set(data.applications)
    } catch {
      this.applications.set([])
    } finally {
      this.isLoading.set(false)
    }
  }

  setApplication(id: string): void {
    this.selectedId.set(id)
    if (typeof window !== 'undefined') window.localStorage.setItem(APP_KEY, id)
    // Reload so every page re-fetches under the new scope.
    if (typeof window !== 'undefined') window.location.reload()
  }

  create(name: string, description: string | null, repoNames: string[]): Promise<Application> {
    return firstValueFrom(
      this.http.post<Application>(`${API_URL}/api/v1/orgs/${this.currentOrg()}/applications`, {
        name,
        description,
        repo_names: repoNames,
      }),
    )
  }

  setRepos(applicationId: string, repoNames: string[]): Promise<Application> {
    return firstValueFrom(
      this.http.put<Application>(
        `${API_URL}/api/v1/orgs/${this.currentOrg()}/applications/${applicationId}/repos`,
        { repo_names: repoNames },
      ),
    )
  }

  remove(applicationId: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${API_URL}/api/v1/orgs/${this.currentOrg()}/applications/${applicationId}`),
    )
  }
}
