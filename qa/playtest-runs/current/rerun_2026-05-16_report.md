# QA Agent Rerun Report

Date: 2026-05-16
Build: Franchise Ice v0.1.0 | Phase 13 Facility Masterplan | schema v8 | beta
Reason: User requested the QA-agent testing be run again after Codex crashed.

## Result

Status: pass with existing medium/low findings still open.

No new blocker or high-severity issue was found. No gameplay, facility, or system fixes were implemented.

## Automated Verification

- `npm run typecheck`: passed.
- `npm test`: sandbox attempt failed on config access; approved rerun passed 16 files / 252 tests.
- `npm run test:smoke`: sandbox attempt failed on config access; approved rerun passed 6 files / 106 tests.
- `npm run build`: sandbox attempt failed on Vite config access; approved rerun passed with 820 modules transformed.
- `npm run check`: sandbox attempt failed on Vitest config access; approved rerun passed typecheck, full tests, smoke tests, and build.

Known warning:

- Production build still warns that `three-r3f-DL5BcDvm.js` is larger than 600 kB after minification. This remains a watch item, not a new release blocker.

## Browser Verification

Browser method:

- Built production app.
- Started Vite preview at `http://127.0.0.1:4173/`.
- Used headless Chrome over DevTools Protocol.
- Captured screenshots and DOM/console evidence.

Verified:

- Start screen rendered `New Franchise`, `Try Demo Franchise`, `Continue`, `Custom League Lab`, `Beta Playtest Guide`, `Release Notes`, and `Install Locally`.
- Custom League Lab opened and showed working pack, library/rules/team/roster/draft/scenario/import-export tabs, and `Start Franchise`.
- Demo franchise loaded into the Phase 13 facility.
- TopBar, Save Desk context, RoomPrompt, First Day checklist, and Operations Map rendered.
- Operations Map showed district filters and floorplan pins.
- Browser console warning/error log was empty.

Screenshots:

- `qa/playtest-runs/current/phase13-start-rerun.png`
- `qa/playtest-runs/current/phase13-custom-league-rerun.png`
- `qa/playtest-runs/current/phase13-hub-rerun.png`
- `qa/playtest-runs/current/phase13-map-rerun.png`
- `qa/playtest-runs/current/phase13-gm-office-rerun.png`

Limitations:

- Full first-hour browser simulation was not completed.
- Custom League Lab was opened and inspected, but a custom league was not created from browser.
- Save/export and feedback/export flows were not manually completed.
- Accessibility setting toggles and reduced-detail/reduced-motion modes were not manually toggled.
- Automated GM Office navigation hit an ambiguous repeated `Go to room` control, so the duplicate Assistant GM report finding remains source-backed and should be manually retested after `QA-001`.

## Finding QA-001: Operations Map controls lack destination-specific accessible names

Severity: medium
Confidence: high
Area: Accessibility / Operations Map
Room/Flow: Facility HUD -> Operations Map
Repro Steps:
1. Enter demo franchise.
2. Open Operations Map.
3. Inspect map pins and direct navigation buttons.
Expected:
Every interactive room destination should have a clear accessible name with room and district context.
Actual:
Pins have no explicit descriptive labels, badge counts concatenate with shorthand labels, and repeated `Go to room` buttons do not identify destinations independently.
User Impact:
Screen-reader users, keyboard users, and automation cannot reliably distinguish room destinations.
Evidence:
Rerun DOM inspection; `qa/playtest-runs/current/phase13-map-rerun.png`; `src/components/hud/OperationsMap.tsx`.
Likely Files:
`src/components/hud/OperationsMap.tsx`
Suggested Fix Direction:
Add destination-specific accessible labels to pins and direct navigation buttons, and separate badge counts from room names.
Acceptance Criteria:
Every map pin and `Go to room` control has a unique accessible name and existing map navigation still works.

## Finding QA-002: RoomPrompt visually concatenates action and breadcrumb

Severity: low
Confidence: high
Area: Facility HUD
Room/Flow: Demo entry -> Save Desk prompt
Repro Steps:
1. Enter demo franchise.
2. Inspect the RoomPrompt near Save Desk.
Expected:
Action text and breadcrumb text should be visually separated.
Actual:
The prompt appears as `Enter Save DeskCentral Concourse -> Central Concourse -> Save Desk`.
User Impact:
First-hour wayfinding looks less polished even though the destination is understandable.
Evidence:
`qa/playtest-runs/current/phase13-hub-rerun.png`; `src/components/hud/RoomPrompt.tsx`.
Likely Files:
`src/components/hud/RoomPrompt.tsx`, `src/styles/global.css`
Suggested Fix Direction:
Lay out prompt action and breadcrumb as separate text elements with clear spacing/wrapping.
Acceptance Criteria:
Prompt text remains readable and separated at common desktop widths.

## Finding QA-003: Demo GM Office opens with duplicate Assistant GM report headlines

Severity: low
Confidence: medium
Area: First-hour / Assistant GM
Room/Flow: Demo franchise -> GM Office
Repro Steps:
1. Start demo franchise.
2. Open GM Office.
3. Inspect Assistant GM reports.
Expected:
Startup Assistant GM reports should be unique or clearly distinct.
Actual:
The original pass found duplicate urgent Assistant GM report headings. Source review still supports this risk because demo mode prepends a generated report to the generated franchise report list.
User Impact:
First-time testers may perceive the demo as noisy or duplicated.
Evidence:
Original browser DOM snapshot; `src/game/systems/demoMode.ts`; `src/game/generators/generateLeague.ts`.
Likely Files:
`src/game/systems/demoMode.ts`, `src/components/rooms/GMOfficePanel.tsx`, `src/game/generators/generateLeague.ts`
Suggested Fix Direction:
Dedupe demo startup reports or make the prepended demo report title/context distinct.
Acceptance Criteria:
Fresh demo GM Office shows no duplicate urgent Assistant GM report headline.

## Finding QA-004: Custom League Lab is not clearly represented as a facility destination

Severity: low
Confidence: high
Area: Custom League / Facility Wayfinding
Room/Flow: Start screen Custom League Lab -> in-facility Customization district
Repro Steps:
1. Open Custom League Lab from the start screen.
2. Enter demo franchise.
3. Open Operations Map.
4. Inspect the Customization district and related room routes.
Expected:
Players should understand where custom league/data-pack tools live after franchise entry, or that the lab is a pre-franchise setup flow.
Actual:
The start-screen lab opens successfully, but the in-facility Customization district does not clearly connect to that player-facing Custom League Lab.
User Impact:
Closed-beta testers may report the lab as missing from the facility even though the setup screen exists.
Evidence:
`qa/playtest-runs/current/phase13-custom-league-rerun.png`; `qa/playtest-runs/current/phase13-map-rerun.png`; `FACILITY_BLUEPRINT.md`; `src/game/facility/facilityBlueprint.ts`.
Likely Files:
`src/components/hud/OperationsMap.tsx`, `src/game/facility/facilityBlueprint.ts`, `src/components/rooms/SaveLoadPanel.tsx`, `FACILITY_BLUEPRINT.md`
Suggested Fix Direction:
Clarify in-facility map/directory/Save Desk copy for Custom League Lab and data-pack access without adding new league-rule systems.
Acceptance Criteria:
Closed-beta testers can find or understand the current custom league/data-pack flow from the facility.
