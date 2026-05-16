# Bug Backlog

## Finding QA-001: Operations Map controls need accessible destination labels

Status: fixed 2026-05-16
Severity: medium
Confidence: high
Area: Accessibility / Operations Map
Room/Flow: Operations Map floorplan pins and direct navigation
Repro Steps: Open a demo franchise, open Operations Map, inspect `.ops-map__pin` elements and repeated `.ops-map__go` buttons.
Expected: Each control has a meaningful accessible name such as `Select GM Office, Front Office Wing` and `Go to GM Office`.
Actual: Pins have no explicit `aria-label` or title. Their accessible text is short or badge-suffixed, for example `Cap1`, `GM4`, `Meet1`, and repeated directory buttons are simply `Go to room`.
User Impact: Keyboard and screen-reader users can technically reach rooms, but many controls are ambiguous and repeated.
Evidence: Browser DOM/evaluate output from current pass and rerun; rerun screenshot `qa/playtest-runs/current/phase13-map-rerun.png`; source in `src/components/hud/OperationsMap.tsx` renders pin text from `room.shortLabel` and generic `Go to room`. Rerun automation also clicked an ambiguous repeated `Go to room` control while attempting direct GM Office navigation.
Likely Files: `src/components/hud/OperationsMap.tsx`
Suggested Fix Direction: Add destination-specific `aria-label`s for pins and `Go to room` buttons; hide badge counts from accessible names or include them in a deliberate label.
Acceptance Criteria: Screen-reader button names identify the room and action; badge counts do not concatenate into unclear names; keyboard navigation still opens rooms.
Fix Evidence: `src/game/facility/facilityNavigation.ts` now generates destination labels; `src/components/hud/OperationsMap.tsx` applies them to pins and direct navigation buttons; browser verification found 0 unlabeled pins and 0 unlabeled `Go to room` controls.

## Finding QA-002: RoomPrompt action and breadcrumb run together visually

Status: fixed 2026-05-16
Severity: low
Confidence: high
Area: UI / Facility HUD
Room/Flow: Hub RoomPrompt near Save Desk
Repro Steps: Start demo franchise and stand near Save Desk.
Expected: Prompt action and breadcrumb are visually separated, for example `Enter Save Desk` above `Central Concourse -> Central Concourse -> Save Desk`.
Actual: Screenshot shows `Enter Save DeskCentral Concourse -> Central Concourse -> Save Desk` with no clear spacing between action and breadcrumb.
User Impact: The interaction prompt is still understandable, but it looks unpolished and makes first-hour wayfinding feel less deliberate.
Evidence: Browser screenshots `qa/playtest-runs/current/phase13-hub.png` and `qa/playtest-runs/current/phase13-hub-rerun.png`; `src/components/hud/RoomPrompt.tsx` renders `strong` and `span` inside an unstyled div; `src/styles/global.css` has no specific block layout for that text group.
Likely Files: `src/components/hud/RoomPrompt.tsx`, `src/styles/global.css`
Suggested Fix Direction: Style the prompt text wrapper as a column with a small gap and ensure mobile/compact widths wrap cleanly.
Acceptance Criteria: Prompt action and breadcrumb are separated at 1280x720, 1366x768, and compact desktop widths.
Fix Evidence: `src/components/hud/RoomPrompt.tsx` now renders a `room-prompt__body` stack; `src/styles/global.css` gives the action and breadcrumb block layout. Browser verification showed `Enter Save Desk` and the breadcrumb on separate lines.

## Finding QA-003: Demo GM Office opens with duplicate Assistant GM report headlines

Status: fixed 2026-05-16
Severity: low
Confidence: medium
Area: First-hour / Assistant GM
Room/Flow: Demo franchise -> Operations Map -> GM Office
Repro Steps: Start demo franchise, open Operations Map, navigate to GM Office, inspect Assistant GM Reports.
Expected: Demo starts with one clear first recommendation or clearly distinct reports.
Actual: DOM snapshot showed two `Assistant GM: urgent work on the board` report headings with overlapping recommendation targets.
User Impact: First-time testers may feel the demo is noisy or duplicated before they understand the action queue.
Evidence: Browser DOM snapshot from current pass; `src/game/systems/demoMode.ts` prepends a generated Assistant GM report to existing generated reports. The rerun did not reliably land on GM Office because repeated `Go to room` controls were ambiguous in automation, so this finding remains source-backed and should be manually retested after `QA-001`.
Likely Files: `src/game/systems/demoMode.ts`, `src/components/rooms/GMOfficePanel.tsx`, `src/game/generators/generateLeague.ts`
Suggested Fix Direction: Dedupe demo startup reports or make the demo report title/context distinct.
Acceptance Criteria: Fresh demo GM Office shows no duplicate report headlines with overlapping urgent guidance.
Fix Evidence: `src/game/systems/demoMode.ts` dedupes startup reports by date/type/headline; `src/tests/phase11PublicBeta.test.ts` asserts demo report keys are unique; browser verification counted one urgent Assistant GM headline after direct GM Office navigation.

## Finding QA-004: Custom League Lab is not clearly represented as a facility destination

Status: fixed 2026-05-16
Severity: low
Confidence: high
Area: Custom League / Facility Wayfinding
Room/Flow: Post-franchise facility navigation to custom league/data-pack tools
Repro Steps: Open Operations Map and filter `Customization`.
Expected: Tester can understand where Custom League Lab/Data Pack Library live after entering a franchise.
Actual: Customization Lab currently contains only Dev Tools; docs state Custom League Lab and Data Pack Library live in Save Desk/start flow and the customization district reserves a future branch.
User Impact: Custom-league testers may know the start-screen lab exists but not where to revisit related local data-pack tools inside the facility.
Evidence: `FACILITY_BLUEPRINT.md`; `src/game/facility/facilityBlueprint.ts` has Customization Lab roomIds `["devTools"]`; browser map filter showed Customization Lab with only one destination; rerun confirmed the start-screen Custom League Lab opens successfully in `qa/playtest-runs/current/phase13-custom-league-rerun.png`.
Likely Files: `src/game/facility/facilityBlueprint.ts`, `src/components/hud/OperationsMap.tsx`, `src/components/rooms/SaveLoadPanel.tsx`, docs/copy.
Suggested Fix Direction: Clarify in map/directory/Save Desk copy that Custom League/Data Pack Library lives at Save Desk for now, or add a future physical lab only in a dedicated feature pass.
Acceptance Criteria: A closed-beta custom-league tester can find data-pack/custom-league tooling from the facility without relying on prior docs.
Fix Evidence: Operations Map now shows a Customization district note, Save Desk now explains the in-franchise data-pack library, and `FACILITY_BLUEPRINT.md` clarifies that Custom League Lab is title-screen setup while Save Desk handles in-franchise data packs.
