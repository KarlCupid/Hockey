# Current QA Summary

Date: 2026-05-16
Build: Franchise Ice v0.1.0 | Phase 13 Facility Masterplan | schema v8 | beta
Scope: reusable Codex QA-agent harness plus first structured current-build QA pass.

## Rerun After Codex Crash

Rerun Date: 2026-05-16

The QA-agent pass was rerun after the reported Codex crash. The reusable harness and all requested QA files were present before rerun. No blocker or high-severity defect was found on rerun, and the same prioritized medium/low findings remain the active fix queue.

Fresh rerun evidence:

- `qa/playtest-runs/current/phase13-start-rerun.png`
- `qa/playtest-runs/current/phase13-custom-league-rerun.png`
- `qa/playtest-runs/current/phase13-hub-rerun.png`
- `qa/playtest-runs/current/phase13-map-rerun.png`
- `qa/playtest-runs/current/phase13-gm-office-rerun.png`

Rerun browser notes:

- Start screen rendered `New Franchise`, `Try Demo Franchise`, `Continue`, `Custom League Lab`, beta guide, release notes, and install action.
- Custom League Lab opened from the start screen and displayed working pack, library/rules/team/roster/draft/scenario/import-export tabs, and `Start Franchise`.
- Demo franchise entered the Phase 13 facility.
- TopBar, Save Desk room context, First Day checklist, RoomPrompt, and Operations Map rendered.
- Operations Map pins and repeated `Go to room` controls still lack destination-specific accessible labels.
- Browser console warning/error log was empty.
- The GM Office duplicate-report issue remains source-backed by `src/game/systems/demoMode.ts` prepending an Assistant GM report to the generated franchise report list. The rerun's direct GM automation clicked an ambiguous repeated `Go to room` control and did not reliably land on GM Office, which reinforces `QA-001` rather than clearing `QA-003`.

## Verdict

Status: pass with medium/low closed-beta polish findings.

No blocker or high-severity defects were found in this pass. The current build passed typecheck, full tests, smoke tests, production build, and the full `npm run check` gate after rerunning Vite/Vitest commands outside the sandbox due a local config-access restriction.

## Verification

- `npm run typecheck`: passed on rerun.
- `npm test`: initial sandbox run failed to resolve `vitest.config.ts` because access to `../..` was denied; escalated rerun passed 16 files / 252 tests.
- `npm run test:smoke`: initial sandbox run hit the same config-access issue; escalated rerun passed 6 files / 106 tests.
- `npm run build`: initial sandbox run hit the same Vite config-access issue; escalated rerun passed, 820 modules transformed.
- `npm run check`: initial sandbox run hit the same Vitest config-access issue; escalated rerun passed end to end, including typecheck, full tests, smoke tests, and build.
- Build warning: known large production chunk warning remains, with `three-r3f` at 748.52 kB minified in this run.

## Browser Coverage

Browser QA used the production preview at `http://127.0.0.1:4173/`.

Verified:

- Start screen rendered `New Franchise`, `Try Demo Franchise`, `Custom League Lab`, beta links, and the Phase 13 release label.
- `Try Demo Franchise` entered the 3D facility.
- `Custom League Lab` opened from the start screen.
- Hub rendered with varied visible 3D content.
- TopBar showed `District: Central Concourse`.
- RoomPrompt showed Save Desk context.
- Operations Map opened with district filters, floorplan, route section, and direct navigation.
- Direct map navigation opened GM Office.
- Browser console warning/error log was empty.
- Screenshot saved at `qa/playtest-runs/current/phase13-hub.png`.
- Rerun screenshots saved with `phase13-*-rerun.png` names in `qa/playtest-runs/current/`.

Not fully browser-tested in this pass:

- Full first-game browser simulation.
- Save/feedback export click-through.
- Reduced-detail and accessibility setting toggles.

Those flows are covered by automated smoke/source review in this pass and should be browser-expanded in the next pass.

## Prioritized Findings

1. `QA-001` medium: Operations Map pins and repeated `Go to room` buttons are under-labeled for assistive tech.
2. `QA-002` low: RoomPrompt visually concatenates the action and breadcrumb text.
3. `QA-003` low: Demo GM Office starts with duplicate Assistant GM report headlines.
4. `QA-004` low: Custom League Lab is not clearly discoverable as a facility destination after franchise entry.

## Fix Implementation

Status: all four queued findings were implemented on 2026-05-16.

Verification after fixes:

- `npm run typecheck`: passed.
- `npm run test:smoke`: passed after sandbox config-access rerun, 6 files / 108 tests.
- `npm run check`: passed after sandbox config-access rerun, 16 files / 254 tests plus 6 smoke files / 108 tests and production build.
- Browser verification saved `phase13-hub-fixed.png`, `phase13-map-fixed.png`, and `phase13-gm-fixed.png`.

Fix evidence:

- `QA-001`: browser DOM found 0 map pins without accessible labels and 0 `Go to room` controls without destination-specific labels.
- `QA-002`: browser DOM showed RoomPrompt text as `Enter Save Desk` and the breadcrumb on separate lines.
- `QA-003`: fresh demo GM Office browser verification counted one `Assistant GM: urgent work on the board` headline.
- `QA-004`: browser DOM showed the Customization district note pointing Custom League Lab to title-screen setup and Save Desk to the in-franchise data-pack library.

## Created Harness

The new `qa/` harness includes shared protocols, severity/UX/facility/balance/accessibility rubrics, reporting and fix-prompt guides, reusable report templates, 15 agent role prompts, current-build reports, backlog files, and a prioritized fix-prompt queue.
