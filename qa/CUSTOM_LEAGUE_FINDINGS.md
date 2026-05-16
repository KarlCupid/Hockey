# Custom League Findings

## Finding QA-004: Custom League Lab is not clearly represented as a facility destination

Severity: low
Confidence: high
Area: Custom League / Facility Wayfinding
Room/Flow: Start-screen Custom League Lab vs in-facility Customization district
Repro Steps: Start demo franchise, open map, inspect Customization district.
Expected: A tester focused on custom leagues can discover where to revisit custom/data-pack tooling.
Actual: Customization district contains Dev Tools only; Custom League Lab remains a start-screen surface and data-pack tools are anchored through Save Desk.
User Impact: Custom league QA may depend on docs instead of in-game wayfinding once inside a franchise.
Evidence: Browser map DOM; `FACILITY_BLUEPRINT.md`; `src/game/facility/facilityBlueprint.ts`.
Likely Files: `src/game/facility/facilityBlueprint.ts`, `src/components/hud/OperationsMap.tsx`, `src/components/rooms/SaveLoadPanel.tsx`
Suggested Fix Direction: Add clear map/Save Desk copy for Custom League/Data Pack Library access, without adding a new room in this QA pass.
Acceptance Criteria: Custom-league testers can find custom/data-pack tools from the facility map or Save Desk text.

## No Functional Custom League Defects Found

Automated tests passed for 8-, 10-, 12-, and 16-team rule presets; deterministic schedules; supported playoff formats; draft sizing; custom franchise creation; first-game simulation; save import/export; Data Pack v2 repair; unsupported size rejection; obvious restricted hockey term flags; and two-season custom dry runs for 8/10/16 leagues.

