import { simulateGame } from "../simulation/simulateGame";
import { normalizeLeagueRuleSet } from "./leagueRules";
import { sortStandings } from "./standings";
import type { FranchiseState, GameResult, LeagueRuleSet, LeagueState, NewsItem, PlayoffGame, PlayoffSeries, PlayoffState, ScheduleGame, Team } from "../types";

export function createPlayoffState(league: LeagueState): PlayoffState {
  const ruleSet = normalizeLeagueRuleSet(league.ruleSet);
  const qualifiedTeamIds = seedPlayoffTeams(league, ruleSet);
  const playInGames = createPlayInGames(qualifiedTeamIds, ruleSet);
  return {
    qualifiedTeamIds,
    bracket: playInGames.length ? [] : createPlayoffBracket(qualifiedTeamIds, ruleSet),
    currentRound: playInGames.length ? 0 : 1,
    format: ruleSet.playoffFormat,
    seriesFormat: ruleSet.playoffSeriesFormat,
    playoffTeamCount: ruleSet.playoffTeamCount,
    byes: ruleSet.playoffFormat === "top6WithByes" ? { 1: qualifiedTeamIds.slice(0, 2) } : undefined,
    playInGames: playInGames.length ? playInGames : undefined,
    completed: false,
    recentPlayoffResults: []
  };
}

export function seedPlayoffTeams(league: LeagueState, ruleSetInput = normalizeLeagueRuleSet(league.ruleSet)): string[] {
  const ruleSet = normalizeLeagueRuleSet(ruleSetInput);
  return sortStandings(league.teams)
    .slice(0, ruleSet.playoffTeamCount)
    .map((team) => team.id);
}

export function createPlayoffBracket(seeds: string[], ruleSetInput: LeagueRuleSet): PlayoffSeries[] {
  const ruleSet = normalizeLeagueRuleSet(ruleSetInput);
  if (ruleSet.playoffFormat === "top4") {
    return [
      createSeries(1, seeds[0], seeds[3], 1, ruleSet.playoffSeriesLength),
      createSeries(1, seeds[1], seeds[2], 2, ruleSet.playoffSeriesLength)
    ].filter(isCompleteSeriesShell);
  }
  if (ruleSet.playoffFormat === "top6WithByes") {
    return [
      createSeries(1, seeds[2], seeds[5], 1, ruleSet.playoffSeriesLength),
      createSeries(1, seeds[3], seeds[4], 2, ruleSet.playoffSeriesLength)
    ].filter(isCompleteSeriesShell);
  }
  const topEightSeeds = seeds.slice(0, 8);
  return [
    createSeries(1, topEightSeeds[0], topEightSeeds[7], 1, ruleSet.playoffSeriesLength),
    createSeries(1, topEightSeeds[1], topEightSeeds[6], 2, ruleSet.playoffSeriesLength),
    createSeries(1, topEightSeeds[2], topEightSeeds[5], 3, ruleSet.playoffSeriesLength),
    createSeries(1, topEightSeeds[3], topEightSeeds[4], 4, ruleSet.playoffSeriesLength)
  ].filter(isCompleteSeriesShell);
}

export function createPlayInGames(seeds: string[], ruleSetInput: LeagueRuleSet): PlayoffGame[] {
  const ruleSet = normalizeLeagueRuleSet(ruleSetInput);
  if (ruleSet.playoffFormat !== "top10WithPlayIn") return [];
  return [
    createPlayInGame(seeds[6], seeds[9], 1),
    createPlayInGame(seeds[7], seeds[8], 2)
  ].filter((game) => Boolean(game.homeTeamId && game.awayTeamId));
}

export function getCurrentUserPlayoffGame(franchise: FranchiseState): PlayoffGame | undefined {
  const state = franchise.playoffState;
  if (!state || state.completed) return undefined;
  return playoffGamesForCurrentStep(state).find((game) => !game.played && (game.homeTeamId === franchise.selectedTeamId || game.awayTeamId === franchise.selectedTeamId));
}

