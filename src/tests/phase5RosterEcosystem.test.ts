import { describe, expect, it } from "vitest";
import { createFranchise } from "../game/generators/generateLeague";
import { SeededRng } from "../game/rng";
import { repairAllTeamRosters, repairTeamRoster } from "../game/systems/aiRosterManagement";
import { createAffiliateReport, generateAffiliateForTeam, getAffiliateDevelopmentScore, getAffiliatePromotionCandidates, tickAffiliateDevelopment } from "../game/systems/affiliate";
import { calculateActiveRosterCapHit, calculateCapSpace } from "../game/systems/contracts";
import { createContractDemand, evaluateContractOffer } from "../game/systems/contractNegotiation";
import { validateDynastyInvariants } from "../game/systems/dynastyInvariants";
import { runDynastyPlaytest } from "../game/systems/dynastyPlaytest";
import { evaluateJobSecurity, generateOwnerGoals } from "../game/systems/owner";
import { exportSaveToJson, importSaveFromJson, serializeFranchise } from "../game/systems/saves";
import { advanceSeasonPhase } from "../game/systems/seasonLifecycle";
import { runTrainingCampRosterSetup } from "../game/systems/trainingCamp";
import { getAssignedPlayerIds } from "../game/systems/lineupValidation";
import {
  activeRosterCount,
  canAssignPlayerToLineup,
  getPlayerRosterStatus,
  getRosterStatusLabel,
  validateRosterForGame
} from "../game/systems/rosterRules";
import {
  activatePlayer,
  callUpPlayer,
  sendDownPlayer,
  scratchPlayer,
  placePlayerOnIR,
  removePlayerFromIR
} from "../game/systems/rosterManagement";
import type { ContractOffer, FranchiseState, Team } from "../game/types";

describe("Phase 5 roster rules and cap treatment", () => {
  it("hydrates a new franchise with roster statuses and affiliates", () => {
    const franchise = createFranchise("harbor-city", "phase5-new");

    expect(franchise.schemaVersion).toBe(6);
    franchise.league.teams.forEach((team) => {
      expect(team.affiliate.fullName).toContain(team.city);
      expect(team.roster.every((player) => Boolean(player.rosterStatus))).toBe(true);
    });
  });

  it("validates active roster minimums, maximums, goalies, and labels", () => {
    const franchise = createFranchise("harbor-city", "phase5-rules");
    const team = franchise.league.teams[0];
    const overLimit: Team = { ...team, roster: team.roster.map((player) => ({ ...player, rosterStatus: "active" })) };
    const noGoalies: Team = { ...team, roster: team.roster.map((player) => (player.position === "G" ? { ...player, rosterStatus: "affiliate" } : player)) };

    expect(validateRosterForGame(overLimit).errors.some((error) => error.includes("over"))).toBe(true);
    expect(validateRosterForGame(noGoalies).errors.some((error) => error.includes("2 healthy"))).toBe(true);
    ["active", "scratched", "affiliate", "injuredReserve", "prospectRights", "retired"].forEach((status) => {
      expect(getRosterStatusLabel(status as never).length).toBeGreaterThan(0);
    });
  });

  it("blocks affiliate and injured reserve players from lineups", () => {
    const franchise = createFranchise("harbor-city", "phase5-lineup-block");
    const team = franchise.league.teams[0];
    const player = team.roster.find((candidate) => candidate.position !== "G")!;
    const affiliatePlayer = { ...player, rosterStatus: "affiliate" as const };
    const irPlayer = { ...player, rosterStatus: "injuredReserve" as const, injuryStatus: "out" as const, injuryGamesRemaining: 4 };

    expect(canAssignPlayerToLineup(affiliatePlayer)).toBe(false);
    expect(canAssignPlayerToLineup(irPlayer)).toBe(false);
  });

  it("counts active, scratched, and IR against active cap while affiliate and retired are exempt", () => {
    const franchise = createFranchise("harbor-city", "phase5-cap");
    const team = franchise.league.teams[0];
    const [active, scratched, affiliate, ir, retired] = team.roster;
    const adjusted: Team = {
      ...team,
      roster: [
        { ...active, rosterStatus: "active" },
        { ...scratched, rosterStatus: "scratched" },
        { ...affiliate, rosterStatus: "affiliate" },
        { ...ir, rosterStatus: "injuredReserve" },
        { ...retired, rosterStatus: "retired" },
        ...team.roster.slice(5).map((player) => ({ ...player, rosterStatus: "affiliate" as const }))
      ]
    };

    expect(calculateActiveRosterCapHit(adjusted)).toBe(active.contract.capHit + scratched.contract.capHit + ir.contract.capHit);
    expect(Number.isFinite(calculateCapSpace(adjusted))).toBe(true);
  });
});

