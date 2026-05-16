# Release Verification Report

Date: 2026-05-16
Build: Franchise Ice v0.1.0 | Phase 13 Facility Masterplan | schema v8 | beta
Agent: release_verifier
Report File: qa/playtest-runs/current/release_verification_report.md

## Command Suite

Release verifier command requirements:

- `npm run typecheck`: passed.
- `npm test`: passed after sandbox config-access rerun; 16 files / 252 tests.
- `npm run test:smoke`: passed after sandbox config-access rerun; 6 files / 106 tests.
- `npm run build`: passed after sandbox config-access rerun; 820 modules transformed.
- `npm run check`: passed end to end, including typecheck, full tests, smoke tests, and build.

Sandbox note:

- Initial Vite/Vitest commands that needed project config resolution failed inside the sandbox with access denied while trying to read `../..`.
- Those commands were rerun with approved escalation and passed.

Known build warning:

- Production build still reports large chunks after minification, including `three-r3f` at 748.52 kB. This is a known performance/watch item, not a new blocker in this pass.

## Browser Smoke

Production preview:

- URL: `http://127.0.0.1:4173/`
- Start screen loaded.
- Demo franchise loaded.
- Facility HUD loaded.
- Operations Map opened.
- Direct navigation to GM Office worked.
- Browser console warning/error log was empty.
- Screenshot saved at `qa/playtest-runs/current/phase13-hub.png`.

Browser limitations:

- Full first-hour, custom league creation, save export, feedback export, and reduced-motion/settings toggles were not completed manually.

## Finding QA-001: Operations Map controls lack destination-specific accessible names

Severity: medium
Confidence: high
Area: Release accessibility
Room/Flow: Facility HUD -> Operations Map
Repro Steps:
1. Enter demo franchise.
2. Open Operations Map.
3. Inspect map pins and room navigation buttons.
Expected:
Every interactive room destination should expose a meaningful accessible name.
Actual:
Pins lack explicit descriptive labels and repeated `Go to room` buttons do not identify destinations independently.
User Impact:
Assistive-tech users may struggle with the primary Phase 13 map navigation surface.
Evidence:
Browser DOM inspection; source review of `src/components/hud/OperationsMap.tsx`.
Likely Files:
`src/components/hud/OperationsMap.tsx`
Suggested Fix Direction:
Add destination-specific accessible labels for pins and direct route buttons.
Acceptance Criteria:
Each Operations Map room control has a unique accessible name with room and district.

## Finding QA-002: RoomPrompt visually concatenates action and breadcrumb

Severity: low
Confidence: high
Area: Release polish
Room/Flow: Demo entry -> Save Desk prompt
Repro Steps:
1. Enter demo franchise.
2. Inspect RoomPrompt.
Expected:
Action and breadcrumb text should be visibly separated.
Actual:
The text appears concatenated.
User Impact:
First facility impression feels less polished.
Evidence:
Screenshot `qa/playtest-runs/current/phase13-hub.png`; source review.
Likely Files:
`src/components/hud/RoomPrompt.tsx`, `src/styles/global.css`
Suggested Fix Direction:
Adjust prompt layout/spacing.
Acceptance Criteria:
Action and breadcrumb are readable and separated at common desktop widths.

## Finding QA-003: Demo GM Office starts with duplicate Assistant GM report headlines

Severity: low
Confidence: high
Area: Release polish
Room/Flow: Demo franchise -> GM Office
Repro Steps:
1. Enter demo franchise.
2. Open Operations Map.
3. Navigate to GM Office.
4. Inspect report list.
Expected:
Startup report headlines should be unique.
Actual:
Two urgent Assistant GM report headlines repeat.
User Impact:
First-hour guidance feels noisy.
Evidence:
Browser DOM inspection; source review of `src/game/systems/demoMode.ts`.
Likely Files:
`src/game/systems/demoMode.ts`, `src/components/rooms/GMOfficePanel.tsx`
Suggested Fix Direction:
Dedupe startup Assistant GM reports.
Acceptance Criteria:
Fresh demo GM Office has no duplicate urgent report headline.

## Finding QA-004: Custom League Lab is not clearly discoverable as a facility destination after franchise entry

Severity: low
Confidence: medium
Area: Release discoverability
Room/Flow: Start screen Custom League Lab -> Operations Map
Repro Steps:
1. Observe Custom League Lab on the start screen.
2. Enter demo franchise.
3. Open Operations Map.
4. Review Customization district.
Expected:
Players should understand where custom league/data-pack tools live in the current facility model.
Actual:
The Customization district does not clearly connect to the start-screen Custom League Lab.
User Impact:
Closed-beta testers may report custom league access as missing from the new facility.
Evidence:
Source/doc review and browser map inspection.
Likely Files:
`src/components/hud/OperationsMap.tsx`, `src/game/facility/facilityBlueprint.ts`, `FACILITY_BLUEPRINT.md`
Suggested Fix Direction:
Clarify labels or route hints without adding new gameplay systems.
Acceptance Criteria:
The Operations Map or room copy makes Custom League Lab's current availability clear.

## Release Gate

Status: pass with medium/low findings.

No blocker or high-severity issue was found. Do not implement fixes as part of this report.
