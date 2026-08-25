export type TierSlug = 'free' | 'core' | 'signal' | 'analyst' | 'vector' | 'nexus'
export type StatType = 'pts' | 'reb' | 'ast' | 'stl' | 'blk' | '3pm' | 'pts_reb_ast'
export type PickDirection = 'over' | 'under'
export type PickResult = 'pending' | 'hit' | 'miss' | 'push' | 'void'
export type PickConfidence = 'high' | 'medium' | 'low'
export type ToolKey = 'projection_runner' | 'matchup_builder' | 'lineup_adjuster' | 'backtester'
export type InputSource = 'agent_prefill' | 'subscriber_override' | 'mixed'

export interface Member {
  id: string
  clerk_user_id: string
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  role: 'member' | 'operator'
  status: 'active' | 'suspended' | 'cancelled'
}

export interface WalletState {
  tier_slug: TierSlug | null
  subscription_status: string
  billing_cycle: string
  stripe_customer_id?: string
  stripe_subscription_id?: string
}

export interface PickPublished {
  id: string
  game_date: string
  player_name: string
  team: string
  stat_type: StatType
  line: number
  our_projection: number
  direction: PickDirection
  confidence: PickConfidence
  tier_required: TierSlug
  platform: string
  operator_notes?: string
  display_order: number
  published_at: string
  result: PickResult
  actual_value?: number
}

export interface PickProjection {
  id: string
  game_date: string
  player_name: string
  team: string
  position?: string
  is_starter: boolean
  projected_minutes: number
  proj_pts: number
  proj_reb: number
  proj_ast: number
  proj_stl?: number
  proj_blk?: number
  proj_3pm?: number
  confidence_score: number
  data_quality_flags?: string[]
}

export interface PickLine {
  player_name: string
  stat_type: StatType
  line: number
  platform: string
  our_projection?: number
  edge?: number
  edge_pct?: number
  recommended_side?: string
}

export interface ProjectionInputs {
  projectedMinutes: number
  per36: { pts: number; reb: number; ast: number }
  per36Adj?: { pts: number; reb: number; ast: number }
  lineupAdjApplied: boolean
  opponentPace: number
  individualPace: number
  opponentDefRating: number
  individualDefRating: number
  oppRebsAllowed: number
  indivRebsPer36: number
  oppAstAllowed: number
  matchupShare?: number
  leagueAvgPace?: number
  leagueAvgDef?: number
  leagueAvgRebsAllowed?: number
  leagueAvgRebsPer36?: number
  leagueAvgAstAllowed?: number
  weightBoostPct?: number
  confBoostPct?: number
}

export interface ProjectionOutputs {
  projPts: number
  projReb: number
  projAst: number
  fpace: number
  fdef: number
  rebSuppression: number
}

export interface EdgeComparison {
  stat: StatType
  line: number
  projection: number
  edge: number
  edgePct: number
  side: PickDirection
}

export interface ToolSession {
  id: string
  tool_used: ToolKey
  player_name?: string
  game_date?: string
  input_source: InputSource
  fields_overridden?: string[]
  proj_pts?: number
  proj_reb?: number
  proj_ast?: number
  session_saved: boolean
  created_at: string
}

export interface AgentStatus {
  agent: string
  last_run: string | null
  status: 'idle' | 'running' | 'success' | 'error'
  records_processed?: number
}