export function getNextPlayoffGame(franchise: FranchiseState): PlayoffGame | undefined {
  return getNextPlayablePlayoffGame(franchise.playoffState);
}

export function getNextPlayablePlayoffGame(playoffState: PlayoffState | undefined): PlayoffGame | undefined {
  if (!playoffState || playoffState.completed) return undefined;
  return playoffGamesForCurrentStep(playoffState).find((game) => !game.played);
}

export function simulatePlayoffGame(franchise: FranchiseState, gameId: string, seed = `${franchise.franchiseId}-${gameId}`): FranchiseState {
  const game = findPlayoffGame(franchise.playoffState, gameId);
  if (!game) return franchise;
  const result = simulateGame({
    game: playoffGameAsSchedule(game, franchise.league.currentDayIndex, franchise.league.currentDate),
    homeTeam: findTeam(franchise.league, game.homeTeamId),
    awayTeam: findTeam(franchise.league, game.awayTeamId),
    seed
  });
  return applyPlayoffGameResult(franchise, game, result);
}

export function applyPlayoffGameResult(franchise: FranchiseState, game: PlayoffGame, result: GameResult): FranchiseState {
  if (!franchise.playoffState) return franchise;
  const home = findTeam(franchise.league, game.homeTeamId);
  const away = findTeam(franchise.league, game.awayTeamId);
  const winnerId = result.finalScore.home > result.finalScore.away ? game.homeTeamId : game.awayTeamId;
  const scoreLine = `${away.abbreviation} ${result.finalScore.away} @ ${home.abbreviation} ${result.finalScore.home}${result.finalScore.overtime ? " OT" : ""}`;
  const basePlayoffState = isPlayInGame(game)
    ? advancePlayIn({
        ...franchise.playoffState,
        playInGames: (franchise.playoffState.playInGames ?? []).map((candidate) =>
          candidate.id === game.id
            ? {
                ...candidate,
                played: true,
                result: {
                  homeGoals: result.finalScore.home,
                  awayGoals: result.finalScore.away,
                  overtime: result.finalScore.overtime
                }
              }
            : candidate
        ),
        recentPlayoffResults: [scoreLine, ...franchise.playoffState.recentPlayoffResults].slice(0, 12)
      }, franchise.league)
    : advancePlayoffRound(
        advancePlayoffSeries({
          ...franchise.playoffState,
          bracket: franchise.playoffState.bracket.map((series) => {
            if (series.id !== game.seriesId) return series;
            const nextGames = series.games.map((candidate) =>
              candidate.id === game.id
                ? {
                    ...candidate,
                    played: true,
                    result: {
                      homeGoals: result.finalScore.home,
                      awayGoals: result.finalScore.away,
                      overtime: result.finalScore.overtime
                    }
                  }
                : candidate
            );
            const homeWins = series.homeWins + (winnerId === series.homeSeedTeamId ? 1 : 0);
            const awayWins = series.awayWins + (winnerId === series.awaySeedTeamId ? 1 : 0);
            const completed = homeWins >= winsToAdvance(series.bestOf) || awayWins >= winsToAdvance(series.bestOf);
            return {
              ...series,
              games: nextGames,
              homeWins,
              awayWins,
              completed,
              winnerTeamId: completed ? (homeWins > awayWins ? series.homeSeedTeamId : series.awaySeedTeamId) : series.winnerTeamId
            };
          }),
          recentPlayoffResults: [scoreLine, ...franchise.playoffState.recentPlayoffResults].slice(0, 12)
        })
      );
  const playoffState = basePlayoffState;
  const news = createPlayoffNews({ ...franchise, playoffState }, result);
  const championTeamId = getPlayoffChampion(playoffState);
  return {
    ...franchise,
    playoffState,
    seasonPhase: championTeamId ? "seasonReview" : "playoffs",
    lastResult: {
      ...result,
      gameId: game.id,
      newsEvents: news
    },
    inbox: [...news, ...franchise.inbox].slice(0, 60),
    transactionLog: [
      {
        id: `playoff-${game.id}`,
        date: franchise.league.currentDate,
        type: "playoffs" as const,
        headline: championTeamId ? "Champion crowned" : isPlayInGame(game) ? "Play-in game completed" : "Playoff game completed",
        details: championTeamId ? `${findTeam(franchise.league, championTeamId).fullName} are league champions.` : scoreLine,
        teamIds: [game.homeTeamId, game.awayTeamId]
      },
      ...franchise.transactionLog
    ].slice(0, 50),
    updatedAt: new Date().toISOString()
  };
}

