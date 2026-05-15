# Franchise Ice Phase 8 Release Candidate Notes

## Current Playable Features

- Fictional 12-team client-only franchise mode with local saves.
- Third-person operations hub with room panels for GM Office, roster, coaching, arena, scouting, development, contracts, trades, free agency, staff, owner, press, agents, meetings, standings, settings, saves, and dev tools.
- Multi-season dynasty loop with simplified regular season, playoffs, draft, re-signing, free agency, staff hiring, training camp, aging, retirements, history, and owner goals.
- Living hockey operations with fictional decision events, relationships, agents, media/fan/owner sentiment, story arcs, and Assistant GM guidance.
- Phase 8 tutorial, Learn the Game guide, achievements, milestones, generated audio, accessibility settings, local telemetry, bug-report export, and release-candidate smoke tests.

## How To Run

```bash
npm install
npm run dev
```

## How To Verify

```bash
npm test
npm run test:smoke
npm run build
```

## Recommended First Playthrough

1. Create a new franchise and choose any fictional club.
2. Follow the guided tutorial from GM Office to roster, lines, tactics, arena simulation, Save Desk, and Trophy Hall.
3. Read the Assistant GM report and Master Action Queue before simulating.
4. Sim the first game in broadcast mode once, then use instant or period sim as preferred.
5. Check achievements/milestones in the Trophy Hall.
6. Export a diagnostic report from Save Desk if anything feels confusing or unstable.

## What To Test

- First-franchise onboarding clarity.
- Whether the GM Office makes the next useful action obvious.
- Roster/lineup readiness before simulation.
- Game Result Center readability after instant, period, and broadcast sims.
- Achievement and milestone timing.
- High contrast, larger text, reduce flashes, keyboard shortcuts, and Help/Guide usability.
- Save export/import, repair, diagnostics, and bug-report export.
- Fan sentiment and owner goal reporting in longer playtests.

## Known Limitations

- Tutorial and guide content are prototype onboarding layers.
- Achievements are local-only.
- Audio is generated/local placeholder audio, not final professional sound design.
- Telemetry and bug reports are local-only and never sent anywhere automatically.
- Waivers, buyouts, retained salary, no-trade/no-move clauses, arbitration, offer sheets, multi-team trades, backend/cloud/online services, real hockey branding/content, and playable on-ice hockey remain out of scope.

## Safety And Licensing

All teams, players, brands, headlines, achievements, guide content, and audio cues are fictional or generated locally. The app does not fetch licensed audio, logos, jerseys, fonts, or real hockey content.

## Browser Support Note

The app targets modern desktop browsers with WebGL and IndexedDB. Web Audio cues fail quietly if the browser blocks or lacks AudioContext support. The 3D bundle remains large because Three.js and React Three Fiber are core to the prototype.
