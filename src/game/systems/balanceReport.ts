import { createFranchise, generateLeague } from "../generators/generateLeague";
import { SeededRng } from "../rng";
import { simulateGame } from "../simulation/simulateGame";
import { applyGameToStandings } from "./standings";
import { calculateTeamCapHit, estimateMarketSalary } from "./contracts";
import { createContractDemand, evaluateContractOffer } from "./contractNegotiation";
import { createDraftOrder } from "./draftExecution";
import { createFreeAgentMarket, advanceFreeAgencyDay } from "./freeAgency";
import { createPlayoffState, simulatePlayoffsUntil } from "./playoffs";
import { applyOffseasonDevelopment } from "./playerLifecycle";
import { evaluateTrade } from "./trades";
import { TUNING } from "./tuning";
import { runDynastyPlaytest } from "./dynastyPlaytest";
import type { ContractOffer, FranchiseSetupOptions, FranchiseState, LeagueState, Player, Team, TradeProposal } from "../types";

export interface Phase7BalanceScenarioReport {
  label: string;
  setup: FranchiseSetupOptions;
  decisionEventsGenerated: number;
  highSeverityEvents: number;
  storyArcsStarted: number;
  storyArcsResolved: number;
  ownerTrustTrend: number[];
  chemistryTrend: number[];
  mediaPressureTrend: number[];
  fanSentimentTrend: number[];
  assistantGmRecommendationsGenerated: number;
  urgentActionsGenerated: number;
  capPressureTrend: number[];
  contractAcceptanceRate: number;
  ownerGoalCompletionRate: number;
  fatalInvariantErrors: number;
  nonfatalWarnings: number;
  champions: string[];
}

export interface BalanceReport {
  seeds: string[];
  seasonsPerSeed: number;
  generatedAt: string;
  leagueScoring: {
    averageGoalsPerGame: number;
    averageShotsPerGame: number;
    powerPlayConversion: number;
    shutoutFrequency: number;
    overtimeFrequency: number;
  };
  rosterEconomy: {
    averageTeamCapHit: number;
    teamsOverCap: number;
    averageStarSalary: number;
    averageDepthSalary: number;
    freeAgentSigningRate: number;
    reSigningAcceptanceRate: number;
    tradeAcceptanceRate: number;
  };
  draftScouting: {
    averageActualOverallByRound: Record<number, number>;
    averagePotentialByRound: Record<number, number>;
    riskDistribution: Record<string, number>;
    averageCertaintyByDraftDay: number;
  };
  development: {
    averageGrowthUnder23: number;
    averageDeclineOver34: number;
    aggressivePlanFatiguePenaltyFrequency: number;
    prospectSigningFrequency: number;
  };
  ownerGameplay: {
    averageJobSecurity: number;
    goalCompletionRate: number;
    playoffQualificationVolatility: number;
    champions: string[];
  };
  notes: string[];
}

