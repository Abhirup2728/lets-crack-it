'use client'

import { useEffect, useState } from 'react'
import { formatFullDate, toDateStr } from '@/lib/goals'

export default function LiveClock({ saving }: { saving: boolean }) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const shell =
    'relative overflow-hidden rounded-2xl shadow-lg border border-white/20 bg-gradient-to-br from-indigo-700 via-purple-600 to-orange-500 text-white px-4 py-2.5 mb-4'

  if (!now) return <div className={`${shell} h-28`} />

  const h24 = now.getHours()
  const hours = String(h24 % 12 === 0 ? 12 : h24 % 12).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const period = h24 >= 12 ? 'PM' : 'AM'

  // "6th November 2026" -> day, month, year
  const [day, month, year] = formatFullDate(toDateStr(now)).split(' ')
  const weekdayName = now.toLocaleDateString('en-US', { weekday: 'long' })
  const isWeekend = now.getDay() === 0 || now.getDay() === 6

  return (
    <div className={shell}>
      <div className="flex items-center justify-between gap-3">
        {/* Live time */}
        <div className="flex flex-col items-center leading-none font-mono tabular-nums pl-4 sm:pl-8">
          <span className="text-3xl sm:text-4xl font-extrabold">{hours}</span>
          <span className="my-0.5 flex items-center gap-1.5 text-[10px] sm:text-xs font-bold tracking-widest">
            {period}
            <span className="opacity-80">{seconds}</span>
          </span>
          <span className="text-3xl sm:text-4xl font-extrabold">{minutes}</span>
        </div>

        {/* Date */}
        <div className="flex-1 text-center">
          <div className="text-xs sm:text-sm font-bold opacity-90">
            {day} {month}
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-none my-0.5">
            {weekdayName}
          </div>
          <div className="mx-auto my-1 h-px w-3/4 bg-white/40" />
          <div className="text-sm sm:text-base font-bold tracking-widest">{year}</div>
          <div className="mt-0.5 text-[10px] sm:text-xs opacity-90">
            {isWeekend ? 'Weekend' : 'Weekday'} · {saving ? 'Saving...' : 'All changes saved'}
          </div>
        </div>
      </div>
    </div>
  )
}