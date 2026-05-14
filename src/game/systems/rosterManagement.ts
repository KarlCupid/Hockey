import { ACTIVE_ROSTER_LIMIT, ACTIVE_ROSTER_MINIMUM } from "../constants";
import type { DepthChart, FranchiseState, NewsItem, Player, PlayerDevelopmentPath, Position, RosterMove, RosterMoveType, RosterStatus, Team, TransactionLogItem } from "../types";
import { calculateCapSpaceForRosterStatusMove, formatMoney, getCapImpactOfRosterMove } from "./contracts";
import { autoFillBestLineup } from "./lineupValidation";
import {
  activeRosterCount,
  canActivatePlayer,
  canCallUpPlayer,
  canPlaceOnIR,
  canScratchPlayer,
  canSendDownPlayer,
  getPlayerRosterStatus,
  getRosterStatusLabel,
  validateRosterForGame
} from "./rosterRules";

export function movePlayerRosterStatus(
  franchise: FranchiseState,
  teamId: string,
  playerId: string,
  toStatus: RosterStatus,
  reason = "Roster office move.",
  userInitiated = true
): FranchiseState {
  const team = franchise.league.teams.find((candidate) => candidate.id === teamId);
  const player = team?.roster.find((candidate) => candidate.id === playerId);
  if (!team || !player) return franchise;
  const fromStatus = getPlayerRosterStatus(player);
  if (fromStatus === toStatus || fromStatus === "retired" || toStatus === "prospectRights") return franchise;
  const type = rosterMoveType(fromStatus, toStatus);
  const capImpact = getCapImpactOfRosterMove(team, player, fromStatus, toStatus);
  const move: RosterMove = {
    id: `roster-${teamId}-${playerId}-${franchise.league.currentDayIndex}-${franchise.rosterMoveHistory?.length ?? 0}`,
    date: franchise.league.currentDate,
    teamId,
    playerId,
    fromStatus,
    toStatus,
    type,
    reason,
    capImpact,
    userInitiated
  };
  const nextTeam = autoRepairLineupAfterRosterMove({
    ...team,
    roster: team.roster.map((candidate) =>
      candidate.id === playerId
        ? {
            ...candidate,
            rosterStatus: toStatus,
            lastRosterMoveDayIndex: franchise.league.currentDayIndex,
            affiliateSeasons: toStatus === "affiliate" ? candidate.affiliateSeasons ?? 0 : candidate.affiliateSeasons,
            developmentPath: {
              ...(candidate.developmentPath ?? {
                track: "NHL Regular",
                confidence: 50,
                lastReport: "",
                projectedRole: candidate.roleExpectation,
                eta: "Now"
              }),
              track: pathwayTrackForStatus(candidate, toStatus),
              lastReport: rosterMovePathReport(candidate, toStatus)
            }
          }
        : candidate
    ),
    rosterMoveLog: [move, ...(team.rosterMoveLog ?? [])].slice(0, 30)
  });
  const news = createRosterMoveNews(move, team, player);
  return {
    ...franchise,
    league: {
      ...franchise.league,
      teams: franchise.league.teams.map((candidate) => (candidate.id === teamId ? nextTeam : candidate))
    },
    rosterMoveHistory: [move, ...(franchise.rosterMoveHistory ?? [])].slice(0, 120),
    transactionLog: [createRosterMoveTransaction(move, team, player), ...franchise.transactionLog].slice(0, 60),
    inbox: [...news, ...franchise.inbox].slice(0, 60),
    updatedAt: new Date().toISOString()
  };
}

export function callUpPlayer(franchise: FranchiseState, teamId: string, playerId: string): FranchiseState {
  const team = franchise.league.teams.find((candidate) => candidate.id === teamId);
  const player = team?.roster.find((candidate) => candidate.id === playerId);
  if (!team || !player || canCallUpPlayer(team, player).length) return franchise;
  return movePlayerRosterStatus(franchise, teamId, playerId, "active", "Called up from the affiliate.", true);
}