export function advancePlayIn(playoffState: PlayoffState, league?: LeagueState): PlayoffState {
  const playInGames = playoffState.playInGames ?? [];
  if (!playInGames.length || playInGames.some((game) => !game.played || !game.result)) return playoffState;
  if (playoffState.bracket.length) return playoffState;
  const seedRank = new Map(playoffState.qualifiedTeamIds.map((teamId, index) => [teamId, index + 1]));
  const winners = playInGames.map((game) => (game.result!.homeGoals > game.result!.awayGoals ? game.homeTeamId : game.awayTeamId));
  const topEightSeeds = [...playoffState.qualifiedTeamIds.slice(0, 6), ...winners].sort((a, b) => (seedRank.get(a) ?? 99) - (seedRank.get(b) ?? 99));
  const ruleSet = normalizeLeagueRuleSet(league?.ruleSet ?? {
    playoffFormat: "top8",
    playoffTeamCount: 8,
    playoffSeriesFormat: playoffState.seriesFormat,
    playoffSeriesLength: playoffState.bracket[0]?.bestOf ?? 5
  });
  const bracketRuleSet = {
    ...ruleSet,
    playoffFormat: "top8" as const,
    playoffTeamCount: 8
  };
  return {
    ...playoffState,
    currentRound: 1,
    bracket: createPlayoffBracket(topEightSeeds, bracketRuleSet)
  };
}

export function advancePlayoffSeries(playoffState: PlayoffState): PlayoffState {
  return {
    ...playoffState,
    bracket: playoffState.bracket.map((series) => {
      const completed = series.homeWins >= winsToAdvance(series.bestOf) || series.awayWins >= winsToAdvance(series.bestOf);
      return {
        ...series,
        completed,
        winnerTeamId: completed ? (series.homeWins > series.awayWins ? series.homeSeedTeamId : series.awaySeedTeamId) : series.winnerTeamId
      };
    })
  };
}

export function advancePlayoffRound(playoffState: PlayoffState): PlayoffState {
  if (playoffState.currentRound === 0) return playoffState;
  const current = playoffState.bracket.filter((series) => series.round === playoffState.currentRound);
  if (!current.length || current.some((series) => !series.completed || !series.winnerTeamId)) return playoffState;
  if (current.length === 1) {
    const championTeamId = current[0]?.winnerTeamId;
    return {
      ...playoffState,
      championTeamId,
      completed: Boolean(championTeamId)
    };
  }
  if (playoffState.bracket.some((series) => series.round === playoffState.currentRound + 1)) return playoffState;
  const seedRank = new Map(playoffState.qualifiedTeamIds.map((teamId, index) => [teamId, index + 1]));
  const winners = current.map((series) => series.winnerTeamId!);
  const byeTeams = playoffState.format === "top6WithByes" && playoffState.currentRound === 1 ? playoffState.qualifiedTeamIds.slice(0, 2) : [];
  const remaining = [...byeTeams, ...winners].sort((a, b) => (seedRank.get(a) ?? 99) - (seedRank.get(b) ?? 99));
  const pairings = pairHighLow(remaining);
  const nextRound = playoffState.currentRound + 1;
  return {
    ...playoffState,
    currentRound: nextRound,
    bracket: [...playoffState.bracket, ...pairings.map(([high, low], index) => createSeries(nextRound, high, low, index + 1, current[0]?.bestOf ?? 5))]
  };
}

export function getPlayoffChampion(playoffState: PlayoffState): string | undefined {
  return playoffState.completed ? playoffState.championTeamId : undefined;
}

