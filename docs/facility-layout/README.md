# Image-Guided Facility Layout Workflow

This workflow turns generated concept art into a disciplined design input for the Franchise Ice facility. It is meant to solve spatial taste and art-direction problems before implementation, while keeping the playable game fully data-driven.

The runtime source of truth remains `src/game/facility/facilityBlueprint.ts`. Concept images, prompt outputs, extracted specs, and SVG exports are design artifacts only. They must not become a second layout system.

## Workflow

1. Export the current blueprint floorplan.

   Run:

   ```sh
   npm run export:facility-layout
   ```

   The script reads `createDefaultFacilityBlueprint()` and writes `docs/facility-layout/current-facility-layout.svg`. Use that SVG as the current-map reference for image generation or image editing.

2. Generate visual concepts.

   Use the prompts in `IMAGE_PROMPTS.md` with GPT Image 2 or another image generation model. Attach `current-facility-layout.svg` when the prompt asks for the current layout. Generate top-down annotated concepts first, then isometric blockouts or visual identity sheets when useful.

3. Choose one approved art direction.

   Pick a concept that preserves the intended hockey-operations campus:

   - Command Atrium at spawn, with the GM Computer as the central command object.
   - Standings, saves, settings, and feedback app kiosks near spawn.
   - Private Office Wing west/private.
   - Hockey Ops Suite east/core gameplay, with GM Computer app bays for desk-heavy features.
   - Development pipeline branching from Hockey Ops.
   - Team Wing flowing toward Arena.
   - Arena Bowl as the largest destination.
   - Press Room near the Arena/public concourse.
   - Settings, Feedback, and Dev Tools near spawn/secondary branches.
   - Locker and Medical adjacent.
   - Main corridor reading as Command Atrium -> Hockey Ops -> Team Corridor -> Arena.

4. Convert the approved concept into a strict layout spec.

   Do not ask Codex to implement directly from a concept image. Use a vision-capable model with the extraction prompt in `IMAGE_PROMPTS.md`, then paste the result into `approved-facility-layout-spec.md`. The spec should follow `LAYOUT_SPEC_TEMPLATE.md` and include explicit coordinates, district bounds, room positions, path nodes, landmarks, and validation expectations.

5. Implement the approved spec in the typed blueprint.

   Give Codex the completed `approved-facility-layout-spec.md` plus `CODEX_IMPLEMENTATION_PROMPT.md`. Codex should update `src/game/facility/facilityBlueprint.ts` first, and only touch rendering, map, or validation files when the spec requires presentation or guardrail changes.

6. Verify the implementation.

   Run:

   ```sh
   npm run export:facility-layout
   npm run typecheck
   npm test
   npm run test:smoke
   npm run build
   ```

   Review the regenerated SVG, Operations Map, and 3D facility together. If the result does not match the approved spec, revise the blueprint or the spec. Do not patch around it with duplicate runtime coordinates.

## Runtime Boundary

The following must continue to come from `facilityBlueprint.ts`:

- 3D district floors.
- Corridors.
- Gates and thresholds.
- Room shells.
- Room props.
- Room zones and interactions.
- Signage.
- Landmarks.
- Operations Map pins.
- Operations Map paths.
- Route hints.
- Wayfinding.
- Validation.

Generated images can direct taste, flow, hierarchy, and spatial composition. They cannot drive the playable world at runtime.

## Files In This Package

- `current-facility-layout.svg`: generated current blueprint floorplan for image-model input.
- `IMAGE_PROMPTS.md`: copy-paste prompts for concept generation and spec extraction.
- `LAYOUT_SPEC_TEMPLATE.md`: strict implementation-ready spec format.
- `gm-computer-floorplan-concept.png`: generated floorplan concept used for the current approved redesign.
- `approved-facility-layout-spec.md`: approved concept extraction/spec for the current implemented layout.
- `CODEX_IMPLEMENTATION_PROMPT.md`: prompt for applying an approved spec to the repo.
