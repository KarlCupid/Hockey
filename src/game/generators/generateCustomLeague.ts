import {
  ACTIVE_ROSTER_LIMIT,
  ACTIVE_ROSTER_MINIMUM,
  DEFAULT_TACTICS,
  SALARY_CAP_CEILING,
  SALARY_CAP_FLOOR,
  SCHEMA_VERSION,
  START_DATE
} from "../constants";
import { SeededRng, clamp } from "../rng";
import type {
  Contract,
  CustomLeagueTemplate,
  CustomPlayerDefinition,
  CustomTeamDefinition,
  DataPack,
  FranchiseSetupOptions,
  FranchiseState,
  GMProfile,
  GoalieAttributes,
  LeagueState,
  Player,
  PlayerDevelopmentPath,
  Position,
  SkaterAttributes,
  Team,
  TeamRosterStrategy
} from "../types";
import { createFranchise, emptyRecord, emptyTeamStats } from "./generateLeague";
import { generateRoster, emptyStats } from "./generatePlayers";
import { generateSchedule } from "./generateSchedule";
import { generateDraftClass } from "./generateDraftClass";
import { generateAffiliateForTeam } from "../systems/affiliate";
import { repairAllTeamRosters } from "../systems/aiRosterManagement";
import { createDefaultAchievements, evaluateAchievements } from "../systems/achievements";
import { generateAssistantGmReport } from "../systems/assistantGm";
import { contractSummary, createContractForPlayer } from "../systems/contracts";
import { createDifficultyTuning } from "../systems/difficulty";
import { generateInitialDraftPicks } from "../systems/draftPicks";
import { createDefaultOwnerState } from "../systems/owner";
import { defaultMediaState } from "../systems/fanMedia";
import { createGmProfile } from "../systems/gmProfile";
import { generateAgentsForPlayers, generateInitialPlayerRelationships, generateInitialTeamDynamics } from "../systems/relationships";
import { generateScoutingAssignments, rankDraftBoard } from "../systems/scouting";
import { generateStaffForLeague } from "../systems/staff";
import { generateTradeBlock, generateUntouchables, inferTeamNeeds } from "../systems/trades";
import { autoFillBestLineup } from "../systems/lineupValidation";
import { autoSetInitialRosterStatuses } from "../systems/rosterManagement";
import { validateDataPack } from "../systems/dataPackValidation";
import { createDefaultDataPack } from "../systems/dataPacks";
import { applyScenarioToFranchise } from "../systems/scenarios";
import { createDefaultTutorialState } from "../systems/tutorial";
import { NARRATIVE_TEMPLATE_VERSION } from "../content/narrativeTemplates";

const DYNASTY_COMPATIBLE_TEAM_COUNT = 12;

export function generateLeagueFromTemplate(template: CustomLeagueTemplate, seed = template.id): LeagueState {
  if (template.teamCount !== DYNASTY_COMPATIBLE_TEAM_COUNT || template.teams.length !== DYNASTY_COMPATIBLE_TEAM_COUNT) {
    throw new Error("Phase 9 custom dynasty starts currently require exactly 12 fictional teams.");
  }
  const rng = new SeededRng(seed);
  const teams = template.teams.map((definition, index) => generateTeamFromDefinition(definition, index, rng));
  const picks = generateInitialDraftPicks(teams, template.seasonYear);
  const teamsWithFrontOffice = teams.map((team) => {
    const withPicks = {
      ...team,
      capCeiling: template.capCeiling,
      capFloor: template.capFloor,
      activeRosterMinimum: template.rulesPreset.rosterActiveMin,
      activeRosterLimit: template.rulesPreset.rosterActiveMax,
      draftPicks: picks.filter((pick) => pick.ownerTeamId === team.id),
      teamNeeds: inferTeamNeeds(team)
    };
    const untouchables = generateUntouchables(withPicks);
    return {
      ...withPicks,
      untouchables,
      tradeBlock: generateTradeBlock({ ...withPicks, untouchables })
    };
  });

  return {
    id: `custom-league-${template.id}-${seed}`,
    seasonYear: template.seasonYear,
    currentDayIndex: 0,
    currentDate: START_DATE,
    teams: teamsWithFrontOffice,
    schedule: generateSchedule(teamsWithFrontOffice, template.scheduleLength),
    recentResults: [],
    completed: false
  };
}

