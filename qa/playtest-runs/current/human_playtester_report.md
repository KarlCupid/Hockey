# Human Playtest Report

Agent: Human Playtester
Date: 2026-05-16 local run
Build: Franchise Ice v0.1.0 | Phase 13 Facility Masterplan | schema v8 | beta
Browser/Viewport: Playwright Chromium 1.60.0, 1366x768 primary; 1024x640 compact check
Commands Run: `npm run typecheck` passed; `npm run test:smoke` passed, 6 files / 108 tests
Screenshots:
- `qa/playtest-runs/current/human-start-1366.png`
- `qa/playtest-runs/current/human-demo-hub-1366.png`
- `qa/playtest-runs/current/human-gm-office-loaded-1366.png`
- `qa/playtest-runs/current/human-operations-map-1366.png`
- `qa/playtest-runs/current/human-operations-map-gm-selected-1366.png`
- `qa/playtest-runs/current/human-gm-office-from-map-loaded-1366.png`
- `qa/playtest-runs/current/human-roster-office-1366.png`
- `qa/playtest-runs/current/human-coach-office-1366.png`
- `qa/playtest-runs/current/human-arena-before-sim-1366.png`
- `qa/playtest-runs/current/human-after-sim-1366.png`
- `qa/playtest-runs/current/human-save-desk-1366.png`
- `qa/playtest-runs/current/human-feedback-desk-1366.png`
- `qa/playtest-runs/current/human-start-compact-1024x640.png`
Console Notes: Dev-only Vite and React DevTools messages appeared. Repeated Chromium/WebGL `GPU stall due to ReadPixels` warnings appeared during screenshot-heavy Playwright runs. No page crash or app exception was captured.
Manual Coverage: Start screen, demo entry, keyboard shortcuts, Operations Map, GM Office, Roster Office, Coach's Office, Arena Bowl, instant simulation, Save Desk, Feedback Desk, and compact start/demo DOM check.
Limitations: Some full-page and repeat viewport screenshots timed out against the 3D canvas during Playwright runs, so the report uses a mix of viewport screenshots and DOM text evidence.

## Player Diary

The start screen made me feel safe quickly. `Try Demo Franchise` reads like the right first button, and the local-only beta note is visible without feeling scary. I understood that I could experiment without committing to a real save.

The demo facility lands with a strong hockey-ops fantasy. I liked seeing the top bar, next opponent, record, roster status, Assistant GM count, district, Save Desk prompt, and first-day checklist all at once. It felt like walking into a busy office on day one. It also felt a little crowded. I had a checklist, tutorial card, hint card, room prompt, map button, keyboard hint, and visible 3D signage all asking for attention.

The visible `G`, `R`, `C`, `A`, and `S` shortcuts were surprisingly reassuring. Pressing `G` opened GM Office, updated the checklist, and immediately answered "what matters next?" The GM Office has a good emotional center: owner mood, fan confidence, action queue, Assistant GM notes, living-ops pressure, and beta checklist all reinforce the feeling that I am running a team, not just clicking tabs.

Operations Map was useful, especially after the recent accessible labels. Selecting GM Office and using the direct destination path worked. The route text and district groupings helped. But the tutorial card covered part of the map, and that made the moment feel clumsy. When I am asking for orientation, the tutorial should help the map, not sit on top of it.

Roster Office and Coach's Office were reachable through visible shortcuts. Roster health was immediately understandable, especially the cap warning. The Coach's Office screenshot caught the lazy-loading state rather than the loaded panel, but the shortcut and room opening path worked.

Arena Bowl was one of the best moments. The matchup preview was readable, `Instant Simulation` was obvious, and the result center gave me a strong post-game story: final score, record movement, standings context, room pulse, story fallout, milestone watch, period scores, scoring summary, three stars, morale movement, fatigue warnings, inbox items, and event feed. I could explain what happened after the first game.

Save Desk and Feedback Desk were easy to find and the local-only language was good. The Save Desk made integrity, autosave, export, bug report, and data-pack library discoverable. Feedback Desk clearly explained that full save JSON is excluded from the feedback bundle by default. The problem is that the tutorial overlay sat over the right side of both panels, making the support surfaces feel less calm than they should.

The compact 1024x640 pass was mixed. The start screen looked good and usable. After entering the facility, the DOM no longer contained the first-day checklist or tutorial overlay, and no desktop-warning banner appeared. As a laptop-sized tester, I would lose the very guidance that makes the first hour feel manageable.

## Coverage Checklist

