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
- Phase 4 hardens the existing client-only dynasty loop through invariants, dry-run playtests, balance reporting, save repair, fictional identity, settings/help, lazy loading, and targeted visual polish instead of adding another large rule-system layer.
- Phase 5 turns rosters into an organization-level ecosystem with active roster, scratches, affiliate, injured reserve, prospect pipeline, AI roster repair, training camp setup, and affiliate development while keeping waivers and other real-world CBA complexity out of scope.
- Phase 6 adds a living hockey-operations layer through fictional meetings, relationships, media/fan/owner pressure, agent dynamics, story arcs, and decision events while avoiding another real-world CBA/rules layer.
- Phase 7 improves game feel through difficulty/game modes, GM identity, narrative templates, Assistant GM guidance, action queues, room badges, setup presets, cadence tuning, and broader playtest reporting without adding real-world CBA complexity.

## Files Added

- Project/tooling: `package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`
- Docs: `README.md`, `AGENTS.md`, `PLAN.md`, `IMPLEMENTATION_LOG.md`
- App/UI: `src/app`, `src/components`, `src/store`, `src/styles`
- Game systems: `src/game`
- Tests: `src/tests`
- Phase 5 roster systems: `src/game/systems/rosterRules.ts`, `src/game/systems/rosterManagement.ts`, `src/game/systems/affiliate.ts`, `src/game/systems/aiRosterManagement.ts`, `src/game/systems/trainingCamp.ts`, `src/game/systems/reSigningBalance.ts`, `src/game/systems/ownerBalance.ts`
- Phase 5 UI/tests: `src/components/rooms/RosterOfficePanel.tsx`, `src/tests/phase5RosterEcosystem.test.ts`
- Phase 6 living-ops systems: `src/game/systems/relationships.ts`, `src/game/systems/decisionEvents.ts`, `src/game/systems/storyArcs.ts`, `src/game/systems/pressConferences.ts`, `src/game/systems/ownerMeetings.ts`, `src/game/systems/playerMeetings.ts`, `src/game/systems/agentInteractions.ts`, `src/game/systems/fanMedia.ts`
- Phase 6 UI/tests: `src/components/rooms/PressRoomPanel.tsx`, `src/components/rooms/OwnerSuitePanel.tsx`, `src/components/rooms/AgentDeskPanel.tsx`, `src/components/rooms/PlayerMeetingPanel.tsx`, `src/components/hud/DecisionEventCard.tsx`, `src/components/hud/StoryArcCard.tsx`, `src/components/hud/RelationshipBadge.tsx`, `src/components/hud/TeamDynamicsPanel.tsx`, `src/tests/phase6LivingOps.test.ts`
- Phase 7 systems/content: `src/game/systems/difficulty.ts`, `src/game/systems/gmProfile.ts`, `src/game/systems/livingOpsTuning.ts`, `src/game/systems/assistantGm.ts`, `src/game/systems/actionQueue.ts`, `src/game/systems/narrativeTemplateEngine.ts`, `src/game/content/narrativeTemplates.ts`
- Phase 7 UI/tests: `src/components/hud/AssistantGmReportCard.tsx`, updated setup wizard/GM Office/TopBar/Operations Map/Settings/Help/Dev Tools/facility, and `src/tests/phase7GameFeel.test.ts`

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

## Phase 4 Beta Hardening, Presentation, Balance, and Identity Changes

- Added `dynastyInvariants`, `dynastyPlaytest`, `balanceReport`, `tuning`, `phaseGuidance`, and `storyEngine` pure systems for multi-season validation, dry-run reporting, balance summaries, phase guidance, and inbox dedupe.
- Hardened regular-season completion and simulation goalie selection so dry-run seasons do not crash when offseason churn leaves a lineup with missing or invalid goalie references.
- Tuned scoring, salary generation, cap ceiling/floor, and AI free-agency signing pace toward a more playable multi-season balance profile.
- Expanded save helpers with integrity validation, repair, safe JSON deserialize, export, and import. Save metadata now includes schema version, phase, season, selected-team record, and warnings.
- Added fictional team branding registries plus generated crest, jersey swatch, portrait, and broadcast package components. No real hockey marks or external assets were added.
- Added settings/help surfaces for reduced motion, reduced 3D detail, broadcast speed, autosave, phase confirmations, UI scale, table density, sound placeholder, and guide reset.
- Added reusable UI primitives for buttons, cards, headers, data tables, confirmation dialogs, empty states, warnings, progress bars, tabs, and filters, then applied them to the GM Office phase command center and save integrity surfaces.
- Improved GM Office phase flow with labels, descriptions, checklists, recommended next actions, danger warnings, and advance previews.
- Added developer-only tools for invariant reports, one-seed playtests, balance summaries, and one/three-season dry runs that do not write into the active save.
- Lazy-loaded room panels, the 3D facility, and Dev Tools through `React.lazy`/`Suspense`, with loading fallbacks and an error boundary.
- Improved 3D facility identity with selected-team branding, trophy display scaling, reduced-detail behavior, and reduced-motion-aware broadcast presentation.
- Removed Drei `Environment` and Troika `Text` dependencies from the facility render path after browser smoke exposed blocked external HDR/font fetches. Facility lighting and room labels now use local lights and DOM labels only.

