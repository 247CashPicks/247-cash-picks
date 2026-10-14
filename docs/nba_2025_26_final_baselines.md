# NBA 2025–26 final baselines

Retrieved and audited 2026-10-14. These are completed 2025–26 NBA regular-
season values; 2026–27 preseason and partial-season rows are excluded.

The source is the NBA Stats league-dash data distributed by SportsDataverse
under CC BY 4.0:

- `team_stats_advanced_2026.parquet` for pace and defensive rating;
- `team_stats_opponent_2026.parquet` for rebounds, assists and three-point
  rate allowed; and
- `player_stats_base_2026.parquet` for the player-minute-weighted rebound rate.

Source release:
`https://github.com/sportsdataverse/sportsdataverse-data/releases/tag/nba_stats_leaguedash`

License:
`https://github.com/sportsdataverse/hoopR-nba-data/blob/main/LICENSE.md`

| Default | Old | Final | Definition |
|---|---:|---:|---|
| Pace | 99.3 | **100.2** | Mean official team pace across 30 teams |
| Defensive rating | 115.5 | **114.7** | Mean official team defensive rating across 30 teams |
| Rebounds allowed | 43.9 | **43.8** | 107,672 opponent rebounds ÷ 2,460 team-games |
| Rebounds per 36 | 6.69 | **6.53** | 107,672 player rebounds ÷ 593,499.533 minutes × 36 |
| Assists allowed | 26.6 | **26.7** | 65,782 opponent assists ÷ 2,460 team-games |
| Three-point rate allowed | 0.36 | **0.36** | 32,717 opponent makes ÷ 90,970 attempts |

`matchupShare=0.3` is retained because it is a tunable model coefficient, not
a season statistic. Player/game inputs remain sourced from the selected
scenario snapshot and are not overwritten by these global fallbacks.