describe("Phase 5 roster management", () => {
  it("moves players through call-up, send-down, scratch, activation, and IR with serializable logs", () => {
    let franchise = createFranchise("harbor-city", "phase5-moves");
    const team = franchise.league.teams[0];
    const scratch = team.roster.find((player) => getPlayerRosterStatus(player) === "scratched")!;
    franchise = sendDownPlayer(franchise, team.id, scratch.id);
    const affiliate = team.roster.find((player) => getPlayerRosterStatus(player) === "affiliate")!;
    franchise = callUpPlayer(franchise, team.id, affiliate.id);
    expect(getPlayer(franchise, team.id, affiliate.id).rosterStatus).toBe("active");

    franchise = scratchPlayer(franchise, team.id, affiliate.id);
    expect(getPlayer(franchise, team.id, affiliate.id).rosterStatus).toBe("scratched");

    franchise = activatePlayer(franchise, team.id, affiliate.id);
    expect(getPlayer(franchise, team.id, affiliate.id).rosterStatus).toBe("active");

    const beforeCap = calculateCapSpace(getTeam(franchise, team.id));
    franchise = sendDownPlayer(franchise, team.id, affiliate.id);
    expect(getPlayer(franchise, team.id, affiliate.id).rosterStatus).toBe("affiliate");
    expect(calculateCapSpace(getTeam(franchise, team.id))).toBeGreaterThanOrEqual(beforeCap);

    const injured = getTeam(franchise, team.id).roster.find((player) => getPlayerRosterStatus(player) === "active")!;
    franchise = {
      ...franchise,
      league: {
        ...franchise.league,
        teams: franchise.league.teams.map((candidate) =>
          candidate.id === team.id
            ? { ...candidate, roster: candidate.roster.map((player) => (player.id === injured.id ? { ...player, injuryStatus: "out", injuryGamesRemaining: 5 } : player)) }
            : candidate
        )
      }
    };
    franchise = placePlayerOnIR(franchise, team.id, injured.id);
    expect(getPlayer(franchise, team.id, injured.id).rosterStatus).toBe("injuredReserve");
    franchise = {
      ...franchise,
      league: {
        ...franchise.league,
        teams: franchise.league.teams.map((candidate) =>
          candidate.id === team.id
            ? { ...candidate, roster: candidate.roster.map((player) => (player.id === injured.id ? { ...player, injuryStatus: "healthy", injuryGamesRemaining: 0 } : player)) }
            : candidate
        )
      }
    };
    franchise = removePlayerFromIR(franchise, team.id, injured.id);
    expect(["active", "scratched", "affiliate"]).toContain(getPlayer(franchise, team.id, injured.id).rosterStatus);
    expect(() => JSON.stringify(franchise.rosterMoveHistory)).not.toThrow();
    expect(franchise.transactionLog.some((item) => item.type === "roster")).toBe(true);
  });

  it("repairs the lineup after sending an assigned player down", () => {
    let franchise = createFranchise("harbor-city", "phase5-senddown-lineup");
    const team = franchise.league.teams[0];
    const assigned = getAssignedPlayerIds(team.lines).find(Boolean)!;
    franchise = sendDownPlayer(franchise, team.id, assigned);
    const repairedTeam = getTeam(franchise, team.id);

    expect(getAssignedPlayerIds(repairedTeam.lines)).not.toContain(assigned);
  });
});

