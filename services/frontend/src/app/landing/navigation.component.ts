import { Component, HostListener, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { LucideAngularModule, Menu, X } from 'lucide-angular'

const navLinks = [
  { name: 'Features', href: '#features' },
  { name: 'How it works', href: '#how-it-works' },
  { name: 'Runs', href: '#runs' },
]

@Component({
  selector: 'app-landing-navigation',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './navigation.component.html',
})
export class NavigationComponent {
  icons = { Menu, X }
  navLinks = navLinks
  isScrolled = signal(false)
  mobileOpen = signal(false)

  @HostListener('window:scroll')
  onScroll() {
    this.isScrolled.set(window.scrollY > 24)
  }

  toggleMobile() {
    this.mobileOpen.set(!this.mobileOpen())
  }

  closeMobile() {
    this.mobileOpen.set(false)
  }
}
