import { describe, expect, it } from "vitest";
import { createFranchise } from "../game/generators/generateLeague";
import { SeededRng } from "../game/rng";
import { createContractForPlayer } from "../game/systems/contracts";
import { evaluateContractOffer, applyAcceptedContractOffer, createContractDemand, keepUnsignedRFAsAsRights, releaseUnsignedUFAsToMarket } from "../game/systems/contractNegotiation";
import { transferPick } from "../game/systems/draftPicks";
import { autoCompleteDraft, createDraftOrder, getCurrentPick, makeUserDraftSelection, resolveDraftLottery } from "../game/systems/draftExecution";
import { applyFreeAgentSigning, advanceFreeAgencyDay, createFreeAgentMarket } from "../game/systems/freeAgency";
import { createAwards, createFranchiseTimeline, createSeasonHistory } from "../game/systems/history";
import { generateOwnerGoals, updateOwnerGoalProgress } from "../game/systems/owner";
import { agePlayers, decrementContracts, prepareNextSeason, completeRegularSeason, validateDynastyState, archiveSeasonHistory } from "../game/systems/seasonLifecycle";
import { createPlayoffState, advancePlayoffRound, advancePlayoffSeries, applyPlayoffGameResult, simulatePlayoffsUntil } from "../game/systems/playoffs";
import { recoverFatigueAndInjuries, resetPlayerSeasonStats, runRetirements, applyOffseasonDevelopment } from "../game/systems/playerLifecycle";
import { createPlayerFromProspectRights, signProspect } from "../game/systems/prospects";
import { calculateTeamStaffModifiers, generateStaffForLeague, hireStaff } from "../game/systems/staff";
import { tickScouting } from "../game/systems/scouting";
import { deserializeFranchise, serializeFranchise } from "../game/systems/saves";
import { simulateGame } from "../game/simulation/simulateGame";
import { emptyStats } from "../game/generators/generatePlayers";
import type { ContractOffer, FranchiseState, Player, Team } from "../game/types";

describe("Phase 3 season lifecycle and saves", () => {
  it("hydrates existing Phase 2 state with dynasty defaults", () => {
    const legacy = JSON.parse(JSON.stringify(createFranchise("harbor-city", "phase3-legacy"))) as FranchiseState;
    legacy.schemaVersion = 2;
    delete (legacy as Partial<FranchiseState>).seasonPhase;
    delete (legacy as Partial<FranchiseState>).ownerState;
    delete (legacy as Partial<FranchiseState>).staffState;
    delete (legacy as Partial<FranchiseState>).history;
    delete (legacy as Partial<FranchiseState>).prospectPools;

    const restored = deserializeFranchise(JSON.stringify(legacy));

    expect(restored.schemaVersion).toBe(5);
    expect(restored.seasonPhase).toBe("regularSeason");
    expect(restored.ownerState.seasonGoals).toHaveLength(3);
    expect(restored.staffState.teamStaff[restored.selectedTeamId].length).toBeGreaterThanOrEqual(7);
    expect(restored.history.draftHistory).toEqual([]);
    expect(restored.prospectPools[restored.selectedTeamId]).toEqual([]);
  });

  it("hydrates completed legacy seasons with a playoff bracket", () => {
    const completed = completeRegularSeason(createFranchise("harbor-city", "legacy-complete"), new SeededRng("legacy-complete"));
    const legacy = JSON.parse(JSON.stringify(completed)) as FranchiseState;
    legacy.schemaVersion = 2;
    delete (legacy as Partial<FranchiseState>).seasonPhase;
    delete (legacy as Partial<FranchiseState>).playoffState;

    const restored = deserializeFranchise(JSON.stringify(legacy));

    expect(restored.seasonPhase).toBe("playoffs");
    expect(restored.playoffState?.bracket.length).toBe(4);
  });

  it("completes the regular season and opens the playoff path", () => {
    const franchise = createFranchise("harbor-city", "complete-season");
    const completed = completeRegularSeason(franchise, new SeededRng("complete-season"));

    expect(completed.league.completed).toBe(true);
    expect(completed.league.schedule.every((game) => game.played)).toBe(true);
    expect(completed.seasonPhase).toBe("playoffs");
    expect(completed.playoffState?.qualifiedTeamIds).toHaveLength(8);
  });

  it("generates the next season schedule and increments the year", () => {
    const franchise = createFranchise("harbor-city", "next-season");
    const next = prepareNextSeason({ ...franchise, league: { ...franchise.league, completed: true } }, new SeededRng("next-season"));

    expect(next.league.seasonYear).toBe(franchise.league.seasonYear + 1);
    expect(next.league.schedule.length).toBe(franchise.league.schedule.length);
    expect(next.league.schedule.every((game) => !game.played)).toBe(true);
    expect(next.scouting.draftClass).toHaveLength(72);
  });

  it("validates repaired dynasty state without warnings", () => {
    const franchise = createFranchise("harbor-city", "validate-dynasty");

    expect(validateDynastyState(franchise)).toEqual([]);
  });
});

