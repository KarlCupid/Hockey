# Franchise Ice Project Index

This index is the quick map for navigating the `Franchise Ice` prototype on GitHub.

## Project Snapshot

- App: browser-based hockey management vertical slice
- Stack: Vite, React, TypeScript, Three.js, React Three Fiber, Drei, Zustand, localForage, Zod, Vitest
- Runtime style: client-only, no backend, no authentication, local saves only
- Game rule boundary: pure TypeScript systems under `src/game`
- UI boundary: React panels and HUD under `src/components`
- 3D boundary: React Three Fiber facility and broadcast visualization under `src/components/three`

## Run And Verify

```bash
npm install
npm run dev
npm test
npm run test:smoke
npm run build
```

## Entry Points

- `index.html`: Vite HTML entry
- `src/main.tsx`: React root mount
- `src/app/App.tsx`: start screen, load screen, Phase 7 new-franchise setup wizard
- `src/app/AppShell.tsx`: main facility shell, room modal routing, global controls, Phase 8 tutorial/hints/audio/shortcut wiring
- `src/store/franchiseStore.ts`: franchise state, save/load, lineup/tactics mutations, simulation application, tutorial, telemetry, achievements, and bug-report export actions
- `src/store/uiStore.ts`: active room and nearby room UI state
- `src/store/settingsStore.ts`: local UI/presentation settings, reduced motion/detail, autosave, confirmations, guide reset token, Phase 6 story-event preferences, Phase 7 Assistant GM/badge/cadence settings, and Phase 8 audio/accessibility/tutorial/telemetry settings
- `src/store/audioStore.ts`: generated Web Audio engine wrapper and safe cue playback state

## Core Game Systems

