import { autoFillBestLineup } from "./lineupValidation";
import { calculateCapSpace, contractSummary, estimateMarketSalary, formatMoney } from "./contracts";
import { evaluateContractOffer } from "./contractNegotiation";
import { calculateTeamStaffModifiers } from "./staff";
import { generateDisplayName, generateNationality } from "../generators/generateNames";
import { SeededRng, clamp } from "../rng";
import type {
  ContractOffer,
  ContractOfferEvaluation,
  FranchiseState,
  FreeAgentPlayer,
  FreeAgentState,
  GoalieAttributes,
  NewsItem,
  Player,
  Position,
  SkaterAttributes,
  Team,
  TransactionLogItem
} from "../types";

const MARKET_SIZE = 24;
const ACTIVE_ROSTER_LIMIT = 30;

export function createFreeAgentMarket(franchise: FranchiseState, rng = new SeededRng(`${franchise.franchiseId}-free-agency-${franchise.league.seasonYear}`)): FreeAgentState {
  const existing = franchise.freeAgencyState?.market ?? [];
  const generated = createGeneratedFreeAgents(franchise.league.seasonYear, rng, Math.max(0, MARKET_SIZE - existing.length));
  const wrapped = generated.map((player) => wrapFreeAgent(player, franchise.league.teams, rng));
  return {
    market: [...existing, ...wrapped].sort((a, b) => b.player.overall - a.player.overall),
    currentDay: franchise.freeAgencyState?.currentDay ?? 1,
    maxDays: franchise.freeAgencyState?.maxDays ?? 7,
    userSignings: franchise.freeAgencyState?.userSignings ?? [],
    aiSignings: franchise.freeAgencyState?.aiSignings ?? [],
    completed: false
  };
}

export function createGeneratedFreeAgents(seasonYear: number, rng = new SeededRng(`generated-free-agents-${seasonYear}`), count = MARKET_SIZE): Player[] {
  const positions: Position[] = ["LW", "C", "RW", "LD", "RD", "G"];
  return Array.from({ length: count }, (_, index) => {
    const position = positions[index % positions.length];
    const name = generateDisplayName(rng);
    const age = rng.int(24, 35);
    const overall = clamp(rng.int(62, 82) + (index < 4 ? rng.int(2, 7) : 0), 55, 88);
    const potential = clamp(overall + (age <= 27 ? rng.int(0, 5) : -rng.int(0, 4)), 50, 90);
    const roleExpectation = inferRole(position, overall);
    const contract = {
      salary: 775_000,
      capHit: 775_000,
      yearsRemaining: 0,
      expiryStatus: "UFA" as const,
      rolePromise: roleExpectation,
      signedAtAge: age
    };
    return {
      id: `ufa-${seasonYear}-${index + 1}-${name.firstName.toLowerCase()}-${name.lastName.toLowerCase()}`,
      teamId: "free-agent",
      firstName: name.firstName,
      lastName: name.lastName,
      displayName: name.displayName,
      age,
      position,
      handedness: rng.chance(0.6) ? "L" : "R",
      nationality: generateNationality(rng),
      archetype: position === "G" ? "Hybrid Goalie" : position === "LD" || position === "RD" ? "Puck-Moving Defenseman" : "Two-Way Forward",
      personality: rng.pick(["Professional", "Competitive", "Quiet Worker", "Locker-Room Glue", "High-Maintenance Star"]),
      overall,
      potential,
      roleExpectation,
      morale: rng.int(48, 72),
      form: rng.int(45, 67),
      fatigue: rng.int(12, 36),
      injuryStatus: "healthy",
      injuryGamesRemaining: 0,
      attributes: position === "G" ? goalieAttributes(overall, rng) : skaterAttributes(overall, rng),
      stats: emptyStats(),
      contract,
      contractSummary: contractSummary(contract)
    };
  });
}

