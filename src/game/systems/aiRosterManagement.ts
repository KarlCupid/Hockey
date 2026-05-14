import { ACTIVE_ROSTER_LIMIT, ACTIVE_ROSTER_MINIMUM } from "../constants";
import { generateDisplayName, generateNationality } from "../generators/generateNames";
import { SeededRng, clamp } from "../rng";
import type {
  FranchiseState,
  FreeAgentState,
  GoalieAttributes,
  LeagueState,
  NewsItem,
  Player,
  Position,
  ProspectRights,
  RoleExpectation,
  RosterMove,
  SkaterAttributes,
  Team,
  TeamRosterRepairResult,
  TransactionLogItem
} from "../types";
import { contractSummary, createContractForPlayer } from "./contracts";
import { autoFillBestLineup } from "./lineupValidation";
import { createPlayerFromProspectRights } from "./prospects";
import { getPlayerRosterStatus, validateRosterForGame } from "./rosterRules";
import { autoSetInitialRosterStatuses, createRosterMoveTransaction, defaultRosterStatusForIncomingPlayer } from "./rosterManagement";

export type RosterRepairContext =
  | "newFranchise"
  | "postTrade"
  | "postFreeAgency"
  | "trainingCamp"
  | "newSeason"
  | "preGame"
  | "playtestRepair";

export function repairAllTeamRosters(franchise: FranchiseState, context: RosterRepairContext = "playtestRepair"): FranchiseState {
  const rng = new SeededRng(`${franchise.franchiseId}-roster-repair-${context}-${franchise.league.seasonYear}-${franchise.league.currentDayIndex}`);
  const moves: RosterMove[] = [];
  const news: NewsItem[] = [];
  const transactions: TransactionLogItem[] = [];
  const freeAgentSignedIds: string[] = [];
  const prospectPools = { ...(franchise.prospectPools ?? {}) };
  let availableFreeAgency = franchise.freeAgencyState;
  const teams = franchise.league.teams.map((team) => {
    const result = repairTeamRoster(team, franchise.league, availableFreeAgency, prospectPools[team.id] ?? [], rng, context);
    prospectPools[team.id] = result.prospectPool ?? prospectPools[team.id] ?? [];
    moves.push(...result.moves);
    freeAgentSignedIds.push(...(result.freeAgentSignedIds ?? []));
    if (availableFreeAgency && result.freeAgentSignedIds?.length) {
      availableFreeAgency = {
        ...availableFreeAgency,
        market: availableFreeAgency.market.filter((entry) => !result.freeAgentSignedIds?.includes(entry.player.id))
      };
    }
    news.push(...createRosterRepairNews(result, franchise.league.currentDate));
    transactions.push(
      ...result.moves.map((move) => {
        const player = result.team.roster.find((candidate) => candidate.id === move.playerId);
        return player ? createRosterMoveTransaction(move, result.team, player) : undefined;
      }).filter((item): item is NonNullable<typeof item> => Boolean(item))
    );
    return result.team;
  });
  const signedPlayerIds = new Set(teams.flatMap((team) => team.roster.map((player) => player.id)));
  const repairedProspectPools = Object.fromEntries(
    Object.entries(prospectPools).map(([teamId, pool]) => [
      teamId,
      pool.map((rights) => (signedPlayerIds.has(`player-${rights.prospectId}`) ? { ...rights, signed: true } : rights))
    ])
  );
  return {
    ...franchise,
    league: {
      ...franchise.league,
      teams
    },
    freeAgencyState: availableFreeAgency
      ? {
          ...availableFreeAgency,
          market: availableFreeAgency.market.filter((entry) => !freeAgentSignedIds.includes(entry.player.id))
        }
      : availableFreeAgency,
    prospectPools: repairedProspectPools,
    rosterMoveHistory: [...moves, ...(franchise.rosterMoveHistory ?? [])].slice(0, 140),
    transactionLog: [...transactions, ...franchise.transactionLog].slice(0, 80),
    inbox: [...news, ...franchise.inbox].slice(0, 60),
    updatedAt: new Date().toISOString()
  };
}

