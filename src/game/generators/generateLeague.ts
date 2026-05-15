import { ACTIVE_ROSTER_LIMIT, ACTIVE_ROSTER_MINIMUM, DEFAULT_TACTICS, FICTIONAL_TEAMS, SALARY_CAP_CEILING, SALARY_CAP_FLOOR, SCHEMA_VERSION, START_DATE } from "../constants";
import { SeededRng } from "../rng";
import type { FranchiseSetupOptions, FranchiseStartPreset, FranchiseState, GMProfile, LeagueState, OwnerState, Team, TeamDynamics, TeamRecord, TeamStats } from "../types";
import { generateAffiliateForTeam } from "../systems/affiliate";
import { repairAllTeamRosters } from "../systems/aiRosterManagement";
import { autoFillBestLineup } from "../systems/lineupValidation";
import { autoSetInitialRosterStatuses } from "../systems/rosterManagement";
import { generateInitialDraftPicks } from "../systems/draftPicks";
import { generateScoutingAssignments, rankDraftBoard } from "../systems/scouting";
import { generateStaffForLeague } from "../systems/staff";
import { createDefaultOwnerState } from "../systems/owner";
import { defaultMediaState } from "../systems/fanMedia";
import { generateAgentsForPlayers, generateInitialPlayerRelationships, generateInitialTeamDynamics } from "../systems/relationships";
import { generateTradeBlock, generateUntouchables, inferTeamNeeds } from "../systems/trades";
import { generateAssistantGmReport } from "../systems/assistantGm";
import { createDefaultAchievements, evaluateAchievements } from "../systems/achievements";
import { createDifficultyTuning } from "../systems/difficulty";
import { createGmProfile } from "../systems/gmProfile";
import { evaluateMilestones } from "../systems/milestones";
import { createDefaultTutorialState } from "../systems/tutorial";
import { NARRATIVE_TEMPLATE_VERSION } from "../content/narrativeTemplates";
import { generateDraftClass } from "./generateDraftClass";
import { generateRoster } from "./generatePlayers";
import { generateScheduleForRuleSet, validateSchedule } from "./generateSchedule";
import { createDefaultRuleSet } from "../systems/leagueRules";

