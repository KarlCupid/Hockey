# Franchise Ice Implementation Plan

## Milestone 1: Foundation

- Scaffold Vite, React, TypeScript, Vitest, Zustand, localForage, Three.js, React Three Fiber, and Drei.
- Add global theme, shell, and durable project docs.

## Milestone 2: Pure Game Systems

- Define shared types for players, teams, schedules, saves, tactics, and game results.
- Generate fictional teams, rosters, schedules, and starting lineups.
- Implement seeded RNG, lineup validation, chemistry, tactics descriptions, standings, morale, fatigue, injuries, news, and saves.

## Milestone 3: Simulation

- Build deterministic period and full-game simulation.
- Generate event timelines, box scores, three stars, injuries, coach notes, and player/team updates.
- Apply results to franchise state and simulate the rest of a game day.

## Milestone 4: Playable UI

- Build start screen, team selection, top HUD, room panels, roster/player cards, lineup/tactics editor, standings, save/load, arena controls, and result review.
- Add instant, period-by-period, and arena/broadcast simulation flows.

## Milestone 5: 3D Facility

- Build a primitive third-person hockey operations hub.
- Add WASD movement, orbiting camera, labeled rooms, glowing interactables, E/click room entry, and Escape close behavior.

## Milestone 6: Verification

- Add Vitest coverage for deterministic simulation, standings, lineup validation, and save serialization.
- Run `npm test` and `npm run build`.
- Launch the app and verify the start-to-finish vertical slice.

## Milestone 7: V1.1 Playable Prototype Polish

- Add first-day GM guidance that tracks real facility, roster, coaching, arena, standings, and save actions without blocking play.
- Deepen pure helper systems for player notes, line and pair identity, tactic presets, result presentation, bench reports, broadcast score state, expanded news, and season summary.
- Improve Locker Room, Coach's Office, Arena Bowl, broadcast mode, Standings Hall, Save Desk, and the 3D facility navigation while preserving the existing client-only architecture.
- Add focused Vitest coverage for the new pure systems and expanded validation behavior.
- Run `npm test`, `npm run build`, and a browser smoke flow covering franchise start, rooms, simulations, result review, standings/news effects, and save/load.

## Milestone 8: Phase 2 Front Office Expansion

- Add structured contracts, salary-cap summaries, draft-pick inventories, and save hydration for older V1.1 saves.
- Build pure systems for trade valuation/application, scouting assignments/draft-board certainty, and player development plans.
- Add Contract & Cap Office, Trade War Room, Scouting Department, and Development Office rooms without rebuilding the V1.1 facility flow.
- Thread front-office ticks into game advancement so scouting and development evolve after simulated games.
- Add focused Vitest coverage for contracts, picks, trades, scouting, development, migration, and serialization.
- Keep Phase 2 client-only with fictional teams/players and document the remaining limitations around free agency, draft execution, playoffs, and contract negotiation.

## Milestone 9: Phase 3 Dynasty Lifecycle Expansion

- Add typed serializable dynasty state for season phases, playoffs, offseason, draft execution, prospect pools, free agency, staff, owner goals, and multi-season history.
- Build pure systems for regular-season completion, best-of-five playoffs, champion archiving, draft lottery/order, user/AI drafting, prospect signing, re-signing, free agency, staff hiring, owner evaluations, aging, retirements, training camp, and next-season generation.
- Wire phase-aware store actions so existing regular-season simulation still works and playoff games can use instant, period, and broadcast-style simulation flows.
- Expand GM Office, Trophy Hall, Arena Bowl, Scouting/Draft Room, Development Office, Contract & Cap Office, Free Agency Office, Staff Office, Operations Map, and the 3D facility without rebuilding the V1.1/Phase 2 architecture.
- Add schema version 3 hydration for older V1.1/Phase 2 saves and defaults for missing staff, owner, history, prospect pools, and phase state.
- Add Phase 3 Vitest coverage for lifecycle, playoffs, draft, prospects, contracts, free agency, staff, owner goals, history, player lifecycle, and save migration.
- Keep the milestone client-only and fictional; leave waivers, buyouts, retained salary, clauses, arbitration, offer sheets, online play, backend/cloud saves, and playable on-ice hockey out of scope.

