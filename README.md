# Franchise Ice

`Franchise Ice` is a browser-based vertical-slice prototype for a fictional third-person 3D hockey management game. You are both general manager and head coach: walk through a hockey operations facility, manage the roster, set lines and tactics, simulate games, read the fallout, check the standings, and save locally.

For a full map of the repository, see [PROJECT_INDEX.md](PROJECT_INDEX.md).
Closed beta release prep lives in [CLOSED_BETA_CHECKLIST.md](CLOSED_BETA_CHECKLIST.md), with accepted limitations in [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

## Run

```bash
npm install
npm run dev
```

## Verify

```bash
npm run typecheck
npm test
npm run test:smoke
npm run build
npm run check
```

## What Is Included

- Vite + React + TypeScript app
- React Three Fiber third-person operations hub with WASD movement
- Fictional league rules with 8-, 10-, 12-, and 16-team custom dynasty support
- Fictional rosters, player morale, form, fatigue, injuries, stats, and roles
- Structured contracts, salary cap, draft pick inventories, and tradeable pick assets
- Trade War Room with player/pick proposal building, cap validation, need fit, and AI accept/reject feedback
- Scouting Department with fictional draft classes sized by league rules, assignments, watchlist, fuzzy reports, and certainty growth
- Development Office with player development plans, progress ticks, workload risk, and small attribute growth
- Phase 3 dynasty lifecycle with playoffs, champion history, draft execution, prospect pools, re-signing, free agency, staff hiring, owner goals, retirements, aging, and new-season generation
- Phase 4 beta hardening with dynasty invariant checks, deterministic multi-season playtests, balance reporting, save integrity repair, settings/help, fictional branding, and panel-level code splitting
- Phase 5 roster ecosystem with active roster, scratches, affiliate roster, injured reserve, prospect pathways, AI roster repair, and training-camp setup
- Phase 6 living hockey operations with press conferences, owner meetings, agent calls, player conversations, team meetings, relationships, story arcs, media pressure, fan sentiment, and owner trust
- Phase 7 game-feel layer with setup wizard, GM profile/background traits, difficulty, game modes, story frequency, narrative templates, Assistant GM reports, action queue, room badges, and broader playtest tuning
- Phase 8 release-candidate UX with guided tutorial, Learn the Game guide, achievements, milestones, generated local audio, accessibility controls, local telemetry, bug-report export, broadcast polish, and smoke tests
- Phase 9 replayability tools with Custom League Lab, local fictional data packs, scenario starts, team creator, roster/player editor helpers, draft class editor helpers, data-pack validation/repair, and JSON import/export
- Phase 10 custom rules support with generalized league sizes, schedule generation, playoff formats, draft rounds/class sizing, Data Pack v2 validation, and multi-season custom dry runs
- Phase 11 public beta readiness with PWA install metadata, static/offline-friendly shell caching, release/version labels, runtime health logs, save snapshots/recovery, beta checklists, demo mode, compatibility notes, and release scripts
- Phase 12 closed beta candidate polish with local-only feedback bundles, UX friction reports, first-hour onboarding checklists, post-game summary cards, audio previews, richer narrative content, facility atmosphere props, and balance dashboard v2
- Phase 13 facility masterplan with typed room blueprinting, spatial districts, corridor routing, wayfinding prompts, district Operations Map, primitive signage, and reusable room placement config
- GM Office, Press Room, Owner Suite, Agent Desk, Player Meeting Room, Roster Office, Coach's Office, Locker Room, Medical Room, Arena Bowl, Standings/Trophy Hall, and Save/Load panels
- Lineup editor with auto-fill, validation, injuries, duplicate prevention, role warnings, and chemistry notes
- Tactics sliders that affect simulation
- Deterministic pure TypeScript game simulation
- Instant simulation, period-by-period simulation, and arena/broadcast-style visualization
- Standings, box scores, event timelines, three stars, coach notes, news, inbox items, autosave, and three manual save slots

## V1.1 Prototype Upgrade

- First Day as GM/Head Coach checklist with collapsible guidance through the vertical slice
- Operations Map with current-room context and room-directory fallback navigation
- Deeper Locker Room roster filters, sorting, player cards, coach reads, and management risk notes
- Line and pair identity labels, expanded lineup warnings, tactic presets, and tactic identity summary
- Game Result Center with readable scoreboards, stories, scoring/penalty summaries, goalie stats, three stars, team comparison, takeaways, consequences, and filterable events
- Period-by-period Bench Reports with tactical recommendations before the result is applied
- Broadcast mode with live score progression, event chips, moment banners, speed controls, and explicit result application
- Expanded news reactions, richer standings pulse, top-four placeholder hunt projection, and season-complete summary
- Clearer local save metadata, overwrite/delete confirmations, autosave status, and load error display

## Phase 2 Front Office Expansion

Phase 2 turns the V1.1 lineup-and-sim slice into a deeper client-only franchise-management prototype. New room panels cover:

- Contract & Cap Office: cap summary, contract table, expiry pressure, contract risk notes, and draft pick inventory.
- Trade War Room: trade partner selection, team needs, player/pick asset selection, cap validation, AI trade evaluation, accepted/rejected outcomes, news, and transaction logging.
- Scouting Department: fictional draft class, draft-board strategies, watchlist, prospect detail reports, three scouting assignment slots, and post-game certainty gains.
- Development Office: up to five active player plans, focus/intensity choices, candidate ranking, progress after games, attribute updates, and fatigue/morale risk.

Older V1.1 saves are hydrated on load with default contracts, picks, scouting, development, trade history, and transaction-log fields.

## Phase 3 Dynasty Lifecycle Expansion

Phase 3 turns the one-season prototype into a client-only dynasty loop:

- Finish or sim the 22-game regular season, open the top-eight best-of-five playoff bracket, and crown/archive a champion.
- Run a simplified four-round draft that honors traded pick ownership, adds drafted players to prospect pools, and records draft history.
- Re-sign expiring players with immediate accept/reject feedback, release unsigned UFAs to free agency, and keep RFAs controlled.
- Use a seven-day fictional free-agent market with user offers, AI signings, cap checks, roster-limit checks, and market news.
- Hire and replace staff across coaching, scouting, medical, analytics, and assistant-GM roles; staff ratings lightly affect related systems.
- Advance through retirements, offseason aging/development/regression, fatigue/injury recovery, owner evaluations, owner goals, training camp, new schedules, new draft classes, and multi-season history.
- Browse expanded Trophy Hall history with champions, awards, franchise timeline, draft history, and season records.

Older V1.1/Phase 2 saves hydrate to schema version 3 with safe defaults for season phase, staff, owner goals, history, and prospect pools.

## Phase 4 Beta Hardening, Presentation, Balance, and Identity

Phase 4 strengthens the existing V1.1 + Phase 2 + Phase 3 game instead of adding another large rule layer:

- Pure dynasty invariant checks validate teams, rosters, draft picks, prospects, contracts, phases, schedules, playoff data, ratings bounds, and JSON serializability.
- A deterministic multi-season playtest harness can run three-season dry runs through regular season, playoffs, draft, re-signing, free agency, staff hiring, and training camp without mutating the active save.
- Balance reporting summarizes scoring, shots, power play rate, overtime, cap pressure, free-agent movement, draft quality, development, owner security, and champion history.
- Save integrity helpers validate, repair, export, and import JSON while keeping old schema-version 3 saves loadable.
- Phase guidance in the GM Office shows the current phase, recommended next step, checklist, advance preview, and danger warnings.
- Fictional team identity now uses generated crests, jersey swatches, portrait placeholders, and broadcast scorebug/lower-third components. No real hockey marks or external licensed art are used.
- Settings and help add reduced motion, reduced 3D detail, broadcast speed, autosave, confirmation, UI scale, table density, guide reset, and keyboard help.
- Heavy room panels, the 3D facility, and developer tools are lazy-loaded behind loading fallbacks and an error boundary.

## Phase 5 Roster Ecosystem, Affiliate System, and AI Roster Management

Phase 5 fixes the biggest remaining multi-season roster weakness by giving every organization a clearer player pathway:

- Active roster and scratches are distinct from affiliate depth, injured reserve, retired players, and unsigned prospect rights.
- The new Roster Office shows roster health, depth charts, active players, scratches, affiliate players, injured reserve, cap impact, and recent roster moves.
- User roster actions support call-ups, send-downs, scratches, activations, IR placement/removal, and prospect signing to either the active roster or affiliate.
- Every fictional club has a simplified affiliate team. Affiliate players can generate development reports, benefit from development staff, and become promotion candidates without simulating a full minor-league schedule.
- AI roster repair runs around franchise creation, save repair, trades, free agency, training camp, new seasons, and pre-game dry runs to prevent missing goalies or short depth charts.
- Training camp trims surplus active players to the affiliate, repairs game rosters, and prepares teams for the next season.
- Cap treatment is simplified: active, scratched, and IR players count against active cap; affiliate players are active-cap exempt; prospect rights and retired players do not count.
- Re-signing and owner-goal balance were tuned so fair offers perform better than weak offers and owner goals better match rebuilding or contending contexts.

## Phase 6 Living Hockey Operations, Relationships, Media, and Decision Events

Phase 6 makes the client-only dynasty feel more like a living hockey organization without adding another CBA/rules-complexity layer:

- Press Room: answer fictional media questions after key games, rumors, playoff pressure, and public story beats.
- Owner Suite: handle owner meetings, demand levels, goal pressure, job-security trust, and phase-specific expectations.
- Agent Desk: track fictional agent personalities, client lists, public pressure, relationship scores, and simplified negotiation impact.
- Player Meeting Room: talk to players, hold team meetings, respond to role frustration, losing streaks, training-camp tension, and locker-room issues.
- GM Office living dashboard: active decisions, urgent issues, current storylines, team dynamics, media/fan pulse, owner trust, agent pressure, and recommended meetings.
- Player relationships now track trust, role satisfaction, communication, pressure tolerance, agent, meeting notes, and active story context.
- Team dynamics now track chemistry, leadership, accountability, room mood, media pressure, fan sentiment, owner trust, rivalry heat, and unresolved issues.
- Dynamic story arcs include goalie controversies, star role demands, rookie breakouts, trade rumors, contract standoffs, rebuild tension, playoff pressure, rivalry heat, owner impatience, locker-room splits, prospect promotion buzz, and free-agency pursuits.
- Decision options show tone and consequence previews, then apply bounded effects to morale, form, fatigue, trust, role satisfaction, chemistry, fan sentiment, owner trust, media pressure, agent relationship, contract/free-agent interest, trade noise, staff trust, and news follow-ups.
- Save migration now hydrates older saves to schema version 5 with generated relationships, agents, team dynamics, media state, decision-event state, and story-arc state.

## Phase 7 Game Feel, Difficulty, Narrative Content, Assistant GM, and Playtest Tuning

Phase 7 tunes the existing deep dynasty game rather than adding another real-world rules layer:

- New Franchise setup is now a five-step wizard: choose team, name/build the GM profile, choose game mode, choose difficulty/story frequency, and apply a modest opening preset.
- GM profiles include fictional background traits such as Former Coach, Cap Strategist, Scout at Heart, Player Relationship Builder, Analytics Executive, Owner Favorite, and Media Savvy.
- Difficulty and game modes apply modest tuning to owner/media pressure, trade strictness, contract demands, free-agent interest, story cadence, cap pressure, and Assistant GM help level.
- Story frequency controls living-ops cadence: Quiet stays lower-noise, Normal is the default, and Dramatic creates more story pressure while keeping active event caps.
- A 140+ template fictional narrative library feeds press, owner, agent, player, team, media/fan, rivalry, playoff, draft, free agency, trade, development, and affiliate beats.
- The Assistant GM generates advisory reports and recommendations from actual franchise state, including invalid roster, cap pressure, expiring stars, pending decisions, prospects ready for a look, idle scouting, staff vacancies, and phase risks.
- The GM Office now includes a Master Action Queue, Assistant GM reports, GM profile/difficulty card, pressure readout, and quick room navigation.
- TopBar and Operations Map show urgent action counts, Assistant GM alerts, and room badges for decisions, roster issues, draft picks, expiring contracts, market days, staff vacancies, and owner risk.
- Dev Tools now expose template validation, cadence/tuning inspection, Assistant GM previews, action queue inspection, sample narrative events, and difficulty playtest entry points.
- Save migration now hydrates older saves to schema version 6 with GM profile, difficulty tuning, Assistant GM reports, and narrative template version.

## Phase 8 Release Candidate UX, Tutorial, Audio, Achievements, QA, and Accessibility

Phase 8 turns the deep prototype into a more approachable beta without adding another major hockey rule system:

- A dismissible guided tutorial and contextual hints teach the first franchise loop from GM Office through roster, lines, tactics, arena simulation, Save Desk, and Trophy Hall.
- A searchable Learn the Game guide/codex explains major rooms and systems in plain language from the Help overlay.
- Local-only achievements and franchise milestones reward first wins, trades, draft picks, playoff moments, owner goals, development wins, and multi-season progress.
- Generated Web Audio cues cover UI clicks, notifications, warnings, achievements, draft picks, trades, goal/final horn moments, broadcast whooshes, and low ambience. Audio starts only after user interaction and fetches no external assets.
- Game Result Center and broadcast mode now add intro cards, tale-of-the-tape data, turning point, broadcast beats, three-stars presentation, fan reaction, and media prompts.
- Accessibility settings add high contrast, larger text, reduce flashes, keyboard hints/shortcuts, local telemetry opt-in/out, and clearer Help shortcut documentation.
- Save Desk can export a local diagnostic summary or bug report JSON. Full save data is excluded unless explicitly included.
- New release-candidate smoke coverage exercises tutorial, guide, achievements, audio no-op behavior, accessibility helpers, fan sentiment scenarios, owner goal reporting, export/import, invariants, and a two-season mini playtest.

Schema version 7 hydrates older saves with tutorial state, achievements, milestones, local telemetry, and owner goal outcome history.

## Phase 9 Custom League Lab, Scenarios, and Data Packs

Phase 9 makes the fictional dynasty more replayable without adding backend services or real hockey content:

- Start screen now includes `Custom League Lab` alongside New Franchise, Continue, and Load Franchise.
- Create and edit local fictional league packs with custom cities, nicknames, abbreviations, colors, generated crests, jersey concepts, arena names, affiliates, market size, owner patience, fan confidence, and roster strategy.
- Edit fictional roster/player definitions and draft-class packs through typed helpers and validation.
- Start from built-in fictional scenarios such as Rebuild on the Clock, Cap Crunch, Prospect Pipeline, Goalie Crisis, Playoff Push, Injury Storm, Draft Capital Empire, Rivalry Revenge, and Chaos Room.
- Import/export data packs as local JSON only. Imported packs are stored locally in IndexedDB/localForage and never sent to a server.
- Validate and repair packs before use. Validation checks schema shape, fictional-only flag, duplicate IDs, colors, abbreviations, positions, rating bounds, contracts, cap/rules feasibility, draft-class depth, scenario references, JSON serializability, and obvious restricted real-world hockey terms.
- The real-world content filter is intentionally basic. It catches obvious terms such as NHL, National Hockey League, Stanley Cup, several club names, and a small famous-player blocklist, but it is not a legal guarantee.

## Phase 10 Generalized League Rules And Data Pack v2

Phase 10 broadens Phase 9 custom starts into full-dynasty fictional league rules:

- Supported full-dynasty custom league sizes are 8, 10, 12, and 16 teams.
- Rule sets define schedule format, games per team, playoff team count, playoff format, playoff series format, draft rounds, draft class size, cap ceiling/floor, active roster limits, affiliates, trade deadline day, and season start date.
- Supported playoff formats include top 4, top 6 with byes, top 8, and top 10 with play-in where the league size allows it.
- Schedule generation validates team IDs, self-games, day indices, games per team, home/away balance warnings, and repeated matchup warnings.
- Draft execution now uses the active rule set for rounds, lottery size, order length, traded-pick ownership, draft class sizing, and history.
- Data Pack v2 validation repairs missing rule sets, fills supported team counts where safe, flags unsupported 14-team style packs, validates draft and playoff combinations, and keeps the real-world term scan in place.
- Custom League Lab adds a Rules tab for team count, schedule/playoff/draft/cap/roster/affiliate settings, validation, and repair to the nearest supported format.
- Schema version 8 hydrates older saves by adding a default 12-team rule set when missing.

## Phase 11 Public Beta Readiness, PWA Packaging, Performance, And Runtime QA

Phase 11 packages the existing deep franchise game into a more testable public beta candidate without adding another hockey rules layer:

- Start screen now includes `Try Demo Franchise`, a deterministic sandbox entry point with an Assistant GM recommendation, mild press/story beat, roster/scouting prompts, an upcoming game, and near-progress achievement context. Demo play does not overwrite saves unless the user manually saves.
- Install-friendly PWA metadata is included through `public/manifest.webmanifest`, generated local SVG icons, app meta tags, and a small first-party service worker that caches only the static app shell/assets. User saves and data packs remain in localForage and are not cached by the service worker.
- Release metadata is centralized in `src/game/systems/version.ts` and appears in the start screen, TopBar, Settings, Save Desk, Dev Tools, bug reports, diagnostics, and save metadata.
- Save writes can create local snapshots before overwriting slots, keep capped slot history, restore/export/delete snapshots, and recover the last good snapshot if a current save is corrupt.
- Runtime health logging records local errors, warnings, save repair events, import warnings, PWA warnings, audio warnings, and performance warnings. Logs are capped, serializable, clearable, and included in bug reports.
- Performance budget helpers document app-shell, room-panel, total-JS, and known `three-r3f` chunk expectations. Dev Tools shows current settings impact and low-spec recommendations.
- Settings includes a low-spec preset for reduced 3D detail, reduced motion/flashes, compact tables, muted ambience, and faster broadcast pacing.
- Responsive polish improves 1366x768 and 1440x900 desktop/laptop use, adds safer modal/table scrolling, and shows a desktop recommendation on very small screens.
- Beta Playtest Guide checklists cover the first 30 minutes, first season, Custom League Lab, dynasty stability, accessibility/audio, and bug-report export.
- Release scripts include `npm run typecheck`, `npm run test:phase11`, `npm run test:release`, `npm run build:report`, and `npm run check`.

## Phase 13 Facility Masterplan, Districts, And Wayfinding

Phase 13 fixes the 3D hub layout without adding another hockey management system:

- Facility room placement now comes from a typed blueprint under `src/game/facility`.
- The hub is organized into Central Concourse, Front Office, Hockey Ops, Team Wing, Arena, Media, Development, Customization, and Utility districts.
- Corridors, landmarks, room shells, primitive props, Operations Map pins, prompts, breadcrumbs, Assistant GM room hints, feedback context, and Dev Tools validation all read from the blueprint.
- The Operations Map now behaves more like a floorplan with district filters, current-district context, "You are here," route hints, and direct room fallback navigation.
- Reduced 3D detail removes extra dressing but keeps rooms, signage, corridors, and interactions intact.

## Current Scope

This prototype intentionally avoids backend services, authentication, real hockey licenses, real players, real teams, online sharing, waivers, buyouts, retained salary, no-trade/no-move clauses, arbitration, offer sheets, multi-team trades, multiplayer, cloud saves, network telemetry, and playable on-ice hockey physics. Free agency, staff, contracts, draft execution, playoffs, affiliate development, roster repair, cap treatment, conversations, relationships, story events, difficulty/game modes, Assistant GM guidance, narrative templates, tutorial/guide content, achievements, local telemetry, generated audio, custom leagues, scenarios, data packs, custom rule presets, beta diagnostics, save recovery, and facility layout/wayfinding are simplified fictional prototype systems.

## Controls

- `WASD`: move the GM/coach avatar
- Mouse drag/wheel: orbit and zoom the third-person camera
- `E`: open the highlighted room
- `H`: open help
- `M`: open the Operations Map
- `G`: open GM Office when keyboard shortcuts are enabled
- `R`: open Roster Office when keyboard shortcuts are enabled
- `C`: open Coach's Office when keyboard shortcuts are enabled
- `A`: open Arena Bowl when keyboard shortcuts are enabled
- `S`: open Save Desk when keyboard shortcuts are enabled
- `Escape`: close the active panel, help, or settings dialog

## Save Data

Saves and imported data packs are local-only through IndexedDB/localForage. There are three manual save slots and one autosave created after completed games. Manual overwrites create capped local snapshots, autosaves keep a smaller snapshot history, and the Save Desk can restore, export, delete, or recover the last good snapshot. The Save Desk shows schema version, app version, release phase, season, selected-team record, validation warnings, repair status, JSON export/import controls, local bug-report export, runtime health, and Data Pack Library access. Older saves hydrate to schema version 8 with roster statuses, affiliates, roster logs, player pathway defaults, relationship state, agents, team dynamics, media state, decision events, story arcs, GM profile, difficulty tuning, Assistant GM reports, narrative template version, tutorial state, achievements, milestones, local telemetry, owner goal outcome history, optional custom data-pack metadata, and league rule sets.

## Public Beta Notes

- See [BETA_TESTING.md](BETA_TESTING.md) for suggested playtest flows, bug-report instructions, compatibility notes, and local-only privacy details.
- The PWA service worker is static-shell only. It does not cache user saves, data packs, local telemetry, bug reports, or diagnostics.
- The known large `three-r3f` production chunk is isolated and documented as the expected 3D dependency cost for this prototype.
- Modern desktop browsers with WebGL, IndexedDB, and ES module support are the target. Smaller viewports get a desktop recommended warning rather than a separate mobile layout.
