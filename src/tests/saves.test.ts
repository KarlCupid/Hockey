import { describe, expect, it } from "vitest";
import { createFranchise } from "../game/generators/generateLeague";
import { deserializeFranchise, serializeFranchise } from "../game/systems/saves";

describe("save serialization", () => {
  it("preserves core franchise state", () => {
    const franchise = createFranchise("harbor-city", "save-test");
    const restored = deserializeFranchise(serializeFranchise(franchise));

    expect(restored.selectedTeamId).toBe(franchise.selectedTeamId);
    expect(restored.league.teams.length).toBe(12);
    expect(restored.league.schedule.length).toBe(franchise.league.schedule.length);
    expect(restored.inbox[0].headline).toBe(franchise.inbox[0].headline);
  });
});
