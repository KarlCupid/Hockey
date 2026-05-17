# Layout Spec Template

Use this template after an image concept has been approved. This file is the contract between visual art direction and implementation. Codex should consume the completed spec, not raw concept art.

Concept images are not runtime data. The implemented game must still read facility layout from `src/game/facility/facilityBlueprint.ts`.

## 1. Coordinate System

- World orientation:
- Spawn point:
- X axis convention:
- Z axis convention:
- Room position convention:
- District bounds convention:
- Map-position convention:
- Scale notes:

## 2. District Bounds

List every district with center-based bounds:

- `entry`:
- `frontOffice`:
- `hockeyOps`:
- `teamWing`:
- `arena`:
- `media`:
- `development`:
- `customization`:
- `utility`:

For each district include:

- Label:
- Bounds `{ x, z, width, depth }`:
- Landmark position `{ x, z }`:
- Primary rooms:
- Adjacency notes:

## 3. Room Positions

List every room exactly once:

- `gm`:
- `press`:
- `ownerSuite`:
- `agents`:
- `playerMeetings`:
- `roster`:
- `coach`:
- `locker`:
- `medical`:
- `arena`:
- `standings`:
- `saves`:
- `contracts`:
- `trades`:
- `scouting`:
- `development`:
- `freeAgency`:
- `staff`:
- `draft`:
- `settings`:
- `devTools`:
- `feedback`:

For each room include:

- Position `{ x, z }`:
- District:
- Nearby corridor/path node:
- Placement reason:

## 4. Room Sizes

List room footprint sizes as `{ width, depth }`. Use larger sizes for the Arena Bowl and modest sizes for kiosks/offices.

## 5. Entrance Facings

Use only `north`, `south`, `east`, or `west`.

For each room include:

- Entrance facing:
- Corridor or hub it faces:
- Any validation risk:

## 6. Map Positions

State whether map positions should be derived from world positions with `mapPoint()` or set explicitly.

For explicit positions, use percentages:

- `mapPosition.x`: 0 to 100.
- `mapPosition.y`: 0 to 100.

## 7. Path Nodes

List all path nodes with:

- ID:
- Label:
- Position `{ x, z }`:
- Connected node IDs:
- District ID:
- Landmark flag if relevant:

Connections must be reciprocal.

## 8. Main Corridor Node Sequence

List the primary corridor in order. It must clearly read:

`Command Atrium -> Hockey Ops -> Team Corridor -> Arena`

## 9. Landmarks

List landmarks with:

- ID:
- Label:
- Position `{ x, z }`:
- District ID:
- Purpose:

## 10. Route Notes

Describe:

- First-hour route clarity.
- GM to Roster/Coach/Arena flow.
- Save App Kiosk return path.
- Development branch.
- Press/public branch.
- Utility/customization branch.

## 11. Validation Expectations

The implemented blueprint should pass:

- No missing or duplicate rooms.
- No severe room overlaps.
- Rooms inside or very near district bounds.
- Core rooms reachable from the path network.
- Districts connected to reachable path nodes.
- Entrances facing corridors or hubs.
- Operations Map pins not colliding badly.
- Reciprocal path-node connections.
- Valid main corridor from spawn to Arena Bowl.
- Valid related-room references.

## 12. Visual Treatment Notes

Include concise art-direction notes for:

- District floors:
- Corridors:
- Gates and thresholds:
- Room shells:
- Props:
- Signage:
- Landmarks:
- Operations Map readability:

## 13. JSON-Like Implementation Data

Use this shape. Add every district, every room, every path node, and every landmark before implementation.

```json
{
  "districts": [
    {
      "id": "entry",
      "label": "Command Atrium",
      "bounds": { "x": 0, "z": 0, "width": 8.8, "depth": 7.8 },
      "landmarkPosition": { "x": 0, "z": -0.75 }
    }
  ],
  "rooms": [
    {
      "roomId": "saves",
      "position": { "x": 0, "z": 0.85 },
      "size": { "width": 2.4, "depth": 1.8 },
      "entranceFacing": "north",
      "mapPosition": "derive-from-world-or-explicit"
    }
  ],
  "pathNodes": [
    {
      "id": "spawn-concourse",
      "label": "Command Atrium",
      "position": { "x": 0, "z": 0 },
      "connectedNodeIds": ["hockey-ops-gate"],
      "districtId": "entry",
      "isLandmark": true
    }
  ],
  "mainCorridorNodes": ["spawn-concourse", "hockey-ops-gate", "hockey-ops-hub", "team-gate", "team-hub", "arena-tunnel", "arena-gate", "arena-bowl-hub"],
  "landmarks": [
    {
      "id": "map-kiosk",
      "label": "Operations Map Kiosk",
      "position": { "x": 0, "z": -0.75 },
      "districtId": "entry"
    }
  ]
}
```
