import { SIM_CONSTANTS } from "../constants";
import { SeededRng, clamp } from "../rng";
import { computeLineChemistry, getAssignedPlayerIds } from "../systems/lineupValidation";
import type {
  GameEvent,
  GoalSummary,
  PenaltySummary,
  PeriodSimulationResult,
  Player,
  PlayerStatUpdate,
  Tactics,
  Team
} from "../types";
import { clockFromMinute } from "./eventTimeline";

interface PeriodInput {
  gameId: string;
  period: number;
  homeTeam: Team;
  awayTeam: Team;
  homeTactics: Tactics;
  awayTactics: Tactics;
  seed: string;
  scoreBefore: { home: number; away: number };
}

interface StrengthProfile {
  offense: number;
  defense: number;
  goaltending: number;
  specialTeams: number;
  discipline: number;
  stamina: number;
  chemistry: number;
  activePlayers: Player[];
  skaters: Player[];
  starter: Player;
}

export function simulatePeriod(input: PeriodInput): PeriodSimulationResult {
  const rng = new SeededRng(`${input.seed}:${input.period}:${input.scoreBefore.home}-${input.scoreBefore.away}`);
  const home = profileTeam(input.homeTeam, input.homeTactics, true);
  const away = profileTeam(input.awayTeam, input.awayTactics, false);
  const events: GameEvent[] = [];
  const goals: GoalSummary[] = [];
  const penalties: PenaltySummary[] = [];
  const injuries: PeriodSimulationResult["injuries"] = [];
  const playerStatUpdates = new Map<string, PlayerStatUpdate>();

  const homeShots = shotTotal(home, away, input.homeTactics, rng, true);
  const awayShots = shotTotal(away, home, input.awayTactics, rng, false);
  let homeGoals = 0;
  let awayGoals = 0;
  let homePpAttempts = 0;
  let awayPpAttempts = 0;
  let homePpGoals = 0;
  let awayPpGoals = 0;

  addShotEvents(input, input.homeTeam, home, away, homeShots, true);
  addShotEvents(input, input.awayTeam, away, home, awayShots, false);

  function addShotEvents(periodInput: PeriodInput, shootingTeam: Team, attack: StrengthProfile, defense: StrengthProfile, shots: number, isHome: boolean) {
    for (let i = 0; i < shots; i += 1) {
      const shooter = rng.weighted(attack.skaters, (player) => player.overall + ("shooting" in player.attributes ? player.attributes.shooting : 60));
      const minute = rng.float(0.2, 19.6);
      const chance =
        SIM_CONSTANTS.baseGoalRate +
        (attack.offense - defense.defense) / 1800 +
        (attack.specialTeams - 70) / 5000 -
        defense.goaltending / 3500 +
        (isHome ? 0.004 : 0) +
        rng.float(-0.012, 0.018);
      incrementUpdate(playerStatUpdates, shooter, { shots: 1 });
      if (rng.chance(clamp(chance, 0.028, 0.18))) {
        const assistPool = attack.skaters.filter((player) => player.id !== shooter.id);
        const assistIds = [rng.pick(assistPool).id, rng.pick(assistPool).id].filter((id, index, arr) => arr.indexOf(id) === index);
        const goal: GoalSummary = {
          period: periodInput.period,
          time: clockFromMinute(minute),
          teamId: shootingTeam.id,
          scorerId: shooter.id,
          assistIds,
          powerPlay: false
        };
        goals.push(goal);
        if (isHome) homeGoals += 1;
        else awayGoals += 1;
        incrementUpdate(playerStatUpdates, shooter, { goals: 1 });
        assistIds.forEach((id) => incrementById(playerStatUpdates, attack.activePlayers, id, { assists: 1 }));
        events.push({
          id: `${periodInput.gameId}-p${periodInput.period}-goal-${goals.length}`,
          type: "goal",
          period: periodInput.period,
          time: goal.time,
          teamId: shootingTeam.id,
          scorerId: shooter.id,
          assistIds,
          description: `${shooter.displayName} finishes a dangerous chance for ${shootingTeam.fullName}.`
        });
      } else if (rng.chance(0.24)) {
        events.push({
          id: `${periodInput.gameId}-p${periodInput.period}-save-${events.length}`,
          type: "save",
          period: periodInput.period,
          time: clockFromMinute(minute),
          teamId: shootingTeam.id,
          playerId: shooter.id,
          description: `${defense.starter.displayName} turns away ${shooter.displayName}.`
        });
      }
    }
  }

  [input.homeTeam, input.awayTeam].forEach((team, teamIndex) => {
    const tactics = teamIndex === 0 ? input.homeTactics : input.awayTactics;
    const profile = teamIndex === 0 ? home : away;
    const opponent = teamIndex === 0 ? away : home;
    const attempts = rng.int(0, Math.max(1, Math.round((tactics.physicality + tactics.forecheckIntensity - profile.discipline) / 35 + 1)));
    for (let i = 0; i < attempts; i += 1) {
      if (!rng.chance(0.55)) continue;
      const culprit = rng.weighted(profile.skaters, (player) => 105 - ("discipline" in player.attributes ? player.attributes.discipline : 65));
      const minute = rng.float(1, 19);
      const penalty: PenaltySummary = {
        period: input.period,
        time: clockFromMinute(minute),
        teamId: team.id,
        playerId: culprit.id,
        minutes: rng.chance(0.9) ? 2 : 4
      };
      penalties.push(penalty);
      incrementUpdate(playerStatUpdates, culprit, { penaltyMinutes: penalty.minutes });
      const opponentIsHome = teamIndex === 1;
      if (opponentIsHome) homePpAttempts += 1;
      else awayPpAttempts += 1;
      events.push({
        id: `${input.gameId}-p${input.period}-penalty-${penalties.length}`,
        type: "penalty",
        period: input.period,
        time: penalty.time,
        teamId: team.id,
        playerId: culprit.id,
        minutes: penalty.minutes,
        description: `${culprit.displayName} takes ${penalty.minutes} for a penalty under pressure.`
      });
      const ppGoalChance = clamp((opponent.specialTeams - profile.defense + tactics.specialTeamsAggression * 0.15) / 260 + 0.12, 0.06, 0.34);
      if (rng.chance(ppGoalChance)) {
        const scorer = rng.weighted(opponent.skaters, (player) => player.overall + ("shooting" in player.attributes ? player.attributes.shooting : 60));
        const goal: GoalSummary = {
          period: input.period,
          time: clockFromMinute(Math.min(19.7, minute + rng.float(0.1, 1.8))),
          teamId: teamIndex === 0 ? input.awayTeam.id : input.homeTeam.id,
          scorerId: scorer.id,
          assistIds: [],
          powerPlay: true
        };
        goals.push(goal);
        incrementUpdate(playerStatUpdates, scorer, { goals: 1 });
        if (opponentIsHome) {
          homeGoals += 1;
          homePpGoals += 1;
        } else {
          awayGoals += 1;
          awayPpGoals += 1;
        }
        events.push({
          id: `${input.gameId}-p${input.period}-ppgoal-${goals.length}`,
          type: "powerPlayGoal",
          period: input.period,
          time: goal.time,
          teamId: goal.teamId,
          scorerId: scorer.id,
          assistIds: [],
          description: `${scorer.displayName} converts on the power play.`
        });
      }
    }
  });

  [home, away].forEach((profile, index) => {
    const team = index === 0 ? input.homeTeam : input.awayTeam;
    const tactics = index === 0 ? input.homeTactics : input.awayTactics;
    const risk = SIM_CONSTANTS.injuryBaseChance + Math.max(0, tactics.physicality - 55) / 2800 + Math.max(0, profile.activePlayersAverageFatigue ?? 0) / 5000;
    if (rng.chance(risk)) {
      const player = rng.weighted(profile.skaters, (candidate) => candidate.fatigue + 20);
      const gamesRemaining = rng.int(1, 5);
      const injury = {
        playerId: player.id,
        teamId: team.id,
        gamesRemaining,
        note: `${player.displayName} is listed day-to-day after an awkward collision. Estimated absence: ${gamesRemaining} game(s).`
      };
      injuries.push(injury);
      events.push({
        id: `${input.gameId}-p${input.period}-injury-${injuries.length}`,
        type: "injury",
        period: input.period,
        time: clockFromMinute(rng.float(4, 19)),
        teamId: team.id,
        playerId: player.id,
        gamesRemaining,
        description: injury.note
      });
    }
  });

  if (Math.abs(homeGoals - awayGoals) >= 2 || rng.chance(0.25)) {
    events.push({
      id: `${input.gameId}-p${input.period}-momentum`,
      type: "momentumSwing",
      period: input.period,
      time: clockFromMinute(rng.float(8, 18)),
      teamId: homeGoals >= awayGoals ? input.homeTeam.id : input.awayTeam.id,
      description: homeGoals >= awayGoals ? "Home bench finds momentum through layered pressure." : "Road bench quiets the building with a heavy push."
    });
  }

  events.push({
    id: `${input.gameId}-p${input.period}-intermission`,
    type: input.period >= 3 ? "finalHorn" : "intermission",
    period: input.period,
    time: "0:00",
    description: input.period >= 3 ? "Final horn sounds." : `Intermission after Period ${input.period}.`
  });

  return {
    period: input.period,
    homeGoals,
    awayGoals,
    homeShots,
    awayShots,
    homePowerPlayAttempts: homePpAttempts,
    awayPowerPlayAttempts: awayPpAttempts,
    homePowerPlayGoals: homePpGoals,
    awayPowerPlayGoals: awayPpGoals,
    goals,
    penalties,
    injuries,
    events,
    playerStatUpdates: [...playerStatUpdates.values()],
    momentum:
      homeGoals === awayGoals
        ? "The period stayed tight, with neither bench fully taking control."
        : homeGoals > awayGoals
          ? `${input.homeTeam.nickname} tilted the ice for stretches.`
          : `${input.awayTeam.nickname} found answers away from home.`
  };
}

