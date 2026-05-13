import type { FatigueBand, FormBand, MoraleBand, Player } from "../types";

export function moraleBand(value: number): MoraleBand {
  if (value <= 30) return "unhappy";
  if (value <= 50) return "concerned";
  if (value <= 70) return "stable";
  if (value <= 85) return "positive";
  return "thriving";
}

export function formBand(value: number): FormBand {
  if (value <= 30) return "cold";
  if (value <= 50) return "struggling";
  if (value <= 70) return "steady";
  if (value <= 85) return "hot";
  return "excellent";
}

export function fatigueBand(value: number): FatigueBand {
  if (value <= 30) return "fresh";
  if (value <= 60) return "normal";
  if (value <= 80) return "tired";
  return "exhausted";
}

export function playerStatusNote(player: Player): string {
  if (player.injuryStatus !== "healthy") return `${player.injuryStatus} for about ${player.injuryGamesRemaining} game(s).`;
  if (player.morale >= 84) return "Thriving after recent trust from the staff.";
  if (player.morale <= 40) return "Concerned about role, results, or room momentum.";
  if (player.fatigue >= 82) return "Fatigue climbing after heavy usage.";
  if (player.form <= 35) return "Cold streak: looking for a spark.";
  if (player.form >= 82) return "Hot hand: staff should keep feeding confidence.";
  return "Steady contributor with no major noise around the room.";
}
