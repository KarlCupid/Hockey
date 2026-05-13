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

## Current Scope

This prototype intentionally avoids backend services, authentication, real hockey licenses, real players, real teams, full contract negotiations, free agency, full draft execution, staff hiring, multiplayer, cloud saves, playoffs, and playable on-ice hockey physics.

## Controls

- `WASD`: move the GM/coach avatar
- Mouse drag/wheel: orbit and zoom the third-person camera
- `E`: open the highlighted room
- `Escape`: close the active panel

## Save Data

Saves are local-only through IndexedDB/localForage. There are three manual slots and one autosave created after completed games.
