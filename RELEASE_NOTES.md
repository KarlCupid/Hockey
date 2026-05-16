# Franchise Ice Phase 12 Closed Beta Candidate Notes

## Status

Franchise Ice is now a Phase 12 Closed Beta Candidate. The systems foundation remains client-only and feature-complete for beta purposes; this pass focuses on feedback capture, clarity, presentation, content depth, and QA.

## What Changed In Phase 12

- Added local-only Feedback Desk with category, severity, current room/phase, diagnostics summary toggle, save-summary toggle, capped local entries, and export bundle JSON.
- Added UX friction detection and Dev Tools report for invalid roster sim blocks, unresolved blocking actions, custom-league validation loops, skipped tutorial, unread results, save-load loops, and Assistant GM backlog.
- Added first-hour, after-first-game, before-offseason, and custom-league onboarding checklists.
- Improved tutorial skip/completion copy and kept Help/Guide discoverable after skip.
- Added post-game summary cards for record movement, standings context, morale/fatigue, story fallout, achievement fallout, and next recommended action.
- Added generated audio preview labels, Settings preview buttons, deterministic team horn variants, and softer placeholder cue tuning.
- Expanded fictional narrative templates and validation coverage.
- Improved primitive-only facility atmosphere with room lighting, branded accents, and a feedback desk while respecting reduced 3D detail.
- Added closed-beta balance dashboard v2 and Phase 12 test coverage.
- Added [CLOSED_BETA_CHECKLIST.md](CLOSED_BETA_CHECKLIST.md) and [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

## What To Test

- First 30 minutes: start, understand next steps, set lines, sim one game, read result, save, and submit feedback.
- Feedback export: verify diagnostics are optional and full save JSON is excluded by default.
- UX friction: intentionally block a sim with an invalid roster and confirm guidance appears.
- Post-game result clarity: confirm next recommended action, fatigue/morale/story/achievement fallout, and no raw IDs.
- Custom league: validate 8-, 10-, 12-, and 16-team fictional starts and export a safety save.
- Accessibility/audio: reduced motion/detail, reduced flashes, audio previews, and safe no-op audio behavior.

## Current Playable Features

- Fictional client-only franchise mode with default 12-team starts and supported 8-, 10-, 12-, and 16-team Custom League Lab starts.
- Third-person operations hub with room panels for GM Office, roster, coaching, arena, scouting, development, contracts, trades, free agency, staff, owner, press, agents, meetings, standings, settings, saves, and dev tools.
- Multi-season dynasty loop with simplified regular season, playoffs, draft, re-signing, free agency, staff hiring, training camp, aging, retirements, history, and owner goals.
- Living hockey operations with fictional decision events, relationships, agents, media/fan/owner sentiment, story arcs, and Assistant GM guidance.
- Tutorial, Learn the Game guide, achievements, milestones, generated/local audio, accessibility settings, local telemetry, bug-report export, and release smoke tests.
- Custom League Lab with local fictional data packs, scenario starts, team creator, roster/player editor helpers, draft-class editor helpers, generated branding previews, rule presets, validation/repair, and JSON import/export.
- Phase 11 public beta package with install-friendly PWA metadata, static app-shell service worker, release labels, runtime health logs, save snapshots/recovery, demo mode, low-spec preset, beta checklist, and release scripts.
- Phase 12 closed beta polish package with feedback export, friction reports, onboarding checklists, post-game clarity, audio previews, facility atmosphere, balance dashboard v2, and closed-beta QA docs.

## How To Play

```bash
npm install
npm run dev
```

Open the local Vite URL, choose `Try Demo Franchise` for a safe sandbox, or choose `New Franchise` / `Custom League Lab` for a normal start.

## How To Verify

```bash
npm run typecheck
npm test
npm run test:smoke
npm run build
npm run check
```

Optional bundle summary:

```bash
npm run build:report
```

## Public Beta Test Checklist

- Start the demo franchise, read the Assistant GM card, open the roster/coach rooms, and simulate the upcoming game.
- Start a normal franchise and follow the tutorial through GM Office, roster, lines, tactics, Arena Bowl, Save Desk, and Trophy Hall.
- Export diagnostics and a bug report from Save Desk after a game.
- Save manually, overwrite the slot, restore a snapshot, and confirm the current team/season look correct.
- Try the low-spec preset in Settings and verify reduced motion/detail remain readable.
- Open Custom League Lab, validate a fictional 8-, 10-, 12-, or 16-team setup, start it, and simulate a first game.

See [BETA_TESTING.md](BETA_TESTING.md) for longer first-season, custom-league, accessibility/audio, and bug-report flows.

## Bug Reports And Diagnostics

- Save Desk can export a local diagnostic summary or bug-report JSON.
- Bug reports now include app version, Phase 12 release label, save schema version, release channel, compatibility summary, runtime health summary, UX friction summary, and local telemetry if enabled.
- Full save JSON is excluded unless explicitly included.
- Runtime health logs are capped, local, clearable, and never sent anywhere automatically.
- Feedback bundles are capped, local, export-only, and exclude full save JSON by default.

## Install And Offline-Friendly Notes

- The app includes `public/manifest.webmanifest`, local SVG icons, browser install metadata, and a first-party service worker.
- The service worker caches only static app-shell/assets. It does not cache localForage save data, data packs, telemetry, or bug reports.
- PWA/offline behavior is a static/local convenience for beta playtesting, not cloud sync or online sharing.

## Known Limitations

- PWA/offline support is static-shell only.
- Saves, snapshots, data packs, telemetry, and bug reports remain local to the browser profile.
- Data packs are local JSON only and are not uploaded or shared online by the app.
- The real-world content filter is a basic obvious-term scan and not a legal guarantee.
- The `three-r3f` production chunk remains large because Three.js, React Three Fiber, and Drei are core to the 3D facility.
- Audio is generated/local placeholder audio, not final professional sound design.
- Small screens show a desktop recommended message rather than a dedicated mobile layout.
- Waivers, buyouts, retained salary, no-trade/no-move clauses, arbitration, offer sheets, multi-team trades, backend/cloud/online services, real hockey branding/content, and playable on-ice hockey remain out of scope.

## Safety, Privacy, And Licensing

All teams, players, brands, data packs, scenarios, headlines, achievements, guide content, and audio cues are fictional or generated locally. The app does not fetch licensed audio, logos, jerseys, fonts, external data packs, real hockey content, analytics, or remote telemetry.

## Browser Support Note

The app targets modern desktop browsers with WebGL, IndexedDB/localForage, service-worker support for install-friendly builds, and ES modules. Web Audio cues fail quietly if the browser blocks or lacks AudioContext support.
