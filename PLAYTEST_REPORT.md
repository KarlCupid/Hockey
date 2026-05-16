# Phase 4 Through Phase 12 Playtest Report

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

## Phase 7 Scope

- Build: Phase 7 game feel, difficulty, narrative content, Assistant GM, action queue, setup wizard, and playtest tuning.
- Harness: `generatePhase7BalanceReport("harbor-city")`, which runs five-season dry runs for six difficulty/story/mode scenarios.
- Tests: `src/tests/phase7GameFeel.test.ts`.
- Primary target: keep Phase 6 stability while making multi-season playtests less flat through configurable pressure, richer fictional content, Assistant GM guidance, and better "what should I do next?" UX.

## Phase 7 Difficulty And Story Comparison

| Scenario | Events | High Severity | Story Arcs Started/Resolved | Media Trend | Assistant GM Recs | Urgent Actions | Fatal Errors |
| --- | ---: | ---: | --- | --- | ---: | ---: | ---: |
| relaxed / quiet | 12 | 3 | 9 / 2 | 13, 2, 6, 2, 2 | 34 | 0 | 0 |
| standard / normal | 33 | 2 | 7 / 4 | 6, 6, 6, 6, 6 | 32 | 0 | 0 |
| demanding / normal | 38 | 2 | 10 / 3 | 7, 7, 7, 7, 7 | 35 | 0 | 0 |
| hardcore / dramatic | 56 | 2 | 7 / 3 | 13, 13, 13, 13, 13 | 25 | 0 | 0 |
| rebuildChallenge / normal | 36 | 2 | 11 / 2 | 6, 6, 6, 6, 6 | 33 | 0 | 0 |
| pressureCooker / dramatic | 63 | 3 | 10 / 3 | 14, 14, 14, 14, 14 | 31 | 0 | 0 |

## Phase 7 Trends

- Standard/normal generated 33 decision events over five seasons, up from the Phase 6 sample's 6 events.
- Dramatic pressure scenarios generated the most story cadence: 56 events for hardcore/dramatic and 63 for pressureCooker/dramatic.
- Quiet mode remained lower-noise than dramatic modes while still producing enough events to avoid the old ultra-flat stress run.
- Media pressure no longer stayed pinned at 0 in the comparison. Standard/normal held a low but visible 6/100 floor after calm auto-resolution, while dramatic pressure modes held 13-14/100.
- Owner trust stayed high in the sampled runs because the deterministic playtest GM auto-resolves decisions with mostly transparent/supportive choices and Harbor City often succeeds. It no longer sits at exactly 100 in the Phase 7 comparison.
- Team chemistry varied in multiple runs, especially relaxed/quiet and pressureCooker/dramatic, showing roster/story churn can now push it off the cap.
- Fan sentiment remained stable in this particular deterministic comparison because snapshots occur after new-season reset and the auto-resolved sample avoids star-trade/playoff-miss swings. This remains a tuning watch item.
- Assistant GM recommendations appeared in every five-season comparison run.
- Urgent action count was 0 in the comparison because the harness repairs blocking rosters and auto-resolves decisions; targeted tests cover invalid roster, pending draft pick, and high-severity decision urgency.
- Fatal invariant errors were 0 across all six Phase 7 scenarios.

## Phase 7 Cap, Contracts, And Goals

- Cap pressure trend examples:
  - relaxed / quiet: 88, 67, 54, 54, 55.
  - standard / normal: 97, 96, 99, 96, 99.
  - hardcore / dramatic: 125, 89, 87, 69, 65.
  - pressureCooker / dramatic: 100, 84, 85, 81, 80.
- Contract acceptance rates in the comparison ranged from 0.4 to 1.0, with stricter difficulty generally lowering acceptance.
- Owner goal completion rate was 0.0 in the sampled comparison because end-of-run snapshots occur after goals refresh; owner goal completion remains covered by focused owner-goal tests and is still a reporting target for future tuning.

## Phase 7 Verification

