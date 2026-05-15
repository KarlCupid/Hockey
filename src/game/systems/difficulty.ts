import type { DifficultyTuning, FranchiseState, GameDifficulty, GameMode, StoryFrequency } from "../types";

const DIFFICULTY_LABELS: Record<GameDifficulty, string> = {
  relaxed: "Relaxed",
  standard: "Standard",
  demanding: "Demanding",
  hardcore: "Hardcore"
};

const GAME_MODE_LABELS: Record<GameMode, string> = {
  sandbox: "Sandbox",
  standardDynasty: "Standard Dynasty",
  pressureCooker: "Pressure Cooker",
  rebuildChallenge: "Rebuild Challenge",
  contenderChallenge: "Contender Challenge"
};

const DIFFICULTY_DESCRIPTIONS: Record<GameDifficulty, string> = {
  relaxed: "Lower pressure and more guidance while keeping cap, roster, and owner goals meaningful.",
  standard: "The balanced Franchise Ice baseline for a long fictional dynasty.",
  demanding: "Sharper owner/media reactions, tighter negotiations, and slightly more variance.",
  hardcore: "High-pressure management with stricter deals and louder consequences, still bounded for stability."
};

const GAME_MODE_DESCRIPTIONS: Record<GameMode, string> = {
  sandbox: "A forgiving dynasty with soft owner pressure and generous room to experiment.",
  standardDynasty: "A balanced long-term franchise where roster, cap, development, and results all matter.",
  pressureCooker: "A loud-market save with faster pressure swings and more high-signal story events.",
  rebuildChallenge: "A youth-first save where the owner tolerates pain if the pipeline clearly improves.",
  contenderChallenge: "A win-now save with playoff expectations, cap pressure, and impatient fans."
};

const STORY_FREQUENCY_DESCRIPTIONS: Record<StoryFrequency, string> = {
  quiet: "Fewer interruptions and a quieter room, best for sim-heavy saves.",
  normal: "A steady living-ops cadence with regular pressure points and decision moments.",
  dramatic: "More frequent story beats, louder media, and more chances for relationships to swing."
};

const BASE_TUNING: Record<GameDifficulty, Omit<DifficultyTuning, "difficulty">> = {
  relaxed: {
    ownerPatienceMultiplier: 0.78,
    mediaPressureMultiplier: 0.76,
    fanPatienceMultiplier: 0.82,
    tradeAiStrictness: 0.92,
    contractDemandMultiplier: 0.96,
    freeAgentInterestPenalty: -3,
    injuryFrequencyMultiplier: 0.9,
    developmentVarianceMultiplier: 0.88,
    storyEventMultiplier: 0.76,
    capPressureMultiplier: 0.9,
    jobSecurityVolatility: 0.76,
    assistantGmHelpLevel: "detailed"
  },
  standard: {
    ownerPatienceMultiplier: 1,
    mediaPressureMultiplier: 1,
    fanPatienceMultiplier: 1,
    tradeAiStrictness: 1,
    contractDemandMultiplier: 1,
    freeAgentInterestPenalty: 0,
    injuryFrequencyMultiplier: 1,
    developmentVarianceMultiplier: 1,
    storyEventMultiplier: 1,
    capPressureMultiplier: 1,
    jobSecurityVolatility: 1,
    assistantGmHelpLevel: "normal"
  },
  demanding: {
    ownerPatienceMultiplier: 1.14,
    mediaPressureMultiplier: 1.16,
    fanPatienceMultiplier: 1.12,
    tradeAiStrictness: 1.08,
    contractDemandMultiplier: 1.04,
    freeAgentInterestPenalty: 4,
    injuryFrequencyMultiplier: 1.06,
    developmentVarianceMultiplier: 1.1,
    storyEventMultiplier: 1.16,
    capPressureMultiplier: 1.08,
    jobSecurityVolatility: 1.16,
    assistantGmHelpLevel: "normal"
  },
  hardcore: {
    ownerPatienceMultiplier: 1.3,
    mediaPressureMultiplier: 1.34,
    fanPatienceMultiplier: 1.28,
    tradeAiStrictness: 1.18,
    contractDemandMultiplier: 1.08,
    freeAgentInterestPenalty: 7,
    injuryFrequencyMultiplier: 1.12,
    developmentVarianceMultiplier: 1.2,
    storyEventMultiplier: 1.36,
    capPressureMultiplier: 1.18,
    jobSecurityVolatility: 1.32,
    assistantGmHelpLevel: "minimal"
  }
};

