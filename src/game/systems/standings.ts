import type { GameResult, LeagueState, Team } from "../types";

export function applyTeamResult(team: Team, goalsFor: number, goalsAgainst: number, overtimeLoss: boolean): Team {
  const won = goalsFor > goalsAgainst;
  const previousKind = team.record.streak.startsWith("W") ? "W" : team.record.streak.startsWith("L") ? "L" : "";
  const previousCount = Number.parseInt(team.record.streak.slice(1), 10) || 0;
  const streakKind = won ? "W" : "L";
  const streakCount = previousKind === streakKind ? previousCount + 1 : 1;

  return {
    ...team,
    record: {
      wins: team.record.wins + (won ? 1 : 0),
      losses: team.record.losses + (!won && !overtimeLoss ? 1 : 0),
      overtimeLosses: team.record.overtimeLosses + (!won && overtimeLoss ? 1 : 0),
      points: team.record.points + (won ? 2 : overtimeLoss ? 1 : 0),
      goalsFor: team.record.goalsFor + goalsFor,
      goalsAgainst: team.record.goalsAgainst + goalsAgainst,
      streak: `${streakKind}${streakCount}`
    },
    stats: {
      ...team.stats,
      gamesPlayed: team.stats.gamesPlayed + 1
    }
  };
}

export function sortStandings(teams: Team[]): Team[] {
  return [...teams].sort((a, b) => {
    if (b.record.points !== a.record.points) return b.record.points - a.record.points;
    if (b.record.wins !== a.record.wins) return b.record.wins - a.record.wins;
    const aDiff = a.record.goalsFor - a.record.goalsAgainst;
    const bDiff = b.record.goalsFor - b.record.goalsAgainst;
    return bDiff - aDiff;
  });
}

export function recordString(team: Team): string {
  return `${team.record.wins}-${team.record.losses}-${team.record.overtimeLosses}`;
}

export function applyGameToStandings(league: LeagueState, result: GameResult): LeagueState {
  const overtimeLossTeamId = result.finalScore.overtime
    ? result.finalScore.home > result.finalScore.away
      ? result.awayTeamId
      : result.homeTeamId
    : undefined;

  return {
    ...league,
    teams: league.teams.map((team) => {
      if (team.id === result.homeTeamId) {
        return applyTeamResult(team, result.finalScore.home, result.finalScore.away, overtimeLossTeamId === team.id);
      }
      if (team.id === result.awayTeamId) {
        return applyTeamResult(team, result.finalScore.away, result.finalScore.home, overtimeLossTeamId === team.id);
      }
      return team;
    })
  };
}
