import { SeededRng, clamp } from "../rng";
import type { Handedness, Personality, PlayerArchetype, Position, Prospect, ProspectRisk } from "../types";
import { generateDisplayName, generateNationality } from "./generateNames";

const PROSPECT_LEAGUES = ["Northern Junior", "Metro U20", "Prairie Prep", "College Circuit", "Alpine Pro", "Baltic Junior"];
const STRENGTHS = [
  "quick release",
  "calm puck touches",
  "north-south speed",
  "net-front courage",
  "gap control",
  "first-pass confidence",
  "late-game poise",
  "transition reads",
  "crease tracking",
  "special teams detail"
];
const WEAKNESSES = [
  "strength against older players",
  "rush decisions under pressure",
  "defensive scanning",
  "penalty discipline",
  "rebound control",
  "pace consistency",
  "board battles",
  "shot selection",
  "conditioning",
  "risk management"
];
const PERSONALITIES: Personality[] = [
  "Leader",
  "Professional",
  "Quiet Worker",
  "Competitive",
  "Streaky Confidence Player",
  "Locker-Room Glue",
  "Rookie Sponge",
  "Veteran Mentor"
];

export function generateDraftClass(seed = "phase-two-draft-class", count = 72): Prospect[] {
  const rng = new SeededRng(seed);
  const cleanedSeed = cleanId(seed);
  const idPrefix = `${cleanedSeed.slice(0, 24) || "draft"}-${hashSeed(seed)}`;
  const prospects = Array.from({ length: count }, (_, index) => createProspect(index, rng, idPrefix));
  return prospects.sort((a, b) => a.publicRank - b.publicRank);
}

function createProspect(index: number, rng: SeededRng, idPrefix: string): Prospect {
  const rank = index + 1;
  const position = pickPosition(index, rng);
  const { firstName, lastName, displayName } = generateDisplayName(rng);
  const tierBonus = rank <= 6 ? 13 : rank <= 18 ? 8 : rank <= 36 ? 4 : rank <= 54 ? 1 : -2;
  const boomBust = rng.chance(rank <= 24 ? 0.22 : 0.13);
  const safeFloor = rng.chance(0.2);
  const actualPotential = clamp(70 + tierBonus + rng.int(-5, 8) + (boomBust ? rng.int(5, 10) : 0), 62, 96);
  const actualOverall = clamp(55 + Math.round(tierBonus * 0.45) + rng.int(-4, 8) + (safeFloor ? 3 : 0), 48, 78);
  const risk = boomBust ? "Boom/Bust" : safeFloor ? "Low" : rank <= 24 && rng.chance(0.35) ? "High" : rng.chance(0.55) ? "Medium" : "Low";
  const certainty = clamp(rng.int(18, 42) + (risk === "Low" ? 6 : 0) - (risk === "Boom/Bust" ? 5 : 0), 10, 58);

  return {
    id: `prospect-${idPrefix}-${rank}-${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
    firstName,
    lastName,
    displayName,
    age: rng.int(17, 19),
    position,
    handedness: rng.chance(0.6) ? "L" : ("R" as Handedness),
    nationality: generateNationality(rng),
    archetype: pickProspectArchetype(position, rng),
    league: rng.pick(PROSPECT_LEAGUES),
    publicRank: rank,
    projectedRound: Math.ceil(rank / 18),
    actualOverall,
    actualPotential,
    risk,
    personality: rng.pick(PERSONALITIES),
    strengths: pickDistinct(STRENGTHS, rng, 2),
    weaknesses: pickDistinct(WEAKNESSES, rng, 2),
    combineScore: clamp(rng.int(50, 91) + (rank <= 12 ? 6 : 0), 35, 99),
    scouting: {
      viewings: rng.int(0, 2),
      certainty,
      estimatedOverallLow: clamp(actualOverall - uncertainty(certainty, rng), 40, 99),
      estimatedOverallHigh: clamp(actualOverall + uncertainty(certainty, rng), 40, 99),
      estimatedPotentialLow: clamp(actualPotential - uncertainty(certainty, rng) - 2, 40, 99),
      estimatedPotentialHigh: clamp(actualPotential + uncertainty(certainty, rng) + 3, 40, 99),
      scoutNotes: [`Public lists have ${displayName} near pick ${rank}.`]
    }
  };
}

function cleanId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function hashSeed(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function pickPosition(index: number, rng: SeededRng): Position {
  const positions: Position[] = ["C", "LW", "RW", "LD", "RD", "G"];
  if ((index + 1) % 9 === 0) return "G";
  return rng.pick(positions.filter((position) => position !== "G"));
}

function pickProspectArchetype(position: Position, rng: SeededRng): PlayerArchetype {
  if (position === "G") return rng.pick(["Reflex Goalie", "Positional Goalie", "Hybrid Goalie"]);
  if (position === "LD" || position === "RD") return rng.pick(["Offensive Defenseman", "Defensive Defenseman", "Puck-Moving Defenseman"]);
  return rng.pick(["Sniper", "Playmaker", "Two-Way Forward", "Power Forward", "Grinder"]);
}

function uncertainty(certainty: number, rng: SeededRng): number {
  return Math.round((100 - certainty) / 9 + rng.int(1, 5));
}

function pickDistinct(items: string[], rng: SeededRng, count: number): string[] {
  const pool = [...items];
  return Array.from({ length: count }, () => {
    const item = rng.pick(pool);
    pool.splice(pool.indexOf(item), 1);
    return item;
  });
}
