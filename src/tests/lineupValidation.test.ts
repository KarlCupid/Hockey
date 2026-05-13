import { describe, expect, it } from "vitest";
import { generateLeague } from "../game/generators/generateLeague";
import { validateLineup } from "../game/systems/lineupValidation";

describe("lineup validation", () => {
  it("catches duplicate players", () => {
    const team = generateLeague("dup").teams[0];
    const duplicate = team.lines.forwardLines[0].lw!;
    team.lines.forwardLines[1].lw = duplicate;

    const result = validateLineup(team);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes("assigned more than once"))).toBe(true);
  });

  it("catches injured players", () => {
    const team = generateLeague("injury").teams[0];
    const injuredId = team.lines.forwardLines[0].lw!;
    team.roster = team.roster.map((player) =>
      player.id === injuredId ? { ...player, injuryStatus: "out", injuryGamesRemaining: 3 } : player
    );

    const result = validateLineup(team);
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes("injured and unavailable"))).toBe(true);
  });

  it("warns on buried stars, starter backups, and exhausted top-six players", () => {
    const team = generateLeague("warnings").teams[0];
    const starId = team.lines.forwardLines[0].lw!;
    const lineThreeId = team.lines.forwardLines[2].lw!;
    team.lines.forwardLines[0].lw = lineThreeId;
    team.lines.forwardLines[2].lw = starId;
    const starterId = team.lines.goalies.starter!;
    const backupId = team.lines.goalies.backup!;
    team.lines.goalies.starter = backupId;
    team.lines.goalies.backup = starterId;
    team.roster = team.roster.map((player) => {
      if (player.id === starId) return { ...player, roleExpectation: "Top Line", fatigue: 84 };
      if (player.id === lineThreeId) return { ...player, fatigue: 84 };
      if (player.id === starterId) return { ...player, roleExpectation: "Starter" };
      return player;
    });

    const result = validateLineup(team);
    expect(result.warnings.some((warning) => warning.includes("expects top-six minutes"))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("starter-level goalie"))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("exhausted"))).toBe(true);
  });
});
