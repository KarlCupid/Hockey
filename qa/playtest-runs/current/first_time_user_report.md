# First Time User Tester Report

Date: 2026-05-16
Build: Franchise Ice v0.1.0 | Phase 13 Facility Masterplan | schema v8 | beta
Agent: first_time_user_tester
Report File: qa/playtest-runs/current/first_time_user_report.md

## Coverage

Commands verified in the shared current pass:

- `npm run typecheck`: passed.
- `npm test`: passed after sandbox config-access rerun; 16 files / 252 tests.
- `npm run test:smoke`: passed after sandbox config-access rerun; 6 files / 106 tests.
- `npm run build`: passed after sandbox config-access rerun; known large chunk warning.
- `npm run check`: passed end to end.

Browser coverage:

- Production preview opened at `http://127.0.0.1:4173/`.
- Start screen rendered the main entry choices, beta links, and Phase 13 label.
- `Try Demo Franchise` entered the facility.
- First visible hub state showed Central Concourse, Save Desk prompt, TopBar context, and First Day checklist.
- Operations Map opened and direct navigation to GM Office worked.
- Browser console warning/error log was empty.
- Screenshot evidence: `qa/playtest-runs/current/phase13-hub.png`.

Limitations:

- This pass did not run a complete manual first game or full first-hour browser session.
- Custom League Lab was reviewed through source/tests and start-screen presence, not through a complete browser-created league.

## Finding QA-002: RoomPrompt visually concatenates action and breadcrumb

Severity: low
Confidence: high
Area: Facility HUD
Room/Flow: Central Concourse -> Save Desk first visible room prompt
Repro Steps:
1. Start the production preview.
2. Select `Try Demo Franchise`.
3. Observe the bottom RoomPrompt in the first facility state.
Expected:
The primary action and breadcrumb should read as two clearly separated pieces of information.
Actual:
The prompt appears as `Enter Save DeskCentral Concourse -> Central Concourse -> Save Desk`, making the call to action and breadcrumb look glued together.
User Impact:
New beta testers may read the first room prompt as noisy or unfinished, which hurts first-hour confidence even though the route data is present.
Evidence:
Browser screenshot `qa/playtest-runs/current/phase13-hub.png`; source review of `src/components/hud/RoomPrompt.tsx` and prompt styling.
Likely Files:
`src/components/hud/RoomPrompt.tsx`, `src/styles/global.css`
Suggested Fix Direction:
Give the action label and breadcrumb distinct layout treatment, such as a vertical text stack or explicit gap, while preserving quiet prompt state and keyboard hint.
Acceptance Criteria:
At common desktop and compact widths, the action and breadcrumb are visually separated and do not overlap the control hint.

## Finding QA-003: Demo GM Office starts with duplicate Assistant GM report headlines

Severity: low
Confidence: high
Area: First-hour guidance
Room/Flow: Demo franchise -> Operations Map -> GM Office
Repro Steps:
1. Select `Try Demo Franchise`.
2. Open Operations Map.
3. Select `GM Office`.
4. Use `Go to room`.
5. Observe Assistant GM report cards/headlines.
Expected:
The demo GM Office should start with one clear Assistant GM report for urgent priorities.
Actual:
Two `Assistant GM: urgent work on the board` headlines appear at the top of the GM Office report list.
User Impact:
First-time testers may perceive the demo state as duplicated or overly noisy during the most important orientation flow.
Evidence:
Browser DOM inspection after direct map navigation to GM Office; source review of demo report seeding in `src/game/systems/demoMode.ts`.
Likely Files:
`src/game/systems/demoMode.ts`, `src/game/generators/generateLeague.ts`, `src/components/rooms/GMOfficePanel.tsx`
Suggested Fix Direction:
Dedupe demo Assistant GM startup reports by id/title before presenting the initial report list, without reducing the intended first-day guidance.
Acceptance Criteria:
A fresh demo franchise shows only one urgent Assistant GM startup report, while existing non-duplicate reports remain visible.

## Completion

First-time entry is release-viable for closed beta, with two low-severity polish findings to improve clarity. Do not implement fixes as part of this report.
