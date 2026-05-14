import { SeededRng, clamp } from "../rng";
import type { DraftPick, FranchiseState, LeagueState, NewsItem, Player, Team, TeamNeed, TradeAsset, TradeEvaluation, TradeProposal } from "../types";
import { autoFillBestLineup } from "./lineupValidation";
import { calculateCapSpace, calculateTeamCapHit, contractValueRisk, formatMoney } from "./contracts";
import { estimatePickValue, formatPickLabel } from "./draftPicks";
import { repairAllTeamRosters } from "./aiRosterManagement";
import { defaultRosterStatusForIncomingPlayer } from "./rosterManagement";
import { getPlayerRosterStatus } from "./rosterRules";

export function calculatePlayerTradeValue(player: Player, team: Team, league: LeagueState): number {
  const production = player.position === "G" ? player.stats.goalieWins * 2 + player.stats.saves * 0.01 : player.stats.points * 1.4 + player.stats.goals * 0.7;
  const ageCurve = player.age <= 22 ? 24 : player.age <= 25 ? 18 : player.age <= 29 ? 8 : player.age <= 32 ? 0 : -10;
  const upside = Math.max(0, player.potential - player.overall) * 5;
  const scarcity = player.position === "C" || player.position === "G" ? 12 : player.position === "LD" || player.position === "RD" ? 9 : 4;
  const health = player.injuryStatus === "healthy" ? 0 : player.injuryStatus === "day-to-day" ? -8 : -18;
  const mood = (player.morale - 50) * 0.22 + (player.form - 50) * 0.18 - player.fatigue * 0.08;
  const capRisk = contractValueRisk(player) === "High" ? -18 : contractValueRisk(player) === "Medium" ? -8 : 4;
  const role = ["Franchise Driver", "Top Line", "Top Pair", "Starter"].includes(player.roleExpectation) ? 28 : player.roleExpectation === "Depth" ? -7 : 5;
  const blockPenalty = team.tradeBlock.includes(player.id) ? -12 : 0;
  const untouchableBoost = team.untouchables.includes(player.id) ? 48 : 0;
  const standingsPressure = team.record.points < league.currentDayIndex + 4 && player.age >= 31 ? -6 : 0;
  return Math.max(5, Math.round(player.overall * 4.5 + upside + ageCurve + scarcity + production + health + mood + capRisk + role + blockPenalty + untouchableBoost + standingsPressure));
}

export function calculatePickTradeValue(pick: DraftPick, league: LeagueState): number {
  return estimatePickValue(pick, league);
}

export function calculateTradePackageValue(assets: TradeAsset[], team: Team, league: LeagueState): number {
  return assets.reduce((sum, asset) => {
    if (asset.type === "player") {
      const player = team.roster.find((candidate) => candidate.id === asset.assetId);
      return sum + (player ? calculatePlayerTradeValue(player, team, league) : 0);
    }
    const pick = team.draftPicks.find((candidate) => candidate.id === asset.assetId);
    return sum + (pick ? calculatePickTradeValue(pick, league) : 0);
  }, 0);
}

export function inferTeamNeeds(team: Team): TeamNeed[] {
  const needs: TeamNeed[] = [];
  const byPosition = (position: Player["position"]) => team.roster.filter((player) => player.position === position);
  const avg = (players: Player[]) => (players.length ? players.reduce((sum, player) => sum + player.overall, 0) / players.length : 0);
  const positions: Array<{ position: Player["position"]; ideal: number; label: string }> = [
    { position: "C", ideal: 4, label: "centers" },
    { position: "LW", ideal: 5, label: "left wings" },
    { position: "RW", ideal: 5, label: "right wings" },
    { position: "LD", ideal: 4, label: "left defense" },
    { position: "RD", ideal: 4, label: "right defense" },
    { position: "G", ideal: 2, label: "goalies" }
  ];
  positions.forEach(({ position, ideal, label }) => {
    const group = byPosition(position);
    const countGap = Math.max(0, ideal - group.filter((player) => player.injuryStatus === "healthy").length) * 18;
    const qualityGap = Math.max(0, 73 - avg(group)) * 1.8;
    const urgency = Math.round(clamp(countGap + qualityGap + (group.some((player) => player.injuryStatus === "out") ? 12 : 0), 0, 100));
    if (urgency >= 15) {
      needs.push({
        position,
        urgency,
        description: `${team.nickname} could use help at ${label}${urgency >= 55 ? " soon" : ""}.`
      });
    }
  });
  return needs.sort((a, b) => b.urgency - a.urgency).slice(0, 4);
}

