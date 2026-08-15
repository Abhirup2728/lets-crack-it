'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { Goal, GoalTask, dayOfWeek, todayStr, toDateStr, allDatesBetween } from '@/lib/goals'

type GoalLog = { task_id: string; date: string; completed: boolean }

export default function DashboardPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const goalId = params.id

  const [goal, setGoal] = useState<Goal | null>(null)
  const [tasks, setTasks] = useState<GoalTask[]>([])
  const [logs, setLogs] = useState<GoalLog[]>([])
  const [loading, setLoading] = useState(true)
  const [aiMessage, setAiMessage] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data: goalData } = await supabase.from('goals').select('*').eq('id', goalId).single()
      setGoal(goalData)

      const { data: taskData } = await supabase.from('goal_tasks').select('*').eq('goal_id', goalId)
      setTasks(taskData || [])

      const { data: logData } = await supabase.from('goal_logs').select('task_id,date,completed').eq('goal_id', goalId)
      setLogs(logData || [])

      setLoading(false)
    }
    load()
  }, [goalId, router])

  const today = todayStr()

  const dailyCompletion = useMemo(() => {
    if (!goal) return [] as { date: string; pct: number }[]
    const start = goal.start_date
    const end = today < goal.end_date ? today : goal.end_date
    if (start > end) return []
    const dates = allDatesBetween(start, end)

    const logMap = new Map<string, boolean>()
    for (const l of logs) logMap.set(`${l.task_id}__${l.date}`, l.completed)

    return dates.map((date) => {
      const scheduled = tasks.filter((t) => t.days_of_week.includes(dayOfWeek(date)))
      if (scheduled.length === 0) return { date, pct: -1 }
      const done = scheduled.filter((t) => logMap.get(`${t.id}__${date}`)).length
      return { date, pct: Math.round((done / scheduled.length) * 100) }
    }).filter((d) => d.pct >= 0)
  }, [goal, tasks, logs, today])

  const stats = useMemo(() => {
    if (dailyCompletion.length === 0) {
      return { avg: 0, last7: 0, last30: 0, currentStreak: 0, longestStreak: 0, perfectDays: 0 }
    }
    const avg = Math.round(dailyCompletion.reduce((s, d) => s + d.pct, 0) / dailyCompletion.length)
    const last7 = dailyCompletion.slice(-7)
    const last7Avg = Math.round(last7.reduce((s, d) => s + d.pct, 0) / last7.length)
    const last30 = dailyCompletion.slice(-30)
    const last30Avg = Math.round(last30.reduce((s, d) => s + d.pct, 0) / last30.length)

    let longest = 0, running = 0
    for (const d of dailyCompletion) {
      if (d.pct === 100) { running += 1; longest = Math.max(longest, running) }
      else running = 0
    }
    let current = 0
    for (let i = dailyCompletion.length - 1; i >= 0; i--) {
      if (dailyCompletion[i].pct === 100) current += 1
      else break
    }
    const perfectDays = dailyCompletion.filter((d) => d.pct === 100).length

    return { avg, last7: last7Avg, last30: last30Avg, currentStreak: current, longestStreak: longest, perfectDays }
  }, [dailyCompletion])

  const weeklyData = useMemo(() => {
    function startOfWeek(dateStr: string) {
      const d = new Date(dateStr + 'T00:00:00')
      const day = d.getDay()
      const diff = day === 0 ? -6 : 1 - day
      d.setDate(d.getDate() + diff)
      return toDateStr(d)
    }
    const weekMap = new Map<string, { total: number; count: number }>()
    for (const d of dailyCompletion) {
      const wk = startOfWeek(d.date)
      const existing = weekMap.get(wk) || { total: 0, count: 0 }
      weekMap.set(wk, { total: existing.total + d.pct, count: existing.count + 1 })
    }
    const weeks = Array.from(weekMap.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([week, v]) => ({ week, avg: Math.round(v.total / v.count) }))
    let cumTotal = 0, cumCount = 0
    return weeks.map((w) => {
      cumTotal += w.avg; cumCount += 1
      return { ...w, cumulative: Math.round(cumTotal / cumCount) }
    })
  }, [dailyCompletion])

  const monthlyData = useMemo(() => {
    const monthMap = new Map<string, { total: number; count: number }>()
    for (const d of dailyCompletion) {
      const month = d.date.slice(0, 7)
      const existing = monthMap.get(month) || { total: 0, count: 0 }
      monthMap.set(month, { total: existing.total + d.pct, count: existing.count + 1 })
    }
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([month, v]) => ({ month, avg: Math.round(v.total / v.count) }))
  }, [dailyCompletion])

  const taskWiseData = useMemo(() => {
    const logMap = new Map<string, boolean>()
    for (const l of logs) logMap.set(`${l.task_id}__${l.date}`, l.completed)

    const start = goal?.start_date || today
    const end = today < (goal?.end_date || today) ? today : (goal?.end_date || today)
    if (!goal || start > end) return []
    const dates = allDatesBetween(start, end)

    return tasks.map((t) => {
      const scheduledDates = dates.filter((d) => t.days_of_week.includes(dayOfWeek(d)))
      const done = scheduledDates.filter((d) => logMap.get(`${t.id}__${d}`)).length
      return {
        label: t.label,
        pct: scheduledDates.length ? Math.round((done / scheduledDates.length) * 100) : 0,
        color: t.color,
        done,
        scheduled: scheduledDates.length,
      }
    })
  }, [tasks, logs, goal, today])

  const pieData = useMemo(
    () => taskWiseData.filter((t) => t.done > 0).map((t) => ({ name: t.label, value: t.done, color: t.color })),
    [taskWiseData]
  )

  const weekdayVsWeekend = useMemo(() => {
    const wd: number[] = [], we: number[] = []
    for (const d of dailyCompletion) {
      const dow = dayOfWeek(d.date)
      if (dow === 0 || dow === 6) we.push(d.pct)
      else wd.push(d.pct)
    }
    const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0)
    return [
      { name: 'Weekday', avg: avg(wd) },
      { name: 'Weekend', avg: avg(we) },
    ]
  }, [dailyCompletion])

  const suggestions = useMemo(() => {
    const tips: { text: string; tone: 'good' | 'warn' | 'info' }[] = []
    if (dailyCompletion.length === 0) return tips

    if (stats.last7 < stats.avg - 10) {
      tips.push({ text: `Your last 7 days (${stats.last7}%) are running behind your overall average (${stats.avg}%). Something's slipping — worth a hard look at this week specifically.`, tone: 'warn' })
    } else if (stats.last7 > stats.avg + 10) {
      tips.push({ text: `Your last 7 days (${stats.last7}%) are well above your overall average (${stats.avg}%) — genuinely strong momentum right now. Keep this exact rhythm going.`, tone: 'good' })
    }

    if (stats.currentStreak === 0 && stats.longestStreak >= 3) {
      tips.push({ text: `You've broken your streak, but you've hit ${stats.longestStreak} perfect days before — that's proof you can do it. One good day today restarts the count.`, tone: 'warn' })
    } else if (stats.currentStreak >= 3) {
      tips.push({ text: `You're on a ${stats.currentStreak}-day streak. Protect it today — streaks compound motivation far more than any single perfect day does.`, tone: 'good' })
    }

    const scored = taskWiseData.filter((t) => t.scheduled >= 3)
    if (scored.length > 0) {
      const weakest = [...scored].sort((a, b) => a.pct - b.pct)[0]
      const strongest = [...scored].sort((a, b) => b.pct - a.pct)[0]
      if (weakest.pct < 50) {
        tips.push({ text: `"${weakest.label}" is your weakest link at ${weakest.pct}% completion. This is the single highest-leverage thing to fix — everything else is doing fine by comparison.`, tone: 'warn' })
      }
      if (strongest.pct >= 90 && strongest.label !== weakest.label) {
        tips.push({ text: `"${strongest.label}" is rock solid at ${strongest.pct}% — whatever routine or trigger makes that one stick, try applying it to your weaker tasks.`, tone: 'good' })
      }
    }

    const wd = weekdayVsWeekend.find((w) => w.name === 'Weekday')?.avg ?? 0
    const we = weekdayVsWeekend.find((w) => w.name === 'Weekend')?.avg ?? 0
    if (Math.abs(wd - we) >= 20) {
      const weaker = wd < we ? 'weekdays' : 'weekends'
      tips.push({ text: `There's a real gap between your weekday (${wd}%) and weekend (${we}%) performance — ${weaker} are where you're losing the most ground. Worth asking why, specifically.`, tone: 'info' })
    }

    if (dailyCompletion.length >= 10) {
      const perfectRatio = Math.round((stats.perfectDays / dailyCompletion.length) * 100)
      if (perfectRatio < 20) {
        tips.push({ text: `Only ${perfectRatio}% of your days have been fully complete. Aim for "good enough" consistently rather than "perfect" occasionally — it compounds better.`, tone: 'info' })
      }
    }

    if (tips.length === 0) {
      tips.push({ text: `Not enough data yet for tailored suggestions — keep logging daily and this will get sharper.`, tone: 'info' })
    }

    return tips
  }, [dailyCompletion, stats, taskWiseData, weekdayVsWeekend])

  async function getAiCoaching() {
    setAiLoading(true)
    setAiError('')
    setAiMessage('')

    try {
      const recentDays = dailyCompletion.slice(-10)
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalName: goal?.name,
          endDate: goal?.end_date,
          stats,
          taskWiseData: taskWiseData.map((t) => ({ label: t.label, pct: t.pct })),
          weekdayVsWeekend: {
            weekday: weekdayVsWeekend.find((w) => w.name === 'Weekday')?.avg ?? 0,
            weekend: weekdayVsWeekend.find((w) => w.name === 'Weekend')?.avg ?? 0,
          },
          recentDays,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAiError(data.error || 'Something went wrong.')
      } else {
        setAiMessage(data.message)
      }
    } catch (err) {
      console.error(err)
      setAiError('Could not reach the AI coach right now.')
    } finally {
      setAiLoading(false)
    }
  }

  if (loading) return <main className="p-8 text-center text-gray-500">Loading...</main>
  if (!goal) return <main className="p-8 text-center text-gray-500">Goal not found.</main>

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        <div>
          <Link href="/goals" className="text-sm text-indigo-600 hover:underline">← All goals</Link>
        </div>

        <h1 className="text-center text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          {goal.name}
        </h1>

        <div className="flex justify-center gap-1 bg-white/70 backdrop-blur rounded-full p-1 shadow-sm border border-gray-200 w-fit mx-auto">
          <Link href={`/goals/${goalId}/today`} className="px-5 py-2 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100">Today</Link>
          <Link href={`/goals/${goalId}/history`} className="px-5 py-2 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100">History</Link>
          <Link href={`/goals/${goalId}/dashboard`} className="px-5 py-2 rounded-full text-sm font-medium bg-indigo-600 text-white shadow">Dashboard</Link>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold">Progress Dashboard</h2>
          <p className="text-sm text-gray-500">Everything below updates automatically as you check things off.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="Avg Completion" value={`${stats.avg}%`} color="from-indigo-500 to-indigo-600" />
          <StatCard label="Last 7-Day Avg" value={`${stats.last7}%`} color="from-purple-500 to-purple-600" />
          <StatCard label="Last 30-Day Avg" value={`${stats.last30}%`} color="from-fuchsia-500 to-fuchsia-600" />
          <StatCard label="Current Streak" value={`${stats.currentStreak} days`} color="from-emerald-500 to-emerald-600" />
          <StatCard label="Longest Streak" value={`${stats.longestStreak} days`} color="from-teal-500 to-teal-600" />
          <StatCard label="Perfect Days" value={`${stats.perfectDays}`} color="from-amber-500 to-amber-600" />
        </div>

        <ChartCard title="Weekly Avg vs Overall Growth Trend">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} unit="%" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avg" name="Weekly Avg %" stroke="#16a34a" strokeWidth={2} />
              <Line type="monotone" dataKey="cumulative" name="Cumulative Avg %" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly Tracker">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} unit="%" />
              <Tooltip />
              <Bar dataKey="avg" name="Avg Completion %" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Task-wise Completion (whole plan so far)">
          {taskWiseData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No tasks in this routine yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, taskWiseData.length * 40)}>
              <BarChart data={taskWiseData} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} unit="%" />
                <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="pct" name="Completion %" radius={[0, 4, 4, 0]}>
                  {taskWiseData.map((t, i) => <Cell key={i} fill={t.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <div className="grid md:grid-cols-2 gap-6">
          <ChartCard title="Weekday vs Weekend">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={weekdayVsWeekend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} unit="%" />
                <Tooltip />
                <Bar dataKey="avg" name="Avg Completion %" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Effort Distribution (All-Time)">
            {pieData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-16">Log a few days to see this chart fill in.</p>
            ) : (
              <ResponsiveContainer width="100%" height={340}>
                <PieChart margin={{ top: 10, bottom: 10 }}>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="42%"
                    outerRadius={75}
                  >
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ fontSize: 11, lineHeight: '18px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <section className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-sm border border-indigo-100 p-5">
          <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
            💡 Your Coach&apos;s Suggestions
          </h3>
          <p className="text-xs text-gray-500 mb-4">Based on your actual logged data — updates automatically as you track more days.</p>
          <ul className="space-y-3">
            {suggestions.map((s, i) => (
              <li
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
                  s.tone === 'good' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                  s.tone === 'warn' ? 'bg-orange-50 text-orange-800 border border-orange-200' :
                  'bg-white text-gray-700 border border-gray-200'
                }`}
              >
                <span className="text-lg leading-none">
                  {s.tone === 'good' ? '✅' : s.tone === 'warn' ? '⚠️' : 'ℹ️'}
                </span>
                <span>{s.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl shadow-sm p-5 text-white">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              🤖 AI Career Coach
            </h3>
            <button
              onClick={getAiCoaching}
              disabled={aiLoading || dailyCompletion.length === 0}
              className="bg-white/20 hover:bg-white/30 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-full transition"
            >
              {aiLoading ? 'Thinking...' : aiMessage ? 'Regenerate' : 'Get Personalized Advice'}
            </button>
          </div>
          <p className="text-xs text-white/70 mb-4">
            Powered by AI, reading your real tracked data for {goal.name}.
          </p>

          {dailyCompletion.length === 0 && (
            <p className="text-sm text-white/80 bg-white/10 rounded-lg p-3">
              Log a few days first — the coach needs real data to give you something useful.
            </p>
          )}

          {aiError && (
            <p className="text-sm text-red-100 bg-red-500/30 rounded-lg p-3">{aiError}</p>
          )}

          {aiMessage && (
            <div className="bg-white/10 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-line">
              {aiMessage}
            </div>
          )}

          {!aiMessage && !aiError && !aiLoading && dailyCompletion.length > 0 && (
            <p className="text-sm text-white/70">
              Click &quot;Get Personalized Advice&quot; for a custom coaching message based on your actual progress.
            </p>
          )}
        </section>
      </div>
    </main>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`rounded-xl p-4 text-white shadow-sm bg-gradient-to-br ${color}`}>
      <div className="text-xs opacity-90">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      {children}
    </section>
  )
}