import { createFranchise } from "../generators/generateLeague";
import { SeededRng } from "../rng";
import { repairAllTeamRosters } from "./aiRosterManagement";
import { applyAcceptedContractOffer, createContractDemand, evaluateContractOffer, getPendingExpiringPlayers } from "./contractNegotiation";
import { autoCompleteDraft } from "./draftExecution";
import { advanceFreeAgencyDay, applyFreeAgentSigning } from "./freeAgency";
import { calculateCapSpace } from "./contracts";
import { getPlayerRosterStatus, validateRosterForGame, activeRosterCount } from "./rosterRules";
import { hireStaff } from "./staff";
import { signProspect } from "./prospects";
import { advanceSeasonPhase, completeRegularSeason } from "./seasonLifecycle";
import { simulatePlayoffsUntil } from "./playoffs";
import { validateDynastyInvariants, type DynastyInvariantReport } from "./dynastyInvariants";
import { generateDecisionEvents, generatePlayoffDecisionEvents, mergeDecisionEvents, resolveDecisionEvent } from "./decisionEvents";
import { generateAgentsForPlayers, generateInitialPlayerRelationships, generateInitialTeamDynamics, getTeamDynamics } from "./relationships";
import { defaultMediaState } from "./fanMedia";
import { createStoryArcDecisionEvent, updateStoryArcs } from "./storyArcs";
import { generateAssistantGmReport } from "./assistantGm";
import { getUrgentActionCount } from "./actionQueue";
import { createOwnerGoalReport } from "./ownerGoalReporting";
import {
  applyMediaPressureDrift,
  applyNaturalSentimentDecay,
  applyRelationshipDrift,
  applyTeamChemistryDrift
} from "./livingOpsTuning";
import type { ContractOffer, FranchiseSetupOptions, FranchiseState } from "../types";

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
  emergencyReplacementCounts: Array<{ seasonYear: number; count: number }>;
  affiliatePromotions: Array<{ seasonYear: number; count: number }>;
  prospectSignings: Array<{ seasonYear: number; count: number }>;
  invalidGameRosters: Array<{ seasonYear: number; teams: number }>;
  capOverTeams: Array<{ seasonYear: number; teams: number }>;
  livingOps: {
    eventsGenerated: number;
    highSeverityEvents: number;
    storyArcsStarted: number;
    storyArcsResolved: number;
    ownerTrustTrend: Array<{ seasonYear: number; value: number }>;
    teamChemistryTrend: Array<{ seasonYear: number; value: number }>;
    mediaPressureTrend: Array<{ seasonYear: number; value: number }>;
    fanSentimentTrend: Array<{ seasonYear: number; value: number }>;
    playerTrustRange: Array<{ seasonYear: number; low: number; high: number }>;
    assistantGmRecommendationsGenerated: number;
    urgentActionsGenerated: number;
    capPressureTrend: Array<{ seasonYear: number; value: number }>;
    contractAcceptanceRate: number;
    ownerGoalCompletionRate: number;
    contractPressureEvents: number;
    tradeRumorEvents: number;
    playoffPressureEvents: number;
  };
  invariantReports: DynastyInvariantReport[];
  finalFranchise: FranchiseState;
}

