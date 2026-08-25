# RECON_REPORT.md — DataNexus / TAC Frontend (247cashpicks)

**Repo:** `247cashpicks` → theanalyticscommunity.com (Vercel)
**Scope of this run:** SECTION B — FRONTEND ONLY. Section A (backend `datanexus-backend`) was not run from this repo.
**Mode:** Read-only reconnaissance. Ground truth from source, not docs/memory. Date: 2026-08-18.
**Stack (verified `package.json`):** Next.js 16.2.6, React 19.2.4, Clerk 7.x, Supabase (ssr + supabase-js), Stripe 22.x, Resend 6.x. App Router.

---

## 1. EXECUTIVE SUMMARY

- **Build-state headline: ~15 LIVE surfaces, 5 BUILT-NOT-WIRED, 2 BROKEN, 1 intentional STUB-FACADE, plus ~30 orphaned dead component files.**
- The app is a single-tenant NBA product. `brand_id='datanexus'` is the ONLY tenancy axis threaded through ~48 query sites. **There is no `sport`/`league` dimension anywhere** — not in config, schema references, routes, or nav.
- **Every file under `src/components/**` is dead**: tool/dashboard/picks/landing components are one-line `return null` stubs; `ui/{Badge,Button,Card}` are real but imported nowhere. All real UI is reimplemented inline in each `page.tsx`. The only live component is untracked `dashboard/AgentPipeline.tsx`.
- **The projection engine (`src/lib/picks/model.ts`) is basketball physics to the constant** — per-36 ÷ 36 × minutes × pace-factor × def-rating-factor × rebound-suppression, with NBA league averages hardcoded. NFL needs a *different engine*, not different data.
- **Security/wiring gaps found and verified:** `POST /api/picks` has NO auth (anonymous `publish_all` possible); `GET /api/projections` is fully public; `/api/tools/backtester` is login-gated but not Nexus-tier-gated; dashboard + publish pages have no operator/tier gate.
- **Payments are non-functional:** all six `stripePriceId` are `''` → checkout 503s and webhook can't map tier→wallet.
- **Backend link is unset:** cron proxies default to `https://placeholder.up.railway.app`; `operator/run-agent` 500s with `BACKEND_URL` unset.
- Two projection/lineup tools are NBA-shaped to the bone; tracker, backtester, picks/tiers infra, team, and position are sport-agnostic and will absorb NFL with label/enum changes.
- **Cheapest NFL path (frontend evidence):** a parallel `sport` scalar scope mirroring `brand_id` at the data layer + one consolidated global nav carrying a sport switcher. NOT a route-tree refactor, NOT a forked brand config.
- Tier-gate logic is **duplicated** in `config/brand.ts` and `lib/picks/tiers.ts` (two sources of truth), reimplemented per-route with no middleware tier enforcement.

---

## 2. FINDINGS BY SECTION

### B0 — BUILD-STATE INVENTORY

