# Operations Map Tester Report

Date: 2026-05-16
Build: Franchise Ice v0.1.0 | Phase 13 Facility Masterplan | schema v8 | beta
Agent: operations_map_tester
Report File: qa/playtest-runs/current/operations_map_report.md

## Coverage

Commands verified in the shared current pass:

- `npm run typecheck`: passed.
- `npm test`: passed after sandbox config-access rerun; 16 files / 252 tests.
- `npm run test:smoke`: passed after sandbox config-access rerun; 6 files / 106 tests.
- `npm run build`: passed after sandbox config-access rerun; known large chunk warning.
- `npm run check`: passed end to end.

Browser coverage:

- Opened Operations Map from the demo facility.
- Verified filters: All, Core, Front Office, Hockey Ops, Team Wing, Arena, Media, Development, Customization, Utility.
- Verified current district and route summary.
- Selected GM Office and used direct `Go to room`.
- Inspected DOM labels for map pins and repeated navigation buttons.
- Console warning/error log was empty.

## Finding QA-001: Operations Map controls lack destination-specific accessible names

Severity: medium
Confidence: high
Area: Operations Map accessibility
Room/Flow: Facility HUD -> Operations Map -> map pins and room directory
Repro Steps:
1. Select `Try Demo Franchise`.
2. Open the Operations Map.
3. Inspect map pin buttons and direct navigation buttons through browser DOM/accessibility-relevant attributes.
4. Review repeated `Go to room` controls in the room directory.
Expected:
Each map pin and direct navigation button should expose a meaningful destination-specific accessible name.
Actual:
Map pin buttons do not define descriptive `aria-label` or `title` values, and visible labels can collapse into ambiguous text such as `Cap1`, `GM4`, `Meet1`, and `Press1`. Multiple directory buttons expose the repeated text `Go to room`.
User Impact:
Keyboard and screen-reader users cannot reliably identify which map control moves to which room. Badge counts may be announced as part of the room shorthand rather than as separate status.
Evidence:
Browser DOM inspection of `.ops-map__pin` controls; DOM snapshot showing repeated `button "Go to room"` controls; source review of `src/components/hud/OperationsMap.tsx`.
Likely Files:
`src/components/hud/OperationsMap.tsx`, optional focused UI/accessibility test.
Suggested Fix Direction:
Add destination-specific accessible names to pins and route buttons, separating room labels, districts, and badge counts for assistive tech.
Acceptance Criteria:
Each pin and `Go to room` button has a unique accessible name including room and district, and badge counts no longer produce ambiguous names like `GM4`.

## Finding QA-004: Custom League Lab is not clearly discoverable as a facility destination after franchise entry

Severity: low
Confidence: medium
Area: Operations Map information architecture
Room/Flow: Operations Map -> Customization district
Repro Steps:
1. Open Operations Map after entering a demo franchise.
2. Review the Customization district and destination list.
3. Compare to the start screen's `Custom League Lab` entry and facility blueprint documentation.
Expected:
The map should make it clear whether Custom League Lab is a room, a setup-only flow, or a Save Desk/local-data tool.
Actual:
The map exposes a `Customization Lab` district but does not clearly connect it to the player-facing Custom League Lab from the start screen.
User Impact:
Beta testers may expect the Operations Map to provide Custom League Lab access and may report the feature as missing from the facility.
Evidence:
Browser map review; `FACILITY_BLUEPRINT.md`; `src/game/facility/facilityBlueprint.ts`.
Likely Files:
`src/components/hud/OperationsMap.tsx`, `src/game/facility/facilityBlueprint.ts`, `FACILITY_BLUEPRINT.md`
Suggested Fix Direction:
Clarify Customization district copy or route hints without changing league-creation logic.
Acceptance Criteria:
Players can tell from the map or room copy where custom league/data-pack setup belongs in the current Phase 13 build.

## Completion

Operations Map interaction works for sighted mouse testing, including filtering and direct navigation. Accessibility labeling is the only medium-severity issue found. Do not implement fixes as part of this report.
