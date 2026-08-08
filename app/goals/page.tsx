'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Goal } from '@/lib/goals'

export default function GoalsPage() {
  const router = useRouter()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editError, setEditError] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) console.error(error)
      setGoals(data || [])
      setLoading(false)
    }
    init()
  }, [router])

  async function createGoal(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim() || !endDate) {
      setError('Please fill in both the goal name and end date.')
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = new Date()
    const startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    const { data, error } = await supabase
      .from('goals')
      .insert({ user_id: user.id, name: name.trim(), start_date: startDate, end_date: endDate })
      .select()
      .single()

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    router.push(`/goals/${data.id}/setup`)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function deleteGoal(goalId: string) {
    const { error } = await supabase.from('goals').delete().eq('id', goalId)
    if (error) {
      console.error(error)
      return
    }
    setGoals((prev) => prev.filter((g) => g.id !== goalId))
    setConfirmDeleteId(null)
    setOpenMenuId(null)
  }

  function startEditGoal(g: Goal) {
    setEditingGoalId(g.id)
    setEditName(g.name)
    setEditEndDate(g.end_date)
    setEditError('')
    setOpenMenuId(null)
  }

  async function saveGoalEdit(goalId: string) {
    setEditError('')
    if (!editName.trim() || !editEndDate) {
      setEditError('Please fill in both the goal name and end date.')
      return
    }
    setEditSaving(true)

    const { data, error } = await supabase
      .from('goals')
      .update({ name: editName.trim(), end_date: editEndDate })
      .eq('id', goalId)
      .select()
      .single()

    setEditSaving(false)

    if (error) {
      setEditError(error.message)
      return
    }

    setGoals((prev) => prev.map((g) => (g.id === goalId ? data : g)))
    setEditingGoalId(null)
  }

  if (loading) return <main className="p-8 text-center text-gray-500">Loading...</main>

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Let&apos;s Crack it
          </h1>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-800">
            Log out
          </button>
        </div>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Your Goals</h2>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="w-9 h-9 rounded-full bg-indigo-600 text-white text-xl font-bold flex items-center justify-center hover:bg-indigo-700 transition"
          >
            +
          </button>
        </div>

        {showForm && (
          <form onSubmit={createGoal} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Goal name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. CAT, Fitness, Learn Guitar"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Target end date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-sm font-medium transition disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Goal & Build Routine →'}
            </button>
          </form>
        )}

        {goals.length === 0 && !showForm && (
          <p className="text-gray-500 text-sm text-center py-10">
            No goals yet — click the + button to create your first one.
          </p>
        )}

        <div className="space-y-2">
          {goals.map((g) => (
            <div
              key={g.id}
              className="relative bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-indigo-300 transition"
            >
              {editingGoalId === g.id ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-500">Goal name</label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-500">Target end date</label>
                    <input
                      type="date"
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  {editError && <p className="text-sm text-red-600">{editError}</p>}

                  <Link
                    href={`/goals/${g.id}/setup`}
                    className="block text-sm text-indigo-600 hover:underline"
                  >
                    Manage routine — add, edit, or remove daily tasks →
                  </Link>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setEditingGoalId(null)}
                      className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-1.5 text-sm font-medium hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveGoalEdit(g.id)}
                      disabled={editSaving}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-1.5 text-sm font-medium transition disabled:opacity-50"
                    >
                      {editSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <Link href={`/goals/${g.id}/today`} className="block pr-8">
                    <div className="font-semibold">{g.name}</div>
                    <div className="text-xs text-gray-500">
                      {g.start_date} → {g.end_date}
                    </div>
                  </Link>

                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      setOpenMenuId(openMenuId === g.id ? null : g.id)
                    }}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 px-1"
                  >
                    ⋮
                  </button>

                  {openMenuId === g.id && (
                    <div className="absolute top-10 right-4 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          startEditGoal(g)
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                      >
                        Edit goal
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          setConfirmDeleteId(g.id)
                          setOpenMenuId(null)
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 whitespace-nowrap"
                      >
                        Delete goal
                      </button>
                    </div>
                  )}

                  {confirmDeleteId === g.id && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-3 p-4 z-20">
                      <p className="text-sm text-center font-medium">
                        Delete &quot;{g.name}&quot;? This removes its entire routine and history — this cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => deleteGoal(g.id)}
                          className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}