#### Pages
| Page | Class | Purpose | Evidence |
|---|---|---|---|
| `app/page.tsx` | STUB-FACADE (by design) | Marketing landing | Hardcoded `projections` `page.tsx:6-14`, `SAMPLE_FEED` `:46-52`, `DRIFT_COLUMN` `:55-80`; self-labeled "SAMPLE DATA" `:464`. |
| `app/dashboard/page.tsx` | LIVE | Operator command center | Real Supabase queries `:23-45`; `force-dynamic` `:7`. ⚠ auth-only `:65-66`, no tier/operator gate. |
| `app/dashboard/publish/page.tsx` | LIVE | Transmit confirmed picks | Query `:19-26`. ⚠ no `auth()` in page; relies on middleware only, no tier gate. |
| `app/join/page.tsx` | LIVE code / BROKEN checkout | Tier selection + Stripe | `handleCheckout` → `/api/stripe/checkout` `:62`; all `stripePriceId=''` (`config/brand.ts:47-81`) → 503 (`checkout/route.ts:32-37`). |
| `app/picks/page.tsx` | LIVE | Daily signals, tier-filtered | Query `:23-29`; `visibleLimit` `:179`; blur-lock `:295`. |
| `app/portal/page.tsx` | LIVE (one stub link) | Subscriber account portal | Real queries `:32-48`. ⚠ billing link is placeholder `https://billing.stripe.com/p/login/test_placeholder` `:352`. |
| `app/tracker/page.tsx` | LIVE | Accuracy Index / results log | Queries `:16-37`; `force-dynamic` `:1`. Public (no auth). |
| `app/tools/page.tsx` | LIVE | Tool directory w/ tier locks | Usage query `:21-33`; `canUseTool(tier, tool.key)` `:226`. |
| `app/tools/backtester/page.tsx` | LIVE | Historical accuracy tester | Fetches `/api/tools/backtester` `:76`; honest empty-state `:337`. No fabricated data remains. |
| `app/tools/lineup-adjuster/page.tsx` | LIVE | Shared-floor combo calibrator | Fetch dates `:150`, slate `:171`, POST combo `:213`. |
| `app/tools/matchup-builder/page.tsx` | LIVE | Defensive matchup matrix | Fetch `/api/tools/today-matchups` `:218`; hands off to runner via URL params `:523`. |
| `app/tools/projection-runner/page.tsx` | LIVE compute / BROKEN save | Run the projection model | Client-side `runProjection(inputs)` `:174`; prefill `:258-260`; URL auto-select `:325-334`. Save broken (see `save-inputs`). |
| `app/sign-in/[[...sign-in]]` | LIVE | Clerk sign-in | `<SignIn/>` `:15`. |
| `app/sign-up/[[...sign-up]]` | LIVE | Clerk sign-up | `<SignUp/>` `:15`. |

#### API routes
| Route | Class | Purpose | Evidence |
|---|---|---|---|
| `cron/{scout,stats,matchup,defense,projector,lines,selector}` (7) | BUILT-NOT-WIRED | Trigger `picks-<agent>` on Railway | Thin proxies; `BACKEND_URL` default `https://placeholder.up.railway.app` (verified `defense:4`, `scout:4`); Bearer `CRON_SECRET` default `'cashpicks-cron-2026'`. |
| `cron/nba-reference-seeder` | BUILT-NOT-WIRED | Seed player reference | Proxy; path `/agents/nba-reference-seeder/run` `:15`. |
| `cron/picks-resolver` | BUILT-NOT-WIRED | Grade settled picks | Proxy `:15`; cron `0 7 * * *`. |
| `api/members` | LIVE | Clerk webhook → members + wallet | `verifyWebhook` `:11`; insert `:28-58`. TODO `user.deleted` unhandled `:15`. |
| `api/operator/run-agent` | BUILT-NOT-WIRED | Manual agent dispatch | Nexus gate `:28`; `BACKEND_URL` default `''` → 500 `:48-49`; wired to `AgentPipeline.tsx:40`. |
| `api/picks` GET | LIVE | Tier-filtered published picks | auth `:12`; `canAccess` `:36`; core cap `:40`. |
| `api/picks` POST | **LIVE logic / NO AUTH** | Operator add-selection + `publish_all` | **Verified: no `auth()` in POST (`:46`→`publish_all :55`).** Anonymous caller can publish + fire publisher. |
| `api/players/search` | LIVE | Autocomplete | auth + `canAccess(tier,'analyst')` `:18`; `nba_players_reference` `:28`. |
| `api/players/stats` | LIVE | Per-36 prefill | auth + analyst gate `:18`, `:30`. |
| `api/projections` | **LIVE / UNGATED** | Slate projections + matchups | **Verified: no `auth()` (single handler `:6`).** Fully public. |
| `api/stripe/checkout` | LIVE code / non-functional | Create checkout session | 503 on empty `stripePriceId` `:32-37`. |
| `api/stripe/webhook` | LIVE code / non-functional mapping | Sync subscription→wallet | Sig verify `:26`; `getTierFromPriceId` `:12-17` can't resolve (all price ids `''`). |
| `api/tools/backtester` | LIVE / TIER-GATING GAP | Accuracy aggregation | **Verified: `auth()` `:9` + wallet `:14` but no `canAccess`.** Nexus tool reachable by any authed user. |
| `api/tools/lineup-adjuster` GET+POST | LIVE | Slate players + combo ladder | `canAccess(tier,'vector')` `:37`,`:142`. |
| `api/tools/lineup-adjuster/dates` | LIVE | Slate dates | vector gate `:14`. |
| `api/tools/matchup-context` | LIVE | Opponent prefill | analyst gate `:18`; honest `found:false` `:45`. |
| `api/tools/run-projection` | BUILT-NOT-WIRED | Server projection + session log | Full logic `:61-127`; nexus override `:42-51`. Never fetched (runner computes locally). |
| `api/tools/save-inputs` | BROKEN (contract mismatch) | Persist saved analysis | Expects `{sessionId, saveName}` `:12-14`; runner sends `{playerName, inputs, output, fieldsOverridden}` (`projection-runner:187-192`) → 400. "Save to Lab" silently no-ops. |
| `api/tools/today-matchups` | LIVE | Grouped matchup slate | vector gate `:55`; enrich+group `:80-157`. |