- `cmd /c npm test`: passed with 10 test files and 146 tests.
- `cmd /c npm run build`: passed. Vite still reports the known large `three-r3f` dependency chunk warning.
- Schema 5 saves hydrate to schema 6 with GM profile, difficulty tuning, Assistant GM reports, and narrative template version.
- Narrative template validation passes and blocks obvious real hockey branding terms.
- Five-season standard/normal playtest has zero fatal invariant errors.
- Hardcore/dramatic produces more events and pressure than relaxed/quiet in deterministic samples.

## Phase 7 Known Limitations

- Difficulty/game modes are simplified tuning layers, not a complete job-security or market-economy simulator.
- Narrative templates are short fictional procedural text snippets, not full dialogue trees.
- Assistant GM reports are advisory and do not autopilot roster, contract, trade, lineup, or phase decisions.
- Fan sentiment needs more targeted star-trade, playoff-miss, and success/failure sampling in future tuning.
- Waivers, buyouts, retained salary, clauses, arbitration, offer sheets, multi-team trades, backend/cloud/online play, real branding, professional audio, and playable on-ice hockey remain out of scope.

## Phase 8 Scope

- Build: Phase 8 release-candidate UX, tutorial, Learn the Game guide, achievements/milestones, generated local audio, broadcast polish, accessibility, local telemetry, bug-report export, fan sentiment balance sampling, owner goal reporting, and smoke QA.
- Harness: `src/tests/phase8ReleaseCandidate.test.ts` plus the existing full Vitest suite.
- Primary target: make the deep prototype easier to learn, more satisfying to play, more stable to test, and safer to report bugs on without adding another major hockey rule system.

## Phase 8 Verification

- `cmd /c npm run test:smoke`: passed with 1 test file and 9 release-candidate smoke tests.
- `cmd /c npm test`: passed with 11 test files and 155 tests.
- `cmd /c npm run build`: passed. Vite still reports the known large `three-r3f` dependency chunk warning.
- Schema 6 and older saves hydrate to schema 7 with tutorial state, achievements, milestones, local telemetry, and owner goal outcome history.
- New smoke flow creates a franchise with setup options, completes tutorial steps, generates an Assistant GM report, simulates until a first win, unlocks achievements, exports/imports a save, validates invariants, and runs a two-season mini playtest.

## Phase 8 Tutorial, Guide, And UX Notes

- Tutorial state is active by default for first franchises and can complete, dismiss, reset, and serialize.
- Contextual hints appear for relevant rooms without blocking advanced players.
- Help now includes a Learn the Game guide/codex with coverage for all major rooms, including Dev Tools.
- GM Office shows tutorial progress and recent franchise moments.
- Trophy Hall shows achievements and milestones alongside standings/history.

## Phase 8 Achievement, Audio, Accessibility, And Diagnostics Notes

- Local-only achievements cover first day, first win, lineup edit, first trade, draft pick, prospect signing, meetings, press, owner goals, playoffs, championship, dynasty seasons, cap pressure, development, rivalry, and roster repair.
- Milestones create franchise timeline entries for wins, trades, draft picks, playoffs, championships, owner goals, story resolution, season completion, and new-season starts.
- Generated Web Audio cues are registered for UI, notification, warning, achievement, draft, trade, goal, final horn, broadcast, and ambience use. The engine no-ops gracefully without Web Audio.
- Accessibility helpers validate unique shortcuts, high contrast, larger text, reduce flashes, keyboard hints, and class generation.
- Save Desk exports a local diagnostic summary or bug-report JSON. Full save JSON is excluded by default.
- Local telemetry is capped and can be disabled.

## Phase 8 Fan And Owner Reporting Notes

- Targeted fan sentiment scenarios now sample star traded, fan favorite re-signed, big free agent signed, playoff miss, playoff berth, championship, rivalry win/loss, risky draft pick, losing streak, and prospect breakout.
- Phase 8 focused tests verify star trades and playoff misses lower fan sentiment while championships and big signings raise it.
- Owner goal outcomes are captured before seasonal refresh, split into performance/development/cap/draft categories, and reported from outcome history so the completion report is no longer zero solely because new goals were generated.

## Phase 8 Known Limitations

- Tutorial and guide content are prototype onboarding layers that need real-user playtest feedback.
- Achievements are local-only and are not platform achievements.
- Audio is generated/local placeholder sound design, not final professional audio.
- Telemetry and bug reports remain local-only and are never sent to a backend.
- Waivers, buyouts, retained salary, clauses, arbitration, offer sheets, multi-team trades, backend/cloud/online play, real branding, and playable on-ice hockey remain out of scope.