export function runDynastyPlaytest(
  seed = "phase4-playtest",
  seasons = 3,
  selectedTeamId = "harbor-city",
  setupOptions: FranchiseSetupOptions = {}
): PlaytestReport {
  const rng = new SeededRng(seed);
  let franchise = createFranchise(selectedTeamId, { ...setupOptions, seed });
  const warnings: string[] = [];
  const errors: string[] = [];
  const invariantReports: DynastyInvariantReport[] = [];
  const selectedTeamRecords: string[] = [];
  const capHealth: PlaytestReport["capHealth"] = [];
  const rosterHealth: PlaytestReport["rosterHealth"] = [];
  const freeAgencyHealth: PlaytestReport["freeAgencyHealth"] = [];
  const draftHealth: PlaytestReport["draftHealth"] = [];
  const ownerSecurityTrend: PlaytestReport["ownerSecurityTrend"] = [];
  const emergencyReplacementCounts: PlaytestReport["emergencyReplacementCounts"] = [];
  const affiliatePromotions: PlaytestReport["affiliatePromotions"] = [];
  const prospectSignings: PlaytestReport["prospectSignings"] = [];
  const invalidGameRosters: PlaytestReport["invalidGameRosters"] = [];
  const capOverTeams: PlaytestReport["capOverTeams"] = [];
  const livingOps: PlaytestReport["livingOps"] = {
    eventsGenerated: 0,
    highSeverityEvents: 0,
    storyArcsStarted: 0,
    storyArcsResolved: 0,
    ownerTrustTrend: [],
    teamChemistryTrend: [],
    mediaPressureTrend: [],
    fanSentimentTrend: [],
    playerTrustRange: [],
    assistantGmRecommendationsGenerated: 0,
    urgentActionsGenerated: 0,
    capPressureTrend: [],
    contractAcceptanceRate: 0,
    ownerGoalCompletionRate: 0,
    contractPressureEvents: 0,
    tradeRumorEvents: 0,
    playoffPressureEvents: 0
  };
  let contractAttempts = 0;
  let contractAccepted = 0;
  let ownerGoalsMet = 0;
  let ownerGoalsTotal = 0;

  const check = (label: string) => {
    franchise = refreshLivingOpsForPlaytest(franchise, `${seed}-${label}`);
    const report = validateDynastyInvariants(franchise);
    invariantReports.push(report);
    warnings.push(...report.warnings.map((item) => `${label}: ${item.message}`));
    errors.push(...report.errors.map((item) => `${label}: ${item.message}`));
  };

  check("new franchise");

  for (let season = 0; season < seasons; season += 1) {
    const seasonYear = franchise.league.seasonYear;
    franchise = repairAllTeamRosters(franchise, "preGame");
    franchise = completeRegularSeason(franchise, new SeededRng(`${seed}-regular-${season}`));
    franchise = tickStoryPlaytest(franchise, livingOps, `${seed}-regular-story-${season}`);
    check(`${seasonYear} regular season`);
    const selectedAfterRegularSeason = franchise.league.teams.find((team) => team.id === franchise.selectedTeamId);
    const selectedRecord = selectedAfterRegularSeason
      ? `${seasonYear}: ${selectedAfterRegularSeason.record.wins}-${selectedAfterRegularSeason.record.losses}-${selectedAfterRegularSeason.record.overtimeLosses}`
      : `${seasonYear}: unavailable`;

    franchise = simulatePlayoffsUntil(franchise, "champion", `${seed}-playoffs-${season}`);
    franchise = mergeDecisionEvents(franchise, generatePlayoffDecisionEvents(franchise, new SeededRng(`${seed}-playoff-pressure-${season}`)));
    franchise = tickStoryPlaytest(franchise, livingOps, `${seed}-playoff-story-${season}`);
    check(`${seasonYear} playoffs`);

    const previousReviewPhase = franchise.seasonPhase;
    franchise = advanceSeasonPhase(franchise, new SeededRng(`${seed}-review-${season}`));
    franchise = tickPhaseStoryPlaytest(franchise, livingOps, previousReviewPhase, franchise.seasonPhase, `${seed}-review-story-${season}`);
    check(`${seasonYear} season review`);

    const previousRetirePhase = franchise.seasonPhase;
    franchise = advanceSeasonPhase(franchise, new SeededRng(`${seed}-retirements-${season}`));
    franchise = tickPhaseStoryPlaytest(franchise, livingOps, previousRetirePhase, franchise.seasonPhase, `${seed}-retire-story-${season}`);
    check(`${seasonYear} retirements`);

    const previousLotteryPhase = franchise.seasonPhase;
    franchise = advanceSeasonPhase(franchise, new SeededRng(`${seed}-lottery-${season}`));
    franchise = tickPhaseStoryPlaytest(franchise, livingOps, previousLotteryPhase, franchise.seasonPhase, `${seed}-lottery-story-${season}`);
    check(`${seasonYear} draft lottery`);

    franchise = autoCompleteDraft(franchise, new SeededRng(`${seed}-draft-${season}`));
    franchise = tickStoryPlaytest(franchise, livingOps, `${seed}-draft-story-${season}`);
    check(`${seasonYear} draft`);

    franchise = maybeSignProspect(franchise);
    const reSignBefore = franchise.transactionLog.filter((item) => item.type === "contract" && item.headline === "Contract signed").length;
    franchise = maybeReSignPlayer(franchise, rng);
    const reSignAfter = franchise.transactionLog.filter((item) => item.type === "contract" && item.headline === "Contract signed").length;
    contractAttempts += 1;
    if (reSignAfter > reSignBefore) contractAccepted += 1;
    const previousReSignPhase = franchise.seasonPhase;
    franchise = advanceSeasonPhase(franchise, new SeededRng(`${seed}-resigning-${season}`));
    franchise = tickPhaseStoryPlaytest(franchise, livingOps, previousReSignPhase, franchise.seasonPhase, `${seed}-resign-story-${season}`);
    check(`${seasonYear} re-signing`);

    franchise = maybeSignFreeAgent(franchise);
    while (franchise.freeAgencyState && !franchise.freeAgencyState.completed) {
      franchise = advanceFreeAgencyDay(franchise, new SeededRng(`${seed}-fa-${season}-${franchise.freeAgencyState.currentDay}`));
    }
    franchise = repairAllTeamRosters(franchise, "postFreeAgency");
    franchise = tickStoryPlaytest(franchise, livingOps, `${seed}-fa-story-${season}`);
    check(`${seasonYear} free agency`);
    const freeAgencySnapshot = {
      seasonYear,
      marketRemaining: franchise.freeAgencyState?.market.length ?? 0,
      userSignings: franchise.freeAgencyState?.userSignings.length ?? 0,
      aiSignings: franchise.freeAgencyState?.aiSignings.length ?? 0
    };

    franchise = maybeHireStaff(franchise);
    const previousStaffPhase = franchise.seasonPhase;
    franchise = advanceSeasonPhase(franchise, new SeededRng(`${seed}-staff-${season}`));
    franchise = tickPhaseStoryPlaytest(franchise, livingOps, previousStaffPhase, franchise.seasonPhase, `${seed}-staff-story-${season}`);
    check(`${seasonYear} staff hiring`);
    const staffReport = invariantReports[invariantReports.length - 1];
    const capSnapshot = summarizeCap(franchise, seasonYear);
    const rosterSnapshot = summarizeRosters(franchise, seasonYear, staffReport);

    const previousCampPhase = franchise.seasonPhase;
    franchise = advanceSeasonPhase(franchise, new SeededRng(`${seed}-camp-${season}`));
    franchise = tickPhaseStoryPlaytest(franchise, livingOps, previousCampPhase, franchise.seasonPhase, `${seed}-camp-story-${season}`);
    franchise = repairAllTeamRosters(franchise, "newSeason");
    franchise = tickStoryPlaytest(franchise, livingOps, `${seed}-new-season-story-${season}`);
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
    emergencyReplacementCounts.push({ seasonYear, count: franchise.league.teams.flatMap((team) => team.roster).filter((player) => player.acquiredVia === "replacement").length });
    affiliatePromotions.push({ seasonYear, count: franchise.rosterMoveHistory.filter((move) => move.date === franchise.league.currentDate && move.fromStatus === "affiliate").length });
    prospectSignings.push({ seasonYear, count: franchise.rosterMoveHistory.filter((move) => move.type === "signProspect" || move.reason.includes("prospect")).length });
    invalidGameRosters.push({ seasonYear, teams: franchise.league.teams.filter((team) => validateRosterForGame(team).errors.length > 0).length });
    capOverTeams.push({ seasonYear, teams: franchise.league.teams.filter((team) => calculateCapSpace(team) < 0).length });
    const assistantReport = generateAssistantGmReport(franchise, { type: "weekly", date: franchise.league.currentDate });
    livingOps.assistantGmRecommendationsGenerated += assistantReport.recommendations.length;
    livingOps.urgentActionsGenerated += getUrgentActionCount(franchise);
    franchise = { ...franchise, assistantGmReports: [assistantReport, ...franchise.assistantGmReports].slice(0, 20) };
    ownerGoalsMet += franchise.ownerState.seasonGoals.filter((goal) => goal.status === "met").length;
    ownerGoalsTotal += franchise.ownerState.seasonGoals.length;
    recordLivingOpsSnapshot(franchise, livingOps, seasonYear);
  }

  const ownerGoalReport = createOwnerGoalReport(franchise);
  livingOps.contractAcceptanceRate = contractAttempts ? contractAccepted / contractAttempts : 0;
  livingOps.ownerGoalCompletionRate = ownerGoalReport.total ? ownerGoalReport.completionRate : ownerGoalsTotal ? ownerGoalsMet / ownerGoalsTotal : 0;

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
    emergencyReplacementCounts,
    affiliatePromotions,
    prospectSignings,
    invalidGameRosters,
    capOverTeams,
    livingOps,
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
  return rights ? signProspect(franchise, rights.prospectId, "affiliate") : franchise;
}