#### Sample/fabricated data & dead code
- **Only fabricated data is the marketing landing** (`app/page.tsx:6-14,46-52,55-80`), explicitly self-labeled. Backtester is clean (git-log "remove fabricated SAMPLE_RESULT" confirmed — no `SAMPLE_*`/`MOCK_*` remain).
- **Dead code:** every `src/components/tools/*`, `components/dashboard/*`, `components/picks/*`, `components/landing/*` is a `return null` stub (verified `ProjectionRunner`, `LineupAdjuster`, `Backtester`, `MatchupBuilder`). `components/ui/{Badge,Button,Card}` are real but imported by no page. Only live component: untracked `dashboard/AgentPipeline.tsx` (`dashboard/page.tsx:5,162`).

### B1 — ROUTE & TOOL MAP + TIER-GATING
- Full page/route purposes: table above.
- **Tier-gating pattern: centralized helpers, reimplemented per-route; no middleware tier enforcement.** Helpers `canAccess` (`lib/picks/tiers.ts:11`), `canUseTool` (`:26`), `TOOL_MIN_TIERS` (`:19`: runner=analyst, matchup/lineup=vector, backtester=nexus). Middleware (`src/middleware/proxy.ts`) does login `auth.protect()` only on `/picks|/portal|/tools|/dashboard` — no tier logic. Call sites: `picks:36`, `players/search:18`, `players/stats:18`, `lineup-adjuster:37,142`, `lineup-adjuster/dates:14`, `matchup-context:18`, `today-matchups:55`, `run-projection:45`, `operator/run-agent:28`, `tools/page.tsx:226`.
- **Gating holes (verified):** (1) `POST /api/picks` no auth; (2) `GET /api/projections` public; (3) `api/tools/backtester` no tier check; (4) dashboard + publish pages no operator/tier gate.

### B2 — BRAND & CONFIG
- `src/config/brand.ts` = one `BRAND` const: `slug:'datanexus'` (`:2`), name/tagline/domain/supportEmail/supabaseUrl (`:3-8`), `colors` (`:10-35`), `fonts` (`:37-43`), `tiers[6]` (`:45-82`: free/core/signal/analyst/vector/nexus), `promos` (`:84-88`). Plus types + gate helpers (`:91-171`). **No sport/league field.**
- **Duplication:** `lib/picks/tiers.ts` re-defines `TIER_ORDER/tierIndex/canAccess/TOOL_MIN_TIERS/canUseTool/TIER_FEATURES/hasFeature` verbatim. Import counts: `@/config/brand` ≈ 32 sites (all pages/routes/layout, display data); `@/lib/picks/tiers` = 9 sites (gate helpers only). `api/picks/route.ts` imports BOTH (`brand:6`, `tiers:5`) — duplication is live.
- `BRAND.slug` → `brand_id` on ~48 query sites (`.eq('brand_id', BRAND.slug)`, insert payloads, one header `X-Brand-Id` `api/picks:110`). This is the sole tenancy dimension; no `sport`/`league` column referenced anywhere.

