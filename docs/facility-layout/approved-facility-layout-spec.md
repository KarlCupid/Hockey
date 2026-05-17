# Approved Facility Layout Spec

Current status: Approved implementation spec for the GM Computer floorplan concept.

Source concept image: `docs/facility-layout/gm-computer-floorplan-concept.png`.

Codex should not implement from concept art directly; implement from this spec. The concept image is art direction only. The TypeScript blueprint remains the only runtime source of truth.

## 1. Coordinate System

- World orientation: `x` runs west/east and `z` runs north/south in the 3D facility.
- Spawn point: `{ "x": 0, "z": 0 }`, facing `north`.
- X axis convention: negative `x` is west/private/utility/pipeline side; positive `x` is east/hockey-ops/arena side.
- Z axis convention: negative `z` is the upper planning side; positive `z` moves toward team spaces and the arena.
- Room position convention: room positions are center points.
- District bounds convention: district bounds are center-based rectangles.
- Map-position convention: derive room map positions from world coordinates with `mapPoint()`.
- Scale notes: the GM Computer is a central command object, app bays stay compact, and Arena Bowl remains the largest destination.

## 2. District Bounds

- `entry`: Command Atrium, bounds `{ "x": 0, "z": 1, "width": 9.4, "depth": 8.6 }`, landmark `{ "x": 0, "z": 0.8 }`, rooms `gm`.
- `frontOffice`: Private Office Wing, bounds `{ "x": -7.7, "z": -2.7, "width": 6.9, "depth": 7.8 }`, landmark `{ "x": -8.5, "z": -5.1 }`, rooms `ownerSuite`, `agents`.
- `hockeyOps`: Hockey Ops Suite, bounds `{ "x": 2.8, "z": -1.4, "width": 8.2, "depth": 10.6 }`, landmark `{ "x": 2.4, "z": -4.5 }`, rooms `roster`, `coach`, `contracts`, `trades`, `freeAgency`, `staff`.
- `teamWing`: Team Corridor, bounds `{ "x": 5.2, "z": 5.8, "width": 7.2, "depth": 4.8 }`, landmark `{ "x": 5.4, "z": 5.8 }`, rooms `playerMeetings`, `locker`, `medical`.
- `arena`: Arena Bowl, bounds `{ "x": 12.4, "z": 6, "width": 9.8, "depth": 10.8 }`, landmark `{ "x": 9.7, "z": 5.8 }`, rooms `arena`.
- `media`: Media Bridge, bounds `{ "x": 10.5, "z": -1.7, "width": 6.2, "depth": 4.4 }`, landmark `{ "x": 10.5, "z": -1.5 }`, rooms `press`.
- `development`: Development Pipeline, bounds `{ "x": -8.2, "z": 3, "width": 5.8, "depth": 9 }`, landmark `{ "x": -8.1, "z": 5.2 }`, rooms `scouting`, `development`, `draft`.
- `customization`: Data Lab, bounds `{ "x": -4.5, "z": 5.5, "width": 3.6, "depth": 2.7 }`, landmark `{ "x": -4.55, "z": 5.45 }`, rooms `devTools`.
- `utility`: Local Utility Stack, bounds `{ "x": -4.5, "z": 1.2, "width": 3.6, "depth": 6.3 }`, landmark `{ "x": -3.35, "z": 2.9 }`, rooms `standings`, `saves`, `settings`, `feedback`.

## 3. Room Positions

