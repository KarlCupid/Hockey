import { describe, expect, it } from "vitest";
import { generateLeague } from "../game/generators/generateLeague";
import { createBenchReport } from "../game/systems/benchReport";
import { getBroadcastLiveState } from "../game/systems/broadcastPresentation";
import { classifyForwardLine } from "../game/systems/lineIdentity";
import { createGameNews } from "../game/systems/news";
import { createPlayerCoachRead, createPlayerManagementRisk } from "../game/systems/playerNotes";
import { createGameResultPresentation } from "../game/systems/resultPresentation";
import { createSeasonPulse } from "../game/systems/seasonSummary";
import { TACTIC_PRESETS, tacticPresetValues } from "../game/systems/tactics";
import { simulateGame } from "../game/simulation/simulateGame";
import type { GameResult, PeriodSimulationResult, Player, Team } from "../game/types";

describe("V1.1 pure systems", () => {
  it("creates state-specific player notes", () => {
    const player = generateLeague("notes").teams[0].roster[0];
    const tired = { ...player, fatigue: 88 };
    const frustrated = { ...player, morale: 38, roleExpectation: "Top Line" as const };

    expect(createPlayerCoachRead(tired)).toContain("Fatigue is climbing");
    expect(createPlayerManagementRisk(frustrated)).toContain("reduced minutes");
  });

  it("classifies scoring, checking, and balanced forward lines", () => {
    const forwards = generateLeague("lines").teams[0].roster.filter((player) => player.position !== "G").slice(0, 3);
    const scoring = forwards.map((player) => skater(player, 86, 78, 62, "Two-Way Forward"));
    const checking = forwards.map((player) => skater(player, 66, 82, 65, "Grinder"));
    const balanced = forwards.map((player) => skater(player, 72, 72, 66, "Playmaker"));

    expect(classifyForwardLine(scoring)).toBe("Scoring Line");
    expect(classifyForwardLine(checking)).toBe("Checking Line");
    expect(classifyForwardLine(balanced)).toBe("Balanced Line");
  });

  it("returns valid tactic preset values", () => {
    Object.keys(TACTIC_PRESETS).forEach((key) => {
      const tactics = tacticPresetValues(key as keyof typeof TACTIC_PRESETS);
      Object.values(tactics).forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      });
    });
  });

  it("resolves result player and team ids into readable names", () => {
    const league = generateLeague("presentation");
    const game = league.schedule[0];
    const home = league.teams.find((team) => team.id === game.homeTeamId)!;
    const away = league.teams.find((team) => team.id === game.awayTeamId)!;
    const result = simulateGame({ game, homeTeam: home, awayTeam: away, seed: "presentation" });
    const presentation = createGameResultPresentation(result, league.teams);

    expect(presentation.scoreboard.homeTeam).toBe(home.fullName);
    expect(presentation.goalieStats[0].goalie).not.toBe(result.goalieStats[0].goalieId);
    expect(presentation.teamComparison.some((row) => row.label === "Power Play")).toBe(true);
  });

  it("gives different bench recommendations for shot deficit, penalties, and fatigue", () => {
    const league = generateLeague("bench");
    const home = withTopLineFatigue(league.teams[0], 84);
    const away = league.teams[1];
    const base = period({ homeShots: 8, awayShots: 14, penalties: [] });
    const shotReport = createBenchReport({ periods: [base], selectedTeamId: home.id, homeTeam: home, awayTeam: away, tactics: home.tactics });
    const penaltyReport = createBenchReport({
      periods: [period({ homeShots: 12, awayShots: 10, penalties: [home.id, home.id] })],
      selectedTeamId: home.id,
      homeTeam: home,
      awayTeam: away,
      tactics: home.tactics
    });
    const fatigueReport = createBenchReport({
      periods: [period({ homeShots: 12, awayShots: 10, penalties: [] })],
      selectedTeamId: home.id,
      homeTeam: home,
      awayTeam: away,
      tactics: { ...home.tactics, offensiveRisk: 35 }
    });

    expect(shotReport?.suggestedAdjustment).toContain("shot volume");
    expect(penaltyReport?.suggestedAdjustment).toContain("penalty");
    expect(fatigueReport?.suggestedAdjustment).toContain("Top line fatigue");
  });

  it("increments broadcast score as goal events are processed", () => {
    const league = generateLeague("broadcast");
    const away = league.teams[0];
    const home = league.teams[1];
    const result = minimalResult(away, home);

    expect(getBroadcastLiveState(result, away, home, 0).awayScore).toBe(0);
    expect(getBroadcastLiveState(result, away, home, 1).awayScore).toBe(1);
    expect(getBroadcastLiveState(result, away, home, 2).homeScore).toBe(1);
  });

  it("creates streak pressure, excitement, injury, and goalie stories", () => {
    const league = generateLeague("news");
    const user = league.teams[0];
    const opponent = league.teams[1];
    const losing = createGameNews(minimalResult(user, opponent, { userLost: true, injury: true, goalieTrouble: true }), { ...user, record: { ...user.record, streak: "L3" } }, opponent, "2026-10-05");
    const winning = createGameNews(minimalResult(user, opponent), { ...user, record: { ...user.record, streak: "W3" } }, opponent, "2026-10-06");

    expect(losing.some((item) => item.type === "pressure")).toBe(true);
    expect(losing.some((item) => item.type === "injury")).toBe(true);
    expect(losing.some((item) => item.type === "goalie")).toBe(true);
    expect(winning.some((item) => item.type === "excitement")).toBe(true);
  });

  it("returns selected team season pulse context", () => {
    const league = generateLeague("season");
    const team = league.teams[0];
    team.record = { ...team.record, wins: 7, losses: 3, overtimeLosses: 1, points: 15, goalsFor: 41, goalsAgainst: 31 };
    team.stats = { ...team.stats, gamesPlayed: 11 };
    team.roster[0].stats = { ...team.roster[0].stats, goals: 9, assists: 12, points: 21 };
    team.roster.find((player) => player.position === "G")!.stats = {
      ...team.roster.find((player) => player.position === "G")!.stats,
      goalieWins: 6,
      saves: 210,
      goalsAgainst: 18
    };
    const pulse = createSeasonPulse(league, team.id);

    expect(pulse.rank).toBeGreaterThan(0);
    expect(pulse.topScorer).toContain(team.roster[0].displayName);
    expect(pulse.bestGoalie).toContain("0.921");
  });
});

