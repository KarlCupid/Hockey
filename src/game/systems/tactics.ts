import type { Tactics } from "../types";

export type TacticKey = keyof Tactics;
export type TacticPresetKey = "balanced" | "aggressiveForecheck" | "defensiveShell" | "highTempoAttack" | "physicalPressure" | "lowFatigue";

export const TACTIC_LABELS: Record<TacticKey, string> = {
  forecheckIntensity: "Forecheck Intensity",
  defensiveStructure: "Defensive Structure",
  offensiveRisk: "Offensive Risk",
  physicality: "Physicality",
  pace: "Pace",
  shotVolume: "Shot Volume",
  specialTeamsAggression: "Special Teams Aggression"
};

export function describeTactic(key: TacticKey, value: number): string {
  const band = value < 34 ? "low" : value > 66 ? "high" : "mid";
  const descriptions: Record<TacticKey, Record<typeof band, string>> = {
    forecheckIntensity: {
      low: "Conservative neutral-zone pressure.",
      mid: "Balanced pursuit with a controlled F3.",
      high: "Aggressive puck pursuit, higher fatigue risk."
    },
    defensiveStructure: {
      low: "Loose coverage that invites counterpunch chances.",
      mid: "Reliable layers through the middle.",
      high: "Compact defensive shell with fewer rush chances."
    },
    offensiveRisk: {
      low: "Safe possession and fewer odd-man risks.",
      mid: "Selective activation from skill players.",
      high: "More scoring chances, more counterattack danger."
    },
    physicality: {
      low: "Stick-positioning over contact.",
      mid: "Finishes checks without chasing hits.",
      high: "More hits, more penalties, higher injury/fatigue risk."
    },
    pace: {
      low: "Slower changes and patient puck support.",
      mid: "North-south rhythm with manageable workloads.",
      high: "Fast shifts, transition pressure, and heavier fatigue."
    },
    shotVolume: {
      low: "Waits for layered looks below the dots.",
      mid: "Mixes cycles with point shots.",
      high: "Throws pucks through traffic early and often."
    },
    specialTeamsAggression: {
      low: "Safer power play entries and passive penalty kill.",
      mid: "Balanced special teams reads.",
      high: "Aggressive seams and pressure points on special teams."
    }
  };
  return descriptions[key][band];
}

export function tacticSummary(tactics: Tactics): string[] {
  return (Object.keys(tactics) as TacticKey[]).map((key) => `${TACTIC_LABELS[key]}: ${describeTactic(key, tactics[key])}`);
}

export const TACTIC_PRESETS: Record<TacticPresetKey, { label: string; tactics: Tactics }> = {
  balanced: {
    label: "Balanced",
    tactics: {
      forecheckIntensity: 55,
      defensiveStructure: 55,
      offensiveRisk: 50,
      physicality: 48,
      pace: 55,
      shotVolume: 52,
      specialTeamsAggression: 50
    }
  },
  aggressiveForecheck: {
    label: "Aggressive Forecheck",
    tactics: {
      forecheckIntensity: 82,
      defensiveStructure: 48,
      offensiveRisk: 62,
      physicality: 66,
      pace: 72,
      shotVolume: 64,
      specialTeamsAggression: 58
    }
  },
  defensiveShell: {
    label: "Defensive Shell",
    tactics: {
      forecheckIntensity: 34,
      defensiveStructure: 82,
      offensiveRisk: 28,
      physicality: 42,
      pace: 36,
      shotVolume: 38,
      specialTeamsAggression: 42
    }
  },
  highTempoAttack: {
    label: "High Tempo Attack",
    tactics: {
      forecheckIntensity: 68,
      defensiveStructure: 46,
      offensiveRisk: 80,
      physicality: 48,
      pace: 84,
      shotVolume: 78,
      specialTeamsAggression: 68
    }
  },
  physicalPressure: {
    label: "Physical Pressure",
    tactics: {
      forecheckIntensity: 72,
      defensiveStructure: 56,
      offensiveRisk: 52,
      physicality: 84,
      pace: 58,
      shotVolume: 56,
      specialTeamsAggression: 54
    }
  },
  lowFatigue: {
    label: "Low Fatigue Conservative",
    tactics: {
      forecheckIntensity: 32,
      defensiveStructure: 72,
      offensiveRisk: 34,
      physicality: 30,
      pace: 30,
      shotVolume: 42,
      specialTeamsAggression: 38
    }
  }
};

export function tacticPresetValues(key: TacticPresetKey): Tactics {
  return { ...TACTIC_PRESETS[key].tactics };
}

export function createTacticSummaryCard(tactics: Tactics): { identity: string; upside: string; risk: string; bestSuitedFor: string } {
  if (tactics.defensiveStructure >= 74 && tactics.offensiveRisk <= 40) {
    return {
      identity: "Defensive Shell",
      upside: "Limits rush chances and protects tired legs.",
      risk: "Can invite long shifts if exits are too passive.",
      bestSuitedFor: "Protecting leads, sheltering goalies, and stabilizing rough nights."
    };
  }
  if (tactics.pace >= 72 && tactics.offensiveRisk >= 68) {
    return {
      identity: "High Tempo Attack",
      upside: "Creates shot volume and forces hurried decisions.",
      risk: "Counterattacks and fatigue can pile up fast.",
      bestSuitedFor: "Skilled, confident groups chasing a goal or tilting momentum."
    };
  }
  if (tactics.forecheckIntensity >= 74) {
    return {
      identity: "Aggressive Forecheck",
      upside: "Turns retrieval pressure into offensive-zone time.",
      risk: "Missed reads can expose the middle of the ice.",
      bestSuitedFor: "Fast lines with enough stamina to keep changing on time."
    };
  }
  if (tactics.physicality >= 74) {
    return {
      identity: "Physical Pressure",
      upside: "Wears down opponents and changes the emotional temperature.",
      risk: "Penalty trouble and injury risk rise with every extra hit.",
      bestSuitedFor: "Heavy rooms that can stay disciplined after contact."
    };
  }
  if (tactics.pace <= 38 && tactics.physicality <= 38) {
    return {
      identity: "Low Fatigue Conservative",
      upside: "Protects workload and keeps the bench organized.",
      risk: "May not generate enough offense if trailing.",
      bestSuitedFor: "Back-to-back legs, injury-heavy lineups, or closing out quiet games."
    };
  }
  return {
    identity: "Balanced",
    upside: "Keeps the team adaptable across game states.",
    risk: "May lack a hard edge if the opponent controls the matchup.",
    bestSuitedFor: "Opening periods, new line combinations, and uncertain opponents."
  };
}