## Milestone 10: Phase 4 Beta Hardening, Presentation, Balance, and Identity

- Add pure dynasty invariant checks and a deterministic multi-season playtest harness for repeated franchise stress tests.
- Add balance-report and tuning helpers covering scoring, cap/economy, free agency, trades, scouting, development, playoffs, and owner-goal outputs.
- Improve phase guidance, irreversible-action warnings, dynasty checklists, save validation/repair/import/export, and developer-only dry-run reporting.
- Add fictional team branding, generated crest/jersey/portrait/broadcast UI components, and integrate them into high-value surfaces without using real hockey marks.
- Add settings/help/accessibility controls, reduced-motion/reduced-detail presentation hooks, panel-level lazy loading, loading fallbacks, and error boundaries.
- Polish 3D room identity and the UI design system while keeping all systems client-only, serializable, and testable.

## Milestone 11: Phase 5 Roster Ecosystem, Affiliate System, and AI Roster Management

- Add typed roster statuses for active players, scratches, affiliate depth, injured reserve, prospect rights, and retired players.
- Build pure roster rules, roster move logging, cap treatment by roster status, call-up/send-down/scratch/IR actions, and lineup eligibility checks.
- Give every fictional club one simplified affiliate with development reports, promotion candidates, and staff-influenced growth.
- Add AI roster repair and training-camp setup so multi-season saves can recover active depth, goalie shortages, surplus rosters, and invalid lineups without waivers or real-world CBA systems.
- Add Phase 5 save migration to schema version 4 with safe roster-status, affiliate, roster-log, and player-pathway defaults.
- Add Roster Office UI, operations-map/facility routing, room integrations, Dev Tools stress reports, five-season dry-run reporting, and focused Vitest coverage.

## Milestone 12: Phase 6 Living Hockey Operations, Relationships, Media, and Decision Events

- Add typed, serializable living-ops state for decision events, story arcs, player relationships, agent profiles, team dynamics, and media narrative.
- Build pure systems for press conferences, owner meetings, agent calls, player and team meetings, fan/media sentiment, story-arc detection, and bounded decision resolution.
- Integrate simplified consequences into post-game, roster, trade, contract, draft, free-agency, playoff, and phase-transition flows without adding waivers, clauses, retained salary, arbitration, or other CBA complexity.
- Add Press Room, Owner Suite, Agent Desk, and Player Meeting Room panels plus GM Office, Locker Room, Contract, Trade, Roster, Settings, Help, and Dev Tools living-ops surfaces.
- Add schema version 5 save hydration/repair for older saves, decision/story invariant checks, and a five-season story stress harness.
- Keep all interactions fictional, client-only, deterministic where tested, and grounded in a serious hockey-operations tone.

## Milestone 13: Phase 7 Game Feel, Difficulty, Narrative Content, Assistant GM, and Playtest Tuning

- Add new-franchise setup options for GM profile/background traits, avatar style, game mode, difficulty, story frequency, and modest starting presets.
- Build pure tuning systems for difficulty, game modes, GM traits, narrative template selection, living-ops cadence, Assistant GM reports, action queues, and room badges.
- Broaden fictional narrative templates and tune owner/media/fan/team dynamics so multi-season playtests stay stable without feeling flat.
- Improve GM Office, TopBar, Operations Map, Settings, Help, Dev Tools, and the facility with guidance, pressure readouts, reports, and quick navigation.
- Add schema version 6 save hydration/repair and playtest/balance reporting for difficulty/story-frequency comparisons.
- Keep Phase 7 client-only, fictional, advisory rather than autopilot-driven, and out of real-world CBA/rules complexity.

## Milestone 14: Phase 8 Release Candidate UX, Tutorial, Audio/Atmosphere, Achievements, QA, and Accessibility

