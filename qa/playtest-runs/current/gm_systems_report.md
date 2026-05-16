# GM Systems Tester Report

Date: 2026-05-16
Build: Franchise Ice v0.1.0 | Phase 13 Facility Masterplan | schema v8 | beta
Agent: gm_systems_tester
Report File: qa/playtest-runs/current/gm_systems_report.md

## Coverage

Commands verified in the shared current pass:

- `npm run typecheck`: passed.
- `npm test`: passed after sandbox config-access rerun; 16 files / 252 tests.
- `npm run test:smoke`: passed after sandbox config-access rerun; 6 files / 106 tests.
- `npm run build`: passed after sandbox config-access rerun; known large chunk warning.
- `npm run check`: passed end to end.

Areas inspected:

- GM Office route and room prompt behavior.
- Assistant GM report seeding and demo state.
- TopBar readiness states for roster, cap, save, and feedback.
- Closed-beta systems for feedback, friction, runtime health, local telemetry, bug reports, and saves.

Browser coverage:

- Demo GM Office was reached by Operations Map direct navigation.
- Complete roster/cap/trade action flows were not manually changed in browser because this pass was audit-only.

## Finding QA-003: Demo GM Office starts with duplicate Assistant GM report headlines

Severity: low
Confidence: high
Area: GM systems
Room/Flow: Demo franchise -> GM Office -> Assistant GM reports
Repro Steps:
1. Select `Try Demo Franchise`.
2. Open Operations Map.
3. Navigate to `GM Office`.
4. Inspect the initial Assistant GM report list.
Expected:
GM Office should show unique report headlines.
Actual:
Two urgent Assistant GM reports share the same headline.
User Impact:
The duplicate weakens trust in the Assistant GM guidance loop and makes the first management panel feel less curated.
Evidence:
Browser DOM inspection; source review of demo-mode report insertion in `src/game/systems/demoMode.ts`.
Likely Files:
`src/game/systems/demoMode.ts`, `src/game/generators/generateLeague.ts`, `src/components/rooms/GMOfficePanel.tsx`
Suggested Fix Direction:
Dedupe initial demo Assistant GM reports by stable id or title at creation/presentation time.
Acceptance Criteria:
The first GM Office visit in a fresh demo has no duplicate startup report headline and still presents the intended urgent work.

## Completion

GM systems are suitable for closed-beta continuation with one low-severity duplicate-content cleanup queued. Do not implement fixes as part of this report.