- `gm`: `{ "x": 0, "z": 0.85 }`, Command Atrium command object.
- `press`: `{ "x": 10.5, "z": -2.5 }`, Media Bridge near Arena Bowl.
- `ownerSuite`: `{ "x": -8.5, "z": -5.1 }`, deepest private west room.
- `agents`: `{ "x": -8.8, "z": -1.3 }`, private call booth near the command hub.
- `playerMeetings`: `{ "x": 3.2, "z": 4.7 }`, first team-facing room after Hockey Ops.
- `roster`: `{ "x": 0.65, "z": -5.45 }`, planning room paired with Coach.
- `coach`: `{ "x": 3.7, "z": -5.45 }`, planning room paired with Roster.
- `locker`: `{ "x": 4.35, "z": 6.85 }`, Team Corridor near the arena route.
- `medical`: `{ "x": 7.15, "z": 6.85 }`, directly adjacent to Locker.
- `arena`: `{ "x": 12.4, "z": 6.4 }`, largest right-side destination.
- `standings`: `{ "x": -4.55, "z": -1.45 }`, local app kiosk near spawn.
- `saves`: `{ "x": -4.55, "z": 0.1 }`, local app kiosk near spawn.
- `contracts`: `{ "x": 4.9, "z": -1.2 }`, GM Computer app bay.
- `trades`: `{ "x": 4.9, "z": 0.25 }`, GM Computer app bay.
- `scouting`: `{ "x": -8.15, "z": 0.35 }`, first development pipeline room.
- `development`: `{ "x": -8.15, "z": 3 }`, center development pipeline room.
- `freeAgency`: `{ "x": 4.9, "z": 1.7 }`, GM Computer app bay.
- `staff`: `{ "x": 4.9, "z": 3.15 }`, GM Computer app bay.
- `draft`: `{ "x": -8.15, "z": 5.55 }`, terminal development pipeline board.
- `settings`: `{ "x": -4.55, "z": 1.65 }`, local app kiosk near spawn.
- `devTools`: `{ "x": -4.55, "z": 5.45 }`, Data Lab terminal.
- `feedback`: `{ "x": -4.55, "z": 3.2 }`, local app kiosk near spawn.

## 4. Room Sizes

- `gm`: `{ "width": 3.2, "depth": 2.3 }`.
- `contracts`, `trades`, `freeAgency`, `staff`, `standings`, `saves`, `settings`, `feedback`: `{ "width": 2.2, "depth": 1.25 }`.
- `ownerSuite`: `{ "width": 2.6, "depth": 2.3 }`.
- `agents`: `{ "width": 2.6, "depth": 2 }`.
- `roster`, `coach`: `{ "width": 2.8, "depth": 2.1 }`.
- `playerMeetings`: `{ "width": 2.8, "depth": 1.9 }`.
- `locker`: `{ "width": 3.2, "depth": 2.2 }`.
- `medical`: `{ "width": 2.5, "depth": 2 }`.
- `arena`: `{ "width": 8.6, "depth": 8.6 }`.
- `press`: `{ "width": 3.2, "depth": 2.1 }`.
- `scouting`, `development`: `{ "width": 2.6, "depth": 2.2 }`.
- `draft`: `{ "width": 3.1, "depth": 2.3 }`.
- `devTools`: `{ "width": 2.6, "depth": 2 }`.

## 5. Entrance Facings

- `gm`: `north`.
- `press`: `south`.
- `ownerSuite`: `south`.
- `agents`: `east`.
- `playerMeetings`: `east`.
- `roster`: `east`.
- `coach`: `west`.
- `locker`: `east`.
- `medical`: `west`.
- `arena`: `west`.
- `standings`: `east`.
- `saves`: `east`.
- `contracts`: `west`.
- `trades`: `west`.
- `scouting`: `east`.
- `development`: `south`.
- `freeAgency`: `west`.
- `staff`: `west`.
- `draft`: `north`.
- `settings`: `east`.
- `devTools`: `east`.
- `feedback`: `east`.

## 6. Map Positions

Use `mapPoint()` for all current room map positions. Do not add a second coordinate list for the Operations Map.

## 7. Path Nodes