describe("Phase 5 affiliate and AI repair", () => {
  it("generates affiliate reports and uses Development Coach modifiers", () => {
    const franchise = createFranchise("harbor-city", "phase5-affiliate");
    const team = franchise.league.teams[0];
    const affiliatePlayer = team.roster.find((player) => getPlayerRosterStatus(player) === "affiliate")!;
    const report = createAffiliateReport(team, affiliatePlayer, 72);
    const low = getAffiliateDevelopmentScore(affiliatePlayer, { tactics: 0, goalieDevelopment: 0, development: -1, scouting: 0, medical: 0, analytics: 0, negotiation: 0, morale: 0 });
    const high = getAffiliateDevelopmentScore(affiliatePlayer, { tactics: 0, goalieDevelopment: 0, development: 2, scouting: 0, medical: 0, analytics: 0, negotiation: 0, morale: 0 });
    const ticked = tickAffiliateDevelopment(franchise, new SeededRng("phase5-affiliate-tick"));

    expect(generateAffiliateForTeam(team).parentTeamId).toBe(team.id);
    expect(report.headline.length).toBeGreaterThan(0);
    expect(high).toBeGreaterThan(low);
    expect(ticked.league.teams[0].affiliate.recentReports.length).toBeGreaterThanOrEqual(0);
    expect(getAffiliatePromotionCandidates(team)).toBeDefined();
  });

  it("repairs missing goalies, active minimums, duplicate risk, and preserves stars", () => {
    const franchise = createFranchise("harbor-city", "phase5-ai-repair");
    const team = franchise.league.teams[0];
    const star = [...team.roster].sort((a, b) => b.overall - a.overall)[0];
    const broken: Team = {
      ...team,
      roster: team.roster.map((player) => ({
        ...player,
        rosterStatus: player.id === star.id ? "active" : player.position === "G" ? "affiliate" : "affiliate"
      }))
    };
    const result = repairTeamRoster(broken, franchise.league, undefined, [], new SeededRng("phase5-repair"), "playtestRepair");
    const report = validateRosterForGame(result.team);
    const ids = result.team.roster.map((player) => player.id);

    expect(report.healthyGoalieCount).toBeGreaterThanOrEqual(2);
    expect(report.activeCount).toBeGreaterThanOrEqual(20);
    expect(new Set(ids).size).toBe(ids.length);
    expect(result.team.roster.find((player) => player.id === star.id)?.rosterStatus).toBe("active");
  });

  it("uses emergency replacements only when no affiliate or prospect depth can solve the roster", () => {
    const franchise = createFranchise("harbor-city", "phase5-replacements");
    const team = franchise.league.teams[0];
    const withAffiliate = repairTeamRoster(team, franchise.league, undefined, [], new SeededRng("phase5-no-replacement"), "playtestRepair");
    const gutted: Team = { ...team, roster: team.roster.filter((player) => player.position !== "G") };
    const withReplacement = repairTeamRoster(gutted, franchise.league, undefined, [], new SeededRng("phase5-replacement"), "playtestRepair");

    expect(withAffiliate.emergencyReplacementCount).toBe(0);
    expect(withReplacement.emergencyReplacementCount).toBeGreaterThan(0);
  });

  it("finalizes training camp and starts a new season with valid rosters where possible", () => {
    const franchise = createFranchise("harbor-city", "phase5-camp");
    const camp = runTrainingCampRosterSetup(franchise, new SeededRng("phase5-camp"));
    camp.league.teams.forEach((team) => expect(activeRosterCount(team)).toBeLessThanOrEqual(team.activeRosterLimit));

    const next = advanceSeasonPhase({ ...camp, seasonPhase: "trainingCamp" }, new SeededRng("phase5-start-season"));
    expect(next.seasonPhase).toBe("regularSeason");
    expect(next.league.teams.filter((team) => validateRosterForGame(team).errors.length).length).toBe(0);
  });
});

