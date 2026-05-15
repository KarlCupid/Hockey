# Phase 4 And Phase 5 Playtest Report

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

- Multi-season roster warnings appeared by year three in the Phase 4 report because simplified free agency and prospect promotion did not fully manage depth charts for every AI club. Phase 5 addresses this with roster statuses, affiliate depth, AI repair, training-camp finalization, and emergency replacement logic.
- Re-signing acceptance and owner goal completion were conservative in the Phase 4 balance report. Phase 5 adds focused re-signing and owner-goal balance harnesses and tunes acceptance/security movement without making outcomes automatic.
- The React Three Fiber production chunk remains above Vite's default warning threshold even after panel-level lazy loading.
- Minor leagues, waivers, buyouts, retained salary, clauses, arbitration, offer sheets, multi-team trades, backend/cloud/online play, real branding, audio, and playable on-ice hockey remain out of scope.

## Recommended Next Work

- Expand affiliate presentation over time with more long-form reports and history, without adding a full playable minor-league schedule yet.
- Continue tuning replacement-player frequency across larger seed batches so emergency signings stay rare.
- Deepen contract and owner personality later if the project enters a future CBA-focused phase.
- Continue watching the Three/R3F/Drei chunk after the Phase 5 Rollup manual chunk split.

## Phase 5 Scope

- Build: Phase 5 roster ecosystem, affiliate system, AI roster management, training-camp setup, re-signing balance, and owner-goal balance.
- Harness: `runDynastyPlaytest("phase5-five-season", 5, "harbor-city")`.
- Tests: `src/tests/phase5RosterEcosystem.test.ts`.
- Primary target: eliminate fatal multi-season roster collapse and materially reduce roster-short warnings by giving every team active, scratched, affiliate, IR, and prospect pathways.

## Phase 5 Results

- Five-season stress seeds covered in tests: `phase5-five-season`.
- Fatal roster invariant errors: 0.
- Save serialization after five seasons: passed.
- Draft-pick ownership consistency after five seasons: passed.
- Active/affiliate cap distinction: passed.
- Affiliate/IR/retired/prospect-rights lineup exclusion: passed.
- No-active-goalie repair: passed.
- Below-minimum active roster repair: passed.
- Duplicate replacement/player ID protection: passed.
- AI training camp finalization: passed.
- Emergency replacements: available as last resort; focused tests verify repair prefers existing depth first and uses generated replacements only when the organization cannot otherwise satisfy minimum health.
- Roster-short warnings: materially reduced from the Phase 4 known issue by pre-game, training-camp, new-season, post-free-agency, post-trade, save-hydration, and playtest repair passes.

## Phase 5 Roster Repair Outcomes

- Every generated team now receives one fictional affiliate at franchise creation and during save migration.
- Existing saves hydrate to schema version 4 with roster statuses, affiliate data, roster move logs, active roster limits, player development paths, and career-stage defaults.
- AI clubs classify surplus players to affiliate, preserve stars on active rosters when possible, promote depth where needed, sign from free agency when available, and create low-cost fictional replacements only as a safety net.
- Training camp finalization reduces active rosters to 23 or fewer where possible while keeping a game-valid 12F/6D/2G target.
- The Coach Office lineup pool now excludes affiliate, injured reserve, retired, and prospect-rights players; scratched healthy players can be activated through roster actions.

## Phase 5 Balance Notes

- Re-signing samples now verify fair offers outperform weak offers, strong offers are usually attractive, RFAs are easier to retain than UFAs, and cap pressure still creates walk risk.
- Owner-goal sampling now verifies successful seasons improve job security, rebuilding clubs receive at least one development/draft/cap style goal, and contenders receive at least one performance goal.
- Affiliate development uses age, potential, morale, goalie-project pacing, and Development Coach modifiers to create reports and promotion candidates without adding playable minor-league games.
- Cap treatment remains intentionally simplified: active, scratched, and IR players count against active cap; affiliate players are cap-exempt; retained salary and real-world CBA rules remain out of scope.

## Phase 6 Scope

- Build: Phase 6 living hockey operations, relationships, media, owner pressure, fictional agents, story arcs, and decision events.
- Harness: `runDynastyPlaytest("phase6-five-season", 5, "harbor-city")`.
- Tests: `src/tests/phase6LivingOps.test.ts`.
- Primary target: make the dynasty feel alive through bounded, serializable story and meeting systems without adding waivers, buyouts, retained salary, clauses, arbitration, offer sheets, multi-team trades, backend/cloud systems, real branding, or playable on-ice hockey.

## Phase 6 Results

- Five-season stress seed covered in tests: `phase6-five-season`.
- Fatal living-ops invariant errors: 0.
- Decision events generated: 6.
- High-severity events generated: 2.
- Story arcs started: 6.
- Story arcs resolved: 2.
- Contract pressure events: 0.
- Trade rumor events: 2.
- Playoff pressure events: 2.
- Active decision events at end of dry run: 0.
- Final story arcs retained: 5, within the cap.
- Duplicate active repeat-key events: none reported by invariants.
- Relationship/team dynamics values remained bounded from 0 to 100.

## Phase 6 Sentiment Trends

- Owner trust: 100, 100, 100, 100, 100 across 2026-2030 in the sample run.
- Team chemistry: 100, 100, 100, 100, 100 across 2026-2030 in the sample run.
- Media pressure: 0, 0, 0, 0, 0 across 2026-2030 in the sample run after deterministic transparent/balanced auto-resolution.
- Fan sentiment: 77, 78, 79, 80, 81 across 2026-2030.
- Player trust lows/highs:
  - 2026: 58.84 / 75.24.
  - 2027: 58.28 / 86.
  - 2028: 58.84 / 95.
  - 2029: 58.84 / 100.
  - 2030: 59.12 / 100.

## Phase 6 Notes

- The story stress run auto-resolves decisions with deterministic balanced/transparent options, so the sample trends represent low-chaos GM behavior rather than maximum-drama play.
- Events are intentionally conservative: the system favors deduped, room-specific, high-signal decisions over daily noise.
- Warnings still appear in broad multi-season reports because the harness records nonfatal roster/economy balance pressure; no fatal Phase 6 invariant errors were reported.
- Press, owner, agent, player, and team conversations are fictional text-choice systems with bounded consequences, not full dialogue simulation.
