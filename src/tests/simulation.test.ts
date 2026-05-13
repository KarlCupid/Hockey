import { describe, expect, it } from "vitest";
import { generateLeague } from "../game/generators/generateLeague";
import { nextGameForTeam, simulateGame } from "../game/simulation/simulateGame";
import { applyGameToStandings } from "../game/systems/standings";

describe("simulation", () => {
  it("produces a valid final score and box score", () => {
    const league = generateLeague("test-score");
    const game = league.schedule[0];
    const home = league.teams.find((team) => team.id === game.homeTeamId)!;
    const away = league.teams.find((team) => team.id === game.awayTeamId)!;
    const result = simulateGame({ game, homeTeam: home, awayTeam: away, seed: "fixed" });

    expect(result.finalScore.home).toBeGreaterThanOrEqual(0);
    expect(result.finalScore.away).toBeGreaterThanOrEqual(0);
    expect(result.boxScore.home.shots).toBe(result.shots.home);
    expect(result.boxScore.away.goals).toBe(result.finalScore.away);
    expect(result.eventTimeline.length).toBeGreaterThan(0);
  });

  it("is deterministic for a given seed", () => {
    const league = generateLeague("test-deterministic");
    const game = nextGameForTeam(league.teams[0].id, league.schedule, 0)!;
    const home = league.teams.find((team) => team.id === game.homeTeamId)!;
    const away = league.teams.find((team) => team.id === game.awayTeamId)!;
    const a = simulateGame({ game, homeTeam: home, awayTeam: away, seed: "repeatable" });
    const b = simulateGame({ game, homeTeam: home, awayTeam: away, seed: "repeatable" });

    expect(a.finalScore).toEqual(b.finalScore);
    expect(a.goals).toEqual(b.goals);
    expect(a.eventTimeline).toEqual(b.eventTimeline);
  });

  it("updates standings after a game", () => {
    const league = generateLeague("test-standings");
    const game = league.schedule[0];
    const home = league.teams.find((team) => team.id === game.homeTeamId)!;
    const away = league.teams.find((team) => team.id === game.awayTeamId)!;
    const result = simulateGame({ game, homeTeam: home, awayTeam: away, seed: "standings" });
    const updated = applyGameToStandings(league, result);
    const updatedHome = updated.teams.find((team) => team.id === home.id)!;
    const updatedAway = updated.teams.find((team) => team.id === away.id)!;

    expect(updatedHome.stats.gamesPlayed).toBe(1);
    expect(updatedAway.stats.gamesPlayed).toBe(1);
    expect(updatedHome.record.points + updatedAway.record.points).toBeGreaterThanOrEqual(2);
  });
});
