import { Component, ElementRef, ViewChild, AfterViewChecked, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { LucideAngularModule, Bot, Send, Loader2, Terminal, ChevronDown, ChevronUp } from 'lucide-angular'
import { ApiService } from '../core/api.service'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sql?: string | null
  data?: Record<string, unknown>[] | null
  error?: string | null
  loading?: boolean
}

const SUGGESTIONS = [
  'Which repository has the most failures?',
  'How many workflow runs failed in the last 7 days?',
  'What dependency-version issues have we seen and how were they fixed?',
  'Why do the listing-service CI runs keep failing?',
  'Summarize the most common failure categories across our pipelines.',
]

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './chat.component.html',
})
export class ChatComponent implements AfterViewChecked {
  icons = { Bot, Send, Loader2, Terminal, ChevronDown, ChevronUp }
  suggestions = SUGGESTIONS

  messages = signal<ChatMessage[]>([])
  input = signal('')
  loading = signal(false)
  openSqlIds = signal<Set<string>>(new Set())

  @ViewChild('bottomAnchor') bottomAnchor?: ElementRef<HTMLDivElement>
  private shouldScroll = false

  constructor(private api: ApiService) {}

  get showWelcome() {
    return this.messages().length === 0
  }

  toggleSql(id: string) {
    const next = new Set(this.openSqlIds())
    if (next.has(id)) next.delete(id)
    else next.add(id)
    this.openSqlIds.set(next)
  }

  async send(text: string) {
    if (!text.trim() || this.loading()) return
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text }
    const loadingMsg: ChatMessage = { id: Date.now().toString() + '-loading', role: 'assistant', content: '', loading: true }
    this.messages.set([...this.messages(), userMsg, loadingMsg])
    this.input.set('')
    this.loading.set(true)
    this.shouldScroll = true

    try {
      const data = await this.api.sendChatMessage(text)
      this.messages.set(
        this.messages().map((m) =>
          m.loading ? { ...m, loading: false, content: data.answer, sql: data.sql, data: data.data, error: data.error } : m,
        ),
      )
    } catch {
      this.messages.set(
        this.messages().map((m) =>
          m.loading ? { ...m, loading: false, content: 'Something went wrong. Please try again.', error: 'API error' } : m,
        ),
      )
    } finally {
      this.loading.set(false)
      this.shouldScroll = true
    }
  }

  dataColumns(data: Record<string, unknown>[]): string[] {
    return data.length ? Object.keys(data[0]) : []
  }

  ngAfterViewChecked() {
    if (this.shouldScroll && this.bottomAnchor) {
      this.bottomAnchor.nativeElement.scrollIntoView({ behavior: 'smooth' })
      this.shouldScroll = false
    }
  }
}
