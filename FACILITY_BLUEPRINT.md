# Facility Blueprint

Phase 13 makes the 3D hub layout data-driven. Room placement, map pins, district labels, route hints, primitive room dressing, and validation all begin in `src/game/facility/facilityBlueprint.ts`.

The current plan is the approved GM Computer facility concept. The player starts in the Command Atrium with the GM Computer as the command object, local utility apps clustered beside spawn, private owner/agent rooms to the west, Hockey Ops app bays and planning rooms to the east, a west-side development pipeline, and a clear Team Corridor into the oversized Arena Bowl. The goal is a compact playable operations campus, not scattered desks or unrelated boxes.

## District Philosophy

- `entry`: Command Atrium, spawn orientation, GM Computer landmark, and the first sightline into every operational wing.
- `frontOffice`: Private west wing for owner and agent pressure beside the command hub.
- `hockeyOps`: East planning suite for roster, coaching, contracts, trades, free agency, and staff app bays; this is the main hockey decision spine.
- `teamWing`: Team Corridor leading from Hockey Ops to meetings, locker, medical, and the arena tunnel.
- `arena`: Oversized Arena Bowl destination beyond the tunnel.
- `media`: Media Bridge and Press Room near the public/arena concourse, not inside private team space.
- `development`: Distinct scouting, development, and draft pipeline branch connected back to Hockey Ops and the GM Computer.
- `customization`: Developer/data-lab side branch for local tools, with copy that points player-facing custom-league work back to the title-screen Custom League Lab and Save App Kiosk data-pack library.
- `utility`: Local Utility Stack for standings, saves, settings, and feedback close to spawn in a side alcove, not in the main hockey path.

## Room List

Every `RoomId` must have exactly one `FacilityRoomDefinition`:

- GM Computer, Owner Suite, Agent Call Booth.
- Roster Office, Coach's Office, Contracts App Bay, Trade Board App Bay, Free Agency App Bay, Staff App Bay.
- Player Meeting Room, Locker Room, Medical Room, Arena Bowl.
- Press Room.
- Scouting Department, Development Office, Draft Board.
- Save App Kiosk, Standings App Kiosk, Settings App Kiosk, Feedback App Kiosk, Dev Tools Lab.

Custom League Lab currently lives on the title screen before a franchise is started. Once inside a franchise, the Save App Kiosk is the local data-pack library and recovery hub; the Data Lab district reserves the physical branch for a future room split.

## Adjacency Rules

- GM Computer stays close to saves, standings, contracts, owner, roster, and the main Hockey Ops threshold.
- Contracts, trades, free agency, and staff are app bays connected to the GM Computer and Hockey Ops.
- Owner Suite and Agent Call Booth stay private but near the Command Atrium.
- Coach and roster are adjacent, with team spaces and arena access nearby.
- Locker and medical are adjacent.
- Press sits near Arena Bowl and the public concourse, not deep in the team wing.
- Scouting, development, and draft are grouped as the long-term pipeline.
- Settings, feedback, standings, and saves are reachable from the Command Atrium.

## Coordinate System

World coordinates use `x` east/west and `z` north/south in the 3D scene. Room `position` values are room centers. Room `size` values are footprint width/depth. District `bounds` are also center-based rectangles.

Map coordinates use percentages from `0` to `100`. `mapPosition.x` and `mapPosition.y` place the room pin on the Operations Map floorplan.

## Image-Guided Layout Workflow

The team can use `npm run export:facility-layout` to export the current typed blueprint as `docs/facility-layout/current-facility-layout.svg`. That SVG can be used with GPT Image 2 or another image-generation workflow to produce top-down and isometric concept art, then the approved concept should be converted into a strict implementation spec in `docs/facility-layout/approved-facility-layout-spec.md`.

Concept art is a design artifact only. Runtime room placement, district floors, Operations Map pins, route hints, wayfinding, and validation still begin in `src/game/facility/facilityBlueprint.ts`. Codex should implement from the approved spec, not directly from the image, and must not create duplicate layout data outside the blueprint.

The current implemented GM Computer layout is documented in `docs/facility-layout/approved-facility-layout-spec.md`, with the generated concept art stored at `docs/facility-layout/gm-computer-floorplan-concept.png`. Future image-guided redesigns should replace that spec first, then update the typed blueprint.

## Blueprint Conventions

- Use named `DISTRICT_BOUNDS`, `HUBS`, `ROOM_SIZES`, and `ROOM_POSITIONS` helpers before adding or moving rooms.
- Place rooms as offsets from district hubs where possible so clusters remain readable.
- Let `mapPoint()` project world room positions into Operations Map percentages unless a future room needs a documented override.
- Add path nodes at district hubs, thresholds, and room clusters. Connections must be reciprocal.
- Keep `mainCorridorNodes` as the primary spine: Command Atrium -> Hockey Ops -> Team Corridor -> Arena Bowl.
- Entrances should face a nearby path segment or district hub. If validation says an entrance is misaligned, move the room, change the facing, or add a meaningful path node.
- Utility/customization spaces may stay near spawn, but should remain side branches instead of crossing the first-hour hockey route.

## Layout Validation

`src/game/facility/facilityValidation.ts` protects the world plan. The default blueprint must have:

- No missing or duplicate `RoomId` definitions.
- No severe room overlaps.
- Rooms inside or very near their district bounds.
- Reachable core rooms and reachable district path nodes.
- Entrances facing corridors or district hubs.
- Reciprocal path-node connections.
- A valid main corridor from spawn through Hockey Ops and Team Wing to the Arena Bowl.
- Operations Map pins that do not collide badly.
- Valid related-room references and reasonable related-room district flow.

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