export function evaluateFreeAgentOffer(
  freeAgent: FreeAgentPlayer,
  offer: ContractOffer,
  team: Team,
  franchise: FranchiseState
): ContractOfferEvaluation {
  const base = evaluateContractOffer(freeAgent.player, offer, team, franchise);
  const interest = freeAgent.interestByTeam[team.id] ?? 50;
  const assistantGm = calculateTeamStaffModifiers(franchise.staffState, team.id).negotiation;
  const salaryFit = offer.capHit / Math.max(1, freeAgent.demandSalary);
  const adjustedInterest = Math.round(clamp(base.playerInterest * 0.72 + interest * 0.28 + assistantGm * 2 + (salaryFit >= 1.05 ? 8 : 0), 0, 100));
  const warnings = [...base.warnings];
  if (team.roster.length >= ACTIVE_ROSTER_LIMIT) warnings.push("Active roster is already at the 30-player prototype limit.");
  const accepted = warnings.length === 0 && adjustedInterest >= 82 && offer.capHit >= freeAgent.demandSalary * 0.95;
  return {
    ...base,
    accepted,
    playerInterest: adjustedInterest,
    demandSalary: freeAgent.demandSalary,
    demandYears: freeAgent.demandYears,
    reasons: accepted ? ["The offer leads the market and fits the player's role expectations."] : [...base.reasons, "Free-agent interest has not cleared the acceptance threshold."]
  };
}

export function applyFreeAgentSigning(franchise: FranchiseState, freeAgentId: string, offer: ContractOffer): FranchiseState {
  const state = franchise.freeAgencyState ?? createFreeAgentMarket(franchise);
  const freeAgent = state.market.find((candidate) => candidate.player.id === freeAgentId);
  const team = franchise.league.teams.find((candidate) => candidate.id === offer.teamId);
  if (!freeAgent || !team) return franchise;
  const evaluation = evaluateFreeAgentOffer(freeAgent, offer, team, franchise);
  if (!evaluation.accepted) {
    return {
      ...franchise,
      inbox: [...createFreeAgencyNews(freeAgent, offer, evaluation, franchise.league.currentDate, team.id), ...franchise.inbox].slice(0, 60),
      freeAgencyState: state
    };
  }
  const signedPlayer = {
    ...freeAgent.player,
    teamId: team.id,
    contract: {
      ...freeAgent.player.contract,
      salary: offer.salary,
      capHit: offer.capHit,
      yearsRemaining: offer.years,
      expiryStatus: "UFA" as const,
      rolePromise: offer.rolePromise ?? freeAgent.player.roleExpectation,
      signedAtAge: freeAgent.player.age
    }
  };
  signedPlayer.contractSummary = contractSummary(signedPlayer.contract);
  const nextTeam = { ...team, roster: [...team.roster, signedPlayer] };
  const normalizedTeam = { ...nextTeam, lines: autoFillBestLineup(nextTeam).lineup };
  const log: TransactionLogItem = {
    id: `fa-sign-${freeAgentId}-${offer.teamId}`,
    date: franchise.league.currentDate,
    type: "freeAgency",
    headline: `${signedPlayer.displayName} signs`,
    details: `${team.fullName} sign ${signedPlayer.displayName} for ${offer.years} years at ${formatMoney(offer.capHit)}.`,
    teamIds: [team.id],
    playerIds: [signedPlayer.id]
  };
  return {
    ...franchise,
    league: {
      ...franchise.league,
      teams: franchise.league.teams.map((candidate) => (candidate.id === team.id ? normalizedTeam : candidate))
    },
    freeAgencyState: {
      ...state,
      market: state.market.filter((candidate) => candidate.player.id !== freeAgentId),
      userSignings: team.id === franchise.selectedTeamId ? [signedPlayer.id, ...state.userSignings] : state.userSignings,
      aiSignings: team.id === franchise.selectedTeamId ? state.aiSignings : [log, ...state.aiSignings].slice(0, 20)
    },
    transactionLog: [log, ...franchise.transactionLog].slice(0, 50),
    inbox: [...createFreeAgencyNews(freeAgent, offer, evaluation, franchise.league.currentDate, team.id), ...franchise.inbox].slice(0, 60),
    updatedAt: new Date().toISOString()
  };
}

