import type {
  GoalieAttributes,
  Player,
  PlayerArchetype,
  PlayerStats,
  Position,
  RoleExpectation,
  SkaterAttributes
} from "../types";
import { SeededRng, clamp } from "../rng";
import { generateDisplayName, generateNationality } from "./generateNames";
import { contractSummary, createContractForPlayer } from "../systems/contracts";

const FORWARD_ARCHETYPES: PlayerArchetype[] = [
  "Sniper",
  "Playmaker",
  "Two-Way Forward",
  "Power Forward",
  "Grinder",
  "Enforcer-lite"
];

const DEFENSE_ARCHETYPES: PlayerArchetype[] = [
  "Offensive Defenseman",
  "Defensive Defenseman",
  "Puck-Moving Defenseman",
  "Enforcer-lite"
];

const GOALIE_ARCHETYPES: PlayerArchetype[] = ["Reflex Goalie", "Positional Goalie", "Hybrid Goalie"];

const PERSONALITIES = [
  "Leader",
  "Professional",
  "Quiet Worker",
  "Competitive",
  "Streaky Confidence Player",
  "Locker-Room Glue",
  "High-Maintenance Star",
  "Rookie Sponge",
  "Veteran Mentor"
] as const;

export function emptyStats(): PlayerStats {
  return {
    gamesPlayed: 0,
    goals: 0,
    assists: 0,
    points: 0,
    plusMinus: 0,
    penaltyMinutes: 0,
    shots: 0,
    hits: 0,
    blocks: 0,
    goalieWins: 0,
    goalieLosses: 0,
    saves: 0,
    goalsAgainst: 0,
    shutouts: 0
  };
}

export function generateRoster(teamId: string, teamIndex: number, rng: SeededRng): Player[] {
  const positions: Position[] = [
    "LW",
    "LW",
    "LW",
    "LW",
    "C",
    "C",
    "C",
    "C",
    "RW",
    "RW",
    "RW",
    "RW",
    "LW",
    "RW",
    "LD",
    "LD",
    "LD",
    "LD",
    "RD",
    "RD",
    "RD",
    "RD",
    "G",
    "G"
  ];

  return positions.map((position, index) => createPlayer(teamId, teamIndex, index, position, rng));
}

function createPlayer(teamId: string, teamIndex: number, index: number, position: Position, rng: SeededRng): Player {
  const { firstName, lastName, displayName } = generateDisplayName(rng);
  const age = generateAge(rng);
  const overall = generateOverall(position, index, teamIndex, rng);
  const potential = generatePotential(age, overall, rng);
  const archetype = pickArchetype(position, rng);
  const roleExpectation = inferRole(position, overall, index);
  const id = `${teamId}-p${index + 1}`;
  const contract = createContractForPlayer({ age, overall, potential, position, roleExpectation }, rng);

  return {
    id,
    teamId,
    firstName,
    lastName,
    displayName,
    age,
    position,
    handedness: rng.chance(0.62) ? "L" : "R",
    nationality: generateNationality(rng),
    archetype,
    personality: rng.pick(PERSONALITIES),
    overall,
    potential,
    roleExpectation,
    morale: clamp(rng.int(54, 78) + (overall >= 85 ? 5 : 0)),
    form: rng.int(46, 75),
    fatigue: rng.int(12, 38),
    injuryStatus: "healthy",
    injuryGamesRemaining: 0,
    attributes: position === "G" ? generateGoalieAttributes(overall, rng) : generateSkaterAttributes(overall, rng),
    stats: emptyStats(),
    contract,
    contractSummary: contractSummary(contract)
  };
}

function generateAge(rng: SeededRng): number {
  const roll = rng.next();
  if (roll < 0.25) return rng.int(18, 23);
  if (roll < 0.78) return rng.int(24, 30);
  return rng.int(31, 38);
}

function generateOverall(position: Position, index: number, teamIndex: number, rng: SeededRng): number {
  const slot = position === "G" ? index - 22 : index;
  const teamTalent = teamIndex % 4 === 0 ? 2 : teamIndex % 5 === 0 ? -1 : 0;
  let base = 66 + teamTalent + rng.int(-5, 6);
  if (slot <= 2) base = 80 + teamTalent + rng.int(-2, 6);
  if (slot >= 3 && slot <= 8) base = 72 + teamTalent + rng.int(-3, 7);
  if (position === "LD" || position === "RD") base += index % 4 === 0 ? 5 : 0;
  if (position === "G") base = slot === 0 ? 77 + teamTalent + rng.int(-3, 8) : 63 + rng.int(-3, 8);
  if (teamIndex === 0 && index === 0) base = 91;
  if (teamIndex === 5 && index === 4) base = 90;
  if (teamIndex === 9 && index === 22) base = 90;
  return clamp(base, 50, 93);
}

function generatePotential(age: number, overall: number, rng: SeededRng): number {
  if (age <= 22) return clamp(overall + rng.int(3, 12), overall, 96);
  if (age <= 27) return clamp(overall + rng.int(0, 7), overall, 94);
  if (age <= 32) return clamp(overall + rng.int(-2, 3), 50, 92);
  return clamp(overall - rng.int(1, 7), 50, overall);
}

function pickArchetype(position: Position, rng: SeededRng): PlayerArchetype {
  if (position === "G") return rng.pick(GOALIE_ARCHETYPES);
  if (position === "LD" || position === "RD") return rng.pick(DEFENSE_ARCHETYPES);
  return rng.pick(FORWARD_ARCHETYPES);
}

function inferRole(position: Position, overall: number, index: number): RoleExpectation {
  if (position === "G") return overall >= 76 ? "Starter" : "Backup";
  if (position === "LD" || position === "RD") {
    if (overall >= 83) return "Top Pair";
    if (overall >= 74) return "Second Pair";
    if (overall >= 65) return "Third Pair";
    return "Depth";
  }
  if (overall >= 88) return "Franchise Driver";
  if (overall >= 82) return "Top Line";
  if (overall >= 75) return "Top Six";
  if (overall >= 66 || index < 12) return "Middle Six";
  return "Depth";
}

function generateSkaterAttributes(overall: number, rng: SeededRng): SkaterAttributes {
  const attr = () => clamp(overall + rng.int(-9, 10), 40, 99);
  return {
    skating: attr(),
    shooting: attr(),
    passing: attr(),
    puckHandling: attr(),
    defense: attr(),
    physicality: attr(),
    hockeyIQ: attr(),
    discipline: attr(),
    consistency: attr(),
    leadership: attr(),
    stamina: attr()
  };
}

function generateGoalieAttributes(overall: number, rng: SeededRng): GoalieAttributes {
  const attr = () => clamp(overall + rng.int(-8, 9), 40, 99);
  return {
    reflexes: attr(),
    positioning: attr(),
    reboundControl: attr(),
    puckTracking: attr(),
    athleticism: attr(),
    mentalToughness: attr(),
    consistency: attr(),
    stamina: attr()
  };
}
