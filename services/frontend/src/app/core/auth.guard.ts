import { inject } from '@angular/core'
import { Router } from '@angular/router'
import { ApiService } from './api.service'

export const authGuard = async () => {
  const api = inject(ApiService)
  const router = inject(Router)
  try {
    await api.fetchCurrentUser()
    return true
  } catch {
    return router.parseUrl('/')
  }
}
