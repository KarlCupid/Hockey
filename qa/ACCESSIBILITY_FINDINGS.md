# Accessibility Findings

## Finding QA-001: Operations Map controls need accessible destination labels

Severity: medium
Confidence: high
Area: Accessibility / Operations Map
Room/Flow: Map pins and direct room navigation
Repro Steps: Start demo, open map, inspect `.ops-map__pin` and `.ops-map__go` controls.
Expected: Each button names its action and destination.
Actual: Pin controls have no explicit `aria-label`; badge counts concatenate into names such as `Cap1`, `GM4`, `Meet1`; repeated buttons are `Go to room`.
User Impact: Screen-reader and keyboard users get ambiguous control names in the main accessibility fallback.
Evidence: Browser evaluate output; `src/components/hud/OperationsMap.tsx`.
Likely Files: `src/components/hud/OperationsMap.tsx`
Suggested Fix Direction: Add labels like `Select GM Office in Front Office Wing` and `Go to GM Office`; make visual badge counts hidden or deliberately described.
Acceptance Criteria: DOM/accessibility snapshot shows unique destination-specific names for pins and direct navigation buttons.

## No Additional Accessibility Blockers Found

Automated coverage validates unique shortcuts, high contrast/larger text classes, reduced-flash settings, low-spec preset, display-mode warnings, generated audio no-op behavior, and direct map navigation mechanics. Browser pass confirmed map opens and direct navigation to GM Office works.

