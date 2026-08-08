'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Goal, GoalTask, DAY_LABELS, TASK_COLORS, formatTime12h } from '@/lib/goals'

export default function SetupPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const goalId = params.id

  const [goal, setGoal] = useState<Goal | null>(null)
  const [tasks, setTasks] = useState<GoalTask[]>([])
  const [loading, setLoading] = useState(true)

  // form state for adding/editing a task
  const [label, setLabel] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [showForm, setShowForm] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [error, setError] = useState('')

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
      setTasks(taskData || [])
      setLoading(false)
    }
    load()
  }, [goalId, router])

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    )
  }

  function resetForm() {
    setLabel('')
    setStartTime('')
    setEndTime('')
    setSelectedDays([1, 2, 3, 4, 5])
    setError('')
    setEditingTaskId(null)
    setShowForm(false)
  }

  function startEdit(task: GoalTask) {
    setEditingTaskId(task.id)
    setLabel(task.label)
    setStartTime(task.start_time || '')
    setEndTime(task.end_time || '')
    setSelectedDays(task.days_of_week)
    setError('')
    setShowForm(true)
  }

  function startAddNew() {
    resetForm()
    setShowForm(true)
  }

  async function saveTask(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!label.trim()) {
      setError('Please enter a task name.')
      return
    }
    if (selectedDays.length === 0) {
      setError('Select at least one day this task applies to.')
      return
    }

    if (editingTaskId) {
      // update existing task
      const { data, error } = await supabase
        .from('goal_tasks')
        .update({
          label: label.trim(),
          start_time: startTime || null,
          end_time: endTime || null,
          days_of_week: selectedDays,
        })
        .eq('id', editingTaskId)
        .select()
        .single()

      if (error) {
        setError(error.message)
        return
      }
      setTasks((prev) => prev.map((t) => (t.id === editingTaskId ? data : t)))
    } else {
      // create new task
      const color = TASK_COLORS[tasks.length % TASK_COLORS.length]
      const { data, error } = await supabase
        .from('goal_tasks')
        .insert({
          goal_id: goalId,
          label: label.trim(),
          start_time: startTime || null,
          end_time: endTime || null,
          days_of_week: selectedDays,
          color,
          sort_order: tasks.length,
        })
        .select()
        .single()

      if (error) {
        setError(error.message)
        return
      }
      setTasks((prev) => [...prev, data])
    }

    resetForm()
  }

  async function deleteTask(taskId: string) {
    const { error } = await supabase.from('goal_tasks').delete().eq('id', taskId)
    if (error) {
      console.error(error)
      return
    }
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    if (editingTaskId === taskId) resetForm()
  }

  if (loading) return <main className="p-8 text-center text-gray-500">Loading...</main>
  if (!goal) return <main className="p-8 text-center text-gray-500">Goal not found.</main>

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-1">{goal.name}</h1>
        <p className="text-sm text-gray-500 mb-6">
          Build your weekly routine — it repeats every week until {goal.end_date}
        </p>

        <div className="space-y-2 mb-6">
          {tasks.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6 bg-white rounded-xl border border-gray-200">
              No tasks yet. Add your first one below.
            </p>
          )}
          {tasks.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between bg-white rounded-xl border-2 p-3 shadow-sm"
              style={{ borderColor: t.color }}
            >
              <div>
                <div className="font-medium" style={{ color: t.color }}>
                  {t.label}
                  {t.start_time && t.end_time && (
                    <span className="text-xs text-gray-400 ml-2">
                      {formatTime12h(t.start_time)}–{formatTime12h(t.end_time)}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {t.days_of_week.map((d) => DAY_LABELS[d]).join(', ')}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => startEdit(t)}
                  className="text-gray-400 hover:text-indigo-600 text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteTask(t.id)}
                  className="text-gray-400 hover:text-red-600 text-sm"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        {!showForm && (
          <button
            onClick={startAddNew}
            className="w-full border-2 border-dashed border-indigo-300 text-indigo-600 rounded-xl py-3 text-sm font-medium hover:bg-indigo-50 transition mb-6"
          >
            + Add a task
          </button>
        )}

        {showForm && (
          <form onSubmit={saveTask} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold">
                {editingTaskId ? 'Edit Task' : 'New Task'}
              </h3>
              {editingTaskId && (
                <span className="text-xs text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">Editing</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Task name</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Morning run, Read 20 pages"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Start time (optional)</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">End time (optional)</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Which days does this apply to?</label>
              <div className="flex gap-2 flex-wrap">
                {DAY_LABELS.map((d, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => toggleDay(i)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition ${
                      selectedDays.includes(i)
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white border-gray-300 text-gray-500'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-sm font-medium transition"
              >
                {editingTaskId ? 'Save Changes' : 'Add Task'}
              </button>
            </div>
          </form>
        )}

        {tasks.length > 0 && !showForm && (
          <button
            onClick={() => router.push(`/goals/${goalId}/today`)}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl py-3 text-sm font-semibold shadow-sm hover:opacity-90 transition"
          >
            Done — Start Tracking →
          </button>
        )}
      </div>
    </main>
  )
}