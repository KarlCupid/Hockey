# Accessibility Rubric

## Core Checks

- Keyboard controls work for movement, map, help, core room shortcuts, and modal closing.
- Direct map navigation exists for players who cannot or do not want to navigate 3D space.
- Reduced motion and reduced flashes are respected by UI/broadcast helpers.
- Reduced 3D detail keeps navigation surfaces intact.
- High contrast and larger text settings are available and summarized.
- Buttons, filters, pins, and close controls have meaningful labels.
- Small-screen support communicates the desktop recommendation without hiding recovery actions.
- Audio controls no-op safely and do not require external assets.

## Severity Guidance

- Blocker: keyboard or direct navigation cannot reach core game flow.
- High: save/recovery or feedback export is inaccessible by keyboard.
- Medium: controls technically work but are poorly labeled for screen readers.
- Low: accessibility settings exist but copy/discoverability can improve.
- Polish: visual hierarchy, focus styling, or label wording can be refined.

## Evidence Sources

- `src/game/systems/accessibility.ts`
- `src/store/settingsStore.ts`
- `src/app/AppShell.tsx`
- `src/components/hud/OperationsMap.tsx`
- `src/components/hud/TopBar.tsx`
- `src/tests/phase8ReleaseCandidate.test.ts`
- Browser/DOM snapshots when available.