export function validatePlayoffState(playoffState: PlayoffState, league: LeagueState): string[] {
  const messages: string[] = [];
  const teamIds = new Set(league.teams.map((team) => team.id));
  if (playoffState.playoffTeamCount !== normalizeLeagueRuleSet(league.ruleSet).playoffTeamCount) messages.push("Playoff team count does not match league rules.");
  playoffState.qualifiedTeamIds.forEach((teamId) => {
    if (!teamIds.has(teamId)) messages.push(`Qualified playoff team is invalid: ${teamId}.`);
  });
  [...(playoffState.playInGames ?? []), ...playoffState.bracket.flatMap((series) => series.games)].forEach((game) => {
    if (!teamIds.has(game.homeTeamId) || !teamIds.has(game.awayTeamId)) messages.push(`Playoff game ${game.id} references invalid teams.`);
    if (game.homeTeamId === game.awayTeamId) messages.push(`Playoff game ${game.id} has a team playing itself.`);
  });
  playoffState.bracket.forEach((series) => {
    if (!teamIds.has(series.homeSeedTeamId) || !teamIds.has(series.awaySeedTeamId)) messages.push(`Playoff series ${series.id} references invalid teams.`);
    if (series.bestOf < 1 || series.bestOf % 2 === 0) messages.push(`Playoff series ${series.id} has invalid series length.`);
  });
  return messages;
}

export function createPlayoffNews(franchise: FranchiseState, result: GameResult): NewsItem[] {
  const home = findTeam(franchise.league, result.homeTeamId);
  const away = findTeam(franchise.league, result.awayTeamId);
  const winner = result.finalScore.home > result.finalScore.away ? home : away;
  const champion = franchise.playoffState?.championTeamId;
  const seriesLabel = franchise.playoffState?.seriesFormat === "singleGame" ? "single-game board" : `${franchise.playoffState?.seriesFormat ?? "bestOf5"} board`;
  return [
    {
      id: `playoff-news-${result.gameId}-${result.id}`,
      type: "playoffs",
      date: franchise.league.currentDate,
      headline: champion ? `Trophy Hall: ${winner.fullName} crowned champions` : `Playoff Desk: ${winner.nickname} take a bracket swing`,
      body: champion
        ? `${winner.fullName} close the final and move into the champion history board.`
        : `${away.abbreviation} ${result.finalScore.away} @ ${home.abbreviation} ${result.finalScore.home}. The ${seriesLabel} updates immediately.`,
      severity: champion || winner.id === franchise.selectedTeamId ? "high" : "medium",
      teamId: winner.id
    }
  ];
}

export function describePlayoffResult(franchise: FranchiseState): string {
  if (!franchise.playoffState) return "Playoffs have not started.";
  if (franchise.playoffState.championTeamId) return `${findTeam(franchise.league, franchise.playoffState.championTeamId).fullName} are champions.`;
  const userGame = getCurrentUserPlayoffGame(franchise);
  if (userGame) {
    return `Next user playoff game: ${findTeam(franchise.league, userGame.awayTeamId).abbreviation} @ ${findTeam(franchise.league, userGame.homeTeamId).abbreviation}.`;
  }
  if (!franchise.playoffState.qualifiedTeamIds.includes(franchise.selectedTeamId)) return "Your club missed the playoffs. Sim the bracket to crown a champion.";
  return "Your club has been eliminated or is waiting on the bracket. The bracket can continue to the champion.";
}

export function simulatePlayoffsUntil(franchise: FranchiseState, stop: "day" | "round" | "champion", seed = `${franchise.franchiseId}-playoff-auto`): FranchiseState {
  let next = franchise;
  let safety = 0;
  const startingRound = next.playoffState?.currentRound;
  const maxGames = Math.max(80, (next.playoffState?.playoffTeamCount ?? 8) * (next.league.ruleSet?.playoffSeriesLength ?? 5) * 3);
  while (next.playoffState && !next.playoffState.completed && safety < maxGames) {
    const game = getNextPlayablePlayoffGame(next.playoffState);
    if (!game) break;
    next = simulatePlayoffGame(next, game.id, `${seed}-${game.id}-${safety}`);
    safety += 1;
    if (stop === "day") break;
    if (stop === "round" && next.playoffState?.currentRound !== startingRound) break;
  }
  return next;
}