export function generateTradeBlock(team: Team): string[] {
  return [...team.roster]
    .filter((player) => !team.untouchables.includes(player.id))
    .sort((a, b) => {
      const scoreA = tradeBlockScore(a);
      const scoreB = tradeBlockScore(b);
      return scoreB - scoreA || a.displayName.localeCompare(b.displayName);
    })
    .slice(0, 5)
    .map((player) => player.id);
}

export function generateUntouchables(team: Team): string[] {
  return [...team.roster]
    .sort((a, b) => b.overall + b.potential * 0.35 - (a.overall + a.potential * 0.35))
    .slice(0, 3)
    .map((player) => player.id);
}

export function evaluateTrade(proposal: TradeProposal, league: LeagueState): TradeEvaluation {
  const fromTeam = findTeam(league, proposal.fromTeamId);
  const toTeam = findTeam(league, proposal.toTeamId);
  const warnings: string[] = [];
  const reasons: string[] = [];
  const duplicateWarning = duplicateAssetWarning(proposal);
  if (duplicateWarning) warnings.push(duplicateWarning);

  const capWarnings = validateTradeCap(proposal, league);
  warnings.push(...capWarnings);
  const capValid = capWarnings.length === 0;
  const valueFromUser = calculateTradePackageValue(proposal.assetsFrom, fromTeam, league);
  const valueFromOther = calculateTradePackageValue(proposal.assetsTo, toTeam, league);
  const needFit = calculateNeedFit(proposal.assetsFrom, toTeam, league);
  const otherUntouchablePenalty = proposal.assetsTo.some((asset) => asset.type === "player" && toTeam.untouchables.includes(asset.assetId)) ? 80 : 0;
  const rng = new SeededRng(`${proposal.id}-${proposal.createdDayIndex}-${proposal.fromTeamId}-${proposal.toTeamId}`);
  const variance = rng.int(-14, 16);
  const scoreForOtherTeam = Math.round(valueFromUser + needFit + variance - otherUntouchablePenalty);
  const scoreForUserTeam = Math.round(valueFromOther);

  if (!proposal.assetsFrom.length && !proposal.assetsTo.length) warnings.push("Add at least one asset to each side before submitting.");
  if (!proposal.assetsFrom.length) reasons.push("The other club needs a real asset coming back.");
  if (!proposal.assetsTo.length) reasons.push("Your side has not asked for an asset yet.");
  if (!capValid) reasons.push("The cap math does not work.");
  if (otherUntouchablePenalty > 0) reasons.push("They are not interested in moving an untouchable without serious value.");
  if (needFit < 10) reasons.push("The offer does not address their current roster needs.");

  const accepted =
    capValid &&
    !duplicateWarning &&
    proposal.assetsFrom.length > 0 &&
    proposal.assetsTo.length > 0 &&
    scoreForOtherTeam >= scoreForUserTeam * 0.9 + 18 &&
    otherUntouchablePenalty === 0;

  if (accepted) {
    reasons.push("The package gives the other front office enough value and roster logic to say yes.");
  } else if (scoreForOtherTeam < scoreForUserTeam * 0.9 + 18) {
    reasons.push("They see the value gap as too wide from their side of the table.");
  }

  return {
    accepted,
    scoreForOtherTeam,
    scoreForUserTeam,
    otherTeamNeedFit: needFit,
    capValid,
    reasons: unique(reasons),
    warnings: unique(warnings)
  };
}

