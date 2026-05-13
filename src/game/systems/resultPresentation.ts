import type { GameEvent, GameResult, NewsItem, Player, Team } from "../types";

export type ResultEventFilter = "all" | "goals" | "penalties" | "injuries" | "momentum" | "saves";

export interface PresentedGameEvent {
  id: string;
  filter: Exclude<ResultEventFilter, "all">;
  period: number;
  time: string;
  team: string;
  player?: string;
  text: string;
}

export interface GameResultPresentation {
  scoreboard: {
    awayTeam: string;
    awayAbbreviation: string;
    homeTeam: string;
    homeAbbreviation: string;
    awayScore: number;
    homeScore: number;
    finalLabel: string;
    periodScores: Array<{ period: string; away: number; home: number }>;
  };
  gameStory: string;
  scoringSummary: Array<{ period: string; time: string; team: string; scorer: string; assists: string; marker: string }>;
  penaltySummary: Array<{ period: string; time: string; team: string; player: string; minutes: number }>;
  goalieStats: Array<{ goalie: string; team: string; saves: number; goalsAgainst: number; shotsAgainst: number; savePercentage: string; decision: string }>;
  threeStars: Array<{ player: string; team: string; reason: string }>;
  teamComparison: Array<{ label: string; away: string | number; home: string | number }>;
  coachingTakeaways: string[];
  consequenceReport: {
    injuries: string[];
    moraleRisers: string[];
    moraleFallers: string[];
    fatigueWarnings: string[];
    news: NewsItem[];
  };
  eventFeed: PresentedGameEvent[];
}

export function createGameResultPresentation(result: GameResult, teams: Team[]): GameResultPresentation {
  const awayTeam = resolveTeam(teams, result.awayTeamId);
  const homeTeam = resolveTeam(teams, result.homeTeamId);
  const players = new Map(teams.flatMap((team) => team.roster.map((player) => [player.id, player] as const)));
  const teamById = new Map(teams.map((team) => [team.id, team]));

  return {
    scoreboard: {
      awayTeam: awayTeam.fullName,
      awayAbbreviation: awayTeam.abbreviation,
      homeTeam: homeTeam.fullName,
      homeAbbreviation: homeTeam.abbreviation,
      awayScore: result.finalScore.away,
      homeScore: result.finalScore.home,
      finalLabel: result.finalScore.overtime ? "Final / OT" : "Final",
      periodScores: result.periodScores.map((period) => ({
        period: period.period === 4 ? "OT" : `P${period.period}`,
        away: period.away,
        home: period.home
      }))
    },
    gameStory: createGameStory(result, awayTeam, homeTeam, players),
    scoringSummary: result.goals.map((goal) => ({
      period: goal.period === 4 ? "OT" : `P${goal.period}`,
      time: goal.time,
      team: teamName(teamById, goal.teamId),
      scorer: playerName(players, goal.scorerId),
      assists: goal.assistIds.length ? goal.assistIds.map((id) => playerName(players, id)).join(", ") : "Unassisted",
      marker: goal.powerPlay ? "PP" : "-"
    })),
    penaltySummary: result.penalties.map((penalty) => ({
      period: `P${penalty.period}`,
      time: penalty.time,
      team: teamName(teamById, penalty.teamId),
      player: penalty.playerId ? playerName(players, penalty.playerId) : "Bench minor",
      minutes: penalty.minutes
    })),
    goalieStats: result.goalieStats.map((goalie) => {
      const savePct = goalie.shotsAgainst > 0 ? goalie.saves / goalie.shotsAgainst : 1;
      return {
        goalie: playerName(players, goalie.goalieId),
        team: teamName(teamById, goalie.teamId),
        saves: goalie.saves,
        goalsAgainst: goalie.goalsAgainst,
        shotsAgainst: goalie.shotsAgainst,
        savePercentage: savePct.toFixed(3),
        decision: `${goalie.win ? "W" : "L"}${goalie.shutout ? " / SO" : ""}`
      };
    }),
    threeStars: result.threeStars.map((star) => ({
      player: playerName(players, star.playerId),
      team: teamName(teamById, star.teamId),
      reason: star.reason
    })),
    teamComparison: createTeamComparison(result),
    coachingTakeaways: [...result.coachNotes, ...createTacticalTakeaways(result, awayTeam, homeTeam)],
    consequenceReport: createConsequenceReport(result, players),
    eventFeed: result.eventTimeline.map((event) => presentEvent(event, players, teamById))
  };
}

