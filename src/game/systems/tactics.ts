import type { Tactics } from "../types";

export type TacticKey = keyof Tactics;

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