function skater(player: Player, offense: number, defense: number, physicality: number, archetype: Player["archetype"]): Player {
  return {
    ...player,
    archetype,
    overall: Math.round((offense + defense) / 2),
    fatigue: 30,
    attributes:
      "shooting" in player.attributes
        ? {
            ...player.attributes,
            shooting: offense,
            passing: offense,
            puckHandling: offense,
            defense,
            hockeyIQ: defense,
            physicality,
            stamina: physicality
          }
        : player.attributes
  };
}

function period(input: { homeShots: number; awayShots: number; penalties: string[] }): PeriodSimulationResult {
  return {
    period: 1,
    homeGoals: 0,
    awayGoals: 0,
    homeShots: input.homeShots,
    awayShots: input.awayShots,
    homePowerPlayAttempts: 0,
    awayPowerPlayAttempts: input.penalties.length,
    homePowerPlayGoals: 0,
    awayPowerPlayGoals: 0,
    goals: [],
    penalties: input.penalties.map((teamId, index) => ({ period: 1, time: `${10 - index}:00`, teamId, playerId: undefined, minutes: 2 })),
    injuries: [],
    events: [{ id: "event-1", type: "momentumSwing", period: 1, time: "8:00", teamId: "team", description: "Bench swings momentum." }],
    playerStatUpdates: [],
    momentum: "The period stayed tight, with neither bench fully taking control."
  };
}

function withTopLineFatigue(team: Team, fatigue: number): Team {
  const topIds = Object.values(team.lines.forwardLines[0]);
  return {
    ...team,
    roster: team.roster.map((player) => (topIds.includes(player.id) ? { ...player, fatigue } : player))
  };
}

function minimalResult(away: Team, home: Team, options: { userLost?: boolean; injury?: boolean; goalieTrouble?: boolean } = {}): GameResult {
  const awayGoalie = away.roster.find((player) => player.position === "G")!;
  const homeGoalie = home.roster.find((player) => player.position === "G")!;
  const awayScorer = away.roster.find((player) => player.position !== "G")!;
  const homeScorer = home.roster.find((player) => player.position !== "G")!;
  const awayScore = options.userLost ? 1 : 3;
  const homeScore = options.userLost ? 4 : 2;
  return {
    id: "minimal",
    gameId: "minimal-game",
    seed: "minimal",
    awayTeamId: away.id,
    homeTeamId: home.id,
    finalScore: { away: awayScore, home: homeScore, overtime: false },
    periodScores: [{ period: 1, away: 1, home: 1 }],
    shots: { away: 29, home: 31 },
    goals: [
      { period: 1, time: "10:00", teamId: away.id, scorerId: awayScorer.id, assistIds: [], powerPlay: false },
      { period: 2, time: "9:00", teamId: home.id, scorerId: homeScorer.id, assistIds: [], powerPlay: false }
    ],
    penalties: [],
    powerPlayAttempts: { away: 1, home: 1 },
    powerPlayGoals: { away: 0, home: 0 },
    goalieStats: [
      {
        goalieId: awayGoalie.id,
        teamId: away.id,
        shotsAgainst: options.goalieTrouble ? 34 : 31,
        saves: options.goalieTrouble ? 29 : 29,
        goalsAgainst: options.goalieTrouble ? 5 : 2,
        win: !options.userLost,
        shutout: false
      },
      { goalieId: homeGoalie.id, teamId: home.id, shotsAgainst: 29, saves: 26, goalsAgainst: 3, win: Boolean(options.userLost), shutout: false }
    ],
    threeStars: [{ playerId: awayScorer.id, teamId: away.id, reason: `${awayScorer.displayName} drove the night.` }],
    injuries: options.injury ? [{ playerId: awayScorer.id, teamId: away.id, gamesRemaining: 2, note: `${awayScorer.displayName} is day-to-day.` }] : [],
    eventTimeline: [
      { id: "goal-a", type: "goal", period: 1, time: "10:00", teamId: away.id, scorerId: awayScorer.id, assistIds: [], description: "Away goal." },
      { id: "goal-h", type: "goal", period: 2, time: "9:00", teamId: home.id, scorerId: homeScorer.id, assistIds: [], description: "Home goal." },
      { id: "final", type: "finalHorn", period: 3, time: "0:00", description: "Final horn sounds." }
    ],
    momentumSummary: "Momentum moved in small bursts.",
    boxScore: {
      away: { teamId: away.id, goals: awayScore, shots: 29, powerPlayGoals: 0, powerPlayAttempts: 1, penaltyMinutes: 0 },
      home: { teamId: home.id, goals: homeScore, shots: 31, powerPlayGoals: 0, powerPlayAttempts: 1, penaltyMinutes: 0 },
      scoringSummary: [],
      penaltySummary: []
    },
    coachNotes: ["Shot volume stayed close."],
    playerStatUpdates: [],
    moraleChanges: [{ playerId: awayScorer.id, amount: 3, reason: "Scored in recent game" }],
    fatigueChanges: [{ playerId: awayScorer.id, amount: 8, reason: "Game workload" }],
    newsEvents: []
  };
}
