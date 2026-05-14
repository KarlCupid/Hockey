import { createFranchise } from "../generators/generateLeague";
import { SeededRng } from "../rng";
import { applyAcceptedContractOffer, createContractDemand, evaluateContractOffer, getPendingExpiringPlayers } from "./contractNegotiation";
import { autoCompleteDraft } from "./draftExecution";
import { advanceFreeAgencyDay, applyFreeAgentSigning } from "./freeAgency";
import { calculateCapSpace } from "./contracts";
import { hireStaff } from "./staff";
import { signProspect } from "./prospects";
import { advanceSeasonPhase, completeRegularSeason } from "./seasonLifecycle";
import { simulatePlayoffsUntil } from "./playoffs";
import { validateDynastyInvariants, type DynastyInvariantReport } from "./dynastyInvariants";
import type { ContractOffer, FranchiseState } from "../types";

export interface PlaytestReport {
  seed: string;
  seasonsCompleted: number;
  warnings: string[];
  errors: string[];
  championHistory: string[];
  selectedTeamRecords: string[];
  capHealth: Array<{ seasonYear: number; minSpace: number; maxSpace: number; teamsOverCap: number }>;
  rosterHealth: Array<{ seasonYear: number; minRoster: number; maxRoster: number; warnings: number }>;
  freeAgencyHealth: Array<{ seasonYear: number; marketRemaining: number; userSignings: number; aiSignings: number }>;
  draftHealth: Array<{ seasonYear: number; selections: number; duplicateSelections: number; userProspects: number }>;
  ownerSecurityTrend: Array<{ seasonYear: number; jobSecurity: number }>;
  invariantReports: DynastyInvariantReport[];
  finalFranchise: FranchiseState;
}

export function runDynastyPlaytest(seed = "phase4-playtest", seasons = 3, selectedTeamId = "harbor-city"): PlaytestReport {
  const rng = new SeededRng(seed);
  let franchise = createFranchise(selectedTeamId, seed);
  const warnings: string[] = [];
  const errors: string[] = [];
  const invariantReports: DynastyInvariantReport[] = [];
  const selectedTeamRecords: string[] = [];
  const capHealth: PlaytestReport["capHealth"] = [];
  const rosterHealth: PlaytestReport["rosterHealth"] = [];
  const freeAgencyHealth: PlaytestReport["freeAgencyHealth"] = [];
  const draftHealth: PlaytestReport["draftHealth"] = [];
  const ownerSecurityTrend: PlaytestReport["ownerSecurityTrend"] = [];

  const check = (label: string) => {
    const report = validateDynastyInvariants(franchise);
    invariantReports.push(report);
    warnings.push(...report.warnings.map((item) => `${label}: ${item.message}`));
    errors.push(...report.errors.map((item) => `${label}: ${item.message}`));
  };

  check("new franchise");

  for (let season = 0; season < seasons; season += 1) {
    const seasonYear = franchise.league.seasonYear;
    franchise = completeRegularSeason(franchise, new SeededRng(`${seed}-regular-${season}`));
    check(`${seasonYear} regular season`);
    const selectedAfterRegularSeason = franchise.league.teams.find((team) => team.id === franchise.selectedTeamId);
    const selectedRecord = selectedAfterRegularSeason
      ? `${seasonYear}: ${selectedAfterRegularSeason.record.wins}-${selectedAfterRegularSeason.record.losses}-${selectedAfterRegularSeason.record.overtimeLosses}`
      : `${seasonYear}: unavailable`;

    franchise = simulatePlayoffsUntil(franchise, "champion", `${seed}-playoffs-${season}`);
    check(`${seasonYear} playoffs`);

    franchise = advanceSeasonPhase(franchise, new SeededRng(`${seed}-review-${season}`));
    check(`${seasonYear} season review`);

    franchise = advanceSeasonPhase(franchise, new SeededRng(`${seed}-retirements-${season}`));
    check(`${seasonYear} retirements`);

    franchise = advanceSeasonPhase(franchise, new SeededRng(`${seed}-lottery-${season}`));
    check(`${seasonYear} draft lottery`);

    franchise = autoCompleteDraft(franchise, new SeededRng(`${seed}-draft-${season}`));
    check(`${seasonYear} draft`);

    franchise = maybeSignProspect(franchise);
    franchise = maybeReSignPlayer(franchise, rng);
    franchise = advanceSeasonPhase(franchise, new SeededRng(`${seed}-resigning-${season}`));
    check(`${seasonYear} re-signing`);

    franchise = maybeSignFreeAgent(franchise);
    while (franchise.freeAgencyState && !franchise.freeAgencyState.completed) {
      franchise = advanceFreeAgencyDay(franchise, new SeededRng(`${seed}-fa-${season}-${franchise.freeAgencyState.currentDay}`));
    }
    check(`${seasonYear} free agency`);
    const freeAgencySnapshot = {
      seasonYear,
      marketRemaining: franchise.freeAgencyState?.market.length ?? 0,
      userSignings: franchise.freeAgencyState?.userSignings.length ?? 0,
      aiSignings: franchise.freeAgencyState?.aiSignings.length ?? 0
    };

    franchise = maybeHireStaff(franchise);
    franchise = advanceSeasonPhase(franchise, new SeededRng(`${seed}-staff-${season}`));
    check(`${seasonYear} staff hiring`);
    const staffReport = invariantReports[invariantReports.length - 1];
    const capSnapshot = summarizeCap(franchise, seasonYear);
    const rosterSnapshot = summarizeRosters(franchise, seasonYear, staffReport);

    franchise = advanceSeasonPhase(franchise, new SeededRng(`${seed}-camp-${season}`));
    check(`${seasonYear} training camp`);

    selectedTeamRecords.push(selectedRecord);
    capHealth.push(capSnapshot);
    rosterHealth.push(rosterSnapshot);
    freeAgencyHealth.push(freeAgencySnapshot);
    const selections = franchise.history.draftHistory.filter((selection) => selection.year === seasonYear);
    draftHealth.push({
      seasonYear,
      selections: selections.length,
      duplicateSelections: selections.length - new Set(selections.map((selection) => selection.prospectId)).size,
      userProspects: franchise.prospectPools[franchise.selectedTeamId]?.length ?? 0
    });
    ownerSecurityTrend.push({ seasonYear, jobSecurity: franchise.ownerState.jobSecurity });
  }

  return {
    seed,
    seasonsCompleted: seasons,
    warnings,
    errors,
    championHistory: franchise.history.champions.map((champion) => `${champion.seasonYear}: ${champion.teamName}`),
    selectedTeamRecords,
    capHealth,
    rosterHealth,
    freeAgencyHealth,
    draftHealth,
    ownerSecurityTrend,
    invariantReports,
    finalFranchise: franchise
  };
}