export function filterPresentedEvents(events: PresentedGameEvent[], filter: ResultEventFilter): PresentedGameEvent[] {
  if (filter === "all") return events;
  return events.filter((event) => event.filter === filter);
}

function createGameStory(result: GameResult, awayTeam: Team, homeTeam: Team, players: Map<string, Player>): string {
  const awayWon = result.finalScore.away > result.finalScore.home;
  const winner = awayWon ? awayTeam : homeTeam;
  const loser = awayWon ? homeTeam : awayTeam;
  const winnerGoals = awayWon ? result.finalScore.away : result.finalScore.home;
  const loserGoals = awayWon ? result.finalScore.home : result.finalScore.away;
  const margin = Math.abs(winnerGoals - loserGoals);
  const shotDiff = result.shots.away - result.shots.home;
  const bestGoalie = [...result.goalieStats].sort((a, b) => b.saves - b.goalsAgainst * 3 - (a.saves - a.goalsAgainst * 3))[0];
  const sentences = [
    `${winner.fullName} ${result.finalScore.overtime ? "needed overtime to edge" : margin >= 4 ? "rolled past" : "beat"} ${loser.fullName} ${winnerGoals}-${loserGoals}.`
  ];

  if (margin <= 1) sentences.push("The game stayed close enough that every late shift carried consequences.");
  if (margin >= 4) sentences.push("The margin turned the third period into a long audit of structure and compete level.");
  if (Math.abs(shotDiff) >= 8) {
    const shotTeam = shotDiff > 0 ? awayTeam : homeTeam;
    sentences.push(`${shotTeam.fullName} owned the shot clock ${result.shots.away}-${result.shots.home}.`);
  }
  if (bestGoalie) {
    sentences.push(`${playerName(players, bestGoalie.goalieId)} faced ${bestGoalie.shotsAgainst} shots and finished at ${bestGoalie.saves} saves.`);
  }
  if (result.powerPlayGoals.away + result.powerPlayGoals.home > 0) {
    sentences.push("Special teams found the scoresheet and changed the bench temperature.");
  }
  if (result.injuries.length) sentences.push("The medical board also changed after the final horn.");
  return sentences.slice(0, 4).join(" ");
}

function createTeamComparison(result: GameResult): GameResultPresentation["teamComparison"] {
  const awayGoalie = result.goalieStats.find((goalie) => goalie.teamId === result.awayTeamId);
  const homeGoalie = result.goalieStats.find((goalie) => goalie.teamId === result.homeTeamId);
  const savePct = (goalie?: GameResult["goalieStats"][number]) =>
    goalie && goalie.shotsAgainst > 0 ? (goalie.saves / goalie.shotsAgainst).toFixed(3) : "1.000";
  const awayPim = result.penalties.filter((penalty) => penalty.teamId === result.awayTeamId).reduce((sum, penalty) => sum + penalty.minutes, 0);
  const homePim = result.penalties.filter((penalty) => penalty.teamId === result.homeTeamId).reduce((sum, penalty) => sum + penalty.minutes, 0);
  return [
    { label: "Goals", away: result.finalScore.away, home: result.finalScore.home },
    { label: "Shots", away: result.shots.away, home: result.shots.home },
    { label: "Power Play", away: `${result.powerPlayGoals.away}/${result.powerPlayAttempts.away}`, home: `${result.powerPlayGoals.home}/${result.powerPlayAttempts.home}` },
    { label: "Penalty Minutes", away: awayPim, home: homePim },
    { label: "Goalie SV%", away: savePct(awayGoalie), home: savePct(homeGoalie) }
  ];
}

