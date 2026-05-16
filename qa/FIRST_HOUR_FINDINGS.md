# First-Hour Findings

## Finding QA-002: RoomPrompt action and breadcrumb run together visually

Severity: low
Confidence: high
Area: First-hour facility prompt
Room/Flow: Demo start near Save Desk
Repro Steps: Start demo franchise and look at the bottom prompt.
Expected: `Enter Save Desk` and the breadcrumb are visually separated.
Actual: The text appears joined in the browser screenshot.
User Impact: Small clarity/polish issue on the first interactable object.
Evidence: `qa/playtest-runs/current/phase13-hub.png`.
Likely Files: `src/components/hud/RoomPrompt.tsx`, `src/styles/global.css`
Suggested Fix Direction: Stack prompt action and breadcrumb with a gap.
Acceptance Criteria: Prompt text no longer concatenates at common desktop widths.

## Finding QA-003: Demo GM Office opens with duplicate Assistant GM report headlines

Severity: low
Confidence: medium
Area: Demo / Assistant GM
Room/Flow: First GM Office visit
Repro Steps: Start demo, use map to open GM Office, inspect Assistant GM Reports.
Expected: One primary first-hour report or clearly distinct reports.
Actual: Two `Assistant GM: urgent work on the board` headings appeared.
User Impact: Makes first-hour guidance feel repetitive.
Evidence: Browser DOM snapshot from current pass.
Likely Files: `src/game/systems/demoMode.ts`, `src/components/rooms/GMOfficePanel.tsx`
Suggested Fix Direction: Dedupe or distinguish initial demo reports.
Acceptance Criteria: Fresh demo GM Office has no duplicate report headlines.

## Positive Signals

- Start screen clearly exposes demo, new franchise, Custom League Lab, beta guide, release notes, install locally, and Phase 13 label.
- Demo enters the facility successfully.
- TopBar shows team status, next game, release label, roster readiness, urgent count, Assistant GM count, and district context.
- First Day checklist and guided tutorial are visible on entry.