function maybeReSignPlayer(franchise: FranchiseState, rng: SeededRng): FranchiseState {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId);
  if (!team) return franchise;
  const pending = getPendingExpiringPlayers(franchise, team.id);
  const target = pending.find((player) => calculateCapSpace(team) + player.contract.capHit > createContractDemand(player, team, franchise).demandSalary);
  if (!target) return franchise;
  const demand = createContractDemand(target, team, franchise);
  const salary = Math.round((demand.demandSalary * rng.float(1.02, 1.12)) / 25_000) * 25_000;
  const offer: ContractOffer = {
    id: `playtest-extension-${target.id}-${franchise.league.seasonYear}`,
    playerId: target.id,
    teamId: team.id,
    salary,
    capHit: salary,
    years: demand.demandYears,
    rolePromise: target.roleExpectation,
    offerType: "extension",
    status: "draft"
  };
  const evaluation = evaluateContractOffer(target, offer, team, franchise);
  return evaluation.accepted ? applyAcceptedContractOffer(franchise, { ...offer, status: "accepted", evaluation }) : franchise;
}

function maybeSignProspect(franchise: FranchiseState): FranchiseState {
  const rights = franchise.prospectPools[franchise.selectedTeamId]?.find((candidate) => !candidate.signed);
  return rights ? signProspect(franchise, rights.prospectId) : franchise;
}

function maybeSignFreeAgent(franchise: FranchiseState): FranchiseState {
  const state = franchise.freeAgencyState;
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId);
  if (!state || !team || team.roster.length >= 30) return franchise;
  const capSpace = calculateCapSpace(team);
  const target = state.market.find((item) => item.demandSalary <= capSpace && (item.interestByTeam[team.id] ?? 0) >= 48);
  if (!target) return franchise;
  const offer: ContractOffer = {
    id: `playtest-fa-${target.player.id}-${franchise.league.seasonYear}`,
    playerId: target.player.id,
    teamId: team.id,
    salary: target.demandSalary,
    capHit: target.demandSalary,
    years: target.demandYears,
    rolePromise: target.player.roleExpectation,
    offerType: "freeAgent",
    status: "draft"
  };
  return applyFreeAgentSigning(franchise, target.player.id, offer);
}

function maybeHireStaff(franchise: FranchiseState): FranchiseState {
  const candidate = franchise.staffState.staffMarket[0];
  return candidate ? hireStaff(franchise, candidate.id, candidate.role) : franchise;
}

function summarizeCap(franchise: FranchiseState, seasonYear: number) {
  const spaces = franchise.league.teams.map((team) => calculateCapSpace(team));
  return {
    seasonYear,
    minSpace: Math.min(...spaces),
    maxSpace: Math.max(...spaces),
    teamsOverCap: spaces.filter((space) => space < 0).length
  };
}

function summarizeRosters(franchise: FranchiseState, seasonYear: number, report: DynastyInvariantReport) {
  const sizes = franchise.league.teams.map((team) => team.roster.length);
  return {
    seasonYear,
    minRoster: Math.min(...sizes),
    maxRoster: Math.max(...sizes),
    warnings: report.warnings.filter((warning) => warning.code === "team.rosterShort").length
  };
}
