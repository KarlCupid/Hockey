# UI UX Tester Report

Date: 2026-05-16
Build: Franchise Ice v0.1.0 | Phase 13 Facility Masterplan | schema v8 | beta
Agent: ui_ux_tester
Report File: qa/playtest-runs/current/ui_ux_report.md

## Coverage

Commands verified in the shared current pass:

- `npm run typecheck`: passed.
- `npm test`: passed after sandbox config-access rerun; 16 files / 252 tests.
- `npm run test:smoke`: passed after sandbox config-access rerun; 6 files / 106 tests.
- `npm run build`: passed after sandbox config-access rerun; known large chunk warning.
- `npm run check`: passed end to end.

Browser coverage:

- Start screen primary actions and beta links rendered.
- Demo facility entry rendered.
- TopBar readiness state rendered.
- RoomPrompt rendered.
- Operations Map filters, route summary, and direct navigation rendered.
- Console warning/error log was empty.

Limitations:

- This pass did not cover mobile viewport screenshots.
- This pass did not manually toggle accessibility or graphics settings.

## Finding QA-002: RoomPrompt visually concatenates action and breadcrumb

Severity: low
Confidence: high
Area: Facility HUD
Room/Flow: Demo entry -> Central Concourse -> Save Desk prompt
Repro Steps:
1. Enter the demo franchise.
2. Inspect the bottom RoomPrompt.
Expected:
The prompt should present a clear action label and a secondary route/breadcrumb label.
Actual:
The prompt reads as a single glued string: `Enter Save DeskCentral Concourse -> Central Concourse -> Save Desk`.
User Impact:
The first facility prompt feels less polished and may slow comprehension for closed-beta players.
Evidence:
Browser screenshot `qa/playtest-runs/current/phase13-hub.png`; source review of `RoomPrompt.tsx`.
Likely Files:
`src/components/hud/RoomPrompt.tsx`, `src/styles/global.css`
Suggested Fix Direction:
Apply clearer prompt text layout, spacing, or visual hierarchy.
Acceptance Criteria:
The RoomPrompt action and breadcrumb are visually separate and readable in the first demo facility state.

## Finding QA-003: Demo GM Office starts with duplicate Assistant GM report headlines

Severity: low
Confidence: high
Area: Demo guidance UI
Room/Flow: Demo franchise -> GM Office
Repro Steps:
1. Enter demo franchise.
2. Open Operations Map.
3. Navigate to GM Office.
4. Inspect report headlines.
Expected:
Initial GM reports should be unique and scannable.
Actual:
Two report cards share the same urgent Assistant GM headline.
User Impact:
The duplicate creates unnecessary cognitive noise in a first-hour guidance panel.
Evidence:
Browser DOM inspection; source review of `src/game/systems/demoMode.ts`.
Likely Files:
`src/game/systems/demoMode.ts`, `src/components/rooms/GMOfficePanel.tsx`
Suggested Fix Direction:
Dedupe demo startup report content by stable id/title.
Acceptance Criteria:
Fresh demo GM Office report headlines are unique.

## Finding QA-004: Custom League Lab is not clearly discoverable as a facility destination after franchise entry

Severity: low
Confidence: medium
Area: Feature discoverability
Room/Flow: Start screen Custom League Lab -> Facility Operations Map
Repro Steps:
1. Observe the start screen `Custom League Lab` action.
2. Enter a franchise.
3. Open Operations Map and review Customization destinations.
Expected:
Feature naming should make the relationship between Custom League Lab and the in-facility Customization Lab clear.
Actual:
The current facility district language does not clearly expose or explain the Custom League Lab after entry.
User Impact:
Closed-beta testers may think the feature is missing or disconnected from the new facility layout.
Evidence:
Browser review and source/doc review of `FACILITY_BLUEPRINT.md` and `facilityBlueprint.ts`.
Likely Files:
`src/components/hud/OperationsMap.tsx`, `src/game/facility/facilityBlueprint.ts`, `FACILITY_BLUEPRINT.md`
Suggested Fix Direction:
Clarify labels, route hints, or room copy for the current setup-only/customization relationship.
Acceptance Criteria:
Players can infer where custom league setup belongs without guessing.

## Completion

The current UI is closed-beta viable, with polish work concentrated in first-hour clarity and map accessibility. Do not implement fixes as part of this report.
