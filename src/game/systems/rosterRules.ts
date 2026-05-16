import { ACTIVE_ROSTER_LIMIT, ACTIVE_ROSTER_MINIMUM } from "../constants";
import type { OrganizationDepth, Player, ProspectRights, RosterStatus, RosterValidationReport, Team } from "../types";

const ROSTER_STATUSES: RosterStatus[] = ["active", "scratched", "affiliate", "injuredReserve", "prospectRights", "retired"];

export function getPlayerRosterStatus(player: Pick<Player, "rosterStatus">): RosterStatus {
  return ROSTER_STATUSES.includes(player.rosterStatus as RosterStatus) ? (player.rosterStatus as RosterStatus) : "active";
}

export function setPlayerRosterStatus(player: Player, status: RosterStatus): Player {
  return {
    ...player,
    rosterStatus: status,
    injuryStatus: status === "injuredReserve" && player.injuryStatus === "healthy" ? "day-to-day" : player.injuryStatus
  };
}

export function getOrganizationDepth(team: Team, prospectPool: ProspectRights[] = []): OrganizationDepth {
  const activeRosterIds: string[] = [];
  const scratchedRosterIds: string[] = [];
  const affiliateRosterIds: string[] = [];
  const injuredReserveIds: string[] = [];
  const prospectRightsIds = prospectPool.filter((rights) => !rights.signed).map((rights) => rights.prospectId);
  const positionCounts = { LW: 0, C: 0, RW: 0, LD: 0, RD: 0, G: 0 };

  team.roster.forEach((player) => {
    const status = getPlayerRosterStatus(player);
    positionCounts[player.position] += 1;
    if (status === "active") activeRosterIds.push(player.id);
    if (status === "scratched") scratchedRosterIds.push(player.id);
    if (status === "affiliate") affiliateRosterIds.push(player.id);
    if (status === "injuredReserve") injuredReserveIds.push(player.id);
  });

  const report = validateRosterForSeason(team);
  return {
    teamId: team.id,
    activeRosterIds,
    scratchedRosterIds,
    affiliateRosterIds,
    injuredReserveIds,
    prospectRightsIds,
    positionCounts,
    warnings: [...report.errors, ...report.warnings],
    validForGame: validateRosterForGame(team).errors.length === 0,
    validForSeason: report.errors.length === 0
  };
}

export function validateRosterForGame(team: Team): RosterValidationReport {
  const report = baseRosterReport(team);
  if (report.healthyForwardCount < 12) report.errors.push(`${team.fullName} need 12 healthy active/scratched forwards for a game.`);
  if (report.healthyDefenseCount < 6) report.errors.push(`${team.fullName} need 6 healthy active/scratched defensemen for a game.`);
  if (report.healthyGoalieCount < 2) report.errors.push(`${team.fullName} need 2 healthy active/scratched goalies for a game.`);
  if (report.activeCount < activeMinimum(team)) report.errors.push(`${team.fullName} active roster is below the ${activeMinimum(team)}-player minimum.`);
  if (report.activeCount > activeLimit(team)) report.errors.push(`${team.fullName} active roster is over the ${activeLimit(team)}-player limit.`);
  if (report.capSpace < 0) report.warnings.push(`${team.fullName} are over the active cap by ${formatMoney(Math.abs(report.capSpace))}.`);
  return withRecommendations(report);
}

export function validateRosterForSeason(team: Team): RosterValidationReport {
  const report = baseRosterReport(team);
  if (report.activeCount < activeMinimum(team)) report.warnings.push(`${team.fullName} are below the ${activeMinimum(team)}-player active roster minimum.`);
  if (report.activeCount > activeLimit(team)) report.errors.push(`${team.fullName} are carrying too many active/scratched players.`);
  if (report.forwardCount < 12) report.errors.push(`${team.fullName} are short major-club-ready forwards.`);
  if (report.defenseCount < 6) report.errors.push(`${team.fullName} are short major-club-ready defensemen.`);
  if (report.goalieCount < 2) report.errors.push(`${team.fullName} are short major-club-ready goalies.`);
  if (report.healthyGoalieCount < 2) report.warnings.push(`${team.fullName} goalie health is a risk.`);
  if (report.capSpace < 0) report.warnings.push(`${team.fullName} are over the active cap by ${formatMoney(Math.abs(report.capSpace))}.`);
  return withRecommendations(report);
}

export function canAssignPlayerToLineup(player: Player): boolean {
  const status = getPlayerRosterStatus(player);
  return (status === "active" || status === "scratched") && player.injuryStatus === "healthy";
}

export function canCallUpPlayer(team: Team, player: Player): string[] {
  const issues: string[] = [];
  if (getPlayerRosterStatus(player) !== "affiliate") issues.push(`${player.displayName} is not on the affiliate roster.`);
  if (player.injuryStatus !== "healthy") issues.push(`${player.displayName} is not healthy.`);
  if (activeRosterCount(team) >= activeLimit(team)) issues.push(`${team.fullName} already have ${activeLimit(team)} active/scratched players.`);
  return issues;
}

export function canSendDownPlayer(team: Team, player: Player): string[] {
  const issues: string[] = [];
  const status = getPlayerRosterStatus(player);
  if (status !== "active" && status !== "scratched") issues.push(`${player.displayName} is not on the active roster.`);
  if (activeRosterCount(team) <= activeMinimum(team)) issues.push(`${team.fullName} would fall below the ${activeMinimum(team)}-player active roster minimum.`);
  return issues;
}

