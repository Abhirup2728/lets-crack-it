'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabase'
import { Goal, GoalTask, dayOfWeek, formatFullDate, todayStr, formatTime12h, allDatesBetween } from '@/lib/goals'

export default function DayDetailPage() {
  const params = useParams<{ id: string; date: string }>()
  const router = useRouter()
  const goalId = params.id
  const date = params.date

  const [goal, setGoal] = useState<Goal | null>(null)
  const [allTasks, setAllTasks] = useState<GoalTask[]>([])
  const [logs, setLogs] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [allTimeAvg, setAllTimeAvg] = useState(0)
  const [loading, setLoading] = useState(true)

  const isFuture = date > todayStr()

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
      setAllTasks(taskData || [])

      if (date <= todayStr()) {
        const { data: dayLogs } = await supabase
          .from('goal_logs')
          .select('*')
          .eq('goal_id', goalId)
          .eq('date', date)
        const map: Record<string, boolean> = {}
        const noteMap: Record<string, string> = {}
        for (const l of dayLogs || []) {
          map[l.task_id] = l.completed
          if (l.note) noteMap[l.task_id] = l.note
        }
        setLogs(map)
        setNotes(noteMap)

        // All-time average: scheduled tasks are the denominator, same as the calendar
        const { data: allLogs } = await supabase
          .from('goal_logs')
          .select('task_id,date,completed')
          .eq('goal_id', goalId)
        const lookup = new Map<string, boolean>()
        for (const l of allLogs || []) lookup.set(`${l.task_id}__${l.date}`, l.completed)

        if (goalData && taskData) {
          const endStr = todayStr() < goalData.end_date ? todayStr() : goalData.end_date
          const pcts: number[] = []
          for (const d of allDatesBetween(goalData.start_date, endStr)) {
            const scheduled = taskData.filter((t: GoalTask) => t.days_of_week.includes(dayOfWeek(d)))
            if (scheduled.length === 0) continue
            const done = scheduled.filter((t: GoalTask) => lookup.get(`${t.id}__${d}`)).length
            pcts.push(done / scheduled.length)
          }
          const avg = pcts.length ? Math.round((pcts.reduce((a, b) => a + b, 0) / pcts.length) * 100) : 0
          setAllTimeAvg(avg)
        }
      }

      setLoading(false)
    }
    load()
  }, [goalId, date, router])

  const dayTasks = useMemo(() => {
    const filtered = allTasks.filter((t) => t.days_of_week.includes(dayOfWeek(date)))
    return [...filtered].sort((a, b) => {
      if (!a.start_time && !b.start_time) return 0
      if (!a.start_time) return 1
      if (!b.start_time) return -1
      return a.start_time.localeCompare(b.start_time)
    })
  }, [allTasks, date])

  const doneCount = dayTasks.filter((t) => logs[t.id]).length
  const completion = dayTasks.length ? Math.round((doneCount / dayTasks.length) * 100) : 0
  const diff = completion - allTimeAvg
  const notesCount = dayTasks.filter((t) => notes[t.id]).length

  const donutData = [
    { name: 'Completed', value: doneCount, color: '#16a34a' },
    { name: 'Missed', value: dayTasks.length - doneCount, color: '#e5e7eb' },
  ]

  if (loading) return <main className="p-8 text-center text-gray-500">Loading...</main>
  if (!goal) return <main className="p-8 text-center text-gray-500">Goal not found.</main>

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-2xl mx-auto p-6">
        <Link href={`/goals/${goalId}/history`} className="text-sm text-indigo-600 mb-4 inline-block hover:underline">
          ← Back to calendar
        </Link>

        <div className="relative overflow-hidden rounded-2xl shadow-lg border border-white/20 bg-gradient-to-br from-indigo-700 via-purple-600 to-orange-500 text-white px-4 py-2.5 mb-4 text-center">
          <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-90">
            {goal.name}
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-none my-1">
            {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}
          </div>
          <div className="mx-auto my-1 h-px w-3/4 bg-white/40" />
          <div className="text-sm sm:text-base font-bold">{formatFullDate(date)}</div>
          <div className="mt-0.5 text-[10px] sm:text-xs opacity-90">
            {dayOfWeek(date) === 0 || dayOfWeek(date) === 6 ? 'Weekend' : 'Weekday'}
            {date === todayStr() ? ' · Today' : isFuture ? ' · Upcoming' : ' · Past day'}
          </div>
        </div>

        {dayTasks.length === 0 ? (
          <p className="text-center text-gray-400 bg-white rounded-xl border border-gray-200 p-6">
            No tasks are scheduled for this day.
          </p>
        ) : isFuture ? (
          <>
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-4 text-center text-sm text-indigo-700">
              This day hasn&apos;t happened yet — here&apos;s what&apos;s scheduled. You can&apos;t check these off until the day arrives.
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-semibold mb-3">Scheduled Tasks ({dayTasks.length})</h3>
              <ul className="space-y-2">
                {dayTasks.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 p-3 rounded-lg border-2"
                    style={{ backgroundColor: `${t.color}10`, borderColor: t.color }}
                  >
                    <span
                      className="w-5 h-5 rounded-full border-2 flex-shrink-0"
                      style={{ borderColor: t.color }}
                    />
                    <span className="font-medium" style={{ color: t.color }}>
                      {t.label}
                      {t.start_time && t.end_time && (
                        <span className="text-xs text-gray-400 ml-2 font-normal">
                          {formatTime12h(t.start_time)}–{formatTime12h(t.end_time)}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={donutData} dataKey="value" innerRadius={45} outerRadius={65} paddingAngle={2}>
                      {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-center -mt-4">
                  <div className="text-2xl font-extrabold">{completion}%</div>
                  <div className="text-xs text-gray-500">Completed</div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex-1 flex flex-col justify-center">
                  <div className="text-xs text-gray-500">Tasks Done</div>
                  <div className="text-2xl font-bold text-green-600">{doneCount} / {dayTasks.length}</div>
                </div>
                <div className={`rounded-2xl shadow-sm border p-4 flex-1 flex flex-col justify-center ${
                  diff >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200'
                }`}>
                  <div className="text-xs text-gray-500">Vs All-Time Avg ({allTimeAvg}%)</div>
                  <div className={`text-2xl font-bold ${diff >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                    {diff >= 0 ? '+' : ''}{diff}%
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold">Task Checklist — This Day</h3>
                <span className="text-xs text-gray-500">
                  {notesCount} {notesCount === 1 ? 'note' : 'notes'}
                </span>
              </div>
              <ul className="space-y-2">
                {dayTasks.map((t) => {
                  const checked = !!logs[t.id]
                  const note = notes[t.id]
                  return (
                    <li
                      key={t.id}
                      className="p-3 rounded-lg border-2"
                      style={{
                        backgroundColor: checked ? `${t.color}15` : '#fafafa',
                        borderColor: t.color,
                      }}
                    >
                      <div className="flex items-center gap-3" style={{ opacity: checked ? 1 : 0.7 }}>
                        <span
                          className="w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ backgroundColor: checked ? '#16a34a' : '#9ca3af' }}
                        >
                          {checked ? '✓' : '✗'}
                        </span>
                        <span className="font-medium" style={{ color: t.color }}>
                          {t.label}
                          {t.start_time && t.end_time && (
                            <span className="text-xs text-gray-400 ml-2 font-normal">
                              {formatTime12h(t.start_time)}–{formatTime12h(t.end_time)}
                            </span>
                          )}
                        </span>
                      </div>
                      {note && (
                        <div className="mt-2 text-xs text-gray-700 bg-sky-50 border border-sky-200 rounded-md px-2 py-1.5 whitespace-pre-line">
                          <span className="font-semibold text-sky-700">Note: </span>
                          {note}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          </>
        )}
      </div>
    </main>
  )
}