# Bug Backlog

## Finding QA-001: Operations Map controls need accessible destination labels

Severity: medium
Confidence: high
Area: Accessibility / Operations Map
Room/Flow: Operations Map floorplan pins and direct navigation
Repro Steps: Open a demo franchise, open Operations Map, inspect `.ops-map__pin` elements and repeated `.ops-map__go` buttons.
Expected: Each control has a meaningful accessible name such as `Select GM Office, Front Office Wing` and `Go to GM Office`.
Actual: Pins have no explicit `aria-label` or title. Their accessible text is short or badge-suffixed, for example `Cap1`, `GM4`, `Meet1`, and repeated directory buttons are simply `Go to room`.
User Impact: Keyboard and screen-reader users can technically reach rooms, but many controls are ambiguous and repeated.
Evidence: Browser DOM/evaluate output from current pass; source in `src/components/hud/OperationsMap.tsx` renders pin text from `room.shortLabel` and generic `Go to room`.
Likely Files: `src/components/hud/OperationsMap.tsx`
Suggested Fix Direction: Add destination-specific `aria-label`s for pins and `Go to room` buttons; hide badge counts from accessible names or include them in a deliberate label.
Acceptance Criteria: Screen-reader button names identify the room and action; badge counts do not concatenate into unclear names; keyboard navigation still opens rooms.

## Finding QA-002: RoomPrompt action and breadcrumb run together visually

Severity: low
Confidence: high
Area: UI / Facility HUD
Room/Flow: Hub RoomPrompt near Save Desk
Repro Steps: Start demo franchise and stand near Save Desk.
Expected: Prompt action and breadcrumb are visually separated, for example `Enter Save Desk` above `Central Concourse -> Central Concourse -> Save Desk`.
Actual: Screenshot shows `Enter Save DeskCentral Concourse -> Central Concourse -> Save Desk` with no clear spacing between action and breadcrumb.
User Impact: The interaction prompt is still understandable, but it looks unpolished and makes first-hour wayfinding feel less deliberate.
Evidence: Browser screenshot `qa/playtest-runs/current/phase13-hub.png`; `src/components/hud/RoomPrompt.tsx` renders `strong` and `span` inside an unstyled div; `src/styles/global.css` has no specific block layout for that text group.
Likely Files: `src/components/hud/RoomPrompt.tsx`, `src/styles/global.css`
Suggested Fix Direction: Style the prompt text wrapper as a column with a small gap and ensure mobile/compact widths wrap cleanly.
Acceptance Criteria: Prompt action and breadcrumb are separated at 1280x720, 1366x768, and compact desktop widths.

## Finding QA-003: Demo GM Office opens with duplicate Assistant GM report headlines

Severity: low
Confidence: medium
Area: First-hour / Assistant GM
Room/Flow: Demo franchise -> Operations Map -> GM Office
Repro Steps: Start demo franchise, open Operations Map, navigate to GM Office, inspect Assistant GM Reports.
Expected: Demo starts with one clear first recommendation or clearly distinct reports.
Actual: DOM snapshot showed two `Assistant GM: urgent work on the board` report headings with overlapping recommendation targets.
User Impact: First-time testers may feel the demo is noisy or duplicated before they understand the action queue.
Evidence: Browser DOM snapshot from current pass; `src/game/systems/demoMode.ts` prepends a generated Assistant GM report to existing generated reports.
Likely Files: `src/game/systems/demoMode.ts`, `src/components/rooms/GMOfficePanel.tsx`, `src/game/generators/generateLeague.ts`
Suggested Fix Direction: Dedupe demo startup reports or make the demo report title/context distinct.
Acceptance Criteria: Fresh demo GM Office shows no duplicate report headlines with overlapping urgent guidance.

## Finding QA-004: Custom League Lab is not clearly represented as a facility destination

Severity: low
Confidence: high
Area: Custom League / Facility Wayfinding
Room/Flow: Post-franchise facility navigation to custom league/data-pack tools
Repro Steps: Open Operations Map and filter `Customization`.
Expected: Tester can understand where Custom League Lab/Data Pack Library live after entering a franchise.
Actual: Customization Lab currently contains only Dev Tools; docs state Custom League Lab and Data Pack Library live in Save Desk/start flow and the customization district reserves a future branch.
User Impact: Custom-league testers may know the start-screen lab exists but not where to revisit related local data-pack tools inside the facility.
Evidence: `FACILITY_BLUEPRINT.md`; `src/game/facility/facilityBlueprint.ts` has Customization Lab roomIds `["devTools"]`; browser map filter showed Customization Lab with only one destination.
Likely Files: `src/game/facility/facilityBlueprint.ts`, `src/components/hud/OperationsMap.tsx`, `src/components/rooms/SaveLoadPanel.tsx`, docs/copy.
Suggested Fix Direction: Clarify in map/directory/Save Desk copy that Custom League/Data Pack Library lives at Save Desk for now, or add a future physical lab only in a dedicated feature pass.
Acceptance Criteria: A closed-beta custom-league tester can find data-pack/custom-league tooling from the facility without relying on prior docs.

