# Severity Rubric

## Blocker

Use when the build cannot be trusted for closed-beta distribution.

- Required command fails.
- App cannot boot or enter a franchise.
- Save import/export or recovery corrupts state.
- Feedback/bug export leaks full save data by default.
- Facility blueprint validation has missing rooms, duplicates, severe overlaps, or disconnected core rooms.
- Obvious real-world restricted hockey branding is accepted without warning.
- Backend, cloud sync, online sharing, network telemetry, or real licensed content is introduced.

## High

Use when a core beta flow is broken or misleading.

- First-hour route cannot reach GM Office, roster, coach, arena, or save.
- Operations Map direct navigation is unavailable or points to the wrong room.
- Custom 8/10/12/16 league starts cannot validate, start, simulate one game, or save.
- Save snapshots/recovery cannot restore a valid recent state.
- Keyboard-only users cannot open core rooms or close blocking UI.
- High-severity living-ops decisions are hidden from GM Office/TopBar/Map guidance.

## Medium

Use when a feature works but likely causes repeated tester confusion.

- Route hint starts from the wrong context.
- Room/district copy conflicts with facility layout.
- Custom League Lab warnings are technically correct but hard to act on.
- First-hour checklist or Assistant GM gives too many competing next actions.
- Accessibility affordances exist but are under-labeled or hard to discover.

## Low

Use for contained rough edges.

- Polish copy is unclear.
- Non-core map filter state is confusing.
- Known limitation needs stronger in-app framing.
- Report/export metadata is present but not especially readable.

## Polish

Use for presentation improvements that do not block beta testing.

- Primitive art could better sell a room identity.
- Spacing, iconography, labels, or language could be clearer.
- Future automation could collect richer evidence.