- `src/game/types.ts`: central domain types for players, teams, league state, saves, events, lineups, tactics, and results
- `src/game/constants.ts`: league constants, fictional team definitions, default tactics, tuning constants
- `src/game/rng.ts`: seeded deterministic RNG helpers
- `src/game/generators/generateLeague.ts`: franchise and league creation
- `src/game/generators/generatePlayers.ts`: fictional roster generation
- `src/game/generators/generateSchedule.ts`: 22-game round-robin schedule
- `src/game/systems/lineupValidation.ts`: lineup validation, duplicate/injury checks, auto-fill, chemistry
- `src/game/systems/tactics.ts`: tactic labels, descriptions, presets, and tactic identity summaries
- `src/game/systems/standings.ts`: record and standings updates
- `src/game/systems/morale.ts`: morale/form/fatigue bands and player notes
- `src/game/systems/playerNotes.ts`: coach read and management risk notes from player state
- `src/game/systems/lineIdentity.ts`: forward-line and defense-pair identity helpers plus fit notes
- `src/game/systems/resultPresentation.ts`: readable game result presentation and event filtering
- `src/game/systems/benchReport.ts`: period-by-period bench report and tactical recommendation helper
- `src/game/systems/broadcastPresentation.ts`: live broadcast scoreboard and event chip helper
- `src/game/systems/seasonSummary.ts`: selected-team season pulse and season-complete summary helper
- `src/game/systems/injuries.ts`: injury and fatigue risk selectors
- `src/game/systems/news.ts`: inbox/news generation from game state
- `src/game/systems/saves.ts`: localForage save serialization, metadata, load/delete helpers
- `src/game/systems/dynastyInvariants.ts`: full-franchise invariant checks for rosters, picks, prospects, phases, schedules, contracts, ratings, and JSON serializability
- `src/game/systems/dynastyPlaytest.ts`: deterministic multi-season dry-run harness with phase reports, champion history, cap health, roster health, and owner-security trend
- `src/game/systems/balanceReport.ts`: seeded balance report for scoring, economy, free agency, trades, draft/scouting, development, and owner gameplay
- `src/game/systems/tuning.ts`: Phase 4 target ranges and helper checks for simulation, economy, dynasty, draft, and development tuning
- `src/game/systems/rosterRules.ts`: Phase 5 active/scratch/affiliate/IR/prospect/retired roster rules, lineup eligibility, organization depth, and validation reports
- `src/game/systems/rosterManagement.ts`: roster move actions, cap-impact logging, depth charts, initial roster classification, and lineup repair after moves
- `src/game/systems/affiliate.ts`: simplified fictional affiliate identities, affiliate development ticks, promotion candidates, risk notes, and affiliate reports/news
- `src/game/systems/aiRosterManagement.ts`: AI roster repair for goalie/depth shortages, training camp, free agency, trades, new seasons, prospect top-ups, and emergency replacements
- `src/game/systems/trainingCamp.ts`: training-camp roster setup, cut recommendations, camp battles, AI finalization, and camp news
- `src/game/systems/reSigningBalance.ts`: focused re-signing acceptance harness by role, offer strength, and cap context
- `src/game/systems/ownerBalance.ts`: owner-goal balance sampling for successful, rebuilding, and contending team contexts
- `src/game/systems/phaseGuidance.ts`: labels, descriptions, checklists, recommendations, advance previews, and danger warnings for every season phase
- `src/game/systems/difficulty.ts`: Phase 7 difficulty, story-frequency, and game-mode labels/descriptions/tuning
- `src/game/systems/gmProfile.ts`: Phase 7 GM profile creation, background traits, summaries, and trait modifiers
- `src/game/systems/livingOpsTuning.ts`: Phase 7 event cadence, natural sentiment decay, media pressure, relationship drift, and chemistry drift helpers
- `src/game/systems/assistantGm.ts`: Phase 7 advisory report and recommendation generation plus report dismissal
- `src/game/systems/actionQueue.ts`: Phase 7 master action queue, urgent count, next-best action, and room badge generation
- `src/game/systems/narrativeTemplateEngine.ts`: Phase 7 template rendering, deterministic selection, decision/news creation, validation, and franchise context extraction
- `src/game/content/narrativeTemplates.ts`: Phase 7 fictional template library for press, owner, agent, player, team, media/fan, rivalry, playoff, draft, free agency, trade, development, and affiliate beats
- `src/game/systems/tutorial.ts`: Phase 8 guided tutorial state, step completion/dismissal/reset, contextual hints, and hint gating
- `src/game/content/guideTopics.ts`: Phase 8 Learn the Game codex content for major rooms and systems
- `src/game/systems/guide.ts`: guide search, room/action lookup, starter topics, and coverage validation
- `src/game/systems/achievements.ts`: local-only achievement registry, unlock/progress evaluation, and summary helpers
- `src/game/systems/milestones.ts`: franchise milestone timeline creation/evaluation and recent milestone helpers
- `src/game/audio/audioCues.ts`: generated/local-safe audio cue registry
- `src/game/audio/audioEngine.ts`: Web Audio oscillator/noise cue engine with safe no-op fallback
- `src/game/systems/broadcastStory.ts`: broadcast intro, turning point, narrative beats, three-stars presentation, fan reaction, and media prompt helpers
- `src/game/systems/accessibility.ts`: keyboard shortcut registry, contrast/scale helpers, reduced-motion/flash checks, and settings summary
- `src/game/systems/localTelemetry.ts`: capped local-only telemetry event buffer and summaries
- `src/game/systems/bugReport.ts`: local bug-report and diagnostic summary generation
- `src/game/systems/fanSentimentBalance.ts`: targeted fan sentiment scenario sampling for playtest tuning
- `src/game/systems/ownerGoalReporting.ts`: owner goal outcome capture before refresh and completion reports
- `src/game/systems/storyEngine.ts`: story event creation, inbox dedupe, low-priority grouping, phase stories, and milestone stories
- `src/game/systems/relationships.ts`: Phase 6 player relationships, generated agents, team dynamics, trust/chemistry/media bands, and relationship notes
- `src/game/systems/decisionEvents.ts`: Phase 6 decision-event generation, dedupe/caps, room filtering, resolution, expiry, and news follow-up
- `src/game/systems/storyArcs.ts`: Phase 6 story-arc trigger detection, update/cooldown/resolution, news, and decision hooks
- `src/game/systems/pressConferences.ts`: fictional press conference events, response previews, and media/fan outcomes
- `src/game/systems/ownerMeetings.ts`: owner meeting events, demand-level summaries, and owner-trust outcomes
- `src/game/systems/playerMeetings.ts`: player and team meeting events, meeting reasons, chemistry, trust, and role-satisfaction outcomes
- `src/game/systems/agentInteractions.ts`: fictional agent calls, agent pressure, negotiation modifiers, and relationship outcomes
- `src/game/systems/fanMedia.ts`: media narrative, fan pulse, columnist headline, and sentiment updates
- `src/game/systems/contracts.ts`: structured contracts, cap calculations, expiry/risk helpers
- `src/game/systems/draftPicks.ts`: initial pick generation, labels, values, and transfer helpers
- `src/game/systems/trades.ts`: team needs, trade block logic, package valuation, cap validation, AI evaluation, and trade application
- `src/game/systems/scouting.ts`: scouting assignments, certainty ticks, visible prospect reports, watchlist, and draft-board ordering
- `src/game/systems/development.ts`: development plan assignment, progress ticks, attribute growth, veteran decline, and workload risk
- `src/game/systems/seasonLifecycle.ts`: Phase 3 phase advancement, regular-season completion, offseason progression, new season setup, and dynasty validation
- `src/game/systems/playoffs.ts`: top-eight best-of-five playoff bracket, game/series/round resolution, champion handling, and playoff news
- `src/game/systems/draftExecution.ts`: draft lottery/order, traded-pick ownership, user/AI selections, draft grades, and draft history
- `src/game/systems/prospects.ts`: prospect rights, pipeline summaries, and entry-contract prospect signing
- `src/game/systems/contractNegotiation.ts`: simplified re-signing demands, offer evaluation, accepted contracts, UFA release, and RFA retention
- `src/game/systems/freeAgency.ts`: seven-day fictional free-agent market, user offers, AI signings, and market news
- `src/game/systems/staff.ts`: staff generation, staff market, hiring/replacing, contracts, and staff modifiers
- `src/game/systems/owner.ts`: owner goals, job security, goal progress, and owner evaluation messages
- `src/game/systems/playerLifecycle.ts`: aging, contract decrement, retirements, recovery, season-stat archive/reset, and offseason progression/regression
- `src/game/systems/history.ts`: season history, champions, awards, and franchise timeline helpers
- `src/game/generators/generateDraftClass.ts`: fictional 72-player draft-class generation
- `src/game/assets/teamBranding.ts`: fictional team color, crest, jersey, arena mood, lower-third, and personality registry
- `src/game/assets/jerseyTemplates.ts`: generated home/away/alternate jersey swatch data
- `src/game/assets/portraitRegistry.ts`: deterministic fictional player portrait keys and visual variants
- `src/game/assets/broadcastTheme.ts`: reusable fictional broadcast styling metadata
- `src/game/simulation/simulatePeriod.ts`: deterministic period simulation
- `src/game/simulation/simulateGame.ts`: full-game assembly, overtime, stars, coach notes, result shape
- `src/game/simulation/eventTimeline.ts`: timeline ordering and clock helpers
- `src/game/simulation/boxScore.ts`: box score builder

