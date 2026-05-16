# Reporting Guide

## Report Rules

- Lead with findings. Put blockers and high-severity issues first.
- Use the standard finding format exactly.
- Include evidence and likely files for each issue.
- Distinguish source-review risks from reproduced bugs.
- Mention accepted known limitations separately from new issues.
- Do not write vague "improve UX" notes without a reproducible flow or acceptance criteria.

## Confidence Rules

- High: test, browser, screenshot, DOM, or deterministic source proves it.
- Medium: source review strongly indicates the issue.
- Low: plausible tester confusion; needs manual confirmation.

## Good Evidence Examples

- Command output summary: `npm run test:smoke` passed with Phase 8-13 smoke tests.
- Source evidence: `OperationsMap` pin buttons render `room.shortLabel` without an explicit `aria-label`.
- Test evidence: `phase13FacilityLayout.test.ts` asserts no duplicate room definitions and core first-hour routes.
- Browser evidence: screenshot/DOM shows TopBar district and Operations Map filters.

## Bad Evidence Examples

- "I clicked around and it felt fine" without steps.
- "Probably broken" without code/test/browser support.
- "Manual tested" when no browser/manual session occurred.

