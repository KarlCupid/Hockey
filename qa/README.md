# Codex Closed-Beta QA Agent Army

This folder is the reusable QA harness for Franchise Ice closed-beta passes. It turns Codex into a sequence of focused testers: first-time user, demo franchise, facility navigation, Operations Map, custom league, data-pack safety, accessibility, save/recovery, balance, living-ops, release verifier, and fix-prompt writer.

## Current Build Context

- Build: Phase 13 Facility Masterplan.
- Focus: typed facility blueprint, districts, wayfinding, Operations Map, first-hour flow, custom league systems, save/recovery, accessibility, closed-beta readiness.
- Scope: audit only. Do not implement gameplay, facility, roster, balance, or UI fixes during QA runs.
- Guardrails: no backend, auth, cloud saves, online sharing, network telemetry, real hockey branding, real teams, real players, external licensed assets, or new hockey rule systems.

## Recommended Sequential Run

1. `qa/agents/first_time_user_tester.md`
2. `qa/agents/demo_franchise_tester.md`
3. `qa/agents/facility_navigation_tester.md`
4. `qa/agents/operations_map_tester.md`
5. `qa/agents/custom_league_tester.md`
6. `qa/agents/data_pack_safety_tester.md`
7. `qa/agents/ui_ux_tester.md`
8. `qa/agents/accessibility_tester.md`
9. `qa/agents/save_recovery_tester.md`
10. `qa/agents/gm_systems_tester.md`
11. `qa/agents/first_season_tester.md`
12. `qa/agents/narrative_living_ops_tester.md`
13. `qa/agents/balance_tester.md`
14. `qa/agents/release_verifier.md`
15. `qa/agents/fix_prompt_writer.md`

Each agent writes one report under `qa/playtest-runs/current/`. Summary files at the root of `qa/` collect cross-agent issues and fix prompts.

## Verification Commands

Use these commands as the common evidence base:

```bash
npm run typecheck
npm test
npm run test:smoke
npm run build
npm run check
```

Release verification must run the full command suite. Other agents may run targeted tests first, then cite any full-suite result already produced during the same QA pass.

## Evidence Standard

Use evidence from tests, source, docs, browser/DOM/screenshots when available, and current reports. Be honest when browser/manual testing was not possible. Never imply screenshots, movement testing, or manual play happened if the environment did not allow it.

## Output Files

- `CURRENT_QA_SUMMARY.md`: top-level pass summary.
- `BUG_BACKLOG.md`: confirmed defects and accepted risks.
- `UX_FRICTION_LOG.md`: friction patterns and first-hour concerns.
- `FACILITY_NAVIGATION_FINDINGS.md`: blueprint, district, wayfinding, map, and room-route findings.
- `BALANCE_FINDINGS.md`: dry-run, economy, roster, story cadence, and tuning notes.
- `ACCESSIBILITY_FINDINGS.md`: keyboard, contrast, text, reduced motion/detail, and screen-reader issues.
- `CUSTOM_LEAGUE_FINDINGS.md`: rules, data packs, scenario/custom-start QA notes.
- `FIRST_HOUR_FINDINGS.md`: first-hour onboarding and demo flow notes.
- `FIX_PROMPT_QUEUE.md`: implementation-ready prompts for future fixing passes.

