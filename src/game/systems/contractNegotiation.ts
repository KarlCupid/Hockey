import { calculateCapSpace, contractSummary, estimateMarketSalary, formatMoney } from "./contracts";
import { autoFillBestLineup } from "./lineupValidation";
import { calculateTeamStaffModifiers } from "./staff";
import type { ContractDemand, ContractOffer, ContractOfferEvaluation, FranchiseState, NewsItem, Player, Team } from "../types";

export function getPendingExpiringPlayers(franchise: FranchiseState, teamId: string): Player[] {
  const team = franchise.league.teams.find((candidate) => candidate.id === teamId);
  return team ? team.roster.filter((player) => player.contract.yearsRemaining <= 0).sort((a, b) => b.overall - a.overall) : [];
}

export function createContractDemand(player: Player, team: Team, franchise: FranchiseState): ContractDemand {
  const market = estimateMarketSalary(player);
  const production = player.position === "G" ? player.stats.goalieWins * 35_000 : player.stats.points * 42_000 + player.stats.goals * 22_000;
  const moraleFactor = player.morale >= 70 ? 0.96 : player.morale < 42 ? 1.08 : 1;
  const successFactor = team.record.points >= franchise.league.currentDayIndex ? 0.97 : 1.04;
  const expiryFactor = player.contract.expiryStatus === "UFA" ? 1.06 : player.contract.expiryStatus === "RFA" ? 0.94 : 0.78;
  const assistantGm = calculateTeamStaffModifiers(franchise.staffState, team.id).negotiation;
  const demandSalary = roundMoney(Math.max(775_000, (market + production) * moraleFactor * successFactor * expiryFactor * (1 - assistantGm * 0.012)));
  const demandYears = player.age >= 34 ? 1 : player.overall >= 84 && player.age <= 29 ? 5 : player.age <= 24 ? 3 : player.overall >= 76 ? 3 : 2;
  return {
    playerId: player.id,
    demandSalary,
    demandYears,
    minimumRole: player.roleExpectation,
    patience: player.personality === "High-Maintenance Star" ? 1 : player.personality === "Professional" ? 3 : 2,
    headline: `${player.displayName} asks for ${formatMoney(demandSalary)} over ${demandYears} year${demandYears === 1 ? "" : "s"}.`,
    reasons: [
      `${player.overall} overall and ${player.potential} potential set the baseline.`,
      player.contract.expiryStatus === "UFA" ? "Open-market leverage pushes the ask upward." : "Team control keeps the ask more manageable.",
      assistantGm > 0 ? "Assistant GM staff gives a small negotiation edge." : "No major negotiation staff edge is in play."
    ]
  };
}

export function evaluateContractOffer(player: Player, offer: ContractOffer, team: Team, franchise: FranchiseState): ContractOfferEvaluation {
  const demand = createContractDemand(player, team, franchise);
  const warnings: string[] = [];
  const reasons: string[] = [];
  const capSpace = calculateCapSpace(team) + (player.teamId === team.id ? player.contract.capHit : 0);
  if (offer.capHit > capSpace) warnings.push(`Offer would exceed cap space by ${formatMoney(offer.capHit - capSpace)}.`);
  const salaryScore = offer.capHit / Math.max(1, demand.demandSalary);
  const termScore = offer.years / Math.max(1, demand.demandYears);
  const roleScore = offer.rolePromise === player.roleExpectation || !offer.rolePromise ? 1 : 0.94;
  const moraleScore = player.morale >= 65 ? 1.04 : player.morale <= 40 ? 0.94 : 1;
  const interest = Math.round(Math.min(100, 45 + salaryScore * 38 + Math.min(termScore, 1.25) * 10 + (moraleScore - 1) * 100 + (roleScore - 1) * 100));
  if (salaryScore < 0.92) reasons.push("Salary is below the player's camp number.");
  if (offer.years < demand.demandYears - 1 && player.age < 32) reasons.push("Term is lighter than expected.");
  if (warnings.length) reasons.push("The cap preview is not workable.");
  const accepted = warnings.length === 0 && interest >= 82 && offer.capHit >= demand.demandSalary * 0.94;
  if (accepted) reasons.push("The offer meets the money, term, and role shape the player wanted.");
  if (!accepted && !reasons.length) reasons.push("The offer is close, but the player's camp wants one more sweetener.");
  return {
    accepted,
    playerInterest: interest,
    demandSalary: demand.demandSalary,
    demandYears: demand.demandYears,
    reasons,
    warnings
  };
}