export function repairTeamRoster(
  team: Team,
  league: LeagueState,
  freeAgencyState: FreeAgentState | undefined,
  prospectPool: ProspectRights[] = [],
  rng: SeededRng,
  context: RosterRepairContext
): TeamRosterRepairResult {
  let next = autoClassifyRosterStatuses(team);
  const moves: RosterMove[] = [];
  const warnings: string[] = [];
  let pool = [...prospectPool];
  let emergencyReplacementCount = 0;
  let affiliatePromotions = 0;
  let prospectSignings = 0;
  let freeAgentSignedIds: string[] = [];

  next = moveLongInjuriesToIR(next, league.currentDate, league.currentDayIndex, moves);
  next = ensurePositionMinimums(next, rng, league.currentDate, league.currentDayIndex, moves);
  next = ensureGoalieDepth(next, rng, league.currentDate, league.currentDayIndex, moves);
  let report = validateRosterForGame(next);

  if (report.errors.length) {
    const promoted = autoPromoteProspects(next, pool, rng);
    next = promoted.team;
    pool = promoted.prospectPool;
    moves.push(...promoted.moves.map((move) => ({ ...move, date: league.currentDate })));
    prospectSignings += promoted.moves.length;
    report = validateRosterForGame(next);
  }

  if (report.errors.length && freeAgencyState?.market?.length) {
    const used = useFreeAgentsForTeamDepth(next, freeAgencyState, rng, league.currentDate, league.currentDayIndex, moves);
    next = used.team;
    freeAgentSignedIds = [...freeAgentSignedIds, ...used.signedIds];
    report = validateRosterForGame(next);
  }

  if (report.errors.length) {
    const replaced = autoSignReplacementPlayers(next, rng, league.currentDate, league.currentDayIndex, moves);
    next = replaced.team;
    emergencyReplacementCount += replaced.count;
  }

  const beforeSurplusAffiliate = next.roster.filter((player) => getPlayerRosterStatus(player) === "affiliate").length;
  next = autoSendSurplusPlayersToAffiliate(next, league.currentDate, league.currentDayIndex, moves);
  const afterSurplusAffiliate = next.roster.filter((player) => getPlayerRosterStatus(player) === "affiliate").length;
  affiliatePromotions += Math.max(0, beforeSurplusAffiliate - afterSurplusAffiliate);
  next = ensureMinimumActiveRoster(next, rng, league.currentDate, league.currentDayIndex, moves);
  next = autoFixLineupAfterRosterRepair(next);
  const finalReport = validateRosterForGame(next);
  warnings.push(...finalReport.warnings, ...finalReport.errors);

  return {
    teamId: team.id,
    team: next,
    prospectPool: pool,
    moves,
    warnings,
    emergencyReplacementCount,
    affiliatePromotions,
    prospectSignings,
    freeAgentSignedIds
  };
}

export function ensureMinimumActiveRoster(team: Team, _rng: SeededRng, date = "", dayIndex = 0, moves: RosterMove[] = []): Team {
  let next = team;
  while (activeCount(next) < (next.activeRosterMinimum ?? ACTIVE_ROSTER_MINIMUM)) {
    const candidate = bestAffiliateForNeed(next);
    if (!candidate) break;
    next = moveStatus(next, candidate.id, "active", "AI top-up to active roster minimum.", false, date, dayIndex, moves);
  }
  return next;
}

export function ensurePositionMinimums(team: Team, _rng: SeededRng, date = "", dayIndex = 0, moves: RosterMove[] = []): Team {
  let next = team;
  const needs = () => validateRosterForGame(next);
  while (needs().healthyForwardCount < 12) {
    const candidate = bestAffiliateForNeed(next, ["LW", "C", "RW"]);
    if (!candidate) break;
    next = moveStatus(next, candidate.id, "active", "AI promoted forward depth.", false, date, dayIndex, moves);
  }
  while (needs().healthyDefenseCount < 6) {
    const candidate = bestAffiliateForNeed(next, ["LD", "RD"]);
    if (!candidate) break;
    next = moveStatus(next, candidate.id, "active", "AI promoted defense depth.", false, date, dayIndex, moves);
  }
  return next;
}

