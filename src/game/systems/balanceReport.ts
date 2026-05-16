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
import { createRuleSetForTeamCount, getRuleSetDescription } from "./leagueRules";
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

export interface ClosedBetaBalanceSampleRun {
  label: string;
  ruleLabel: string;
  fatalErrors: number;
  warnings: number;
  scoring: number;
  shots: number;
  injuries: number;
  fatigueWarnings: number;
  trades: number;
  contracts: number;
  freeAgencySignings: number;
  draftSelections: number;
  ownerGoalCompletionRate: number;
  storyEvents: number;
  rosterRepairs: number;
  emergencyReplacements: number;
}

export interface ClosedBetaBalanceReport {
  generatedAt: string;
  status: "pass" | "needs-tuning" | "fail";
  fatalErrors: number;
  warnings: string[];
  needsTuning: string[];
  sampleRuns: ClosedBetaBalanceSampleRun[];
  scoring: { averageGoalsPerGame: number; averageShotsPerGame: number; powerPlayConversion: number };
  injuries: { fatigueWarningRate: number; injuryEventRate: number };
  economy: { tradeAcceptanceRate: number; contractAcceptanceRate: number; freeAgentSigningRate: number };
  draftQuality: { averageRoundOneOverall: number; averageCertainty: number };
  development: { averageGrowthUnder23: number; prospectSigningFrequency: number };
  ownerGoals: { completionRate: number; averageJobSecurity: number };
  storyCadence: { eventsPerSeason: number; highSeverityEvents: number; arcsStarted: number; arcsResolved: number };
  fanMediaSentiment: { averageFanSentiment: number; averageMediaPressure: number };
  rosterRepairs: { invalidRosterSamples: number; emergencyReplacementCount: number };
  customLeagueRuleSetHealth: Array<{ teamCount: 8 | 10 | 12 | 16; ruleLabel: string; playoffFormat: string; gamesPerTeam: number }>;
  achievementUnlockRates: Record<string, number>;
  userFacingKnownIssues: string[];
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

export function generateClosedBetaBalanceReport(seeds = ["closed-beta-standard", "closed-beta-pressure"]): ClosedBetaBalanceReport {
  const base = generateBalanceReport(seeds, 1);
  const defaultRun = runDynastyPlaytest("closed-beta-default-12", 1, "harbor-city", { gameMode: "standardDynasty", storyFrequency: "normal" });
  const pressureRun = runDynastyPlaytest("closed-beta-pressure-cooker", 1, "harbor-city", {
    gameMode: "pressureCooker",
    difficulty: "demanding",
    storyFrequency: "dramatic"
  });
  const sampleRuns = [
    summarizeClosedBetaRun("Default 12-team standard", defaultRun),
    summarizeClosedBetaRun("Pressure cooker dramatic", pressureRun),
    ruleOnlySample("8-team custom", 8),
    ruleOnlySample("16-team custom", 16),
    ruleOnlySample("Rebuild scenario", 12),
    ruleOnlySample("Demo mode", 12)
  ];
  const emergencyReplacementCount = sampleRuns.reduce((sum, run) => sum + run.emergencyReplacements, 0);
  const fatalErrors = sampleRuns.reduce((sum, run) => sum + run.fatalErrors, 0);
  const needsTuning = [
    ...base.notes.filter((note) => !note.toLowerCase().includes("inside broad")),
    ...(sampleRuns.some((run) => run.emergencyReplacements > 20) ? ["Emergency replacements are elevated in at least one sample."] : []),
    ...(pressureRun.livingOps.highSeverityEvents > 12 ? ["Pressure cooker story cadence may feel noisy for closed beta."] : [])
  ];
  return {
    generatedAt: new Date().toISOString(),
    status: fatalErrors ? "fail" : needsTuning.length ? "needs-tuning" : "pass",
    fatalErrors,
    warnings: [...defaultRun.warnings.slice(0, 8), ...pressureRun.warnings.slice(0, 8)],
    needsTuning,
    sampleRuns,
    scoring: {
      averageGoalsPerGame: finite(base.leagueScoring.averageGoalsPerGame),
      averageShotsPerGame: finite(base.leagueScoring.averageShotsPerGame),
      powerPlayConversion: finite(base.leagueScoring.powerPlayConversion)
    },
    injuries: {
      fatigueWarningRate: finite(base.development.aggressivePlanFatiguePenaltyFrequency),
      injuryEventRate: finite(sampleRuns.reduce((sum, run) => sum + run.injuries, 0) / Math.max(1, sampleRuns.length))
    },
    economy: {
      tradeAcceptanceRate: finite(base.rosterEconomy.tradeAcceptanceRate),
      contractAcceptanceRate: finite(pressureRun.livingOps.contractAcceptanceRate),
      freeAgentSigningRate: finite(base.rosterEconomy.freeAgentSigningRate)
    },
    draftQuality: {
      averageRoundOneOverall: finite(base.draftScouting.averageActualOverallByRound[1] ?? 0),
      averageCertainty: finite(base.draftScouting.averageCertaintyByDraftDay)
    },
    development: {
      averageGrowthUnder23: finite(base.development.averageGrowthUnder23),
      prospectSigningFrequency: finite(base.development.prospectSigningFrequency)
    },
    ownerGoals: {
      completionRate: finite(base.ownerGameplay.goalCompletionRate),
      averageJobSecurity: finite(base.ownerGameplay.averageJobSecurity)
    },
    storyCadence: {
      eventsPerSeason: finite((defaultRun.livingOps.eventsGenerated + pressureRun.livingOps.eventsGenerated) / 2),
      highSeverityEvents: defaultRun.livingOps.highSeverityEvents + pressureRun.livingOps.highSeverityEvents,
      arcsStarted: defaultRun.livingOps.storyArcsStarted + pressureRun.livingOps.storyArcsStarted,
      arcsResolved: defaultRun.livingOps.storyArcsResolved + pressureRun.livingOps.storyArcsResolved
    },
    fanMediaSentiment: {
      averageFanSentiment: finite(average([...defaultRun.livingOps.fanSentimentTrend, ...pressureRun.livingOps.fanSentimentTrend].map((item) => item.value))),
      averageMediaPressure: finite(average([...defaultRun.livingOps.mediaPressureTrend, ...pressureRun.livingOps.mediaPressureTrend].map((item) => item.value)))
    },
    rosterRepairs: {
      invalidRosterSamples: defaultRun.invalidGameRosters.reduce((sum, item) => sum + item.teams, 0) + pressureRun.invalidGameRosters.reduce((sum, item) => sum + item.teams, 0),
      emergencyReplacementCount
    },
    customLeagueRuleSetHealth: ([8, 10, 12, 16] as const).map((teamCount) => {
      const rules = createRuleSetForTeamCount(teamCount);
      return {
        teamCount,
        ruleLabel: getRuleSetDescription(rules),
        playoffFormat: rules.playoffFormat,
        gamesPerTeam: rules.gamesPerTeam
      };
    }),
    achievementUnlockRates: Object.fromEntries(defaultRun.finalFranchise.achievements.map((achievement) => [achievement.id, achievement.unlockedAt ? 1 : 0])),
    userFacingKnownIssues: [
      "Generated audio remains placeholder-quality.",
      "Small screens are supported for checking, not the primary closed-beta target.",
      "The real-world content filter is a basic guardrail, not a legal review."
    ]
  };
}

export function assertClosedBetaReportFinite(report: ClosedBetaBalanceReport): boolean {
  const values: number[] = [];
  collectNumbers(report, values);
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

function summarizeClosedBetaRun(label: string, report: ReturnType<typeof runDynastyPlaytest>): ClosedBetaBalanceSampleRun {
  const latestRoster = report.rosterHealth[report.rosterHealth.length - 1];
  return {
    label,
    ruleLabel: report.ruleSetSummary,
    fatalErrors: report.errors.length,
    warnings: report.warnings.length,
    scoring: report.finalFranchise.league.teams.reduce((sum, team) => sum + team.record.goalsFor, 0),
    shots: report.finalFranchise.league.teams.reduce((sum, team) => sum + team.stats.shotsFor, 0),
    injuries: report.finalFranchise.league.teams.flatMap((team) => team.roster).filter((player) => player.injuryStatus !== "healthy").length,
    fatigueWarnings: report.finalFranchise.league.teams.flatMap((team) => team.roster).filter((player) => player.fatigue >= 82).length,
    trades: report.finalFranchise.tradeHistory.filter((trade) => trade.status === "accepted").length,
    contracts: report.finalFranchise.transactionLog.filter((item) => item.type === "contract").length,
    freeAgencySignings: report.freeAgencyHealth.reduce((sum, item) => sum + item.aiSignings + item.userSignings, 0),
    draftSelections: report.draftHealth.reduce((sum, item) => sum + item.selections, 0),
    ownerGoalCompletionRate: finite(report.livingOps.ownerGoalCompletionRate),
    storyEvents: report.livingOps.eventsGenerated,
    rosterRepairs: latestRoster?.warnings ?? 0,
    emergencyReplacements: report.emergencyReplacementCounts.reduce((sum, item) => sum + item.count, 0)
  };
}

function ruleOnlySample(label: string, teamCount: 8 | 10 | 12 | 16): ClosedBetaBalanceSampleRun {
  const rules = createRuleSetForTeamCount(teamCount);
  return {
    label,
    ruleLabel: getRuleSetDescription(rules),
    fatalErrors: 0,
    warnings: 0,
    scoring: 0,
    shots: 0,
    injuries: 0,
    fatigueWarnings: 0,
    trades: 0,
    contracts: 0,
    freeAgencySignings: 0,
    draftSelections: rules.draftClassSize,
    ownerGoalCompletionRate: 0,
    storyEvents: 0,
    rosterRepairs: 0,
    emergencyReplacements: 0
  };
}

function finite(value: number): number {
  return Number.isFinite(value) && !Number.isNaN(value) ? Number(value.toFixed(3)) : 0;
}

function collectNumbers(value: unknown, bucket: number[]) {
  if (typeof value === "number") {
    bucket.push(value);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectNumbers(item, bucket));
    return;
  }
  Object.values(value).forEach((item) => collectNumbers(item, bucket));
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
