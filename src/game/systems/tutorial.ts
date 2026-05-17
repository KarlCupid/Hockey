import type { FranchiseState, RoomId, TutorialState, TutorialStep } from "../types";

export const FIRST_HOUR_TUTORIAL_ROOM_ROUTE: RoomId[] = ["gm", "roster", "coach", "arena", "saves"];

export const TUTORIAL_STEP_DEFINITIONS: Omit<TutorialStep, "completed">[] = [
  {
    id: "move-facility",
    title: "Walk the facility",
    body: "Start in the Command Atrium, then use WASD to move through the wings. The nearest room marker will light up when you are close.",
    targetAction: "movement",
    optional: false,
    category: "movement"
  },
  {
    id: "open-gm-office",
    title: "Open the GM Computer",
    body: "The GM Computer is the command center. Press E near it or open it from the map.",
    roomId: "gm",
    targetAction: "openRoom",
    optional: false,
    category: "gmOffice"
  },
  {
    id: "read-assistant-gm",
    title: "Read the Assistant GM report",
    body: "Assistant GM reports explain the most useful next actions without taking control away from you.",
    roomId: "gm",
    targetAction: "readAssistantReport",
    optional: false,
    category: "gmOffice"
  },
  {
    id: "open-roster-office",
    title: "Check roster health",
    body: "The Roster Office shows active players, scratches, affiliate depth, injured reserve, cap impact, and repair warnings.",
    roomId: "roster",
    targetAction: "openRoom",
    optional: false,
    category: "roster"
  },
  {
    id: "review-roster-health",
    title: "Read the roster health card",
    body: "A game-ready roster needs enough healthy forwards, defense, and goalies before simulation.",
    roomId: "roster",
    targetAction: "reviewRosterHealth",
    optional: false,
    category: "roster"
  },
  {
    id: "open-coach-office",
    title: "Open Coach's Office",
    body: "The Coach's Office owns lines, goalie assignments, and tactics.",
    roomId: "coach",
    targetAction: "openRoom",
    optional: false,
    category: "lineup"
  },
  {
    id: "review-lines",
    title: "Review or auto-fill lines",
    body: "Auto Fill Best Lineup is a safe starting point. You can still edit every slot manually.",
    roomId: "coach",
    targetAction: "lineupChanged",
    optional: false,
    category: "lineup"
  },
  {
    id: "adjust-tactic",
    title: "Set a tactical identity",
    body: "Tactic presets and sliders nudge simulation style without turning this into playable on-ice hockey.",
    roomId: "coach",
    targetAction: "tacticChanged",
    optional: false,
    category: "lineup"
  },
  {
    id: "open-arena",
    title: "Open the Arena Bowl",
    body: "The Arena Bowl lets you choose instant sim, period sim, or broadcast mode for the next user game.",
    roomId: "arena",
    targetAction: "openRoom",
    optional: false,
    category: "simulation"
  },
  {
    id: "sim-first-game",
    title: "Sim your first game",
    body: "Use the sim mode you prefer. Instant is fastest; broadcast gives the strongest presentation.",
    roomId: "arena",
    targetAction: "gameSimulated",
    optional: false,
    category: "simulation"
  },
  {
    id: "review-result-center",
    title: "Review the Game Result Center",
    body: "After a game, check three stars, the turning point, injuries, morale, fatigue, news, and the next recommended action.",
    roomId: "arena",
    targetAction: "resultReviewed",
    optional: false,
    category: "simulation"
  },
  {
    id: "open-press-if-needed",
    title: "Handle any press fallout",
    body: "If a decision event appears, visit the Press Room or the linked room from the Assistant GM queue.",
    roomId: "press",
    targetAction: "decisionReviewed",
    optional: true,
    category: "livingOps"
  },
  {
    id: "open-save-desk",
    title: "Open the Save Desk",
    body: "Saves, snapshots, bug reports, and feedback exports are local-only. Use a manual slot before experiments or long offseason jumps.",
    roomId: "saves",
    targetAction: "openRoom",
    optional: false,
    category: "saveLoad"
  },
  {
    id: "save-franchise",
    title: "Save the franchise",
    body: "Save into one of the three manual slots or rely on autosave after completed games.",
    roomId: "saves",
    targetAction: "saveFranchise",
    optional: false,
    category: "saveLoad"
  },
  {
    id: "open-standings",
    title: "Check Standings and Trophy Hall",
    body: "The Trophy Hall tracks standings, season history, achievements, and franchise milestones.",
    roomId: "standings",
    targetAction: "openRoom",
    optional: false,
    category: "dynasty"
  },
  {
    id: "understand-next-phase",
    title: "Understand the next step",
    body: "The GM Computer phase card and Master Action Queue explain what must happen before the calendar advances.",
    roomId: "gm",
    targetAction: "phaseGuidanceRead",
    optional: false,
    category: "dynasty"
  }
];

export function createDefaultTutorialState(mode: TutorialState["mode"] = "firstFranchise"): TutorialState {
  return {
    active: mode !== "off",
    mode,
    currentStepId: mode === "off" ? undefined : TUTORIAL_STEP_DEFINITIONS[0]?.id,
    completedStepIds: [],
    dismissedStepIds: []
  };
}

export function getTutorialSteps(franchise: FranchiseState): TutorialStep[] {
  const state = normalizeTutorialState(franchise.tutorialState);
  return TUTORIAL_STEP_DEFINITIONS.map((step) => ({
    ...step,
    completed: state.completedStepIds.includes(step.id)
  }));
}