export function ensureGoalieDepth(team: Team, _rng: SeededRng, date = "", dayIndex = 0, moves: RosterMove[] = []): Team {
  let next = team;
  while (validateRosterForGame(next).healthyGoalieCount < 2) {
    const candidate = bestAffiliateForNeed(next, ["G"]);
    if (!candidate) break;
    next = moveStatus(next, candidate.id, "active", "AI promoted goalie depth.", false, date, dayIndex, moves);
  }
  return next;
}

export function autoPromoteProspects(
  team: Team,
  prospectPool: ProspectRights[],
  rng: SeededRng
): { team: Team; prospectPool: ProspectRights[]; moves: RosterMove[] } {
  let next = team;
  let pool = [...prospectPool];
  const moves: RosterMove[] = [];
  const needs = () => validateRosterForGame(next);
  const unsigned = () => pool.filter((rights) => !rights.signed).sort((a, b) => a.acquiredRound - b.acquiredRound || a.acquiredPickNumber - b.acquiredPickNumber);
  const signFor = (positions: Position[]) => {
    const rights = unsigned().find((candidate) => positions.includes(candidate.position));
    if (!rights) return false;
    const generated = createPlayerFromProspectRights(rights, rng);
    const player = {
      ...generated,
      rosterStatus: defaultRosterStatusForIncomingPlayer(next, generated),
      acquiredVia: "prospectSigning" as const
    };
    const toStatus = player.rosterStatus ?? "affiliate";
    next = {
      ...next,
      roster: [...next.roster, player]
    };
    pool = pool.map((candidate) => (candidate.prospectId === rights.prospectId ? { ...candidate, signed: true } : candidate));
    moves.push(createMove(next, player, "prospectRights", toStatus, "AI signed a prospect to stabilize roster depth.", false, "", 0));
    return true;
  };
  while (needs().healthyGoalieCount < 2 && signFor(["G"])) {}
  while (needs().healthyDefenseCount < 6 && signFor(["LD", "RD"])) {}
  while (needs().healthyForwardCount < 12 && signFor(["LW", "C", "RW"])) {}
  return { team: autoFixLineupAfterRosterRepair(next), prospectPool: pool, moves };
}

export function autoSignReplacementPlayers(team: Team, rng: SeededRng, date = "", dayIndex = 0, moves: RosterMove[] = []): { team: Team; count: number } {
  let next = team;
  let count = 0;
  const needs = () => validateRosterForGame(next);
  while (needs().healthyGoalieCount < 2) {
    const player = createReplacementPlayer(next, "G", rng);
    next = addReplacement(next, player, date, dayIndex, moves);
    count += 1;
  }
  while (needs().healthyDefenseCount < 6) {
    const player = createReplacementPlayer(next, rng.chance(0.5) ? "LD" : "RD", rng);
    next = addReplacement(next, player, date, dayIndex, moves);
    count += 1;
  }
  while (needs().healthyForwardCount < 12) {
    const player = createReplacementPlayer(next, rng.pick(["LW", "C", "RW"] as const), rng);
    next = addReplacement(next, player, date, dayIndex, moves);
    count += 1;
  }
  while (activeCount(next) < (next.activeRosterMinimum ?? ACTIVE_ROSTER_MINIMUM)) {
    const player = createReplacementPlayer(next, rng.pick(["LW", "C", "RW", "LD", "RD"] as const), rng);
    next = addReplacement(next, player, date, dayIndex, moves);
    count += 1;
  }
  return { team: autoFixLineupAfterRosterRepair(next), count };
}

