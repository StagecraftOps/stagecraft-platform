import { Component } from '@angular/core'
import { NavigationComponent } from './navigation.component'
import { HeroSectionComponent } from './hero-section.component'
import { FeaturesSectionComponent } from './features-section.component'
import { HowItWorksSectionComponent } from './how-it-works-section.component'
import { RunsPreviewSectionComponent } from './runs-preview-section.component'
import { CtaSectionComponent } from './cta-section.component'
import { FooterSectionComponent } from './footer-section.component'

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    NavigationComponent,
    HeroSectionComponent,
    FeaturesSectionComponent,
    HowItWorksSectionComponent,
    RunsPreviewSectionComponent,
    CtaSectionComponent,
    FooterSectionComponent,
  ],
  templateUrl: './landing.component.html',
})
export class LandingComponent {}
