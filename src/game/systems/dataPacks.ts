import { DRAFT_PICK_ROUNDS, REGULAR_SEASON_DAYS, SALARY_CAP_CEILING, SALARY_CAP_FLOOR, SCHEMA_VERSION } from "../constants";
import { FICTIONAL_TEAMS } from "../constants";
import { generateDraftClass } from "../generators/generateDraftClass";
import type {
  CustomLeagueTemplate,
  CustomPlayerDefinition,
  CustomTeamDefinition,
  DataPack,
  FranchiseState,
  LeagueRulesPreset,
  Player,
  ScenarioDefinition,
  Team
} from "../types";
import { FICTIONAL_ARENA_NAMES } from "../content/arenaNames";
import { FICTIONAL_AFFILIATE_NICKNAMES, FICTIONAL_TEAM_PERSONALITIES, CREST_SHAPES, JERSEY_PATTERNS } from "../content/teamNamePools";
import {
  createDataPackSummary,
  ensureUniqueDataPackIds,
  exportDataPackJson,
  importDataPackJson,
  repairDataPack,
  sanitizeDataPack,
  validateDataPack,
  validateDraftClass,
  validateLeagueBalance,
  validateNoRealWorldBranding,
  validatePlayerDefinitions,
  validateScenario,
  validateTeamDefinitions,
  detectRealWorldContent
} from "./dataPackValidation";
import { createRuleSetForTeamCount, normalizeLeagueRuleSet } from "./leagueRules";

export {
  createDataPackSummary,
  detectRealWorldContent,
  ensureUniqueDataPackIds,
  exportDataPackJson,
  importDataPackJson,
  repairDataPack,
  sanitizeDataPack,
  validateDataPack,
  validateDraftClass,
  validateLeagueBalance,
  validateNoRealWorldBranding,
  validatePlayerDefinitions,
  validateScenario,
  validateTeamDefinitions
};

export const DATA_PACK_VERSION = 2;

export function createDefaultDataPack(): DataPack {
  const now = new Date().toISOString();
  const pack: DataPack = {
    schemaVersion: SCHEMA_VERSION,
    dataPackVersion: DATA_PACK_VERSION,
    id: "built-in-fictional-standard",
    type: "full",
    name: "Built-in Fictional League",
    description: "A local editable version of the standard fictional Franchise Ice league with Phase 10 rules.",
    authorLabel: "Franchise Ice",
    createdAt: now,
    updatedAt: now,
    fictionalOnly: true,
    contentWarnings: ["Local JSON only. Fictional content filter is basic and not a legal guarantee."],
    leagueTemplate: createDefaultLeagueTemplate(),
    scenario: createStandardScenario(),
    draftClass: {
      id: "built-in-fictional-2026-draft",
      seasonYear: 2026,
      name: "Fictional 2026 Draft Class",
      prospects: generateDraftClass("phase9-built-in-draft", createRuleSetForTeamCount(12).draftClassSize)
    }
  };
  const validation = validateDataPack(pack);
  return { ...pack, validation };
}