export function validateTradeCap(proposal: TradeProposal, league: LeagueState): string[] {
  const fromTeam = findTeam(league, proposal.fromTeamId);
  const toTeam = findTeam(league, proposal.toTeamId);
  const fromOutgoing = capForAssets(proposal.assetsFrom, fromTeam);
  const fromIncoming = capForAssets(proposal.assetsTo, toTeam);
  const toOutgoing = capForAssets(proposal.assetsTo, toTeam);
  const toIncoming = capForAssets(proposal.assetsFrom, fromTeam);
  const fromProjected = calculateTeamCapHit(fromTeam) - fromOutgoing + fromIncoming;
  const toProjected = calculateTeamCapHit(toTeam) - toOutgoing + toIncoming;
  const warnings: string[] = [];
  if (fromProjected > fromTeam.capCeiling) warnings.push(`${fromTeam.fullName} would exceed the cap ceiling by ${formatMoney(fromProjected - fromTeam.capCeiling)}.`);
  if (toProjected > toTeam.capCeiling) warnings.push(`${toTeam.fullName} would exceed the cap ceiling by ${formatMoney(toProjected - toTeam.capCeiling)}.`);
  return warnings;
}

export function applyTrade(proposal: TradeProposal, franchise: FranchiseState): FranchiseState {
  const evaluation = evaluateTrade(proposal, franchise.league);
  const acceptedProposal: TradeProposal = { ...proposal, status: evaluation.accepted ? "accepted" : "rejected" };
  if (!evaluation.accepted) {
    return {
      ...franchise,
      tradeHistory: [acceptedProposal, ...franchise.tradeHistory].slice(0, 20),
      inbox: [...createTradeNews(acceptedProposal, evaluation, franchise.league.teams), ...franchise.inbox].slice(0, 40),
      transactionLog: [
        {
          id: `transaction-${acceptedProposal.id}`,
          date: franchise.league.currentDate,
          type: "trade" as const,
          headline: "Trade rejected",
          details: evaluation.reasons[0] ?? "The other club declined the offer.",
          teamIds: [proposal.fromTeamId, proposal.toTeamId],
          playerIds: playerIdsFromProposal(proposal),
          pickIds: pickIdsFromProposal(proposal)
        },
        ...franchise.transactionLog
      ].slice(0, 30),
      updatedAt: new Date().toISOString()
    };
  }

  const fromTeam = findTeam(franchise.league, proposal.fromTeamId);
  const toTeam = findTeam(franchise.league, proposal.toTeamId);
  const playersFrom = proposal.assetsFrom
    .filter((asset) => asset.type === "player")
    .map((asset) => fromTeam.roster.find((player) => player.id === asset.assetId))
    .filter((player): player is Player => Boolean(player));
  const playersTo = proposal.assetsTo
    .filter((asset) => asset.type === "player")
    .map((asset) => toTeam.roster.find((player) => player.id === asset.assetId))
    .filter((player): player is Player => Boolean(player));
  const pickIdsFrom = proposal.assetsFrom.filter((asset) => asset.type === "pick").map((asset) => asset.assetId);
  const pickIdsTo = proposal.assetsTo.filter((asset) => asset.type === "pick").map((asset) => asset.assetId);

  let nextFrom: Team = {
    ...fromTeam,
    roster: [
      ...fromTeam.roster.filter((player) => !playersFrom.some((traded) => traded.id === player.id)),
      ...playersTo.map((player) => ({ ...player, teamId: fromTeam.id, acquiredVia: "trade" as const }))
    ],
    draftPicks: [
      ...fromTeam.draftPicks.filter((pick) => !pickIdsFrom.includes(pick.id)),
      ...toTeam.draftPicks.filter((pick) => pickIdsTo.includes(pick.id)).map((pick) => ({ ...pick, ownerTeamId: fromTeam.id }))
    ]
  };
  let nextTo: Team = {
    ...toTeam,
    roster: [
      ...toTeam.roster.filter((player) => !playersTo.some((traded) => traded.id === player.id)),
      ...playersFrom.map((player) => ({ ...player, teamId: toTeam.id, acquiredVia: "trade" as const }))
    ],
    draftPicks: [
      ...toTeam.draftPicks.filter((pick) => !pickIdsTo.includes(pick.id)),
      ...fromTeam.draftPicks.filter((pick) => pickIdsFrom.includes(pick.id)).map((pick) => ({ ...pick, ownerTeamId: toTeam.id }))
    ]
  };
  nextFrom = normalizeAfterTrade(classifyIncomingAfterTrade(nextFrom, playersTo.map((player) => player.id)));
  nextTo = normalizeAfterTrade(classifyIncomingAfterTrade(nextTo, playersFrom.map((player) => player.id)));

  const teams = franchise.league.teams.map((team) => (team.id === nextFrom.id ? nextFrom : team.id === nextTo.id ? nextTo : team));
  const news = createTradeNews(acceptedProposal, evaluation, teams);

  const traded = {
    ...franchise,
    league: {
      ...franchise.league,
      teams
    },
    tradeHistory: [acceptedProposal, ...franchise.tradeHistory].slice(0, 20),
    transactionLog: [
      {
        id: `transaction-${acceptedProposal.id}`,
        date: franchise.league.currentDate,
        type: "trade" as const,
        headline: "Trade completed",
        details: news[0]?.body ?? "Assets changed hands after a front-office agreement.",
        teamIds: [proposal.fromTeamId, proposal.toTeamId],
        playerIds: playerIdsFromProposal(proposal),
        pickIds: pickIdsFromProposal(proposal)
      },
      ...franchise.transactionLog
    ].slice(0, 30),
    inbox: [...news, ...franchise.inbox].slice(0, 40),
    updatedAt: new Date().toISOString()
  };
  return repairAllTeamRosters(traded, "postTrade");
}

