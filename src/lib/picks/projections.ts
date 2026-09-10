export interface ProjectionIdentity {
  id: string
  player_name: string
  game_date: string
  created_at?: string | null
  run_label?: string | null
}

/** One latest live row per player and game date; preview rows never compete. */
export function latestLiveProjections<T extends ProjectionIdentity>(rows: T[]): T[] {
  const latest = new Map<string, T>()
  for (const row of rows) {
    if (row.run_label != null && row.run_label !== 'live') continue
    const key = `${row.player_name}\u0000${row.game_date}`
    const held = latest.get(key)
    const stamp = `${row.created_at ?? ''}\u0000${row.id}`
    const heldStamp = held ? `${held.created_at ?? ''}\u0000${held.id}` : ''
    if (!held || stamp > heldStamp) latest.set(key, row)
  }
  return [...latest.values()]
}
