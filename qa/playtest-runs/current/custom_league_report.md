# Custom League Tester Report

Date: 2026-05-16
Build: Franchise Ice v0.1.0 | Phase 13 Facility Masterplan | schema v8 | beta
Agent: custom_league_tester
Report File: qa/playtest-runs/current/custom_league_report.md

## Coverage

Commands verified in the shared current pass:

- `npm run typecheck`: passed.
- `npm test`: passed after sandbox config-access rerun; 16 files / 252 tests.
- `npm run test:smoke`: passed after sandbox config-access rerun; 6 files / 106 tests.
- `npm run build`: passed after sandbox config-access rerun; known large chunk warning.
- `npm run check`: passed end to end.

Areas inspected:

- `src/game/systems/leagueRules.ts`
- `src/game/systems/dataPackValidation.ts`
- Phase 9 customization tests.
- Phase 10 league rules tests.
- Start-screen Custom League Lab entry.
- Facility blueprint relationship to Customization district.

Browser coverage:

- Start-screen `Custom League Lab` entry was visible.
- Rerun opened `Custom League Lab` from the start screen.
- Rerun confirmed the lab shows Working Pack, Library, Rules, Teams, Rosters, Draft Class, Scenarios, Import / Export, and `Start Franchise`.
- Complete custom league franchise creation was not manually performed in browser during this pass.

## Finding QA-004: Custom League Lab is not clearly discoverable as a facility destination after franchise entry

Severity: low
Confidence: medium
Area: Custom league discoverability
Room/Flow: Start screen -> Custom League Lab -> in-facility map
Repro Steps:
1. Confirm `Custom League Lab` is available from the start screen.
2. Enter a demo franchise.
3. Open Operations Map.
4. Inspect the Customization district and room list.
Expected:
The facility should communicate where custom league/data-pack tools live after entering a franchise, or that the lab is a pre-franchise setup surface.
Actual:
Custom league starts are test-covered and visible on the start screen, but in-facility Customization Lab mapping is not clearly connected to that player-facing feature.
User Impact:
Closed-beta testers may think custom league functionality is not integrated with the new Phase 13 facility, even though the underlying systems pass.
Evidence:
Source review of `src/game/facility/facilityBlueprint.ts`, `FACILITY_BLUEPRINT.md`, `src/game/systems/leagueRules.ts`, Phase 9 and Phase 10 tests; browser start-screen/map review; rerun screenshot `qa/playtest-runs/current/phase13-custom-league-rerun.png`.
Likely Files:
`src/game/facility/facilityBlueprint.ts`, `src/components/hud/OperationsMap.tsx`, `FACILITY_BLUEPRINT.md`, `src/components/rooms/SaveLoadPanel.tsx`
Suggested Fix Direction:
Add clear facility copy or route hints for current Custom League Lab availability without adding new league-rule systems.
Acceptance Criteria:
Closed-beta players can understand from the facility UI whether Custom League Lab is accessible in the current franchise session or reserved for setup.

## Completion

8-, 10-, 12-, and 16-team league systems remain covered by automated tests, and no rule-validation defect was found. Do not implement fixes as part of this report.
