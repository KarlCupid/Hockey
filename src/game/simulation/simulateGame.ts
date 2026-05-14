import { SIM_CONSTANTS } from "../constants";
import { SeededRng, clamp } from "../rng";
import { getAssignedPlayerIds, validateLineup } from "../systems/lineupValidation";
import type { GameResult, PeriodSimulationResult, Player, PlayerStatUpdate, ScheduleGame, Tactics, Team } from "../types";
import { createBoxScore } from "./boxScore";
import { sortTimeline } from "./eventTimeline";
import { simulatePeriod } from "./simulatePeriod";

interface SimulateGameOptions {
  game: ScheduleGame;
  homeTeam: Team;
  awayTeam: Team;
  seed: string;
  homeTacticsByPeriod?: Tactics[];
  awayTacticsByPeriod?: Tactics[];
}

export function simulateGame(options: SimulateGameOptions): GameResult {
  const periods: PeriodSimulationResult[] = [];
  let score = { home: 0, away: 0 };

  for (let period = 1; period <= 3; period += 1) {
    const result = simulatePeriod({
      gameId: options.game.id,
      period,
      homeTeam: options.homeTeam,
      awayTeam: options.awayTeam,
      homeTactics: options.homeTacticsByPeriod?.[period - 1] ?? options.homeTeam.tactics,
      awayTactics: options.awayTacticsByPeriod?.[period - 1] ?? options.awayTeam.tactics,
      seed: options.seed,
      scoreBefore: score
    });
    periods.push(result);
    score = { home: score.home + result.homeGoals, away: score.away + result.awayGoals };
  }

  return assembleGameResult(options.game, options.homeTeam, options.awayTeam, options.seed, periods);
}

