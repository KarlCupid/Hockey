# Image Prompts

Use these prompts with `docs/facility-layout/current-facility-layout.svg` and the approved concept images. Keep all generated art fictional. Do not include real hockey teams, real league branding, real logos, real jerseys, or licensed marks.

## Top-Down Annotated Floorplan Generation

```text
Create a polished top-down annotated floorplan concept for a fictional hockey management game facility called Franchise Ice.

Use the attached current floorplan SVG as the starting layout reference. Improve the spatial design so it feels like an intentionally designed hockey operations campus, not scattered desks or unrelated boxes. Keep it compact, readable, and implementation-friendly.

Required rooms, exactly once each:
gm, press, ownerSuite, agents, playerMeetings, roster, coach, locker, medical, arena, standings, saves, contracts, trades, scouting, development, freeAgency, staff, draft, settings, devTools, feedback.

Required districts:
entry, frontOffice, hockeyOps, teamWing, arena, media, development, customization, utility.

Spatial intent:
- Command Atrium at spawn with the GM Computer as the central command object.
- Standings, saves, settings, and feedback app kiosks near spawn.
- Private Office Wing west/private.
- Hockey Ops Suite east/core gameplay, with GM Computer app bays for contracts, trades, free agency, and staff.
- Development pipeline branch off Hockey Ops.
- Team Wing flows toward Arena.
- Arena Bowl is the largest destination.
- Press Room is near the Arena/public concourse.
- Settings, Feedback, and Dev Tools are near spawn/secondary.
- Locker and Medical are adjacent.
- Main corridor clearly reads as Command Atrium -> Hockey Ops -> Team Corridor -> Arena.
- Avoid scattered desks; use rooms, thresholds, gates, corridors, landmarks, and district zones.

Style:
- Top-down architectural game-map concept.
- Clear district color zones with labels.
- Room footprints with room IDs or short labels.
- Bold main corridor and thinner branch corridors.
- Visible thresholds/gates between districts.
- Fictional hockey-operations atmosphere: trophy hall, draft board, coach/roster planning, team tunnel, arena bowl, press backdrop, local save desk.
- No real team branding, real league marks, real player names, real jerseys, or licensed logos.

Output a single clean image suitable for human approval and later conversion into a coordinate spec. Do not output code.
```

## Isometric Low-Poly Blockout Generation

```text
Create an isometric low-poly blockout concept for a fictional hockey operations facility in Franchise Ice.

Use this exact room and district plan:
Rooms: gm, press, ownerSuite, agents, playerMeetings, roster, coach, locker, medical, arena, standings, saves, contracts, trades, scouting, development, freeAgency, staff, draft, settings, devTools, feedback.
Districts: entry, frontOffice, hockeyOps, teamWing, arena, media, development, customization, utility.

Spatial intent:
- Command Atrium at spawn with the GM Computer plus standings, saves, settings, and feedback app kiosks nearby.
- Private Office Wing is west/private and contains ownerSuite and agents.
- Hockey Ops Suite is east/core gameplay and contains roster, coach, contracts, trades, freeAgency, and staff app bays.
- Development branches from Hockey Ops and contains scouting, development, draft.
- Team Wing flows from Hockey Ops toward the Arena and contains playerMeetings, locker, medical.
- Locker and Medical are adjacent.
- Arena Bowl is the largest destination at the end of the route.
- Press Room is near Arena/public concourse.
- Settings, Feedback, and Dev Tools are near spawn on secondary branches.
- Main route must read Command Atrium -> Hockey Ops -> Team Corridor -> Arena.

Visual direction:
- Isometric game blockout, readable from a distance.
- Low-poly, clean geometry, no photorealism.
- District floors use distinct materials and subtle colors.
- Corridors, thresholds, gates, signage, landmarks, and room shells are visible.
- Show rough props only as massing: desks, benches, trophy cases, draft boards, medical beds, press backdrop, team tunnel, arena bowl.
- Avoid scattered desks in open space; every interaction belongs to a room, kiosk, landmark, corridor node, or district zone.
- No real hockey league names, logos, jerseys, players, teams, or licensed branding.

Output one image that can guide a Three.js blockout pass. Do not output runtime data or code.
```

## Redesign This Current Layout Image Edit Prompt

