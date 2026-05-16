# Release Verification Protocol

## Mission

Verify whether the current Franchise Ice build is safe to hand to closed-beta testers. This is a gate, not a feature pass.

## Full Command Suite

Run all commands:

```bash
npm run typecheck
npm test
npm run test:smoke
npm run build
npm run check
```

Record pass/fail status, runtime notes, and known warnings. The documented large `three-r3f` chunk warning is accepted unless it changes into a build failure or an unexplained bundle regression.

## Manual/Browser Gate

When browser access is available, verify:

- Start screen renders.
- `Try Demo Franchise` enters the hub.
- TopBar shows release and district context.
- Operations Map opens and filters districts.
- Direct `Go to room` fallback opens GM Office, Roster Office, Coach Office, Arena Bowl, Save Desk, Feedback Desk, and Settings.
- One game can be simulated and a result reviewed.
- Bug report or feedback export remains local-only and excludes full save JSON by default.

If browser access is unavailable, state that clearly and rely on source/tests for that pass.

## Release Blockers

- Any required command fails.
- Any source/test/browser evidence shows save corruption.
- Any export leaks full save JSON by default.
- Any supported custom league size cannot start or simulate a first game.
- Any facility core room is missing, duplicated, severely overlapped, or disconnected.
- Any network telemetry/backend/cloud/real branding is introduced.

