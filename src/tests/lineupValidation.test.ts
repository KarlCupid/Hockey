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
});