describe("Phase 3 playoffs", () => {
  it("seeds the top eight teams by points, wins, and differential", () => {
    const franchise = rankedFranchise("playoff-seeding");
    const state = createPlayoffState(franchise.league);

    expect(state.qualifiedTeamIds).toEqual(franchise.league.teams.slice(0, 8).map((team) => team.id));
    expect(state.bracket[0].homeSeedTeamId).toBe(franchise.league.teams[0].id);
    expect(state.bracket[0].awaySeedTeamId).toBe(franchise.league.teams[7].id);
  });

  it("completes a best-of-five series at three wins", () => {
    const franchise = rankedFranchise("series-complete");
    const state = createPlayoffState(franchise.league);
    const series = { ...state.bracket[0], homeWins: 3 };
    const advanced = advancePlayoffSeries({ ...state, bracket: [series, ...state.bracket.slice(1)] });

    expect(advanced.bracket[0].completed).toBe(true);
    expect(advanced.bracket[0].winnerTeamId).toBe(series.homeSeedTeamId);
  });

  it("advances rounds and records a champion", () => {
    const franchise = rankedFranchise("round-advance");
    let state = createPlayoffState(franchise.league);
    state = advancePlayoffRound({
      ...state,
      bracket: state.bracket.map((series) => ({ ...series, homeWins: 3, completed: true, winnerTeamId: series.homeSeedTeamId }))
    });
    expect(state.currentRound).toBe(2);

    state = advancePlayoffRound({
      ...state,
      bracket: state.bracket.map((series) => (series.round === 2 ? { ...series, homeWins: 3, completed: true, winnerTeamId: series.homeSeedTeamId } : series))
    });
    state = advancePlayoffRound({
      ...state,
      bracket: state.bracket.map((series) => (series.round === 3 ? { ...series, homeWins: 3, completed: true, winnerTeamId: series.homeSeedTeamId } : series))
    });

    expect(state.completed).toBe(true);
    expect(state.championTeamId).toBeTruthy();
  });

  it("lets an eliminated or non-playoff user simulate to champion", () => {
    const franchise = { ...rankedFranchise("sim-champion"), selectedTeamId: "desert", playoffState: createPlayoffState(rankedFranchise("sim-champion").league), seasonPhase: "playoffs" as const };
    const resolved = simulatePlayoffsUntil(franchise, "champion", "sim-champion");

    expect(resolved.playoffState?.completed).toBe(true);
    expect(resolved.playoffState?.championTeamId).toBeTruthy();
  });

  it("applies a playoff game result to the active series", () => {
    const franchise = rankedFranchise("apply-playoff");
    const playoffState = createPlayoffState(franchise.league);
    const game = playoffState.bracket[0].games[0];
    const result = simulateGame({
      game: { ...game, dayIndex: 0, date: franchise.league.currentDate },
      homeTeam: franchise.league.teams.find((team) => team.id === game.homeTeamId)!,
      awayTeam: franchise.league.teams.find((team) => team.id === game.awayTeamId)!,
      seed: "apply-playoff"
    });
    const next = applyPlayoffGameResult({ ...franchise, playoffState, seasonPhase: "playoffs" }, game, result);
    const series = next.playoffState!.bracket[0];

    expect(series.games[0].played).toBe(true);
    expect(series.homeWins + series.awayWins).toBe(1);
  });
});

