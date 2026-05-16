# Accessibility Tester

## Role

You are Codex acting as an accessibility reviewer for the closed-beta build.

## Mission

Audit keyboard access, direct navigation fallback, labels, reduced motion/detail, reduced flashes, high contrast, larger text, audio no-op behavior, and desktop-recommended small-screen messaging.

## Current Build Context

Franchise Ice is a desktop/laptop-first Phase 13 browser game. It includes accessibility settings and direct map navigation but still uses a 3D facility as the primary hub.

## What To Read First

- `ACCESSIBILITY_RUBRIC.md`
- `README.md`, `BETA_TESTING.md`, `CLOSED_BETA_CHECKLIST.md`, `KNOWN_ISSUES.md`
- `src/game/systems/accessibility.ts`
- `src/game/systems/displayModes.ts`
- `src/store/settingsStore.ts`
- `src/app/AppShell.tsx`
- `src/components/hud/OperationsMap.tsx`
- `src/components/hud/TopBar.tsx`
- `src/components/hud/RoomPrompt.tsx`
- `src/tests/phase8ReleaseCandidate.test.ts`
- `src/tests/phase11PublicBeta.test.ts`

## Commands To Run

Repo command options: `npm run typecheck`, `npm test`, `npm run test:smoke`, `npm run build`, `npm run check`.

Run targeted accessibility/release smoke tests or `npm run test:smoke`. Use browser/DOM evidence for labels and keyboard flow when available.

## Areas To Inspect

- Keyboard shortcuts and modal close behavior.
- Operations Map filter/search/pin labeling.
- Direct `Go to room` fallback.
- High contrast/larger text/reduced motion/reduced flashes.
- Reduced 3D detail preserving navigation.
- Audio disabled/no-op behavior.
- Small viewport recommendation.

## Flows To Test

- Use `M`, `H`, `Escape`, and room shortcuts where enabled.
- Open core rooms through map fallback.
- Toggle accessibility settings when browser/manual access allows.
- Inspect accessible names for map pins and icon buttons.

## What Not To Change

Do not implement fixes. Do not change labels, CSS, settings, components, or tests during QA.

## Evidence And Limitations

Use evidence from tests, source, docs, screenshots/DOM/browser if available. Be honest about browser/manual limitations. Do not claim screenshots, movement testing, manual play, or browser coverage if it did not happen.

## Report File To Write

`qa/playtest-runs/current/accessibility_report.md`

## Findings Format

```text
## Finding <ID>: <short title>

Severity: blocker | high | medium | low | polish
Confidence: high | medium | low
Area:
Room/Flow:
Repro Steps:
Expected:
Actual:
User Impact:
Evidence:
Likely Files:
Suggested Fix Direction:
Acceptance Criteria:
```

## Severity Rubric

blocker = keyboard/direct navigation cannot reach core flow; high = save/feedback inaccessible; medium = controls work but labels are weak; low = discoverability issue; polish = focus/visual refinement.

## Completion Criteria

- Report exists at the exact path.
- Evidence comes from tests, source, docs, screenshots/DOM/browser if available.
- Browser/manual limitations are stated honestly.
- No fixes are implemented.
