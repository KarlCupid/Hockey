# Franchise Ice Implementation Log

## Major Decisions

- Built as a client-only Vite + React + TypeScript app.
- Kept simulation, generation, saves, standings, lineup validation, morale, fatigue, injury, and news logic outside React and Three.js.
- Used fictional teams and fictional player name pools only.
- Used primitive React Three Fiber geometry for the facility instead of imported assets.
- Used localForage for three manual save slots plus autosave.

## Files Added

- Project/tooling: `package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`
- Docs: `README.md`, `AGENTS.md`, `PLAN.md`, `IMPLEMENTATION_LOG.md`
- App/UI: `src/app`, `src/components`, `src/store`, `src/styles`
- Game systems: `src/game`
- Tests: `src/tests`

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

## Known Limitations

- Trades, contracts, scouting, draft, free agency, staff hiring, and playoffs are represented only as Phase 2 placeholders.
- Arena/broadcast mode visualizes events with stylized markers rather than playable hockey physics.
- The production bundle is large because Three.js, React Three Fiber, and Drei ship in the first vertical-slice chunk; code splitting is a Phase 2 optimization.
