# Codex Implementation Prompt

Use this prompt after `approved-facility-layout-spec.md` contains an approved, extracted layout spec.

```text
Implement the approved image-guided facility layout spec in this repo.

Inputs:
- Read docs/facility-layout/approved-facility-layout-spec.md first.
- Use docs/facility-layout/LAYOUT_SPEC_TEMPLATE.md as the expected schema.
- Use FACILITY_BLUEPRINT.md and src/game/facility/facilityBlueprint.ts as the current architecture baseline.

Rules:
- Do not implement from concept art directly. Implement from the approved spec.
- Do not create duplicate layout data outside the blueprint.
- src/game/facility/facilityBlueprint.ts must remain the canonical runtime source of truth for room placement, district floors, corridors, gates/thresholds, room shells, room props, room zones/interactions, signage, landmarks, Operations Map pins, Operations Map paths, route hints, wayfinding, and validation.
- Do not add backend, auth, cloud saves, online services, network telemetry, real hockey branding, real team logos, real jerseys, real player names, or playable on-ice hockey.
- Do not rename RoomId values.
- Preserve existing map filters, route hints, current district, "You are here", direct room navigation, room badges, and search.
- Keep game logic pure and testable.

Primary implementation target:
- src/game/facility/facilityBlueprint.ts

Only modify these files when the approved spec requires it:
- src/game/facility/facilityValidation.ts, if new validation is needed.
- src/tests/phase13FacilityLayout.test.ts, to protect the new layout intent.
- src/components/three/FacilityCorridor.tsx, if corridor presentation needs adjustment.
- src/components/three/FacilityDistrict.tsx, if district floor presentation needs adjustment.
- src/components/three/FacilityRoomShell.tsx, if room-shell presentation needs adjustment.
- src/components/three/FacilityPropSet.tsx, if prop placement/theme presentation needs adjustment.
- src/components/hud/OperationsMap.tsx, only if map readability or path rendering needs adjustment.
- FACILITY_BLUEPRINT.md, to document the final implemented layout.

Implementation steps:
1. Compare the approved spec to the current blueprint constants: DISTRICT_BOUNDS, HUBS, ROOM_SIZES, ROOM_POSITIONS, DISTRICT_META, rooms, pathNodes, mainCorridorNodes, and landmarks.
2. Update the typed blueprint deterministically from the spec. Prefer named constants and hub offsets over scattered inline coordinates.
3. Keep map positions derived through mapPoint() unless the spec explicitly requires documented overrides.
4. Make path-node connections reciprocal and keep mainCorridorNodes ordered as Command Atrium -> Hockey Ops -> Team Corridor -> Arena.
5. Ensure room entrances face nearby corridors or hubs.
6. Update or add focused tests only for meaningful layout guarantees.
7. Regenerate docs/facility-layout/current-facility-layout.svg with npm run export:facility-layout.
8. Run npm run typecheck, npm test, npm run test:smoke, and npm run build.

If the approved spec is incomplete or conflicts with validation, make the smallest reasonable implementation decision, document it in FACILITY_BLUEPRINT.md or the final response, and keep the blueprint as the only runtime source of truth.
```
