import { Component, Input, computed, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { LucideAngularModule, Copy, Check, Download, Search } from 'lucide-angular'

const ERROR_RE = /\b(error|err|failed|failure|fatal|exception|traceback)\b/i
const WARN_RE = /\b(warn|warning|deprecated)\b/i

interface LogLine {
  text: string
  n: number
}

@Component({
  selector: 'app-log-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './log-viewer.component.html',
})
export class LogViewerComponent {
  @Input() logs = ''

  icons = { Copy, Check, Download, Search }
  copied = signal(false)
  query = signal('')

  lines(): LogLine[] {
    return this.logs.split('\n').map((text, i) => ({ text, n: i + 1 }))
  }

  filtered(): LogLine[] {
    const q = this.query().trim().toLowerCase()
    if (!q) return this.lines()
    return this.lines().filter((l) => l.text.toLowerCase().includes(q))
  }

  isError(text: string) {
    return ERROR_RE.test(text)
  }

  isWarn(text: string) {
    return !this.isError(text) && WARN_RE.test(text)
  }

  isHeader(text: string) {
    return text.startsWith('=====')
  }

  async copy() {
    await navigator.clipboard.writeText(this.logs)
    this.copied.set(true)
    setTimeout(() => this.copied.set(false), 1500)
  }

  download() {
    const blob = new Blob([this.logs], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'workflow-logs.txt'
    a.click()
    URL.revokeObjectURL(url)
  }
}