export function generateBalanceReport(seeds = ["phase4-a", "phase4-b", "phase4-c"], seasonsPerSeed = 1): BalanceReport {
  const scoring = createNumberBucket();
  const shots = createNumberBucket();
  const ppGoals = createNumberBucket();
  const ppAttempts = createNumberBucket();
  const shutouts = createNumberBucket();
  const overtime = createNumberBucket();
  const capHits: number[] = [];
  const starSalaries: number[] = [];
  const depthSalaries: number[] = [];
  let teamsOverCap = 0;
  let faBefore = 0;
  let faAfter = 0;
  let reSignAttempts = 0;
  let reSignAccepted = 0;
  let tradeAttempts = 0;
  let tradeAccepted = 0;
  const actualByRound = new Map<number, number[]>();
  const potentialByRound = new Map<number, number[]>();
  const riskDistribution: Record<string, number> = {};
  const certainty: number[] = [];
  const youngGrowth: number[] = [];
  const oldDecline: number[] = [];
  let aggressiveFatigueWarnings = 0;
  let aggressiveSamples = 0;
  let prospectSigned = 0;
  let prospectAvailable = 0;
  const jobSecurity: number[] = [];
  let goalsMet = 0;
  let goalsTotal = 0;
  const selectedRanks: number[] = [];
  const champions: string[] = [];

  seeds.forEach((seed) => {
    let franchise = createFranchise("harbor-city", seed);
    for (let season = 0; season < seasonsPerSeed; season += 1) {
      const sim = simulateRegularSeasonForReport(franchise.league, `${seed}-season-${season}`);
      franchise = { ...franchise, league: sim.league };
      sim.results.forEach((result) => {
        scoring.values.push(result.finalScore.home + result.finalScore.away);
        shots.values.push(result.shots.home + result.shots.away);
        ppGoals.values.push(result.powerPlayGoals.home + result.powerPlayGoals.away);
        ppAttempts.values.push(result.powerPlayAttempts.home + result.powerPlayAttempts.away);
        shutouts.values.push(result.finalScore.home === 0 || result.finalScore.away === 0 ? 1 : 0);
        overtime.values.push(result.finalScore.overtime ? 1 : 0);
      });

      franchise.league.teams.forEach((team) => {
        const hit = calculateTeamCapHit(team);
        capHits.push(hit);
        if (hit > team.capCeiling) teamsOverCap += 1;
        team.roster.forEach((player) => {
          if (player.overall >= TUNING.economy.starOverallThreshold) starSalaries.push(player.contract.capHit);
          if (player.overall <= TUNING.economy.depthOverallThreshold) depthSalaries.push(player.contract.capHit);
        });
      });

      const selected = franchise.league.teams.find((team) => team.id === franchise.selectedTeamId)!;
      selected.roster
        .filter((player) => player.contract.yearsRemaining <= 1)
        .slice(0, 4)
        .forEach((player) => {
          const demand = createContractDemand(player, selected, franchise);
          const offer = offerFor(player, selected, demand.demandSalary * 1.02, demand.demandYears, "extension");
          const evaluation = evaluateContractOffer(player, offer, selected, franchise);
          reSignAttempts += 1;
          if (evaluation.accepted) reSignAccepted += 1;
        });

      tradeAttempts += 2;
      tradeAccepted += sampleTradeAcceptance(franchise);

      const draft = createDraftOrder(franchise);
      draft.pickContexts?.forEach((context, index) => {
        const prospect = franchise.scouting.draftClass[index];
        if (!prospect) return;
        pushMap(actualByRound, context.round, prospect.actualOverall);
        pushMap(potentialByRound, context.round, prospect.actualPotential);
        riskDistribution[prospect.risk] = (riskDistribution[prospect.risk] ?? 0) + 1;
        certainty.push(prospect.scouting.certainty);
      });

      const beforeDevelopment = new Map(franchise.league.teams.flatMap((team) => team.roster.map((player) => [player.id, player.overall] as const)));
      const developed = applyOffseasonDevelopment(franchise, new SeededRng(`${seed}-dev-${season}`));
      developed.league.teams.flatMap((team) => team.roster).forEach((player) => {
        const before = beforeDevelopment.get(player.id) ?? player.overall;
        if (player.age < TUNING.development.youngPlayerAgeCutoff) youngGrowth.push(player.overall - before);
        if (player.age > TUNING.development.veteranDeclineAge) oldDecline.push(before - player.overall);
        if (player.fatigue >= TUNING.development.aggressiveFatigueWarningThreshold) aggressiveFatigueWarnings += 1;
        aggressiveSamples += 1;
      });

      franchise = {
        ...franchise,
        playoffState: createPlayoffState(franchise.league),
        seasonPhase: "playoffs"
      };
      franchise = simulatePlayoffsUntil(franchise, "champion", `${seed}-champion-${season}`);
      const champion = franchise.playoffState?.championTeamId;
      if (champion) champions.push(champion);
      const state = createFreeAgentMarket(franchise, new SeededRng(`${seed}-fa-${season}`));
      faBefore += state.market.length;
      let faFranchise: FranchiseState = { ...franchise, freeAgencyState: state };
      while (faFranchise.freeAgencyState && !faFranchise.freeAgencyState.completed) {
        faFranchise = advanceFreeAgencyDay(faFranchise, new SeededRng(`${seed}-fa-day-${season}-${faFranchise.freeAgencyState.currentDay}`));
      }
      faAfter += faFranchise.freeAgencyState?.market.length ?? 0;

      prospectAvailable += franchise.prospectPools[franchise.selectedTeamId]?.length ?? 0;
      prospectSigned += franchise.prospectPools[franchise.selectedTeamId]?.filter((rights) => rights.signed).length ?? 0;
      jobSecurity.push(franchise.ownerState.jobSecurity);
      goalsMet += franchise.ownerState.seasonGoals.filter((goal) => goal.status === "met").length;
      goalsTotal += franchise.ownerState.seasonGoals.length;
      selectedRanks.push(rankFor(franchise, franchise.selectedTeamId));
    }
  });

  const report: BalanceReport = {
    seeds,
    seasonsPerSeed,
    generatedAt: new Date().toISOString(),
    leagueScoring: {
      averageGoalsPerGame: average(scoring.values),
      averageShotsPerGame: average(shots.values),
      powerPlayConversion: average(ppGoals.values) / Math.max(1, average(ppAttempts.values)),
      shutoutFrequency: average(shutouts.values),
      overtimeFrequency: average(overtime.values)
    },
    rosterEconomy: {
      averageTeamCapHit: average(capHits),
      teamsOverCap,
      averageStarSalary: average(starSalaries),
      averageDepthSalary: average(depthSalaries),
      freeAgentSigningRate: faBefore ? (faBefore - faAfter) / faBefore : 0,
      reSigningAcceptanceRate: reSignAttempts ? reSignAccepted / reSignAttempts : 0,
      tradeAcceptanceRate: tradeAttempts ? tradeAccepted / tradeAttempts : 0
    },
    draftScouting: {
      averageActualOverallByRound: averageMap(actualByRound),
      averagePotentialByRound: averageMap(potentialByRound),
      riskDistribution,
      averageCertaintyByDraftDay: average(certainty)
    },
    development: {
      averageGrowthUnder23: average(youngGrowth),
      averageDeclineOver34: average(oldDecline),
      aggressivePlanFatiguePenaltyFrequency: aggressiveSamples ? aggressiveFatigueWarnings / aggressiveSamples : 0,
      prospectSigningFrequency: prospectAvailable ? prospectSigned / prospectAvailable : 0
    },
    ownerGameplay: {
      averageJobSecurity: average(jobSecurity),
      goalCompletionRate: goalsTotal ? goalsMet / goalsTotal : 0,
      playoffQualificationVolatility: selectedRanks.length ? standardDeviation(selectedRanks) : 0,
      champions
    },
    notes: []
  };

  return { ...report, notes: createBalanceNotes(report) };
}

