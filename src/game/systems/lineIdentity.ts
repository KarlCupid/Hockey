import type { DefensePair, ForwardLine, Player, Position, Team } from "../types";
import { computeLineChemistry } from "./lineupValidation";

export type ForwardLineIdentity =
  | "Scoring Line"
  | "Balanced Line"
  | "Checking Line"
  | "Energy Line"
  | "Risky Skill Line"
  | "Heavy Forecheck Line";

export type DefensePairIdentity = "Shutdown Pair" | "Puck-Moving Pair" | "Balanced Pair" | "High-Risk Pair";

export interface LineIdentityReport {
  label: ForwardLineIdentity | DefensePairIdentity;
  chemistry: number;
  notes: string[];
}

export function classifyForwardLine(players: Player[], lineIndex = 0): ForwardLineIdentity {
  const skaters = players.filter((player) => player.position !== "G");
  if (skaters.length < 3) return "Balanced Line";
  const offense = average(skaters, offensiveScore);
  const defense = average(skaters, defensiveScore);
  const physicality = average(skaters, physicalScore);
  const fatigue = average(skaters, (player) => player.fatigue);
  const skillTypes = skaters.filter((player) => ["Sniper", "Playmaker", "Offensive Defenseman"].includes(player.archetype)).length;
  const checkingTypes = skaters.filter((player) => ["Grinder", "Two-Way Forward", "Power Forward", "Enforcer-lite"].includes(player.archetype)).length;

  if (offense >= 79 && (defense < 67 || fatigue >= 74 || skillTypes >= 2)) return "Risky Skill Line";
  if (offense >= 77) return "Scoring Line";
  if (physicality >= 76 && checkingTypes >= 2) return "Heavy Forecheck Line";
  if (defense >= offense + 5 || checkingTypes >= 2) return "Checking Line";
  if (lineIndex >= 3 && physicality >= 66) return "Energy Line";
  return "Balanced Line";
}

export function classifyDefensePair(players: Player[]): DefensePairIdentity {
  const defensemen = players.filter((player) => player.position === "LD" || player.position === "RD");
  if (defensemen.length < 2) return "Balanced Pair";
  const defense = average(defensemen, defensiveScore);
  const offense = average(defensemen, offensiveScore);
  const fatigue = average(defensemen, (player) => player.fatigue);
  const puckMovers = defensemen.filter((player) => player.archetype === "Puck-Moving Defenseman" || player.archetype === "Offensive Defenseman").length;

  if (offense >= 78 && (defense < 70 || fatigue >= 78)) return "High-Risk Pair";
  if (defense >= 77 && offense < defense + 3) return "Shutdown Pair";
  if (puckMovers >= 1 && offense >= 72) return "Puck-Moving Pair";
  return "Balanced Pair";
}

export function createForwardLineReport(team: Team, line: ForwardLine, lineIndex: number): LineIdentityReport {
  const ids = [line.lw, line.c, line.rw];
  const players = resolvePlayers(team, ids);
  return {
    label: classifyForwardLine(players, lineIndex),
    chemistry: computeLineChemistry(team, ids, 4),
    notes: createFitNotes(players, ["LW", "C", "RW"])
  };
}

export function createDefensePairReport(team: Team, pair: DefensePair): LineIdentityReport {
  const ids = [pair.ld, pair.rd];
  const players = resolvePlayers(team, ids);
  return {
    label: classifyDefensePair(players),
    chemistry: computeLineChemistry(team, ids, 3),
    notes: createFitNotes(players, ["LD", "RD"])
  };
}

function createFitNotes(players: Player[], expectedPositions: Position[]): string[] {
  if (!players.length) return ["No players assigned yet."];
  const notes: string[] = [];
  const archetypeCount = new Set(players.map((player) => player.archetype)).size;
  notes.push(
    archetypeCount >= players.length
      ? "Archetype fit gives the unit multiple ways to solve a shift."
      : "Similar archetypes make the unit clear, but less flexible."
  );
  notes.push(
    new Set(players.map((player) => player.handedness)).size > 1
      ? "Handedness balance should help puck movement under pressure."
      : "Handedness leans one way; exits may be less natural."
  );
  if (average(players, (player) => player.fatigue) >= 72) notes.push("Fatigue concern: workload could flatten late shifts.");
  if (average(players, (player) => player.morale) <= 46) notes.push("Morale concern: confidence is fragile on this unit.");
  players.forEach((player, index) => {
    const expected = expectedPositions[index];
    const wingSwap = ["LW", "RW"].includes(expected) && ["LW", "RW"].includes(player.position);
    if (player.position !== expected && !wingSwap) {
      notes.push(`Position mismatch: ${player.displayName} is a ${player.position} in a ${expected} slot.`);
    }
  });
  return notes;
}

function resolvePlayers(team: Team, ids: Array<string | undefined>): Player[] {
  return ids
    .map((id) => team.roster.find((player) => player.id === id))
    .filter((player): player is Player => Boolean(player));
}

function offensiveScore(player: Player): number {
  if (player.position === "G") return player.overall;
  if ("shooting" in player.attributes) {
    return (player.attributes.shooting + player.attributes.passing + player.attributes.puckHandling + player.overall) / 4;
  }
  return player.overall;
}

function defensiveScore(player: Player): number {
  if (player.position === "G") return player.overall;
  if ("defense" in player.attributes) return (player.attributes.defense + player.attributes.hockeyIQ + player.overall) / 3;
  return player.overall;
}

function physicalScore(player: Player): number {
  if (player.position === "G") return player.overall;
  if ("physicality" in player.attributes) return (player.attributes.physicality + player.attributes.stamina) / 2;
  return player.overall;
}

function average(players: Player[], selector: (player: Player) => number): number {
  return players.length ? players.reduce((sum, player) => sum + selector(player), 0) / players.length : 0;
}