## Phase 9 Scope

- Build: Phase 9 Custom League Lab, local fictional data packs, scenario starts, team creator, roster/player editor helpers, draft-class editor helpers, validation/repair, local JSON import/export, data-pack store, and content expansion.
- Harness: `src/tests/phase9Customization.test.ts` plus `npm run test:smoke`.
- Primary target: increase replayability and user creativity while keeping the game client-only, fictional-only, serializable, and compatible with existing dynasty systems.

## Phase 9 Verification

- `cmd /c npx vitest run --config vitest.config.ts src/tests/phase9Customization.test.ts`: passed with 20 tests.
- `cmd /c npm test`: passed with 12 test files and 175 tests.
- `cmd /c npm run test:smoke`: passed with 2 test files and 29 tests.
- `cmd /c npm run build`: passed. Vite still reports the known large `three-r3f` dependency chunk warning.
- Data-pack validation passes for the built-in fictional pack.
- Invalid JSON returns a safe error report.
- Obvious restricted real-world hockey terms are flagged.
- Duplicate team/player/prospect IDs are flagged or repaired.
- Out-of-range ratings are flagged and repair clamps them.
- Data-pack export/import roundtrip passes.
- Custom 12-team league generation creates valid team IDs, schedule IDs, cap settings, team branding metadata, scouting draft class, staff, owner state, relationships, Assistant GM report, and save metadata.
- At Phase 9 release, unsupported non-12 team counts were rejected for dynasty starts with clear validation messaging.
- Built-in scenario starts validate and apply cap crunch, injuries, owner pressure, initial decision events, and story arcs.
- Custom franchise first-game simulation, save/load, bug-report metadata, and invariant checks pass.
- A two-season custom mini playtest completes without fatal invariant errors after save-hydration refreshes relationship/agent state across roster churn.
- In-app Browser QA was attempted against the local Vite server, but the automation browser blocked local URL navigation in this session; no browser workaround was used.

## Phase 9 Notes

- At the end of Phase 9, full-dynasty custom starts prioritized 12-team leagues because core invariants, playoffs, standings presentation, and long-run balance were tuned around the existing 12-team league.
- Phase 10 supersedes this limitation by supporting 8-, 10-, 12-, and 16-team full-dynasty starts through validated fictional rule presets.
- Scenario consequences are simplified setup modifiers, not full alternate-rule simulations.
- Data packs are local JSON only. There is no backend, online sharing, cloud save, authentication, or external asset upload.
- The real-world content filter is a basic obvious-term scan and not a legal guarantee.

## Phase 10 Scope

- Build: generalized fictional league rules, 8/10/12/16 custom league sizes, schedule generation, top4/top6/top8/top10-play-in playoff formats, rule-set driven draft rounds/class sizes, Data Pack v2 validation/repair, Rules tab controls, and save schema 8 hydration.
- Harness: `src/tests/phase10LeagueRules.test.ts` plus `npm run test:smoke`.
- Primary target: make Custom League Lab starts survive the full dynasty lifecycle without backend services, online sharing, real hockey content, or added CBA complexity.

## Phase 10 Verification

- `cmd /c npx vitest run --config vitest.config.ts src/tests/phase10LeagueRules.test.ts`: passed with 11 tests.
- `cmd /c npm run test:smoke`: passed with Phase 8, Phase 9, and Phase 10 smoke coverage.
- `cmd /c npm test`: passed with 13 test files and 186 tests.
- `cmd /c npm run build`: passed. Vite still reports the known large `three-r3f` dependency chunk warning.
- In-app Browser smoke against the production `dist` build confirmed the start screen, Custom League Lab, Rules tab, 16-team rule update, supported status, and no captured console errors.
- Rule presets validate for 8-, 10-, 12-, and 16-team leagues; unsupported 14-team packs are rejected.
- Schedules validate deterministic team IDs, no self-games, expected games per team, and home/away warning reports.
- Playoff brackets resolve champions for top4, top6 with byes, top8, and 16-team top10 with play-in.
- Draft orders use rule-set rounds, honor traded picks, avoid duplicate AI selections, and size draft classes from the rule set.
- Custom 8-, 10-, 12-, and 16-team franchises create, pass invariants, simulate a first game, export/import saves, and preserve rule-set metadata.
- Two-season custom dry runs for 8-, 10-, and 16-team leagues complete without fatal invariant errors.