## UI And Room Panels

- `src/components/hud/TopBar.tsx`: team, record, date, next opponent, difficulty/story compact, urgent/Assistant GM counts, room/action status
- `src/components/hud/RoomPrompt.tsx`: interactable room prompt
- `src/components/hud/FirstDayChecklist.tsx`: first-session GM/head coach guidance checklist
- `src/components/hud/OperationsMap.tsx`: facility map, room-directory fallback navigation, and Phase 7 room badges
- `src/components/hud/ModalShell.tsx`: modal shell for facility room panels
- `src/components/hud/HelpOverlay.tsx`: keyboard controls, room guide, phase guide, sim modes, front-office basics, and save/load help
- `src/components/hud/GuideOverlay.tsx`: searchable Learn the Game guide/codex surface
- `src/components/hud/TutorialOverlay.tsx`: dismissible guided tutorial progress card
- `src/components/hud/ContextualHint.tsx`: room-aware tutorial hints
- `src/components/hud/AudioController.tsx`: unlocks generated audio after user gesture and wires UI cue feedback
- `src/components/hud/ErrorBoundary.tsx`: runtime fallback around lazy room and 3D surfaces
- `src/components/hud/LoadingPanel.tsx`: Suspense fallback for lazy-loaded panels and facility
- `src/components/hud/PlayerCard.tsx`: detailed player card
- `src/components/hud/DecisionEventCard.tsx`: reusable Phase 6 decision card with room navigation and option resolution
- `src/components/hud/StoryArcCard.tsx`: reusable Phase 6 storyline card
- `src/components/hud/RelationshipBadge.tsx`: trust/agent/role mini badge
- `src/components/hud/TeamDynamicsPanel.tsx`: chemistry, room mood, media, fan, and owner pulse panel
- `src/components/hud/AssistantGmReportCard.tsx`: Phase 7 Assistant GM report and recommendation card
- `src/components/hud/StatBadge.tsx`: compact stat display
- `src/components/hud/TeamBadge.tsx`: team identity mark
- `src/components/rooms/GMOfficePanel.tsx`: master action queue, Assistant GM reports, GM profile/difficulty card, inbox, schedule, recent results, owner/fan/media pressure, living-ops dashboard, and save access
- `src/components/rooms/RosterOfficePanel.tsx`: Phase 5 roster health, depth chart, active/scratch/affiliate/IR management, and roster move log
- `src/components/rooms/CoachOfficePanel.tsx`: lineup editor, auto-fill, validation, tactic sliders
- `src/components/rooms/LockerRoomPanel.tsx`: roster table, player cards, morale/form/fatigue/status
- `src/components/rooms/MedicalRoomPanel.tsx`: injury board and fatigue risk list
- `src/components/rooms/ContractCapOfficePanel.tsx`: cap summary, contracts, expiring deals, risk notes, and pick inventory
- `src/components/rooms/TradeWarRoomPanel.tsx`: player/pick trade builder, AI evaluation, trade block, and submit flow
- `src/components/rooms/ScoutingDepartmentPanel.tsx`: draft board, prospect reports, assignment controls, strategy presets, and watchlist
- `src/components/rooms/DevelopmentOfficePanel.tsx`: development plans, candidate ranking, selected-player notes, and recent updates
- `src/components/rooms/FreeAgencyOfficePanel.tsx`: Phase 3 free-agent market, filters, offer builder, AI signings, and advance controls
- `src/components/rooms/StaffOfficePanel.tsx`: current staff, staff market, role filters, staff modifiers, and staff moves
- `src/components/rooms/PressRoomPanel.tsx`: Phase 6 press conferences, media pressure, narratives, response options, and fan/media reaction
- `src/components/rooms/OwnerSuitePanel.tsx`: Phase 6 owner trust, goals, meetings, demand level, expectations, and response options
- `src/components/rooms/AgentDeskPanel.tsx`: Phase 6 agent list, client pressure, active agent calls, and negotiation impact notes
- `src/components/rooms/PlayerMeetingPanel.tsx`: Phase 6 players needing attention, team dynamics, player meetings, and team meetings
- `src/components/rooms/SettingsPanel.tsx`: reduced motion/detail, reduce flashes, high contrast, larger text, keyboard hints, audio volumes, tutorial mode/reset, telemetry, autosave, confirmation, difficulty/story display, Assistant GM, room badges, consequence preview, density, scale, and guide reset settings
- `src/components/rooms/DevToolsPanel.tsx`: development-only invariant, playtest, balance, narrative template, Assistant GM, action queue, cadence, and dry-run reporting tools
- `src/components/rooms/ArenaPanel.tsx`: matchup preview, instant sim, period sim, broadcast sim, result panel
- `src/components/rooms/GameResultCenter.tsx`: resolved post-game report with summaries, broadcast beats, turning point, fan/media reaction, consequences, and filtered event feed
- `src/components/rooms/StandingsPanel.tsx`: league standings, recent results, season summary, achievements, and franchise milestones
- `src/components/rooms/SaveLoadPanel.tsx`: autosave/manual slot UI, save repair/export/import, diagnostic summary, and bug-report export
- `src/components/branding/TeamCrest.tsx`: fictional generated SVG crests
- `src/components/branding/JerseySwatch.tsx`: generated jersey concept cards
- `src/components/branding/TeamBrandCard.tsx`: team-selection and brand display card
- `src/components/branding/PlayerPortrait.tsx`: deterministic fictional player portrait placeholders
- `src/components/branding/BroadcastPackage.tsx`: branded scorebug and lower-third components
- `src/components/ui`: Phase 4 reusable button, card, section header, table, dialog, empty state, warning callout, progress bar, tabs, and filter bar primitives