export function generateTeamFromDefinition(definition: CustomTeamDefinition, index: number, rng: SeededRng): Team {
  const roster = definition.players?.length ? mergeCustomPlayers(definition, index, rng) : generateRosterFromStrategy(definition, rng);
  const base: Team = {
    id: definition.id,
    city: definition.city,
    nickname: definition.nickname,
    fullName: definition.fullName || `${definition.city} ${definition.nickname}`,
    abbreviation: definition.abbreviation,
    primaryColor: definition.primaryColor,
    secondaryColor: definition.secondaryColor,
    accentColor: definition.accentColor,
    marketSize: definition.marketSize,
    ownerPatience: clamp(definition.ownerPatience, 0, 100),
    fanConfidence: clamp(definition.fanConfidence, 0, 100),
    teamPersonality: definition.teamPersonality,
    arenaName: definition.arenaName,
    affiliateName: definition.affiliateName,
    customBranding: definition.branding,
    roster,
    lines: {
      forwardLines: [{}, {}, {}, {}],
      defensePairs: [{}, {}, {}],
      goalies: {}
    },
    tactics: { ...DEFAULT_TACTICS },
    record: emptyRecord(),
    stats: emptyTeamStats(),
    capCeiling: SALARY_CAP_CEILING,
    capFloor: SALARY_CAP_FLOOR,
    draftPicks: [],
    tradeBlock: [],
    untouchables: [],
    teamNeeds: [],
    affiliate: undefined as never,
    rosterMoveLog: [],
    activeRosterLimit: ACTIVE_ROSTER_LIMIT,
    activeRosterMinimum: ACTIVE_ROSTER_MINIMUM
  };
  base.affiliate = {
    ...generateAffiliateForTeam(base),
    fullName: definition.affiliateName,
    nickname: definition.affiliateName.split(" ").slice(-1)[0] ?? "Reserve",
    primaryColor: definition.primaryColor,
    secondaryColor: definition.secondaryColor
  };
  const withLineup = { ...base, lines: autoFillBestLineup(base).lineup };
  return autoSetInitialRosterStatuses(withLineup);
}

export function generateRosterFromStrategy(teamDef: CustomTeamDefinition, rng: SeededRng): Player[] {
  const teamIndex = Math.max(0, Number(teamDef.id.match(/\d+/)?.[0] ?? "0"));
  const roster = generateRoster(teamDef.id, teamIndex, rng).map((player, index) => ({
    ...player,
    id: `${teamDef.id}-p${index + 1}`,
    teamId: teamDef.id
  }));
  return applyRosterStrategy(roster, teamDef.rosterStrategy ?? "balanced", rng);
}

export function applyCustomLeagueRules(franchise: FranchiseState, template: CustomLeagueTemplate): FranchiseState {
  const league = {
    ...franchise.league,
    seasonYear: template.seasonYear,
    teams: franchise.league.teams.map((team) => ({
      ...team,
      capCeiling: template.capCeiling,
      capFloor: template.capFloor,
      activeRosterMinimum: template.rulesPreset.rosterActiveMin,
      activeRosterLimit: template.rulesPreset.rosterActiveMax
    }))
  };
  return {
    ...franchise,
    league: {
      ...league,
      schedule: generateSchedule(league.teams, template.scheduleLength)
    },
    currentSeasonId: `${template.seasonYear}-${franchise.selectedTeamId}`,
    updatedAt: new Date().toISOString()
  };
}