export function createTradeNews(proposal: TradeProposal, evaluation: TradeEvaluation, teams: Team[]): NewsItem[] {
  const fromTeam = teams.find((team) => team.id === proposal.fromTeamId);
  const toTeam = teams.find((team) => team.id === proposal.toTeamId);
  const fromAssets = describeAssets(proposal.assetsFrom, teams);
  const toAssets = describeAssets(proposal.assetsTo, teams);
  if (!fromTeam || !toTeam) return [];
  return [
    {
      id: `trade-news-${proposal.id}-${proposal.status}`,
      type: "trade",
      date: new Date().toISOString().slice(0, 10),
      headline:
        proposal.status === "accepted"
          ? `Trade Call: ${fromTeam.nickname} and ${toTeam.nickname} make a deal`
          : `Trade Call: ${toTeam.nickname} decline the offer`,
      body:
        proposal.status === "accepted"
          ? `${fromTeam.fullName} send ${fromAssets} to ${toTeam.fullName} for ${toAssets}.`
          : evaluation.reasons[0] ?? "The other club did not see enough value in the proposal.",
      severity: proposal.status === "accepted" ? "medium" : "low",
      teamId: fromTeam.id
    }
  ];
}

function normalizeAfterTrade(team: Team): Team {
  const untouchables = generateUntouchables(team);
  const withAssets = {
    ...team,
    draftPicks: [...team.draftPicks].sort((a, b) => a.seasonYear - b.seasonYear || a.round - b.round),
    untouchables,
    tradeBlock: generateTradeBlock({ ...team, untouchables }),
    teamNeeds: inferTeamNeeds(team)
  };
  return {
    ...withAssets,
    lines: autoFillBestLineup(withAssets).lineup
  };
}

