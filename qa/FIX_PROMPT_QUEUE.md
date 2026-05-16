# Fix Prompt Queue

Priority order: medium accessibility first, then first-hour polish/discoverability.

Implementation status: all four prompts were implemented and verified on 2026-05-16. Keep this queue as the historical source prompt set for the Phase 13 closed-beta rerun.

## Prompt 1: Improve Operations Map Accessible Labels

Status: implemented 2026-05-16

Objective: Make Operations Map pins and direct navigation buttons destination-specific for keyboard and screen-reader users.

Findings Addressed: `QA-001`

Files Likely To Touch:

- `src/components/hud/OperationsMap.tsx`
- `src/tests/phase13FacilityLayout.test.ts` or a focused accessibility/UI test if practical

Files Not To Touch:

- Gameplay systems
- Facility blueprint room placement
- Custom league rules
- Save schema

Out Of Scope:

Do not add backend, auth, cloud saves, online sharing, network telemetry, real hockey branding, real teams, real players, external licensed assets, new hockey rule systems, or playable on-ice hockey.

Acceptance Criteria:

- Each map pin has a meaningful accessible name with room label and district.
- Each `Go to room` button has a destination-specific accessible name.
- Badge counts do not concatenate into ambiguous names like `GM4` or `Cap1`.
- Existing map filters, search, route hints, and direct navigation continue to work.

Verification Commands:

```bash
npm run typecheck
npm run test:smoke
npm run build
```

## Prompt 2: Fix RoomPrompt Text Layout

Status: implemented 2026-05-16

Objective: Separate RoomPrompt action text from breadcrumb text in the facility HUD.

Findings Addressed: `QA-002`

Files Likely To Touch:

- `src/components/hud/RoomPrompt.tsx`
- `src/styles/global.css`

Files Not To Touch:

- Facility blueprint coordinates
- Three.js scene rendering
- Gameplay systems

Out Of Scope:

Do not add backend, auth, cloud saves, online sharing, network telemetry, real hockey branding, real teams, real players, external licensed assets, new hockey rule systems, or playable on-ice hockey.

Acceptance Criteria:

- Prompt action and breadcrumb render with visible separation at 1280x720, 1366x768, and compact desktop widths.
- Quiet prompt state remains readable.
- No overlap with control hint.

Verification Commands:

```bash
npm run typecheck
npm run build
```

## Prompt 3: Dedupe Demo Assistant GM Startup Reports

Status: implemented 2026-05-16

Objective: Prevent a fresh demo franchise from showing duplicate Assistant GM report headlines in GM Office.

Findings Addressed: `QA-003`

Files Likely To Touch:

- `src/game/systems/demoMode.ts`
- `src/components/rooms/GMOfficePanel.tsx` if display-level dedupe is preferred
- `src/tests/phase11PublicBeta.test.ts` or `src/tests/phase12ClosedBetaPolish.test.ts`

Files Not To Touch:

- Core Assistant GM recommendation logic unless needed for dedupe
- Gameplay systems
- Facility layout

Out Of Scope:

Do not add backend, auth, cloud saves, online sharing, network telemetry, real hockey branding, real teams, real players, external licensed assets, new hockey rule systems, or playable on-ice hockey.

Acceptance Criteria:

- Fresh demo GM Office shows one primary startup report or distinct non-duplicated report headings.
- Assistant GM recommendations remain present.
- Existing demo smoke tests continue to pass.

Verification Commands:

```bash
npm run typecheck
npm run test:smoke
npm run build
```

## Prompt 4: Clarify Custom League/Data-Pack Facility Wayfinding

Status: implemented 2026-05-16

Objective: Make it clear where Custom League Lab and Data Pack Library tools live once a player is inside the facility.

Findings Addressed: `QA-004`

Files Likely To Touch:

- `src/components/hud/OperationsMap.tsx`
- `src/components/rooms/SaveLoadPanel.tsx`
- `FACILITY_BLUEPRINT.md`
- Possibly `src/game/facility/facilityBlueprint.ts` only for description/signage copy, not room placement

Files Not To Touch:

- Custom league rule systems
- Data-pack validation behavior
- Facility room coordinates
- New room implementation

Out Of Scope:

Do not add backend, auth, cloud saves, online sharing, network telemetry, real hockey branding, real teams, real players, external licensed assets, new hockey rule systems, or playable on-ice hockey.

Acceptance Criteria:

- Operations Map or Save Desk copy clearly points custom-league testers to Data Pack Library/Custom League tools.
- Customization Lab no longer implies Custom League Lab is physically present when only Dev Tools is mapped.
- No new room is added unless explicitly requested in a future phase/fix pass.

Verification Commands:

```bash
npm run typecheck
npm run test:smoke
npm run build
```