export function createCustomFranchiseFromDataPack(
  pack: DataPack,
  selectedTeamId?: string,
  gmProfile?: Partial<GMProfile>,
  settings: FranchiseSetupOptions = {}
): FranchiseState {
  const report = validateDataPack(pack);
  if (!report.valid) {
    throw new Error(`Data pack is not valid for a custom franchise start: ${report.errors[0] ?? report.duplicateIdWarnings[0] ?? "Unknown validation issue"}`);
  }
  const template = pack.leagueTemplate ?? createDefaultDataPack().leagueTemplate!;
  const selected = selectedTeamId && template.teams.some((team) => team.id === selectedTeamId) ? selectedTeamId : template.teams[0].id;
  const seed = settings.seed ?? `${pack.id}-${selected}-${Date.now()}`;
  const league = generateLeagueFromTemplate(template, seed);
  const now = new Date().toISOString();
  const base = createFranchise(selected, {
    ...settings,
    seed,
    difficulty: settings.difficulty ?? gmProfile?.difficulty ?? template.difficultySuggestion,
    storyFrequency: settings.storyFrequency ?? gmProfile?.storyFrequency ?? template.storySuggestion,
    gmName: settings.gmName ?? gmProfile?.displayName,
    gmBackground: settings.gmBackground ?? gmProfile?.background,
    avatarStyle: settings.avatarStyle ?? gmProfile?.avatarStyle,
    gameMode: settings.gameMode ?? gmProfile?.gameMode
  });
  const draftClass = pack.draftClass?.prospects?.length ? pack.draftClass.prospects : generateDraftClass(`${seed}-draft`);
  const initial: FranchiseState = {
    ...base,
    schemaVersion: SCHEMA_VERSION,
    franchiseId: `custom-franchise-${seed}`,
    selectedTeamId: selected,
    league,
    seasonPhase: pack.scenario?.startPhase ?? "regularSeason",
    currentSeasonId: `${league.seasonYear}-${selected}`,
    gmProfile: createGmProfile({
      displayName: settings.gmName ?? gmProfile?.displayName,
      background: settings.gmBackground ?? gmProfile?.background,
      avatarStyle: settings.avatarStyle ?? gmProfile?.avatarStyle,
      difficulty: settings.difficulty ?? gmProfile?.difficulty ?? template.difficultySuggestion,
      gameMode: settings.gameMode ?? gmProfile?.gameMode,
      storyFrequency: settings.storyFrequency ?? gmProfile?.storyFrequency ?? template.storySuggestion,
      createdAt: now
    }),
    difficultyTuning: createDifficultyTuning(
      settings.difficulty ?? gmProfile?.difficulty ?? template.difficultySuggestion ?? "standard",
      settings.gameMode ?? gmProfile?.gameMode ?? "standardDynasty",
      settings.storyFrequency ?? gmProfile?.storyFrequency ?? template.storySuggestion ?? "normal"
    ),
    tutorialState: createDefaultTutorialState("firstFranchise"),
    achievements: createDefaultAchievements(),
    milestones: [],
    localTelemetry: [],
    playoffState: undefined,
    offseasonState: undefined,
    freeAgencyState: undefined,
    staffState: generateStaffForLeague(league.teams, new SeededRng(`${seed}-staff`)),
    history: {
      seasons: [],
      champions: [],
      awards: [],
      draftHistory: [],
      transactionHistory: []
    },
    prospectPools: Object.fromEntries(league.teams.map((team) => [team.id, []])),
    decisionEvents: [],
    storyArcs: [],
    playerRelationships: {},
    agents: [],
    teamDynamics: {},
    mediaState: {
      pressure: 45,
      narrative: "quiet",
      recentQuestions: [],
      columnistTone: "neutral"
    },
    inbox: [
      {
        id: `custom-welcome-${selected}`,
        type: "owner",
        date: league.currentDate,
        headline: "Custom League Lab: New fictional world loaded",
        body: `${template.name} is local-only, validated, and ready for a new front-office story.`,
        severity: "medium",
        teamId: selected
      }
    ],
    scouting: {
      draftClass,
      assignments: generateScoutingAssignments(),
      watchlist: [],
      teamDraftBoard: rankDraftBoard(draftClass, "Best Player Available"),
      lastScoutingTickDayIndex: league.currentDayIndex
    },
    development: {
      plans: [],
      recentUpdates: []
    },
    tradeHistory: [],
    rosterMoveHistory: [],
    transactionLog: [
      {
        id: `transaction-custom-start-${selected}`,
        date: league.currentDate,
        type: "season",
        headline: "Custom fictional league started",
        details: `${template.name} loaded from ${pack.name}.`,
        teamIds: [selected]
      }
    ],
    lastResult: undefined,
    sourceDataPackId: pack.id,
    sourceScenarioId: pack.scenario?.id,
    customLeagueName: template.name,
    dataPackMetadata: {
      dataPackId: pack.id,
      dataPackName: pack.name,
      scenarioName: pack.scenario?.name,
      importedAt: now
    },
    saveStatus: "idle",
    createdAt: now,
    updatedAt: now
  };
  const withOwner = {
    ...initial,
    ownerState: createDefaultOwnerState(initial, new SeededRng(`${seed}-owner`))
  };
  const withAgents = {
    ...withOwner,
    agents: generateAgentsForPlayers(withOwner, new SeededRng(`${seed}-agents`))
  };
  const withRelationships = {
    ...withAgents,
    playerRelationships: generateInitialPlayerRelationships(withAgents)
  };
  const withDynamics = {
    ...withRelationships,
    teamDynamics: generateInitialTeamDynamics(withRelationships),
    mediaState: defaultMediaState(withRelationships)
  };
  const repaired = repairAllTeamRosters(withDynamics, "newFranchise");
  const withScenario = pack.scenario ? applyScenarioToFranchise(repaired, pack.scenario, new SeededRng(`${seed}-scenario`)) : repaired;
  const withAssistant = {
    ...withScenario,
    assistantGmReports: [generateAssistantGmReport(withScenario, { type: "daily", date: withScenario.league.currentDate })]
  };
  return evaluateAchievements(withAssistant, { type: pack.scenario ? "scenarioStarted" : "customLeagueStarted" });
}