function maybeSignFreeAgent(franchise: FranchiseState): FranchiseState {
  const state = franchise.freeAgencyState;
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId);
  if (!state || !team || activeRosterCount(team) >= (team.activeRosterLimit ?? 23)) return franchise;
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

function tickPhaseStoryPlaytest(
  franchise: FranchiseState,
  livingOps: PlaytestReport["livingOps"],
  previousPhase: FranchiseState["seasonPhase"],
  nextPhase: FranchiseState["seasonPhase"],
  seed: string
): FranchiseState {
  let next = mergeDecisionEvents(franchise, generateDecisionEvents(franchise, { kind: "phase", previousPhase, nextPhase }, new SeededRng(seed)));
  return tickStoryPlaytest(next, livingOps, `${seed}-arcs`);
}

function tickStoryPlaytest(franchise: FranchiseState, livingOps: PlaytestReport["livingOps"], seed: string): FranchiseState {
  const beforeEventIds = new Set(franchise.decisionEvents.map((event) => event.id));
  const beforeArcIds = new Set(franchise.storyArcs.map((arc) => arc.id));
  let next = applyNaturalSentimentDecay(franchise);
  next = applyMediaPressureDrift(next);
  next = applyTeamChemistryDrift(next);
  next = applyRelationshipDrift(next);
  next = updateStoryArcs(next, new SeededRng(seed));
  const storyEvents = next.storyArcs.flatMap((arc) => createStoryArcDecisionEvent(next, arc, new SeededRng(`${seed}-${arc.id}`)) ?? []);
  const cadenceEvents = generateDecisionEvents(next, {}, new SeededRng(`${seed}-cadence`));
  next = mergeDecisionEvents(next, [...storyEvents, ...cadenceEvents]);
  const active = next.decisionEvents.filter((event) => event.status === "active");
  next = active.reduce((state, event) => resolveDecisionEvent(state, event.id, preferredPlaytestOption(event), new SeededRng(`${seed}-resolve-${event.id}`)), next);
  next = applyTeamChemistryDrift(applyMediaPressureDrift(applyNaturalSentimentDecay(next)));
  const newEvents = next.decisionEvents.filter((event) => !beforeEventIds.has(event.id));
  livingOps.eventsGenerated += newEvents.length;
  livingOps.highSeverityEvents += newEvents.filter((event) => event.severity === "high" || event.severity === "critical").length;
  livingOps.contractPressureEvents += newEvents.filter((event) => event.type === "contractStandoff" || event.type === "agentCall").length;
  livingOps.tradeRumorEvents += newEvents.filter((event) => event.type === "tradeRumor").length;
  livingOps.playoffPressureEvents += newEvents.filter((event) => event.type === "playoffPressure").length;
  livingOps.storyArcsStarted += next.storyArcs.filter((arc) => !beforeArcIds.has(arc.id)).length;
  livingOps.storyArcsResolved = next.storyArcs.filter((arc) => arc.status === "resolved" || arc.status === "cooldown").length;
  return next;
}

