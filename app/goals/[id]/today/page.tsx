'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Goal, GoalTask, todayStr, dayOfWeek, formatFullDate, formatTime12h, daysRemaining } from '@/lib/goals'
import { quoteForDate } from '@/lib/quotes'
import DayCountdown from '@/components/DayCountdown'

type LogMap = Record<string, boolean>

export default function TodayPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const goalId = params.id
  const date = todayStr()

  const [goal, setGoal] = useState<Goal | null>(null)
  const [allTasks, setAllTasks] = useState<GoalTask[]>([])
  const [logs, setLogs] = useState<LogMap>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    function updateClock() {
      const now = new Date()
      const h = String(now.getHours()).padStart(2, '0')
      const m = String(now.getMinutes()).padStart(2, '0')
      setCurrentTime(`${h}:${m}`)
    }
    updateClock()
    const interval = setInterval(updateClock, 30000) // refresh every 30s
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: goalData, error: goalErr } = await supabase
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .single()
      if (goalErr) console.error(goalErr)
      setGoal(goalData)

      const { data: taskData, error: taskErr } = await supabase
        .from('goal_tasks')
        .select('*')
        .eq('goal_id', goalId)
        .order('sort_order', { ascending: true })
      if (taskErr) console.error(taskErr)
      setAllTasks(taskData || [])

      const { data: logData, error: logErr } = await supabase
        .from('goal_logs')
        .select('*')
        .eq('goal_id', goalId)
        .eq('date', date)
      if (logErr) console.error(logErr)

      const map: LogMap = {}
      for (const l of logData || []) {
        map[l.task_id] = l.completed
      }
      setLogs(map)
      setLoading(false)
    }
    load()
  }, [goalId, date, router])

  const todayTasks = [...allTasks]
    .filter((t) => t.days_of_week.includes(dayOfWeek(date)))
    .sort((a, b) => {
      if (!a.start_time && !b.start_time) return 0
      if (!a.start_time) return 1
      if (!b.start_time) return -1
      return a.start_time.localeCompare(b.start_time)
    })

  function isHappeningNow(task: GoalTask) {
    if (!task.start_time || !task.end_time || !currentTime) return false
    return currentTime >= task.start_time && currentTime <= task.end_time
  }

  async function toggle(taskId: string) {
    const newValue = !logs[taskId]
    setLogs((prev) => ({ ...prev, [taskId]: newValue }))
    setSaving(true)

    const { error } = await supabase
      .from('goal_logs')
      .upsert(
        { goal_id: goalId, task_id: taskId, date, completed: newValue },
        { onConflict: 'task_id,date' }
      )

    if (error) console.error(error)
    setSaving(false)
  }

  if (loading) return <main className="p-8 text-center text-gray-500">Loading...</main>
  if (!goal) return <main className="p-8 text-center text-gray-500">Goal not found.</main>

  const doneCount = todayTasks.filter((t) => logs[t.id]).length
  const completion = todayTasks.length ? Math.round((doneCount / todayTasks.length) * 100) : 0

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-xl mx-auto p-6">
        <div className="mb-4">
          <Link href="/goals" className="text-sm text-indigo-600 hover:underline">
            ← All goals
          </Link>
        </div>

        <h1 className="text-center text-3xl md:text-4xl font-extrabold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          {goal.name}
        </h1>

        <div className="flex justify-center gap-1 bg-white/70 backdrop-blur rounded-full p-1 shadow-sm border border-gray-200 mb-6 w-fit mx-auto">
          <Link href={`/goals/${goalId}/today`} className="px-5 py-2 rounded-full text-sm font-medium bg-indigo-600 text-white shadow">
            Today
          </Link>
          <Link href={`/goals/${goalId}/history`} className="px-5 py-2 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100">
            History
          </Link>
          <Link href={`/goals/${goalId}/dashboard`} className="px-5 py-2 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100">
            Dashboard
          </Link>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold">{formatFullDate(date)}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {dayOfWeek(date) === 0 || dayOfWeek(date) === 6 ? 'Weekend' : 'Weekday'} · {saving ? 'Saving...' : 'All changes saved'}
          </p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-sm p-4 text-center text-white">
            <div className="text-xs uppercase tracking-wide opacity-80">Days to {goal.name}</div>
            <div className="text-4xl font-extrabold mt-1">{daysRemaining(date, goal.end_date)}</div>
            <div className="text-xs opacity-80 mt-1">{formatFullDate(goal.end_date)}</div>
          </div>
          <DayCountdown />
        </div>

        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <p className="text-sm italic text-gray-600">&ldquo;{quoteForDate(date)}&rdquo;</p>
        </div>

        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex justify-between text-sm mb-2 font-medium">
            <span>Today&apos;s Completion</span>
            <span>{completion}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-emerald-400 to-green-600 h-3 rounded-full transition-all"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>

        {todayTasks.length === 0 ? (
          <div className="text-center bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-gray-500 text-sm mb-3">No tasks scheduled for today in this routine.</p>
            <Link href={`/goals/${goalId}/setup`} className="text-indigo-600 text-sm font-medium hover:underline">
              Edit routine →
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {todayTasks.map((t) => {
              const checked = !!logs[t.id]
              const active = isHappeningNow(t)
              return (
                <li key={t.id} className="relative">
                  {active && (
                    <div className="absolute -left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                    </div>
                  )}
                  <label
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                      active ? 'ring-2 ring-green-400 ring-offset-2 shadow-md scale-[1.02]' : ''
                    }`}
                    style={{
                      backgroundColor: checked ? `${t.color}15` : active ? `${t.color}20` : '#fafafa',
                      borderColor: t.color,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(t.id)}
                      className="w-5 h-5"
                      style={{ accentColor: t.color }}
                    />
                    <span className="font-medium flex-1" style={{ color: t.color }}>
                      {t.label}
                      {t.start_time && t.end_time && (
                        <span className="text-xs text-gray-400 ml-2 font-normal">
                          {formatTime12h(t.start_time)}–{formatTime12h(t.end_time)}
                        </span>
                      )}
                    </span>
                    {active && (
                      <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full whitespace-nowrap">
                        ● NOW
                      </span>
                    )}
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </main>
  )
}