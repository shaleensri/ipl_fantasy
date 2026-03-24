# IPL Fantasy Draft — Project Plan

Mobile-first fantasy cricket for a private group of friends: join a league with a **code**, run an **NFL-style snake draft**, play **head-to-head** each gameweek, and align rounds to IPL **match slates** (roughly **6–8 games** per gameweek when the schedule allows).

**Distribution:** web only — **no App Store / Play Store**. Ship as a **responsive, mobile-first** site; optionally add **PWA** (install to home screen, full-screen chrome).

---

## Product goals

| Goal | Notes |
|------|--------|
| Private leagues | Commissioner creates league; friends **join with a short code** (or share link containing the code). |
| Snake draft | Fixed draft order; order **reverses each round** (1→N, N→1, …). |
| Timed picks | Configurable pick clock (e.g. 60s / 90s / 2m). |
| Autopick | If time expires, system picks a player **deterministically** using a **sensible** rule (see below) — **not random**. |
| Season play | **Head-to-head**: each gameweek your team faces one other team; standings from wins/losses (+ optional tiebreakers). |
| Gameweeks | Define windows tied to IPL schedule (e.g. a set of matches or Fri–Sun blocks); **~6–8 games** per week when possible. |
| Lineups | Users set starters (and bench) before **lock** (first ball of gameweek or first match in slate — product decision). |

---

## Autopick (non-random, sensible)

Autopick must be **repeatable** (same state → same pick) and **explainable** (“we took the best available X because …”). Suggested **single algorithm** the whole league agrees on (document in league settings):

### Inputs

1. **Master list** — Ordered player list before draft starts (e.g. `rank = 1` best). Source: commissioner upload (CSV), or built-in preseason ranks, maintained as an **`player_ecr` (expected draft position)** or **`consensus_rank`** per season.
2. **Eligibility** — Only players **not yet drafted** and marked **eligible** (in squad, not withdrawn, etc.).
3. **Roster rules** — Min/max per **role** (e.g. batter, bowler, all-rounder, keeper — match your scoring rules), roster size, starting vs bench slots.

### Algorithm (recommended order)

1. **Build the set** of players who are **available** (undrafted + eligible).
2. **Need-based filtering** (optional but “smart”):
   - Compute **open starting slots**: which positions still need a starter for a **legal** lineup *assuming* you eventually fill the bench.
   - Prefer players who fill a **currently under-filled** position relative to minimum starters (e.g. if you still need a keeper and a bowler, restrict to those roles first).
3. **Candidate set**:
   - If **one or more roles** are “critical” (below minimum required for a full roster over remaining picks), restrict to players in those roles.
   - If **multiple roles** are tied for “most urgent”, keep the **union** of those roles (not random — see tiebreak below).
4. **Select player** among candidates:
   - Choose the available player with the **best (lowest) consensus rank** in the master list.
   - **Tiebreak** (strict, deterministic): lower `player_id` or alphabetical `(name, id)` — anything stable, documented, and server-side only.
5. **If no legal player** exists (edge case: impossible roster) — fall back to **best available overall** who keeps the roster **eventually** satisfiable; if still stuck, **best available overall** and log a warning for the commissioner.

This yields: **need-aware best player available (NBA-P)** without dice rolls.

### Draft room UX

- Show **“Autopick: on”** when the timer is enabled and whose pick it is.
- After autopick, show a one-line reason: *“Autopick: best available keeper (rank 42) — roster needed a keeper.”*

---

## Head-to-head & scoring (outline)

- **Schedule:** round-robin across teams; repeat if the season is long enough.
- **Points:** define rules (runs, wickets, economy, strike rate, catches, etc.) per match; sum **only matches in that gameweek** for starters.
- **Tiebreakers:** head-to-head record, then total points for season, then draft order — whatever the league settings say.

You can add **playoffs** (top N) later.

---

## Suggested technical stack