function preferredPlaytestOption(event: { options: Array<{ id: string; tone: string }> }): string {
  return event.options.find((option) => option.tone === "transparent")?.id ?? event.options.find((option) => option.tone === "supportive")?.id ?? event.options[0]?.id ?? "";
}

function recordLivingOpsSnapshot(franchise: FranchiseState, livingOps: PlaytestReport["livingOps"], seasonYear: number) {
  const dynamics = getTeamDynamics(franchise, franchise.selectedTeamId);
  const trustValues = Object.values(franchise.playerRelationships).map((relationship) => relationship.trust);
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId);
  const capPressure = team ? Math.max(0, Math.round((1 - calculateCapSpace(team) / Math.max(1, team.capCeiling)) * 100)) : 0;
  livingOps.ownerTrustTrend.push({ seasonYear, value: dynamics.ownerTrust });
  livingOps.teamChemistryTrend.push({ seasonYear, value: dynamics.chemistry });
  livingOps.mediaPressureTrend.push({ seasonYear, value: franchise.mediaState.pressure });
  livingOps.fanSentimentTrend.push({ seasonYear, value: dynamics.fanSentiment });
  livingOps.capPressureTrend.push({ seasonYear, value: capPressure });
  livingOps.playerTrustRange.push({
    seasonYear,
    low: trustValues.length ? Math.min(...trustValues) : 0,
    high: trustValues.length ? Math.max(...trustValues) : 0
  });
}

