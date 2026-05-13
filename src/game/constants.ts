import type { Tactics } from "./types";

export const SCHEMA_VERSION = 2;
export const SAVE_SLOT_COUNT = 3;
export const AUTOSAVE_SLOT_ID = "autosave";
export const REGULAR_SEASON_DAYS = 22;
export const START_DATE = "2026-10-03";
export const SALARY_CAP_CEILING = 88_000_000;
export const SALARY_CAP_FLOOR = 55_000_000;
export const DRAFT_PICK_ROUNDS = 4;
export const DRAFT_PICK_SEASONS = 2;

export const DEFAULT_TACTICS: Tactics = {
  forecheckIntensity: 55,
  defensiveStructure: 55,
  offensiveRisk: 50,
  physicality: 48,
  pace: 55,
  shotVolume: 52,
  specialTeamsAggression: 50
};

export const FICTIONAL_TEAMS = [
  ["harbor-city", "Harbor City", "Blades", "HCB", "#5ec8ff", "#0f2d4a", "Large", "Fast, demanding, attack-minded"],
  ["cascadia", "Cascadia", "Storm", "CAS", "#61d6a8", "#123b3f", "Large", "Relentless pressure and restless media"],
  ["northstar", "Northstar", "Wolves", "NSW", "#a9c6ff", "#17233f", "Medium", "Structured, proud, defense-first"],
  ["prairie", "Prairie", "Falcons", "PRF", "#f4c95d", "#3d3417", "Small", "Patient, homegrown, underdog edge"],
  ["iron-valley", "Iron Valley", "Miners", "IVM", "#d87646", "#2d2522", "Medium", "Heavy, physical, blue-collar"],
  ["metro", "Metro", "Titans", "MTT", "#c178ff", "#231630", "Large", "Star-driven market with loud expectations"],
  ["summit", "Summit", "Lynx", "SUL", "#7ee0f5", "#233244", "Small", "Quick, clever, developmental"],
  ["atlantic", "Atlantic", "Guardians", "ATG", "#67b7ff", "#102a38", "Medium", "Veteran stability and disciplined systems"],
  ["lakeside", "Lakeside", "Royals", "LKR", "#d7e8ff", "#253158", "Medium", "Technical skill and patient ownership"],
  ["bayview", "Bayview", "Barracudas", "BVB", "#4de3c1", "#0a3c44", "Large", "Flashy offense and tough fan base"],
  ["capital", "Capital", "Comets", "CPC", "#ff7a8a", "#2e1722", "Large", "High-tempo, high-pressure market"],
  ["desert", "Desert", "Vipers", "DSV", "#f2b84b", "#352310", "Small", "Scrappy, opportunistic, counterpunching"]
] as const;

export const NATIONALITIES = [
  "Canada",
  "United States",
  "Sweden",
  "Finland",
  "Czechia",
  "Slovakia",
  "Germany",
  "Switzerland",
  "Latvia",
  "Norway"
];

export const SIM_CONSTANTS = {
  homeIceBoost: 2.4,
  baseShotChance: 7.2,
  baseGoalRate: 0.075,
  fatiguePenaltyScale: 0.07,
  moraleScale: 0.045,
  formScale: 0.055,
  injuryBaseChance: 0.012,
  overtimeGoalChance: 0.58
};