## 3D And Visualization

- `src/components/three/FacilityScene.tsx`: operations hub, primitive room props, Assistant GM terminal, setup plaque, markers, lighting
- `src/components/three/ThirdPersonController.tsx`: WASD movement, follow/orbit camera, nearby room detection
- `src/components/three/Avatar.tsx`: simple GM/coach avatar
- `src/components/three/RoomZone.tsx`: labeled glowing interactable room marker
- `src/components/three/ArenaVisualization.tsx`: stylized broadcast/rink event playback
- `src/components/three/Interactable.tsx`: lightweight grouping component for interactable scene elements

## Tests

- `src/tests/simulation.test.ts`: score validity, deterministic results, standings update
- `src/tests/lineupValidation.test.ts`: duplicate assignment and injured player validation
- `src/tests/saves.test.ts`: save serialization/deserialization roundtrip
- `src/tests/v11Systems.test.ts`: V1.1 pure helper coverage for player notes, line identity, tactics, result presentation, bench reports, broadcast score, news, and season pulse
- `src/tests/phase2Systems.test.ts`: Phase 2 coverage for contracts, picks, trades, scouting, development, migration, and serialization
- `src/tests/phase3Dynasty.test.ts`: Phase 3 coverage for lifecycle, playoffs, draft, prospects, contracts, free agency, staff, owner goals, history, player lifecycle, and save migration
- `src/tests/phase4Playtest.test.ts`: Phase 4 coverage for invariants, three-season playtests, save integrity, phase guidance, balance reports, branding registries, settings, and story dedupe
- `src/tests/phase5RosterEcosystem.test.ts`: Phase 5 coverage for roster statuses, cap treatment, roster moves, affiliates, AI repair, training camp, save migration, balance, and five-season dry runs
- `src/tests/phase6LivingOps.test.ts`: Phase 6 coverage for relationships, agents, team dynamics, decision events, story arcs, press/owner/player/agent meetings, integrations, save migration, and five-season story stress
- `src/tests/phase7GameFeel.test.ts`: Phase 7 coverage for difficulty/game modes, GM traits, narrative templates, cadence drift, Assistant GM, action queue, save migration, and five-season pressure/story playtests
- `src/tests/phase8ReleaseCandidate.test.ts`: Phase 8 coverage for tutorial, guide, achievements, milestones, audio, broadcast, accessibility, telemetry, bug reports, fan/owner reporting, save roundtrip, invariants, and mini smoke playtest