export function applyAcceptedContractOffer(franchise: FranchiseState, offer: ContractOffer): FranchiseState {
  const team = franchise.league.teams.find((candidate) => candidate.id === offer.teamId);
  const player = team?.roster.find((candidate) => candidate.id === offer.playerId);
  if (!team || !player) return franchise;
  const evaluation = offer.evaluation ?? evaluateContractOffer(player, offer, team, franchise);
  if (!evaluation.accepted) return franchise;
  const nextPlayer: Player = {
    ...player,
    contract: {
      ...player.contract,
      salary: offer.salary,
      capHit: offer.capHit,
      yearsRemaining: offer.years,
      rolePromise: offer.rolePromise ?? player.roleExpectation,
      signedAtAge: player.age
    },
    contractSummary: contractSummary({
      ...player.contract,
      salary: offer.salary,
      capHit: offer.capHit,
      yearsRemaining: offer.years,
      rolePromise: offer.rolePromise ?? player.roleExpectation,
      signedAtAge: player.age
    })
  };
  const news = createContractNegotiationNews(nextPlayer, offer, evaluation, franchise.league.currentDate, team.id);
  return {
    ...franchise,
    league: {
      ...franchise.league,
      teams: franchise.league.teams.map((candidate) =>
        candidate.id === team.id
          ? {
              ...candidate,
              roster: candidate.roster.map((candidatePlayer) => (candidatePlayer.id === player.id ? nextPlayer : candidatePlayer))
            }
          : candidate
      )
    },
    inbox: [...news, ...franchise.inbox].slice(0, 60),
    transactionLog: [
      {
        id: `contract-${offer.id}`,
        date: franchise.league.currentDate,
        type: "contract" as const,
        headline: "Contract signed",
        details: `${nextPlayer.displayName} signs for ${offer.years} years at ${formatMoney(offer.capHit)} cap hit.`,
        teamIds: [team.id],
        playerIds: [player.id]
      },
      ...franchise.transactionLog
    ].slice(0, 50),
    updatedAt: new Date().toISOString()
  };
}

export function releaseUnsignedUFAsToMarket(franchise: FranchiseState): FranchiseState {
  const released: Player[] = [];
  const teams = franchise.league.teams.map((team) => {
    const keep: Player[] = [];
    team.roster.forEach((player) => {
      if (player.contract.yearsRemaining <= 0 && player.contract.expiryStatus === "UFA") released.push({ ...player, teamId: "free-agent" });
      else keep.push(player);
    });
    const nextTeam = { ...team, roster: keep };
    return { ...nextTeam, lines: autoFillBestLineup(nextTeam).lineup };
  });
  if (!released.length) return franchise;
  const market = released.map((player) => ({
    player,
    demandSalary: estimateMarketSalary(player),
    demandYears: player.age >= 34 ? 1 : player.overall >= 80 ? 3 : 2,
    interestByTeam: Object.fromEntries(franchise.league.teams.map((team) => [team.id, team.id === franchise.selectedTeamId ? 58 : 50])),
    marketBuzz: `${player.displayName} is testing the open market after talks stalled.`
  }));
  return {
    ...franchise,
    league: { ...franchise.league, teams },
    freeAgencyState: {
      market: [...market, ...(franchise.freeAgencyState?.market ?? [])],
      currentDay: franchise.freeAgencyState?.currentDay ?? 1,
      maxDays: franchise.freeAgencyState?.maxDays ?? 7,
      userSignings: franchise.freeAgencyState?.userSignings ?? [],
      aiSignings: franchise.freeAgencyState?.aiSignings ?? [],
      completed: false
    },
    inbox: [
      {
        id: `ufa-release-${franchise.league.seasonYear}-${released.length}`,
        type: "contract" as const,
        date: franchise.league.currentDate,
        headline: "Contract Desk: Unsigned UFAs hit the market",
        body: `${released.length} unrestricted free agent${released.length === 1 ? "" : "s"} left the roster file and entered free agency.`,
        severity: "medium" as const,
        teamId: franchise.selectedTeamId
      },
      ...franchise.inbox
    ].slice(0, 60)
  };
}

export function keepUnsignedRFAsAsRights(franchise: FranchiseState): FranchiseState {
  const teamId = franchise.selectedTeamId;
  const team = franchise.league.teams.find((candidate) => candidate.id === teamId);
  if (!team) return franchise;
  const unsigned = team.roster.filter((player) => player.contract.yearsRemaining <= 0 && player.contract.expiryStatus === "RFA");
  if (!unsigned.length) return franchise;
  return {
    ...franchise,
    inbox: [
      {
        id: `rfa-rights-${franchise.league.seasonYear}-${teamId}`,
        type: "contract" as const,
        date: franchise.league.currentDate,
        headline: "Contract Desk: RFA rights retained",
        body: `${unsigned.length} restricted free agent${unsigned.length === 1 ? "" : "s"} remain controlled but need a contract to play.`,
        severity: "low" as const,
        teamId
      },
      ...franchise.inbox
    ].slice(0, 60)
  };
}

export function createContractNegotiationNews(player: Player, offer: ContractOffer, evaluation: ContractOfferEvaluation, date: string, teamId: string): NewsItem[] {
  return [
    {
      id: `contract-news-${offer.id}-${evaluation.accepted ? "yes" : "no"}`,
      type: "contract",
      date,
      headline: evaluation.accepted ? `Contract Desk: ${player.displayName} re-signs` : `Contract Desk: ${player.displayName} rejects offer`,
      body: evaluation.accepted
        ? `${offer.years} year${offer.years === 1 ? "" : "s"} at ${formatMoney(offer.capHit)} cap hit keeps the plan intact.`
        : evaluation.reasons[0] ?? "The player's camp wants a stronger offer.",
      severity: evaluation.accepted ? "medium" : "low",
      teamId,
      playerId: player.id
    }
  ];
}

function roundMoney(value: number): number {
  return Math.round(value / 25_000) * 25_000;
}