## Phase 5 Roster Ecosystem, Affiliate System, and AI Roster Management Changes

- Added schema version 4 roster state: `RosterStatus`, player acquisition/pathway metadata, affiliate teams, organization depth reports, roster move logs, roster validation reports, and global roster move history.
- Added simplified roster rules for active players, scratches, affiliate players, injured reserve, prospect rights, and retired players. Affiliate, IR, prospect-rights, and retired players are blocked from NHL lineup assignment.
- Updated cap helpers so active, scratched, and IR players count against active cap while affiliate, retired, and prospect-rights players do not.
- Added user roster movement actions for call-ups, send-downs, scratches, activations, IR placement/removal, and prospect signing to active or affiliate destinations, with serializable move/news/transaction records.
- Added one fictional affiliate for every team, affiliate development ticks, development reports, promotion candidates, risk notes, and Development Coach influence.
- Added AI roster repair for new franchises, save hydration, post-trade, post-free-agency, prospect-signing, training-camp, new-season, pre-game, and playtest contexts. Repair prioritizes existing depth, prospects, free agents, and only then low-cost fictional emergency replacements.
- Added training camp setup/finalization helpers with bubble players, recommended cuts, promotion candidates, and AI finalization for all teams.
- Tuned re-signing and owner-goal balance with focused sample harnesses, better RFA/UFA spread, team-context owner goals, and more reliable job-security gains after successful seasons.
- Added the Roster Office room, facility/map routing, roster health in the GM Office and TopBar, and roster-aware integrations across Coach Office, Locker Room, Contract/Cap, Free Agency, Trade, Scouting, Development, Settings, and Dev Tools.
- Updated dynasty invariants and playtests for five-season roster stress, duplicate ID protection, affiliate/IR lineup exclusion, prospect-rights consistency, emergency replacement tracking, owner security trend, and re-signing acceptance reporting.

## Phase 6 Living Hockey Operations, Relationships, Media, and Decision Events Changes

- Added schema version 5 living-ops state: decision events, story arcs, player relationships, fictional agent profiles, team dynamics, and media state.
- Added deterministic relationship and agent generation, team dynamics defaults, trust/role-satisfaction notes, relationship bands, and clamped 0-100 updates.
- Added decision-event generation for post-game pressure, phase transitions, roster moves, contract rejection, playoff moments, draft reactions, free-agency misses, trade rumors, and story-arc follow-ups.
- Added event dedupe, active-event caps, high-severity caps, expiry, room filtering, option previews, bounded consequences, and decision-generated news.
- Added story arcs for goalie controversy, star role demand, rookie breakout, trade rumor, contract standoff, rebuild tension, playoff pressure, rivalry escalation, owner pressure, locker-room split, prospect promotion, and free-agency pursuit.
- Added pure systems for press conferences, owner meetings, player meetings, team meetings, agent calls, fan sentiment, media narratives, and columnist headlines.
- Integrated agent relationship/personality plus player trust/role satisfaction into simplified contract demand and acceptance.
- Integrated living-ops hooks into post-game application, phase changes, roster moves, trade-block activity, contract offer rejection, draft selection, and failed free-agent offers.
- Added Press Room, Owner Suite, Agent Desk, and Player Meeting Room panels with 3D facility props, room prompts, Operations Map routing, and lazy AppShell routing.
- Expanded GM Office into a living organization dashboard with urgent decisions, active storylines, team dynamics, media/fan pulse, owner trust, agent pressure, and recommended meetings.
- Expanded Locker Room, PlayerCard, Contract/Cap, Trade War Room, Roster Office, Settings, Help, and Dev Tools with relationship, agent, story, decision, and sentiment surfaces.
- Updated save hydration/repair so schema 4 and older saves receive living-ops defaults, invalid decision/story references are removed, and relationship/dynamic values are clamped.
- Updated dynasty invariants and the dry-run playtest harness with living-ops checks, deterministic auto-resolution, event/story counts, owner trust, chemistry, media, fan, and player-trust trends.