export function autoUseFreeAgentsForDepth(franchise: FranchiseState, teamId: string, rng: SeededRng): FranchiseState {
  const team = franchise.league.teams.find((candidate) => candidate.id === teamId);
  if (!team || !franchise.freeAgencyState) return franchise;
  const moves: RosterMove[] = [];
  const used = useFreeAgentsForTeamDepth(team, franchise.freeAgencyState, rng, franchise.league.currentDate, franchise.league.currentDayIndex, moves);
  if (used.team === team) return franchise;
  return {
    ...franchise,
    league: {
      ...franchise.league,
      teams: franchise.league.teams.map((candidate) => (candidate.id === teamId ? used.team : candidate))
    },
    freeAgencyState: {
      ...franchise.freeAgencyState,
      market: franchise.freeAgencyState.market.filter((entry) => !used.signedIds.includes(entry.player.id))
    },
    rosterMoveHistory: [...moves, ...(franchise.rosterMoveHistory ?? [])].slice(0, 140)
  };
}

export function autoClassifyRosterStatuses(team: Team): Team {
  const missing = team.roster.some((player) => !player.rosterStatus);
  const invalid = team.roster.some((player) => {
    const status = getPlayerRosterStatus(player);
    return status === "prospectRights";
  });
  if (missing || invalid || !team.activeRosterLimit || !team.activeRosterMinimum) return autoSetInitialRosterStatuses(team);
  return {
    ...team,
    activeRosterLimit: team.activeRosterLimit ?? ACTIVE_ROSTER_LIMIT,
    activeRosterMinimum: team.activeRosterMinimum ?? ACTIVE_ROSTER_MINIMUM,
    rosterMoveLog: team.rosterMoveLog ?? []
  };
}

export function autoSendSurplusPlayersToAffiliate(team: Team, date = "", dayIndex = 0, moves: RosterMove[] = []): Team {
  let next = team;
  while (activeCount(next) > (next.activeRosterLimit ?? ACTIVE_ROSTER_LIMIT)) {
    const candidate = surplusCandidate(next);
    if (!candidate) break;
    next = moveStatus(next, candidate.id, "affiliate", "AI sent surplus depth to affiliate.", false, date, dayIndex, moves);
  }
  return next;
}

export function autoFixLineupAfterRosterRepair(team: Team): Team {
  return {
    ...team,
    lines: autoFillBestLineup(team).lineup
  };
}

export function createRosterRepairNews(result: TeamRosterRepairResult, date = new Date().toISOString().slice(0, 10)): NewsItem[] {
  if (!result.moves.length && !result.emergencyReplacementCount) return [];
  const headline =
    result.emergencyReplacementCount > 0
      ? "Roster Office: Emergency depth signed"
      : result.moves.some((move) => move.type === "callUp")
        ? "Roster Office: Affiliate depth adjusted"
        : "Roster Office: Training camp roster repaired";
  return [
    {
      id: `roster-repair-${result.teamId}-${date}-${result.moves.length}-${result.emergencyReplacementCount}`,
      type: "roster",
      date,
      headline,
      body: `${result.team.fullName} made ${result.moves.length} roster move${result.moves.length === 1 ? "" : "s"}; emergency replacements: ${result.emergencyReplacementCount}.`,
      severity: result.emergencyReplacementCount ? "medium" : "low",
      teamId: result.teamId
    }
  ];
}

function moveLongInjuriesToIR(team: Team, date: string, dayIndex: number, moves: RosterMove[]): Team {
  let next = team;
  team.roster.forEach((player) => {
    const status = getPlayerRosterStatus(player);
    if (player.injuryStatus === "out" && player.injuryGamesRemaining > 2 && (status === "active" || status === "scratched")) {
      next = moveStatus(next, player.id, "injuredReserve", "AI placed a long injury on IR.", false, date, dayIndex, moves);
    }
    if (status === "injuredReserve" && player.injuryStatus === "healthy") {
      next = moveStatus(next, player.id, activeCount(next) < (next.activeRosterLimit ?? ACTIVE_ROSTER_LIMIT) ? "scratched" : "affiliate", "AI removed a healthy player from IR.", false, date, dayIndex, moves);
    }
  });
  return next;
}

