# Human Playtester Fix Verification

Date: 2026-05-16, America/Vancouver
Build under test: local Vite dev server at `http://127.0.0.1:4173/`

## Summary

The four issues from the human playtester run were fixed and re-tested in Chromium with the same anxious-player mindset: can I keep my place, can I trust the save, and does the UI respect the task I am doing right now?

## Findings Addressed

| Finding | Fix | Verification |
| --- | --- | --- |
| HPT-001: Guided tutorial overlays map/support panels | Tutorial now docks into a compact control when the map or a room is active. While the map is open, the dock moves to the left side so it does not cover map controls. Passive HUD hints are hidden during map/room focus. | Passed. At 1366x768, the map box and tutorial dock did not overlap, and room prompt/context/control hints were hidden. Screenshot: `fix-map-tutorial-docked.png`. |
| HPT-002: 1024x640 is supported, but guidance was hidden | Removed the compact-height `display: none` rule and replaced it with scrollable/max-height treatment for guidance cards. | Passed. At 1024x640, both Guided Start and First Day checklist were visible. Screenshot: `fix-compact-guidance-1024x640.png`. |
| HPT-003: Manual save lacks reassurance | Save Desk now shows per-slot feedback: saving, saved, or failed. The store returns a success boolean so the panel can show a real saved state. Snapshot refresh now happens after success feedback instead of blocking it. | Passed. Slot 1 changed from `Saving...` to `Saved 19:24:54`, and the row button returned to `Overwrite`. Screenshot: `fix-save-feedback.png`. |
| HPT-004: Room modals leave stale physical-room prompt visible | Room prompt, contextual hint, and keyboard movement hint are suppressed while a modal or operations map is active. | Passed. In the Save Desk modal, room prompt and contextual hint were not visible. Screenshot: `fix-room-modal-passive-hud-hidden.png`. |

## Player Feel Notes

The game now feels less like it is talking over the player. The tutorial still exists, but it becomes a small status/control when the player is in a focused surface. That feels calmer: the game is still helping, but it is no longer standing in front of the work.

The save fix matters emotionally. Seeing `Saving...` immediately and then a timestamped `Saved` message makes the Save Desk feel accountable. The overwrite button returning after completion also gives a clear sense that the slot is now occupied and stable.

## Verification Commands

- `npm run check`
- Focused Chromium playtest at 1024x640 and 1366x768.

## Notes

Headless Chromium emitted WebGL `ReadPixels` performance warnings during screenshot capture. No app-level runtime errors were observed during the focused verification.
