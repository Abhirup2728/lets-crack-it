'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Goal, GoalTask, todayStr, dayOfWeek } from '@/lib/goals'

const MONTH_PALETTE = [
  { bg: 'bg-rose-50', header: 'text-rose-700' },
  { bg: 'bg-sky-50', header: 'text-sky-700' },
  { bg: 'bg-amber-50', header: 'text-amber-700' },
  { bg: 'bg-emerald-50', header: 'text-emerald-700' },
  { bg: 'bg-violet-50', header: 'text-violet-700' },
  { bg: 'bg-cyan-50', header: 'text-cyan-700' },
]

function monthLabel(y: number, m: number) {
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
}
function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate()
}

const GREEN_SHADES = [
  { bg: '#f0fdf4', text: '#166534' }, // 1–10%
  { bg: '#dcfce7', text: '#166534' }, // 11–20%
  { bg: '#bbf7d0', text: '#166534' }, // 21–30%
  { bg: '#86efac', text: '#14532d' }, // 31–40%
  { bg: '#4ade80', text: '#14532d' }, // 41–50%
  { bg: '#22c55e', text: '#ffffff' }, // 51–60%
  { bg: '#16a34a', text: '#ffffff' }, // 61–70%
  { bg: '#15803d', text: '#ffffff' }, // 71–80%
  { bg: '#166534', text: '#ffffff' }, // 81–90%
  { bg: '#14532d', text: '#ffffff' }, // 91–100%
]

function heatColor(pct: number): { backgroundColor: string; color: string } {
  if (pct === 0) return { backgroundColor: '#dc2626', color: '#ffffff' }
  const bucket = Math.min(9, Math.ceil(pct / 10) - 1)
  const shade = GREEN_SHADES[bucket]
  return { backgroundColor: shade.bg, color: shade.text }
}

export default function HistoryPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const goalId = params.id
  const today = todayStr()

  const [goal, setGoal] = useState<Goal | null>(null)
  const [tasks, setTasks] = useState<GoalTask[]>([])
  const [completionMap, setCompletionMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: goalData } = await supabase.from('goals').select('*').eq('id', goalId).single()
      setGoal(goalData)

      const { data: taskData } = await supabase
        .from('goal_tasks')
        .select('*')
        .eq('goal_id', goalId)
      setTasks(taskData || [])

      const { data: logData } = await supabase
        .from('goal_logs')
        .select('*')
        .eq('goal_id', goalId)

      const byDate: Record<string, { done: number; total: number }> = {}
      for (const l of logData || []) {
        if (!byDate[l.date]) byDate[l.date] = { done: 0, total: 0 }
        byDate[l.date].total += 1
        if (l.completed) byDate[l.date].done += 1
      }
      const map: Record<string, number> = {}
      for (const [d, v] of Object.entries(byDate)) {
        map[d] = v.total ? Math.round((v.done / v.total) * 100) : 0
      }
      setCompletionMap(map)
      setLoading(false)
    }
    load()
  }, [goalId, router])

  const months = useMemo(() => {
    if (!goal) return []
    const start = new Date(goal.start_date + 'T00:00:00')
    const end = new Date(goal.end_date + 'T00:00:00')
    const list: string[] = []
    const cur = new Date(start.getFullYear(), start.getMonth(), 1)
    while (cur <= end) {
      list.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`)
      cur.setMonth(cur.getMonth() + 1)
    }
    return list
  }, [goal])

  if (loading) return <main className="p-8 text-center text-gray-500">Loading...</main>
  if (!goal) return <main className="p-8 text-center text-gray-500">Goal not found.</main>

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div>
          <Link href="/goals" className="text-sm text-indigo-600 hover:underline">← All goals</Link>
        </div>

        <h1 className="text-center text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          {goal.name}
        </h1>

        <div className="flex justify-center gap-1 bg-white/70 backdrop-blur rounded-full p-1 shadow-sm border border-gray-200 w-fit mx-auto">
          <Link href={`/goals/${goalId}/today`} className="px-5 py-2 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100">Today</Link>
          <Link href={`/goals/${goalId}/history`} className="px-5 py-2 rounded-full text-sm font-medium bg-indigo-600 text-white shadow">History</Link>
          <Link href={`/goals/${goalId}/dashboard`} className="px-5 py-2 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100">Dashboard</Link>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold">Your {goal.name} Calendar</h2>
          <p className="text-sm text-gray-500">{goal.start_date} – {goal.end_date} · click a past or today&apos;s date</p>
        </div>

        {tasks.length === 0 && (
          <p className="text-center text-gray-400 text-sm">No routine set up yet for this goal.</p>
        )}

        {months.map((ym, idx) => {
          const [y, m] = ym.split('-').map(Number)
          const palette = MONTH_PALETTE[idx % MONTH_PALETTE.length]
          const totalDays = daysInMonth(y, m)
          const firstWeekday = new Date(y, m - 1, 1).getDay()
          const cells: (string | null)[] = Array(firstWeekday).fill(null)
          for (let d = 1; d <= totalDays; d++) {
            const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
            if (dateStr >= goal.start_date && dateStr <= goal.end_date) cells.push(dateStr)
            else cells.push(null)
          }

          return (
            <section key={ym} className={`${palette.bg} rounded-2xl p-5 shadow-sm border border-gray-200`}>
              <h3 className={`font-bold text-lg mb-3 ${palette.header}`}>{monthLabel(y, m)}</h3>
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-gray-500 mb-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {cells.map((dateStr, i) => {
                  if (!dateStr) return <div key={i} />
                  const isFuture = dateStr > today
                  const hasTasksThatDay = tasks.some((t) => t.days_of_week.includes(dayOfWeek(dateStr)))
                  const pct = completionMap[dateStr]
                  const dayNum = Number(dateStr.slice(-2))

                  if (isFuture) {
                    return (
                      <Link
                        key={dateStr}
                        href={`/goals/${goalId}/history/${dateStr}`}
                        className="aspect-square flex items-center justify-center rounded-lg bg-gray-100 text-gray-400 text-sm hover:bg-gray-200 hover:text-gray-600 transition"
                      >
                        {dayNum}
                      </Link>
                    )
                  }

                  if (!hasTasksThatDay) {
                    return (
                      <div key={dateStr} className="aspect-square flex items-center justify-center rounded-lg bg-white text-gray-300 text-sm border border-gray-100">
                        {dayNum}
                      </div>
                    )
                  }

                  const effectivePct = pct ?? 0 // no completions logged that day = 0%, not "unknown"
                  const heat = heatColor(effectivePct)

                  return (
                    <Link
                      key={dateStr}
                      href={`/goals/${goalId}/history/${dateStr}`}
                      className="aspect-square flex items-center justify-center rounded-lg text-sm font-semibold hover:scale-105 transition"
                      style={heat}
                    >
                      {dayNum}
                    </Link>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}