- `spawn-concourse`: Command Atrium, `{ "x": 0, "z": 0 }`, connects `trophy-hall-cross`, `front-office-gate`, `hockey-ops-gate`, `utility-kiosk`, district `entry`, landmark.
- `trophy-hall-cross`: Trophy Hall Cross, `{ "x": -3.35, "z": -0.7 }`, connects `spawn-concourse`, district `entry`.
- `front-office-gate`: Front Office Threshold, `{ "x": -4.2, "z": -1.2 }`, connects `spawn-concourse`, `front-office-hub`, `customization-gate`, district `frontOffice`.
- `front-office-hub`: Front Office Hub, `{ "x": -7.3, "z": -2.5 }`, connects `front-office-gate`, `owner-contracts`, `agents-staff`, district `frontOffice`, landmark.
- `owner-contracts`: Owner And Contracts, `{ "x": -8.4, "z": -4.7 }`, connects `front-office-hub`, district `frontOffice`.
- `agents-staff`: Agents And Staff, `{ "x": -7.6, "z": -0.9 }`, connects `front-office-hub`, district `frontOffice`.
- `hockey-ops-gate`: Hockey Ops Threshold, `{ "x": 2.8, "z": -0.8 }`, connects `spawn-concourse`, `hockey-ops-hub`, `development-gate`, `team-gate`, district `hockeyOps`.
- `hockey-ops-hub`: Hockey Ops Hub, `{ "x": 2.4, "z": -4.5 }`, connects `hockey-ops-gate`, `roster-coach`, `trade-market-cross`, `team-gate`, `development-gate`, district `hockeyOps`, landmark.
- `roster-coach`: Roster And Coach, `{ "x": 2.1, "z": -5.5 }`, connects `hockey-ops-hub`, district `hockeyOps`.
- `trade-market-cross`: Trade And Market Cross, `{ "x": 4, "z": 0.6 }`, connects `hockey-ops-hub`, district `hockeyOps`.
- `development-gate`: Development Threshold, `{ "x": -5.2, "z": 1.6 }`, connects `hockey-ops-gate`, `hockey-ops-hub`, `pipeline-hub`, district `development`.
- `pipeline-hub`: Development Pipeline Hub, `{ "x": -8.1, "z": 3 }`, connects `development-gate`, `scouting-development`, `draft-stage`, district `development`, landmark.
- `scouting-development`: Scouting And Development, `{ "x": -8.1, "z": 1.6 }`, connects `pipeline-hub`, district `development`.
- `draft-stage`: Draft Stage, `{ "x": -8.1, "z": 5.2 }`, connects `pipeline-hub`, district `development`.
- `team-gate`: Team Wing Threshold, `{ "x": 3.1, "z": 3.4 }`, connects `hockey-ops-gate`, `hockey-ops-hub`, `team-hub`, district `teamWing`.
- `team-hub`: Team Wing Hub, `{ "x": 5.4, "z": 5.8 }`, connects `team-gate`, `player-meetings`, `locker-medical`, `arena-tunnel`, district `teamWing`, landmark.
- `player-meetings`: Player Meeting Door, `{ "x": 3.9, "z": 4.9 }`, connects `team-hub`, district `teamWing`.
- `locker-medical`: Locker And Medical, `{ "x": 5.8, "z": 6.8 }`, connects `team-hub`, district `teamWing`.
- `arena-tunnel`: Arena Tunnel, `{ "x": 8.4, "z": 5.8 }`, connects `team-hub`, `arena-gate`, `media-gate`, district `arena`, landmark.
- `arena-gate`: Rink Gate, `{ "x": 9.7, "z": 5.8 }`, connects `arena-tunnel`, `arena-bowl-hub`, `media-gate`, district `arena`.
- `arena-bowl-hub`: Arena Bowl, `{ "x": 12.4, "z": 7.5 }`, connects `arena-gate`, district `arena`, landmark.
- `media-gate`: Media Threshold, `{ "x": 9.3, "z": 0.5 }`, connects `arena-tunnel`, `arena-gate`, `press-row`, `customization-gate`, district `media`.
- `press-row`: Press Backdrop Row, `{ "x": 10.5, "z": -1.5 }`, connects `media-gate`, district `media`, landmark.
- `customization-gate`: Customization Threshold, `{ "x": -3.35, "z": 4.4 }`, connects `front-office-gate`, `media-gate`, `utility-kiosk`, `dev-tools-door`, district `customization`.
- `dev-tools-door`: Data Lab Door, `{ "x": -3.35, "z": 5.4 }`, connects `customization-gate`, district `customization`.
- `utility-kiosk`: Utility Kiosks, `{ "x": -3.35, "z": 1.4 }`, connects `spawn-concourse`, `customization-gate`, `support-kiosks`, district `utility`, landmark.
- `support-kiosks`: Settings And Feedback, `{ "x": -3.35, "z": 2.9 }`, connects `utility-kiosk`, district `utility`.

## 8. Main Corridor Node Sequence

`spawn-concourse -> hockey-ops-gate -> hockey-ops-hub -> team-gate -> team-hub -> arena-tunnel -> arena-gate -> arena-bowl-hub`

## 9. Landmarks