export function createDataPackFromCurrentLeague(franchise: FranchiseState): DataPack {
  const now = new Date().toISOString();
  const teams = franchise.league.teams.map(teamToCustomDefinition);
  const ruleSet = normalizeLeagueRuleSet(franchise.league.ruleSet ?? {
    teamCount: teams.length,
    gamesPerTeam: userGamesForTeam(franchise.league.teams[0]?.id ?? "", franchise)
  });
  const pack: DataPack = {
    schemaVersion: SCHEMA_VERSION,
    dataPackVersion: DATA_PACK_VERSION,
    id: `export-${franchise.franchiseId}-${franchise.league.seasonYear}`,
    type: "full",
    name: franchise.customLeagueName ?? `${franchise.league.seasonYear} ${selectedTeamName(franchise)} League Export`,
    description: "Local fictional data pack exported from the currently loaded Franchise Ice league.",
    authorLabel: franchise.gmProfile.displayName || "Local GM",
    createdAt: now,
    updatedAt: now,
    fictionalOnly: true,
    contentWarnings: ["Exported locally. Validate again before starting a new franchise."],
    leagueTemplate: {
      id: `league-export-${franchise.league.seasonYear}`,
      name: franchise.customLeagueName ?? "Current Fictional League",
      description: "Snapshot of current fictional teams, rosters, branding colors, and rules.",
      seasonYear: franchise.league.seasonYear,
      rules: ruleSet,
      teamCount: ruleSet.teamCount,
      scheduleLength: ruleSet.gamesPerTeam,
      playoffTeamCount: ruleSet.playoffTeamCount,
      playoffSeriesLength: ruleSet.playoffSeriesLength,
      draftRounds: ruleSet.draftRounds,
      capCeiling: ruleSet.capCeiling,
      capFloor: ruleSet.capFloor,
      teams,
      rulesPreset: createLeagueRulesPreset("fictional-export", "Exported Fictional Rules", teams.length)
    },
    draftClass: {
      id: `draft-export-${franchise.league.seasonYear}`,
      seasonYear: franchise.league.seasonYear,
      name: `${franchise.league.seasonYear} Fictional Draft Snapshot`,
      prospects: franchise.scouting.draftClass
    }
  };
  const validation = validateDataPack(pack);
  return { ...pack, validation };
}

export function createDefaultLeagueTemplate(): CustomLeagueTemplate {
  const rules = createRuleSetForTeamCount(12);
  const teams = FICTIONAL_TEAMS.map((entry, index) => {
    const [id, city, nickname, abbreviation, primaryColor, secondaryColor, marketSize, teamPersonality] = entry;
    return createCustomTeamDefinition({
      id,
      city,
      nickname,
      abbreviation,
      primaryColor,
      secondaryColor,
      marketSize,
      teamPersonality,
      index
    });
  });
  return {
    id: "fictional-standard-12",
    name: "Fictional Standard 12",
    description: "A 12-team fictional league using the default Phase 10 dynasty rules.",
    seasonYear: 2026,
    rules,
    teamCount: rules.teamCount,
    scheduleLength: rules.gamesPerTeam,
    playoffTeamCount: rules.playoffTeamCount,
    playoffSeriesLength: rules.playoffSeriesLength,
    draftRounds: rules.draftRounds,
    capCeiling: rules.capCeiling,
    capFloor: rules.capFloor,
    teams,
    rulesPreset: createLeagueRulesPreset("fictional-standard", "Fictional Standard", 12)
  };
}

export function createLeagueRulesPreset(id: string, label: string, teamCount = 12): LeagueRulesPreset {
  const rules = createRuleSetForTeamCount(teamCount);
  return {
    id,
    label,
    description:
      teamCount === 12
        ? "Stable client-only fictional dynasty rules for the standard custom league start."
        : "Phase 10 custom-size fictional dynasty rules with supported schedule, playoff, and draft settings.",
    teamCount: rules.teamCount,
    scheduleLength: rules.gamesPerTeam,
    playoffTeamCount: rules.playoffTeamCount,
    playoffSeriesLength: rules.playoffSeriesLength,
    draftRounds: rules.draftRounds,
    capCeiling: rules.capCeiling,
    capFloor: rules.capFloor,
    rosterActiveMin: 20,
    rosterActiveMax: 23,
    affiliateEnabled: true,
    tradeDifficultyModifier: 1,
    developmentPaceModifier: 1,
    injuryModifier: 1
  };
}