## Phase 10 Notes

- Data packs remain local JSON only. There is no backend, online sharing, cloud save, authentication, or external asset upload.
- Unsupported rule combinations are rejected or repaired toward the nearest supported format instead of silently starting unsafe leagues.
- The real-world content filter remains a basic obvious-term scan and not a legal guarantee.
- Waivers, buyouts, retained salary, clauses, arbitration, offer sheets, multi-team trades, backend/cloud/online play, real branding, professional audio, and playable on-ice hockey remain out of scope.

## Phase 11 Scope

- Build: public beta readiness, PWA/static packaging, release metadata, performance budgets, runtime health logging, save snapshots/recovery, demo mode, responsive compatibility, beta playtest checklists, and release scripts.
- Harness: `src/tests/phase11PublicBeta.test.ts` plus the release smoke suite.
- Primary target: make the existing deep franchise game safer to install, test, debug, recover, and hand to real beta playtesters without adding another hockey rules layer.

## Phase 11 Public Beta Smoke Checklist

- Version/release metadata: app version, release phase, channel, build date, schema version, release label, and compatibility summary are generated by pure helpers and surfaced in UI/diagnostics.
- PWA/static packaging: web manifest, generated local icons, app metadata, and service-worker registration no-op behavior are covered. The service worker only caches static shell/assets and does not cache saves or data packs.
- Runtime health: high-severity error events change status to `needsAttention`, event caps prevent unbounded logs, runtime health can be cleared, and bug reports include the runtime health section.
- Save recovery: overwrite backups create snapshots, pruning caps snapshot history, restore returns a valid franchise, snapshot JSON roundtrips, and corrupt current save data can recover the last good snapshot.
- Demo mode: deterministic fictional demo franchise validates, has an upcoming game, includes an Assistant GM recommendation and decision context, can simulate the first game, and can save/export/import.
- Performance/bundle: budget helper reports finite totals, recognizes the `three-r3f` chunk as a known exception, and low-spec settings enable reduced detail/motion.
- Responsive/display: 1366x768 returns a supported compact desktop mode; very small viewports return a clear desktop recommended message.
- Beta checklist: all checklist content validates and the bug-report checklist includes a diagnostics export step.
- Release smoke: creates demo, simulates, saves with backup, restores snapshot, exports bug report, checks invariants, runs a 16-team custom dry run, and verifies tutorial/achievement smoke behavior.

## Phase 11 Verification Commands

```bash
npm run typecheck
npm test
npm run test:smoke
npm run build
npm run check
```

## Phase 11 Verification Results

- `cmd /c npm run typecheck`: passed.
- `cmd /c npm run test:phase11`: passed with 7 tests.
- `cmd /c npm test`: passed with 14 test files and 193 tests.
- `cmd /c npm run test:smoke`: passed with 4 smoke files and 47 tests.
- `cmd /c npm run build`: passed. The only remaining build warning is the known large `three-r3f` chunk.
- `cmd /c npm run check`: passed end to end.
- `cmd /c npm run build:report`: passed; total JS was about 1761.0 kB, `three-r3f` was about 731.0 kB as a known exception, and `three-surfaces` was about 436.4 kB for future review.
- Production preview/headless Edge smoke: passed at `http://127.0.0.1:4188/`, with the rendered start screen showing demo, beta guide, release notes, install, Phase 11, and version labels.

## Phase 11 Performance And Bundle Note

- Manual chunks keep `three-r3f` isolated from room/editor/dev-tool chunks.
- The production build is still expected to warn on the `three-r3f` chunk because Three.js, React Three Fiber, and Drei are core to the 3D facility. Phase 11 documents this as a known exception instead of hiding it.
- `npm run build:report` emits a lightweight bundle budget report from the Vite manifest without adding a heavy analyzer dependency.

## Phase 11 Save Snapshot Recovery Note

