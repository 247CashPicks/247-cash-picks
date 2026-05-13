import { NextRequest, NextResponse } from 'next/server'

const AGENT_NAME  = 'matchup'
const BACKEND_URL = process.env.BACKEND_URL  || 'https://placeholder.up.railway.app'
const CRON_SECRET = process.env.CRON_SECRET  || 'cashpicks-cron-2026'

export async function POST(req: NextRequest) {
  const authorization = req.headers.get('authorization')
  if (authorization !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const response = await fetch(
      `${BACKEND_URL}/agents/picks-${AGENT_NAME}/run`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CRON_SECRET}`,
        },
        signal: AbortSignal.timeout(55000),
      }
    )

    if (!response.ok) {
      const text = await response.text()
      console.error(`Agent ${AGENT_NAME} error:`, text)
      return NextResponse.json(
        { error: `Agent failed: ${response.status}`, detail: text },
        { status: 502 }
      )
    }

    const result = await response.json()
    return NextResponse.json({
      triggered: true,
      agent: AGENT_NAME,
      result,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`Cron ${AGENT_NAME} failed:`, message)
    return NextResponse.json(
      { error: message, agent: AGENT_NAME },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  return POST(req)
}