function refreshLivingOpsForPlaytest(franchise: FranchiseState, seed: string): FranchiseState {
  const playerIds = new Set(franchise.league.teams.flatMap((team) => team.roster.map((player) => player.id)));
  const agents = generateAgentsForPlayers(franchise, new SeededRng(`${seed}-agents`));
  const withAgents = { ...franchise, agents };
  const generatedRelationships = generateInitialPlayerRelationships(withAgents);
  const playerRelationships = Object.fromEntries(
    Array.from(playerIds).map((playerId) => [
      playerId,
      {
        ...(generatedRelationships[playerId] ?? { playerId, trust: 55, roleSatisfaction: 55, communication: 55, pressureTolerance: 55, notes: [] }),
        ...(franchise.playerRelationships[playerId] ?? {}),
        playerId,
        agentId: agents.find((agent) => agent.clientPlayerIds.includes(playerId))?.id
      }
    ])
  ) as FranchiseState["playerRelationships"];
  const withRelationships = { ...withAgents, playerRelationships };
  const generatedDynamics = generateInitialTeamDynamics(withRelationships);
  const teamDynamics = Object.fromEntries(
    franchise.league.teams.map((team) => [team.id, { ...generatedDynamics[team.id], ...(franchise.teamDynamics[team.id] ?? {}) }])
  ) as FranchiseState["teamDynamics"];
  return {
    ...withRelationships,
    teamDynamics,
    mediaState: franchise.mediaState ?? defaultMediaState(withRelationships),
    decisionEvents: franchise.decisionEvents.filter((event) => (event.playerIds ?? []).every((playerId) => playerIds.has(playerId))),
    storyArcs: franchise.storyArcs.filter((arc) => arc.playerIds.every((playerId) => playerIds.has(playerId)))
  };
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
  const sizes = franchise.league.teams.map((team) => activeRosterCount(team));
  return {
    seasonYear,
    minRoster: Math.min(...sizes),
    maxRoster: Math.max(...sizes),
    warnings: report.warnings.filter((warning) => warning.code === "team.rosterShort" || warning.code === "team.activeRosterUnderMinimum").length
  };
}