- Manual saves keep up to five local snapshots per slot; autosave keeps a smaller history.
- Snapshot metadata records slot, created time, reason, team, season, phase, schema, and integrity status.
- Save Desk can restore, delete, export, and recover snapshots. These backups stay local in IndexedDB/localForage.

## Phase 11 Demo Mode Note

- `Try Demo Franchise` starts a sandbox Harbor City scenario with fictional team/player/story data only.
- The demo does not overwrite existing saves unless the user chooses to save manually.
- The demo is intentionally small: one upcoming game, one Assistant GM recommendation, mild narrative pressure, roster/scouting context, and a near-progress achievement.

## Phase 11 Known Limitations

- PWA/offline support is static-shell/local-only; there is no backend, cloud sync, online sharing, or network telemetry.
- Data packs remain local JSON and the obvious-term real-world content filter is not a legal guarantee.
- Audio remains generated/local placeholder sound.
- Small screens receive a desktop recommended message instead of a dedicated mobile experience.
- Waivers, buyouts, retained salary, clauses, arbitration, offer sheets, multi-team trades, backend/cloud/online play, real branding, professional audio, and playable on-ice hockey remain out of scope.

## Phase 12 Scope

- Build: closed beta polish, local-only feedback, UX friction review, first-hour onboarding, visual hierarchy, presentation, content depth, audio previews, post-game clarity, balance dashboard v2, and release QA docs.
- Harness: `src/tests/phase12ClosedBetaPolish.test.ts` plus the release smoke suite.
- Primary target: make the existing public-beta-ready systems feel better to play, easier to understand, richer to read, and easier to evaluate through local/export-only closed beta feedback.

## Phase 12 Closed Beta Smoke Checklist

- Feedback entries validate, cap locally, summarize, serialize, and export without full save JSON by default.
- Feedback bundles can include diagnostics and save summaries on request.
- UX friction signals detect invalid roster sim blocks, unresolved blocking actions, custom-league validation loops, tutorial skips, unread result runs, save-load loops, and Assistant GM backlog.
- GM Office surfaces one helpful "Need a Hand?" recommendation without exposing noisy internal diagnostics.
- First-hour and after-first-game checklists validate and remain available even after tutorial skip.
- Narrative templates render without unresolved tokens and continue to reject obvious restricted hockey branding terms.
- Audio cues all have preview labels, deterministic team horn variants, clamped volumes, and safe no-op behavior.
- Game Result Center creates post-game summary cards with no raw IDs and includes next recommended action plus achievement fallout.
- Balance dashboard v2 reports finite scoring, injuries, fatigue, economy, draft, development, owner, story, sentiment, roster repair, custom rule health, and achievement unlock metrics.

## Phase 12 Balance Dashboard V2 Notes

- Sample set includes default 12-team standard, pressure cooker dramatic, 8-team custom, 16-team custom, rebuild scenario, and demo mode labels.
- Custom rule health includes 8-, 10-, 12-, and 16-team rule labels.
- Emergency replacement count, achievement unlock rates, and story cadence are explicit closed-beta watch metrics.
- User-facing known issues are repeated in the report so playtest notes can distinguish blockers from accepted limitations.

## Phase 12 Verification Results

- `cmd /c npm run typecheck`: passed.
- `cmd /c npm test`: passed during the final `npm run check` gate with 15 test files and 227 tests.
- `cmd /c npm run test:smoke`: passed during the final `npm run check` gate with 5 smoke files and 81 tests.
- `cmd /c npm run build`: passed during the final `npm run check` gate. The only remaining build warning is the documented large `three-r3f` chunk.
- `cmd /c npm run check`: passed end to end.

## Phase 12 Known Limitations

- Feedback, telemetry, diagnostics, friction reports, saves, snapshots, and data packs remain local/export-only.
- Audio remains generated placeholder sound.
- Art remains primitive/generated/CSS/SVG-style presentation, not professional final art.
- The real-world content filter remains a basic obvious-term scan and not a legal guarantee.
- Small screens are not the primary target.
- Waivers, buyouts, retained salary, clauses, arbitration, offer sheets, multi-team trades, backend/cloud/online play, real branding, professional audio, and playable on-ice hockey remain out of scope.
