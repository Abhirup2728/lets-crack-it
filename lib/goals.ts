export type Goal = {
  id: string
  user_id: string
  name: string
  start_date: string
  end_date: string
  created_at?: string
}

export type GoalTask = {
  id: string
  goal_id: string
  label: string
  start_time: string | null
  end_time: string | null
  days_of_week: number[]
  color: string
  sort_order: number
}

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const TASK_COLORS = [
  '#2563eb', '#d97706', '#7c3aed', '#0d9488',
  '#db2777', '#059669', '#dc2626', '#4f46e5',
]
export function todayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function dayOfWeek(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').getDay()
}

export function formatFullDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDate()
  const month = d.toLocaleString('en-US', { month: 'long' })
  const year = d.getFullYear()
  const suffix = (n: number) => {
    if (n >= 11 && n <= 13) return 'th'
    switch (n % 10) {
      case 1: return 'st'
      case 2: return 'nd'
      case 3: return 'rd'
      default: return 'th'
    }
  }
  return `${day}${suffix(day)} ${month} ${year}`
}
export function toDateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function allDatesBetween(start: string, end: string): string[] {
  const dates: string[] = []
  const d = new Date(start + 'T00:00:00')
  const endD = new Date(end + 'T00:00:00')
  while (d <= endD) {
    dates.push(toDateStr(d))
    d.setDate(d.getDate() + 1)
  }
  return dates
}
export function formatTime12h(time: string | null) {
  if (!time) return ''
  const [hStr, mStr] = time.split(':')
  let h = parseInt(hStr, 10)
  const period = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${mStr} ${period}`
}
export function daysRemaining(todayDateStr: string, targetDateStr: string) {
  const today = new Date(todayDateStr + 'T00:00:00')
  const target = new Date(targetDateStr + 'T00:00:00')
  const diffMs = target.getTime() - today.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}