describe("Phase 3 draft and prospects", () => {
  it("builds draft order from standings and owned picks", () => {
    const franchise = rankedFranchise("draft-order");
    const draft = createDraftOrder(franchise);

    expect(draft.draftOrder).toHaveLength(franchise.league.teams.length * 4);
    expect(draft.draftOrder[0]).toBe(franchise.league.teams[11].id);
  });

  it("draft lottery is deterministic by seed", () => {
    const franchise = rankedFranchise("lottery-deterministic");
    const first = resolveDraftLottery(franchise, new SeededRng("same-lottery"));
    const second = resolveDraftLottery(franchise, new SeededRng("same-lottery"));

    expect(first.draftOrder.slice(0, 4)).toEqual(second.draftOrder.slice(0, 4));
    expect(first.pickContexts?.[0].pickId).toBe(second.pickContexts?.[0].pickId);
  });

  it("current pick exposes stable pick context", () => {
    const franchise = rankedFranchise("current-pick");
    const draft = createDraftOrder(franchise);
    const pick = getCurrentPick(draft, franchise);

    expect(pick?.pickId).toContain(`${franchise.league.seasonYear}-r1`);
    expect(pick?.ownerTeamId).toBe(draft.draftOrder[0]);
  });

  it("honors traded pick ownership at the slot", () => {
    const franchise = rankedFranchise("traded-pick");
    const originalOwner = franchise.league.teams[11];
    const newOwner = franchise.league.teams[0];
    const firstPick = originalOwner.draftPicks.find((pick) => pick.round === 1 && pick.seasonYear === franchise.league.seasonYear)!;
    const transferred = transferPick(firstPick.id, originalOwner, newOwner);
    const teams = franchise.league.teams.map((team) => (team.id === originalOwner.id ? transferred.fromTeam : team.id === newOwner.id ? transferred.toTeam : team));
    const draft = createDraftOrder({ ...franchise, league: { ...franchise.league, teams } });

    expect(draft.draftOrder[0]).toBe(newOwner.id);
  });

  it("creates prospect rights for a user draft pick", () => {
    const franchise = rankedFranchise("user-pick");
    const selectedTeamId = franchise.league.teams[11].id;
    const draft = createDraftOrder({ ...franchise, selectedTeamId });
    const withDraft = { ...franchise, selectedTeamId, offseasonState: { ...defaultOffseason(franchise), draftState: { ...draft, userPickPending: true } } };
    const picked = makeUserDraftSelection(withDraft, franchise.scouting.draftClass[0].id);

    expect(picked.prospectPools[selectedTeamId]).toHaveLength(1);
    expect(picked.offseasonState?.draftState?.selections[0].prospectId).toBe(franchise.scouting.draftClass[0].id);
  });

  it("AI draft avoids duplicate prospects and records history", () => {
    const franchise = rankedFranchise("ai-draft");
    const drafted = autoCompleteDraft({ ...franchise, offseasonState: { ...defaultOffseason(franchise), draftState: resolveDraftLottery(franchise, new SeededRng("lottery")) } }, new SeededRng("ai-draft"));
    const ids = drafted.offseasonState?.draftState?.selections.map((selection) => selection.prospectId) ?? [];

    expect(new Set(ids).size).toBe(ids.length);
    expect(drafted.offseasonState?.draftState?.completed).toBe(true);
    expect(drafted.history.draftHistory.length).toBe(ids.length);
  });

  it("signs drafted prospects as players when valid", () => {
    const franchise = rankedFranchise("sign-prospect");
    const selectedTeamId = franchise.league.teams[11].id;
    const draft = createDraftOrder({ ...franchise, selectedTeamId });
    const picked = makeUserDraftSelection({ ...franchise, selectedTeamId, offseasonState: { ...defaultOffseason(franchise), draftState: { ...draft, userPickPending: true } } }, franchise.scouting.draftClass[0].id);
    const signed = signProspect({
      ...picked,
      league: {
        ...picked.league,
        teams: picked.league.teams.map((team) => (team.id === selectedTeamId ? { ...team, capCeiling: 200_000_000 } : team))
      }
    }, franchise.scouting.draftClass[0].id, "affiliate");

    expect(signed.league.teams.find((team) => team.id === selectedTeamId)?.roster.some((player) => player.id.includes(franchise.scouting.draftClass[0].id))).toBe(true);
    expect(signed.prospectPools[selectedTeamId][0].signed).toBe(true);
  });

  it("blocks prospect signing above active roster limit", () => {
    const franchise = rankedFranchise("prospect-limit");
    const selectedTeamId = franchise.league.teams[11].id;
    const draft = createDraftOrder({ ...franchise, selectedTeamId });
    const picked = makeUserDraftSelection({ ...franchise, selectedTeamId, offseasonState: { ...defaultOffseason(franchise), draftState: { ...draft, userPickPending: true } } }, franchise.scouting.draftClass[0].id);
    const overloaded = {
      ...picked,
      league: {
        ...picked.league,
        teams: picked.league.teams.map((team) =>
          team.id === selectedTeamId ? { ...team, roster: [...team.roster, ...team.roster.slice(0, 6).map((player, index) => ({ ...player, id: `${player.id}-extra-${index}` }))] } : team
        )
      }
    };

    const blocked = signProspect(overloaded, franchise.scouting.draftClass[0].id, "active");

    expect(blocked.prospectPools[selectedTeamId][0].signed).toBe(false);
  });

  it("creates a player from prospect rights with a valid entry contract", () => {
    const franchise = createFranchise("harbor-city", "prospect-player");
    const prospect = franchise.scouting.draftClass[0];
    const player = createPlayerFromProspectRights({
      prospectId: prospect.id,
      teamId: franchise.selectedTeamId,
      acquiredYear: 2026,
      acquiredRound: 1,
      acquiredPickNumber: 1,
      displayName: prospect.displayName,
      position: prospect.position,
      age: prospect.age,
      nationality: prospect.nationality,
      archetype: prospect.archetype,
      potentialRangeLabel: "80-90 POT",
      signed: false,
      rightsExpireYear: 2030,
      source: "draft"
    });

    expect(player.teamId).toBe(franchise.selectedTeamId);
    expect(player.contract.yearsRemaining).toBe(3);
    expect(player.contract.capHit).toBeGreaterThan(0);
  });
});

