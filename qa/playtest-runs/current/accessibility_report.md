# Accessibility Tester Report

Date: 2026-05-16
Build: Franchise Ice v0.1.0 | Phase 13 Facility Masterplan | schema v8 | beta
Agent: accessibility_tester
Report File: qa/playtest-runs/current/accessibility_report.md

## Coverage

Commands verified in the shared current pass:

- `npm run typecheck`: passed.
- `npm test`: passed after sandbox config-access rerun; 16 files / 252 tests.
- `npm run test:smoke`: passed after sandbox config-access rerun; 6 files / 106 tests.
- `npm run build`: passed after sandbox config-access rerun; known large chunk warning.
- `npm run check`: passed end to end.

Browser coverage:

- Inspected Operations Map DOM and control labels.
- Verified browser console warning/error log was empty.
- Did not run a full screen-reader session.
- Did not manually test reduced motion or contrast toggles in this pass.

## Finding QA-001: Operations Map controls lack destination-specific accessible names

Severity: medium
Confidence: high
Area: Accessibility
Room/Flow: Facility HUD -> Operations Map
Repro Steps:
1. Enter demo franchise.
2. Open Operations Map.
3. Inspect map pin buttons and direct navigation controls.
Expected:
Every interactive destination control should have a clear accessible name identifying its room and district.
Actual:
Pin buttons lack explicit descriptive accessible labels, visible shorthand can be combined with badge counts, and repeated `Go to room` buttons do not identify the destination on their own.
User Impact:
Screen-reader and keyboard users may not be able to confidently choose rooms from the map. The issue affects a central Phase 13 navigation surface, so it is medium severity even though mouse navigation works.
Evidence:
Browser DOM inspection of `.ops-map__pin`; DOM snapshot with repeated `button "Go to room"` entries; source review of `src/components/hud/OperationsMap.tsx`.
Likely Files:
`src/components/hud/OperationsMap.tsx`
Suggested Fix Direction:
Add destination-specific `aria-label` values or equivalent accessible text for map pins and route buttons, and keep badge counts semantically separate.
Acceptance Criteria:
Each interactive room control exposes a unique, descriptive accessible name including room and district, with badge counts announced clearly or hidden when decorative.

## Completion

Accessibility baseline is acceptable for continued closed-beta testing after logging one medium-severity Operations Map issue. Do not implement fixes as part of this report.