export function getCurrentTutorialStep(franchise: FranchiseState): TutorialStep | undefined {
  const state = normalizeTutorialState(franchise.tutorialState);
  if (!state.active || state.mode === "off") return undefined;
  const steps = getTutorialSteps({ ...franchise, tutorialState: state });
  const requested = steps.find((step) => step.id === state.currentStepId);
  if (requested && !requested.completed && !state.dismissedStepIds.includes(requested.id)) return requested;
  return steps.find((step) => !step.completed && !state.dismissedStepIds.includes(step.id));
}

export function completeTutorialStep(franchise: FranchiseState, stepId: string): FranchiseState {
  const state = normalizeTutorialState(franchise.tutorialState);
  if (state.mode === "off") return franchise;
  const completedStepIds = addUnique(state.completedStepIds, stepId);
  const nextStep = TUTORIAL_STEP_DEFINITIONS.find((step) => !completedStepIds.includes(step.id) && !state.dismissedStepIds.includes(step.id));
  return {
    ...franchise,
    tutorialState: {
      ...state,
      active: Boolean(nextStep),
      completedStepIds,
      currentStepId: nextStep?.id,
      lastHintAt: new Date().toISOString()
    },
    updatedAt: new Date().toISOString()
  };
}

export function dismissTutorialStep(franchise: FranchiseState, stepId: string): FranchiseState {
  const state = normalizeTutorialState(franchise.tutorialState);
  const dismissedStepIds = addUnique(state.dismissedStepIds, stepId);
  const nextStep = TUTORIAL_STEP_DEFINITIONS.find((step) => !state.completedStepIds.includes(step.id) && !dismissedStepIds.includes(step.id));
  return {
    ...franchise,
    tutorialState: {
      ...state,
      active: Boolean(nextStep) && state.mode !== "off",
      dismissedStepIds,
      currentStepId: nextStep?.id,
      lastHintAt: new Date().toISOString()
    },
    updatedAt: new Date().toISOString()
  };
}

export function resetTutorial(franchise: FranchiseState, mode: TutorialState["mode"] = "guided"): FranchiseState {
  return {
    ...franchise,
    tutorialState: createDefaultTutorialState(mode),
    updatedAt: new Date().toISOString()
  };
}

export function skipTutorial(franchise: FranchiseState): FranchiseState {
  return {
    ...franchise,
    tutorialState: {
      ...normalizeTutorialState(franchise.tutorialState),
      active: false,
      mode: "off",
      currentStepId: undefined,
      dismissedStepIds: TUTORIAL_STEP_DEFINITIONS.map((step) => step.id),
      lastHintAt: new Date().toISOString()
    },
    updatedAt: new Date().toISOString()
  };
}

export function getTutorialCompletionMessage(franchise: FranchiseState): string {
  const steps = getTutorialSteps(franchise);
  const completed = steps.filter((step) => step.completed).length;
  if (completed >= steps.length) return "First tour complete. Help, Guide, and the first-hour checklist stay available whenever the room gets noisy.";
  return `${completed}/${steps.length} tutorial steps complete. The Guide remains available from Help even if the tutorial is skipped.`;
}

export function getContextualHint(franchise: FranchiseState, roomId: RoomId): string | undefined {
  const state = normalizeTutorialState(franchise.tutorialState);
  if (!state.active || state.mode === "off") return undefined;
  const step = getCurrentTutorialStep({ ...franchise, tutorialState: state });
  if (step?.roomId === roomId) return step.body;
  const roomHint = ROOM_HINTS[roomId];
  if (!roomHint) return undefined;
  return roomHint;
}

export function shouldShowTutorialHint(franchise: FranchiseState, roomId: RoomId, action?: string): boolean {
  const state = normalizeTutorialState(franchise.tutorialState);
  if (!state.active || state.mode === "off") return false;
  const step = getCurrentTutorialStep({ ...franchise, tutorialState: state });
  if (!step) return false;
  if (step.roomId && step.roomId !== roomId) return false;
  if (action && step.targetAction && step.targetAction !== action) return false;
  return !state.dismissedStepIds.includes(step.id);
}

export function normalizeTutorialState(state?: TutorialState): TutorialState {
  if (!state) return createDefaultTutorialState("firstFranchise");
  const mode = state.mode === "guided" || state.mode === "off" || state.mode === "firstFranchise" ? state.mode : "firstFranchise";
  const completedStepIds = Array.isArray(state.completedStepIds) ? state.completedStepIds.filter(isKnownStep) : [];
  const dismissedStepIds = Array.isArray(state.dismissedStepIds) ? state.dismissedStepIds.filter(isKnownStep) : [];
  const currentStepId = state.currentStepId && isKnownStep(state.currentStepId) ? state.currentStepId : TUTORIAL_STEP_DEFINITIONS.find((step) => !completedStepIds.includes(step.id) && !dismissedStepIds.includes(step.id))?.id;
  return {
    active: mode !== "off" && (state.active ?? true),
    mode,
    currentStepId,
    completedStepIds,
    dismissedStepIds,
    lastHintAt: state.lastHintAt
  };
}

const ROOM_HINTS: Partial<Record<RoomId, string>> = {
  gm: "The GM Computer is the safest place to ask: what matters next?",
  roster: "Roster health tells you if the club can actually play tonight.",
  coach: "Auto-fill lines first, then tune one tactic if you want a clearer identity.",
  arena: "Choose a sim mode here. Broadcast mode is slower but easier to read.",
  saves: "Manual saves are local-only and useful before phase jumps.",
  standings: "Standings and Trophy Hall help you understand the long arc of the save.",
  feedback: "Feedback exports stay local and help closed-beta testers explain confusion, bugs, balance, and good moments."
};

function addUnique(values: string[], value: string): string[] {
  return values.includes(value) ? values : [...values, value];
}

function isKnownStep(stepId: string): boolean {
  return TUTORIAL_STEP_DEFINITIONS.some((step) => step.id === stepId);
}