describe("Phase 3 contracts and free agency", () => {
  it("scales demands with player quality and rejects weak offers", () => {
    const franchise = createFranchise("harbor-city", "contract-demand");
    const team = franchise.league.teams[0];
    const star = { ...team.roster[0], overall: 90, potential: 94, contract: { ...team.roster[0].contract, yearsRemaining: 0, expiryStatus: "UFA" as const } };
    const depth = { ...team.roster[1], overall: 65, potential: 67, contract: { ...team.roster[1].contract, yearsRemaining: 0, expiryStatus: "UFA" as const } };
    const starDemand = createContractDemand(star, team, franchise);
    const depthDemand = createContractDemand(depth, team, franchise);
    const weakOffer = offerFor(star, team, starDemand.demandSalary * 0.6, 1, "extension");

    expect(starDemand.demandSalary).toBeGreaterThan(depthDemand.demandSalary);
    expect(evaluateContractOffer(star, weakOffer, team, franchise).accepted).toBe(false);
  });

  it("accepts strong offers and updates contracts", () => {
    const franchise = createFranchise("harbor-city", "contract-accept");
    const team = franchise.league.teams[0];
    const player = { ...team.roster[0], contract: { ...team.roster[0].contract, yearsRemaining: 0, expiryStatus: "UFA" as const } };
    const league = { ...franchise.league, teams: [{ ...team, roster: [player, ...team.roster.slice(1)], capCeiling: 200_000_000 }, ...franchise.league.teams.slice(1)] };
    const adjusted = { ...franchise, league };
    const demand = createContractDemand(player, league.teams[0], adjusted);
    const offer = offerFor(player, league.teams[0], demand.demandSalary * 1.1, demand.demandYears, "extension");
    const evaluation = evaluateContractOffer(player, offer, league.teams[0], adjusted);
    const next = applyAcceptedContractOffer(adjusted, { ...offer, status: "accepted", evaluation });

    expect(evaluation.accepted).toBe(true);
    expect(next.league.teams[0].roster[0].contract.yearsRemaining).toBe(demand.demandYears);
  });

  it("moves unsigned UFAs to market and keeps RFAs controlled", () => {
    const franchise = createFranchise("harbor-city", "ufa-rfa");
    const team = franchise.league.teams[0];
    const ufa = { ...team.roster[0], contract: { ...team.roster[0].contract, yearsRemaining: 0, expiryStatus: "UFA" as const } };
    const rfa = { ...team.roster[1], contract: { ...team.roster[1].contract, yearsRemaining: 0, expiryStatus: "RFA" as const } };
    const adjusted = { ...franchise, league: { ...franchise.league, teams: [{ ...team, roster: [ufa, rfa, ...team.roster.slice(2)] }, ...franchise.league.teams.slice(1)] } };
    const released = keepUnsignedRFAsAsRights(releaseUnsignedUFAsToMarket(adjusted));

    expect(released.freeAgencyState?.market.some((item) => item.player.id === ufa.id)).toBe(true);
    expect(released.league.teams[0].roster.some((player) => player.id === rfa.id)).toBe(true);
    expect(released.league.teams[0].roster.some((player) => player.id === ufa.id)).toBe(false);
  });

  it("generates a fictional free-agent market and signs/removes players", () => {
    const franchise = createFranchise("harbor-city", "fa-sign");
    const state = createFreeAgentMarket(franchise, new SeededRng("fa-sign"));
    const freeAgent = state.market[0];
    const team = { ...franchise.league.teams[0], capCeiling: 200_000_000 };
    const adjusted = { ...franchise, freeAgencyState: state, league: { ...franchise.league, teams: [team, ...franchise.league.teams.slice(1)] } };
    const signed = applyFreeAgentSigning(adjusted, freeAgent.player.id, offerFor(freeAgent.player, team, freeAgent.demandSalary * 1.1, freeAgent.demandYears, "freeAgent"));

    expect(state.market[0].player.displayName).not.toMatch(/NHL|Rangers|Canadiens|Maple Leafs/i);
    expect(signed.league.teams[0].roster.some((player) => player.id === freeAgent.player.id)).toBe(true);
    expect(signed.freeAgencyState?.market.some((item) => item.player.id === freeAgent.player.id)).toBe(false);
  });

  it("rejects cap-invalid free-agent signings and lets AI sign players", () => {
    const franchise = createFranchise("harbor-city", "fa-ai");
    const state = createFreeAgentMarket(franchise, new SeededRng("fa-ai"));
    const freeAgent = state.market[0];
    const cappedTeam = { ...franchise.league.teams[0], capCeiling: 1 };
    const invalid = applyFreeAgentSigning({ ...franchise, freeAgencyState: state, league: { ...franchise.league, teams: [cappedTeam, ...franchise.league.teams.slice(1)] } }, freeAgent.player.id, offerFor(freeAgent.player, cappedTeam, freeAgent.demandSalary, freeAgent.demandYears, "freeAgent"));
    const aiReady = { ...franchise, freeAgencyState: state, league: { ...franchise.league, teams: franchise.league.teams.map((team) => ({ ...team, capCeiling: 200_000_000 })) } };
    const advanced = advanceFreeAgencyDay(aiReady, new SeededRng("fa-ai"));

    expect(invalid.league.teams[0].roster.some((player) => player.id === freeAgent.player.id)).toBe(false);
    expect(advanced.freeAgencyState?.aiSignings.length).toBeGreaterThan(0);
  });

  it("marks free agency complete after max days", () => {
    let franchise: FranchiseState = { ...createFranchise("harbor-city", "fa-complete"), freeAgencyState: undefined };
    franchise = { ...franchise, freeAgencyState: createFreeAgentMarket(franchise, new SeededRng("fa-complete")) };
    for (let day = 0; day < 8; day += 1) {
      franchise = advanceFreeAgencyDay(franchise, new SeededRng(`fa-complete-${day}`));
    }

    expect(franchise.freeAgencyState?.completed).toBe(true);
  });
});