- Start screen: Passed. Clear demo path, local-only note, no-save state, and release label.
- Demo franchise entry: Passed. Demo entered facility and presented first-hour context.
- Facility movement: Partially covered. Keyboard room shortcuts worked. Full manual WASD route walking was not deeply sampled.
- Operations Map: Passed with friction. Map opened, filters/direct room labels were present, GM direct route worked.
- GM Office: Passed. The room communicated next action, risks, Assistant GM reports, and living-ops pressure.
- Roster/Coach/Arena path: Passed with note. Roster and Arena were clear. Coach route opened, but screenshot captured loading state.
- First game simulation: Passed. Instant sim produced a 3-2 win, updated record to 1-0-0, autosave state, result center, three stars, fallout, and next recommendation.
- Save/feedback/bug-report path: Partially passed. Paths were visible and local-only copy was clear. Manual save confirmation was not reassuring in the observed click pass.
- Compact viewport: Concern. 1024x640 is treated as supported, but first-hour guidance overlays disappear after demo entry.

## Findings

## Finding HPT-001: Guided tutorial overlays the map and support panels

Severity: medium
Confidence: high
Area: First-hour UX / Overlay management
Room/Flow: Demo franchise -> Operations Map, Save Desk, Feedback Desk, Arena Bowl
Repro Steps:
1. Start the app at 1366x768.
2. Click `Try Demo Franchise`.
3. Open `Map`, or open `Save Desk` / `Feedback Desk` / `Arena Bowl`.
Expected:
The tutorial should either dock into unused space, collapse, or yield while a map or room panel is the active task.
Actual:
The `Guided Start` tutorial card remains above the active surface and covers meaningful right-side content. It overlaps the Operations Map floorplan/directory, Save Desk autosave/import-export area, Feedback Desk recent entries area, and Arena result/control area.
User Impact:
As a new tester, I felt like the game was teaching and blocking me at the same time. The feature that should lower anxiety during the first hour became visual clutter during orientation and support flows.
Evidence:
Screenshots `human-operations-map-1366.png`, `human-save-desk-1366.png`, `human-feedback-desk-1366.png`, `human-arena-before-sim-1366.png`, and `human-after-sim-1366.png`. Source shows `TutorialOverlay` always renders when tutorial state is active, and CSS gives `.tutorial-overlay` z-index 35 while map and room surfaces sit beneath it.
Likely Files:
`src/app/AppShell.tsx`, `src/components/hud/TutorialOverlay.tsx`, `src/components/hud/OperationsMap.tsx`, `src/styles/global.css`
Suggested Fix Direction:
When `operationsMapOpen` or `activeRoom` is set, collapse the tutorial to a small non-overlapping button, dock it inside the active panel, or hide it behind a "Guided Start" affordance. Keep tutorial recovery available, but do not let it cover active workflows.
Acceptance Criteria:
At 1366x768, Operations Map, Arena Bowl, Save Desk, and Feedback Desk have no tutorial overlay covering active content. The player can reopen the tutorial from a clear control.

## Finding HPT-002: Minimum supported compact viewport hides first-hour guidance

Severity: medium
Confidence: high
Area: Responsive UX / First-hour guidance
Room/Flow: 1024x640 demo franchise entry
Repro Steps:
1. Open the app at 1024x640.
2. Click `Try Demo Franchise`.
3. Inspect visible/DOM first-hour guidance.
Expected:
Because 1024x640 is the documented comfortable beta floor, the first-day checklist and tutorial should remain available, or the app should show a desktop-size warning.
Actual:
No `Desktop browser recommended` warning appears, but the first-day checklist and tutorial text are absent after demo entry. Source explains why: `displayModes.ts` only marks unsupported when width `< 1024` or height `< 640`, while `global.css` hides `.tutorial-overlay`, `.contextual-hint`, and `.first-day` at `max-height: 700px`.
User Impact:
A laptop tester at the stated minimum size loses the exact guidance that makes the first hour understandable. The game still works, but it feels less coached and more like being dropped into the facility alone.
Evidence:
Screenshot `human-start-compact-1024x640.png`; compact demo DOM output contained TopBar, Save Desk prompt, and keyboard hint, but not `First Day` checklist or `Guided Start`; source in `src/game/systems/displayModes.ts` and `src/styles/global.css`.
Likely Files:
`src/game/systems/displayModes.ts`, `src/styles/global.css`, `src/components/hud/FirstDayChecklist.tsx`, `src/components/hud/TutorialOverlay.tsx`
Suggested Fix Direction:
Align support thresholds with overlay behavior. Either treat heights at or below 700px as compact-warning territory, or convert first-day/tutorial overlays into collapsed/docked buttons instead of removing them.
Acceptance Criteria:
At 1024x640, a new demo player can access first-day checklist and tutorial guidance, or sees a clear desktop-size recommendation explaining why guidance is reduced.

