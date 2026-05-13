# Franchise Ice Implementation Log

## Major Decisions

- Built as a client-only Vite + React + TypeScript app.
- Kept simulation, generation, saves, standings, lineup validation, morale, fatigue, injury, and news logic outside React and Three.js.
- Used fictional teams and fictional player name pools only.
- Used primitive React Three Fiber geometry for the facility instead of imported assets.
- Used localForage for three manual save slots plus autosave.
- V1.1 kept the existing architecture and added polish through small pure helper systems plus targeted room/HUD components.
- Phase 2 keeps the app client-only and adds front-office depth through serializable state plus pure systems under `src/game/systems`.
- Phase 3 keeps the V1.1/Phase 2 architecture intact and adds the year-to-year dynasty lifecycle as typed client-only state.

## Files Added

- Project/tooling: `package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`
- Docs: `README.md`, `AGENTS.md`, `PLAN.md`, `IMPLEMENTATION_LOG.md`
- App/UI: `src/app`, `src/components`, `src/store`, `src/styles`
- Game systems: `src/game`
- Tests: `src/tests`

## V1.1 Changes

- Added first-day checklist, Operations Map, clearer room prompts, and stronger primitive room identity in the 3D facility.
- Expanded Locker Room roster filtering/sorting and player card context with coach reads, management risks, status bands, stats, injuries, and contracts.
- Added line/pair identity helpers, chemistry/fit notes, tactic presets, tactic summary cards, and expanded lineup warnings.
- Replaced the compact post-game card with a Game Result Center covering scoreboard, story, scoring, penalties, goalie stats, stars, comparison, takeaways, consequences, and filtered events.
- Changed period simulation to show Bench Reports and final preview before explicit one-time application.
- Upgraded broadcast mode with live scoreboard progression, event chips/banners, speed controls, skip-to-final, cancel, and explicit apply.
- Expanded news generation with streak pressure/excitement, injury, owner/fan, role frustration, goalie pressure, fatigue, standings, rival, and personality-driven stories.
- Improved Standings Hall with GP/differential table columns, selected-team pulse, top-four placeholder hunt projection, recent results, and fuller season-complete summary.
- Improved local save UX with clearer metadata, overwrite/delete confirmations, autosave status, and load error display.
- Added V1.1 pure helper tests.

## Phase 2 Front Office Expansion Changes

- Added structured `Contract`, `DraftPick`, `Prospect`, `ScoutingState`, `DevelopmentState`, `TradeProposal`, `TradeEvaluation`, and `TransactionLogItem` models.
- Added generated contracts from player age/overall/potential/role and salary-cap helpers for cap hit, cap space, expiry pressure, and risk notes.
- Added current and next season draft picks for every team, four rounds per season, with pick value and transfer helpers.
- Added a 72-player fictional draft class, scouting assignment slots, fuzzy visible reports, watchlist, draft-board ordering, and post-game certainty ticks.
- Added development plans with focus/intensity, progress after games, small attribute/overall growth, veteran decline risk, and aggressive workload fatigue/morale risk.
- Added trade valuation, team needs, trade block/untouchable logic, cap validation, AI accept/reject evaluation, trade application, news, and transaction logging.
- Added save hydration so older V1.1-style saves missing Phase 2 fields receive contracts, draft picks, scouting, development, trade history, and transaction defaults.
- Added Contract & Cap Office, Trade War Room, Scouting Department, and Development Office panels plus 3D facility/map routing.
- Expanded the GM Office with front-office room shortcuts and a transaction log.
- Added focused Phase 2 Vitest coverage for contracts, picks, trades, scouting, development, migration, and serialization.

## Phase 3 Dynasty Lifecycle Expansion Changes

