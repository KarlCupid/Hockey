# Facility Navigation Tester Report

Date: 2026-05-16
Build: Franchise Ice v0.1.0 | Phase 13 Facility Masterplan | schema v8 | beta
Agent: facility_navigation_tester
Report File: qa/playtest-runs/current/facility_navigation_report.md

## Coverage

Commands verified in the shared current pass:

- `npm run typecheck`: passed.
- `npm test`: passed after sandbox config-access rerun; 16 files / 252 tests.
- `npm run test:smoke`: passed after sandbox config-access rerun; 6 files / 106 tests.
- `npm run build`: passed after sandbox config-access rerun; known large chunk warning.
- `npm run check`: passed end to end.

Areas inspected:

- `src/game/facility/facilityBlueprint.ts`
- `src/game/facility/facilityNavigation.ts`
- `src/game/facility/facilityWayfinding.ts`
- `src/components/three/FacilityScene.tsx`
- `src/components/hud/RoomPrompt.tsx`
- `src/components/hud/OperationsMap.tsx`
- `FACILITY_BLUEPRINT.md`
- `src/tests/phase13FacilityLayout.test.ts`

Browser coverage:

- Demo facility loaded into Central Concourse.
- Save Desk prompt rendered.
- Operations Map opened.
- Direct navigation to GM Office worked.
- Browser console warning/error log was empty.

## Finding QA-002: RoomPrompt visually concatenates action and breadcrumb

Severity: low
Confidence: high
Area: Facility navigation HUD
Room/Flow: Central Concourse -> Save Desk prompt
Repro Steps:
1. Start production preview.
2. Select `Try Demo Franchise`.
3. Inspect the bottom room prompt.
Expected:
Room action and route/breadcrumb information should be visually distinct.
Actual:
The prompt text runs together as `Enter Save DeskCentral Concourse -> Central Concourse -> Save Desk`.
User Impact:
Players can still navigate, but the prompt reads as unfinished and may make wayfinding feel less polished.
Evidence:
Browser screenshot `qa/playtest-runs/current/phase13-hub.png`; source review of `RoomPrompt.tsx` and CSS.
Likely Files:
`src/components/hud/RoomPrompt.tsx`, `src/styles/global.css`
Suggested Fix Direction:
Separate action and breadcrumb in layout and spacing without changing facility route data.
Acceptance Criteria:
Action, breadcrumb, and control hint remain legible and non-overlapping across common desktop widths.

## Finding QA-004: Custom League Lab is not clearly discoverable as a facility destination after franchise entry

Severity: low
Confidence: medium
Area: Facility district discoverability
Room/Flow: Start screen Custom League Lab -> in-facility Customization Lab district
Repro Steps:
1. Review the start screen, where `Custom League Lab` is a primary entry.
2. Enter a demo franchise.
3. Open Operations Map.
4. Inspect the Customization district and facility routes.
Expected:
Players who saw `Custom League Lab` on the start screen should understand where custom league/data-pack functionality lives after entering the facility, or why it is start-flow only.
Actual:
The facility contains a `Customization Lab` district, but the current blueprint maps that district to `devTools`; docs note Custom League Lab/Data Pack Library live inside Save Desk/start flow and that future room splits are reserved.
User Impact:
Closed-beta testers may search the facility for Custom League Lab and assume the map is missing a room.
Evidence:
Source review of `FACILITY_BLUEPRINT.md` and `src/game/facility/facilityBlueprint.ts`; browser Operations Map district review.
Likely Files:
`src/game/facility/facilityBlueprint.ts`, `src/components/hud/OperationsMap.tsx`, `FACILITY_BLUEPRINT.md`, `src/components/rooms/SaveLoadPanel.tsx`
Suggested Fix Direction:
Clarify in-facility labeling or route copy so players know Custom League Lab is a start/setup flow and where related local data-pack tools are available.
Acceptance Criteria:
Operations Map and/or relevant room prompt copy make Custom League Lab discoverability unambiguous without adding new gameplay systems.

## Completion

Core facility navigation is structurally sound and passes Phase 13 tests. Two low-severity clarity findings are queued. Do not implement fixes as part of this report.