export function runAiFreeAgencyDay(franchise: FranchiseState, rng = new SeededRng(`${franchise.franchiseId}-ai-fa-${franchise.freeAgencyState?.currentDay ?? 1}`)): FranchiseState {
  let next = franchise.freeAgencyState ? franchise : { ...franchise, freeAgencyState: createFreeAgentMarket(franchise, rng) };
  const market = [...(next.freeAgencyState?.market ?? [])].sort((a, b) => b.player.overall - a.player.overall);
  const attempts = Math.min(4, market.length);
  for (let i = 0; i < attempts; i += 1) {
    const freeAgent = market[i];
    if (!freeAgent || !next.freeAgencyState?.market.some((candidate) => candidate.player.id === freeAgent.player.id)) continue;
    const candidates = next.league.teams
      .filter((team) => team.id !== next.selectedTeamId && team.roster.length < ACTIVE_ROSTER_LIMIT && calculateCapSpace(team) > freeAgent.demandSalary)
      .sort((a, b) => rosterNeedScore(b, freeAgent.player.position) - rosterNeedScore(a, freeAgent.player.position));
    const team = candidates[0];
    if (!team || !rng.chance(0.65)) continue;
    const offer: ContractOffer = {
      id: `ai-fa-${team.id}-${freeAgent.player.id}`,
      playerId: freeAgent.player.id,
      teamId: team.id,
      salary: freeAgent.demandSalary,
      capHit: freeAgent.demandSalary,
      years: freeAgent.demandYears,
      offerType: "freeAgent",
      status: "draft",
      rolePromise: freeAgent.player.roleExpectation
    };
    next = applyFreeAgentSigning(next, freeAgent.player.id, offer);
  }
  return next;
}

export function advanceFreeAgencyDay(franchise: FranchiseState, rng = new SeededRng(`${franchise.franchiseId}-fa-day-${franchise.freeAgencyState?.currentDay ?? 1}`)): FranchiseState {
  const withMarket = franchise.freeAgencyState ? franchise : { ...franchise, freeAgencyState: createFreeAgentMarket(franchise, rng) };
  const resolved = runAiFreeAgencyDay(withMarket, rng);
  const state = resolved.freeAgencyState!;
  const currentDay = Math.min(state.maxDays, state.currentDay + 1);
  const completed = currentDay >= state.maxDays;
  return {
    ...resolved,
    freeAgencyState: {
      ...state,
      currentDay,
      completed
    },
    seasonPhase: completed ? "staffHiring" : resolved.seasonPhase,
    updatedAt: new Date().toISOString()
  };
}

export function completeFreeAgency(franchise: FranchiseState): FranchiseState {
  if (!franchise.freeAgencyState) return franchise;
  return {
    ...franchise,
    freeAgencyState: {
      ...franchise.freeAgencyState,
      currentDay: franchise.freeAgencyState.maxDays,
      completed: true
    },
    seasonPhase: "staffHiring",
    updatedAt: new Date().toISOString()
  };
}

export function createFreeAgencyNews(
  freeAgent: FreeAgentPlayer,
  offer: ContractOffer,
  evaluation: ContractOfferEvaluation,
  date: string,
  teamId: string
): NewsItem[] {
  return [
    {
      id: `fa-news-${freeAgent.player.id}-${offer.id}-${evaluation.accepted ? "signed" : "missed"}`,
      type: "freeAgency",
      date,
      headline: evaluation.accepted ? `Free Agency: ${freeAgent.player.displayName} signs` : `Free Agency: ${freeAgent.player.displayName} keeps listening`,
      body: evaluation.accepted
        ? `${formatMoney(offer.capHit)} for ${offer.years} year${offer.years === 1 ? "" : "s"} gets the deal done.`
        : evaluation.reasons[0] ?? "The market remains open.",
      severity: evaluation.accepted && freeAgent.player.overall >= 78 ? "medium" : "low",
      teamId,
      playerId: freeAgent.player.id
    }
  ];
}