function profileTeam(team: Team, tactics: Tactics, home: boolean): StrengthProfile & { activePlayersAverageFatigue: number } {
  const activeIds = getAssignedPlayerIds(team.lines).filter(Boolean) as string[];
  const activePlayers = activeIds.map((id) => team.roster.find((player) => player.id === id)).filter((player): player is Player => Boolean(player));
  const skaters = activePlayers.filter((player) => player.position !== "G");
  const starter = team.roster.find((player) => player.id === team.lines.goalies.starter) ?? team.roster.find((player) => player.position === "G")!;
  const avg = (selector: (player: Player) => number, players = skaters) =>
    players.length ? players.reduce((sum, player) => sum + selector(player), 0) / players.length : 60;
  const chemistry =
    team.lines.forwardLines.reduce((sum, line) => sum + computeLineChemistry(team, [line.lw, line.c, line.rw], 2), 0) / 4;
  const fatigue = avg((player) => player.fatigue, activePlayers);
  const morale = avg((player) => player.morale, activePlayers);
  const form = avg((player) => player.form, activePlayers);

  return {
    offense:
      avg((player) => player.overall) +
      avg((player) => ("shooting" in player.attributes ? player.attributes.shooting + player.attributes.passing : player.overall * 2)) / 18 +
      (tactics.offensiveRisk - 50) * 0.08 +
      (tactics.pace - 50) * 0.04 +
      (home ? SIM_CONSTANTS.homeIceBoost : 0) +
      (form - 50) * SIM_CONSTANTS.formScale +
      (morale - 50) * SIM_CONSTANTS.moraleScale,
    defense:
      avg((player) => player.overall) +
      avg((player) => ("defense" in player.attributes ? player.attributes.defense : player.overall)) / 13 +
      (tactics.defensiveStructure - 50) * 0.12 -
      (tactics.offensiveRisk - 50) * 0.04 -
      fatigue * SIM_CONSTANTS.fatiguePenaltyScale,
    goaltending: starter.overall + ("reflexes" in starter.attributes ? (starter.attributes.reflexes + starter.attributes.positioning) / 30 : 0),
    specialTeams: avg((player) => player.overall) + (tactics.specialTeamsAggression - 50) * 0.1 + chemistry * 0.06,
    discipline: avg((player) => ("discipline" in player.attributes ? player.attributes.discipline : 70)) - (tactics.physicality - 50) * 0.15,
    stamina: avg((player) => ("stamina" in player.attributes ? player.attributes.stamina : 70)) - fatigue * 0.25,
    chemistry,
    activePlayers,
    skaters,
    starter,
    activePlayersAverageFatigue: fatigue
  };
}

