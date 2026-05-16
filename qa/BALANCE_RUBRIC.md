# Balance Rubric

## What To Review

- Fatal invariant errors in dynasty dry runs.
- Roster repair frequency and emergency replacement count.
- Teams over cap and cap pressure trends.
- Contract acceptance, free-agent signing, and trade acceptance rates.
- Draft class sizing and quality by supported league size.
- Owner goal completion and job-security movement.
- Story cadence, high-severity event count, active event caps, media/fan/owner sentiment.
- Achievement unlock rates and first-hour reward cadence.

## Severity Guidance

- Blocker: fatal invariant errors or save corruption during dry runs.
- High: a supported league size repeatedly fails season progression.
- Medium: balance output is stable but likely unfun or noisy.
- Low: metric is watchlisted and needs broader seed sampling.
- Polish: report formatting or dashboard language could be clearer.

## Evidence Sources

- `src/game/systems/dynastyPlaytest.ts`
- `src/game/systems/balanceReport.ts`
- `src/tests/phase8ReleaseCandidate.test.ts`
- `src/tests/phase10LeagueRules.test.ts`
- `src/tests/phase12ClosedBetaPolish.test.ts`
- `PLAYTEST_REPORT.md`

