import { ACTIVE_ROSTER_LIMIT, ACTIVE_ROSTER_MINIMUM, DEFAULT_TACTICS, FICTIONAL_TEAMS, SALARY_CAP_CEILING, SALARY_CAP_FLOOR, SCHEMA_VERSION, START_DATE } from "../constants";
import { SeededRng } from "../rng";
import type { FranchiseState, LeagueState, Team, TeamRecord, TeamStats } from "../types";
import { generateAffiliateForTeam } from "../systems/affiliate";
import { repairAllTeamRosters } from "../systems/aiRosterManagement";
import { autoFillBestLineup } from "../systems/lineupValidation";
import { autoSetInitialRosterStatuses } from "../systems/rosterManagement";
import { generateInitialDraftPicks } from "../systems/draftPicks";
import { generateScoutingAssignments, rankDraftBoard } from "../systems/scouting";
import { generateStaffForLeague } from "../systems/staff";
import { createDefaultOwnerState } from "../systems/owner";
import { generateTradeBlock, generateUntouchables, inferTeamNeeds } from "../systems/trades";
import { generateDraftClass } from "./generateDraftClass";
import { generateRoster } from "./generatePlayers";
import { generateSchedule } from "./generateSchedule";

export function generateLeague(seed = "franchise-ice-vertical-slice"): LeagueState {
  const rng = new SeededRng(seed);
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
    team.affiliate = generateAffiliateForTeam(team);
    team.lines = autoFillBestLineup(team).lineup;
    return autoSetInitialRosterStatuses(team);
  });
  const picks = generateInitialDraftPicks(teams, 2026);
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

  return {
    id: `league-${seed}`,
    seasonYear: 2026,
    currentDayIndex: 0,
    currentDate: START_DATE,
    teams: teamsWithFrontOffice,
    schedule: generateSchedule(teamsWithFrontOffice),
    recentResults: [],
    completed: false
  };
}

export function createFranchise(selectedTeamId: string, seed = `${selectedTeamId}-${Date.now()}`): FranchiseState {
  const league = generateLeague(seed);
  const selectedTeam = league.teams.find((team) => team.id === selectedTeamId) ?? league.teams[0];
  const now = new Date().toISOString();
  const draftClass = generateDraftClass(`${seed}-draft`);
  const staffState = generateStaffForLeague(league.teams, new SeededRng(`${seed}-staff`));
  const prospectPools = Object.fromEntries(league.teams.map((team) => [team.id, []]));
  const base: FranchiseState = {
    schemaVersion: SCHEMA_VERSION,
    franchiseId: `franchise-${seed}`,
    selectedTeamId: selectedTeam.id,
    league,
    seasonPhase: "regularSeason",
    currentSeasonId: `${league.seasonYear}-${selectedTeam.id}`,
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
      messages: []
    },
    prospectPools,
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
  const ownerState = createDefaultOwnerState(base, new SeededRng(`${seed}-owner`));
  const repaired = repairAllTeamRosters({
    ...base,
    ownerState,
    inbox: [...ownerState.messages, ...base.inbox]
  }, "newFranchise");
  return {
    ...repaired,
    ...base,
    ownerState,
    league: repaired.league,
    prospectPools: repaired.prospectPools,
    rosterMoveHistory: repaired.rosterMoveHistory,
    transactionLog: repaired.transactionLog,
    inbox: [...ownerState.messages, ...repaired.inbox.filter((item) => !ownerState.messages.some((message) => message.id === item.id))].slice(0, 60)
  };
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