function shotTotal(attack: StrengthProfile, defense: StrengthProfile, tactics: Tactics, rng: SeededRng, home: boolean): number {
  const base =
    SIM_CONSTANTS.baseShotChance +
    (attack.offense - defense.defense) / 9 +
    (tactics.shotVolume - 50) / 10 +
    (tactics.pace - 50) / 16 +
    (home ? 0.8 : 0) +
    rng.float(-2.2, 3);
  return clamp(Math.round(base), 3, 18);
}

function incrementById(
  updates: Map<string, PlayerStatUpdate>,
  players: Player[],
  playerId: string,
  patch: Omit<PlayerStatUpdate, "playerId" | "teamId">
) {
  const player = players.find((candidate) => candidate.id === playerId);
  if (player) incrementUpdate(updates, player, patch);
}

function incrementUpdate(
  updates: Map<string, PlayerStatUpdate>,
  player: Player,
  patch: Omit<PlayerStatUpdate, "playerId" | "teamId">
) {
  const existing = updates.get(player.id) ?? { playerId: player.id, teamId: player.teamId };
  updates.set(player.id, mergeUpdate(existing, patch));
}

function mergeUpdate(update: PlayerStatUpdate, patch: Omit<PlayerStatUpdate, "playerId" | "teamId">): PlayerStatUpdate {
  const next = { ...update };
  (Object.keys(patch) as Array<keyof typeof patch>).forEach((key) => {
    const current = Number(next[key as keyof PlayerStatUpdate] ?? 0);
    const addition = Number(patch[key] ?? 0);
    (next as Record<string, number | string>)[key] = current + addition;
  });
  return next;
}
