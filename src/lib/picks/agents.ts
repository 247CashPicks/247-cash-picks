import type { Sport } from '@/lib/sport'

/**
 * The one place the agent set is defined — shared by the dashboard (which
 * renders the cards) and /api/operator/run-agent (which dispatches them).
 *
 * These were two independent lists: the dashboard hardcoded seven NBA agents
 * and the route hardcoded the same seven in an allowlist. Under NFL the UI
 * showed NFL cards while the RUN button still dispatched the NBA agents
 * (RotoWire/BBRef) against the NFL board. Keying one registry by sport removes
 * that drift by construction — the cards and the dispatch cannot disagree
 * because they read the same rows.
 */
export interface AgentDef {
  /** Sent by the client; the key the route resolves within a sport. */
  key: string
  label: string
  glyph: string
  /**
   * Cadence label for the card. NBA agents are cron-scheduled (times mirror
   * vercel.json); NFL has no cron, so the label is a weekly day-of-week cadence
   * and the pipeline panel states the agents are operator-run.
   */
  time: string
  /**
   * Reads a live-only source (rosters / injury / DFS boards). Running it with a
   * past date would overwrite the current board onto that past slate, so an
   * explicit date is refused. NFL: nfl-scout and lines scrape live; the seeder
   * (static reference), projector (computes from stored stats) and selector
   * (stages from computed edges) are date-safe.
   */
  liveOnly: boolean
  /** Path segment after `/agents/`. NBA agents share a `picks-` prefix; the
   *  NFL-specific agents are their own routes; lines/selector are the shared
   *  `picks-` agents used by both sports. */
  backendPath: string
  /** Append `?league=<sport>`. Only the shared agents under NFL need it; the
   *  NBA dispatch stays param-free, which is what the NBA backend expects. */
  leagueParam: boolean
  /** Briefing writer needs its cadence in the backend payload, not just a date. */
  editionType?: 'daily' | 'weekly' | 'alert'
  /** Backend parameter name for an optional requested slate date. */
  dateParam?: 'date' | 'game_date'
  /** Lets the briefing card communicate its operator action without a one-off UI. */
  runLabel?: string
}

export const AGENTS_BY_SPORT: Record<Sport, readonly AgentDef[]> = {
  NBA: [
    { key: 'scout',     label: 'Scout',     glyph: '◈', time: '6:00 AM ET',  liveOnly: false, backendPath: 'picks-scout',     leagueParam: false },
    { key: 'stats',     label: 'Stats',     glyph: 'Σ', time: '8:00 AM ET',  liveOnly: true,  backendPath: 'picks-stats',     leagueParam: false },
    { key: 'matchup',   label: 'Matchup',   glyph: '⬡', time: '9:00 AM ET',  liveOnly: false, backendPath: 'picks-matchup',   leagueParam: false },
    { key: 'defense',   label: 'Defense',   glyph: '◉', time: '9:30 AM ET',  liveOnly: true,  backendPath: 'picks-defense',   leagueParam: false },
    { key: 'projector', label: 'Projector', glyph: '◆', time: '10:00 AM ET', liveOnly: false, backendPath: 'picks-projector', leagueParam: false },
    { key: 'lines',     label: 'Lines',     glyph: '↗', time: '2:00 PM ET',  liveOnly: true,  backendPath: 'picks-lines',     leagueParam: false },
    { key: 'selector',  label: 'Selector',  glyph: '›', time: '2:30 PM ET',  liveOnly: false, backendPath: 'picks-selector',  leagueParam: false },
    { key: 'briefing-writer', label: 'Briefing Writer', glyph: '▤', time: 'Daily · after selector', liveOnly: false, backendPath: 'briefing-writer', leagueParam: true, editionType: 'daily', dateParam: 'game_date', runLabel: 'GENERATE EDITION' },
  ],
  NFL: [
    { key: 'nfl-reference-seeder', label: 'Reference Seeder', glyph: '◇', time: 'Tue · weekly', liveOnly: false, backendPath: 'nfl-reference-seeder', leagueParam: false },
    { key: 'nfl-scout',            label: 'Scout',            glyph: '◈', time: 'Wed · weekly', liveOnly: true,  backendPath: 'nfl-scout',            leagueParam: false },
    { key: 'nfl-projector',        label: 'Projector',        glyph: '◆', time: 'Wed · weekly', liveOnly: false, backendPath: 'nfl-projector',        leagueParam: false },
    { key: 'lines',                label: 'Lines',            glyph: '↗', time: 'Thu · weekly', liveOnly: true,  backendPath: 'picks-lines',          leagueParam: true },
    { key: 'selector',             label: 'Selector',         glyph: '›', time: 'Thu · weekly', liveOnly: false, backendPath: 'picks-selector',       leagueParam: true },
    { key: 'briefing-writer',      label: 'Briefing Writer',  glyph: '▤', time: 'Weekly · after selector', liveOnly: false, backendPath: 'briefing-writer', leagueParam: true, editionType: 'weekly', dateParam: 'game_date', runLabel: 'GENERATE EDITION' },
  ],
}

/**
 * Resolve an agent within a sport. A cross-sport key (e.g. 'stats' under NFL,
 * or 'nfl-scout' under NBA) returns undefined, which the route turns into a
 * 400 — so the sport the client is viewing decides which agents are legal.
 */
export function agentFor(sport: Sport, key: string): AgentDef | undefined {
  return AGENTS_BY_SPORT[sport].find(a => a.key === key)
}
