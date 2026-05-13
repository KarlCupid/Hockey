# Franchise Ice Implementation Plan

## Milestone 1: Foundation

- Scaffold Vite, React, TypeScript, Vitest, Zustand, localForage, Three.js, React Three Fiber, and Drei.
- Add global theme, shell, and durable project docs.

## Milestone 2: Pure Game Systems

- Define shared types for players, teams, schedules, saves, tactics, and game results.
- Generate fictional teams, rosters, schedules, and starting lineups.
- Implement seeded RNG, lineup validation, chemistry, tactics descriptions, standings, morale, fatigue, injuries, news, and saves.

## Milestone 3: Simulation

- Build deterministic period and full-game simulation.
- Generate event timelines, box scores, three stars, injuries, coach notes, and player/team updates.
- Apply results to franchise state and simulate the rest of a game day.

## Milestone 4: Playable UI

- Build start screen, team selection, top HUD, room panels, roster/player cards, lineup/tactics editor, standings, save/load, arena controls, and result review.
- Add instant, period-by-period, and arena/broadcast simulation flows.

## Milestone 5: 3D Facility

- Build a primitive third-person hockey operations hub.
- Add WASD movement, orbiting camera, labeled rooms, glowing interactables, E/click room entry, and Escape close behavior.

## Milestone 6: Verification

- Add Vitest coverage for deterministic simulation, standings, lineup validation, and save serialization.
- Run `npm test` and `npm run build`.
- Launch the app and verify the start-to-finish vertical slice.