- Add schema version 7 save hydration/repair for tutorial state, achievements, milestones, local telemetry, and owner goal outcome history.
- Add guided tutorial, contextual hints, and a searchable Learn the Game guide/codex for rooms and major systems.
- Add local-only achievements and franchise milestones, with GM Office and Trophy Hall presentation plus notification feedback.
- Add generated/local Web Audio cues and ambience through browser-safe Web Audio APIs with no external asset downloads.
- Improve broadcast/game-result presentation with intro, tale of the tape, turning point, narrative beats, three stars, fan reaction, media prompt, and reduced-motion/reduced-flash variants.
- Add accessibility/keyboard helpers, high contrast, larger text, reduce flashes, keyboard hints, and better shortcut documentation.
- Add capped local-only telemetry, diagnostic summaries, and bug-report export that excludes full save data by default.
- Add targeted fan sentiment and owner goal reporting harnesses so release-candidate playtests capture specific balance signals.
- Add Phase 8 smoke tests and `npm run test:smoke`, then keep full `npm test` and `npm run build` green.
- Keep Phase 8 focused on release-candidate polish rather than waivers, buyouts, retained salary, clauses, arbitration, offer sheets, multi-team trades, backend/cloud/online, real branding, or playable on-ice hockey.

## Milestone 15: Phase 9 Custom League, Scenario Editor, Data Packs, Team Creator, and Content Expansion

- Add typed local-only fictional data packs for leagues, scenarios, branding, rosters, draft classes, and full custom setups.
- Build pure data-pack validation, safety scanning, repair, import/export, summaries, and basic real-world hockey branding term flags.
- Add custom 12-team league generation from editable fictional team definitions, rules presets, roster strategies, branding, and draft class packs.
- Add built-in fictional scenario templates plus a scenario application system for cap crunches, rebuilds, injury storms, owner pressure, playoff pushes, draft-heavy starts, and chaos starts.
- Add a Custom League Lab with team creator, branding preview, roster/player editor helpers, draft class editor helpers, scenario starts, data-pack validation, import/export, and start-franchise actions.
- Add a local data-pack library backed by localForage without backend, auth, cloud saves, online sharing, or external licensed assets.
- Integrate custom league/scenario metadata into saves, bug reports, GM Office, Trophy Hall, achievements, guide/help content, Dev Tools, and playtest coverage.
- Document the supported custom-league range honestly: full dynasty compatibility prioritizes 12-team packs while unsupported league sizes are validated and rejected until broader lifecycle support is added.
- Keep all content fictional-only and keep waivers, buyouts, retained salary, clauses, arbitration, offer sheets, multi-team trades, backend/cloud/online, real branding, professional audio, and playable on-ice hockey out of scope.

## Milestone 16: Phase 10 Generalized League Rules, Custom League Sizes, Schedule/Playoff Engine, and Data Pack v2

- Add typed LeagueRuleSet presets for supported 8-, 10-, 12-, and 16-team fictional dynasty starts.
- Generalize schedule generation, validation, playoff seeding/brackets/play-in, and draft rounds/class sizing around the active rule set.
- Add Data Pack v2 validation/repair for missing rule sets, unsupported team counts, unsupported playoff/schedule/draft combinations, draft-class depth, scenario compatibility, and real-world term flags.
- Expand Custom League Lab with a Rules tab for team count, schedule, playoff, draft, cap, roster, affiliate, validation, and repair controls.
- Integrate custom rule summaries into saves, bug reports, TopBar, standings/playoff picture, owner goals, Assistant GM context, and guide/help content.
- Add schema version 8 hydration so older saves and old data packs receive a safe default 12-team rule set when missing.
- Add Phase 10 tests and smoke coverage for custom league generation, first-game simulation, save/export/import, two-season dry runs, and unsupported-rule rejection.
- Keep all content fictional-only, local-only, serializable, and out of backend/cloud/online, real branding, waivers, buyouts, retained salary, clauses, arbitration, offer sheets, multi-team trades, and playable on-ice hockey.

## Milestone 17: Phase 11 Public Beta Readiness, PWA Packaging, Performance, Compatibility, Runtime QA, and Release Polish