export function assertReportFinite(report: BalanceReport): boolean {
  const values = [
    ...Object.values(report.leagueScoring),
    ...Object.values(report.rosterEconomy),
    ...Object.values(report.draftScouting.averageActualOverallByRound),
    ...Object.values(report.draftScouting.averagePotentialByRound),
    report.draftScouting.averageCertaintyByDraftDay,
    ...Object.values(report.development),
    report.ownerGameplay.averageJobSecurity,
    report.ownerGameplay.goalCompletionRate,
    report.ownerGameplay.playoffQualificationVolatility
  ];
  return values.every((value) => Number.isFinite(value) && !Number.isNaN(value));
}

export function generatePhase7BalanceReport(selectedTeamId = "harbor-city"): Phase7BalanceScenarioReport[] {
  const scenarios: Array<{ label: string; setup: FranchiseSetupOptions }> = [
    { label: "relaxed / quiet", setup: { difficulty: "relaxed", storyFrequency: "quiet", gameMode: "standardDynasty" } },
    { label: "standard / normal", setup: { difficulty: "standard", storyFrequency: "normal", gameMode: "standardDynasty" } },
    { label: "demanding / normal", setup: { difficulty: "demanding", storyFrequency: "normal", gameMode: "standardDynasty" } },
    { label: "hardcore / dramatic", setup: { difficulty: "hardcore", storyFrequency: "dramatic", gameMode: "standardDynasty" } },
    { label: "rebuildChallenge / normal", setup: { difficulty: "standard", storyFrequency: "normal", gameMode: "rebuildChallenge" } },
    { label: "pressureCooker / dramatic", setup: { difficulty: "demanding", storyFrequency: "dramatic", gameMode: "pressureCooker" } }
  ];
  return scenarios.map(({ label, setup }) => {
    const report = runDynastyPlaytest(`phase7-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`, 5, selectedTeamId, setup);
    return {
      label,
      setup,
      decisionEventsGenerated: report.livingOps.eventsGenerated,
      highSeverityEvents: report.livingOps.highSeverityEvents,
      storyArcsStarted: report.livingOps.storyArcsStarted,
      storyArcsResolved: report.livingOps.storyArcsResolved,
      ownerTrustTrend: report.livingOps.ownerTrustTrend.map((item) => item.value),
      chemistryTrend: report.livingOps.teamChemistryTrend.map((item) => item.value),
      mediaPressureTrend: report.livingOps.mediaPressureTrend.map((item) => item.value),
      fanSentimentTrend: report.livingOps.fanSentimentTrend.map((item) => item.value),
      assistantGmRecommendationsGenerated: report.livingOps.assistantGmRecommendationsGenerated,
      urgentActionsGenerated: report.livingOps.urgentActionsGenerated,
      capPressureTrend: report.livingOps.capPressureTrend.map((item) => item.value),
      contractAcceptanceRate: report.livingOps.contractAcceptanceRate,
      ownerGoalCompletionRate: report.livingOps.ownerGoalCompletionRate,
      fatalInvariantErrors: report.errors.length,
      nonfatalWarnings: report.warnings.length,
      champions: report.championHistory
    };
  });
}