function createTacticalTakeaways(result: GameResult, awayTeam: Team, homeTeam: Team): string[] {
  const notes: string[] = [];
  const shotDiff = result.shots.away - result.shots.home;
  if (Math.abs(shotDiff) >= 8) {
    notes.push(`${shotDiff > 0 ? awayTeam.nickname : homeTeam.nickname} drove shot volume; the other bench needs cleaner exits or more pace.`);
  }
  const awayPim = result.penalties.filter((penalty) => penalty.teamId === result.awayTeamId).reduce((sum, penalty) => sum + penalty.minutes, 0);
  const homePim = result.penalties.filter((penalty) => penalty.teamId === result.homeTeamId).reduce((sum, penalty) => sum + penalty.minutes, 0);
  if (awayPim >= 6 || homePim >= 6) notes.push("Penalty minutes shaped the rhythm; physical pressure needs tighter discipline.");
  if (result.powerPlayAttempts.away + result.powerPlayAttempts.home > 0 && result.powerPlayGoals.away + result.powerPlayGoals.home === 0) {
    notes.push("Special teams chances were available, but neither staff turned them into separation.");
  }
  return notes.slice(0, 3);
}

function createConsequenceReport(result: GameResult, players: Map<string, Player>): GameResultPresentation["consequenceReport"] {
  const moraleRisers = result.moraleChanges
    .filter((change) => change.amount >= 3)
    .slice(0, 3)
    .map((change) => `${playerName(players, change.playerId)} +${change.amount}: ${change.reason}`);
  const moraleFallers = result.moraleChanges
    .filter((change) => change.amount <= -2)
    .slice(0, 3)
    .map((change) => `${playerName(players, change.playerId)} ${change.amount}: ${change.reason}`);
  return {
    injuries: result.injuries.map((injury) => `${playerName(players, injury.playerId)}: ${injury.note}`),
    moraleRisers,
    moraleFallers,
    fatigueWarnings: result.fatigueChanges
      .filter((change) => change.amount >= 8)
      .slice(0, 4)
      .map((change) => `${playerName(players, change.playerId)} workload +${change.amount}: ${change.reason}`),
    news: result.newsEvents
  };
}

function presentEvent(event: GameEvent, players: Map<string, Player>, teamById: Map<string, Team>): PresentedGameEvent {
  const teamId = "teamId" in event ? event.teamId : undefined;
  const playerId = "playerId" in event ? event.playerId : "scorerId" in event ? event.scorerId : undefined;
  return {
    id: event.id,
    filter: eventFilter(event),
    period: event.period,
    time: event.time,
    team: teamId ? teamName(teamById, teamId) : "Game operations",
    player: playerId ? playerName(players, playerId) : undefined,
    text: event.description
  };
}

function eventFilter(event: GameEvent): Exclude<ResultEventFilter, "all"> {
  if (event.type === "goal" || event.type === "powerPlayGoal") return "goals";
  if (event.type === "penalty" || event.type === "powerPlayStart") return "penalties";
  if (event.type === "injury") return "injuries";
  if (event.type === "save" || event.type === "goalieHighlight" || event.type === "shot") return "saves";
  return "momentum";
}

function resolveTeam(teams: Team[], teamId: string): Team {
  return teams.find((team) => team.id === teamId) ?? teams[0];
}

function teamName(teamById: Map<string, Team>, teamId: string): string {
  return teamById.get(teamId)?.fullName ?? "Unlisted Team";
}

function playerName(players: Map<string, Player>, playerId: string): string {
  return players.get(playerId)?.displayName ?? "Unlisted Player";
}