export function assembleGameResult(
  game: ScheduleGame,
  homeTeam: Team,
  awayTeam: Team,
  seed: string,
  periods: PeriodSimulationResult[]
): GameResult {
  const rng = new SeededRng(`${seed}:finish`);
  let finalHome = periods.reduce((sum, period) => sum + period.homeGoals, 0);
  let finalAway = periods.reduce((sum, period) => sum + period.awayGoals, 0);
  let overtime = false;
  const events = periods.flatMap((period) => period.events);
  const goals = periods.flatMap((period) => period.goals);
  const penalties = periods.flatMap((period) => period.penalties);
  const injuries = periods.flatMap((period) => period.injuries);
  const playerUpdates = mergePlayerUpdates(periods.flatMap((period) => period.playerStatUpdates));

  if (finalHome === finalAway) {
    overtime = true;
    const homeEdge = teamRating(homeTeam) + SIM_CONSTANTS.homeIceBoost;
    const awayEdge = teamRating(awayTeam);
    const homeWins = rng.chance(clamp(0.5 + (homeEdge - awayEdge) / 120, 0.37, 0.63));
    if (homeWins) finalHome += 1;
    else finalAway += 1;
    const winner = homeWins ? homeTeam : awayTeam;
    const scorer = rng.weighted(activeSkaters(winner), (player) => player.overall + player.form * 0.2);
    goals.push({
      period: 4,
      time: "OT",
      teamId: winner.id,
      scorerId: scorer.id,
      assistIds: [],
      powerPlay: false
    });
    incrementUpdate(playerUpdates, scorer, { goals: 1 });
    events.push({
      id: `${game.id}-ot-winner`,
      type: "goal",
      period: 4,
      time: "OT",
      teamId: winner.id,
      scorerId: scorer.id,
      assistIds: [],
      description: `${scorer.displayName} ends it in overtime.`
    });
  }

  const homeShots = periods.reduce((sum, period) => sum + period.homeShots, 0);
  const awayShots = periods.reduce((sum, period) => sum + period.awayShots, 0);
  const homePpAttempts = periods.reduce((sum, period) => sum + period.homePowerPlayAttempts, 0);
  const awayPpAttempts = periods.reduce((sum, period) => sum + period.awayPowerPlayAttempts, 0);
  const homePpGoals = periods.reduce((sum, period) => sum + period.homePowerPlayGoals, 0);
  const awayPpGoals = periods.reduce((sum, period) => sum + period.awayPowerPlayGoals, 0);
  const homeGoalie = selectSimulationStarter(homeTeam);
  const awayGoalie = selectSimulationStarter(awayTeam);

  incrementUpdate(playerUpdates, homeGoalie, {
    gamesPlayed: 1,
    saves: Math.max(0, awayShots - finalAway),
    goalsAgainst: finalAway,
    goalieWins: finalHome > finalAway ? 1 : 0,
    goalieLosses: finalHome < finalAway ? 1 : 0,
    shutouts: finalAway === 0 ? 1 : 0
  });
  incrementUpdate(playerUpdates, awayGoalie, {
    gamesPlayed: 1,
    saves: Math.max(0, homeShots - finalHome),
    goalsAgainst: finalHome,
    goalieWins: finalAway > finalHome ? 1 : 0,
    goalieLosses: finalAway < finalHome ? 1 : 0,
    shutouts: finalHome === 0 ? 1 : 0
  });

  [...activeSkaters(homeTeam), ...activeSkaters(awayTeam)].forEach((player) => {
    incrementUpdate(playerUpdates, player, {
      gamesPlayed: 1,
      hits: rng.int(0, 4),
      blocks: rng.int(0, 3)
    });
  });

  const resultBase: Omit<GameResult, "boxScore"> = {
    id: `${game.id}-${seed}`,
    gameId: game.id,
    seed,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    finalScore: { home: finalHome, away: finalAway, overtime },
    periodScores: periods.map((period) => ({ period: period.period, home: period.homeGoals, away: period.awayGoals })),
    shots: { home: homeShots, away: awayShots },
    goals,
    penalties,
    powerPlayAttempts: { home: homePpAttempts, away: awayPpAttempts },
    powerPlayGoals: { home: homePpGoals, away: awayPpGoals },
    goalieStats: [
      {
        goalieId: homeGoalie.id,
        teamId: homeTeam.id,
        shotsAgainst: awayShots,
        saves: Math.max(0, awayShots - finalAway),
        goalsAgainst: finalAway,
        win: finalHome > finalAway,
        shutout: finalAway === 0
      },
      {
        goalieId: awayGoalie.id,
        teamId: awayTeam.id,
        shotsAgainst: homeShots,
        saves: Math.max(0, homeShots - finalHome),
        goalsAgainst: finalHome,
        win: finalAway > finalHome,
        shutout: finalHome === 0
      }
    ],
    threeStars: createThreeStars(homeTeam, awayTeam, goals, playerUpdates, finalHome > finalAway ? homeTeam.id : awayTeam.id),
    injuries,
    eventTimeline: sortTimeline(events),
    momentumSummary: periods[periods.length - 1]?.momentum ?? "The game settled into a narrow margin.",
    coachNotes: createCoachNotes(homeTeam, awayTeam, finalHome, finalAway, homeShots, awayShots),
    playerStatUpdates: [...playerUpdates.values()],
    moraleChanges: createMoraleChanges(homeTeam, awayTeam, finalHome, finalAway, goals),
    fatigueChanges: createFatigueChanges(homeTeam, awayTeam),
    newsEvents: []
  };

  return {
    ...resultBase,
    boxScore: createBoxScore(resultBase, penalties)
  };
}

export function nextGameForTeam(teamId: string, schedule: ScheduleGame[], currentDayIndex: number): ScheduleGame | undefined {
  return schedule.find(
    (game) => !game.played && game.dayIndex >= currentDayIndex && (game.homeTeamId === teamId || game.awayTeamId === teamId)
  );
}

export function canSimulate(team: Team): string[] {
  return validateLineup(team).errors;
}

function teamRating(team: Team): number {
  const ids = getAssignedPlayerIds(team.lines).filter(Boolean) as string[];
  const players = ids.map((id) => team.roster.find((player) => player.id === id)).filter((player): player is Player => Boolean(player));
  return players.reduce((sum, player) => sum + player.overall, 0) / Math.max(1, players.length);
}

function selectSimulationStarter(team: Team): Player {
  const lineupStarter = team.roster.find((player) => player.id === team.lines.goalies.starter);
  const goalie = team.roster.filter((player) => player.position === "G").sort((a, b) => b.overall - a.overall)[0];
  const emergency = [...team.roster].sort((a, b) => b.overall - a.overall)[0];
  if (!lineupStarter && !goalie && !emergency) throw new Error(`${team.fullName} has no players available for simulation.`);
  return lineupStarter ?? goalie ?? emergency;
}

function activeSkaters(team: Team): Player[] {
  const ids = getAssignedPlayerIds(team.lines).filter(Boolean) as string[];
  return ids
    .map((id) => team.roster.find((player) => player.id === id))
    .filter((player): player is Player => player !== undefined && player.position !== "G");
}