function simulateRegularSeasonForReport(league: LeagueState, seed: string) {
  let next = league;
  const results = [];
  for (const game of league.schedule) {
    const result = simulateGame({
      game,
      homeTeam: findTeam(next, game.homeTeamId),
      awayTeam: findTeam(next, game.awayTeamId),
      seed: `${seed}-${game.id}`
    });
    results.push(result);
    const withStandings = applyGameToStandings(next, result);
    next = {
      ...withStandings,
      schedule: withStandings.schedule.map((candidate) =>
        candidate.id === game.id
          ? {
              ...candidate,
              played: true,
              result: {
                homeGoals: result.finalScore.home,
                awayGoals: result.finalScore.away,
                overtime: result.finalScore.overtime
              }
            }
          : candidate
      )
    };
  }
  return { league: { ...next, completed: true }, results };
}

function sampleTradeAcceptance(franchise: FranchiseState): number {
  const [from, to] = franchise.league.teams;
  const star = [...from.roster].sort((a, b) => b.overall - a.overall)[0];
  const pick = to.draftPicks.find((candidate) => candidate.round === 4) ?? to.draftPicks[0];
  const weakPick = from.draftPicks.find((candidate) => candidate.round === 4) ?? from.draftPicks[0];
  const favorable: TradeProposal = {
    id: `balance-favorable-${franchise.league.seasonYear}`,
    fromTeamId: from.id,
    toTeamId: to.id,
    assetsFrom: [{ type: "player", teamId: from.id, assetId: star.id }],
    assetsTo: [{ type: "pick", teamId: to.id, assetId: pick.id }],
    createdDayIndex: franchise.league.currentDayIndex,
    status: "draft"
  };
  const weak: TradeProposal = {
    id: `balance-weak-${franchise.league.seasonYear}`,
    fromTeamId: from.id,
    toTeamId: to.id,
    assetsFrom: [{ type: "pick", teamId: from.id, assetId: weakPick.id }],
    assetsTo: [{ type: "player", teamId: to.id, assetId: [...to.roster].sort((a, b) => b.overall - a.overall)[0].id }],
    createdDayIndex: franchise.league.currentDayIndex,
    status: "draft"
  };
  return Number(evaluateTrade(favorable, franchise.league).accepted) + Number(evaluateTrade(weak, franchise.league).accepted);
}

function createBalanceNotes(report: BalanceReport): string[] {
  const notes: string[] = [];
  const goalsPerTeam = report.leagueScoring.averageGoalsPerGame / 2;
  if (goalsPerTeam < TUNING.simulation.targetGoalsPerTeam.min) notes.push("Scoring is below the target fun range; shot quality may need a small lift.");
  if (goalsPerTeam > TUNING.simulation.targetGoalsPerTeam.max) notes.push("Scoring is above the target fun range; goalie or defense tuning may need a small lift.");
  if (report.leagueScoring.powerPlayConversion < TUNING.simulation.targetPowerPlayConversion.min) notes.push("Power plays are converting low in the sample.");
  if (report.rosterEconomy.teamsOverCap > 0) notes.push(`${report.rosterEconomy.teamsOverCap} team-season samples were over cap.`);
  if (!notes.length) notes.push("Seed sample sits inside broad Phase 4 plausibility targets.");
  return notes;
}

function offerFor(player: Player, team: Team, salary: number, years: number, offerType: ContractOffer["offerType"]): ContractOffer {
  const rounded = Math.round(salary / 25_000) * 25_000;
  return {
    id: `balance-offer-${player.id}-${rounded}-${years}`,
    playerId: player.id,
    teamId: team.id,
    salary: rounded,
    capHit: rounded,
    years,
    rolePromise: player.roleExpectation,
    offerType,
    status: "draft"
  };
}

function createNumberBucket() {
  return { values: [] as number[] };
}

function pushMap(map: Map<number, number[]>, key: number, value: number) {
  map.set(key, [...(map.get(key) ?? []), value]);
}

function averageMap(map: Map<number, number[]>): Record<number, number> {
  return Object.fromEntries(Array.from(map.entries()).map(([key, values]) => [key, average(values)]));
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(3));
}

function standardDeviation(values: number[]): number {
  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  return Number(Math.sqrt(variance).toFixed(3));
}

function rankFor(franchise: FranchiseState, teamId: string): number {
  return [...franchise.league.teams]
    .sort((a, b) => b.record.points - a.record.points || b.record.wins - a.record.wins)
    .findIndex((team) => team.id === teamId) + 1;
}

function findTeam(league: LeagueState, teamId: string): Team {
  const team = league.teams.find((candidate) => candidate.id === teamId);
  if (!team) throw new Error(`Team not found: ${teamId}`);
  return team;
}
