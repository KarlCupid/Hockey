import type { Contract, Player, RosterStatus, Team } from "../types";
import { clamp, type SeededRng } from "../rng";
import { TUNING } from "./tuning";
import { getPlayerRosterStatus } from "./rosterRules";

type ContractPlayerInput = Pick<Player, "age" | "overall" | "potential" | "position" | "roleExpectation">;

export function createContractForPlayer(player: ContractPlayerInput, rng: SeededRng): Contract {
  const market = estimateMarketSalary(player);
  const prospectDiscount = player.age <= 22 ? 0.64 : player.age <= 24 ? 0.78 : 1;
  const veteranDiscount = player.age >= 34 ? 0.82 : player.age >= 31 ? 0.92 : 1;
  const roleBoost = player.roleExpectation === "Franchise Driver" || player.roleExpectation === "Starter" ? 1.1 : 1;
  const salary = roundMoney(Math.max(TUNING.economy.minSalary, market * prospectDiscount * veteranDiscount * roleBoost + rng.float(-300_000, 350_000)));
  const capHit = roundMoney(Math.max(TUNING.economy.minSalary, salary * rng.float(0.96, 1.04)));
  const yearsRemaining = inferTerm(player, rng);
  const expiryStatus = player.age <= 21 && player.overall < 74 ? "Prospect" : player.age <= 25 ? "RFA" : "UFA";

  return {
    salary,
    capHit,
    yearsRemaining,
    expiryStatus,
    rolePromise: player.roleExpectation,
    signedAtAge: Math.max(18, player.age - rng.int(0, Math.max(0, Math.min(4, yearsRemaining - 1))))
  };
}

export function contractSummary(contract: Contract): string {
  return `${contract.yearsRemaining} yr / ${formatMoney(contract.capHit)} cap | ${contract.expiryStatus}`;
}

