# Franchise Ice Closed Beta Checklist

## Build commands

- `npm run typecheck`
- `npm test`
- `npm run test:smoke`
- `npm run build`
- `npm run check`

## Release commands

- Build locally with `npm run build`.
- Review `dist/` size warnings and the known three-r3f chunk warning.
- Package only the static client output. Do not add backend, auth, cloud sync, online sharing, or network telemetry.

## Manual smoke test

- Start a demo franchise.
- Open GM Office, Roster Office, Coach Office, Arena, Save Desk, Feedback Desk, and Settings.
- Sim one game in instant mode.
- Confirm Game Result Center shows post-game summary, three stars, consequences, next recommendation, and local autosave.
- Export a bug report and a feedback bundle.

## First 30-minute playtest

- New tester starts a standard fictional franchise or demo.
- Tester reads Assistant GM report.
- Tester follows the first-hour checklist.
- Tester sets or auto-fills lines.
- Tester sims one game and explains why the result happened.
- Tester saves locally and knows where recovery lives.
- Tester submits one positive or confusing feedback entry.

## Custom league test

- Validate a default fictional data pack.
- Try 8-, 10-, 12-, and 16-team rule presets.
- Confirm unsupported rule combinations are rejected or clearly warned.
- Start a supported custom league and sim one game.
- Export the local data pack and a safety save.

## Save recovery test

- Save to a manual slot.
- Overwrite once to create a snapshot.
- Restore the snapshot.
- Export save JSON.
- Repair a warning-only save if available.
- Confirm feedback export excludes full save JSON by default.

## Accessibility test

- Toggle reduced motion, reduced flashes, high contrast, larger text, and reduced 3D detail.
- Confirm major panels remain readable and scrollable.
- Confirm audio cues no-op safely when audio is disabled.
- Preview generated audio cues from Settings after a user gesture.

## Bug report export test

- Add a playtester note.
- Export bug report JSON without full save.
- Confirm version, schema, rules, runtime health summary, save integrity, invariant summary, and UX friction summary appear.
- Export feedback bundle with diagnostics summary.

## Known non-blockers

- three-r3f chunk warning is expected for the current 3D facility.
- Generated audio is placeholder.
- Mobile is not the primary closed-beta target.
- Real-world content filtering is basic.
- Hockey, CBA, roster, and playoff rules remain intentionally simplified.

## Release blocker checklist

- Any required build command fails.
- Save import/export roundtrip fails.
- Full save appears inside feedback bundle by default.
- Network telemetry, backend, cloud sync, online sharing, or real licensed content is introduced.
- Data-pack validation accepts obvious restricted hockey branding terms without warning.
- Game Result Center cannot show the next recommended action after a played game.
