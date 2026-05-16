# Facility Navigation Rubric

## Core Checks

- Every `RoomId` has exactly one blueprint room.
- Every room has a district, map position, physical position, signage, and prompt.
- Core first-hour route exists: GM Office -> Roster Office -> Coach's Office -> Arena Bowl -> Save Desk.
- Reduced 3D detail keeps districts, corridors, signage, room shells, and interactions intact.
- Operations Map filters show the expected districts and rooms.
- Route hints read like physical movement through landmarks and corridors.
- TopBar and RoomPrompt expose current district or nearest room clearly.
- Direct room fallback navigation remains available for accessibility.

## Severity Guidance

- Blocker: missing/duplicate/disconnected core room or broken map open.
- High: route to a core first-hour room is impossible or wrong.
- Medium: route hint or district context is misleading.
- Low: room is findable but naming/copy/iconography is confusing.
- Polish: primitive layout communicates the idea but room dressing could be richer.

## Evidence Sources

- `src/game/facility/facilityBlueprint.ts`
- `src/game/facility/facilityValidation.ts`
- `src/game/facility/facilityNavigation.ts`
- `src/game/facility/facilityWayfinding.ts`
- `src/components/three/FacilityScene.tsx`
- `src/components/hud/OperationsMap.tsx`
- `src/tests/phase13FacilityLayout.test.ts`
- Browser screenshots/DOM when available.

