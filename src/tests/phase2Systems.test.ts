import { describe, expect, it } from "vitest";
import { createFranchise, generateLeague } from "../game/generators/generateLeague";
import { generateDraftClass } from "../game/generators/generateDraftClass";
import { SeededRng } from "../game/rng";
import { calculateTeamCapHit, createContractForPlayer, getCapWarnings } from "../game/systems/contracts";
import { generateInitialDraftPicks, transferPick } from "../game/systems/draftPicks";
import { assignDevelopmentPlan, calculateDevelopmentProgress, tickDevelopment } from "../game/systems/development";
import { getVisibleProspectReport, generateScoutingAssignments, tickScouting, toggleWatchlist } from "../game/systems/scouting";
import { applyTrade, calculatePickTradeValue, calculatePlayerTradeValue, evaluateTrade } from "../game/systems/trades";
import { deserializeFranchise, serializeFranchise } from "../game/systems/saves";
import type { DevelopmentPlan, FranchiseState, Player, Team, TradeProposal } from "../game/types";

describe("Phase 2 contracts and draft picks", () => {
  it("generates valid structured contracts", () => {
    const player = generateLeague("contract-valid").teams[0].roster[0];
    const contract = createContractForPlayer(player, new SeededRng("contract-valid"));

    expect(contract.salary).toBeGreaterThanOrEqual(775_000);
    expect(contract.capHit).toBeGreaterThanOrEqual(775_000);
    expect(contract.yearsRemaining).toBeGreaterThanOrEqual(1);
    expect(["UFA", "RFA", "Prospect"]).toContain(contract.expiryStatus);
  });

  it("sums team cap hit from player contracts and warns near or over ceiling", () => {
    const team = generateLeague("cap-hit").teams[0];
    const expected = team.roster.reduce((sum, player) => sum + player.contract.capHit, 0);
    expect(calculateTeamCapHit(team)).toBe(expected);

    const overCap = { ...team, capCeiling: expected - 1 };
    expect(getCapWarnings(overCap).some((warning) => warning.includes("over the cap"))).toBe(true);
  });

  it("gives every generated team four rounds for current and next season", () => {
    const league = generateLeague("pick-generation");
    league.teams.forEach((team) => {
      expect(team.draftPicks).toHaveLength(8);
      expect(team.draftPicks.filter((pick) => pick.seasonYear === league.seasonYear)).toHaveLength(4);
      expect(team.draftPicks.filter((pick) => pick.seasonYear === league.seasonYear + 1)).toHaveLength(4);
    });

    expect(generateInitialDraftPicks(league.teams, league.seasonYear)).toHaveLength(96);
  });

  it("transfers pick ownership between teams", () => {
    const league = generateLeague("pick-transfer");
    const from = league.teams[0];
    const to = league.teams[1];
    const pick = from.draftPicks[0];
    const transferred = transferPick(pick.id, from, to);

    expect(transferred.fromTeam.draftPicks.some((candidate) => candidate.id === pick.id)).toBe(false);
    expect(transferred.toTeam.draftPicks.find((candidate) => candidate.id === pick.id)?.ownerTeamId).toBe(to.id);
  });
});