export function generateLeague(seed = "franchise-ice-vertical-slice"): LeagueState {
  const rng = new SeededRng(seed);
  const ruleSet = createDefaultRuleSet();
  const teams: Team[] = FICTIONAL_TEAMS.map((entry, index) => {
    const [id, city, nickname, abbreviation, primaryColor, secondaryColor, marketSize, teamPersonality] = entry;
    const roster = generateRoster(id, index, rng);
    const team: Team = {
      id,
      city,
      nickname,
      fullName: `${city} ${nickname}`,
      abbreviation,
      primaryColor,
      secondaryColor,
      marketSize,
      ownerPatience: rng.int(42, 84),
      fanConfidence: rng.int(45, 78),
      teamPersonality,
      roster,
      lines: {
        forwardLines: [{}, {}, {}, {}],
        defensePairs: [{}, {}, {}],
        goalies: {}
      },
      tactics: { ...DEFAULT_TACTICS },
      record: emptyRecord(),
      stats: emptyTeamStats(),
      capCeiling: ruleSet.capCeiling,
      capFloor: ruleSet.capFloor,
      draftPicks: [],
      tradeBlock: [],
      untouchables: [],
      teamNeeds: [],
      affiliate: undefined as never,
      rosterMoveLog: [],
      activeRosterLimit: ruleSet.activeRosterMax,
      activeRosterMinimum: ruleSet.activeRosterMin
    };
    team.affiliate = generateAffiliateForTeam(team);
    team.lines = autoFillBestLineup(team).lineup;
    return autoSetInitialRosterStatuses(team);
  });
  const picks = generateInitialDraftPicks(teams, 2026, ruleSet.draftRounds);
  const teamsWithFrontOffice = teams.map((team) => {
    const withPicks = {
      ...team,
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

  const schedule = generateScheduleForRuleSet(teamsWithFrontOffice, ruleSet, seed);
  return {
    id: `league-${seed}`,
    seasonYear: 2026,
    currentDayIndex: 0,
    currentDate: START_DATE,
    teams: teamsWithFrontOffice,
    schedule,
    ruleSet,
    scheduleReport: validateSchedule(schedule, teamsWithFrontOffice, ruleSet),
    recentResults: [],
    completed: false
  };
}

export function createFranchise(
  selectedTeamId: string,
  seedOrOptions: string | FranchiseSetupOptions = `${selectedTeamId}-${Date.now()}`
): FranchiseState {
  const options: FranchiseSetupOptions = typeof seedOrOptions === "string" ? { seed: seedOrOptions } : seedOrOptions;
  const seed = options.seed ?? `${selectedTeamId}-${Date.now()}`;
  let league = generateLeague(seed);
  league = applyStartPresetToLeague(league, selectedTeamId, options.startPreset ?? "balanced");
  const selectedTeam = league.teams.find((team) => team.id === selectedTeamId) ?? league.teams[0];
  const now = new Date().toISOString();
  const gmProfile = createGmProfile({
    displayName: options.gmName,
    background: options.gmBackground,
    avatarStyle: options.avatarStyle,
    difficulty: options.difficulty,
    gameMode: options.gameMode,
    storyFrequency: options.storyFrequency,
    createdAt: now
  });
  const difficultyTuning = createDifficultyTuning(gmProfile.difficulty, gmProfile.gameMode, gmProfile.storyFrequency);
  const draftClass = applyStartPresetToDraftClass(generateDraftClass(`${seed}-draft`, league.ruleSet.draftClassSize), options.startPreset ?? "balanced");
  const staffState = generateStaffForLeague(league.teams, new SeededRng(`${seed}-staff`));
  const prospectPools = Object.fromEntries(league.teams.map((team) => [team.id, []]));
  const base: FranchiseState = {
    schemaVersion: SCHEMA_VERSION,
    franchiseId: `franchise-${seed}`,
    selectedTeamId: selectedTeam.id,
    league,
    seasonPhase: "regularSeason",
    currentSeasonId: `${league.seasonYear}-${selectedTeam.id}`,
    gmProfile,
    difficultyTuning,
    assistantGmReports: [],
    narrativeTemplateVersion: NARRATIVE_TEMPLATE_VERSION,
    tutorialState: createDefaultTutorialState("firstFranchise"),
    achievements: createDefaultAchievements(),
    milestones: [],
    localTelemetry: [],
    staffState,
    history: {
      seasons: [],
      champions: [],
      awards: [],
      draftHistory: [],
      transactionHistory: []
    },
    ownerState: {
      jobSecurity: 65,
      patience: selectedTeam.ownerPatience,
      seasonGoals: [],
      messages: [],
      goalOutcomeHistory: []
    },
    prospectPools,
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
        id: `welcome-${selectedTeam.id}`,
        type: "owner",
        date: league.currentDate,
        headline: "Owner's Suite: Set the tone early",
        body: `${selectedTeam.fullName} ownership expects a clear identity before the first homestand gets loud.`,
        severity: "medium",
        teamId: selectedTeam.id
      },
      {
        id: `media-${selectedTeam.id}`,
        type: "media",
        date: league.currentDate,
        headline: "Local Column: New bench boss takes both chairs",
        body: "The front office says one voice will run hockey decisions and the room. The first week will tell us plenty.",
        severity: "low",
        teamId: selectedTeam.id
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
        id: `transaction-open-${selectedTeam.id}`,
        date: league.currentDate,
        type: "contract",
        headline: "Front office files opened",
        details: "Contracts, draft assets, scouting, trades, and development are now tracked locally.",
        teamIds: [selectedTeam.id]
      }
    ],
    saveStatus: "idle",
    createdAt: now,
    updatedAt: now
  };
  const ownerState = applyOpeningOwnerTuning(
    createDefaultOwnerState(base, new SeededRng(`${seed}-owner`)),
    gmProfile,
    options.startPreset ?? "balanced"
  );
  const withOwner = { ...base, ownerState };
  const agents = generateAgentsForPlayers(withOwner, new SeededRng(`${seed}-agents`));
  const withAgents = { ...withOwner, agents };
  const playerRelationships = generateInitialPlayerRelationships(withAgents);
  const withRelationships = { ...withAgents, playerRelationships };
  const teamDynamics = applyOpeningDynamics(
    generateInitialTeamDynamics(withRelationships),
    selectedTeam.id,
    gmProfile,
    options.startPreset ?? "balanced"
  );
  const mediaState = defaultMediaState(withRelationships);
  const initial = {
    ...withRelationships,
    teamDynamics,
    mediaState,
    inbox: [...ownerState.messages, ...base.inbox]
  };
  const repaired = repairAllTeamRosters({
    ...initial,
    inbox: initial.inbox
  }, "newFranchise");
  const finalState: FranchiseState = {
    ...base,
    ownerState,
    league: repaired.league,
    prospectPools: repaired.prospectPools,
    decisionEvents: initial.decisionEvents,
    storyArcs: initial.storyArcs,
    playerRelationships,
    agents,
    teamDynamics,
    mediaState,
    rosterMoveHistory: repaired.rosterMoveHistory,
    transactionLog: repaired.transactionLog,
    inbox: [...ownerState.messages, ...repaired.inbox.filter((item) => !ownerState.messages.some((message) => message.id === item.id))].slice(0, 60)
  };
  const withAssistantReport = {
    ...finalState,
    assistantGmReports: [generateAssistantGmReport(finalState, { type: "daily", date: finalState.league.currentDate })]
  };
  return evaluateMilestones(evaluateAchievements(withAssistantReport, { type: "newFranchise" }));
}

export function emptyRecord(): TeamRecord {
  return {
    wins: 0,
    losses: 0,
    overtimeLosses: 0,
    points: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    streak: "-"
  };
}

export function emptyTeamStats(): TeamStats {
  return {
    gamesPlayed: 0,
    shotsFor: 0,
    shotsAgainst: 0,
    powerPlayGoals: 0,
    powerPlayAttempts: 0,
    penaltyKillGoalsAgainst: 0,
    penaltyKillAttempts: 0
  };
}

function applyStartPresetToLeague(league: LeagueState, selectedTeamId: string, preset: FranchiseStartPreset): LeagueState {
  if (preset === "balanced") return league;
  return {
    ...league,
    teams: league.teams.map((team) => {
      if (team.id !== selectedTeamId) return team;
      if (preset === "capCrunched") {
        return {
          ...team,
          capCeiling: Math.max(team.capFloor + 9_000_000, team.capCeiling - 4_500_000),
          ownerPatience: Math.max(28, team.ownerPatience - 8),
          fanConfidence: Math.max(35, team.fanConfidence - 4)
        };
      }
      if (preset === "rebuild") {
        return {
          ...team,
          ownerPatience: Math.min(92, team.ownerPatience + 10),
          fanConfidence: Math.max(38, team.fanConfidence - 6),
          roster: team.roster.map((player) =>
            player.age <= 23 ? { ...player, potential: Math.min(95, player.potential + 1), morale: Math.min(100, player.morale + 2) } : player
          )
        };
      }
      if (preset === "contender") {
        return {
          ...team,
          ownerPatience: Math.max(30, team.ownerPatience - 9),
          fanConfidence: Math.min(88, team.fanConfidence + 6),
          roster: team.roster.map((player, index) =>
            index < 6 ? { ...player, form: Math.min(100, player.form + 3), morale: Math.min(100, player.morale + 2) } : player
          )
        };
      }
      if (preset === "injuryLight") {
        return {
          ...team,
          roster: team.roster.map((player) => ({
            ...player,
            fatigue: Math.min(player.fatigue, 38),
            injuryStatus: "healthy" as const,
            injuryGamesRemaining: 0
          }))
        };
      }
      if (preset === "prospectHeavy") {
        return {
          ...team,
          roster: team.roster.map((player) =>
            player.age <= 24 ? { ...player, potential: Math.min(95, player.potential + 2) } : player
          )
        };
      }
      return team;
    })
  };
}

function applyStartPresetToDraftClass<T extends { scouting: { certainty: number }; actualPotential: number }>(
  draftClass: T[],
  preset: FranchiseStartPreset
): T[] {
  if (preset !== "prospectHeavy") return draftClass;
  return draftClass.map((prospect, index) => ({
    ...prospect,
    actualPotential: index < 18 ? Math.min(96, prospect.actualPotential + 1) : prospect.actualPotential,
    scouting: {
      ...prospect.scouting,
      certainty: Math.min(100, prospect.scouting.certainty + 8)
    }
  }));
}

function applyOpeningOwnerTuning(ownerState: OwnerState, gmProfile: GMProfile, preset: FranchiseStartPreset): OwnerState {
  let jobSecurity = ownerState.jobSecurity;
  let patience = ownerState.patience;
  if (gmProfile.background === "Owner Favorite") {
    jobSecurity += 8;
    patience += 5;
  }
  if (gmProfile.gameMode === "sandbox") {
    jobSecurity += 15;
    patience += 12;
  }
  if (gmProfile.gameMode === "pressureCooker") {
    jobSecurity -= 8;
    patience -= 8;
  }
  if (gmProfile.gameMode === "contenderChallenge" || preset === "contender") {
    jobSecurity -= 6;
    patience -= 6;
  }
  if (gmProfile.gameMode === "rebuildChallenge" || preset === "rebuild") {
    patience += 8;
  }
  if (preset === "capCrunched") {
    jobSecurity -= 6;
    patience -= 4;
  }
  return {
    ...ownerState,
    jobSecurity: Math.max(25, Math.min(100, Math.round(jobSecurity))),
    patience: Math.max(25, Math.min(100, Math.round(patience)))
  };
}

function applyOpeningDynamics(
  teamDynamics: Record<string, TeamDynamics>,
  selectedTeamId: string,
  gmProfile: GMProfile,
  preset: FranchiseStartPreset
): Record<string, TeamDynamics> {
  const dynamics = teamDynamics[selectedTeamId];
  if (!dynamics) return teamDynamics;
  let ownerTrust = dynamics.ownerTrust;
  let chemistry = dynamics.chemistry;
  let mediaPressure = dynamics.mediaPressure;
  let fanSentiment = dynamics.fanSentiment;
  if (gmProfile.background === "Owner Favorite") ownerTrust += 7;
  if (gmProfile.background === "Player Relationship Builder" || gmProfile.background === "Former Coach") chemistry += 4;
  if (gmProfile.background === "Media Savvy") mediaPressure -= 6;
  if (gmProfile.gameMode === "pressureCooker") mediaPressure += 12;
  if (gmProfile.gameMode === "sandbox") mediaPressure -= 8;
  if (preset === "capCrunched") {
    ownerTrust -= 8;
    mediaPressure += 8;
  }
  if (preset === "rebuild") {
    fanSentiment -= 4;
    ownerTrust += 4;
  }
  if (preset === "contender") {
    fanSentiment += 5;
    mediaPressure += 5;
  }
  return {
    ...teamDynamics,
    [selectedTeamId]: {
      ...dynamics,
      ownerTrust: Math.max(0, Math.min(100, Math.round(ownerTrust))),
      chemistry: Math.max(0, Math.min(100, Math.round(chemistry))),
      mediaPressure: Math.max(0, Math.min(100, Math.round(mediaPressure))),
      fanSentiment: Math.max(0, Math.min(100, Math.round(fanSentiment)))
    }
  };
}