```text
Redesign the attached current facility floorplan while preserving the Franchise Ice room IDs and district IDs.

Do not invent new runtime systems or new room IDs. Keep every required room exactly once:
gm, press, ownerSuite, agents, playerMeetings, roster, coach, locker, medical, arena, standings, saves, contracts, trades, scouting, development, freeAgency, staff, draft, settings, devTools, feedback.

Keep the district set:
entry, frontOffice, hockeyOps, teamWing, arena, media, development, customization, utility.

Improve the layout as a compact, intentional hockey-operations campus:
- Command Atrium remains the spawn/orientation hub, with GM Computer as the central command object.
- Standings, saves, settings, and feedback app kiosks remain close to spawn.
- Private Office Wing stays west/private.
- Hockey Ops Suite stays east/core gameplay with GM Computer app bays.
- Development branches from Hockey Ops.
- Team Wing flows naturally toward the Arena.
- Arena Bowl is clearly the largest destination.
- Press Room sits near Arena/public concourse, not inside private team space.
- Settings, Feedback, and Dev Tools sit near spawn on secondary branches.
- Locker and Medical remain adjacent.
- Main corridor must read Command Atrium -> Hockey Ops -> Team Corridor -> Arena.
- Make thresholds/gates/corridors/landmarks readable.
- Remove any feeling of scattered desks or random boxes.

Use the attached SVG only as the current baseline. Improve proportions, hierarchy, readability, and art direction, but keep the concept feasible for a typed blueprint using district bounds, room center positions, room sizes, entrance facings, path nodes, and landmarks.

Return a polished annotated top-down concept image. Include labels. Do not output code.
```

## Room And District Visual Identity Sheet

```text
Create a visual identity sheet for the Franchise Ice facility districts and rooms.

The image should be a design board, not a runtime UI. Show colors, floor materials, signage motifs, prop silhouettes, and landmark ideas for each district:
- entry: Command Atrium, spawn, GM Computer, Operations Map Kiosk.
- frontOffice: private west wing for ownerSuite and agents.
- hockeyOps: core east suite for roster, coach, contracts, trades, freeAgency, and staff app bays.
- development: pipeline branch for scouting, development, draft.
- teamWing: player-facing route for playerMeetings, locker, medical.
- arena: large Arena Bowl destination.
- media: public Press Room near arena concourse.
- customization: Dev Tools/Data Lab side branch.
- utility: Standings, saves, settings, and feedback app kiosks near spawn.

Required room IDs to include as labels somewhere on the sheet:
gm, press, ownerSuite, agents, playerMeetings, roster, coach, locker, medical, arena, standings, saves, contracts, trades, scouting, development, freeAgency, staff, draft, settings, devTools, feedback.

Direction:
- Fictional hockey operations fantasy.
- Polished but practical for simple 3D blockout: room shells, signage, floor zones, props, landmarks.
- Avoid real hockey league names, teams, players, logos, jerseys, or licensed branding.
- Avoid scattered desks; every prop cluster should belong to a room, kiosk, landmark, or corridor zone.
- Keep the palette readable across a dark game HUD and an Operations Map.

Output one image with labeled swatches and small vignettes.
```

## Final Implementation-Spec Extraction From Approved Image

```text
You are converting an approved facility concept image into an implementation-ready layout spec for a TypeScript data-driven game blueprint.

Important:
- Do not implement from the image directly.
- Do not create a second runtime source of truth.
- Produce a strict text spec that Codex can apply to src/game/facility/facilityBlueprint.ts.
- Preserve the existing RoomId and district IDs exactly.
- Use all rooms exactly once.
- Keep concept art as design guidance only.

Required rooms:
gm, press, ownerSuite, agents, playerMeetings, roster, coach, locker, medical, arena, standings, saves, contracts, trades, scouting, development, freeAgency, staff, draft, settings, devTools, feedback.

Required districts:
entry, frontOffice, hockeyOps, teamWing, arena, media, development, customization, utility.

Spatial intent to preserve:
- Command Atrium at spawn with the GM Computer as the central command object.
- Standings, saves, settings, and feedback app kiosks near spawn.
- Private Office Wing west/private.
- Hockey Ops Suite east/core gameplay, with GM Computer app bays.
- Development pipeline branch off Hockey Ops.
- Team Wing flows toward Arena.
- Arena Bowl is the largest destination.
- Press Room is near the Arena/public concourse.
- Settings, Feedback, and Dev Tools are near spawn/secondary.
- Locker and Medical are adjacent.
- Main corridor clearly reads as Command Atrium -> Hockey Ops -> Team Corridor -> Arena.
- Avoid scattered desks; use rooms, thresholds, gates, corridors, landmarks, and district zones.

Coordinate system:
- Use world coordinates where x is west/east and z is north/south.
- Room positions are center points.
- Room sizes are width/depth.
- District bounds are center-based rectangles.
- Keep spawn near { "x": 0, "z": 0 } unless the concept clearly requires a documented shift.
- Use approximate values that are easy to implement and validate.

Output format:
1. Coordinate System
2. District Bounds
3. Room Positions
4. Room Sizes
5. Entrance Facings
6. Map Positions
7. Path Nodes
8. Main Corridor Node Sequence
9. Landmarks
10. Route Notes
11. Validation Expectations
12. Visual Treatment Notes
13. JSON-like Implementation Data

In the JSON-like section, include:
- districts with id, label, bounds, landmarkPosition.
- rooms with roomId, position, size, entranceFacing, mapPosition instruction.
- pathNodes with id, label, position, connectedNodeIds, districtId, isLandmark when relevant.
- mainCorridorNodes.
- landmarks.

If a coordinate is uncertain, choose a reasonable approximate value and add a short note in Route Notes. Do not leave placeholders for required fields.
```
