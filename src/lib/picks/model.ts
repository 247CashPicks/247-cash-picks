import type { ProjectionInputs, ProjectionOutputs } from './types'

export const LEAGUE_DEFAULTS = {
  // Completed 2025-26 NBA regular-season baselines. Provenance:
  // docs/nba_2025_26_final_baselines.md. Never blend these with 2026-27
  // preseason/current-season partial results.
  pace:         100.2,
  defRating:    114.7,
  rebsAllowed:  43.8,
  rebsPer36:    6.53,
  astAllowed:   26.7,
  matchupShare: 0.3,
}

export function computeFpace(
  opponentPace: number,
  individualPace: number,
  matchupShare = LEAGUE_DEFAULTS.matchupShare,
  leagueAvgPace = LEAGUE_DEFAULTS.pace
): number {
  return (
    (opponentPace / leagueAvgPace) * matchupShare +
    (individualPace / leagueAvgPace) * (1 - matchupShare)
  )
}

export function computeFdef(
  opponentDefRating: number,
  individualDefRating: number,
  matchupShare = LEAGUE_DEFAULTS.matchupShare,
  leagueAvgDef = LEAGUE_DEFAULTS.defRating
): number {
  return (
    (opponentDefRating / leagueAvgDef) * matchupShare +
    (individualDefRating / leagueAvgDef) * (1 - matchupShare)
  )
}

export function computeRebSuppression(
  indivRebsPer36: number,
  leagueAvgRebsPer36 = LEAGUE_DEFAULTS.rebsPer36
): number {
  return indivRebsPer36 / leagueAvgRebsPer36
}

export function runProjection(inputs: ProjectionInputs): ProjectionOutputs {
  const league = {
    pace:      inputs.leagueAvgPace        ?? LEAGUE_DEFAULTS.pace,
    def:       inputs.leagueAvgDef         ?? LEAGUE_DEFAULTS.defRating,
    rebs:      inputs.leagueAvgRebsAllowed ?? LEAGUE_DEFAULTS.rebsAllowed,
    rebsPer36: inputs.leagueAvgRebsPer36   ?? LEAGUE_DEFAULTS.rebsPer36,
    ast:       inputs.leagueAvgAstAllowed  ?? LEAGUE_DEFAULTS.astAllowed,
    share:     inputs.matchupShare         ?? LEAGUE_DEFAULTS.matchupShare,
  }

  const fpace = computeFpace(
    inputs.opponentPace,
    inputs.individualPace,
    league.share,
    league.pace
  )

  const fdef = computeFdef(
    inputs.opponentDefRating,
    inputs.individualDefRating,
    league.share,
    league.def
  )

  const rebMult     = computeRebSuppression(inputs.indivRebsPer36, league.rebsPer36)
  const weightBoost = inputs.weightBoostPct ? (1 + inputs.weightBoostPct / 100) : 1
  const confBoost   = inputs.confBoostPct   ? (1 + inputs.confBoostPct   / 100) : 1

  const per36 =
    inputs.lineupAdjApplied && inputs.per36Adj
      ? inputs.per36Adj
      : inputs.per36

  const mins = inputs.projectedMinutes

  return {
    projPts: r1((per36.pts / 36) * mins * fpace * fdef * confBoost),
    projReb: r1((per36.reb / 36) * mins * fpace * (inputs.oppRebsAllowed / league.rebs) * rebMult * weightBoost * confBoost),
    projAst: r1((per36.ast / 36) * mins * fpace * (inputs.oppAstAllowed  / league.ast)  * confBoost),
    fpace:   r3(fpace),
    fdef:    r3(fdef),
    rebSuppression: r3(rebMult),
  }
}

export function computeEdge(projection: number, line: number) {
  const edge    = projection - line
  const edgePct = (edge / line) * 100
  return {
    edge:    r1(edge),
    edgePct: r1(edgePct),
    side:    edge > 0 ? 'over' : 'under',
  }
}

function r1(n: number): number { return Math.round(n * 10)   / 10   }
function r3(n: number): number { return Math.round(n * 1000) / 1000 }