function mergeCustomPlayers(teamDef: CustomTeamDefinition, teamIndex: number, rng: SeededRng): Player[] {
  const generated = applyRosterStrategy(generateRoster(teamDef.id, teamIndex, rng), teamDef.rosterStrategy ?? "balanced", rng);
  const custom = (teamDef.players ?? []).map((player, index) => customPlayerToPlayer(player, teamDef.id, index, rng));
  const customIds = new Set(custom.map((player) => player.id));
  const fill = generated
    .filter((player) => !customIds.has(player.id))
    .map((player, index) => ({ ...player, id: customIds.has(`${teamDef.id}-fill-${index + 1}`) ? `${teamDef.id}-generated-${index + 1}` : `${teamDef.id}-fill-${index + 1}` }));
  return [...custom, ...fill].slice(0, Math.max(24, custom.length));
}

function customPlayerToPlayer(definition: CustomPlayerDefinition, teamId: string, index: number, rng: SeededRng): Player {
  const overall = clamp(definition.overall, 40, 99);
  const potential = clamp(definition.potential, 40, 99);
  const roleExpectation = definition.roleExpectation;
  const contract = definition.contract ?? createContractForPlayer({ age: definition.age, overall, potential, position: definition.position, roleExpectation }, rng);
  return {
    id: definition.id || `${teamId}-custom-${index + 1}`,
    teamId,
    firstName: definition.firstName,
    lastName: definition.lastName,
    displayName: definition.displayName || `${definition.firstName} ${definition.lastName}`,
    age: clamp(definition.age, 17, 45),
    position: definition.position,
    handedness: definition.handedness,
    nationality: definition.nationality,
    archetype: definition.archetype,
    personality: definition.personality,
    overall,
    potential,
    roleExpectation,
    morale: clamp(definition.morale ?? 62, 0, 100),
    form: clamp(definition.form ?? 55, 0, 100),
    fatigue: clamp(definition.fatigue ?? 24, 0, 100),
    injuryStatus: "healthy",
    injuryGamesRemaining: 0,
    attributes: definition.position === "G" ? goalieAttributes(overall, rng) : skaterAttributes(overall, rng),
    stats: emptyStats(),
    contract,
    contractSummary: contractSummary(contract),
    rosterStatus: definition.rosterStatus ?? "active",
    acquiredVia: "generated",
    waiverEligible: false,
    affiliateSeasons: 0,
    developmentPath: defaultDevelopmentPath(definition.position, roleExpectation, definition.age, overall, potential),
    careerStage: definition.age <= 23 ? "prospect" : definition.age <= 30 ? "prime" : definition.age <= 34 ? "veteran" : "decline"
  };
}