export function sendDownPlayer(franchise: FranchiseState, teamId: string, playerId: string): FranchiseState {
  const team = franchise.league.teams.find((candidate) => candidate.id === teamId);
  const player = team?.roster.find((candidate) => candidate.id === playerId);
  if (!team || !player) return franchise;
  const blockers = canSendDownPlayer(team, player).filter((issue) => !issue.includes("minimum"));
  if (blockers.length) return franchise;
  return movePlayerRosterStatus(franchise, teamId, playerId, "affiliate", "Sent to the affiliate for depth/development.", true);
}

export function scratchPlayer(franchise: FranchiseState, teamId: string, playerId: string): FranchiseState {
  const team = franchise.league.teams.find((candidate) => candidate.id === teamId);
  const player = team?.roster.find((candidate) => candidate.id === playerId);
  if (!team || !player || canScratchPlayer(team, player).length) return franchise;
  return movePlayerRosterStatus(franchise, teamId, playerId, "scratched", "Moved to scratches.", true);
}

export function activatePlayer(franchise: FranchiseState, teamId: string, playerId: string): FranchiseState {
  const team = franchise.league.teams.find((candidate) => candidate.id === teamId);
  const player = team?.roster.find((candidate) => candidate.id === playerId);
  if (!team || !player || canActivatePlayer(team, player).length) return franchise;
  return movePlayerRosterStatus(franchise, teamId, playerId, "active", "Activated for NHL roster duty.", true);
}

export function placePlayerOnIR(franchise: FranchiseState, teamId: string, playerId: string): FranchiseState {
  const team = franchise.league.teams.find((candidate) => candidate.id === teamId);
  const player = team?.roster.find((candidate) => candidate.id === playerId);
  if (!team || !player || !canPlaceOnIR(player)) return franchise;
  return movePlayerRosterStatus(franchise, teamId, playerId, "injuredReserve", "Placed on injured reserve.", true);
}

export function removePlayerFromIR(franchise: FranchiseState, teamId: string, playerId: string): FranchiseState {
  const team = franchise.league.teams.find((candidate) => candidate.id === teamId);
  const player = team?.roster.find((candidate) => candidate.id === playerId);
  if (!team || !player || getPlayerRosterStatus(player) !== "injuredReserve" || player.injuryStatus !== "healthy") return franchise;
  const toStatus: RosterStatus = activeRosterCount(team) >= (team.activeRosterLimit ?? ACTIVE_ROSTER_LIMIT) ? "scratched" : "active";
  return movePlayerRosterStatus(franchise, teamId, playerId, toStatus, "Removed from injured reserve.", true);
}

export function autoSetInitialRosterStatuses(team: Team): Team {
  const assigned = new Set([
    ...team.lines.forwardLines.flatMap((line) => [line.lw, line.c, line.rw]),
    ...team.lines.defensePairs.flatMap((pair) => [pair.ld, pair.rd]),
    team.lines.goalies.starter,
    team.lines.goalies.backup
  ]);
  const sorted = [...team.roster].sort((a, b) => lineupPriority(b, assigned) - lineupPriority(a, assigned));
  const activeIds = new Set(sorted.filter((player) => assigned.has(player.id)).map((player) => player.id));
  sorted.forEach((player) => {
    if (activeIds.size < ACTIVE_ROSTER_MINIMUM && player.injuryStatus === "healthy") activeIds.add(player.id);
  });
  const scratchedIds = new Set<string>();
  sorted.forEach((player) => {
    if (activeIds.has(player.id)) return;
    if (activeIds.size + scratchedIds.size < ACTIVE_ROSTER_LIMIT && player.injuryStatus === "healthy") scratchedIds.add(player.id);
  });
  const roster = team.roster.map((player) => {
    let rosterStatus: RosterStatus = "affiliate";
    if (player.injuryStatus === "out" && player.injuryGamesRemaining > 2) rosterStatus = "injuredReserve";
    else if (activeIds.has(player.id)) rosterStatus = "active";
    else if (scratchedIds.has(player.id)) rosterStatus = "scratched";
    const currentStatus = player.rosterStatus;
    const nextStatus: RosterStatus =
      currentStatus === "retired" || currentStatus === "affiliate" || currentStatus === "injuredReserve" ? currentStatus : rosterStatus;
    return {
      ...player,
      rosterStatus: nextStatus,
      acquiredVia: player.acquiredVia ?? "generated",
      waiverEligible: player.waiverEligible ?? false,
      affiliateSeasons: player.affiliateSeasons ?? 0,
      careerStage: player.careerStage ?? inferCareerStage(player),
      developmentPath: player.developmentPath ?? {
        track: pathwayTrackForStatus(player, nextStatus),
        confidence: Math.max(35, Math.min(92, 55 + player.potential - player.overall)),
        lastReport: rosterMovePathReport(player, rosterStatus),
        projectedRole: player.roleExpectation,
        eta: player.overall >= 73 ? "Now" : player.age <= 23 ? "Next Season" : "Long Term"
      }
    };
  });
  return autoRepairLineupAfterRosterMove({
    ...team,
    roster,
    activeRosterLimit: team.activeRosterLimit ?? ACTIVE_ROSTER_LIMIT,
    activeRosterMinimum: team.activeRosterMinimum ?? ACTIVE_ROSTER_MINIMUM,
    rosterMoveLog: team.rosterMoveLog ?? []
  });
}