describe("Phase 3 staff, player lifecycle, owner, history, and serialization", () => {
  it("generates required staff roles and supports hiring", () => {
    const franchise = createFranchise("harbor-city", "staff-hire");
    const staffState = generateStaffForLeague(franchise.league.teams, new SeededRng("staff-hire"));
    const marketHire = staffState.staffMarket[0];
    const hired = hireStaff({ ...franchise, staffState }, marketHire.id, marketHire.role);

    expect(staffState.teamStaff[franchise.selectedTeamId].map((member) => member.role)).toContain("Head Scout");
    expect(hired.staffState.teamStaff[franchise.selectedTeamId].some((member) => member.id === marketHire.id)).toBe(true);
  });

  it("staff market uses fictional names and ratings", () => {
    const franchise = createFranchise("harbor-city", "staff-fictional");
    const member = franchise.staffState.staffMarket[0];

    expect(member.displayName).not.toMatch(/NHL|Rangers|Canadiens|Maple Leafs/i);
    expect(member.scouting).toBeGreaterThanOrEqual(40);
    expect(member.scouting).toBeLessThanOrEqual(99);
  });

  it("staff modifiers affect development calculations", () => {
    const franchise = createFranchise("harbor-city", "staff-mods");
    const baseMods = calculateTeamStaffModifiers(franchise.staffState, franchise.selectedTeamId);
    const boostedStaff = {
      ...franchise.staffState,
      teamStaff: {
        ...franchise.staffState.teamStaff,
        [franchise.selectedTeamId]: franchise.staffState.teamStaff[franchise.selectedTeamId].map((member) => member.role === "Development Coach" ? { ...member, development: 99 } : member)
      }
    };
    const boosted = calculateTeamStaffModifiers(boostedStaff, franchise.selectedTeamId);

    expect(boosted.development).toBeGreaterThanOrEqual(baseMods.development);
  });

  it("head scout modifiers improve scouting certainty gains", () => {
    const franchise = createFranchise("harbor-city", "scout-staff");
    const prospect = franchise.scouting.draftClass[0];
    const scouting = {
      ...franchise.scouting,
      assignments: [{ ...franchise.scouting.assignments[0], assignedProspectId: prospect.id, progress: 100 }]
    };
    const boostedStaff = {
      ...franchise.staffState,
      teamStaff: {
        ...franchise.staffState.teamStaff,
        [franchise.selectedTeamId]: franchise.staffState.teamStaff[franchise.selectedTeamId].map((member) => member.role === "Head Scout" ? { ...member, scouting: 99 } : member)
      }
    };
    const baseline = tickScouting(scouting, franchise.league, 1, new SeededRng("scout-staff"), franchise.staffState, franchise.selectedTeamId);
    const boosted = tickScouting(scouting, franchise.league, 1, new SeededRng("scout-staff"), boostedStaff, franchise.selectedTeamId);

    expect(boosted.state.draftClass[0].scouting.certainty).toBeGreaterThanOrEqual(baseline.state.draftClass[0].scouting.certainty);
  });

  it("ages players, decrements contracts, recovers fatigue, and archives stats", () => {
    const franchise = createFranchise("harbor-city", "player-life");
    const player = franchise.league.teams[0].roster[0];
    const adjusted = {
      ...franchise,
      league: {
        ...franchise.league,
        teams: [{ ...franchise.league.teams[0], roster: [{ ...player, fatigue: 90, injuryStatus: "out" as const, injuryGamesRemaining: 4, stats: { ...player.stats, goals: 10, points: 20 } }, ...franchise.league.teams[0].roster.slice(1)] }, ...franchise.league.teams.slice(1)]
      }
    };
    const aged = agePlayers(adjusted);
    const decremented = decrementContracts(aged);
    const recovered = recoverFatigueAndInjuries(decremented);
    const reset = resetPlayerSeasonStats(recovered);

    expect(aged.league.teams[0].roster[0].age).toBe(player.age + 1);
    expect(decremented.league.teams[0].roster[0].contract.yearsRemaining).toBe(Math.max(0, player.contract.yearsRemaining - 1));
    expect(recovered.league.teams[0].roster[0].fatigue).toBeLessThan(90);
    expect(reset.league.teams[0].roster[0].stats.points).toBe(0);
    expect(reset.league.teams[0].roster[0].careerHistory?.length).toBe(1);
  });

  it("retires eligible players and applies modest offseason development", () => {
    const franchise = createFranchise("harbor-city", "retirements");
    const oldRoster = franchise.league.teams[0].roster.map((player) => ({ ...player, age: 45, overall: 50, potential: 50, fatigue: 95 }));
    const adjusted = { ...franchise, league: { ...franchise.league, teams: [{ ...franchise.league.teams[0], roster: oldRoster }, ...franchise.league.teams.slice(1)] } };
    const retired = runRetirements(adjusted, new SeededRng("retirements"));
    const youngPlayer = { ...franchise.league.teams[0].roster[0], age: 20, overall: 55, potential: 95, fatigue: 0 };
    const developed = applyOffseasonDevelopment({ ...franchise, league: { ...franchise.league, teams: [{ ...franchise.league.teams[0], roster: [youngPlayer, ...franchise.league.teams[0].roster.slice(1)] }, ...franchise.league.teams.slice(1)] } }, new SeededRng("developed"));

    expect(retired.offseasonState?.retiredPlayerIds.length).toBeGreaterThan(0);
    expect(developed.league.teams[0].roster[0].overall).toBeGreaterThanOrEqual(youngPlayer.overall);
  });

  it("generates and updates owner goals", () => {
    const franchise = rankedFranchise("owner-goals");
    const goals = generateOwnerGoals(franchise, new SeededRng("owner-goals"));
    const owner = updateOwnerGoalProgress({ ...franchise, ownerState: { ...franchise.ownerState, seasonGoals: goals } });

    expect(goals).toHaveLength(3);
    expect(owner.seasonGoals.every((goal) => goal.progress >= 0)).toBe(true);
  });

  it("make-playoffs goal is met for a top-eight club", () => {
    const franchise = rankedFranchise("owner-playoffs");
    const goal = {
      id: "make-playoffs-test",
      type: "makePlayoffs" as const,
      label: "Make playoffs",
      target: 1,
      progress: 0,
      status: "active" as const,
      importance: "high" as const
    };
    const owner = updateOwnerGoalProgress({ ...franchise, ownerState: { ...franchise.ownerState, seasonGoals: [goal] } });

    expect(owner.seasonGoals[0].status).toBe("met");
  });

  it("archives season history, awards, champion, and timeline display data", () => {
    const franchise = rankedFranchise("history");
    const playoffState = createPlayoffState(franchise.league);
    const champion = playoffState.qualifiedTeamIds[0];
    const withChampion = { ...franchise, playoffState: { ...playoffState, championTeamId: champion, completed: true } };
    const season = createSeasonHistory(withChampion);
    const awards = createAwards(withChampion);
    const timeline = createFranchiseTimeline({ ...withChampion, history: { ...withChampion.history, seasons: [season], awards } });

    expect(season.championTeamId).toBe(champion);
    expect(awards.every((award) => award.displayName.length > 0)).toBe(true);
    expect(timeline.length).toBeGreaterThan(0);
  });

  it("archiveSeasonHistory persists champion and awards", () => {
    const franchise = rankedFranchise("archive-history");
    const playoffState = { ...createPlayoffState(franchise.league), completed: true, championTeamId: franchise.league.teams[0].id };
    const archived = archiveSeasonHistory({ ...franchise, playoffState });

    expect(archived.history.seasons[0].championTeamId).toBe(franchise.league.teams[0].id);
    expect(archived.history.awards.length).toBeGreaterThan(0);
  });

  it("serializes and deserializes Phase 3 state", () => {
    const franchise = createFranchise("harbor-city", "phase3-serialize");
    const restored = deserializeFranchise(serializeFranchise(franchise));

    expect(restored.schemaVersion).toBe(5);
    expect(restored.seasonPhase).toBe("regularSeason");
    expect(restored.staffState.teamStaff[restored.selectedTeamId]).toHaveLength(7);
  });
});

