# Facility Blueprint

Phase 13 makes the 3D hub layout data-driven. Room placement, map pins, district labels, route hints, primitive room dressing, and validation all begin in `src/game/facility/facilityBlueprint.ts`.

## District Philosophy

- `entry`: Central Concourse, spawn orientation, trophy landmark, Save Desk.
- `frontOffice`: GM, cap/contracts, owner, staff, and agent pressure.
- `hockeyOps`: roster, coaching, trades, and free agency.
- `teamWing`: player meetings, locker room, medical, and arena tunnel access.
- `arena`: the Arena Bowl as the larger game-day destination.
- `media`: Press Room near the public/arena concourse.
- `development`: scouting, development, and draft execution.
- `customization`: developer/data-lab branch for local tools, with copy that points player-facing custom-league work back to the title-screen Custom League Lab and Save Desk data-pack library.
- `utility`: Settings and Feedback kiosks close to spawn.

## Room List

Every `RoomId` must have exactly one `FacilityRoomDefinition`:

- GM Office, Contract & Cap Office, Owner Suite, Staff Office, Agent Desk.
- Roster Office, Coach's Office, Trade War Room, Free Agency Office.
- Player Meeting Room, Locker Room, Medical Room, Arena Bowl.
- Press Room.
- Scouting Department, Development Office, Draft Stage.
- Save Desk, Standings/Trophy Hall, Settings, Feedback Desk, Dev Tools.

Custom League Lab currently lives on the title screen before a franchise is started. Once inside a franchise, the Save Desk is the local data-pack library and recovery hub; the Customization district reserves the physical data-lab branch for a future room split.

## Adjacency Rules

- GM stays close to contracts, owner, roster, and saves.
- Contracts stay close to agents, trades, and free agency.
- Coach and roster are adjacent, with team spaces and arena access nearby.
- Locker and medical are adjacent.
- Press sits near Arena Bowl and the public concourse, not deep in the team wing.
- Scouting, development, and draft are grouped as the long-term pipeline.
- Settings, feedback, and saves are reachable from the Central Concourse.

## Coordinate System

World coordinates use `x` east/west and `z` north/south in the 3D scene. Room `position` values are room centers. Room `size` values are footprint width/depth. District `bounds` are also center-based rectangles.

Map coordinates use percentages from `0` to `100`. `mapPosition.x` and `mapPosition.y` place the room pin on the Operations Map floorplan.

## How To Add A Room

1. Add the `RoomId` union value in `src/game/types.ts`.
2. Add the room panel under `src/components/rooms`.
3. Add modal routing and subtitle in `src/app/AppShell.tsx`.
4. Add the facility room definition in `src/game/facility/facilityBlueprint.ts`.
5. Let Operations Map read the new room from the blueprint; do not add a separate coordinate list.
6. Add a guide topic if the room is user-facing.
7. Update `src/tests/phase13FacilityLayout.test.ts` and any room-specific tests.

## Reduced Detail Behavior

Reduced 3D detail removes extra lighting and decorative prop density. It must keep:

- District floorplates.
- Corridors and path readability.
- Room shells.
- Room zones.
- Signage.
- Interaction prompts.

## Known Limitations

- Facility art remains primitive/generated, not final professional 3D art.
- The layout is a stylized hockey operations complex, not an architectural simulation.
- Multi-floor ideas are represented with floor labels, owner-suite placement, districts, and signage rather than full vertical traversal.