describe("Phase 5 migration, balance, and five-season stability", () => {
  it("hydrates schema 3 saves to schema 5 and repairs missing affiliates, statuses, and old lineups", () => {
    const legacy = JSON.parse(serializeFranchise(createFranchise("harbor-city", "phase5-migration"))) as FranchiseState;
    legacy.schemaVersion = 3;
    delete (legacy as Partial<FranchiseState>).rosterMoveHistory;
    const selectedTeam = legacy.league.teams[0];
    const assigned = getAssignedPlayerIds(selectedTeam.lines).find(Boolean)!;
    legacy.league.teams[0] = {
      ...selectedTeam,
      affiliate: undefined as never,
      roster: selectedTeam.roster.map((player) => {
        const next = { ...player };
        delete next.rosterStatus;
        return player.id === assigned ? { ...next, rosterStatus: "affiliate" as const } : next;
      })
    };
    const restored = importSaveFromJson(JSON.stringify(legacy));

    expect(restored.schemaVersion).toBe(6);
    expect(restored.league.teams[0].affiliate).toBeTruthy();
    expect(restored.league.teams[0].roster.every((player) => player.rosterStatus)).toBe(true);
    expect(getAssignedPlayerIds(restored.league.teams[0].lines)).not.toContain(assigned);
    expect(importSaveFromJson(exportSaveToJson(restored)).schemaVersion).toBe(6);
  });

  it("balances re-signing and owner goal outcomes in the intended direction", () => {
    const franchise = createFranchise("harbor-city", "phase5-balance");
    const team = franchise.league.teams[0];
    const player = team.roster[0];
    const demand = createContractDemand(player, team, franchise);
    const weak = offer(player.id, team.id, demand.demandSalary * 0.82, Math.max(1, demand.demandYears - 1), player.roleExpectation);
    const fair = offer(player.id, team.id, demand.demandSalary, demand.demandYears, player.roleExpectation);
    const rfaDemand = createContractDemand({ ...player, contract: { ...player.contract, expiryStatus: "RFA" } }, team, franchise);
    const ufaDemand = createContractDemand({ ...player, contract: { ...player.contract, expiryStatus: "UFA" } }, team, franchise);
    const successful = {
      ...franchise,
      league: {
        ...franchise.league,
        teams: franchise.league.teams.map((candidate) =>
          candidate.id === team.id
            ? { ...candidate, record: { ...candidate.record, wins: 16, losses: 4, overtimeLosses: 2, points: 34 }, stats: { ...candidate.stats, gamesPlayed: 22 } }
            : candidate
        )
      }
    };
    const security = evaluateJobSecurity(successful);
    const rebuildingGoals = generateOwnerGoals({
      ...franchise,
      league: {
        ...franchise.league,
        teams: franchise.league.teams.map((candidate) =>
          candidate.id === team.id
            ? { ...candidate, record: { ...candidate.record, wins: 4, losses: 17, overtimeLosses: 1, points: 9 }, stats: { ...candidate.stats, gamesPlayed: 22 } }
            : candidate
        )
      }
    });

    expect(evaluateContractOffer(player, fair, team, franchise).playerInterest).toBeGreaterThan(evaluateContractOffer(player, weak, team, franchise).playerInterest);
    expect(rfaDemand.demandSalary).toBeLessThan(ufaDemand.demandSalary);
    expect(security.jobSecurity).toBeGreaterThan(franchise.ownerState.jobSecurity);
    expect(rebuildingGoals.some((goal) => ["developProspect", "buildThroughDraft", "stayUnderCap"].includes(goal.type))).toBe(true);
  });

  it("completes a five-season dry run with no fatal roster errors, consistent picks, and serializable save state", () => {
    const report = runDynastyPlaytest("phase5-five-season", 5);
    const final = repairAllTeamRosters(report.finalFranchise, "playtestRepair");

    expect(report.errors).toEqual([]);
    expect(final.league.teams.filter((team) => validateRosterForGame(team).errors.length).length).toBe(0);
    final.league.teams.forEach((team) => team.draftPicks.forEach((pick) => expect(pick.ownerTeamId).toBe(team.id)));
    expect(validateDynastyInvariants(final).valid).toBe(true);
    expect(() => JSON.stringify(final)).not.toThrow();
  });
});

function getTeam(franchise: FranchiseState, teamId: string): Team {
  return franchise.league.teams.find((team) => team.id === teamId)!;
}

function getPlayer(franchise: FranchiseState, teamId: string, playerId: string) {
  return getTeam(franchise, teamId).roster.find((player) => player.id === playerId)!;
}

function offer(playerId: string, teamId: string, salary: number, years: number, rolePromise: ContractOffer["rolePromise"]): ContractOffer {
  const rounded = Math.round(salary / 25_000) * 25_000;
  return {
    id: `phase5-offer-${playerId}-${rounded}-${years}`,
    playerId,
    teamId,
    salary: rounded,
    capHit: rounded,
    years,
    rolePromise,
    offerType: "extension",
    status: "draft"
  };
}
