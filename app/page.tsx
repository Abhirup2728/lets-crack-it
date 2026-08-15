'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  CalendarDays, CheckCircle2, LayoutDashboard, Sparkles, Target, ListChecks,
} from 'lucide-react'

const FEATURES = [
  {
    Icon: CalendarDays,
    title: 'Design Your Own Weekly Routine',
    desc: 'Build a routine that repeats every week — different tasks for weekdays, weekends, even every single day if you want. Your schedule, your rules.',
    color: 'from-indigo-500 to-purple-600',
  },
  {
    Icon: CheckCircle2,
    title: 'Daily Tracking, Zero Friction',
    desc: 'One tap to check off what you finished today. A live countdown shows exactly what to do right now, based on the actual clock.',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    Icon: ListChecks,
    title: 'Full Calendar History',
    desc: 'Every day of your journey, laid out month by month. Click any past day for a full breakdown — or preview any future day\'s schedule.',
    color: 'from-amber-500 to-orange-600',
  },
  {
    Icon: LayoutDashboard,
    title: 'Real Analytics, Not Just Numbers',
    desc: 'Streaks, weekly trends, monthly breakdowns, task-wise performance, weekday vs weekend — everything charted, nothing hidden.',
    color: 'from-pink-500 to-rose-600',
  },
  {
    Icon: Sparkles,
    title: 'AI Career Coach',
    desc: 'A personalized coaching message generated from your actual tracked data — what\'s working, what\'s slipping, and what to fix first.',
    color: 'from-violet-600 to-indigo-700',
  },
  {
    Icon: Target,
    title: 'Track Multiple Goals at Once',
    desc: 'Preparing for an exam while also job hunting? Building a fitness habit alongside a side project? Run as many goals as you need, each with its own routine.',
    color: 'from-cyan-500 to-blue-600',
  },
]

export default function RootPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.replace('/goals')
      } else {
        setChecking(false)
      }
    }
    check()
  }, [router])

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading...</p>
      </main>
    )
  }

  return (
    <main>
      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-12 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
          Let&apos;s Crack it
        </h1>
        <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed">
          Turn any goal into a daily routine, track it every single day, and watch a real dashboard show you exactly where you stand.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/login"
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold px-8 py-3 rounded-full shadow-lg hover:opacity-90 transition"
          >
            Get Started — It&apos;s Free
          </Link>
          <Link
            href="/login"
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold px-8 py-3 rounded-full shadow-lg hover:opacity-90 transition"
          >
            Log In
          </Link>
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4`}>
                <f.Icon className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Who it's for */}
      <section className="max-w-3xl mx-auto px-6 pb-16 text-center">
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Built for anyone chasing a real deadline</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Studying for a competitive exam. Job hunting alongside a 9-to-5. Training for something.
            Learning a skill on the side. Whatever the goal, if it needs daily discipline and an honest
            record of whether you actually showed up — this is built for that.
          </p>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-2xl mx-auto px-6 pb-20 text-center">
        <Link
          href="/login"
          className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold px-10 py-3.5 rounded-full shadow-lg hover:opacity-90 transition"
        >
          Start Tracking Today →
        </Link>
      </section>
    </main>
  )
}