export function autoRepairLineupAfterRosterMove(team: Team): Team {
  return {
    ...team,
    lines: autoFillBestLineup(team).lineup
  };
}

export function getDepthChart(team: Team): DepthChart {
  const active = team.roster.filter((player) => getPlayerRosterStatus(player) === "active");
  const scratched = team.roster.filter((player) => getPlayerRosterStatus(player) === "scratched");
  const affiliate = team.roster.filter((player) => getPlayerRosterStatus(player) === "affiliate");
  const injuredReserve = team.roster.filter((player) => getPlayerRosterStatus(player) === "injuredReserve");
  return {
    forwards: {
      LW: getPositionDepth(team, "LW"),
      C: getPositionDepth(team, "C"),
      RW: getPositionDepth(team, "RW")
    },
    defense: {
      LD: getPositionDepth(team, "LD"),
      RD: getPositionDepth(team, "RD")
    },
    goalies: getPositionDepth(team, "G"),
    active,
    scratched,
    affiliate,
    injuredReserve,
    recommendations: validateRosterForGame(team).recommendations
  };
}

export function getPositionDepth(team: Team, position: Position): Player[] {
  return team.roster
    .filter((player) => player.position === position || (["LW", "RW"].includes(position) && ["LW", "RW"].includes(player.position)))
    .sort((a, b) => {
      const statusWeight = statusSortWeight(getPlayerRosterStatus(b)) - statusSortWeight(getPlayerRosterStatus(a));
      return statusWeight || b.overall - a.overall || b.potential - a.potential;
    });
}

export function createRosterMoveNews(move: RosterMove, team: Team, player: Player): NewsItem[] {
  if (!move.userInitiated && move.type !== "aiTopUp") return [];
  const statusLabel = getRosterStatusLabel(move.toStatus);
  return [
    {
      id: `roster-news-${move.id}`,
      type: "roster",
      date: move.date,
      headline: `Roster Office: ${player.displayName} to ${statusLabel}`,
      body: `${team.fullName} moved ${player.displayName} from ${getRosterStatusLabel(move.fromStatus)} to ${statusLabel}. ${move.reason}`,
      severity: move.type === "aiTopUp" || move.toStatus === "injuredReserve" ? "medium" : "low",
      teamId: team.id,
      playerId: player.id
    }
  ];
}

export function createRosterMoveTransaction(move: RosterMove, team: Team, player: Player): TransactionLogItem {
  const capText = move.capImpact === 0 ? "no active cap change" : `${move.capImpact > 0 ? "adds" : "clears"} ${formatMoney(Math.abs(move.capImpact))}`;
  return {
    id: `transaction-${move.id}`,
    date: move.date,
    type: "roster",
    headline: `${player.displayName} roster move`,
    details: `${team.fullName}: ${getRosterStatusLabel(move.fromStatus)} to ${getRosterStatusLabel(move.toStatus)}; ${capText}.`,
    teamIds: [team.id],
    playerIds: [player.id]
  };
}

