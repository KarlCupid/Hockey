# Agent Playtest Protocol

## Mission

Run a structured, evidence-based QA pass against the current Franchise Ice build without implementing fixes. The agent should behave like a focused closed-beta tester, not a developer quietly improving the game.

## Read First

Read the project guardrails and current phase docs before testing:

- `README.md`
- `PROJECT_INDEX.md`
- `AGENTS.md`
- `IMPLEMENTATION_LOG.md`
- `PLAYTEST_REPORT.md`
- `RELEASE_NOTES.md`
- `BETA_TESTING.md`
- `CLOSED_BETA_CHECKLIST.md`
- `KNOWN_ISSUES.md`
- `FACILITY_BLUEPRINT.md`
- `PLAN.md`
- `package.json`

Agents focused on a specific system should then read the relevant source and test files named in their prompt.

## Evidence Levels

- High confidence: reproduced in browser/DOM/screenshot, or directly asserted by passing/failing automated tests, or clear deterministic source behavior.
- Medium confidence: source review identifies a likely issue, but browser/manual reproduction was not available.
- Low confidence: plausible UX risk from docs/source review that needs tester confirmation.

## Standard Flow

1. Confirm scope and guardrails.
2. Read the required docs/source/tests.
3. Run the required commands for the agent.
4. Use browser/DOM/screenshot evidence when available.
5. Write the exact report file named in the agent prompt.
6. Record findings in the standard finding format.
7. Do not implement fixes.
8. Note manual/browser limitations honestly.

## Standard Finding Format

```text
## Finding <ID>: <short title>

Severity: blocker | high | medium | low | polish
Confidence: high | medium | low
Area:
Room/Flow:
Repro Steps:
Expected:
Actual:
User Impact:
Evidence:
Likely Files:
Suggested Fix Direction:
Acceptance Criteria:
```

## Completion Criteria

- The report exists at the requested path.
- Every finding has severity, confidence, evidence, likely files, and acceptance criteria.
- If no defects are found, the report says so and lists residual risks.
- The report does not claim unperformed browser/manual testing.
- No gameplay, facility, balance, or UI fix is implemented during the QA run.

