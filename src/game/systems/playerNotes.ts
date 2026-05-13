import type { Player } from "../types";
import { fatigueBand, formBand, moraleBand } from "./morale";

export const getMoraleBand = moraleBand;
export const getFormBand = formBand;
export const getFatigueBand = fatigueBand;

export function createPlayerCoachRead(player: Player): string {
  if (player.injuryStatus !== "healthy") {
    return `${player.displayName} is unavailable for roughly ${player.injuryGamesRemaining} game(s); keep the replacement plan simple.`;
  }
  if (player.fatigue >= 82) {
    return "Fatigue is climbing; consider reducing usage before the next game.";
  }
  if (player.form >= 82 && player.morale >= 68) {
    return "Thriving in his current role after recent production.";
  }
  if (player.form <= 34) {
    return "Cold form is becoming a lineup decision.";
  }
  if (player.position === "G" && player.stats.gamesPlayed > 0) {
    const savePct = player.stats.saves / Math.max(1, player.stats.saves + player.stats.goalsAgainst);
    if (savePct >= 0.92) return "Goalie reads are clean right now; the bench trusts the next save.";
    if (savePct < 0.88) return "Goalie confidence needs shelter; reduce clean looks against.";
  }
  if (player.age >= 32 || player.personality === "Veteran Mentor") {
    return "Veteran presence helps stabilize the room.";
  }
  if (player.age <= 22 || player.personality === "Rookie Sponge") {
    return "Young player is absorbing detail quickly; controlled responsibility could pay off.";
  }
  if (player.archetype.includes("Two-Way") || player.archetype.includes("Defensive")) {
    return "Reliable without the puck and useful when the staff needs a calmer shift.";
  }
  return "Steady contributor with no major noise around the room.";
}

export function createPlayerManagementRisk(player: Player): string {
  if (player.injuryStatus !== "healthy") {
    return "Availability risk is the immediate management concern.";
  }
  if (player.personality === "High-Maintenance Star" && player.morale < 64) {
    return "High-maintenance personality may amplify losing streak frustration.";
  }
  if (expectsPremiumRole(player) && player.morale < 52) {
    return "Role expectation suggests he may react poorly to reduced minutes.";
  }
  if (player.fatigue >= 78) {
    return "Workload risk is building; fatigue could turn into performance dip or injury trouble.";
  }
  if (player.form <= 32 && expectsPremiumRole(player)) {
    return "Cold production from a featured role will become a media question.";
  }
  if (player.contractSummary.startsWith("1 yr")) {
    return "Short contract runway gives every role conversation a little extra weight.";
  }
  if (player.potential - player.overall >= 8) {
    return "Development upside is real; avoid burying him without a plan.";
  }
  if (player.personality === "Locker-Room Glue" || player.personality === "Leader") {
    return "Low drama profile; his influence helps keep the room pointed forward.";
  }
  return "No urgent management risk beyond normal role and performance maintenance.";
}

function expectsPremiumRole(player: Player): boolean {
  return [
    "Franchise Driver",
    "Top Line",
    "Top Six",
    "Top Pair",
    "Second Pair",
    "Starter"
  ].includes(player.roleExpectation);
}