export function createCustomTeamDefinition(input: {
  id: string;
  city: string;
  nickname: string;
  abbreviation: string;
  primaryColor: string;
  secondaryColor: string;
  marketSize: "Small" | "Medium" | "Large";
  teamPersonality?: string;
  index?: number;
}): CustomTeamDefinition {
  const index = input.index ?? 0;
  const initials = input.abbreviation.slice(0, 4).toUpperCase();
  return {
    id: input.id,
    city: input.city,
    nickname: input.nickname,
    fullName: `${input.city} ${input.nickname}`,
    abbreviation: initials,
    marketSize: input.marketSize,
    primaryColor: input.primaryColor,
    secondaryColor: input.secondaryColor,
    accentColor: index % 3 === 0 ? "#f5c65b" : "#f5fbff",
    teamPersonality: input.teamPersonality ?? FICTIONAL_TEAM_PERSONALITIES[index % FICTIONAL_TEAM_PERSONALITIES.length],
    ownerPatience: 54 + ((index * 7) % 33),
    fanConfidence: 48 + ((index * 5) % 31),
    arenaName: FICTIONAL_ARENA_NAMES[index % FICTIONAL_ARENA_NAMES.length],
    affiliateName: `${input.city} ${FICTIONAL_AFFILIATE_NICKNAMES[index % FICTIONAL_AFFILIATE_NICKNAMES.length]}`,
    rivalryTeamIds: [],
    branding: {
      crestShape: CREST_SHAPES[index % CREST_SHAPES.length],
      crestInitials: initials,
      jerseyPattern: JERSEY_PATTERNS[index % JERSEY_PATTERNS.length],
      homeJersey: `${input.primaryColor} home concept with ${input.secondaryColor} trim`,
      awayJersey: "White away concept with fictional club trim",
      alternateJersey: `${input.secondaryColor} alternate concept`,
      arenaMood: "local custom-league energy",
      broadcastStyle: index % 2 === 0 ? "glass" : "steel",
      chant: `${input.nickname} rise`
    },
    rosterStrategy: "balanced"
  };
}

export function createStandardScenario(): ScenarioDefinition {
  return {
    id: "standard-start",
    name: "Standard Start",
    description: "Open a clean fictional season with balanced pressure and the normal operations loop.",
    scenarioType: "standardStart",
    setupNotes: ["Balanced opening roster", "Normal owner pressure", "No scripted crisis"],
    modifiers: []
  };
}

function teamToCustomDefinition(team: Team): CustomTeamDefinition {
  const fallback = createCustomTeamDefinition({
    id: team.id,
    city: team.city,
    nickname: team.nickname,
    abbreviation: team.abbreviation,
    primaryColor: team.primaryColor,
    secondaryColor: team.secondaryColor,
    marketSize: team.marketSize,
    teamPersonality: team.teamPersonality
  });
  return {
    ...fallback,
    fullName: team.fullName,
    accentColor: team.accentColor ?? fallback.accentColor,
    ownerPatience: team.ownerPatience,
    fanConfidence: team.fanConfidence,
    arenaName: team.arenaName ?? fallback.arenaName,
    affiliateName: team.affiliateName ?? team.affiliate?.fullName ?? fallback.affiliateName,
    branding: team.customBranding ?? fallback.branding,
    players: team.roster.map(playerToCustomDefinition)
  };
}

function playerToCustomDefinition(player: Player): CustomPlayerDefinition {
  return {
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    displayName: player.displayName,
    age: player.age,
    position: player.position,
    handedness: player.handedness,
    nationality: player.nationality,
    archetype: player.archetype,
    personality: player.personality,
    overall: player.overall,
    potential: player.potential,
    roleExpectation: player.roleExpectation,
    contract: player.contract,
    rosterStatus: player.rosterStatus,
    morale: player.morale,
    form: player.form,
    fatigue: player.fatigue
  };
}

function selectedTeamName(franchise: FranchiseState): string {
  return franchise.league.teams.find((team) => team.id === franchise.selectedTeamId)?.fullName ?? "Fictional";
}

function userGamesForTeam(teamId: string, franchise: FranchiseState): number {
  if (!teamId) return REGULAR_SEASON_DAYS;
  return franchise.league.schedule.filter((game) => game.homeTeamId === teamId || game.awayTeamId === teamId).length || REGULAR_SEASON_DAYS;
}