| Layer | Suggestion |
|-------|-------------|
| Frontend | **Next.js** (or similar) + TypeScript, **mobile-first** CSS (e.g. Tailwind). |
| PWA | `manifest.json`, service worker for shell/offline banner optional. |
| API / DB | **Postgres** + an ORM (Prisma/Drizzle) or **Supabase** (auth + DB + optional realtime). |
| Realtime draft | **Server-driven timer** + **WebSockets** or **Supabase Realtime** / polling fallback so everyone sees the same clock and pick. |
| Auth | Email magic link or OAuth; keep it simple for friends-only leagues. |
| Hosting | Vercel/Netlify (frontend), managed Postgres (Neon, Supabase, Railway). |

---

## Data model (first cut)

- **User** — identity, display name.
- **League** — name, settings (roster, scoring, pick time, autopick on/off), **invite_code**, commissioner_id, season/year.
- **Team** — league_id, user_id, team_name, draft_position (slot 1…N).
- **Draft** — league_id, status, `current_pick_index`, `pick_deadline_at` (server time).
- **Pick** — draft_id, round, overall, team_id, player_id, `picked_at`, `was_autopick` boolean.
- **Player** — name, team (franchise), role(s), external id, **consensus_rank**, active flag.
- **Gameweek** — league season slice: start/end, list of **match_ids** (or date range).
- **Matchup** — gameweek_id, team_a_id, team_b_id, scores computed after lock.
- **Lineup** — gameweek_id, team_id, starter flags per roster slot.

---

## Implementation checklist

### Phase 1 — Foundation

- [ ] Repo setup: lint, format, TypeScript, env example.
- [ ] Postgres schema + migrations for entities above.
- [ ] Auth (sign up / sign in / session).
- [ ] Create league + **generate invite code** + commissioner role.
- [ ] Join league by code + team name.

### Phase 2 — Player pool & settings

- [ ] Seed/import **IPL squad** players (CSV or API); **consensus_rank** column.
- [ ] League settings: roster size, positions, pick timer, **autopick enabled**.
- [ ] Commissioner tools: edit ranks / disable injured players (optional).

### Phase 3 — Snake draft

- [ ] Assign **snake order** (randomize once at draft start or manual order).
- [ ] Draft board UI (mobile): current picker, queue, available players, **timer**.
- [ ] **Make pick** + push update to all clients (realtime or poll).
- [ ] **Autopick worker**: on `pick_deadline_at` pass, run **need-aware best-rank** algorithm; advance pick; set next deadline.
- [ ] Draft complete → freeze rosters.

### Phase 4 — Season & H2H

- [ ] Import IPL **schedule**; define **gameweeks** (6–8 games where possible).
- [ ] Generate **H2H schedule** for league.
- [ ] Lineup screen + **lock** at gameweek start.
- [ ] Scoring job: after matches, aggregate points for starters; update matchup totals.
- [ ] Standings page (W-L, PF, tiebreakers).

### Phase 5 — Polish

- [ ] PWA manifest + icons.
- [ ] Email or in-app notifications for “you’re on the clock” (optional).
- [ ] Basic admin: reset pick only by commissioner (optional, dangerous — gate carefully).

---

## Configuration & secrets

- Document required env vars: `DATABASE_URL`, auth secrets, any cricket data API keys.
- Use **server time (UTC)** for draft deadlines; show **local time** in the UI.
- **Never** trust client time for autopick — only server `pick_deadline_at`.

---

## Open items to decide early

- Exact **roster positions** and **scoring** (points per stat).
- Whether **trades** / **waivers** exist post-draft (v1 can be “rosters fixed”).
- **Multi-league** per user vs one league per account focus for v1.
- **IPL data rights** — use only data you’re allowed to store and redistribute; many apps use licensed feeds or manual CSVs from public schedules.

---

## Success criteria for v1

- Friends can **create league**, **join with code**, and finish a **snake draft** on mobile.
- **Missed picks autopick** sensibly via **rank + roster needs**, not randomness.
- One full **H2H gameweek** works end-to-end: lineup lock → scores → winner.

---

*Last updated: aligned with “no app store,” mobile-first web/PWA, and deterministic autopick.*