## Styles

- `src/styles/theme.css`: design tokens for the dark hockey-operations theme
- `src/styles/global.css`: layout, panels, HUD, room UI, tables, start screen, and broadcast styling

## Documentation

- `README.md`: user-facing run instructions and feature overview
- `AGENTS.md`: durable project rules for future Codex work
- `PLAN.md`: implementation milestones
- `IMPLEMENTATION_LOG.md`: decisions, verification, and known limitations
- `PROJECT_INDEX.md`: this navigation index
- `PLAYTEST_REPORT.md`: deterministic Phase 4, Phase 5, Phase 6, and Phase 7 playtest and balance report summary
- `RELEASE_NOTES.md`: Phase 8 release-candidate playtest notes, run instructions, known limitations, and safety/licensing notes

## Current Playable Flow

1. Start app and click `New Franchise`.
2. Choose one of 12 fictional teams.
3. Build a GM profile, choose a game mode, difficulty, story frequency, and optional opening preset.
4. Enter the 3D hockey operations facility.
5. Walk with `WASD`, approach room markers, and press `E`.
6. Read the GM Office Master Action Queue, Assistant GM report, inbox, schedule, pressure cards, and phase guidance.
7. Use room badges and quick actions to handle urgent decisions, roster blockers, draft picks, contracts, owner risk, staff vacancies, and market days.
8. Review roster health, call-ups/send-downs, scratches, affiliate depth, cap/contracts, draft picks, trade options, scouting assignments, development plans, staff, free agency, and living-ops pressure in the front-office rooms.
9. Use the Press Room, Owner Suite, Agent Desk, and Player Meeting Room to resolve fictional decision events with bounded consequences.
10. Review Locker Room relationship filters, player cards, active story arcs, and meeting needs.
11. Auto-fill or edit lines in Coach's Office.
12. Adjust tactics.
13. Enter Arena Bowl.
14. Simulate the next game instantly, period-by-period, or through broadcast mode.
15. Review score, events, box score, three stars, injuries, coach notes, and generated press/player/owner/agent fallout.
16. Check standings/news/player status/front-office changes.
17. Finish the regular season, resolve playoffs, archive history, run retirements, draft, re-sign, sign free agents, hire staff, complete training camp roster setup, and start the next season with AI roster repair.
18. Track local achievements and franchise milestones in the GM Office and Trophy Hall.
19. Export local diagnostics or a bug report from the Save Desk when playtesting.
20. Validate, repair, export, import, save locally, and load later from the Save Desk.

