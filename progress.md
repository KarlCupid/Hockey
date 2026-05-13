Original prompt: Upgrade Franchise Ice from V1.1 into a client-only Phase 2 Front Office Expansion with contracts, salary cap, draft picks, trades, scouting, prospects, development, migration, tests, rooms, and docs.

## 2026-05-13

- Read the requested repo docs and core files.
- Noted existing uncommitted edit in `src/components/three/ThirdPersonController.tsx` that fixes A/D movement; do not revert it.
- Added Phase 2 milestone to `PLAN.md`.
- Added Phase 2 domain types, generation, pure systems, save hydration, store actions, and the four new front-office panels.
- Existing Vitest suite passed after rerunning outside the sandbox because esbuild could not read config paths inside the sandbox.
- Added Phase 2 test coverage; final `npm test` passed with 5 files and 34 tests.
- Final `npm run build` passed; Vite still reports the known large Three/R3F chunk warning.
- Started Vite locally and confirmed the app shell responded at `http://127.0.0.1:5173/`; full Playwright smoke was unavailable because Playwright is not installed in the project and no browser automation tool was exposed.

## Phase 3 Dynasty Lifecycle Expansion

- Original Phase 3 prompt added after Phase 2 requested full year-to-year dynasty lifecycle without a rewrite.
- Updated `AGENTS.md` so simplified playoffs, draft execution, free agency, staff hiring, and contract renewal are allowed for Phase 3 while backend/online/real branding/waivers/buyouts/retained salary/clauses/arbitration/offer sheets remain out of scope.
- Added schema version 3 dynasty state, save hydration defaults, and pure systems for lifecycle, playoffs, draft execution, prospects, contract negotiation, free agency, staff, owner goals, player lifecycle, and history.
- Wired store actions for phase advancement, sim-to-end regular season, playoff simulation, draft picks, prospect signing, re-signing offers, free-agent offers/days, and staff hiring/releasing.
- Added Free Agency Office and Staff Office rooms/panels, phase-aware GM Office command center, playoff-aware Arena Bowl, expanded Trophy Hall, Draft Room behavior inside Scouting, and prospect pipeline in Scouting/Development.
- Added primitive 3D facility props/markers and Operations Map entries for Free Agency, Staff, and Draft Stage.
- Added `src/tests/phase3Dynasty.test.ts`; final `npm test` passed with 6 files and 70 tests.
- Final `npm run build` passed; Vite still reports the known large Three/R3F chunk warning.
- Browser automation is still not available through project dependencies; a local dev-server smoke can be done manually at the Vite URL.

TODO/suggestions:
- Consider code-splitting Three/R3F and heavy room panels later to reduce the production chunk warning.
- Add a richer minor-league/prospect development layer before making prospect signing stricter.
- Add more user-facing confirmations/modals for destructive offseason skips if Phase 4 deepens the calendar.