export function formatMoney(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(value / 1_000)}K`;
}

export function calculateTeamCapHit(team: Team): number {
  return calculateOrganizationCapCommitments(team);
}

export function calculateActiveRosterCapHit(team: Team): number {
  return team.roster.reduce((sum, player) => {
    const status = getPlayerRosterStatus(player);
    if (status === "active" || status === "scratched" || status === "injuredReserve") return sum + safeCapHit(player);
    return sum;
  }, 0);
}

export function calculateOrganizationCapCommitments(team: Team): number {
  return team.roster.reduce((sum, player) => {
    const status = getPlayerRosterStatus(player);
    return status === "retired" || status === "prospectRights" ? sum : sum + safeCapHit(player);
  }, 0);
}

export function calculateAffiliateCommitments(team: Team): number {
  return team.roster.reduce((sum, player) => (getPlayerRosterStatus(player) === "affiliate" ? sum + safeCapHit(player) : sum), 0);
}

export function calculateCapSpace(team: Team): number {
  return team.capCeiling - calculateActiveRosterCapHit(team);
}

export function calculateCapSpaceForRosterStatusMove(team: Team, playerId: string, toStatus: RosterStatus): number {
  const player = team.roster.find((candidate) => candidate.id === playerId);
  if (!player) return calculateCapSpace(team);
  const fromStatus = getPlayerRosterStatus(player);
  const capImpact = getCapImpactOfRosterMove(team, player, fromStatus, toStatus);
  return calculateCapSpace(team) - capImpact;
}

export function getCapImpactOfRosterMove(_team: Team, player: Player, fromStatus: RosterStatus, toStatus: RosterStatus): number {
  const before = countsAgainstActiveCap(fromStatus) ? safeCapHit(player) : 0;
  const after = countsAgainstActiveCap(toStatus) ? safeCapHit(player) : 0;
  return after - before;
}

export function getExpiringContracts(team: Team): Player[] {
  return team.roster.filter((player) => player.contract.yearsRemaining <= 1).sort((a, b) => b.overall - a.overall);
}

export function getCapWarnings(team: Team): string[] {
  const hit = calculateActiveRosterCapHit(team);
  const orgHit = calculateOrganizationCapCommitments(team);
  const warnings: string[] = [];
  if (hit > team.capCeiling) {
    warnings.push(`${team.fullName} are over the cap by ${formatMoney(hit - team.capCeiling)}.`);
  } else if (orgHit > team.capCeiling) {
    warnings.push(`${team.fullName} organization commitments are over the cap by ${formatMoney(orgHit - team.capCeiling)} before affiliate exemptions.`);
  } else if (team.capCeiling - hit <= 3_000_000) {
    warnings.push(`${team.fullName} have less than ${formatMoney(3_000_000)} in cap room.`);
  }
  if (hit < team.capFloor) {
    warnings.push(`${team.fullName} are below the cap floor by ${formatMoney(team.capFloor - hit)}.`);
  }
  const pressure = getExpiringContracts(team).filter((player) => player.overall >= 76);
  if (pressure.length) {
    warnings.push(`${pressure.length} key contract${pressure.length === 1 ? "" : "s"} expire within one year.`);
  }
  return warnings;
}

function countsAgainstActiveCap(status: RosterStatus): boolean {
  return status === "active" || status === "scratched" || status === "injuredReserve";
}

function safeCapHit(player: Player): number {
  return Number.isFinite(player.contract?.capHit) ? player.contract.capHit : 0;
}

export function estimateMarketSalary(player: ContractPlayerInput): number {
  const ovr = player.overall;
  const upside = Math.max(0, player.potential - player.overall);
  let value = TUNING.economy.minSalary + Math.max(0, ovr - 58) ** 2 * 14_500 + upside * 72_000;
  if (ovr >= 88) value += 2_850_000;
  else if (ovr >= 84) value += 1_450_000;
  else if (ovr >= 78) value += 525_000;
  if (player.position === "G" && ovr >= 80) value += 675_000;
  if (player.roleExpectation === "Franchise Driver") value += 1_150_000;
  if (player.roleExpectation === "Depth" || player.roleExpectation === "Backup") value *= 0.8;
  return Math.round(clamp(value, TUNING.economy.minSalary, TUNING.economy.plausibleStarSalary.max));
}

export function contractValueRisk(player: Player): "Low" | "Medium" | "High" {
  const market = estimateMarketSalary(player);
  const surplus = player.contract.capHit - market;
  if (player.age >= 33 && player.contract.yearsRemaining >= 3 && player.contract.capHit >= 4_000_000) return "High";
  if (surplus > 1_750_000) return "High";
  if (surplus > 700_000 || (player.age >= 31 && player.contract.yearsRemaining >= 3)) return "Medium";
  return "Low";
}

export function contractRiskNote(player: Player): string {
  const market = estimateMarketSalary(player);
  if (player.contract.capHit > market + 1_250_000) return `${player.displayName} looks expensive relative to market value.`;
  if (player.contract.capHit < market - 1_000_000 && player.contract.yearsRemaining >= 2) return `${player.displayName} is giving the club surplus value.`;
  if (player.age <= 24 && player.contract.yearsRemaining <= 1 && player.potential >= 82) return `${player.displayName} may be due for a raise soon.`;
  if (player.age >= 32 && player.contract.capHit >= 4_000_000) return `${player.displayName}'s age curve makes the back half of the deal worth watching.`;
  return `${player.displayName}'s deal is manageable for the current cap plan.`;
}

function inferTerm(player: ContractPlayerInput, rng: SeededRng): number {
  if (player.age <= 22) return rng.int(2, 3);
  if (player.overall >= 86 && player.age <= 29) return rng.int(4, 6);
  if (player.overall >= 78 && player.age <= 31) return rng.int(2, 5);
  if (player.age >= 34) return rng.int(1, 2);
  return rng.int(1, 4);
}

function roundMoney(value: number): number {
  return Math.round(value / 25_000) * 25_000;
}
