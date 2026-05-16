# Fix Prompt Guide

Use this guide after QA, not during tester runs. The fix-prompt writer converts findings into small, scoped implementation prompts for future Codex sessions.

## Prompt Requirements

Each fix prompt should include:

- Objective
- Findings addressed
- Files likely to touch
- Files not to touch
- Out-of-scope guardrails
- Acceptance criteria
- Required verification commands
- Reminder to preserve client-only/local-only behavior

## Preferred Fix Scope

- One prompt per blocker/high finding.
- Bundle related medium/low issues only when they share the same files and acceptance criteria.
- Prefer docs or copy fixes for unclear known limitations.
- Prefer pure helper/test changes for facility and custom-league logic.
- Do not ask for gameplay/rule complexity unless a later phase explicitly allows it.

## Required Guardrail Text

Every generated fix prompt must say:

```text
Do not add backend, auth, cloud saves, online sharing, network telemetry, real hockey branding, real teams, real players, external licensed assets, new hockey rule systems, or playable on-ice hockey.
```

