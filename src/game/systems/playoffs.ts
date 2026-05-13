import { simulateGame } from "../simulation/simulateGame";
import { sortStandings } from "./standings";
import type { FranchiseState, GameResult, LeagueState, NewsItem, PlayoffGame, PlayoffSeries, PlayoffState, ScheduleGame, Team } from "../types";

const BEST_OF = 5;
const WINS_TO_ADVANCE = Math.floor(BEST_OF / 2) + 1;

export function createPlayoffState(league: LeagueState): PlayoffState {
  const qualifiedTeamIds = sortStandings(league.teams)
    .slice(0, 8)
    .map((team) => team.id);
  const pairings: Array<[string, string]> = [
    [qualifiedTeamIds[0], qualifiedTeamIds[7]],
    [qualifiedTeamIds[1], qualifiedTeamIds[6]],
    [qualifiedTeamIds[2], qualifiedTeamIds[5]],
    [qualifiedTeamIds[3], qualifiedTeamIds[4]]
  ];
  return {
    qualifiedTeamIds,
    bracket: pairings.map(([high, low], index) => createSeries(1, high, low, index + 1)),
    currentRound: 1,
    completed: false,
    recentPlayoffResults: []
  };
}

export function getCurrentUserPlayoffGame(franchise: FranchiseState): PlayoffGame | undefined {
  const state = franchise.playoffState;
  if (!state || state.completed) return undefined;
  return state.bracket
    .filter((series) => series.round === state.currentRound && !series.completed)
    .flatMap((series) => series.games)
    .find((game) => !game.played && (game.homeTeamId === franchise.selectedTeamId || game.awayTeamId === franchise.selectedTeamId));
}

export function getNextPlayablePlayoffGame(playoffState: PlayoffState | undefined): PlayoffGame | undefined {
  if (!playoffState || playoffState.completed) return undefined;
  return playoffState.bracket
    .filter((series) => series.round === playoffState.currentRound && !series.completed)
    .flatMap((series) => series.games)
    .find((game) => !game.played);
}

export function simulatePlayoffGame(franchise: FranchiseState, gameId: string, seed = `${franchise.franchiseId}-${gameId}`): FranchiseState {
  const game = franchise.playoffState?.bracket.flatMap((series) => series.games).find((candidate) => candidate.id === gameId);
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
  const playoffState = advancePlayoffRound(
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
        const completed = homeWins >= WINS_TO_ADVANCE || awayWins >= WINS_TO_ADVANCE;
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
        headline: championTeamId ? "Champion crowned" : "Playoff game completed",
        details: championTeamId ? `${findTeam(franchise.league, championTeamId).fullName} are league champions.` : scoreLine,
        teamIds: [game.homeTeamId, game.awayTeamId]
      },
      ...franchise.transactionLog
    ].slice(0, 50),
    updatedAt: new Date().toISOString()
  };
}

export function advancePlayoffSeries(playoffState: PlayoffState): PlayoffState {
  return {
    ...playoffState,
    bracket: playoffState.bracket.map((series) => {
      const completed = series.homeWins >= WINS_TO_ADVANCE || series.awayWins >= WINS_TO_ADVANCE;
      return {
        ...series,
        completed,
        winnerTeamId: completed ? (series.homeWins > series.awayWins ? series.homeSeedTeamId : series.awaySeedTeamId) : series.winnerTeamId
      };
    })
  };
}

export function advancePlayoffRound(playoffState: PlayoffState): PlayoffState {
  const current = playoffState.bracket.filter((series) => series.round === playoffState.currentRound);
  if (!current.length || current.some((series) => !series.completed || !series.winnerTeamId)) return playoffState;
  if (playoffState.currentRound >= 3) {
    const championTeamId = current[0]?.winnerTeamId;
    return {
      ...playoffState,
      championTeamId,
      completed: Boolean(championTeamId)
    };
  }
  if (playoffState.bracket.some((series) => series.round === playoffState.currentRound + 1)) return playoffState;
  const seedRank = new Map(playoffState.qualifiedTeamIds.map((teamId, index) => [teamId, index + 1]));
  const remaining = current
    .map((series) => series.winnerTeamId!)
    .sort((a, b) => (seedRank.get(a) ?? 99) - (seedRank.get(b) ?? 99));
  const pairings =
    playoffState.currentRound === 1
      ? [
          [remaining[0], remaining[remaining.length - 1]],
          [remaining[1], remaining[remaining.length - 2]]
        ]
      : [[remaining[0], remaining[1]]];
  const nextRound = playoffState.currentRound + 1;
  return {
    ...playoffState,
    currentRound: nextRound,
    bracket: [...playoffState.bracket, ...pairings.map(([high, low], index) => createSeries(nextRound, high, low, index + 1))]
  };
}

export function getPlayoffChampion(playoffState: PlayoffState): string | undefined {
  return playoffState.completed ? playoffState.championTeamId : undefined;
}

export function createPlayoffNews(franchise: FranchiseState, result: GameResult): NewsItem[] {
  const home = findTeam(franchise.league, result.homeTeamId);
  const away = findTeam(franchise.league, result.awayTeamId);
  const winner = result.finalScore.home > result.finalScore.away ? home : away;
  const champion = franchise.playoffState?.championTeamId;
  return [
    {
      id: `playoff-news-${result.gameId}-${result.id}`,
      type: "playoffs",
      date: franchise.league.currentDate,
      headline: champion ? `Trophy Hall: ${winner.fullName} crowned champions` : `Playoff Desk: ${winner.nickname} take a series swing`,
      body: champion
        ? `${winner.fullName} close the final and move into the champion history board.`
        : `${away.abbreviation} ${result.finalScore.away} @ ${home.abbreviation} ${result.finalScore.home}. The best-of-five board updates immediately.`,
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
  return "Your club has been eliminated. The bracket can continue to the champion.";
}

export function simulatePlayoffsUntil(franchise: FranchiseState, stop: "day" | "round" | "champion", seed = `${franchise.franchiseId}-playoff-auto`): FranchiseState {
  let next = franchise;
  let safety = 0;
  const startingRound = next.playoffState?.currentRound;
  while (next.playoffState && !next.playoffState.completed && safety < 80) {
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

function createSeries(round: number, highSeedTeamId: string, lowSeedTeamId: string, index: number): PlayoffSeries {
  const id = `po-r${round}-s${index}-${highSeedTeamId}-${lowSeedTeamId}`;
  const homePattern = [highSeedTeamId, highSeedTeamId, lowSeedTeamId, lowSeedTeamId, highSeedTeamId];
  return {
    id,
    round,
    homeSeedTeamId: highSeedTeamId,
    awaySeedTeamId: lowSeedTeamId,
    homeWins: 0,
    awayWins: 0,
    bestOf: BEST_OF,
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

function findTeam(league: LeagueState, teamId: string): Team {
  const team = league.teams.find((candidate) => candidate.id === teamId);
  if (!team) throw new Error(`Team not found: ${teamId}`);
  return team;
}
