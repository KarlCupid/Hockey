export const TUNING = {
  simulation: {
    // Arcade-management target: each team should usually land between 22 and 38 shots.
    targetShotsPerTeam: { min: 22, max: 38 },
    // Scores should feel lively without turning every night into a track meet.
    targetGoalsPerTeam: { min: 2.4, max: 4.0 },
    targetPowerPlayConversion: { min: 0.12, max: 0.3 },
    targetOvertimeRate: { min: 0.08, max: 0.28 }
  },
  economy: {
    minSalary: 775_000,
    starOverallThreshold: 84,
    depthOverallThreshold: 70,
    plausibleStarSalary: { min: 4_000_000, max: 14_000_000 },
    plausibleDepthSalary: { min: 775_000, max: 2_750_000 },
    rosterLimit: 30
  },
  dynasty: {
    requiredTeams: 12,
    playtestSeasons: 3,
    inboxLimit: 60,
    groupedLowPriorityLimit: 5
  },
  draft: {
    prospectsPerClass: 72,
    rounds: 4,
    firstRoundPickValueFloor: 42
  },
  development: {
    youngPlayerAgeCutoff: 23,
    veteranDeclineAge: 34,
    aggressiveFatigueWarningThreshold: 70
  }
} as const;

export function isPlausibleSalaryRange(starSalary: number, depthSalary: number): boolean {
  return (
    starSalary >= TUNING.economy.plausibleStarSalary.min &&
    starSalary <= TUNING.economy.plausibleStarSalary.max &&
    depthSalary >= TUNING.economy.plausibleDepthSalary.min &&
    depthSalary <= TUNING.economy.plausibleDepthSalary.max
  );
}

export function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value) && !Number.isNaN(value);
}