### B3 — AGENT DISPATCH (`/api/operator/run-agent`) — verified in full
- **Allowlist:** `ALLOWED_AGENTS = [scout, stats, matchup, defense, projector, lines, selector]` (`route.ts:11-13`) — 7 fixed NBA agent names, path-injection guard `:36`.
- **Historical-date blocking:** `LIVE_ONLY_AGENTS = [stats, defense, lines]` (`:17`) rejected with a date (`:42-47`); date must match `YYYY-MM-DD` (`:39`).
- **BACKEND_URL flow:** default `''` → 500 "BACKEND_URL not configured" (`:7,48-49`); dispatch URL is `${BACKEND_URL}/agents/picks-${agent}/run` (`:52`) — **the `picks-` prefix is hardcoded**; Bearer `CRON_SECRET` (`:61`); 45s timeout returns `still_running` (`:86-92`).
- **Nexus-gated** (`:28`). Wired to `AgentPipeline.tsx:40`.
- **NFL impact: additive at the array level, but the hardcoded `picks-` prefix is the seam.** Adding NFL agents means either extending `ALLOWED_AGENTS` (and the backend exposing `/agents/picks-<nfl-agent>/run`) OR generalizing the prefix to carry sport (e.g. `picks-nfl-<agent>`). No restructure of the route's logic is required — only the allowlist + URL template.

### B4 — NBA ASSUMPTIONS INVENTORY
1. **Teams:** no canonical 30-team array; `team`/`opponent_team` are free-text DB strings (sport-agnostic). Hardcoded NBA teams only in landing mock (`page.tsx:7-13,57-77`).
2. **Positions:** no enum; `position` is always `string | null` (`types.ts:52`; `lineup-adjuster:20`; `matchup-builder:19`; `projection-runner:144,251,330,520`; `'UNK'` sentinel `api/tools/lineup-adjuster:86`). Display-only; NFL positions render fine.
3. **Stat labels/types (deepest coupling):**
   - `types.ts:2` — `StatType = 'pts'|'reb'|'ast'|'stl'|'blk'|'3pm'|'pts_reb_ast'` (pure NBA union).
   - `types.ts:57-60,78-79,99-101,123-125` — `proj_pts/reb/ast…`, `per36:{pts,reb,ast}`, `ProjectionOutputs{projPts,projReb,projAst}`.
   - Tool-level unions: `lineup-adjuster:44` `StatKey='pts'|'reb'|'ast'`, `:46-49` STATS→`per36_*`; `backtester:17,266`; `api/tools/backtester:75` `['pts','reb','ast']`; `projection-runner:20,164,203,269`.
   - per36 DB columns (`per36_pts/reb/ast/…`, `per36_*_adj`, `avg_minutes`) repeated across `lineup-adjuster`, `matchup-builder`, `today-matchups`, `players/stats`, `run-projection`.
   - UI labels PTS/REB/AST/MIN, "/36": `dashboard:188`, `portal:304`, `projection-runner:538-552,712-714,792-794`, `lineup-adjuster:77,477-479`, `matchup-builder:109-124`.
   - "minutes" as first-class input: `types.ts:77`; `projection-runner:204-206,552`; `api/tools/lineup-adjuster:105` `MIN_MINUTES=48` (basketball game length).
4. **Season format:** `api/tools/lineup-adjuster:103` `BASELINE_SEASON='2024-25'` (+`:156`); UI copy `lineup-adjuster:631,643`; `projection-runner:544`. Hyphenated two-year format is NBA-style; NFL is single-year.
5. **NBA sources/tables:** table `nba_players_reference` (`today-matchups:84`, `lineup-adjuster:62,65`, `players/search:29`, `players/stats:31`); `nba-reference-seeder` cron (`route.ts:3`); `nba_game_id` (`lineup-adjuster:154`); copy "Cleaning the Glass" (`page.tsx:23`), "Court-IQ/RotoWire/DFS" (`run-agent:15`); PrizePicks/Underdog (`tools/page.tsx:58`, `join:520-521`, `api/picks:175`, `brand.ts:85-86`).
6. **Basketball domain math (structure = basketball):** `model.ts:3-10` `LEAGUE_DEFAULTS{pace:99.3, defRating:115.5, rebsAllowed:43.9, rebsPer36:6.69, astAllowed:26.6}`; `computeFpace/Fdef/RebSuppression` `:12-41`; `runProjection` `:43-86`; `ProjectionInputs` NBA fields `types.ts:81-96`; runner UI hardwires PACE / DEF RATING / REB sections `projection-runner:592-647,742-744,766-794`; matchup domain (defender height/weight, weight-boost) `today-matchups:9-39`; lineup rotation `api/tools/lineup-adjuster:105-184`.