describe("Phase 2 trades", () => {
  it("values young high-potential stars above low-overall depth players", () => {
    const league = generateLeague("player-value");
    const team = league.teams[0];
    const star = { ...team.roster[0], age: 21, overall: 90, potential: 95 };
    const depth = { ...team.roster[team.roster.length - 1], age: 32, overall: 62, potential: 64, roleExpectation: "Depth" as const };

    expect(calculatePlayerTradeValue(star, team, league)).toBeGreaterThan(calculatePlayerTradeValue(depth, team, league));
  });

  it("values first-round picks above fourth-round picks", () => {
    const league = generateLeague("pick-value");
    const team = league.teams[0];
    const first = team.draftPicks.find((pick) => pick.round === 1)!;
    const fourth = team.draftPicks.find((pick) => pick.round === 4)!;

    expect(calculatePickTradeValue(first, league)).toBeGreaterThan(calculatePickTradeValue(fourth, league));
  });

  it("rejects cap-invalid trades", () => {
    const league = generateLeague("cap-invalid");
    const from = league.teams[0];
    const to = league.teams[1];
    const expensive = [...to.roster].sort((a, b) => b.contract.capHit - a.contract.capHit)[0];
    const cheap = [...from.roster].sort((a, b) => a.contract.capHit - b.contract.capHit)[0];
    const constrainedFrom = { ...from, capCeiling: calculateTeamCapHit(from) + expensive.contract.capHit - cheap.contract.capHit - 1 };
    const proposal = proposalFor(constrainedFrom, to, [playerAsset(constrainedFrom, cheap)], [playerAsset(to, expensive)]);

    expect(evaluateTrade(proposal, { ...league, teams: [constrainedFrom, to, ...league.teams.slice(2)] }).capValid).toBe(false);
  });

  it("accepts a clearly favorable valid package", () => {
    const league = generateLeague("favorable-trade");
    const from = { ...league.teams[0], capCeiling: 200_000_000 };
    const to = { ...league.teams[1], capCeiling: 200_000_000 };
    const star = [...from.roster].sort((a, b) => b.overall - a.overall)[0];
    const latePick = to.draftPicks.find((pick) => pick.round === 4)!;
    const proposal = proposalFor(from, to, [playerAsset(from, star)], [{ type: "pick", teamId: to.id, assetId: latePick.id }]);

    expect(evaluateTrade(proposal, { ...league, teams: [from, to, ...league.teams.slice(2)] }).accepted).toBe(true);
  });

  it("applies accepted trades to players and picks", () => {
    const franchise = createFranchise("harbor-city", "apply-trade");
    const from = { ...franchise.league.teams[0], capCeiling: 200_000_000 };
    const to = { ...franchise.league.teams[1], capCeiling: 200_000_000 };
    const player = [...from.roster].sort((a, b) => b.overall - a.overall)[0];
    const pick = to.draftPicks.find((candidate) => candidate.round === 4)!;
    const adjusted: FranchiseState = {
      ...franchise,
      league: { ...franchise.league, teams: [from, to, ...franchise.league.teams.slice(2)] }
    };
    const next = applyTrade(proposalFor(from, to, [playerAsset(from, player)], [{ type: "pick", teamId: to.id, assetId: pick.id }]), adjusted);
    const newFrom = next.league.teams.find((team) => team.id === from.id)!;
    const newTo = next.league.teams.find((team) => team.id === to.id)!;

    expect(newTo.roster.find((candidate) => candidate.id === player.id)?.teamId).toBe(to.id);
    expect(newFrom.draftPicks.find((candidate) => candidate.id === pick.id)?.ownerTeamId).toBe(from.id);
  });
});

describe("Phase 2 scouting", () => {
  it("generates a 72-player fictional draft class", () => {
    const draftClass = generateDraftClass("draft-class");
    expect(draftClass).toHaveLength(72);
    expect(draftClass[0].displayName).not.toMatch(/NHL|Maple Leafs|Canadiens|Rangers/i);
  });

  it("ticks scouting certainty and viewings forward", () => {
    const league = generateLeague("scouting-tick");
    const draftClass = generateDraftClass("scouting-tick");
    const state = {
      draftClass,
      assignments: [{ ...generateScoutingAssignments()[0], assignedProspectId: draftClass[0].id, progress: 95 }],
      watchlist: [],
      teamDraftBoard: draftClass.map((prospect) => prospect.id),
      lastScoutingTickDayIndex: -1
    };
    const result = tickScouting(state, league, 1, new SeededRng("scouting-tick"));
    const updated = result.state.draftClass[0];

    expect(updated.scouting.certainty).toBeGreaterThan(draftClass[0].scouting.certainty);
    expect(updated.scouting.viewings).toBeGreaterThan(draftClass[0].scouting.viewings);
  });

  it("visible prospect reports hide actual ratings", () => {
    const report = getVisibleProspectReport(generateDraftClass("visible")[0]);
    expect("actualOverall" in report).toBe(false);
    expect(report.scouting.estimatedOverallLow).toBeLessThanOrEqual(report.scouting.estimatedOverallHigh);
  });

  it("toggles watchlist entries", () => {
    const draftClass = generateDraftClass("watchlist");
    const state = {
      draftClass,
      assignments: generateScoutingAssignments(),
      watchlist: [],
      teamDraftBoard: draftClass.map((prospect) => prospect.id),
      lastScoutingTickDayIndex: 0
    };
    const watched = toggleWatchlist(state, draftClass[0].id);
    const removed = toggleWatchlist(watched, draftClass[0].id);

    expect(watched.watchlist).toContain(draftClass[0].id);
    expect(removed.watchlist).not.toContain(draftClass[0].id);
  });
});

