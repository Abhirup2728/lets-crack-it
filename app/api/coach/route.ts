import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { goalName, endDate, stats, taskWiseData, weekdayVsWeekend, recentDays } = body

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AI coaching is not configured yet.' }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' })

    const prompt = `
You are an experienced, warm, but direct career coach and accountability mentor. A user is tracking daily progress toward a personal goal called "${goalName}" with a target deadline of ${endDate}.

Here is their real tracked performance data:

- Overall average completion: ${stats.avg}%
- Last 7-day average: ${stats.last7}%
- Last 30-day average: ${stats.last30}%
- Current streak of fully-complete days: ${stats.currentStreak}
- Longest streak ever: ${stats.longestStreak}
- Total fully-complete (100%) days: ${stats.perfectDays}

Per-task completion rates (task name: % completed when scheduled):
${taskWiseData.map((t: { label: string; pct: number }) => `- ${t.label}: ${t.pct}%`).join('\n')}

Weekday vs weekend average completion:
- Weekday: ${weekdayVsWeekend.weekday}%
- Weekend: ${weekdayVsWeekend.weekend}%

Last 10 logged days (date: completion %):
${recentDays.map((d: { date: string; pct: number }) => `- ${d.date}: ${d.pct}%`).join('\n')}

Write a short, personalized coaching message (150-220 words) that:
1. Opens by acknowledging something specific and real from their data (a strength or a genuine concern) — not generic praise.
2. Identifies the ONE most important thing they should focus on right now, based on the actual numbers above.
3. Gives 2-3 concrete, specific action suggestions tied to their actual weak points.
4. Ends with a short, genuine, motivating line — not cheesy, not over-the-top, just honest encouragement.

Write in plain prose, second person ("you"), no markdown headers, no bullet symbols, just natural paragraphs. Do not repeat back all the raw numbers verbatim — synthesize them into insight.
`.trim()

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25000) // 25 second max wait

    const result = await model.generateContent(prompt)
    clearTimeout(timeout)
    const text = result.response.text()

    return NextResponse.json({ message: text })
 } catch (err) {
    console.error('Gemini coach error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `AI error: ${message}` }, { status: 500 })
  } 
}