## Useful Change Targets

- Add a new room: update `RoomId` in `src/game/types.ts`, add a marker in `FacilityScene.tsx`, add modal routing in `AppShell.tsx`, then create a panel under `src/components/rooms`.
- Tune simulation: start with `src/game/constants.ts`, `src/game/simulation/simulatePeriod.ts`, and `src/game/simulation/simulateGame.ts`.
- Add player or team fields: update `src/game/types.ts`, then generation, save validation, and affected UI tables/cards.
- Add front-office behavior: start with a pure helper in `src/game/systems`, then wire it through `src/store/franchiseStore.ts` and room panels.
- Add living-ops behavior: start with `relationships.ts`, `decisionEvents.ts`, or `storyArcs.ts`, preserve repeat-key dedupe/event caps, then expose the result through the appropriate room panel.
- Add Phase 7 guidance/content behavior: start with `difficulty.ts`, `gmProfile.ts`, `livingOpsTuning.ts`, `assistantGm.ts`, `actionQueue.ts`, or `narrativeTemplateEngine.ts`, then expose it through GM Office, TopBar, Operations Map, Settings, Help, or Dev Tools.
- Add Phase 8 onboarding/polish behavior: start with `tutorial.ts`, `guide.ts`, `achievements.ts`, `milestones.ts`, `broadcastStory.ts`, `accessibility.ts`, `localTelemetry.ts`, or `bugReport.ts`, then expose it through AppShell, Help, GM Office, Trophy Hall, Save Desk, Settings, or Game Result Center.
- Add roster behavior: start with `src/game/systems/rosterRules.ts`, `src/game/systems/rosterManagement.ts`, and `src/game/systems/aiRosterManagement.ts`, then update `RosterOfficePanel.tsx` and affected transaction/signing flows.
- Add dynasty-phase behavior: start in `src/game/systems/seasonLifecycle.ts`, keep the phase transition serializable, then expose a small store action and phase-aware GM Office control.
- Add save metadata: update `src/game/systems/saves.ts` and `SaveLoadPanel.tsx`.
- Add tests for pure logic: place new `.test.ts` files under `src/tests`.

## Guardrails

- Keep all teams, players, brands, and headlines fictional.
- Keep the app client-only.
- Keep simulation logic pure and testable.
- Do not add backend, auth, cloud saves, real licensed hockey content, or non-serializable renderer/browser objects to franchise state.
- Phase 3 includes simplified free agency, contract renewal, draft execution, playoffs, and staff hiring.
- Phase 5 includes a simplified roster ecosystem with active roster, scratches, affiliate roster, injured reserve, prospect pipeline, call-ups/send-downs, AI roster repair, training camp setup, and affiliate development.
- Phase 6 includes fictional press conferences, owner meetings, agent calls, player conversations, team meetings, relationships, media/fan/owner sentiment, story arcs, and decision events.
- Phase 7 includes simplified difficulty/game-mode settings, GM profile/background traits, Assistant GM reports, narrative templates, event-cadence tuning, franchise setup options, and broader playtest tuning.
- Phase 8 includes tutorial/onboarding, Learn the Game guide content, achievements/milestones, local/generated audio, accessibility improvements, local telemetry, bug-report export, release-candidate smoke tests, fan sentiment sampling, owner goal reporting, and presentation polish.
- Waivers, buyouts, retained salary, contract clauses, arbitration, offer sheets, online play, backend/cloud saves, real branding, and playable on-ice hockey remain out of scope.