**Per-tool reusability (one sentence each):**
1. **Lineup Adjuster** — NBA-shaped to the bone: per-36 combos over shared on-court minutes with a 48-min / 20-shared-games rotation model; no clean NFL analog.
2. **Projection Runner** — NBA-shaped to the bone: form fields, math, and output tiles are all the pace × def-rating × rebound-suppression per-36 formula; NFL needs a new engine.
3. **Matchup Builder** — mostly NBA-shaped: 1-offense-vs-1-defender blended by height/weight + defensive percentile is a basketball iso concept; only the "cards grouped by game" shell is reusable.
4. **Backtester** — structurally reusable: aggregates hit/miss on resolved `picks_published` by confidence/stat; only the hardcoded `['pts','reb','ast']` filter must become sport-driven.
5. **Tracker** — structurally reusable: generic resolved-picks ledger keyed on `stat_type`/`result`/`confidence`/`direction`; renders whatever stat string the DB holds.

### B5 — NAVIGATION
- **Nav is duplicated inline, not centralized.** `app/layout.tsx` has no nav (ClerkProvider + fonts + `{children}` only). No shared Nav/Header component exists. Identical nav array `[SIGNALS /picks, ENGINE /tools, PIPELINE /dashboard, TIERS /join]` is redefined in **12 pages**: `page.tsx:39`, `join:49`, `dashboard:12`, `dashboard/publish:9`, `picks:13`, `portal:13`, `tracker:9`, `tools:14`, `tools/backtester:9`, `tools/projection-runner:11`, `tools/matchup-builder:9`, `tools/lineup-adjuster:9`.
- **Switcher mount verdict:** a **single consolidated global nav** (extract the 12 inline navs into one component in/under `layout.tsx`), with the NBA/NFL switcher mounted there. Dashboard-level toggle is wrong scope (sport must affect picks/tools/tracker/portal); per-tool selector fragments state across every page. Selected sport then feeds the data-layer sport filter.

---

## 3. NFL-READINESS VERDICTS

### Schema path — league column vs parallel tables
**Frontend evidence points to (a) a single `sport` column on existing `picks_*` tables — a scalar scope mirroring `brand_id`.** This is a frontend-inferred recommendation; the definitive count of DB indexes/unique-constraints/agent code paths belongs to SECTION A (backend), which was not run here (see UNDETERMINED).
- **For (a) league column:** the app already threads exactly one scalar tenant scope (`BRAND.slug`→`brand_id`) through ~48 query sites; adding `.eq('sport', sport)` beside each is the lowest-surface, pattern-consistent change. Gate logic (`TOOL_MIN_TIERS`, `TIER_FEATURES`) is sport-agnostic and untouched. Team/position are already opaque strings. Count of frontend changes ≈ the ~48 query sites + one sport source.
- **Against (b) parallel `nfl_picks_*` tables:** would fork every query site into sport-branched table names, double the Supabase surface, and duplicate the resolver/accuracy plumbing — with no frontend benefit, since the gate/tier/nav layers don't care about sport.
- **Route-segment option (`/nba`, `/nfl`) is rejected** regardless of schema: it forces restructuring the app tree + rewriting all 12 NAV arrays + every link, and still needs the data-layer sport filter on top.

### Top 5 things that BREAK if NFL is added naively
1. **The projection engine** (`lib/picks/model.ts`) produces only `projPts/projReb/projAst` from basketball constants (pace 99.3, defRating 115.5, rebsPer36…). Feeding NFL data yields nonsense — needs a sport-dispatched engine, not new inputs. **(hard blocker)**
2. **`StatType` union** (`types.ts:2`) and all `proj_pts/reb/ast` fields — NFL stats (pass yds, rush yds, receptions, TDs) have no home; every consumer type breaks or silently drops them.
3. **`BASELINE_SEASON='2024-25'`** (`api/tools/lineup-adjuster:103`) + `.eq('season',…)` — NFL is single-year (`'2024'`); the format mismatch silently returns zero rows.
4. **`nba_players_reference` table + `nba_game_id`** hardcoded in players/search, players/stats, today-matchups, lineup-adjuster — NFL players simply won't resolve (autocomplete + prefill return empty).
5. **Daily cron cadence** (`vercel.json`: 9 jobs on `* * *`, seeder `* * 2,5`) assumes one slate/day; NFL is weekly (Thu/Sun/Mon, byes). Naive reuse fires NFL agents every day against no slate.