## Finding HPT-003: Manual save click lacks a reassuring success state

Severity: medium
Confidence: medium
Area: Save/recovery UX
Room/Flow: Demo franchise -> Save Desk -> Slot 1 save
Repro Steps:
1. Start a demo franchise.
2. Press `S` to open Save Desk.
3. Click the first visible `Save` button for Slot 1.
4. Wait for the panel to update.
Expected:
Slot 1 should visibly change from `Empty slot` to a saved franchise timestamp, or the UI should show a clear in-progress/success/error state.
Actual:
In one observed pass, the click returned `Save` and the TopBar changed to `Autosaving`, but the Save Desk text still showed `Slot 1 / Empty slot` after the wait. A later longer retry did not resolve the button through the simple visible-text query, so this remains a medium-confidence UX finding rather than a confirmed persistence failure.
User Impact:
As a human tester, this is the kind of moment that creates worry: I clicked save, but the slot still looked empty. Even if the data saved correctly later, the feedback was not reassuring.
Evidence:
Screenshot `human-save-desk-1366.png`; Playwright DOM evidence from the save click pass showed `clicked: "Save"`, `Autosaving`, and Slot 1 still reading `Empty slot` afterward.
Likely Files:
`src/components/rooms/SaveLoadPanel.tsx`, `src/store/franchiseStore.ts`, `src/game/systems/saves.ts`
Suggested Fix Direction:
Add a slot-specific pending/success state such as `Saving Slot 1...` followed by `Saved <timestamp>`, and surface any failure near the clicked slot. Consider disabling the clicked save button while the write is pending.
Acceptance Criteria:
After clicking a manual save slot, the slot shows a pending state within 250 ms and either a timestamped saved state or an error within a few seconds. The first-day `Save franchise` checklist item updates only after confirmed save.

## Finding HPT-004: Active room shortcuts leave stale physical prompts visible

Severity: low
Confidence: high
Area: Facility HUD / Room prompt
Room/Flow: Keyboard/direct room navigation from Save Desk
Repro Steps:
1. Start a demo franchise.
2. Use the visible `G`, `R`, `C`, or `A` shortcut, or use Operations Map direct navigation.
3. Look at the active modal and the bottom room prompt.
Expected:
When a room panel is active, the bottom prompt should hide, dim, or describe the active panel action.
Actual:
The modal and TopBar identify the active room, but the bottom prompt still says `Enter Save Desk` with the Save Desk breadcrumb because the avatar/nearby room remains there.
User Impact:
This is not blocking, but it creates a small "where am I?" wobble. I understood that the modal was correct, but the persistent Save Desk prompt felt like leftover physical context.
Evidence:
Screenshots `human-gm-office-loaded-1366.png`, `human-gm-office-from-map-loaded-1366.png`, `human-roster-office-1366.png`, and `human-arena-before-sim-1366.png`.
Likely Files:
`src/app/AppShell.tsx`, `src/components/hud/RoomPrompt.tsx`, `src/store/uiStore.ts`
Suggested Fix Direction:
Hide or quiet `RoomPrompt` while `activeRoom` is open, or change it to an active-panel hint such as `Esc close GM Office`.
Acceptance Criteria:
When a modal room is open from shortcut or map navigation, the HUD does not simultaneously tell the player to enter a different nearby room.

## Source Follow-Up

- `src/app/AppShell.tsx`: Renders `OperationsMap`, `FirstDayChecklist`, `TutorialOverlay`, `ContextualHint`, `RoomPrompt`, and active room modal as independent fixed layers.
- `src/components/hud/TutorialOverlay.tsx`: Tutorial remains active whenever tutorial state is active and does not check active room or map state.
- `src/components/hud/OperationsMap.tsx`: Map direct navigation sets active room and closes the map; it does not own tutorial behavior.
- `src/components/hud/FirstDayChecklist.tsx`: Checklist is a fixed overlay and relies on CSS for responsive behavior.
- `src/styles/global.css`: `.tutorial-overlay` z-index is above map/modal surfaces; `@media (max-height: 700px)` hides tutorial, context hint, and first-day checklist.
- `src/game/systems/displayModes.ts`: Supported-size threshold is lower than the CSS overlay-hide threshold.

## Residual Risks

- I did not complete a full manual WASD route walk through every district.
- I did not fully verify Coach's Office loaded content beyond room entry/loading screenshot.
- I did not submit a real Feedback Desk entry; I verified the path, form surface, local-only copy, and export entry points.
- I did not verify bug-report JSON download contents in this run.
- Some screenshot attempts timed out against the 3D canvas; final evidence relies on the screenshots saved above plus DOM text capture for detailed post-game content.