function createThreeStars(
  homeTeam: Team,
  awayTeam: Team,
  goals: GameResult["goals"],
  updates: Map<string, PlayerStatUpdate>,
  winningTeamId: string
): GameResult["threeStars"] {
  const players = [...homeTeam.roster, ...awayTeam.roster];
  return [...updates.values()]
    .map((update) => {
      const player = players.find((candidate) => candidate.id === update.playerId);
      if (!player) return undefined;
      const points = (update.goals ?? 0) * 2 + (update.assists ?? 0) + (update.goalieWins ?? 0) * 2 + (update.shutouts ?? 0) * 4;
      return {
        playerId: update.playerId,
        teamId: update.teamId,
        score: points + (update.teamId === winningTeamId ? 0.5 : 0),
        reason:
          player.position === "G"
            ? `${player.displayName} gave the bench a steady night in goal.`
            : `${player.displayName} drove the scoresheet with ${update.goals ?? 0} goal(s) and ${update.assists ?? 0} assist(s).`
      };
    })
    .filter((item): item is { playerId: string; teamId: string; score: number; reason: string } => Boolean(item))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ playerId, teamId, reason }) => ({ playerId, teamId, reason: goals.length ? reason : "Quiet but reliable game management." }));
}

function createCoachNotes(homeTeam: Team, awayTeam: Team, homeGoals: number, awayGoals: number, homeShots: number, awayShots: number): string[] {
  const notes = [
    homeShots > awayShots + 7
      ? `${homeTeam.fullName} controlled shot volume.`
      : awayShots > homeShots + 7
        ? `${awayTeam.fullName} controlled shot volume.`
        : "Shot volume stayed close enough that details mattered.",
    Math.abs(homeGoals - awayGoals) <= 1 ? "One-goal margins are putting late-game tactics under the microscope." : "The margin gave the staff a clearer read on structure.",
    "Review fatigue before locking the next starting goalie."
  ];
  return notes;
}

function createMoraleChanges(
  homeTeam: Team,
  awayTeam: Team,
  homeGoals: number,
  awayGoals: number,
  goals: GameResult["goals"]
): GameResult["moraleChanges"] {
  const changes: GameResult["moraleChanges"] = [];
  const winner = homeGoals > awayGoals ? homeTeam : awayTeam;
  const loser = winner.id === homeTeam.id ? awayTeam : homeTeam;
  winner.roster.forEach((player) => changes.push({ playerId: player.id, amount: 2, reason: "Team win" }));
  loser.roster.forEach((player) => changes.push({ playerId: player.id, amount: -2, reason: "Team loss" }));
  goals.forEach((goal) => {
    changes.push({ playerId: goal.scorerId, amount: 3, reason: "Scored in recent game" });
  });
  return changes;
}

function createFatigueChanges(homeTeam: Team, awayTeam: Team): GameResult["fatigueChanges"] {
  return [...activeSkaters(homeTeam), ...activeSkaters(awayTeam)].map((player) => ({
    playerId: player.id,
    amount: player.roleExpectation.includes("Top") || player.roleExpectation === "Franchise Driver" ? 8 : 5,
    reason: "Game workload"
  }));
}

function mergePlayerUpdates(updates: PlayerStatUpdate[]): Map<string, PlayerStatUpdate> {
  const map = new Map<string, PlayerStatUpdate>();
  updates.forEach((update) => {
    const existing = map.get(update.playerId) ?? { playerId: update.playerId, teamId: update.teamId };
    map.set(update.playerId, mergeUpdate(existing, update));
  });
  return map;
}

function incrementUpdate(
  updates: Map<string, PlayerStatUpdate>,
  player: Player,
  patch: Omit<PlayerStatUpdate, "playerId" | "teamId">
) {
  const existing = updates.get(player.id) ?? { playerId: player.id, teamId: player.teamId };
  updates.set(player.id, mergeUpdate(existing, patch));
}

function mergeUpdate(update: PlayerStatUpdate, patch: Partial<PlayerStatUpdate>): PlayerStatUpdate {
  const next = { ...update };
  (Object.keys(patch) as Array<keyof PlayerStatUpdate>).forEach((key) => {
    if (key === "playerId" || key === "teamId") return;
    const current = Number(next[key] ?? 0);
    const addition = Number(patch[key] ?? 0);
    (next as Record<string, string | number>)[key] = current + addition;
  });
  return next;
}
