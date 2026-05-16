# Fix Verification Report

Date: 2026-05-16
Build: Franchise Ice v0.1.0 | Phase 13 Facility Masterplan | schema v8 | beta
Scope: implementation verification for `QA-001` through `QA-004`.

## Result

Status: passed.

All four queued findings from the rerun were implemented in order. No gameplay rule systems, facility coordinates, backend, auth, cloud saves, online sharing, network telemetry, real hockey branding, or external assets were added.

## Automated Verification

- `npm run typecheck`: passed.
- `npm run test:smoke`: passed after sandbox config-access rerun, 6 files / 108 tests.
- `npm run check`: passed after sandbox config-access rerun, 16 files / 254 tests, 6 smoke files / 108 tests, and production build.
- Build warning: the known large Three/R3F chunk warning remains.

## Browser Verification

Production preview: `http://127.0.0.1:4173/`

Screenshots:

- `qa/playtest-runs/current/phase13-hub-fixed.png`
- `qa/playtest-runs/current/phase13-map-fixed.png`
- `qa/playtest-runs/current/phase13-gm-fixed.png`

Observed:

- RoomPrompt text rendered as separate action and breadcrumb lines.
- Operations Map pins exposed labels such as `Select GM Office. Front Office Wing. Status: News 4, Decision 2`.
- Operations Map `Go to room` buttons exposed labels such as `Go to GM Office. Front Office Wing. Status: News 4, Decision 2`.
- Browser DOM found 0 unlabeled pins and 0 unlabeled direct room buttons.
- Badge counters were marked `aria-hidden`.
- Customization district note pointed Custom League Lab to title-screen setup and Save Desk to the in-franchise data-pack library.
- Direct GM Office navigation by accessible label worked.
- GM Office displayed one urgent Assistant GM headline.
- Browser console warning/error log was empty.

## Fixed Findings

## Finding QA-001: Operations Map controls need accessible destination labels

Severity: medium
Confidence: high
Area: Accessibility / Operations Map
Room/Flow: Operations Map floorplan pins and direct navigation
Repro Steps:
1. Start demo franchise.
2. Open Operations Map.
3. Inspect `.ops-map__pin` and `.ops-map__go` controls.
Expected:
Each control exposes a destination-specific accessible name.
Actual:
Fixed. Pins and direct navigation buttons now include room and district context.
User Impact:
Screen-reader users, keyboard users, and automation can distinguish room destinations.
Evidence:
`src/game/facility/facilityNavigation.ts`, `src/components/hud/OperationsMap.tsx`, browser DOM verification, `phase13-map-fixed.png`.
Likely Files:
`src/components/hud/OperationsMap.tsx`
Suggested Fix Direction:
Complete.
Acceptance Criteria:
Met.

## Finding QA-002: RoomPrompt action and breadcrumb run together visually

Severity: low
Confidence: high
Area: UI / Facility HUD
Room/Flow: Hub RoomPrompt near Save Desk
Repro Steps:
1. Start demo franchise.
2. Inspect RoomPrompt near Save Desk.
Expected:
Prompt action and breadcrumb are visually separated.
Actual:
Fixed. Browser DOM rendered `Enter Save Desk` and the breadcrumb on separate lines.
User Impact:
First-hour wayfinding reads more clearly.
Evidence:
`src/components/hud/RoomPrompt.tsx`, `src/styles/global.css`, `phase13-hub-fixed.png`.
Likely Files:
`src/components/hud/RoomPrompt.tsx`, `src/styles/global.css`
Suggested Fix Direction:
Complete.
Acceptance Criteria:
Met.

## Finding QA-003: Demo GM Office opens with duplicate Assistant GM report headlines

Severity: low
Confidence: high
Area: First-hour / Assistant GM
Room/Flow: Demo franchise -> Operations Map -> GM Office
Repro Steps:
1. Start demo franchise.
2. Navigate to GM Office.
3. Inspect Assistant GM report headlines.
Expected:
Fresh demo GM Office shows no duplicate urgent report headline.
Actual:
Fixed. Demo reports are deduped by date/type/headline and browser verification counted one urgent headline.
User Impact:
First-hour guidance feels less noisy.
Evidence:
`src/game/systems/demoMode.ts`, `src/tests/phase11PublicBeta.test.ts`, browser DOM verification, `phase13-gm-fixed.png`.
Likely Files:
`src/game/systems/demoMode.ts`
Suggested Fix Direction:
Complete.
Acceptance Criteria:
Met.

## Finding QA-004: Custom League Lab is not clearly represented as a facility destination

Severity: low
Confidence: high
Area: Custom League / Facility Wayfinding
Room/Flow: Start screen Custom League Lab -> in-facility Customization district
Repro Steps:
1. Enter demo franchise.
2. Open Operations Map.
3. Inspect Customization district and Save Desk copy.
Expected:
Closed-beta testers can understand where Custom League Lab and data-pack tools live in the current build.
Actual:
Fixed. Operations Map and Save Desk copy now clarify title-screen Custom League Lab and in-franchise data-pack library roles.
User Impact:
Custom-league testers have clearer wayfinding without adding a new facility room.
Evidence:
`src/components/hud/OperationsMap.tsx`, `src/components/rooms/SaveLoadPanel.tsx`, `src/game/facility/facilityBlueprint.ts`, `FACILITY_BLUEPRINT.md`.
Likely Files:
`src/components/hud/OperationsMap.tsx`, `src/components/rooms/SaveLoadPanel.tsx`
Suggested Fix Direction:
Complete.
Acceptance Criteria:
Met.
