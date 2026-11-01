# National-TV caution in protected Preview

The NBA staged-slate player/prop row renders backend `national_tv_context`
with text, icon, reasons, exact game/start/date, full-day count, source timing,
and immutable audit identity. The UI does not recompute classification, count
games, or infer status from a network name. Missing context is explicitly
Unknown. This optional context cannot remove a row, disable confirmation,
change a projection, or reorder selections.

The ordinary national-game label is `NATIONAL TV — CAUTION`. When the backend
verifies a full NBA day with at most four total games and every scheduled
start is distinct, the row also displays
`SMALL NATIONAL-TV SLATE — GREATER CAUTION`. A single game qualifies; an
overlapping pair prevents greater caution. This is a review rule, not a claim
that television causes a result or a validated model coefficient.

The Command Center's broadcast-evidence form accepts one full-day snapshot
JSON object plus an audit reason. It submits only through the existing
same-origin `/api/operator/nba-national-tv/snapshots` proxy, using the caller's
Clerk session; backend active-operator and protected Preview guards apply.
The backend verifies exact canonical schedule identity, explicit rights and
coverage assertions, source provenance and a 24-hour freshness maximum.
Missing/stale/partial/unmatched/unlicensed evidence remains Unknown. Save
failure stays visible and cannot claim success. Refreshing the optional context
does not run a projector, import a feed, publish, or confirm a selection.

No approved broadcast feed or real current packet is bundled. An authorized
reviewer must establish primary-source commercial display/retention rights;
structural flags and HTTPS links do not verify contracts. Complete backend
schema and operational contract: `docs/nba_national_tv_caution.md` in backend
branch `feat/nba-national-tv-warning-preview`. Migration
`061_nba_national_tv_snapshots.sql` remains a separate release-owner step.
