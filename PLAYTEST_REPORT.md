# Phase 4 Playtest Report

## Scope

- Build: Phase 4 beta hardening, presentation, balance, and identity.
- Harness: `runDynastyPlaytest(seed, 3, "harbor-city")`.
- Balance report: `generateBalanceReport(seeds, 1)`.
- Seeds: `40401`, `40402`, `40403`, `40404`, `40405`.

## Results

- Seasons simulated: 15 total dry-run seasons.
- Fatal errors: 0.
- Invariant errors: 0.
- Draft selections: 48 per season, with no duplicate selections in the sampled runs.
- Save integrity: three-season save export/import is covered by `src/tests/phase4Playtest.test.ts`.
- Champion history was produced for every three-season run.

## Sample Champion History

- `40401`: 2026 Metro Titans, 2027 Prairie Falcons, 2028 Metro Titans.
- `40402`: 2026 Metro Titans, 2027 Iron Valley Miners, 2028 Lakeside Royals.
- `40403`: 2026 Harbor City Blades, 2027 Metro Titans, 2028 Lakeside Royals.
- `40404`: 2026 Capital Comets, 2027 Northstar Wolves, 2028 Harbor City Blades.
- `40405`: 2026 Desert Vipers, 2027 Cascadia Storm, 2028 Capital Comets.

## Selected Team Records

- `40401`: 10-12-0, 12-8-2, 12-6-4.
- `40402`: 12-7-3, 10-10-2, 14-7-1.
- `40403`: 16-5-1, 15-5-2, 17-4-1.
- `40404`: 14-6-2, 9-13-0, 13-8-1.
- `40405`: 7-14-1, 14-6-2, 11-9-2.

## Balance Notes

- Average total goals per game: 5.102. This is about 2.55 goals per team and inside the requested arcade-management target band.
- Average total shots per game: 55.344. This is about 27.67 shots per team and inside target.
- Power play conversion: 16.4%.
- Shutout frequency: 15.6%.
- Overtime frequency: 17.0%.
- Average team cap hit: about $94.1M against the tuned $96.0M ceiling.
- Over-cap samples remain present in the report: 26 team-season samples. This is acceptable for pressure, but still a tuning target.
- Free-agent signing rate: 37.5%. AI signings now move over the week instead of clearing the whole market immediately.
- Average star salary: about $12.0M.
- Average depth salary: about $1.75M.
- Draft quality steps down by round, with first-round potential materially higher than later rounds.

## UX Notes

- GM Office now exposes phase label, description, recommended next step, checklist, advance preview, and danger warnings.
- Save Desk now exposes schema version, phase, season, selected-team record, warnings, repair, export, and import.
- Help and settings are keyboard-accessible through `H`, `M`, and `Escape`.
- Dev Tools dry runs are development-only and do not apply state to the active franchise save.

## Known Issues

- Multi-season roster warnings still appear by year three because simplified free agency and prospect promotion do not fully manage depth charts for every AI club.
- Re-signing acceptance and owner goal completion remain conservative in the balance report and should be tuned with more targeted samples.
- The React Three Fiber production chunk remains above Vite's default warning threshold even after panel-level lazy loading.
- Minor leagues, waivers, buyouts, retained salary, clauses, arbitration, offer sheets, multi-team trades, backend/cloud/online play, real branding, audio, and playable on-ice hockey remain out of scope.

## Recommended Next Work

- Add AI roster top-up logic during training camp using existing fictional free agents and prospects.
- Tune owner goal completion sampling so successful seasons produce more varied job-security movement.
- Add a focused re-signing balance harness that tests realistic expiring-player offers by role and team cap state.
- Consider a Rollup manual chunk for Three/R3F/Drei if the bundle warning becomes a release blocker.
