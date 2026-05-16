export interface PlaytestChecklistStep {
  id: string;
  label: string;
  expectedResult: string;
  diagnosticsRelevant?: boolean;
}

export interface PlaytestChecklist {
  id: string;
  title: string;
  description: string;
  steps: PlaytestChecklistStep[];
}

export const PLAYTEST_CHECKLISTS: PlaytestChecklist[] = [
  {
    id: "closed-beta-feedback-flow",
    title: "Closed Beta Feedback Flow",
    description: "Verify feedback, friction guidance, post-game clarity, and export-only diagnostics.",
    steps: [
      { id: "submit-feedback", label: "Submit a confusing-moment feedback entry", expectedResult: "Entry appears locally with room, phase, category, and severity.", diagnosticsRelevant: true },
      { id: "export-feedback", label: "Export the feedback bundle", expectedResult: "Bundle includes feedback and optional diagnostics, but not a full save.", diagnosticsRelevant: true },
      { id: "friction-report", label: "Open Dev Tools UX friction report", expectedResult: "Signals summarize confusing flow without network telemetry.", diagnosticsRelevant: true },
      { id: "post-game-summary", label: "Review the post-game summary card", expectedResult: "Next recommendation, fatigue, morale, story, and achievement fallout are readable." }
    ]
  },
  {
    id: "first-30-minutes",
    title: "First 30 Minutes",
    description: "Verify that a new beta player can start, understand the loop, simulate, and save.",
    steps: [
      { id: "start-demo", label: "Start the demo franchise", expectedResult: "Facility opens without overwriting manual saves." },
      { id: "read-agm", label: "Read the Assistant GM report", expectedResult: "The next useful action is clear." },
      { id: "sim-one-game", label: "Simulate one game", expectedResult: "Result center, news, standings, and autosave update." },
      { id: "save-snapshot", label: "Save to a manual slot", expectedResult: "Save metadata and backup snapshot are visible." }
    ]
  },
  {
    id: "first-season",
    title: "First Season",
    description: "Exercise the basic dynasty loop from regular season through a new season.",
    steps: [
      { id: "complete-season", label: "Complete the regular season", expectedResult: "Playoffs or season review become available." },
      { id: "advance-offseason", label: "Advance offseason phases", expectedResult: "Draft, re-signing, free agency, staff, and camp remain stable." },
      { id: "new-season", label: "Start the next season", expectedResult: "Schedule, owner goals, rosters, and Assistant GM reports refresh." }
    ]
  },
  {
    id: "custom-league-lab",
    title: "Custom League Lab Test",
    description: "Confirm local fictional customization remains safe and supported.",
    steps: [
      { id: "change-team-count", label: "Change between 8, 10, 12, and 16 teams", expectedResult: "Rules validate and unsupported combinations are flagged." },
      { id: "repair-pack", label: "Repair a deliberately invalid pack", expectedResult: "Repair produces clear warnings and safe generated fallbacks." },
      { id: "start-custom", label: "Start a supported custom league", expectedResult: "The first game can simulate and save metadata includes custom rules." }
    ]
  },
  {
    id: "dynasty-stability",
    title: "Dynasty Stability Test",
    description: "Look for long-run crashes, save corruption, and roster collapse.",
    steps: [
      { id: "dry-run", label: "Run Dev Tools dry-run reports", expectedResult: "No fatal invariant errors." },
      { id: "restore-snapshot", label: "Restore a recent snapshot", expectedResult: "The restored franchise loads and passes integrity checks." },
      { id: "export-import-save", label: "Export and import save JSON", expectedResult: "Roundtrip preserves schema and selected team." }
    ]
  },
  {
    id: "accessibility-audio",
    title: "Accessibility And Audio Test",
    description: "Verify readability, motion, flashes, keyboard help, and generated local audio.",
    steps: [
      { id: "low-spec", label: "Apply low-spec preset", expectedResult: "Reduced detail, motion, flashes, compact tables, and quieter audio apply." },
      { id: "contrast-text", label: "Enable high contrast and larger text", expectedResult: "Panels remain readable and scrollable." },
      { id: "audio-toggle", label: "Toggle generated audio", expectedResult: "Audio starts only after interaction and fails quietly if blocked." }
    ]
  },
  {
    id: "bug-report",
    title: "Bug Report Test",
    description: "Confirm beta players can export useful local diagnostics.",
    steps: [
      { id: "copy-summary", label: "Copy diagnostic summary", expectedResult: "Version, schema, rules, integrity, and runtime health appear.", diagnosticsRelevant: true },
      { id: "export-report", label: "Export bug report JSON", expectedResult: "Report includes diagnostics and excludes full save unless enabled.", diagnosticsRelevant: true },
      { id: "attach-steps", label: "Write reproduction steps", expectedResult: "Playtester note is included in the report.", diagnosticsRelevant: true }
    ]
  }
];