- Added schema version 3 dynasty fields: season phase, current season id, playoff/offseason/free-agency state, staff state, owner state, history, and prospect pools.
- Added pure Phase 3 systems for season lifecycle advancement, playoff brackets, draft execution, prospect rights/signing, contract negotiation, free agency, staff, owner goals, player aging/retirements/recovery, and history/awards/timeline.
- Added top-eight best-of-five playoffs with series/round/champion resolution and playoff game simulation using the existing game engine.
- Added simplified four-round draft execution that honors traded pick owners, hides actual ratings until selection, records grades/history, and adds drafted players to prospect pools.
- Added prospect pipeline display and entry-contract prospect signing with cap and 30-player roster checks.
- Added re-signing demands and immediate offer accept/reject feedback, plus UFA release to the free-agent market and RFA rights retention.
- Added a seven-day fictional free-agent market with filters, user offers, AI signings, cap checks, roster checks, and market news.
- Added generated staff for every team, staff market, hire/release actions, and staff modifiers that lightly affect scouting, development, recovery, and negotiation calculations.
- Added owner goals, job-security evaluation, owner messages, and GM Office confidence display.
- Added offseason player aging, contract decrement, retirements, development/regression, fatigue/injury recovery, season-stat archiving/reset, new schedule generation, new draft class generation, and next-season setup.
- Expanded Trophy Hall with playoff bracket, champion history, awards, and franchise timeline.
- Added Free Agency Office and Staff Office panels, 3D facility markers/props, Operations Map entries, and phase-aware GM Office calendar controls.
- Added Phase 3 save hydration so V1.1/Phase 2 saves get safe dynasty defaults.
- Added `src/tests/phase3Dynasty.test.ts` with lifecycle, playoff, draft, prospect, contract, free agency, staff, player lifecycle, owner/history, and save coverage.

## Verification

- Passed: `npm install`
- Passed: `npm test` with 3 test files and 6 tests.
- Passed: `npm run build`.
- Passed browser smoke at `http://127.0.0.1:5173/` in headless Chrome via CDP:
  - Start screen rendered with load/new franchise controls.
  - Team selection showed 12 fictional clubs.
  - New Harbor City Blades franchise entered the 3D facility with a canvas, HUD, room labels, and Save Desk prompt.
  - Pressing `E` opened Save Desk; saving populated visible slot metadata.
  - WASD movement reached GM Office; pressing `E` opened the GM Office panel.
  - Arena panel opened from GM Office.
  - Instant simulation produced final score, box score, three stars, coach notes, event feed, standings/date progression, and autosave.
  - Period-by-period simulation completed all three periods and applied a final result.
  - Arena/broadcast mode opened, skipped to final, applied the result, and advanced the schedule.
  - Console error/warning capture was clean during smoke checks.
- Passed: `npm test` with 4 test files and 15 tests after V1.1 helper coverage.
- Passed: `npm run build` after V1.1 changes. Vite still reports the known large Three/R3F bundle warning.
- Passed: `npm test` with 5 test files and 34 tests after Phase 2 systems.
- Passed: `npm run build` after Phase 2 changes. Vite still reports the known large Three/R3F bundle warning.
- Passed: `npm test` with 6 test files and 70 tests after Phase 3 systems.
- Passed: `npm run build` after Phase 3 changes. Vite still reports the known large Three/R3F bundle warning.
- Passed browser smoke at `http://127.0.0.1:5173/` with the Codex in-app Browser using DOM/interaction/console checks:
  - New Franchise, team selection, First Day checklist, and Operations Map rendered.
  - GM Office inbox, Locker Room roster/player card, Coach Office tactic preset and auto-fill, Arena instant sim, period sim with Bench Report and explicit apply, broadcast sim with skip/apply, Standings Hall, and manual save were exercised.
  - Initial broadcast smoke revealed React duplicate-key warnings in the final result center; fixed by using stable indexed keys and full league team data for broadcast result presentation.
  - Rechecked broadcast apply flow after the fix with no new console errors or warnings.
  - In-app screenshot capture timed out on the WebGL-heavy scene, so smoke evidence used DOM snapshots, visible text waits, interaction results, and console logs.

## Known Limitations

- Waivers, buyouts, retained salary, contract clauses, arbitration, offer sheets, online play, backend/cloud saves, real branding, and playable on-ice hockey remain out of scope.
- Free agency, staff, contract renewal, draft execution, playoffs, and offseason progression are simplified fictional Phase 3 systems, not real-world rule simulations.
- Trade AI is deterministic and simplified; it supports players/picks/cap/needs but not clauses, retained salary, waivers, or multi-team deals.
- Scouting reveals fuzzy ranges and certainty; actual ratings are only exposed after draft selection.
- Development effects are intentionally small prototype ticks rather than a full player-growth model.
- Prospect rights do not include minor leagues yet; signing prospects adds them directly to the active roster when cap/roster rules allow.
- Job security can collapse, but the prototype does not fire the user or end the save.
- Arena/broadcast mode visualizes events with stylized markers rather than playable hockey physics.
- The production bundle is large because Three.js, React Three Fiber, and Drei ship in the first vertical-slice chunk; code splitting is a Phase 2 optimization.
- Browser screenshot capture can time out on the current WebGL scene in the Codex in-app Browser; DOM and console smoke checks still passed.
