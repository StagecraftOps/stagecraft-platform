import { Component } from '@angular/core'

@Component({
  selector: 'app-footer-section',
  standalone: true,
  templateUrl: './footer-section.component.html',
})
export class FooterSectionComponent {
  year = new Date().getFullYear()
}