function rankedFranchise(seed: string): FranchiseState {
  const franchise = createFranchise("harbor-city", seed);
  const teams = franchise.league.teams.map((team, index) => ({
    ...team,
    record: {
      wins: 22 - index,
      losses: index,
      overtimeLosses: 0,
      points: (22 - index) * 2,
      goalsFor: 100 - index,
      goalsAgainst: 40 + index,
      streak: `W${Math.max(1, 22 - index)}`
    },
    stats: { ...team.stats, gamesPlayed: 22 }
  }));
  return { ...franchise, league: { ...franchise.league, teams } };
}

function offerFor(player: Player, team: Team, salary: number, years: number, offerType: ContractOffer["offerType"]): ContractOffer {
  return {
    id: `offer-${player.id}-${salary}-${years}`,
    playerId: player.id,
    teamId: team.id,
    salary: Math.round(salary / 25_000) * 25_000,
    capHit: Math.round(salary / 25_000) * 25_000,
    years,
    rolePromise: player.roleExpectation,
    offerType,
    status: "draft"
  };
}

function defaultOffseason(franchise: FranchiseState) {
  return {
    year: franchise.league.seasonYear,
    retiredPlayerIds: [],
    retiredPlayerNames: [],
    reSigningCompleted: false,
    trainingCampCompleted: false,
    phaseLog: []
  };
}