function applyRosterStrategy(roster: Player[], strategy: TeamRosterStrategy, rng: SeededRng): Player[] {
  return roster.map((player, index) => {
    let overallDelta = 0;
    let ageDelta = 0;
    let potentialDelta = 0;
    if (strategy === "contender" && index < 10) overallDelta += 3;
    if (strategy === "rebuild" || strategy === "youngCore") {
      ageDelta -= index < 16 ? 3 : 1;
      potentialDelta += index < 14 ? 4 : 1;
      overallDelta -= index > 12 ? 1 : 0;
    }
    if (strategy === "veteranHeavy") {
      ageDelta += 4;
      overallDelta += index < 8 ? 2 : 0;
      potentialDelta -= 2;
    }
    if (strategy === "goalieFirst" && player.position === "G") overallDelta += index % 2 === 0 ? 6 : 3;
    if (strategy === "defenseFirst" && (player.position === "LD" || player.position === "RD")) overallDelta += 3;
    if (strategy === "highOffense" && ["LW", "C", "RW"].includes(player.position)) overallDelta += 2;
    if (strategy === "random") overallDelta += rng.int(-3, 4);
    const overall = clamp(player.overall + overallDelta, 40, 96);
    const age = clamp(player.age + ageDelta, 17, 45);
    const potential = clamp(Math.max(overall, player.potential + potentialDelta), 40, 99);
    const contract: Contract = createContractForPlayer({ age, overall, potential, position: player.position, roleExpectation: player.roleExpectation }, rng);
    return {
      ...player,
      age,
      overall,
      potential,
      contract,
      contractSummary: contractSummary(contract),
      attributes: player.position === "G" ? goalieAttributes(overall, rng) : skaterAttributes(overall, rng),
      developmentPath: defaultDevelopmentPath(player.position, player.roleExpectation, age, overall, potential)
    };
  });
}

function skaterAttributes(overall: number, rng: SeededRng): SkaterAttributes {
  const attr = () => clamp(overall + rng.int(-8, 9), 40, 99);
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

function goalieAttributes(overall: number, rng: SeededRng): GoalieAttributes {
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

function defaultDevelopmentPath(
  position: Position,
  projectedRole: Player["roleExpectation"],
  age: number,
  overall: number,
  potential: number
): PlayerDevelopmentPath {
  const upside = potential - overall;
  const prospect = age <= 22 || upside >= 8;
  return {
    track: position === "G" && prospect ? "Goalie Project" : prospect ? "Prospect Pipeline" : overall >= 73 ? "NHL Regular" : "Affiliate Development",
    confidence: clamp(52 + upside + (overall >= 76 ? 8 : 0), 35, 92),
    lastReport: "Custom League Lab generated this player pathway.",
    projectedRole,
    eta: overall >= 73 ? "Now" : prospect && overall >= 68 ? "This Season" : prospect ? "Next Season" : "Long Term"
  };
}