function wrapFreeAgent(player: Player, teams: Team[], rng: SeededRng): FreeAgentPlayer {
  const demandSalary = Math.round((estimateMarketSalary(player) * rng.float(0.94, 1.12)) / 25_000) * 25_000;
  const demandYears = player.age >= 34 ? 1 : player.overall >= 80 ? rng.int(2, 4) : rng.int(1, 3);
  return {
    player,
    demandSalary,
    demandYears,
    interestByTeam: Object.fromEntries(
      teams.map((team) => {
        const depth = rosterNeedScore(team, player.position);
        const market = team.marketSize === "Large" ? 6 : team.marketSize === "Small" ? -3 : 2;
        const winning = team.record.points >= team.stats.gamesPlayed ? 6 : -2;
        return [team.id, clamp(48 + depth + market + winning + rng.int(-8, 9), 0, 100)];
      })
    ),
    marketBuzz: rng.pick([
      "Several clubs see a clean fit if the cap math holds.",
      "Agent camp is waiting for a clearer role promise.",
      "The player is weighing comfort against a chance to win.",
      "Market has been quiet, which may create value."
    ])
  };
}

function rosterNeedScore(team: Team, position: Position): number {
  const count = team.roster.filter((player) => player.position === position).length;
  const average =
    team.roster.filter((player) => player.position === position).reduce((sum, player) => sum + player.overall, 0) / Math.max(1, count);
  return Math.round(Math.max(0, 75 - average) * 0.6 + Math.max(0, idealCount(position) - count) * 10);
}

function idealCount(position: Position): number {
  if (position === "G") return 2;
  if (position === "LD" || position === "RD") return 4;
  return 5;
}

function inferRole(position: Position, overall: number): Player["roleExpectation"] {
  if (position === "G") return overall >= 76 ? "Starter" : "Backup";
  if (position === "LD" || position === "RD") return overall >= 82 ? "Top Pair" : overall >= 74 ? "Second Pair" : "Third Pair";
  if (overall >= 84) return "Top Line";
  if (overall >= 77) return "Top Six";
  if (overall >= 68) return "Middle Six";
  return "Depth";
}

function emptyStats(): Player["stats"] {
  return {
    gamesPlayed: 0,
    goals: 0,
    assists: 0,
    points: 0,
    plusMinus: 0,
    penaltyMinutes: 0,
    shots: 0,
    hits: 0,
    blocks: 0,
    goalieWins: 0,
    goalieLosses: 0,
    saves: 0,
    goalsAgainst: 0,
    shutouts: 0
  };
}

function skaterAttributes(overall: number, rng: SeededRng): SkaterAttributes {
  const attr = () => clamp(overall + rng.int(-9, 10), 40, 99);
  return {
    skating: attr(),
    shooting: attr(),
    passing: attr(),
    puckHandling: attr(),
    defense: attr(),
    physicality: attr(),
    hockeyIQ: attr(),
    discipline: attr(),
    consistency: attr(),
    leadership: attr(),
    stamina: attr()
  };
}

function goalieAttributes(overall: number, rng: SeededRng): GoalieAttributes {
  const attr = () => clamp(overall + rng.int(-8, 9), 40, 99);
  return {
    reflexes: attr(),
    positioning: attr(),
    reboundControl: attr(),
    puckTracking: attr(),
    athleticism: attr(),
    mentalToughness: attr(),
    consistency: attr(),
    stamina: attr()
  };
}