## Phase 7 Game Feel, Difficulty, Narrative Content, Assistant GM, and Playtest Tuning Changes

- Added schema version 6 state for GM profile, difficulty tuning, Assistant GM reports, and narrative template version, with save hydration/repair for schema 5 and older saves.
- Added a five-step new-franchise setup wizard covering fictional team selection, GM name/background/avatar, game mode, difficulty, story frequency, and opening preset.
- Added difficulty/game-mode/story-frequency tuning for owner/media/fan pressure, trade strictness, contract demands, free-agent interest, injury/development/story multipliers, cap pressure, job-security volatility, and Assistant GM help level.
- Added GM background traits and applied them to contract negotiation, press/media outcomes, owner trust, player meetings, and relationship outcomes.
- Added a 140+ item fictional narrative template library plus a renderer/selector/validator that creates decision events and news without real hockey branding.
- Added living-ops cadence tuning with natural decay away from extreme values, bounded media pressure floors, relationship drift, chemistry drift, and deterministic story-frequency sampling.
- Added Assistant GM report/recommendation generation for roster blockers, cap pressure, expiring stars, prospects, owner risk, pending decisions, story arcs, draft/free-agency phases, staff vacancies, trade block signals, idle scouting, and missing development plans.
- Added Master Action Queue, urgent action count, next-best action helper, and room badges for GM Office, TopBar, and Operations Map.
- Updated Dev Tools with template validation, cadence/tuning comparison, sample narrative events, Assistant GM previews, action queue inspection, and difficulty playtest entry points.
- Updated dynasty playtest reporting with Assistant GM recommendation counts, urgent actions, cap pressure trend, contract acceptance rate, owner goal completion rate, and difficulty/story setup options.
- Added a subtle Assistant GM terminal and setup plaque to the 3D facility using primitive local geometry only.

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
- Passed: `npm test` with 7 test files and 96 tests after Phase 4 systems.
- Passed: `npm run build` after Phase 4 changes. Panel-level code splitting produced separate chunks for GM Office, Arena, Save Desk, Dev Tools, Settings, Staff, Free Agency, Scouting, Development, Contract/Cap, Trade, Coach, Standings, Locker, Medical, FacilityScene, and shared UI pieces. Removing external Drei environment/text helpers reduced the FacilityScene chunk to about 42.7 kB minified. Vite still reports a large `react-three-fiber` chunk, which remains the main known bundle warning.
- Ran deterministic Phase 4 dry-run reporting with seeds `40401`, `40402`, `40403`, `40404`, and `40405`. Each seed completed three seasons with zero fatal invariant errors. See `PLAYTEST_REPORT.md`.
- Passed browser runtime smoke at `http://127.0.0.1:5173/` with a new franchise, visible 1440x950 canvas, high screenshot color variance, and no page/console errors after removing external facility fetches. Headless WebGL still emits expected GPU stall performance warnings during screenshots.
- Passed browser smoke at `http://127.0.0.1:5173/` with the Codex in-app Browser using DOM/interaction/console checks:
  - New Franchise, team selection, First Day checklist, and Operations Map rendered.
  - GM Office inbox, Locker Room roster/player card, Coach Office tactic preset and auto-fill, Arena instant sim, period sim with Bench Report and explicit apply, broadcast sim with skip/apply, Standings Hall, and manual save were exercised.
  - Initial broadcast smoke revealed React duplicate-key warnings in the final result center; fixed by using stable indexed keys and full league team data for broadcast result presentation.
  - Rechecked broadcast apply flow after the fix with no new console errors or warnings.
  - In-app screenshot capture timed out on the WebGL-heavy scene, so smoke evidence used DOM snapshots, visible text waits, interaction results, and console logs.
