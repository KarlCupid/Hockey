# Franchise Ice Public Beta Testing Guide

## Goal

Phase 11 is about installability, recovery, diagnostics, compatibility, and release confidence. Please test whether the existing franchise game is understandable, stable, recoverable, and easy to report on.

## Suggested 30-Minute Playtest

1. Launch the app and choose `Try Demo Franchise`.
2. Read the Assistant GM recommendation and open GM Office.
3. Visit Roster Office, Coach's Office, Arena Bowl, Save Desk, Settings, and Help.
4. Simulate one game through broadcast mode or instant sim.
5. Review the result, standings, achievements, and any decision/event fallout.
6. Export a diagnostic summary or bug report from Save Desk.

## Suggested First-Season Playtest

1. Start a normal fictional franchise.
2. Follow the tutorial until it is complete or dismissed.
3. Save manually, overwrite the slot, and verify a snapshot appears.
4. Sim several games using at least two simulation modes.
5. Finish the regular season, resolve playoffs, and advance into the offseason.
6. Record whether the GM Office made the next useful action clear.

## Suggested Custom League Playtest

1. Open `Custom League Lab`.
2. Pick an 8-, 10-, 12-, or 16-team fictional setup.
3. Validate or repair the pack before starting.
4. Start the custom league, save it, simulate a first game, and export a bug report.
5. Try a deliberately unsupported rule combination and confirm the warning is clear.

## Accessibility And Audio Test

- Try high contrast, larger text, reduce motion, reduce flashes, compact table density, and keyboard shortcuts.
- Try the low-spec preset in Settings and confirm the app remains readable.
- Enable and disable local/generated audio. Audio should no-op safely if the browser blocks AudioContext.
- Use `H`, `M`, `Escape`, and optional room shortcuts if keyboard shortcuts are enabled.

## Save Recovery Test

1. Create or load a franchise.
2. Save to a manual slot.
3. Save to the same slot again to create a snapshot.
4. Select the slot in Save Desk and restore/export/delete a snapshot.
5. Confirm snapshots are labeled local-only and do not overwrite other slots unexpectedly.

## How To Report Bugs

1. Open Save Desk.
2. Export a diagnostic summary for quick notes.
3. Export a bug report JSON when behavior looks broken.
4. Include what you were doing, browser name/version, approximate viewport size, and whether low-spec or accessibility settings were enabled.

Bug reports include release version, schema version, compatibility summary, settings, runtime health, and local telemetry if enabled. Full save data is excluded unless explicitly included.

## Browser Support Notes

- Target: modern desktop browsers with WebGL, IndexedDB/localForage, ES modules, and service-worker support.
- Best tested viewport sizes: 1366x768, 1440x900, and larger desktop/laptop screens.
- Very small screens are not the main target and show a desktop recommended message.
- The 3D facility can be heavy on low-end GPUs; use the low-spec preset if movement or rendering feels sluggish.

## Privacy And Local-Only Notes

- No backend, authentication, cloud save, online sharing, remote analytics, or network telemetry is included.
- Saves, snapshots, imported data packs, telemetry, runtime health logs, and bug reports remain local to the browser profile.
- The service worker caches only static app-shell/assets. It does not cache user saves or data packs.

## Known Limitations

- PWA/offline support is static-shell/local-only.
- Data packs are local JSON and the restricted-content scan is a basic obvious-term filter, not a legal guarantee.
- Audio is generated/local placeholder sound.
- The `three-r3f` bundle is large because the 3D facility uses Three.js and React Three Fiber.
- Waivers, buyouts, retained salary, clauses, arbitration, offer sheets, multi-team trades, backend/cloud/online play, real branding, professional audio, and playable on-ice hockey remain out of scope.
