import type { BoxScore, GameResult, PenaltySummary } from "../types";

export function createBoxScore(result: Omit<GameResult, "boxScore">, penalties: PenaltySummary[]): BoxScore {
  const homePenaltyMinutes = penalties
    .filter((penalty) => penalty.teamId === result.homeTeamId)
    .reduce((sum, penalty) => sum + penalty.minutes, 0);
  const awayPenaltyMinutes = penalties
    .filter((penalty) => penalty.teamId === result.awayTeamId)
    .reduce((sum, penalty) => sum + penalty.minutes, 0);

  return {
    home: {
      teamId: result.homeTeamId,
      goals: result.finalScore.home,
      shots: result.shots.home,
      powerPlayGoals: result.powerPlayGoals.home,
      powerPlayAttempts: result.powerPlayAttempts.home,
      penaltyMinutes: homePenaltyMinutes
    },
    away: {
      teamId: result.awayTeamId,
      goals: result.finalScore.away,
      shots: result.shots.away,
      powerPlayGoals: result.powerPlayGoals.away,
      powerPlayAttempts: result.powerPlayAttempts.away,
      penaltyMinutes: awayPenaltyMinutes
    },
    scoringSummary: result.goals,
    penaltySummary: penalties
  };
}
