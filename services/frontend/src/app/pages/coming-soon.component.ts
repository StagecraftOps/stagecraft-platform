import { Component, Input } from '@angular/core'
import { CommonModule } from '@angular/common'
import { PageHeaderComponent } from '../shared/page-header.component'

@Component({
  selector: 'app-coming-soon',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent],
  template: `
    <div class="p-8">
      <app-page-header [title]="pageTitle" description="Not migrated to Angular yet in this pass."></app-page-header>
      <div class="bg-white border border-zinc-200 rounded-lg shadow-sm p-10 text-center text-zinc-400 text-sm">
        This page still lives in the Next.js app.
      </div>
    </div>
  `,
})
export class ComingSoonComponent {
  @Input() pageTitle = ''
}
