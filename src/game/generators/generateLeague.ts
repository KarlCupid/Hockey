import { DEFAULT_TACTICS, FICTIONAL_TEAMS, SCHEMA_VERSION, START_DATE } from "../constants";
import { SeededRng } from "../rng";
import type { FranchiseState, LeagueState, Team, TeamRecord, TeamStats } from "../types";
import { autoFillBestLineup } from "../systems/lineupValidation";
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
      stats: emptyTeamStats()
    };
    team.lines = autoFillBestLineup(team).lineup;
    return team;
  });

  return {
    id: `league-${seed}`,
    seasonYear: 2026,
    currentDayIndex: 0,
    currentDate: START_DATE,
    teams,
    schedule: generateSchedule(teams),
    recentResults: [],
    completed: false
  };
}

export function createFranchise(selectedTeamId: string, seed = `${selectedTeamId}-${Date.now()}`): FranchiseState {
  const league = generateLeague(seed);
  const selectedTeam = league.teams.find((team) => team.id === selectedTeamId) ?? league.teams[0];
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    franchiseId: `franchise-${seed}`,
    selectedTeamId: selectedTeam.id,
    league,
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
    saveStatus: "idle",
    createdAt: now,
    updatedAt: now
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