export function canScratchPlayer(team: Team, player: Player): string[] {
  const issues: string[] = [];
  if (getPlayerRosterStatus(player) !== "active") issues.push(`${player.displayName} must be active before being scratched.`);
  if (activeRosterCount(team) > activeLimit(team)) issues.push(`${team.fullName} must send down a player before moving more players to scratches.`);
  return issues;
}

export function canActivatePlayer(team: Team, player: Player): string[] {
  const issues: string[] = [];
  const status = getPlayerRosterStatus(player);
  if (status !== "scratched" && status !== "injuredReserve" && status !== "affiliate") issues.push(`${player.displayName} is already active.`);
  if (player.injuryStatus !== "healthy") issues.push(`${player.displayName} is not healthy enough to activate.`);
  if ((status === "affiliate" || status === "injuredReserve") && activeRosterCount(team) >= activeLimit(team)) {
    issues.push(`${team.fullName} must clear active roster space first.`);
  }
  return issues;
}

export function canPlaceOnIR(player: Player): boolean {
  return getPlayerRosterStatus(player) !== "retired" && (player.injuryStatus !== "healthy" || player.injuryGamesRemaining > 0);
}

export function getRosterStatusLabel(status: RosterStatus): string {
  const labels: Record<RosterStatus, string> = {
    active: "Active",
    scratched: "Scratch",
    affiliate: "Affiliate",
    injuredReserve: "Injured Reserve",
    prospectRights: "Prospect Rights",
    retired: "Retired"
  };
  return labels[status];
}

export function getRosterStatusDescription(status: RosterStatus): string {
  const descriptions: Record<RosterStatus, string> = {
    active: "Available for major-club lineup and counts against the active roster and cap.",
    scratched: "Reserve on the active roster; counts against the active roster and cap.",
    affiliate: "Developing with the simplified affiliate and exempt from active cap in Phase 5.",
    injuredReserve: "Unavailable due to injury; outside the active roster limit but still counts against cap.",
    prospectRights: "Unsigned pipeline rights with no cap hit.",
    retired: "No longer available and excluded from roster/cap calculations."
  };
  return descriptions[status];
}

export function activeRosterCount(team: Team): number {
  return team.roster.filter((player) => {
    const status = getPlayerRosterStatus(player);
    return status === "active" || status === "scratched";
  }).length;
}

function baseRosterReport(team: Team): RosterValidationReport {
  const activeOrScratched = team.roster.filter((player) => {
    const status = getPlayerRosterStatus(player);
    return status === "active" || status === "scratched";
  });
  const healthy = activeOrScratched.filter((player) => player.injuryStatus === "healthy");
  const forwardCount = activeOrScratched.filter((player) => ["LW", "C", "RW"].includes(player.position)).length;
  const defenseCount = activeOrScratched.filter((player) => player.position === "LD" || player.position === "RD").length;
  const goalieCount = activeOrScratched.filter((player) => player.position === "G").length;
  const healthyForwardCount = healthy.filter((player) => ["LW", "C", "RW"].includes(player.position)).length;
  const healthyDefenseCount = healthy.filter((player) => player.position === "LD" || player.position === "RD").length;
  const healthyGoalieCount = healthy.filter((player) => player.position === "G").length;
  const capHit = activeCapHit(team);
  return {
    teamId: team.id,
    activeCount: activeOrScratched.length,
    forwardCount,
    defenseCount,
    goalieCount,
    healthyForwardCount,
    healthyDefenseCount,
    healthyGoalieCount,
    capHit,
    capSpace: team.capCeiling - capHit,
    errors: [],
    warnings: [],
    recommendations: [],
    autoFixAvailable: false
  };
}

function withRecommendations(report: RosterValidationReport): RosterValidationReport {
  const recommendations: string[] = [];
  if (report.healthyGoalieCount < 2) recommendations.push("Call up or sign a goalie before the next game.");
  if (report.healthyForwardCount < 12) recommendations.push("Call up forwards or auto-repair the depth chart.");
  if (report.healthyDefenseCount < 6) recommendations.push("Call up defensemen or use affiliate depth.");
  if (report.activeCount > ACTIVE_ROSTER_LIMIT) recommendations.push("Send surplus depth to the affiliate.");
  if (report.capSpace < 0) recommendations.push("Use affiliate assignments for depth players to restore cap space.");
  return {
    ...report,
    recommendations,
    autoFixAvailable: report.errors.length > 0 || report.warnings.length > 0 || recommendations.length > 0
  };
}

function activeCapHit(team: Team): number {
  return team.roster.reduce((sum, player) => {
    const status = getPlayerRosterStatus(player);
    if (status === "active" || status === "scratched" || status === "injuredReserve") return sum + (player.contract?.capHit ?? 0);
    return sum;
  }, 0);
}

function activeLimit(team: Team): number {
  return team.activeRosterLimit ?? ACTIVE_ROSTER_LIMIT;
}

function activeMinimum(team: Team): number {
  return team.activeRosterMinimum ?? ACTIVE_ROSTER_MINIMUM;
}

function formatMoney(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(value / 1_000)}K`;
}