- `map-kiosk`: Operations Map Kiosk, `{ "x": 0, "z": -0.75 }`, district `entry`.
- `trophy-wall`: Trophy Wall, `{ "x": -3.35, "z": -0.7 }`, district `entry`.
- `owner-overlook`: Owner Overlook, `{ "x": -8.5, "z": -5.1 }`, district `frontOffice`.
- `tactical-junction`: Tactical Junction, `{ "x": 2.4, "z": -4.5 }`, district `hockeyOps`.
- `draft-board`: Draft Board, `{ "x": -8.1, "z": 5.2 }`, district `development`.
- `team-tunnel`: Team Tunnel, `{ "x": 5.4, "z": 5.8 }`, district `teamWing`.
- `rink-gate`: Rink Gate, `{ "x": 9.7, "z": 5.8 }`, district `arena`.
- `press-backdrop`: Press Backdrop Row, `{ "x": 10.5, "z": -1.5 }`, district `media`.
- `data-lab-terminal`: Data Lab Terminal, `{ "x": -4.55, "z": 5.45 }`, district `customization`.
- `support-kiosks`: Support Kiosks, `{ "x": -3.35, "z": 2.9 }`, district `utility`.

## 10. Route Notes

- First-hour route starts at the Command Atrium GM Computer, moves to Roster and Coach, follows Team Corridor to Arena Bowl, then returns to the Save App Kiosk.
- GM Computer consolidates desk-heavy features while preserving physical destinations for team, arena, media, owner, agent, and pipeline work.
- Development Pipeline is a west-side branch that stays connected to Hockey Ops without interrupting the arena route.
- Press/public branch sits near Arena Bowl and outside private team spaces.
- Utility and Data Lab branches remain secondary and close to spawn.

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

- District floors should read as connected zones rather than isolated boxes.
- Main corridor should stay visually stronger than branch corridors.
- Thresholds should be visible at Private Office Wing, Hockey Ops Suite, Development Pipeline, Team Corridor, Arena Bowl, Media Bridge, Data Lab, and Local Utility Stack edges.
- Room shells should stay compact and grouped around hubs.
- App-bay rooms should look like intentional terminals/kiosks connected to the GM Computer, not scattered desks.
- Signage should prioritize hubs, thresholds, landmarks, and room entrances.
- Operations Map should preserve pins, route hints, current district, search, badges, and direct room navigation.

## 13. JSON-Like Implementation Data

