import type { Player } from "../types";
import { clamp } from "../rng";

export function recoverRoster(roster: Player[], amount = 7): Player[] {
  return roster.map((player) => ({
    ...player,
    fatigue: clamp(player.fatigue - amount, 0, 100)
  }));
}

export function tickInjuries(roster: Player[]): Player[] {
  return roster.map((player) => {
    if (player.injuryStatus === "healthy") return player;
    const remaining = Math.max(0, player.injuryGamesRemaining - 1);
    return {
      ...player,
      injuryGamesRemaining: remaining,
      injuryStatus: remaining === 0 ? "healthy" : remaining <= 2 ? "day-to-day" : "out"
    };
  });
}
