import type { Player } from "../types";

export function activeInjuries(roster: Player[]): Player[] {
  return roster.filter((player) => player.injuryStatus !== "healthy");
}

export function fatigueRisks(roster: Player[]): Player[] {
  return roster
    .filter((player) => player.injuryStatus === "healthy" && player.fatigue >= 70)
    .sort((a, b) => b.fatigue - a.fatigue);
}
