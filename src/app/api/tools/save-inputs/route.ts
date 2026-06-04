import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

const BRAND_ID = '247cashpicks'

export async function POST(req: NextRequest) {
  const userId = 'preview-user'

  const { sessionId, saveName } = await req.json()

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: session } = await supabase
    .from('picks_tool_sessions')
    .select('id, clerk_user_id')
    .eq('id', sessionId)
    .eq('brand_id', BRAND_ID)
    .single()

  if (!session || session.clerk_user_id !== userId) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  await supabase
    .from('picks_tool_sessions')
    .update({ session_saved: true })
    .eq('id', sessionId)
    .eq('clerk_user_id', userId)

  await supabase
    .from('picks_custom_inputs')
    .update({
      is_saved: true,
      save_name: saveName || null,
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId)
    .eq('clerk_user_id', userId)

  return NextResponse.json({ saved: true, sessionId })
}