```json
{
  "districts": [
    { "id": "entry", "label": "Command Atrium", "bounds": { "x": 0, "z": 1, "width": 9.4, "depth": 8.6 }, "landmarkPosition": { "x": 0, "z": 0.8 } },
    { "id": "frontOffice", "label": "Private Office Wing", "bounds": { "x": -7.7, "z": -2.7, "width": 6.9, "depth": 7.8 }, "landmarkPosition": { "x": -8.5, "z": -5.1 } },
    { "id": "hockeyOps", "label": "Hockey Ops Suite", "bounds": { "x": 2.8, "z": -1.4, "width": 8.2, "depth": 10.6 }, "landmarkPosition": { "x": 2.4, "z": -4.5 } },
    { "id": "teamWing", "label": "Team Corridor", "bounds": { "x": 5.2, "z": 5.8, "width": 7.2, "depth": 4.8 }, "landmarkPosition": { "x": 5.4, "z": 5.8 } },
    { "id": "arena", "label": "Arena Bowl", "bounds": { "x": 12.4, "z": 6, "width": 9.8, "depth": 10.8 }, "landmarkPosition": { "x": 9.7, "z": 5.8 } },
    { "id": "media", "label": "Media Bridge", "bounds": { "x": 10.5, "z": -1.7, "width": 6.2, "depth": 4.4 }, "landmarkPosition": { "x": 10.5, "z": -1.5 } },
    { "id": "development", "label": "Development Pipeline", "bounds": { "x": -8.2, "z": 3, "width": 5.8, "depth": 9 }, "landmarkPosition": { "x": -8.1, "z": 5.2 } },
    { "id": "customization", "label": "Data Lab", "bounds": { "x": -4.5, "z": 5.5, "width": 3.6, "depth": 2.7 }, "landmarkPosition": { "x": -4.55, "z": 5.45 } },
    { "id": "utility", "label": "Local Utility Stack", "bounds": { "x": -4.5, "z": 1.2, "width": 3.6, "depth": 6.3 }, "landmarkPosition": { "x": -3.35, "z": 2.9 } }
  ],
  "rooms": [
    { "roomId": "gm", "position": { "x": 0, "z": 0.85 }, "size": { "width": 3.2, "depth": 2.3 }, "entranceFacing": "north", "mapPosition": "derive-from-world" },
    { "roomId": "press", "position": { "x": 10.5, "z": -2.5 }, "size": { "width": 3.2, "depth": 2.1 }, "entranceFacing": "south", "mapPosition": "derive-from-world" },
    { "roomId": "ownerSuite", "position": { "x": -8.5, "z": -5.1 }, "size": { "width": 2.6, "depth": 2.3 }, "entranceFacing": "south", "mapPosition": "derive-from-world" },
    { "roomId": "agents", "position": { "x": -8.8, "z": -1.3 }, "size": { "width": 2.6, "depth": 2 }, "entranceFacing": "east", "mapPosition": "derive-from-world" },
    { "roomId": "playerMeetings", "position": { "x": 3.2, "z": 4.7 }, "size": { "width": 2.8, "depth": 1.9 }, "entranceFacing": "east", "mapPosition": "derive-from-world" },
    { "roomId": "roster", "position": { "x": 0.65, "z": -5.45 }, "size": { "width": 2.8, "depth": 2.1 }, "entranceFacing": "east", "mapPosition": "derive-from-world" },
    { "roomId": "coach", "position": { "x": 3.7, "z": -5.45 }, "size": { "width": 2.8, "depth": 2.1 }, "entranceFacing": "west", "mapPosition": "derive-from-world" },
    { "roomId": "locker", "position": { "x": 4.35, "z": 6.85 }, "size": { "width": 3.2, "depth": 2.2 }, "entranceFacing": "east", "mapPosition": "derive-from-world" },
    { "roomId": "medical", "position": { "x": 7.15, "z": 6.85 }, "size": { "width": 2.5, "depth": 2 }, "entranceFacing": "west", "mapPosition": "derive-from-world" },
    { "roomId": "arena", "position": { "x": 12.4, "z": 6.4 }, "size": { "width": 8.6, "depth": 8.6 }, "entranceFacing": "west", "mapPosition": "derive-from-world" },
    { "roomId": "standings", "position": { "x": -4.55, "z": -1.45 }, "size": { "width": 2.2, "depth": 1.25 }, "entranceFacing": "east", "mapPosition": "derive-from-world" },
    { "roomId": "saves", "position": { "x": -4.55, "z": 0.1 }, "size": { "width": 2.2, "depth": 1.25 }, "entranceFacing": "east", "mapPosition": "derive-from-world" },
    { "roomId": "contracts", "position": { "x": 4.9, "z": -1.2 }, "size": { "width": 2.2, "depth": 1.25 }, "entranceFacing": "west", "mapPosition": "derive-from-world" },
    { "roomId": "trades", "position": { "x": 4.9, "z": 0.25 }, "size": { "width": 2.2, "depth": 1.25 }, "entranceFacing": "west", "mapPosition": "derive-from-world" },
    { "roomId": "scouting", "position": { "x": -8.15, "z": 0.35 }, "size": { "width": 2.6, "depth": 2.2 }, "entranceFacing": "east", "mapPosition": "derive-from-world" },
    { "roomId": "development", "position": { "x": -8.15, "z": 3 }, "size": { "width": 2.6, "depth": 2.2 }, "entranceFacing": "south", "mapPosition": "derive-from-world" },
    { "roomId": "freeAgency", "position": { "x": 4.9, "z": 1.7 }, "size": { "width": 2.2, "depth": 1.25 }, "entranceFacing": "west", "mapPosition": "derive-from-world" },
    { "roomId": "staff", "position": { "x": 4.9, "z": 3.15 }, "size": { "width": 2.2, "depth": 1.25 }, "entranceFacing": "west", "mapPosition": "derive-from-world" },
    { "roomId": "draft", "position": { "x": -8.15, "z": 5.55 }, "size": { "width": 3.1, "depth": 2.3 }, "entranceFacing": "north", "mapPosition": "derive-from-world" },
    { "roomId": "settings", "position": { "x": -4.55, "z": 1.65 }, "size": { "width": 2.2, "depth": 1.25 }, "entranceFacing": "east", "mapPosition": "derive-from-world" },
    { "roomId": "devTools", "position": { "x": -4.55, "z": 5.45 }, "size": { "width": 2.6, "depth": 2 }, "entranceFacing": "east", "mapPosition": "derive-from-world" },
    { "roomId": "feedback", "position": { "x": -4.55, "z": 3.2 }, "size": { "width": 2.2, "depth": 1.25 }, "entranceFacing": "east", "mapPosition": "derive-from-world" }
  ],
  "mainCorridorNodes": ["spawn-concourse", "hockey-ops-gate", "hockey-ops-hub", "team-gate", "team-hub", "arena-tunnel", "arena-gate", "arena-bowl-hub"]
}
```
