# Franchise Ice

`Franchise Ice` is a browser-based vertical-slice prototype for a fictional third-person 3D hockey management game. You are both general manager and head coach: walk through a hockey operations facility, manage the roster, set lines and tactics, simulate games, read the fallout, check the standings, and save locally.

For a full map of the repository, see [PROJECT_INDEX.md](PROJECT_INDEX.md).

## Run

```bash
npm install
npm run dev
```

## Verify

```bash
npm test
npm run build
```

## What Is Included

- Vite + React + TypeScript app
- React Three Fiber third-person operations hub with WASD movement
- Fictional 12-team league with 22-game regular season per team
- Fictional rosters, player morale, form, fatigue, injuries, stats, and roles
- Structured contracts, salary cap, draft pick inventories, and tradeable pick assets
- Trade War Room with player/pick proposal building, cap validation, need fit, and AI accept/reject feedback
- Scouting Department with a 72-player fictional draft class, assignments, watchlist, fuzzy reports, and certainty growth
- Development Office with player development plans, progress ticks, workload risk, and small attribute growth
- Phase 3 dynasty lifecycle with playoffs, champion history, draft execution, prospect pools, re-signing, free agency, staff hiring, owner goals, retirements, aging, and new-season generation
- Phase 4 beta hardening with dynasty invariant checks, deterministic multi-season playtests, balance reporting, save integrity repair, settings/help, fictional branding, and panel-level code splitting
- GM Office, Coach's Office, Locker Room, Medical Room, Arena Bowl, Standings/Trophy Hall, and Save/Load panels
- Lineup editor with auto-fill, validation, injuries, duplicate prevention, role warnings, and chemistry notes
- Tactics sliders that affect simulation
- Deterministic pure TypeScript game simulation
- Instant simulation, period-by-period simulation, and arena/broadcast-style visualization
- Standings, box scores, event timelines, three stars, coach notes, news, inbox items, autosave, and three manual save slots

## V1.1 Prototype Upgrade

- First Day as GM/Head Coach checklist with collapsible guidance through the vertical slice
- Operations Map with current-room context and room-directory fallback navigation
- Deeper Locker Room roster filters, sorting, player cards, coach reads, and management risk notes
- Line and pair identity labels, expanded lineup warnings, tactic presets, and tactic identity summary
- Game Result Center with readable scoreboards, stories, scoring/penalty summaries, goalie stats, three stars, team comparison, takeaways, consequences, and filterable events
- Period-by-period Bench Reports with tactical recommendations before the result is applied
- Broadcast mode with live score progression, event chips, moment banners, speed controls, and explicit result application
- Expanded news reactions, richer standings pulse, top-four placeholder hunt projection, and season-complete summary
- Clearer local save metadata, overwrite/delete confirmations, autosave status, and load error display

## Phase 2 Front Office Expansion

Phase 2 turns the V1.1 lineup-and-sim slice into a deeper client-only franchise-management prototype. New room panels cover:

- Contract & Cap Office: cap summary, contract table, expiry pressure, contract risk notes, and draft pick inventory.
- Trade War Room: trade partner selection, team needs, player/pick asset selection, cap validation, AI trade evaluation, accepted/rejected outcomes, news, and transaction logging.
- Scouting Department: fictional draft class, draft-board strategies, watchlist, prospect detail reports, three scouting assignment slots, and post-game certainty gains.
- Development Office: up to five active player plans, focus/intensity choices, candidate ranking, progress after games, attribute updates, and fatigue/morale risk.

Older V1.1 saves are hydrated on load with default contracts, picks, scouting, development, trade history, and transaction-log fields.

## Phase 3 Dynasty Lifecycle Expansion

Phase 3 turns the one-season prototype into a client-only dynasty loop:

- Finish or sim the 22-game regular season, open the top-eight best-of-five playoff bracket, and crown/archive a champion.
- Run a simplified four-round draft that honors traded pick ownership, adds drafted players to prospect pools, and records draft history.
- Re-sign expiring players with immediate accept/reject feedback, release unsigned UFAs to free agency, and keep RFAs controlled.
- Use a seven-day fictional free-agent market with user offers, AI signings, cap checks, roster-limit checks, and market news.
- Hire and replace staff across coaching, scouting, medical, analytics, and assistant-GM roles; staff ratings lightly affect related systems.
- Advance through retirements, offseason aging/development/regression, fatigue/injury recovery, owner evaluations, owner goals, training camp, new schedules, new draft classes, and multi-season history.
- Browse expanded Trophy Hall history with champions, awards, franchise timeline, draft history, and season records.

Older V1.1/Phase 2 saves hydrate to schema version 3 with safe defaults for season phase, staff, owner goals, history, and prospect pools.

## Phase 4 Beta Hardening, Presentation, Balance, and Identity

Phase 4 strengthens the existing V1.1 + Phase 2 + Phase 3 game instead of adding another large rule layer:

- Pure dynasty invariant checks validate teams, rosters, draft picks, prospects, contracts, phases, schedules, playoff data, ratings bounds, and JSON serializability.
- A deterministic multi-season playtest harness can run three-season dry runs through regular season, playoffs, draft, re-signing, free agency, staff hiring, and training camp without mutating the active save.
- Balance reporting summarizes scoring, shots, power play rate, overtime, cap pressure, free-agent movement, draft quality, development, owner security, and champion history.
- Save integrity helpers validate, repair, export, and import JSON while keeping old schema-version 3 saves loadable.
- Phase guidance in the GM Office shows the current phase, recommended next step, checklist, advance preview, and danger warnings.
- Fictional team identity now uses generated crests, jersey swatches, portrait placeholders, and broadcast scorebug/lower-third components. No real hockey marks or external licensed art are used.
- Settings and help add reduced motion, reduced 3D detail, broadcast speed, autosave, confirmation, UI scale, table density, guide reset, and keyboard help.
- Heavy room panels, the 3D facility, and developer tools are lazy-loaded behind loading fallbacks and an error boundary.

## Current Scope

This prototype intentionally avoids backend services, authentication, real hockey licenses, real players, real teams, waivers, buyouts, retained salary, no-trade/no-move clauses, arbitration, offer sheets, multi-team trades, multiplayer, cloud saves, and playable on-ice hockey physics. Free agency, staff, contracts, draft execution, playoffs, and Phase 4 balance reporting are simplified fictional prototype systems.

## Controls

- `WASD`: move the GM/coach avatar
- Mouse drag/wheel: orbit and zoom the third-person camera
- `E`: open the highlighted room
- `H`: open help
- `M`: open the Operations Map
- `Escape`: close the active panel, help, or settings dialog

## Save Data

Saves are local-only through IndexedDB/localForage. There are three manual slots and one autosave created after completed games. The Save Desk shows schema version, phase, season, selected-team record, validation warnings, repair status, and JSON export/import controls.