describe("Phase 2 development and saves", () => {
  it("creates or updates development plans", () => {
    const franchise = createFranchise("harbor-city", "development-plan");
    const player = franchise.league.teams[0].roster[0];
    const created = assignDevelopmentPlan(franchise.development, { playerId: player.id, focus: "Skating", intensity: "Normal", dayIndex: 0 });
    const updated = assignDevelopmentPlan(created, { playerId: player.id, focus: "Leadership", intensity: "Light", dayIndex: 1 });

    expect(created.plans).toHaveLength(1);
    expect(updated.plans[0].focus).toBe("Leadership");
  });

  it("ticks development progress forward", () => {
    const franchise = createFranchise("harbor-city", "development-tick");
    const player = franchise.league.teams[0].roster[0];
    const state = assignDevelopmentPlan(franchise.development, { playerId: player.id, focus: "Skating", intensity: "Normal", dayIndex: 0 });
    const result = tickDevelopment(state, franchise.league, 1, new SeededRng("development-tick"));

    expect(result.development.plans[0].progress).toBeGreaterThan(0);
  });

  it("gives young high-potential players better development progress than old low-potential players", () => {
    const league = generateLeague("development-curve");
    const base = league.teams[0].roster[0];
    const young = { ...base, age: 20, overall: 70, potential: 90, morale: 70, form: 70, fatigue: 20 };
    const old = { ...base, age: 35, overall: 70, potential: 70, morale: 45, form: 40, fatigue: 80 };
    const plan: DevelopmentPlan = { playerId: base.id, focus: "Skating", intensity: "Normal", progress: 0, lastUpdatedDayIndex: 0, note: "" };

    expect(calculateDevelopmentProgress(young, plan, new SeededRng("young"))).toBeGreaterThan(calculateDevelopmentProgress(old, plan, new SeededRng("old")));
  });

  it("represents aggressive workload fatigue or morale risk", () => {
    const franchise = createFranchise("harbor-city", "development-risk");
    const team = franchise.league.teams[0];
    const player = team.roster[0];
    const state = assignDevelopmentPlan(franchise.development, { playerId: player.id, focus: "Skating", intensity: "Aggressive", dayIndex: 0 });
    const result = tickDevelopment(state, franchise.league, 1, new SeededRng("development-risk"));
    const updated = result.league.teams[0].roster.find((candidate) => candidate.id === player.id)!;

    expect(updated.fatigue).toBeGreaterThan(player.fatigue);
  });

  it("hydrates older V1.1-style saves with Phase 2 fields", () => {
    const franchise = createFranchise("harbor-city", "legacy-save");
    const legacy = JSON.parse(JSON.stringify(franchise)) as FranchiseState;
    legacy.schemaVersion = 1;
    delete (legacy as Partial<FranchiseState>).scouting;
    delete (legacy as Partial<FranchiseState>).development;
    delete (legacy as Partial<FranchiseState>).tradeHistory;
    delete (legacy as Partial<FranchiseState>).transactionLog;
    legacy.league.teams.forEach((team) => {
      delete (team as Partial<Team>).draftPicks;
      delete (team as Partial<Team>).teamNeeds;
      delete (team as Partial<Team>).tradeBlock;
      delete (team as Partial<Team>).untouchables;
      team.roster.forEach((player) => delete (player as Partial<Player>).contract);
    });

    const restored = deserializeFranchise(JSON.stringify(legacy));
    expect(restored.schemaVersion).toBe(7);
    expect(restored.scouting.draftClass).toHaveLength(72);
    expect(restored.league.teams[0].draftPicks).toHaveLength(8);
    expect(restored.league.teams[0].roster[0].contract.capHit).toBeGreaterThan(0);
  });

  it("keeps Phase 2 save state serializable", () => {
    const franchise = createFranchise("harbor-city", "serializable-phase2");
    const restored = deserializeFranchise(serializeFranchise(franchise));
    const plain = JSON.parse(JSON.stringify(restored)) as FranchiseState;

    expect(plain.scouting.draftClass.length).toBe(72);
    expect(plain.development.plans).toEqual([]);
    expect(plain.league.teams[0].draftPicks[0].ownerTeamId).toBe(plain.league.teams[0].id);
  });
});

function playerAsset(team: Team, player: Player) {
  return { type: "player" as const, teamId: team.id, assetId: player.id };
}

function proposalFor(from: Team, to: Team, assetsFrom: TradeProposal["assetsFrom"], assetsTo: TradeProposal["assetsTo"]): TradeProposal {
  return {
    id: `proposal-${from.id}-${to.id}-${assetsFrom.length}-${assetsTo.length}`,
    fromTeamId: from.id,
    toTeamId: to.id,
    assetsFrom,
    assetsTo,
    createdDayIndex: 0,
    status: "draft"
  };
}