const STORY_EVENT_MULTIPLIERS: Record<StoryFrequency, number> = {
  quiet: 0.58,
  normal: 1,
  dramatic: 1.55
};

function multiplyTuning(tuning: DifficultyTuning, patches: Partial<Record<keyof DifficultyTuning, number>>) {
  for (const [key, multiplier] of Object.entries(patches) as Array<[keyof DifficultyTuning, number]>) {
    const current = tuning[key];
    if (typeof current === "number") {
      (tuning as unknown as Record<string, number>)[key] = Number((current * multiplier).toFixed(3));
    }
  }
}

function addToTuning(tuning: DifficultyTuning, patches: Partial<Record<keyof DifficultyTuning, number>>) {
  for (const [key, amount] of Object.entries(patches) as Array<[keyof DifficultyTuning, number]>) {
    const current = tuning[key];
    if (typeof current === "number") {
      (tuning as unknown as Record<string, number>)[key] = Number((current + amount).toFixed(3));
    }
  }
}

export function createDifficultyTuning(
  difficulty: GameDifficulty = "standard",
  gameMode: GameMode = "standardDynasty",
  storyFrequency: StoryFrequency = "normal"
): DifficultyTuning {
  const base = BASE_TUNING[difficulty] ?? BASE_TUNING.standard;
  const tuning: DifficultyTuning = { difficulty, ...base };
  tuning.storyEventMultiplier = Number((tuning.storyEventMultiplier * STORY_EVENT_MULTIPLIERS[storyFrequency]).toFixed(3));

  if (gameMode === "sandbox") {
    multiplyTuning(tuning, {
      ownerPatienceMultiplier: 0.64,
      mediaPressureMultiplier: 0.66,
      fanPatienceMultiplier: 0.7,
      tradeAiStrictness: 0.94,
      contractDemandMultiplier: 0.95,
      storyEventMultiplier: 0.72,
      capPressureMultiplier: 0.82,
      jobSecurityVolatility: 0.52
    });
    addToTuning(tuning, { freeAgentInterestPenalty: -2 });
    tuning.assistantGmHelpLevel = "detailed";
  }

  if (gameMode === "pressureCooker") {
    multiplyTuning(tuning, {
      ownerPatienceMultiplier: 1.18,
      mediaPressureMultiplier: 1.22,
      fanPatienceMultiplier: 1.12,
      storyEventMultiplier: 1.22,
      jobSecurityVolatility: 1.18
    });
  }

  if (gameMode === "rebuildChallenge") {
    multiplyTuning(tuning, {
      ownerPatienceMultiplier: 0.9,
      mediaPressureMultiplier: 0.94,
      fanPatienceMultiplier: 0.82,
      storyEventMultiplier: 1.08,
      developmentVarianceMultiplier: 1.08
    });
    addToTuning(tuning, { freeAgentInterestPenalty: 2 });
  }

  if (gameMode === "contenderChallenge") {
    multiplyTuning(tuning, {
      ownerPatienceMultiplier: 1.14,
      mediaPressureMultiplier: 1.12,
      fanPatienceMultiplier: 1.18,
      capPressureMultiplier: 1.2,
      storyEventMultiplier: 1.08,
      jobSecurityVolatility: 1.14
    });
  }

  return tuning;
}

export function applyDifficultyToFranchise(franchise: FranchiseState): FranchiseState {
  const profile = franchise.gmProfile;
  return {
    ...franchise,
    difficultyTuning: createDifficultyTuning(profile.difficulty, profile.gameMode, profile.storyFrequency)
  };
}

export function getDifficultyLabel(difficulty: GameDifficulty): string {
  return DIFFICULTY_LABELS[difficulty] ?? DIFFICULTY_LABELS.standard;
}

export function getGameModeLabel(gameMode: GameMode): string {
  return GAME_MODE_LABELS[gameMode] ?? GAME_MODE_LABELS.standardDynasty;
}

export function getDifficultyDescription(difficulty: GameDifficulty): string {
  return DIFFICULTY_DESCRIPTIONS[difficulty] ?? DIFFICULTY_DESCRIPTIONS.standard;
}

export function getGameModeDescription(gameMode: GameMode): string {
  return GAME_MODE_DESCRIPTIONS[gameMode] ?? GAME_MODE_DESCRIPTIONS.standardDynasty;
}

export function getStoryFrequencyDescription(storyFrequency: StoryFrequency): string {
  return STORY_FREQUENCY_DESCRIPTIONS[storyFrequency] ?? STORY_FREQUENCY_DESCRIPTIONS.normal;
}
