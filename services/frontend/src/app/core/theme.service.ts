import { Injectable, signal } from '@angular/core'

@Injectable({ providedIn: 'root' })
export class ThemeService {
  theme = signal<'light' | 'dark'>('light')

  constructor() {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('theme') : null
    const initial = stored === 'dark' ? 'dark' : 'light'
    this.apply(initial)
  }

  toggle() {
    this.apply(this.theme() === 'dark' ? 'light' : 'dark')
  }

  private apply(next: 'light' | 'dark') {
    this.theme.set(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('theme', next)
      document.documentElement.classList.toggle('dark', next === 'dark')
    }
  }
}