- Passed: `npm test` with 8 test files and 109 tests after Phase 5 roster ecosystem changes.
- Passed: `cmd /c npx tsc --noEmit` after Phase 5 changes.
- Passed: `npm run build` after Phase 5 changes. Rollup now emits a separate `three-r3f` chunk for Three/R3F/Drei; Vite still warns because that dependency group is about 997 kB minified.
- Ran deterministic five-season roster stress coverage through `src/tests/phase5RosterEcosystem.test.ts` with seed `phase5-five-season`; the run completed with zero fatal roster invariant errors and preserved draft-pick ownership consistency.
- Passed in-app browser smoke for Phase 5 at `http://127.0.0.1:5173/`: new Harbor City franchise rendered the facility, Operations Map included Roster Office, Roster Office opened, roster health/depth/cap sections rendered, a scratch action updated the roster move log, and console warning/error capture was clean.
- Passed: `cmd /c npx tsc --noEmit` after Phase 6 living-ops changes.
- Passed: `cmd /c npm test` with 9 test files and 120 tests after Phase 6 living-ops changes.
- Passed: `cmd /c npm run build` after Phase 6 changes. Vite still reports the known large `three-r3f` dependency chunk warning.
- Ran deterministic five-season story stress with seed `phase6-five-season`: 0 fatal invariant errors, 6 decision events generated, 2 high-severity events, 6 story arcs started, 2 story arcs resolved, 0 active events left after dry-run auto-resolution, and 5 final story arcs within the cap.
- Passed: `cmd /c npm test` with 10 test files and 146 tests after Phase 7 changes.
- Passed: `cmd /c npm run build` after Phase 7 changes. Vite still reports the known large `three-r3f` dependency chunk warning.
- Ran deterministic Phase 7 difficulty/story comparison via `generatePhase7BalanceReport("harbor-city")`:
  - `relaxed / quiet`: 12 events, 3 high-severity, 9/2 arcs, media trend 13/2/6/2/2, 34 Assistant GM recommendations, 0 fatal errors.
  - `standard / normal`: 33 events, 2 high-severity, 7/4 arcs, media trend 6/6/6/6/6, 32 Assistant GM recommendations, 0 fatal errors.
  - `demanding / normal`: 38 events, 2 high-severity, 10/3 arcs, media trend 7/7/7/7/7, 35 Assistant GM recommendations, 0 fatal errors.
  - `hardcore / dramatic`: 56 events, 2 high-severity, 7/3 arcs, media trend 13/13/13/13/13, 25 Assistant GM recommendations, 0 fatal errors.
  - `rebuildChallenge / normal`: 36 events, 2 high-severity, 11/2 arcs, media trend 6/6/6/6/6, 33 Assistant GM recommendations, 0 fatal errors.
  - `pressureCooker / dramatic`: 63 events, 3 high-severity, 10/3 arcs, media trend 14/14/14/14/14, 31 Assistant GM recommendations, 0 fatal errors.

## Known Limitations

- Waivers, buyouts, retained salary, contract clauses, arbitration, offer sheets, online play, backend/cloud saves, real branding, and playable on-ice hockey remain out of scope.
- Free agency, staff, contract renewal, draft execution, playoffs, and offseason progression are simplified fictional Phase 3 systems, not real-world rule simulations.
- Trade AI is deterministic and simplified; it supports players/picks/cap/needs but not clauses, retained salary, waivers, or multi-team deals.
- Scouting reveals fuzzy ranges and certainty; actual ratings are only exposed after draft selection.
- Development effects are intentionally small prototype ticks rather than a full player-growth model.
- Affiliate development is simplified and does not simulate a full playable minor-league schedule.
- Emergency replacement players are a fictional roster-safety mechanism used only when existing depth, prospects, and free agents cannot restore minimum roster health.
- Cap treatment is simplified: active, scratched, and IR players count against active cap while affiliate players are cap-exempt in this fictional ruleset.
- Job security can collapse, but the prototype does not fire the user or end the save.
- Arena/broadcast mode visualizes events with stylized markers rather than playable hockey physics.
- The production bundle is large because Three.js, React Three Fiber, and Drei ship in the first vertical-slice chunk; code splitting is a Phase 2 optimization.
- Phase 5 adds a Rollup manual chunk for Three/R3F/Drei, but the 3D dependency group remains the largest production chunk.
- Re-signing and owner goals are improved with focused harnesses, but they remain simplified management-game approximations.
- Phase 6 conversations, relationships, agent behavior, media pressure, fan sentiment, and story arcs are fictional text-choice management approximations, not full dialogue simulation.
- Decision-event generation is intentionally capped and conservative, so not every roster or league change creates a meeting.
- Browser screenshot capture can time out on the current WebGL scene in the Codex in-app Browser; DOM and console smoke checks still passed.
- Phase 7 difficulty/game modes are simplified prototype tuning layers rather than exhaustive management simulations.
- Phase 7 narrative templates are procedural fictional snippets, not hand-authored full dialogue trees.
- The Assistant GM is advisory and does not auto-manage roster, line, trade, contract, or phase decisions.