export function playoffGameAsSchedule(game: PlayoffGame, dayIndex: number, date: string): ScheduleGame {
  return {
    id: game.id,
    dayIndex,
    date,
    homeTeamId: game.homeTeamId,
    awayTeamId: game.awayTeamId,
    played: game.played,
    result: game.result
  };
}

function playoffGamesForCurrentStep(playoffState: PlayoffState): PlayoffGame[] {
  if (playoffState.currentRound === 0) return playoffState.playInGames ?? [];
  return playoffState.bracket.filter((series) => series.round === playoffState.currentRound && !series.completed).flatMap((series) => series.games);
}

function findPlayoffGame(playoffState: PlayoffState | undefined, gameId: string): PlayoffGame | undefined {
  return [...(playoffState?.playInGames ?? []), ...(playoffState?.bracket.flatMap((series) => series.games) ?? [])].find((candidate) => candidate.id === gameId);
}

function createSeries(round: number, highSeedTeamId: string, lowSeedTeamId: string, index: number, bestOf: number): PlayoffSeries {
  const id = `po-r${round}-s${index}-${highSeedTeamId}-${lowSeedTeamId}`;
  const homePattern = homePatternForSeries(highSeedTeamId, lowSeedTeamId, bestOf);
  return {
    id,
    round,
    homeSeedTeamId: highSeedTeamId,
    awaySeedTeamId: lowSeedTeamId,
    homeWins: 0,
    awayWins: 0,
    bestOf,
    games: homePattern.map((homeTeamId, gameIndex) => ({
      id: `${id}-g${gameIndex + 1}`,
      seriesId: id,
      gameNumber: gameIndex + 1,
      homeTeamId,
      awayTeamId: homeTeamId === highSeedTeamId ? lowSeedTeamId : highSeedTeamId,
      played: false
    })),
    completed: false
  };
}

function createPlayInGame(highSeedTeamId: string, lowSeedTeamId: string, index: number): PlayoffGame {
  return {
    id: `play-in-${index}-${highSeedTeamId}-${lowSeedTeamId}`,
    seriesId: "play-in",
    gameNumber: index,
    homeTeamId: highSeedTeamId,
    awayTeamId: lowSeedTeamId,
    played: false
  };
}

function homePatternForSeries(highSeedTeamId: string, lowSeedTeamId: string, bestOf: number): string[] {
  if (bestOf <= 1) return [highSeedTeamId];
  if (bestOf === 3) return [highSeedTeamId, lowSeedTeamId, highSeedTeamId];
  if (bestOf === 7) return [highSeedTeamId, highSeedTeamId, lowSeedTeamId, lowSeedTeamId, highSeedTeamId, lowSeedTeamId, highSeedTeamId];
  return [highSeedTeamId, highSeedTeamId, lowSeedTeamId, lowSeedTeamId, highSeedTeamId];
}

function pairHighLow(teamIds: string[]): Array<[string, string]> {
  const pairings: Array<[string, string]> = [];
  for (let index = 0; index < teamIds.length / 2; index += 1) {
    const high = teamIds[index];
    const low = teamIds[teamIds.length - 1 - index];
    if (high && low) pairings.push([high, low]);
  }
  return pairings;
}

function winsToAdvance(bestOf: number): number {
  return Math.floor(bestOf / 2) + 1;
}

function isPlayInGame(game: PlayoffGame): boolean {
  return game.seriesId === "play-in" || game.id.startsWith("play-in-");
}

function isCompleteSeriesShell(series: PlayoffSeries): boolean {
  return Boolean(series.homeSeedTeamId && series.awaySeedTeamId);
}

function findTeam(league: LeagueState, teamId: string): Team {
  const team = league.teams.find((candidate) => candidate.id === teamId);
  if (!team) throw new Error(`Team not found: ${teamId}`);
  return team;
}
