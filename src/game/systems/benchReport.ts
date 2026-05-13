import type { PeriodSimulationResult, Tactics, Team } from "../types";

export interface BenchReport {
  period: number;
  currentScore: string;
  periodShots: string;
  periodEvents: string[];
  momentumNote: string;
  powerPlayNote: string;
  fatigueWarning: string;
  goalieConfidenceNote: string;
  suggestedAdjustment: string;
}

export function createBenchReport({
  periods,
  selectedTeamId,
  homeTeam,
  awayTeam,
  tactics
}: {
  periods: PeriodSimulationResult[];
  selectedTeamId: string;
  homeTeam: Team;
  awayTeam: Team;
  tactics: Tactics;
}): BenchReport | undefined {
  const latest = periods[periods.length - 1];
  if (!latest) return undefined;
  const selectedIsHome = selectedTeamId === homeTeam.id;
  const selectedTeam = selectedIsHome ? homeTeam : awayTeam;
  const score = periods.reduce(
    (total, period) => ({ home: total.home + period.homeGoals, away: total.away + period.awayGoals }),
    { home: 0, away: 0 }
  );
  const selectedGoals = selectedIsHome ? score.home : score.away;
  const opponentGoals = selectedIsHome ? score.away : score.home;
  const selectedShots = selectedIsHome ? latest.homeShots : latest.awayShots;
  const opponentShots = selectedIsHome ? latest.awayShots : latest.homeShots;
  const selectedPpAttempts = selectedIsHome ? latest.homePowerPlayAttempts : latest.awayPowerPlayAttempts;
  const selectedPpGoals = selectedIsHome ? latest.homePowerPlayGoals : latest.awayPowerPlayGoals;
  const opponentPpAttempts = selectedIsHome ? latest.awayPowerPlayAttempts : latest.homePowerPlayAttempts;
  const selectedPenalties = latest.penalties.filter((penalty) => penalty.teamId === selectedTeamId);
  const topLineFatigue = averageAssignedFatigue(selectedTeam, selectedTeam.lines.forwardLines[0] ? Object.values(selectedTeam.lines.forwardLines[0]) : []);
  const goalie = selectedTeam.roster.find((player) => player.id === selectedTeam.lines.goalies.starter);

  return {
    period: latest.period,
    currentScore: `${selectedTeam.nickname} ${selectedGoals}, ${selectedIsHome ? awayTeam.nickname : homeTeam.nickname} ${opponentGoals}`,
    periodShots: `${selectedShots}-${opponentShots}`,
    periodEvents: latest.events.slice(0, 6).map((event) => event.description),
    momentumNote: createMomentumNote(latest, selectedIsHome),
    powerPlayNote: createPowerPlayNote(selectedPpGoals, selectedPpAttempts, opponentPpAttempts, selectedPenalties.length),
    fatigueWarning:
      topLineFatigue >= 78
        ? "Top line fatigue is climbing. Watch the workload."
        : topLineFatigue >= 66
          ? "Top line legs are not fresh, but the room can manage it."
          : "Bench energy is holding up.",
    goalieConfidenceNote: createGoalieConfidenceNote(goalie?.displayName ?? "Your starter", opponentShots, selectedIsHome ? latest.awayGoals : latest.homeGoals),
    suggestedAdjustment: suggestAdjustment({
      selectedGoals,
      opponentGoals,
      selectedShots,
      opponentShots,
      selectedPenalties: selectedPenalties.length,
      opponentPpAttempts,
      topLineFatigue,
      tactics,
      period: latest.period
    })
  };
}

function createMomentumNote(period: PeriodSimulationResult, selectedIsHome: boolean): string {
  const goalEdge = selectedIsHome ? period.homeGoals - period.awayGoals : period.awayGoals - period.homeGoals;
  if (goalEdge > 0) return `Your bench won the scoreboard in the period. ${period.momentum}`;
  if (goalEdge < 0) return `The other bench found the cleaner push. ${period.momentum}`;
  return period.momentum;
}

function createPowerPlayNote(selectedPpGoals: number, selectedPpAttempts: number, opponentPpAttempts: number, selectedPenalties: number): string {
  if (selectedPpAttempts > 0 && selectedPpGoals === 0) return "Power play chances are there; execution still needs a cleaner look.";
  if (selectedPpGoals > 0) return "Special teams gave the bench a lift.";
  if (opponentPpAttempts >= 2 || selectedPenalties >= 2) return "The opponent is drawing penalties. Lower physicality if this keeps up.";
  return "Special teams did not define the period.";
}

function createGoalieConfidenceNote(goalieName: string, shotsAgainst: number, goalsAgainst: number): string {
  if (shotsAgainst >= 13 && goalsAgainst <= 1) return `${goalieName} is holding the game together under pressure.`;
  if (shotsAgainst >= 12) return `${goalieName} is under siege. Defensive structure may need to tighten.`;
  if (goalsAgainst >= 2) return `${goalieName} needs cleaner sightlines from the group in front.`;
  return `${goalieName} looks settled enough for the next period.`;
}

function suggestAdjustment(input: {
  selectedGoals: number;
  opponentGoals: number;
  selectedShots: number;
  opponentShots: number;
  selectedPenalties: number;
  opponentPpAttempts: number;
  topLineFatigue: number;
  tactics: Tactics;
  period: number;
}): string {
  if (input.selectedShots <= input.opponentShots - 4) {
    return "Your shot volume is lagging; consider increasing pace or offensive risk.";
  }
  if (input.selectedPenalties >= 2 || input.opponentPpAttempts >= 2) {
    return "The penalty ledger is getting loud; pull physicality down before it decides the game.";
  }
  if (input.opponentShots >= 13) {
    return "Your goalie is under siege. Defensive structure may need to tighten.";
  }
  if (input.selectedGoals > input.opponentGoals && input.period >= 2 && input.tactics.offensiveRisk > 45) {
    return "You are protecting a lead. Conservative tactics may reduce risk.";
  }
  if (input.topLineFatigue >= 78) {
    return "Top line fatigue is climbing. Lower pace or shot volume for a period.";
  }
  return "Keep the plan balanced and watch the next five minutes before chasing a big adjustment.";
}

function averageAssignedFatigue(team: Team, ids: Array<string | undefined>): number {
  const players = ids
    .map((id) => team.roster.find((player) => player.id === id))
    .filter((player): player is Team["roster"][number] => Boolean(player));
  return players.length ? players.reduce((sum, player) => sum + player.fatigue, 0) / players.length : 0;
}