function useFreeAgentsForTeamDepth(
  team: Team,
  state: FreeAgentState,
  _rng: SeededRng,
  date: string,
  dayIndex: number,
  moves: RosterMove[]
): { team: Team; signedIds: string[] } {
  let next = team;
  const signedIds: string[] = [];
  const signPosition = (positions: Position[]) => {
    const candidate = state.market.find((entry) => !signedIds.includes(entry.player.id) && positions.includes(entry.player.position) && entry.demandSalary <= Math.max(775_000, next.capCeiling));
    if (!candidate) return false;
    const player: Player = {
      ...candidate.player,
      teamId: next.id,
      acquiredVia: "freeAgency",
      rosterStatus: "active",
      contract: {
        ...candidate.player.contract,
        salary: candidate.demandSalary,
        capHit: candidate.demandSalary,
        yearsRemaining: Math.max(1, candidate.demandYears)
      }
    };
    player.contractSummary = contractSummary(player.contract);
    next = {
      ...next,
      roster: [...next.roster, player]
    };
    signedIds.push(candidate.player.id);
    moves.push(createMove(next, player, "prospectRights", "active", "AI used free agency for depth.", false, date, dayIndex));
    return true;
  };
  while (validateRosterForGame(next).healthyGoalieCount < 2 && signPosition(["G"])) {}
  while (validateRosterForGame(next).healthyDefenseCount < 6 && signPosition(["LD", "RD"])) {}
  while (validateRosterForGame(next).healthyForwardCount < 12 && signPosition(["LW", "C", "RW"])) {}
  return { team: next, signedIds };
}

function addReplacement(team: Team, player: Player, date: string, dayIndex: number, moves: RosterMove[]): Team {
  const next = {
    ...team,
    roster: [...team.roster, player]
  };
  moves.push(createMove(next, player, "prospectRights", "active", "Emergency fictional replacement signed as a last resort.", false, date, dayIndex));
  return next;
}

function createReplacementPlayer(team: Team, position: Position, rng: SeededRng): Player {
  const name = generateDisplayName(rng);
  const age = rng.int(24, 33);
  const overall = position === "G" ? rng.int(61, 67) : rng.int(60, 68);
  const potential = clamp(overall + rng.int(-1, 4), 50, 75);
  const roleExpectation: RoleExpectation = position === "G" ? "Backup" : position === "LD" || position === "RD" ? "Third Pair" : "Checking Line";
  const contract = {
    ...createContractForPlayer({ age, overall, potential, position, roleExpectation }, rng),
    salary: 775_000,
    capHit: 775_000,
    yearsRemaining: 1,
    expiryStatus: "UFA" as const,
    rolePromise: roleExpectation,
    signedAtAge: age
  };
  const idBase = `replacement-${team.id}-${position.toLowerCase()}-${name.firstName.toLowerCase()}-${name.lastName.toLowerCase()}-${rng.int(1000, 9999)}`;
  const existingIds = new Set(team.roster.map((player) => player.id));
  const id = existingIds.has(idBase) ? `${idBase}-${rng.int(100, 999)}` : idBase;
  return {
    id,
    teamId: team.id,
    firstName: name.firstName,
    lastName: name.lastName,
    displayName: name.displayName,
    age,
    position,
    handedness: rng.chance(0.6) ? "L" : "R",
    nationality: generateNationality(rng),
    archetype: position === "G" ? "Hybrid Goalie" : position === "LD" || position === "RD" ? "Defensive Defenseman" : "Grinder",
    personality: "Professional",
    overall,
    potential,
    roleExpectation,
    morale: rng.int(50, 64),
    form: rng.int(45, 58),
    fatigue: rng.int(10, 28),
    injuryStatus: "healthy",
    injuryGamesRemaining: 0,
    attributes: position === "G" ? goalieAttributes(overall, rng) : skaterAttributes(overall, rng),
    stats: emptyStats(),
    contract,
    contractSummary: contractSummary(contract),
    rosterStatus: "active",
    acquiredVia: "replacement",
    waiverEligible: false,
    affiliateSeasons: 0,
    developmentPath: {
      track: position === "G" ? "Goalie Project" : "Veteran Depth",
      confidence: 45,
      lastReport: "Signed as a fictional roster-safety replacement.",
      projectedRole: roleExpectation,
      eta: "Now"
    },
    careerStage: age >= 30 ? "veteran" : "prime"
  };
}

