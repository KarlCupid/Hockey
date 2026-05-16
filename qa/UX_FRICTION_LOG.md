# UX Friction Log

## Finding QA-002: RoomPrompt action and breadcrumb run together visually

Severity: low
Confidence: high
Area: First-hour HUD
Room/Flow: Demo franchise near Save Desk
Repro Steps: Start demo franchise and observe the bottom RoomPrompt.
Expected: Prompt action and breadcrumb are visually separated.
Actual: `Enter Save DeskCentral Concourse -> Central Concourse -> Save Desk` appears visually joined.
User Impact: Adds small friction right at the first interactable room.
Evidence: `qa/playtest-runs/current/phase13-hub.png`; `src/styles/global.css` prompt styles.
Likely Files: `src/components/hud/RoomPrompt.tsx`, `src/styles/global.css`
Suggested Fix Direction: Make prompt text a vertical stack with a readable gap.
Acceptance Criteria: Prompt remains readable with no concatenation across common desktop widths.

## Finding QA-003: Demo GM Office opens with duplicate Assistant GM report headlines

Severity: low
Confidence: medium
Area: First-hour guidance
Room/Flow: Demo franchise -> GM Office
Repro Steps: Open GM Office from a fresh demo.
Expected: One clear first report or distinct reports.
Actual: Duplicate `Assistant GM: urgent work on the board` headings appeared in browser DOM.
User Impact: Makes the first GM Office read feel noisier than intended.
Evidence: Browser DOM snapshot; `src/game/systems/demoMode.ts`.
Likely Files: `src/game/systems/demoMode.ts`, `src/components/rooms/GMOfficePanel.tsx`
Suggested Fix Direction: Dedupe or distinguish demo startup reports.
Acceptance Criteria: Demo GM Office shows one primary first-hour report or clearly different report headings.

## Finding QA-004: Custom League Lab is not clearly represented as a facility destination

Severity: low
Confidence: high
Area: Custom League / Wayfinding
Room/Flow: Customization district after franchise start
Repro Steps: Open Operations Map and inspect Customization Lab.
Expected: Custom-league testers can tell where to revisit data-pack/custom-league tools.
Actual: Customization Lab maps to Dev Tools only, while Custom League Lab remains start-screen/Save Desk surfaced.
User Impact: Custom-league testing may depend on docs rather than in-game wayfinding.
Evidence: `FACILITY_BLUEPRINT.md`, `src/game/facility/facilityBlueprint.ts`, browser DOM.
Likely Files: `src/game/facility/facilityBlueprint.ts`, `src/components/hud/OperationsMap.tsx`, `src/components/rooms/SaveLoadPanel.tsx`
Suggested Fix Direction: Add user-facing facility copy pointing custom-league/data-pack testers to Save Desk, or split a future physical room in a later feature pass.
Acceptance Criteria: Map or Save Desk clearly explains where Custom League/Data Pack Library tools live.

