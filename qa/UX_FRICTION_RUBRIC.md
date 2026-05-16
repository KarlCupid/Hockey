# UX Friction Rubric

## Signals To Watch

- Player opens the same room repeatedly without acting.
- Player simulates several games without reading results.
- Player skips the tutorial and then lacks a next action.
- Assistant GM recommendations pile up without prioritization.
- Roster or custom-league validation blocks progress repeatedly.
- Save Desk is revisited after load errors without clear recovery.
- First-hour checklist competes with GM Office, TopBar, tutorial, and map guidance.

## Scoring

- 0: clear, direct, no repeated confusion signal.
- 1: minor uncertainty, recoverable through existing labels.
- 2: likely repeated hesitation for a first-time tester.
- 3: blocks a core first-hour action until tester experiments.
- 4: tester may quit or file a bug even though the system is technically working.

## Evidence

Prefer telemetry/friction helpers in `src/game/systems/uxFriction.ts`, first-hour systems in `src/game/systems/onboarding.ts`, and observed browser/manual steps. If using source only, state that the result is a source-review risk.