function moveStatus(
  team: Team,
  playerId: string,
  toStatus: Player["rosterStatus"],
  reason: string,
  userInitiated: boolean,
  date: string,
  dayIndex: number,
  moves: RosterMove[]
): Team {
  const player = team.roster.find((candidate) => candidate.id === playerId);
  if (!player || !toStatus) return team;
  const fromStatus = getPlayerRosterStatus(player);
  if (fromStatus === toStatus) return team;
  const move = createMove(team, player, fromStatus, toStatus, reason, userInitiated, date, dayIndex);
  moves.push(move);
  return {
    ...team,
    roster: team.roster.map((candidate) =>
      candidate.id === playerId ? { ...candidate, rosterStatus: toStatus, lastRosterMoveDayIndex: dayIndex } : candidate
    ),
    rosterMoveLog: [move, ...(team.rosterMoveLog ?? [])].slice(0, 30)
  };
}

function createMove(
  team: Team,
  player: Player,
  fromStatus: NonNullable<Player["rosterStatus"]>,
  toStatus: NonNullable<Player["rosterStatus"]>,
  reason: string,
  userInitiated: boolean,
  date: string,
  dayIndex: number
): RosterMove {
  return {
    id: `roster-ai-${team.id}-${player.id}-${dayIndex}-${fromStatus}-${toStatus}`,
    date,
    teamId: team.id,
    playerId: player.id,
    fromStatus,
    toStatus,
    type: fromStatus === "affiliate" && toStatus === "active" ? "callUp" : toStatus === "affiliate" ? "sendDown" : toStatus === "injuredReserve" ? "placeOnIR" : "aiTopUp",
    reason,
    capImpact: 0,
    userInitiated
  };
}

function bestAffiliateForNeed(team: Team, positions?: Position[]): Player | undefined {
  return team.roster
    .filter((player) => getPlayerRosterStatus(player) === "affiliate" && player.injuryStatus === "healthy" && (!positions || positions.includes(player.position)))
    .sort((a, b) => b.overall - a.overall || b.potential - a.potential)[0];
}

function surplusCandidate(team: Team): Player | undefined {
  const active = team.roster.filter((player) => {
    const status = getPlayerRosterStatus(player);
    return status === "active" || status === "scratched";
  });
  const report = validateRosterForGame(team);
  return active
    .filter((player) => {
      if (player.roleExpectation === "Franchise Driver" || player.roleExpectation === "Starter") return false;
      if (player.position === "G" && report.healthyGoalieCount <= 2) return false;
      if ((player.position === "LD" || player.position === "RD") && report.healthyDefenseCount <= 6) return false;
      if (["LW", "C", "RW"].includes(player.position) && report.healthyForwardCount <= 12) return false;
      return true;
    })
    .sort((a, b) => a.overall - b.overall || a.potential - b.potential)[0];
}

function activeCount(team: Team): number {
  return team.roster.filter((player) => {
    const status = getPlayerRosterStatus(player);
    return status === "active" || status === "scratched";
  }).length;
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
  const attr = () => clamp(overall + rng.int(-7, 8), 40, 99);
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
  const attr = () => clamp(overall + rng.int(-7, 8), 40, 99);
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