- Add centralized release metadata for app version, release phase/channel, save schema, build date, compatibility, and visible release labels.
- Add install-friendly static app packaging through manifest metadata, generated local icons, app-shell-only service worker caching, and docs that clarify saves stay in localForage.
- Add performance budgets, build-manifest reporting, manual chunk review, documented `three-r3f` exception, and low-spec settings recommendations.
- Add a capped local runtime health monitor for errors, warnings, save repair, data-pack import issues, PWA/audio/performance notices, diagnostics, and bug reports.
- Add local save snapshots, overwrite backups, last-good recovery, snapshot import/export, snapshot UI, and tests around corrupt current-save recovery.
- Add deterministic demo/sample franchise entry for public beta testers without overwriting saves by default.
- Improve desktop/laptop responsiveness, modal/table scrolling, compact low-spec preset, and a desktop-recommended warning for very small screens.
- Add beta playtest checklist content, first-run links, GM Office checklist visibility, and documentation for first 30 minutes, first season, custom league, accessibility/audio, and bug-report tests.
- Add release scripts for `typecheck`, `test:phase11`, `test:release`, `build:report`, and `check`.
- Keep Phase 11 focused on shipping, testing, installability, compatibility, diagnostics, and release polish without backend/cloud/online services, network telemetry, real licensed content, or new hockey rules complexity.

## Milestone 18: Phase 12 Closed Beta Polish, Feedback, Presentation, Content Depth, and QA

- Add local-only closed beta feedback entries, validation, summaries, Feedback Desk UI, Save Desk export, and feedback bundle JSON that excludes full save data by default.
- Add UX friction signal detection for blocked sims, stale blocking actions, custom-league validation loops, skipped tutorial, unread results, save-load loops, and Assistant GM backlog.
- Improve first-hour onboarding with checklists for first hour, after first game, before offseason, and custom-league first start, plus clearer tutorial skip/completion messaging.
- Polish high-impact surfaces with better guidance, audio preview controls, post-game summary cards, next recommended action, achievement fallout, and clearer empty/warning states.
- Improve 3D facility atmosphere using primitives only, with feedback desk, room lighting accents, branded panels, and reduced-detail suppression for extra props.
- Expand fictional narrative content and keep validation against obvious restricted real-world hockey terms and unresolved template tokens.
- Add closed-beta balance dashboard v2 covering scoring, shots, injuries, fatigue, trades, contracts, free agency, draft quality, development, owner goals, story cadence, sentiment, roster repairs, custom rule health, and achievement unlock rates.
- Create closed-beta release checklist and known-issues docs, update beta testing/release notes/playtest reports, and add Phase 12 tests plus smoke coverage.
- Keep Phase 12 focused on polish, clarity, presentation, feedback quality, and QA without backend/cloud/online services, network telemetry, real licensed content, or new hockey rules complexity.

## Milestone 19: Phase 13 Facility Masterplan, Spatial Layout Template, Wayfinding, and Room Districts

- Add a typed facility blueprint that owns all room positions, sizes, districts, map positions, related rooms, signage, prop themes, and path nodes.
- Organize the hub into Central Concourse, Front Office, Hockey Ops, Team Wing, Arena, Media, Development, Customization, and Utility districts.
- Refactor the 3D facility to render district floors, corridors, landmarks, room shells, room zones, signage, and primitive prop sets from blueprint data.
- Upgrade Operations Map into a district floorplan with filters, current district, "You are here," route hints, room badges, search, and direct room fallback navigation.
- Add pure wayfinding helpers for current district, nearest landmark, room breadcrumbs, entrance prompts, and route summaries.
- Thread district context into tutorial flow, guide content, Assistant GM recommendations, feedback entries, bug reports, and Dev Tools validation/export.
- Add Phase 13 facility tests for room coverage, duplicates, overlaps, reachable core routes, related-room validity, map helpers, wayfinding, tutorial route, Assistant GM districts, and blueprint serialization.
- Keep Phase 13 focused on spatial clarity and navigation polish without backend/cloud/online services, real licensed content, new hockey rules complexity, or playable on-ice hockey.
