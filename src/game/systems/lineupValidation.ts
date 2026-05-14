import type { DefensePair, ForwardLine, Lineup, Player, Team } from "../types";
import { clamp } from "../rng";
import { canAssignPlayerToLineup, getPlayerRosterStatus, getRosterStatusLabel } from "./rosterRules";

export interface LineupValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AutoLineupResult {
  lineup: Lineup;
  notes: string[];
}

export function validateLineup(team: Team, lineup: Lineup = team.lines): LineupValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const assigned = getAssignedPlayerIds(lineup).filter(Boolean) as string[];
  const rosterById = new Map(team.roster.map((player) => [player.id, player]));
  const duplicateIds = assigned.filter((id, index) => assigned.indexOf(id) !== index);

  new Set(duplicateIds).forEach((id) => {
    const player = rosterById.get(id);
    errors.push(`${player?.displayName ?? "A player"} is assigned more than once.`);
  });

  assigned.forEach((id) => {
    const player = rosterById.get(id);
    if (!player) {
      errors.push("An unavailable player is in the lineup.");
      return;
    }
    if (player.injuryStatus !== "healthy") {
      errors.push(`${player.displayName} is injured and unavailable.`);
    }
    const status = getPlayerRosterStatus(player);
    if (status === "affiliate" || status === "injuredReserve" || status === "retired" || status === "prospectRights") {
      errors.push(`${player.displayName} is ${getRosterStatusLabel(status)} and cannot be assigned to the NHL lineup.`);
    }
    if (status === "scratched") {
      warnings.push(`${player.displayName} is scratched; activating him before puck drop is recommended.`);
    }
  });

  lineup.forwardLines.forEach((line, index) => {
    if (!line.lw || !line.c || !line.rw) errors.push(`Forward Line ${index + 1} is incomplete.`);
    validateForwardSlot(line.lw, "LW", index, rosterById, warnings);
    validateForwardSlot(line.c, "C", index, rosterById, warnings);
    validateForwardSlot(line.rw, "RW", index, rosterById, warnings);
  });

  lineup.defensePairs.forEach((pair, index) => {
    if (!pair.ld || !pair.rd) errors.push(`Defense Pair ${index + 1} is incomplete.`);
    validateDefenseSlot(pair.ld, "LD", index, rosterById, warnings);
    validateDefenseSlot(pair.rd, "RD", index, rosterById, warnings);
  });

  if (!lineup.goalies.starter || !lineup.goalies.backup) {
    errors.push("Starting and backup goalies must be selected.");
  }

  const starter = lineup.goalies.starter ? rosterById.get(lineup.goalies.starter) : undefined;
  if (starter && starter.position !== "G") {
    errors.push(`${starter.displayName} is not a goalie.`);
  }
  if (starter && starter.overall < 68) {
    warnings.push("Warning: weak goalie selected as starter.");
  }
  if (starter && starter.fatigue > 78) {
    warnings.push("Warning: tired goalie selected as starter.");
  }

  team.roster.forEach((player) => {
    const lineIndex = findForwardLineIndex(lineup, player.id);
    const pairIndex = findDefensePairIndex(lineup, player.id);
    const assignedToLineup = assigned.includes(player.id);
    if ((player.roleExpectation === "Franchise Driver" || player.roleExpectation === "Top Line") && lineIndex >= 2) {
      warnings.push(`Warning: ${player.displayName} expects top-six minutes, not Line ${lineIndex + 1}.`);
    }
    if (player.roleExpectation === "Top Six" && lineIndex >= 3) {
      warnings.push(`Warning: ${player.displayName} expects a scoring role, not Line 4.`);
    }
    if (lineIndex >= 0 && lineIndex <= 1 && player.fatigue > 80) {
      warnings.push(`Warning: ${player.displayName} is exhausted in a top-six role.`);
    }
    if (player.roleExpectation === "Top Pair" && pairIndex >= 2) {
      warnings.push(`Warning: ${player.displayName} expects top-pair usage, not Pair ${pairIndex + 1}.`);
    }
    if (lineup.goalies.backup === player.id && player.roleExpectation === "Starter") {
      warnings.push(`Warning: starter-level goalie ${player.displayName} is set as backup.`);
    }
    if (!assignedToLineup && player.injuryStatus === "healthy" && player.morale <= 35) {
      warnings.push(`Warning: unhappy healthy player ${player.displayName} is scratched or unassigned.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function autoFillBestLineup(team: Team): AutoLineupResult {
  const available = team.roster
    .filter((player) => canAssignPlayerToLineup(player))
    .sort((a, b) => b.overall + b.form * 0.08 - b.fatigue * 0.05 - (a.overall + a.form * 0.08 - a.fatigue * 0.05));

  const forwards = available.filter((player) => ["LW", "C", "RW"].includes(player.position));
  const centers = takeBest(forwards, (player) => player.position === "C", 4);
  const leftWings = takeBest(forwards.filter((player) => !centers.includes(player)), (player) => player.position === "LW", 4);
  const rightWings = takeBest(
    forwards.filter((player) => !centers.includes(player) && !leftWings.includes(player)),
    (player) => player.position === "RW",
    4
  );
  const remainingForwards = forwards.filter(
    (player) => !centers.includes(player) && !leftWings.includes(player) && !rightWings.includes(player)
  );
  while (centers.length < 4 && remainingForwards.length) centers.push(remainingForwards.shift() as Player);
  while (leftWings.length < 4 && remainingForwards.length) leftWings.push(remainingForwards.shift() as Player);
  while (rightWings.length < 4 && remainingForwards.length) rightWings.push(remainingForwards.shift() as Player);

  const defense = available.filter((player) => player.position === "LD" || player.position === "RD");
  const leftDefense = takeBest(defense, (player) => player.position === "LD", 3);
  const rightDefense = takeBest(defense.filter((player) => !leftDefense.includes(player)), (player) => player.position === "RD", 3);
  const remainingDefense = defense.filter((player) => !leftDefense.includes(player) && !rightDefense.includes(player));
  while (leftDefense.length < 3 && remainingDefense.length) leftDefense.push(remainingDefense.shift() as Player);
  while (rightDefense.length < 3 && remainingDefense.length) rightDefense.push(remainingDefense.shift() as Player);

  const goalies = available.filter((player) => player.position === "G").sort((a, b) => b.overall - a.overall);

  const lineup: Lineup = {
    forwardLines: [0, 1, 2, 3].map((index) => ({
      lw: leftWings[index]?.id,
      c: centers[index]?.id,
      rw: rightWings[index]?.id
    })) as Lineup["forwardLines"],
    defensePairs: [0, 1, 2].map((index) => ({
      ld: leftDefense[index]?.id,
      rd: rightDefense[index]?.id
    })) as Lineup["defensePairs"],
    goalies: {
      starter: goalies[0]?.id,
      backup: goalies[1]?.id
    }
  };

  return {
    lineup,
    notes: ["Auto-filled the best healthy roster based on overall, form, fatigue, and position fit."]
  };
}

export function getAssignedPlayerIds(lineup: Lineup): Array<string | undefined> {
  return [
    ...lineup.forwardLines.flatMap((line) => [line.lw, line.c, line.rw]),
    ...lineup.defensePairs.flatMap((pair) => [pair.ld, pair.rd]),
    lineup.goalies.starter,
    lineup.goalies.backup
  ];
}

export function computeLineChemistry(team: Team, ids: Array<string | undefined>, positionFitBonus = 0): number {
  const players = ids
    .map((id) => team.roster.find((player) => player.id === id))
    .filter((player): player is Player => Boolean(player));
  if (!players.length) return 0;

  const averageOverall = players.reduce((sum, player) => sum + player.overall, 0) / players.length;
  const morale = players.reduce((sum, player) => sum + player.morale, 0) / players.length;
  const form = players.reduce((sum, player) => sum + player.form, 0) / players.length;
  const fatigue = players.reduce((sum, player) => sum + player.fatigue, 0) / players.length;
  const handednessBalance = new Set(players.map((player) => player.handedness)).size > 1 ? 4 : 0;
  const archetypes = new Set(players.map((player) => player.archetype));
  const archetypeFit = Math.min(8, archetypes.size * 2);

  return Math.round(
    clamp(averageOverall * 0.68 + morale * 0.08 + form * 0.08 - fatigue * 0.08 + handednessBalance + archetypeFit + positionFitBonus)
  );
}

function validateForwardSlot(
  id: string | undefined,
  expected: "LW" | "C" | "RW",
  lineIndex: number,
  rosterById: Map<string, Player>,
  warnings: string[]
) {
  if (!id) return;
  const player = rosterById.get(id);
  if (player && player.position !== expected) {
    warnings.push(`Line ${lineIndex + 1}: ${player.displayName} is playing ${expected} instead of ${player.position}.`);
  }
}

function validateDefenseSlot(
  id: string | undefined,
  expected: "LD" | "RD",
  pairIndex: number,
  rosterById: Map<string, Player>,
  warnings: string[]
) {
  if (!id) return;
  const player = rosterById.get(id);
  if (player && player.position !== expected) {
    warnings.push(`Pair ${pairIndex + 1}: ${player.displayName} is playing ${expected} instead of ${player.position}.`);
  }
}

function findForwardLineIndex(lineup: Lineup, playerId: string): number {
  return lineup.forwardLines.findIndex((line: ForwardLine) => line.lw === playerId || line.c === playerId || line.rw === playerId);
}

function findDefensePairIndex(lineup: Lineup, playerId: string): number {
  return lineup.defensePairs.findIndex((pair: DefensePair) => pair.ld === playerId || pair.rd === playerId);
}

function takeBest(players: Player[], predicate: (player: Player) => boolean, count: number): Player[] {
  const matched = players.filter(predicate).slice(0, count);
  if (matched.length >= count) return matched;
  return [...matched, ...players.filter((player) => !matched.includes(player)).slice(0, count - matched.length)];
}