### Top 5 things REUSABLE as-is (or near-as-is)
1. **Tier/gating infra** (`canAccess`, `canUseTool`, `TOOL_MIN_TIERS`, `TIER_FEATURES`, Clerk wallet lookup) — fully sport-agnostic.
2. **`brand_id` tenancy pattern** — the exact rail a `sport` scalar rides on; ~48 sites already parameterized on one scope scalar.
3. **`operator/run-agent` dispatch** — additive: extend `ALLOWED_AGENTS` + the `picks-` URL template; no logic rewrite (B3).
4. **Backtester + Tracker** — resolved-picks aggregation/ledger keyed on generic `stat_type`/`result`/`confidence`; only the stat-filter enum needs to be sport-driven.
5. **`team`/`position` string columns, Stripe/Clerk/Supabase plumbing, edge/confidence display** — opaque to sport.

### Recommended build order (S/M/L) — frontend portions only
> Backend (migrations → agents → engine) precedes frontend per the mission; sizes below are the FRONTEND work, assuming the backend already emits NFL rows with a `sport` value.
1. **Data-layer `sport` scope (M)** — add a `sport` scalar source (route or user-state) and thread `.eq('sport', sport)` through the ~48 query sites; parameterize `nba_players_reference`/`season` by sport.
2. **Consolidate nav + mount sport switcher (M)** — extract the 12 inline navs into one component under `layout.tsx`; add the NBA/NFL switcher; wire it to the sport scope. (Also retires a real duplication liability.)
3. **Generalize stat vocabulary (M→L)** — turn `StatType` and the `['pts','reb','ast']` hardcodes into a sport-keyed stat map; drives Backtester filter, Tracker labels, table headers.
4. **Sport-dispatched projection surface (L)** — the Projection Runner + `model.ts` are basketball engines; NFL needs a parallel `model_nfl.ts` + `ProjectionInputsNFL` + a runner variant. Largest single piece.
5. **Reconcile tier-gate duplication + close gating holes (S)** — collapse `brand.ts`/`tiers.ts` to one source; add auth to `POST /api/picks`, tier check to `backtester`, operator gate to dashboard/publish. Pre-NFL hygiene; small but should precede a second product line.
6. **Decide Lineup Adjuster / Matchup Builder fate (L or defer)** — no clean NFL analog; likely NBA-only or a ground-up NFL replacement, not a port.

---

## 4. UNDETERMINED

- **Definitive schema-path decision (league column vs parallel tables).** Requires SECTION A (backend `datanexus-backend`) — actual `picks_*` DDL, indexes, unique constraints, and agent write paths — which I could not inspect from this repo. To resolve: run the backend recon or a schema-inspection `SELECT` against the live Supabase (no console access here).
- **Whether the backend exposes `/agents/picks-<agent>/run` per sport or a sport-parameterized path.** The frontend hardcodes the `picks-` prefix (`run-agent:52`); whether NFL agents are `picks-nfl-*` or a separate namespace is a backend contract. Need the Railway agent registry.
- **Live vs config drift for `BACKEND_URL`, `CRON_SECRET`, `stripePriceId`, Supabase keys.** Source shows placeholder/empty defaults; whether Vercel env vars are actually set in prod is not verifiable from source. Would need `vercel env ls` (MCP unauthorized this session) or the Vercel dashboard.
- **Does any table track opponent-pace history per team per game (cross-sport pace feature)?** This is a DB-schema question (Section A); the frontend only consumes `opponent_pace`/`opponent_def_rating` fields from `picks_matchups` (`today-matchups:9-39`) and cannot confirm historical granularity.
- **Env var KEY inventory (grouped).** Frontend reads at minimum `BACKEND_URL`, `CRON_SECRET`, and (via libs) Supabase + Clerk + Stripe + Resend keys; a complete grouped KEY-name list was not exhaustively enumerated this run — flag for a focused `process.env` sweep if the ops section is needed frontend-side.

---
*End of frontend recon. No files modified except this report. `brand_id='datanexus'` untouched. No deploys, no migrations.*