function calculateNeedFit(assets: TradeAsset[], receivingTeam: Team, league: LeagueState): number {
  const sourcePlayers = new Map(league.teams.flatMap((team) => team.roster.map((player) => [player.id, player] as const)));
  const needs = receivingTeam.teamNeeds.length ? receivingTeam.teamNeeds : inferTeamNeeds(receivingTeam);
  return assets.reduce((sum, asset) => {
    if (asset.type === "pick") return sum + 8;
    const player = sourcePlayers.get(asset.assetId);
    if (!player) return sum;
    const need = needs.find((candidate) => candidate.position === player.position);
    return sum + (need ? Math.round(need.urgency * 0.38) : player.overall >= 82 ? 10 : 2);
  }, 0);
}

function capForAssets(assets: TradeAsset[], team: Team): number {
  return assets.reduce((sum, asset) => {
    if (asset.type !== "player") return sum;
    const player = team.roster.find((candidate) => candidate.id === asset.assetId);
    const status = player ? getPlayerRosterStatus(player) : "active";
    return sum + (status === "active" || status === "scratched" || status === "injuredReserve" ? player?.contract.capHit ?? 0 : 0);
  }, 0);
}

function classifyIncomingAfterTrade(team: Team, incomingIds: string[]): Team {
  let next = team;
  incomingIds.forEach((playerId) => {
    const player = next.roster.find((candidate) => candidate.id === playerId);
    if (!player) return;
    const status = defaultRosterStatusForIncomingPlayer(next, player);
    next = {
      ...next,
      roster: next.roster.map((candidate) => (candidate.id === playerId ? { ...candidate, rosterStatus: status } : candidate))
    };
  });
  return next;
}

function duplicateAssetWarning(proposal: TradeProposal): string | undefined {
  const keys = [...proposal.assetsFrom, ...proposal.assetsTo].map((asset) => `${asset.type}:${asset.teamId}:${asset.assetId}`);
  return keys.some((key, index) => keys.indexOf(key) !== index) ? "Duplicate assets are not allowed in one trade." : undefined;
}

function tradeBlockScore(player: Player): number {
  const expensive = player.contract.capHit > 4_000_000 && player.overall < 76 ? 20 : 0;
  const older = player.age >= 31 ? 8 : 0;
  const morale = player.morale < 45 ? 12 : 0;
  const depth = player.overall < 72 ? 10 : 0;
  return expensive + older + morale + depth - Math.max(0, player.potential - player.overall);
}

function describeAssets(assets: TradeAsset[], teams: Team[]): string {
  if (!assets.length) return "no assets";
  return assets
    .map((asset) => {
      const team = teams.find((candidate) => candidate.id === asset.teamId);
      if (!team) return "an asset";
      if (asset.type === "player") {
        return (
          team.roster.find((player) => player.id === asset.assetId)?.displayName ??
          teams.flatMap((candidate) => candidate.roster).find((player) => player.id === asset.assetId)?.displayName ??
          "a player"
        );
      }
      const pick = team.draftPicks.find((candidate) => candidate.id === asset.assetId) ?? teams.flatMap((candidate) => candidate.draftPicks).find((candidate) => candidate.id === asset.assetId);
      return pick ? formatPickLabel(pick, teams) : "a draft pick";
    })
    .join(", ");
}

function playerIdsFromProposal(proposal: TradeProposal): string[] {
  return [...proposal.assetsFrom, ...proposal.assetsTo].filter((asset) => asset.type === "player").map((asset) => asset.assetId);
}

function pickIdsFromProposal(proposal: TradeProposal): string[] {
  return [...proposal.assetsFrom, ...proposal.assetsTo].filter((asset) => asset.type === "pick").map((asset) => asset.assetId);
}

function findTeam(league: LeagueState, teamId: string): Team {
  const team = league.teams.find((candidate) => candidate.id === teamId);
  if (!team) throw new Error(`Team not found: ${teamId}`);
  return team;
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items));
}
