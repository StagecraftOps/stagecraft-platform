import { formatDistanceToNow, parseISO, differenceInSeconds } from 'date-fns'

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}

export interface YamlDiffLine {
  text: string
  kind: 'unchanged' | 'added'
}

export function diffYamlLines(original: string | null | undefined, suggested: string): YamlDiffLine[] {
  const a = (original ?? '').split('\n')
  const b = suggested.split('\n')

  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }

  const result: YamlDiffLine[] = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      result.push({ text: b[j], kind: 'unchanged' })
      i++
      j++
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      i++
    } else {
      result.push({ text: b[j], kind: 'added' })
      j++
    }
  }
  while (j < b.length) {
    result.push({ text: b[j], kind: 'added' })
    j++
  }
  return result
}

export function calculateDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return 'Running...'
  const start = parseISO(startedAt)
  const end = parseISO(completedAt)
  const seconds = differenceInSeconds(end, start)
  return formatDuration(seconds)
}

export function formatRelativeTime(date: string): string {
  try {
    return formatDistanceToNow(parseISO(date), { addSuffix: true })
  } catch {
    return date
  }
}

export function truncate(str: string, n: number): string {
  if (!str) return ''
  return str.length > n ? str.slice(0, n) + '...' : str
}

export function formatSha(sha: string): string {
  return sha.slice(0, 7)
}

export function formatDate(date: string): string {
  try {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return date
  }
}

export function getStatusColor(status: string, conclusion: string | null): string {
  if (status === 'in_progress' || status === 'queued' || status === 'waiting') {
    return status === 'queued' ? 'zinc' : 'amber'
  }
  if (status === 'completed') {
    switch (conclusion) {
      case 'success':
        return 'emerald'
      case 'failure':
      case 'timed_out':
        return 'rose'
      case 'cancelled':
        return 'zinc'
      case 'skipped':
        return 'zinc'
      default:
        return 'zinc'
    }
  }
  return 'zinc'
}
