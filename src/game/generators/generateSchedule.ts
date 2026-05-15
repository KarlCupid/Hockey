import { START_DATE } from "../constants";
import { SeededRng } from "../rng";
import type { LeagueRuleSet, ScheduleGame, ScheduleGenerationReport, Team } from "../types";
import { createDefaultRuleSet, normalizeLeagueRuleSet } from "../systems/leagueRules";

export function generateSchedule(teams: Team[], targetGamesPerTeam?: number): ScheduleGame[] {
  const ruleSet = normalizeLeagueRuleSet({
    ...createDefaultRuleSet(),
    teamCount: teams.length,
    gamesPerTeam: targetGamesPerTeam ?? createDefaultRuleSet().gamesPerTeam,
    seasonStartDate: START_DATE
  });
  return generateScheduleForRuleSet(teams, ruleSet);
}

export function generateScheduleForRuleSet(teams: Team[], ruleSetInput: LeagueRuleSet, seed = `${ruleSetInput.id}-${teams.map((team) => team.id).join("-")}`): ScheduleGame[] {
  const ruleSet = normalizeLeagueRuleSet(ruleSetInput);
  const games =
    ruleSet.scheduleFormat === "doubleRoundRobin"
      ? generateDoubleRoundRobin(teams)
      : generateBalancedSchedule(teams, ruleSet.gamesPerTeam, new SeededRng(seed));
  return assignDatesToSchedule(games, ruleSet.seasonStartDate);
}

export function generateDoubleRoundRobin(teams: Team[]): ScheduleGame[] {
  const ids = teams.map((team) => team.id);
  const rounds = createRoundRobin(ids);
  return roundsToSchedule([...rounds, ...rounds.map((round) => round.map(([home, away]) => [away, home] as [string, string]))]);
}

export function generateBalancedSchedule(teams: Team[], gamesPerTeam: number, rng = new SeededRng("balanced-schedule")): ScheduleGame[] {
  const ids = teams.map((team) => team.id);
  const rounds = createRoundRobin(ids);
  const mirroredRounds = [...rounds, ...rounds.map((round) => round.map(([home, away]) => [away, home] as [string, string]))];
  const desiredDays = Math.max(1, Math.round(gamesPerTeam));
  const scheduledRounds = Array.from({ length: desiredDays }, (_, index) => {
    const round = mirroredRounds[index % mirroredRounds.length];
    const cycle = Math.floor(index / mirroredRounds.length);
    const balanced = cycle % 2 === 0 ? round : round.map(([home, away]) => [away, home] as [string, string]);
    return rotateRoundHomes(balanced, index + rng.int(0, Math.max(1, ids.length - 1)));
  });
  return roundsToSchedule(scheduledRounds);
}

export function assignDatesToSchedule(games: ScheduleGame[], startDate = START_DATE): ScheduleGame[] {
  const schedule: ScheduleGame[] = [];
  const start = new Date(`${startDate}T12:00:00Z`);

  games.forEach((game) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + game.dayIndex * 2);
    schedule.push({
      ...game,
      date: date.toISOString().slice(0, 10)
    });
  });

  return schedule;
}

export function validateSchedule(schedule: ScheduleGame[], teams: Team[], ruleSetInput: LeagueRuleSet): ScheduleGenerationReport {
  const ruleSet = normalizeLeagueRuleSet(ruleSetInput);
  const teamIds = new Set(teams.map((team) => team.id));
  const gamesPerTeam = Object.fromEntries(teams.map((team) => [team.id, 0]));
  const homeGames = Object.fromEntries(teams.map((team) => [team.id, 0]));
  const awayGames = Object.fromEntries(teams.map((team) => [team.id, 0]));
  const matchupCounts = new Map<string, number>();
  const errors: string[] = [];
  const homeAwayBalanceWarnings: string[] = [];
  const duplicateMatchupWarnings: string[] = [];

  schedule.forEach((game, index) => {
    if (!teamIds.has(game.homeTeamId) || !teamIds.has(game.awayTeamId)) errors.push(`Game ${game.id || index} references an invalid team.`);
    if (game.homeTeamId === game.awayTeamId) errors.push(`Game ${game.id || index} has a team playing itself.`);
    if (game.dayIndex < 0 || !Number.isFinite(game.dayIndex)) errors.push(`Game ${game.id || index} has an invalid day index.`);
    if (teamIds.has(game.homeTeamId)) {
      gamesPerTeam[game.homeTeamId] += 1;
      homeGames[game.homeTeamId] += 1;
    }
    if (teamIds.has(game.awayTeamId)) {
      gamesPerTeam[game.awayTeamId] += 1;
      awayGames[game.awayTeamId] += 1;
    }
    const matchupKey = [game.homeTeamId, game.awayTeamId].sort().join("@");
    matchupCounts.set(matchupKey, (matchupCounts.get(matchupKey) ?? 0) + 1);
  });

  Object.entries(gamesPerTeam).forEach(([teamId, count]) => {
    if (count !== ruleSet.gamesPerTeam) errors.push(`${teamId} has ${count} games; expected ${ruleSet.gamesPerTeam}.`);
    const homeAwayDelta = Math.abs((homeGames[teamId] ?? 0) - (awayGames[teamId] ?? 0));
    if (homeAwayDelta > 2) homeAwayBalanceWarnings.push(`${teamId} has a home/away split of ${homeGames[teamId] ?? 0}/${awayGames[teamId] ?? 0}.`);
  });

  const expectedPairCycles = Math.ceil(ruleSet.gamesPerTeam / Math.max(1, teams.length - 1));
  matchupCounts.forEach((count, matchup) => {
    if (count > expectedPairCycles + 1) duplicateMatchupWarnings.push(`${matchup} appears ${count} times.`);
  });

  return {
    valid: errors.length === 0,
    gamesPerTeam,
    totalGames: schedule.length,
    homeAwayBalanceWarnings,
    duplicateMatchupWarnings,
    errors
  };
}

function createRoundRobin(ids: string[]): Array<Array<[string, string]>> {
  const teams = [...ids];
  const rounds: Array<Array<[string, string]>> = [];
  const n = teams.length;

  for (let round = 0; round < n - 1; round += 1) {
    const games: Array<[string, string]> = [];
    for (let i = 0; i < n / 2; i += 1) {
      const home = teams[i];
      const away = teams[n - 1 - i];
      games.push(round % 2 === 0 ? [home, away] : [away, home]);
    }
    rounds.push(games);
    teams.splice(1, 0, teams.pop() as string);
  }

  return rounds;
}

function roundsToSchedule(rounds: Array<Array<[string, string]>>): ScheduleGame[] {
  const schedule: ScheduleGame[] = [];
  rounds.forEach((round, dayIndex) => {
    round.forEach(([homeTeamId, awayTeamId], gameIndex) => {
      schedule.push({
        id: `day-${dayIndex + 1}-game-${gameIndex + 1}`,
        dayIndex,
        date: START_DATE,
        homeTeamId,
        awayTeamId,
        played: false
      });
    });
  });
  return schedule;
}

function rotateRoundHomes(round: Array<[string, string]>, salt: number): Array<[string, string]> {
  return round.map(([home, away], index) => ((index + salt) % 2 === 0 ? [home, away] : [away, home]));
}
