# Franchise Ice Phase 10 Custom League Rules Notes

## Current Playable Features

- Fictional client-only franchise mode with default 12-team starts and supported 8-, 10-, 12-, and 16-team Custom League Lab starts.
- Third-person operations hub with room panels for GM Office, roster, coaching, arena, scouting, development, contracts, trades, free agency, staff, owner, press, agents, meetings, standings, settings, saves, and dev tools.
- Multi-season dynasty loop with simplified regular season, playoffs, draft, re-signing, free agency, staff hiring, training camp, aging, retirements, history, and owner goals.
- Living hockey operations with fictional decision events, relationships, agents, media/fan/owner sentiment, story arcs, and Assistant GM guidance.
- Phase 8 tutorial, Learn the Game guide, achievements, milestones, generated audio, accessibility settings, local telemetry, bug-report export, and release-candidate smoke tests.
- Phase 9 Custom League Lab with local fictional data packs, scenario starts, team creator, roster/player editor helpers, draft-class editor helpers, generated branding previews, validation/repair, and JSON import/export.
- Phase 10 rule presets with custom team count, schedule format, games per team, playoff format, series format, draft rounds, draft class size, cap ceiling/floor, active roster limits, affiliates, Data Pack v2 validation, and multi-season custom dry-run coverage.

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

## Custom League Lab Flow

1. From the start screen, choose `Custom League Lab`.
2. Edit the working fictional data pack or load a local imported pack.
3. Use Rules, Teams, Rosters, Draft Class, and Scenarios tabs to shape the setup.
4. Validate or repair the pack before starting.
5. Start a supported 8-, 10-, 12-, or 16-team custom league or scenario. Custom rule metadata appears in the TopBar, GM Office, Trophy Hall, saves, and bug reports.

## What To Test

- First-franchise onboarding clarity.
- Whether the GM Office makes the next useful action obvious.
- Roster/lineup readiness before simulation.
- Game Result Center readability after instant, period, and broadcast sims.
- Achievement and milestone timing.
- High contrast, larger text, reduce flashes, keyboard shortcuts, and Help/Guide usability.
- Save export/import, repair, diagnostics, and bug-report export.
- Fan sentiment and owner goal reporting in longer playtests.
- Data-pack validation, import/export roundtrip, repair behavior, scenario starts, custom first-game simulation, custom save/load metadata, and 8/10/12/16 rule-set dry runs.

## Known Limitations

- Tutorial and guide content are prototype onboarding layers.
- Achievements are local-only.
- Audio is generated/local placeholder audio, not final professional sound design.
- Telemetry and bug reports are local-only and never sent anywhere automatically.
- Data packs are local JSON only and are not uploaded or shared online by the app.
- The real-world content filter is a basic obvious-term scan and not a legal guarantee.
- Full-dynasty custom starts support 8-, 10-, 12-, and 16-team fictional leagues. Unsupported combinations such as 14 teams, invalid playoff formats, or too-small draft classes are rejected or repaired with clear warnings.
- Waivers, buyouts, retained salary, no-trade/no-move clauses, arbitration, offer sheets, multi-team trades, backend/cloud/online services, real hockey branding/content, and playable on-ice hockey remain out of scope.

## Safety And Licensing

All teams, players, brands, data packs, scenarios, headlines, achievements, guide content, and audio cues are fictional or generated locally. The app does not fetch licensed audio, logos, jerseys, fonts, external data packs, or real hockey content.

## Browser Support Note

The app targets modern desktop browsers with WebGL and IndexedDB. Web Audio cues fail quietly if the browser blocks or lacks AudioContext support. The 3D bundle remains large because Three.js and React Three Fiber are core to the prototype.
