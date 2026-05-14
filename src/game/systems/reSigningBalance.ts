import { createFranchise } from "../generators/generateLeague";
import type { ContractOffer, RoleExpectation } from "../types";
import { createContractDemand, evaluateContractOffer } from "./contractNegotiation";

export interface ReSigningBalanceSample {
  role: RoleExpectation;
  capState: "tight" | "normal" | "roomy";
  weakAcceptanceRate: number;
  fairAcceptanceRate: number;
  strongAcceptanceRate: number;
  rfaAcceptanceRate: number;
  ufaAcceptanceRate: number;
}

export function runReSigningBalanceSample(
  seeds = ["resign-a", "resign-b", "resign-c"],
  roles: RoleExpectation[] = ["Franchise Driver", "Top Six", "Middle Six", "Depth"],
  capStates: Array<"tight" | "normal" | "roomy"> = ["tight", "normal", "roomy"]
): ReSigningBalanceSample[] {
  return roles.flatMap((role) =>
    capStates.map((capState) => {
      let weak = 0;
      let fair = 0;
      let strong = 0;
      let rfa = 0;
      let ufa = 0;
      let samples = 0;
      seeds.forEach((seed) => {
        const franchise = createFranchise("harbor-city", `${seed}-${role}-${capState}`);
        const team = {
          ...franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId)!,
          capCeiling:
            capState === "tight"
              ? 88_000_000
              : capState === "roomy"
                ? 110_000_000
                : franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId)!.capCeiling
        };
        const player = team.roster.find((candidate) => candidate.roleExpectation === role) ?? team.roster[0];
        const demand = createContractDemand(player, team, franchise);
        const weakOffer = offerFor(player.id, team.id, demand.demandSalary * 0.86, Math.max(1, demand.demandYears - 1), role);
        const fairOffer = offerFor(player.id, team.id, demand.demandSalary * 1.0, demand.demandYears, role);
        const strongOffer = offerFor(player.id, team.id, demand.demandSalary * 1.14, demand.demandYears + 1, role);
        weak += Number(evaluateContractOffer(player, weakOffer, team, franchise).accepted);
        fair += Number(evaluateContractOffer(player, fairOffer, team, franchise).accepted);
        strong += Number(evaluateContractOffer(player, strongOffer, team, franchise).accepted);
        rfa += Number(evaluateContractOffer({ ...player, contract: { ...player.contract, expiryStatus: "RFA" } }, fairOffer, team, franchise).accepted);
        ufa += Number(evaluateContractOffer({ ...player, contract: { ...player.contract, expiryStatus: "UFA" } }, fairOffer, team, franchise).accepted);
        samples += 1;
      });
      return {
        role,
        capState,
        weakAcceptanceRate: rate(weak, samples),
        fairAcceptanceRate: rate(fair, samples),
        strongAcceptanceRate: rate(strong, samples),
        rfaAcceptanceRate: rate(rfa, samples),
        ufaAcceptanceRate: rate(ufa, samples)
      };
    })
  );
}

function offerFor(playerId: string, teamId: string, salary: number, years: number, role: RoleExpectation): ContractOffer {
  const rounded = Math.round(salary / 25_000) * 25_000;
  return {
    id: `balance-resign-${playerId}-${rounded}-${years}`,
    playerId,
    teamId,
    salary: rounded,
    capHit: rounded,
    years,
    rolePromise: role,
    offerType: "extension",
    status: "draft"
  };
}

function rate(count: number, samples: number): number {
  return samples ? Number((count / samples).toFixed(3)) : 0;
}
