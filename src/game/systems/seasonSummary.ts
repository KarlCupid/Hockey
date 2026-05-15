import type { LeagueState, Player, ScheduleGame, Team } from "../types";
import { normalizeLeagueRuleSet } from "./leagueRules";
import { recordString, sortStandings } from "./standings";

export interface SeasonPulse {
  rank: number;
  pointsPace: string;
  fanConfidence: string;
  ownerPatience: string;
  topScorer: string;
  bestGoalie: string;
  biggestConcern: string;
}

export interface SeasonCompleteSummary {
  finalRecord: string;
  leagueRank: number;
  goalsFor: number;
  goalsAgainst: number;
  topScorer: string;
  bestGoalie: string;
  bestWin: string;
  worstLoss: string;
  ownerReaction: string;
  fanReaction: string;
  phaseTwoNote: string;
}

export function createSeasonPulse(league: LeagueState, selectedTeamId: string): SeasonPulse {
  const standings = sortStandings(league.teams);
  const team = standings.find((candidate) => candidate.id === selectedTeamId) ?? standings[0];
  const rank = standings.findIndex((candidate) => candidate.id === team.id) + 1;
  const gamesPlayed = Math.max(1, team.stats.gamesPlayed);
  const ruleSet = normalizeLeagueRuleSet(league.ruleSet);
  const pointsPace = `${Math.round((team.record.points / gamesPlayed) * ruleSet.gamesPerTeam)} pts`;
  const topScorer = bestSkater(team);
  const bestGoalie = bestGoalieFor(team);
  return {
    rank,
    pointsPace,
    fanConfidence: band(team.fanConfidence, "Shaky", "Steady", "Buzzing"),
    ownerPatience: band(team.ownerPatience, "Impatient", "Measuring", "Patient"),
    topScorer: `${topScorer.displayName} (${topScorer.stats.points} pts)`,
    bestGoalie: `${bestGoalie.displayName} (${goalieSavePct(bestGoalie)})`,
    biggestConcern: biggestConcern(team, rank, ruleSet.playoffTeamCount)
  };
}

export function createSeasonCompleteSummary(league: LeagueState, selectedTeamId: string): SeasonCompleteSummary {
  const team = league.teams.find((candidate) => candidate.id === selectedTeamId) ?? league.teams[0];
  const rank = sortStandings(league.teams).findIndex((candidate) => candidate.id === team.id) + 1;
  const ruleSet = normalizeLeagueRuleSet(league.ruleSet);
  const topScorer = bestSkater(team);
  const bestGoalie = bestGoalieFor(team);
  return {
    finalRecord: recordString(team),
    leagueRank: rank,
    goalsFor: team.record.goalsFor,
    goalsAgainst: team.record.goalsAgainst,
    topScorer: `${topScorer.displayName}, ${topScorer.stats.points} points`,
    bestGoalie: `${bestGoalie.displayName}, ${bestGoalie.stats.goalieWins} wins, ${goalieSavePct(bestGoalie)} SV%`,
    bestWin: findExtremeResult(league, team, "best"),
    worstLoss: findExtremeResult(league, team, "worst"),
    ownerReaction:
      rank <= Math.max(2, Math.floor(ruleSet.playoffTeamCount / 2))
        ? "Ownership sees proof of concept, but the next phase needs sharper expectations."
        : "Ownership wants the process to translate into the table sooner.",
    fanReaction: team.fanConfidence >= 60 ? "Fans believe the room is moving forward." : "Fans want a clearer identity by camp.",
    phaseTwoNote: `${ruleSet.label}: top ${ruleSet.playoffTeamCount} playoff line, ${ruleSet.draftRounds} draft rounds, ${ruleSet.gamesPerTeam}-game season.`
  };
}

function bestSkater(team: Team): Player {
  return [...team.roster].filter((player) => player.position !== "G").sort((a, b) => b.stats.points - a.stats.points || b.overall - a.overall)[0];
}

function bestGoalieFor(team: Team): Player {
  return [...team.roster]
    .filter((player) => player.position === "G")
    .sort((a, b) => goalieScore(b) - goalieScore(a))[0];
}

function goalieScore(player: Player): number {
  const shots = player.stats.saves + player.stats.goalsAgainst;
  const savePct = shots > 0 ? player.stats.saves / shots : 0.9;
  return savePct * 100 + player.stats.goalieWins * 2 + player.stats.shutouts * 5 + player.overall * 0.2;
}

function goalieSavePct(player: Player): string {
  const shots = player.stats.saves + player.stats.goalsAgainst;
  return shots > 0 ? (player.stats.saves / shots).toFixed(3) : ".---";
}

function biggestConcern(team: Team, rank: number, playoffTeamCount: number): string {
  const diff = team.record.goalsFor - team.record.goalsAgainst;
  const tired = team.roster.filter((player) => player.fatigue >= 76).length;
  const unhappy = team.roster.filter((player) => player.morale <= 40).length;
  if (rank > playoffTeamCount) return "Standings pressure is ahead of the plan.";
  if (diff < -8) return "Goal differential is asking hard questions.";
  if (tired >= 4) return "Workload is starting to cost the room jump.";
  if (unhappy >= 3) return "Morale needs attention before the schedule bites.";
  return "No single crisis, which means details decide the next climb.";
}

function findExtremeResult(league: LeagueState, team: Team, mode: "best" | "worst"): string {
  const games = league.schedule.filter((game) => game.played && game.result && (game.homeTeamId === team.id || game.awayTeamId === team.id));
  const scored = games.map((game) => resultMargin(league, team, game)).filter((item): item is NonNullable<typeof item> => Boolean(item));
  if (!scored.length) return "No completed result yet";
  const sorted = scored.sort((a, b) => (mode === "best" ? b.margin - a.margin : a.margin - b.margin));
  return sorted[0].label;
}

function resultMargin(league: LeagueState, team: Team, game: ScheduleGame): { margin: number; label: string } | undefined {
  if (!game.result) return undefined;
  const teamIsHome = game.homeTeamId === team.id;
  const goalsFor = teamIsHome ? game.result.homeGoals : game.result.awayGoals;
  const goalsAgainst = teamIsHome ? game.result.awayGoals : game.result.homeGoals;
  const opponentId = teamIsHome ? game.awayTeamId : game.homeTeamId;
  const opponent = league.teams.find((candidate) => candidate.id === opponentId);
  const marker = game.result.overtime ? " OT" : "";
  return {
    margin: goalsFor - goalsAgainst,
    label: `${goalsFor}-${goalsAgainst}${marker} vs ${opponent?.abbreviation ?? "Opponent"}`
  };
}

function band(value: number, low: string, mid: string, high: string): string {
  if (value < 42) return low;
  if (value < 66) return mid;
  return high;
}
