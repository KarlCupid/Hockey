# Demo Franchise Tester Report

Date: 2026-05-16
Build: Franchise Ice v0.1.0 | Phase 13 Facility Masterplan | schema v8 | beta
Agent: demo_franchise_tester
Report File: qa/playtest-runs/current/demo_franchise_report.md

## Coverage

Commands verified in the shared current pass:

- `npm run typecheck`: passed.
- `npm test`: passed after sandbox config-access rerun; 16 files / 252 tests.
- `npm run test:smoke`: passed after sandbox config-access rerun; 6 files / 106 tests.
- `npm run build`: passed after sandbox config-access rerun; known large chunk warning.
- `npm run check`: passed end to end.

Browser coverage:

- Start screen and demo entry were tested in production preview.
- Demo facility loaded with Central Concourse and Save Desk context.
- Operations Map navigation to GM Office worked.
- Console warning/error log was empty.

Limitations:

- This pass did not complete a full demo season or first-game browser path.
- Save/export flows were source/test reviewed rather than manually exported in browser.

## Finding QA-003: Demo GM Office starts with duplicate Assistant GM report headlines

Severity: low
Confidence: high
Area: Demo franchise guidance
Room/Flow: Demo franchise -> GM Office
Repro Steps:
1. From the start screen, select `Try Demo Franchise`.
2. Open the Operations Map.
3. Select `GM Office`.
4. Activate `Go to room`.
5. Review the Assistant GM reports.
Expected:
The demo franchise should present one concise urgent report at startup.
Actual:
Two reports use the same `Assistant GM: urgent work on the board` headline.
User Impact:
Closed-beta players may think the demo seed duplicated content, especially because this is one of the first management surfaces they see.
Evidence:
Browser DOM inspection in production preview; source review of `createDemoFranchise` in `src/game/systems/demoMode.ts`.
Likely Files:
`src/game/systems/demoMode.ts`, `src/game/generators/generateLeague.ts`, `src/components/rooms/GMOfficePanel.tsx`
Suggested Fix Direction:
Normalize or dedupe startup Assistant GM reports in the demo seed path while keeping the intentional demo priorities visible.
Acceptance Criteria:
Fresh demo starts show one urgent Assistant GM startup report and no duplicate headline in GM Office.

## Completion

Demo entry, facility load, map access, and GM Office navigation are viable for closed beta. Do not implement fixes as part of this report.