export function defaultRosterStatusForIncomingPlayer(team: Team, player: Player): RosterStatus {
  const activeCount = activeRosterCount(team);
  const report = validateRosterForGame(team);
  if (player.injuryStatus !== "healthy") return "injuredReserve";
  if (player.position === "G" && report.healthyGoalieCount < 2 && activeCount < (team.activeRosterLimit ?? ACTIVE_ROSTER_LIMIT)) return "active";
  if (["LD", "RD"].includes(player.position) && report.healthyDefenseCount < 6 && activeCount < (team.activeRosterLimit ?? ACTIVE_ROSTER_LIMIT)) return "active";
  if (["LW", "C", "RW"].includes(player.position) && report.healthyForwardCount < 12 && activeCount < (team.activeRosterLimit ?? ACTIVE_ROSTER_LIMIT)) return "active";
  if (activeCount < Math.min(team.activeRosterLimit ?? ACTIVE_ROSTER_LIMIT, team.activeRosterMinimum ?? ACTIVE_ROSTER_MINIMUM)) return "active";
  if (activeCount < (team.activeRosterLimit ?? ACTIVE_ROSTER_LIMIT) && player.overall >= 72) return "scratched";
  return "affiliate";
}

export function projectedCapSpaceAfterMove(team: Team, playerId: string, toStatus: RosterStatus): number {
  return calculateCapSpaceForRosterStatusMove(team, playerId, toStatus);
}

function rosterMoveType(fromStatus: RosterStatus, toStatus: RosterStatus): RosterMoveType {
  if (fromStatus === "affiliate" && (toStatus === "active" || toStatus === "scratched")) return "callUp";
  if ((fromStatus === "active" || fromStatus === "scratched") && toStatus === "affiliate") return "sendDown";
  if (toStatus === "scratched") return "scratch";
  if (toStatus === "active") return "activate";
  if (toStatus === "injuredReserve") return "placeOnIR";
  if (fromStatus === "injuredReserve") return "removeFromIR";
  return "aiTopUp";
}

function pathwayTrackForStatus(player: Player, status: RosterStatus): PlayerDevelopmentPath["track"] {
  if (status === "affiliate") return player.position === "G" ? "Goalie Project" : player.age <= 24 ? "Affiliate Development" : "Veteran Depth";
  if (status === "prospectRights") return "Prospect Pipeline";
  if (player.age >= 31 && player.overall < 75) return "Veteran Depth";
  return "NHL Regular";
}

function rosterMovePathReport(player: Player, status: RosterStatus): string {
  if (status === "affiliate") return `${player.displayName} will get simplified affiliate reps without NHL stat accumulation.`;
  if (status === "injuredReserve") return `${player.displayName} is unavailable until the medical room clears him.`;
  if (status === "scratched") return `${player.displayName} remains with the NHL group as reserve depth.`;
  return `${player.displayName} is available for the NHL lineup.`;
}

function lineupPriority(player: Player, assigned: Set<string | undefined>): number {
  return (assigned.has(player.id) ? 1000 : 0) + player.overall * 10 + player.potential + (player.position === "G" ? 15 : 0) - player.fatigue * 0.05;
}

function statusSortWeight(status: RosterStatus): number {
  if (status === "active") return 5;
  if (status === "scratched") return 4;
  if (status === "affiliate") return 3;
  if (status === "injuredReserve") return 2;
  return 0;
}

function inferCareerStage(player: Player): Player["careerStage"] {
  if (player.age <= 21 || player.potential - player.overall >= 9) return "prospect";
  if (player.age <= 24) return "rookie";
  if (player.age <= 30) return "prime";
  if (player.age <= 34) return "veteran";
  return "decline";
}
