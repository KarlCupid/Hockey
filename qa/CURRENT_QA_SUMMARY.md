# Current QA Summary

Date: 2026-05-16
Build: Franchise Ice v0.1.0 | Phase 13 Facility Masterplan | schema v8 | beta
Scope: reusable Codex QA-agent harness plus first structured current-build QA pass.

## Verdict

Status: pass with medium/low closed-beta polish findings.

No blocker or high-severity defects were found in this pass. The current build passed typecheck, full tests, smoke tests, production build, and the full `npm run check` gate after rerunning Vite/Vitest commands outside the sandbox due a local config-access restriction.

## Verification

- `npm run typecheck`: passed.
- `npm test`: initial sandbox run failed to resolve `vitest.config.ts` because access to `../..` was denied; escalated run passed 16 files / 252 tests.
- `npm run test:smoke`: initial sandbox run hit the same config-access issue; escalated run passed 6 files / 106 tests.
- `npm run build`: initial sandbox run hit the same Vite config-access issue; escalated run passed, 820 modules transformed.
- `npm run check`: escalated run passed end to end, including typecheck, full tests, smoke tests, and build.
- Build warning: known large production chunk warning remains, with `three-r3f` at 748.52 kB minified in this run.

## Browser Coverage

Browser QA used the production preview at `http://127.0.0.1:4173/`.

Verified:

- Start screen rendered `New Franchise`, `Try Demo Franchise`, `Custom League Lab`, beta links, and the Phase 13 release label.
- `Try Demo Franchise` entered the 3D facility.
- Hub rendered with varied visible 3D content.
- TopBar showed `District: Central Concourse`.
- RoomPrompt showed Save Desk context.
- Operations Map opened with district filters, floorplan, route section, and direct navigation.
- Direct map navigation opened GM Office.
- Browser console warning/error log was empty.
- Screenshot saved at `qa/playtest-runs/current/phase13-hub.png`.

Not fully browser-tested in this pass:

- Full first-game browser simulation.
- Custom League Lab browser start.
- Save/feedback export click-through.
- Reduced-detail and accessibility setting toggles.

Those flows are covered by automated smoke/source review in this pass and should be browser-expanded in the next pass.

## Prioritized Findings

1. `QA-001` medium: Operations Map pins and repeated `Go to room` buttons are under-labeled for assistive tech.
2. `QA-002` low: RoomPrompt visually concatenates the action and breadcrumb text.
3. `QA-003` low: Demo GM Office starts with duplicate Assistant GM report headlines.
4. `QA-004` low: Custom League Lab is not clearly discoverable as a facility destination after franchise entry.

## Created Harness

The new `qa/` harness includes shared protocols, severity/UX/facility/balance/accessibility rubrics, reporting and fix-prompt guides, reusable report templates, 15 agent role prompts, current-build reports, backlog files, and a prioritized fix-prompt queue.

