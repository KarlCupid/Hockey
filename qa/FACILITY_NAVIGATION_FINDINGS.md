# Facility Navigation Findings

## Finding QA-002: RoomPrompt action and breadcrumb run together visually

Severity: low
Confidence: high
Area: Facility HUD
Room/Flow: Central Concourse -> Save Desk prompt
Repro Steps: Start demo franchise and observe the bottom prompt near Save Desk.
Expected: Prompt action and breadcrumb are separated.
Actual: Browser screenshot shows the action and breadcrumb joined.
User Impact: The first facility interaction is understandable but visually rough.
Evidence: `qa/playtest-runs/current/phase13-hub.png`; `src/components/hud/RoomPrompt.tsx`; `src/styles/global.css`.
Likely Files: `src/components/hud/RoomPrompt.tsx`, `src/styles/global.css`
Suggested Fix Direction: Add a prompt content wrapper class and stack action/breadcrumb.
Acceptance Criteria: Prompt is readable at desktop and compact desktop viewports.

## Finding QA-004: Custom League Lab is not clearly represented as a facility destination

Severity: low
Confidence: high
Area: Facility / Customization district
Room/Flow: Operations Map -> Customization filter
Repro Steps: Open Operations Map and inspect Customization Lab destinations.
Expected: Facility wayfinding clarifies where custom league/data-pack tools live.
Actual: Customization Lab only exposes Dev Tools; docs say Custom League Lab/Data Pack Library are currently Save Desk/start-flow surfaces.
User Impact: Custom-league testers may miss in-facility data-pack access.
Evidence: `FACILITY_BLUEPRINT.md`; `src/game/facility/facilityBlueprint.ts`; browser map DOM.
Likely Files: `src/game/facility/facilityBlueprint.ts`, `src/components/hud/OperationsMap.tsx`, `src/components/rooms/SaveLoadPanel.tsx`
Suggested Fix Direction: Clarify current Save Desk ownership of data-pack/custom-league tools.
Acceptance Criteria: Facility map or Save Desk copy gives a clear path for custom-league testers.

## No Blockers Found

The Phase 13 facility blueprint itself validated in automated tests: 22 rooms, 9 districts, no duplicate room definitions, no severe overlaps, core rooms reachable, valid related-room IDs, valid map positions, first-hour route coverage, Assistant GM district labels, feedback/bug-report district context, and blueprint serialization.

