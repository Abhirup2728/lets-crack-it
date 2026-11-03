'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Goal, GoalTask, formatFullDate, formatTime12h } from '@/lib/goals'

type NoteRow = { task_id: string; date: string; completed: boolean | null; note: string }

function monthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

export default function NotesPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const goalId = params.id

  const [goal, setGoal] = useState<Goal | null>(null)
  const [tasks, setTasks] = useState<GoalTask[]>([])
  const [rows, setRows] = useState<NoteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState('all')
  const [groupBy, setGroupBy] = useState<'task' | 'date'>('task')

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

      const { data: logData, error } = await supabase
        .from('goal_logs')
        .select('task_id,date,completed,note')
        .eq('goal_id', goalId)
        .not('note', 'is', null)
        .order('date', { ascending: false })
      if (error) console.error(error)
      setRows((logData || []).filter((r) => r.note && r.note.trim() !== '') as NoteRow[])
      setLoading(false)
    }
    load()
  }, [goalId, router])

  const taskById = useMemo(() => {
    const map = new Map<string, GoalTask>()
    for (const t of tasks) map.set(t.id, t)
    return map
  }, [tasks])

  const months = useMemo(
    () => Array.from(new Set(rows.map((r) => r.date.slice(0, 7)))).sort().reverse(),
    [rows]
  )

  const filtered = useMemo(
    () => (month === 'all' ? rows : rows.filter((r) => r.date.startsWith(month))),
    [rows, month]
  )

  const byTask = useMemo(() => {
    const groups = new Map<string, NoteRow[]>()
    for (const r of filtered) {
      if (!taskById.has(r.task_id)) continue
      groups.set(r.task_id, [...(groups.get(r.task_id) || []), r])
    }
    return Array.from(groups.entries()).sort(([a], [b]) =>
      (taskById.get(a)?.label || '').localeCompare(taskById.get(b)?.label || '')
    )
  }, [filtered, taskById])

  const byDate = useMemo(() => {
    const groups = new Map<string, NoteRow[]>()
    for (const r of filtered) {
      if (!taskById.has(r.task_id)) continue
      groups.set(r.date, [...(groups.get(r.date) || []), r])
    }
    return Array.from(groups.entries()).sort(([a], [b]) => (a < b ? 1 : -1))
  }, [filtered, taskById])

  if (loading) return <main className="p-8 text-center text-gray-500">Loading...</main>
  if (!goal) return <main className="p-8 text-center text-gray-500">Goal not found.</main>

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-medium border transition ${
      active
        ? 'bg-indigo-600 border-indigo-600 text-white'
        : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
    }`

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <Link href="/goals" className="text-sm text-indigo-600 hover:underline">← All goals</Link>
        </div>

        <div className="flex items-center justify-center gap-3">
          <img src="/logo.png" alt="Let's Crack It logo" className="w-9 h-9 md:w-11 md:h-11" />
          <h1 className="text-center text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {goal.name}
          </h1>
        </div>

        <div className="flex justify-center gap-1 bg-white/70 backdrop-blur rounded-full p-1 shadow-sm border border-gray-200 w-fit mx-auto">
          <Link href={`/goals/${goalId}/today`} className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100">Today</Link>
          <Link href={`/goals/${goalId}/history`} className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100">History</Link>
          <Link href={`/goals/${goalId}/dashboard`} className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-100">Dashboard</Link>
          <Link href={`/goals/${goalId}/notes`} className="px-4 py-2 rounded-full text-sm font-medium bg-indigo-600 text-white shadow">Notes</Link>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold">All Your Notes</h2>
          <p className="text-sm text-gray-500">
            {filtered.length} {filtered.length === 1 ? 'note' : 'notes'}
            {month !== 'all' ? ` in ${monthLabel(month)}` : ' so far'}
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="text-center bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500">
              No notes yet. Use the <span className="font-semibold">+ Add Note</span> button on any task in the Today tab.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 justify-center">
                <button className={chip(groupBy === 'task')} onClick={() => setGroupBy('task')}>Group by task</button>
                <button className={chip(groupBy === 'date')} onClick={() => setGroupBy('date')}>Group by date</button>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                <button className={chip(month === 'all')} onClick={() => setMonth('all')}>All months</button>
                {months.map((m) => (
                  <button key={m} className={chip(month === m)} onClick={() => setMonth(m)}>
                    {monthLabel(m)}
                  </button>
                ))}
              </div>
            </div>

            {groupBy === 'task' &&
              byTask.map(([taskId, list]) => {
                const t = taskById.get(taskId)!
                return (
                  <section key={taskId} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                    <h3 className="font-semibold mb-3" style={{ color: t.color }}>
                      {t.label}
                      {t.start_time && t.end_time && (
                        <span className="text-xs text-gray-400 ml-2 font-normal">
                          {formatTime12h(t.start_time)}–{formatTime12h(t.end_time)}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 ml-2 font-normal">· {list.length}</span>
                    </h3>
                    <ul className="space-y-2">
                      {list.map((r) => (
                        <li key={r.date} className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <Link
                              href={`/goals/${goalId}/history/${r.date}`}
                              className="text-xs font-semibold text-sky-700 hover:underline"
                            >
                              {formatFullDate(r.date)}
                            </Link>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              r.completed ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {r.completed ? 'Done' : 'Not done'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-line">{r.note}</p>
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              })}

            {groupBy === 'date' &&
              byDate.map(([d, list]) => (
                <section key={d} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                  <h3 className="font-semibold mb-3">
                    <Link href={`/goals/${goalId}/history/${d}`} className="text-indigo-600 hover:underline">
                      {formatFullDate(d)}
                    </Link>
                  </h3>
                  <ul className="space-y-2">
                    {list.map((r) => {
                      const t = taskById.get(r.task_id)!
                      return (
                        <li
                          key={r.task_id}
                          className="rounded-lg border-2 px-3 py-2"
                          style={{ borderColor: t.color, backgroundColor: `${t.color}10` }}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-sm font-medium" style={{ color: t.color }}>{t.label}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              r.completed ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {r.completed ? 'Done' : 'Not done'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-line">{r.note}</p>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}

            {filtered.length === 0 && (
              <p className="text-center text-sm text-gray-500">No notes in this month.</p>
            )}
          </>
        )}
      </div>
    </main>
  )
}