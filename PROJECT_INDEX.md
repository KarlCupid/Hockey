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
npm run build
```

## Entry Points

- `index.html`: Vite HTML entry
- `src/main.tsx`: React root mount
- `src/app/App.tsx`: start screen, load screen, team selection
- `src/app/AppShell.tsx`: main facility shell, room modal routing, global controls
- `src/store/franchiseStore.ts`: franchise state, save/load, lineup/tactics mutations, simulation application
- `src/store/uiStore.ts`: active room and nearby room UI state

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
- `src/game/simulation/simulatePeriod.ts`: deterministic period simulation
- `src/game/simulation/simulateGame.ts`: full-game assembly, overtime, stars, coach notes, result shape
- `src/game/simulation/eventTimeline.ts`: timeline ordering and clock helpers
- `src/game/simulation/boxScore.ts`: box score builder

## UI And Room Panels

- `src/components/hud/TopBar.tsx`: team, record, date, next opponent, room/action status
- `src/components/hud/RoomPrompt.tsx`: interactable room prompt
- `src/components/hud/FirstDayChecklist.tsx`: first-session GM/head coach guidance checklist
- `src/components/hud/OperationsMap.tsx`: facility map and room-directory fallback navigation
- `src/components/hud/ModalShell.tsx`: modal shell for facility room panels
- `src/components/hud/PlayerCard.tsx`: detailed player card
- `src/components/hud/StatBadge.tsx`: compact stat display
- `src/components/hud/TeamBadge.tsx`: team identity mark
- `src/components/rooms/GMOfficePanel.tsx`: inbox, schedule, recent results, owner/fan pressure, save access
- `src/components/rooms/CoachOfficePanel.tsx`: lineup editor, auto-fill, validation, tactic sliders
- `src/components/rooms/LockerRoomPanel.tsx`: roster table, player cards, morale/form/fatigue/status
- `src/components/rooms/MedicalRoomPanel.tsx`: injury board and fatigue risk list
- `src/components/rooms/ArenaPanel.tsx`: matchup preview, instant sim, period sim, broadcast sim, result panel
- `src/components/rooms/GameResultCenter.tsx`: resolved post-game report with summaries, consequences, and filtered event feed
- `src/components/rooms/StandingsPanel.tsx`: league standings, recent results, season summary
- `src/components/rooms/SaveLoadPanel.tsx`: autosave/manual slot UI

## 3D And Visualization

- `src/components/three/FacilityScene.tsx`: operations hub, primitive room props, markers, lighting
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

## Styles

- `src/styles/theme.css`: design tokens for the dark hockey-operations theme
- `src/styles/global.css`: layout, panels, HUD, room UI, tables, start screen, and broadcast styling

## Documentation

- `README.md`: user-facing run instructions and feature overview
- `AGENTS.md`: durable project rules for future Codex work
- `PLAN.md`: implementation milestones
- `IMPLEMENTATION_LOG.md`: decisions, verification, and known limitations
- `PROJECT_INDEX.md`: this navigation index

## Current Playable Flow

1. Start app and click `New Franchise`.
2. Choose one of 12 fictional teams.
3. Enter the 3D hockey operations facility.
4. Walk with `WASD`, approach room markers, and press `E`.
5. Read GM Office inbox/schedule.
6. Review Locker Room roster and player cards.
7. Auto-fill or edit lines in Coach's Office.
8. Adjust tactics.
9. Enter Arena Bowl.
10. Simulate the next game instantly, period-by-period, or through broadcast mode.
11. Review score, events, box score, three stars, injuries, and coach notes.
12. Check standings/news/player status changes.
13. Save locally and load later.

## Useful Change Targets

- Add a new room: update `RoomId` in `src/game/types.ts`, add a marker in `FacilityScene.tsx`, add modal routing in `AppShell.tsx`, then create a panel under `src/components/rooms`.
- Tune simulation: start with `src/game/constants.ts`, `src/game/simulation/simulatePeriod.ts`, and `src/game/simulation/simulateGame.ts`.
- Add player or team fields: update `src/game/types.ts`, then generation, save validation, and affected UI tables/cards.
- Add save metadata: update `src/game/systems/saves.ts` and `SaveLoadPanel.tsx`.
- Add tests for pure logic: place new `.test.ts` files under `src/tests`.

## V1 Guardrails

- Keep all teams, players, brands, and headlines fictional.
- Keep the app client-only.
- Keep simulation logic pure and testable.
- Do not add trades, draft, scouting, free agency, staff hiring, auth, backend, cloud saves, or real licensed hockey content in v1.
