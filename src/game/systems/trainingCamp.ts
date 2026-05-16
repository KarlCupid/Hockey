import { SeededRng } from "../rng";
import type { FranchiseState, NewsItem, RosterMove, Team, TrainingCampBattle } from "../types";
import { repairAllTeamRosters } from "./aiRosterManagement";
import { getAffiliatePromotionCandidates } from "./affiliate";
import { autoFillBestLineup } from "./lineupValidation";
import { getPlayerRosterStatus, validateRosterForGame } from "./rosterRules";
import { autoSendSurplusPlayersToAffiliate } from "./aiRosterManagement";

export function runTrainingCampRosterSetup(franchise: FranchiseState, rng = new SeededRng(`${franchise.franchiseId}-training-camp`)): FranchiseState {
  const repaired = repairAllTeamRosters(franchise, "trainingCamp");
  const finalized = autoFinalizeAiTrainingCamp(repaired, rng);
  return {
    ...finalized,
    offseasonState: {
      ...(finalized.offseasonState ?? {
        year: finalized.league.seasonYear,
        retiredPlayerIds: [],
        retiredPlayerNames: [],
        reSigningCompleted: false,
        trainingCampCompleted: false,
        phaseLog: []
      }),
      trainingCampCompleted: true,
      phaseLog: [`Training camp roster setup completed.`, ...(finalized.offseasonState?.phaseLog ?? [])].slice(0, 12)
    },
    inbox: [...createTrainingCampNews(finalized), ...finalized.inbox].slice(0, 60),
    updatedAt: new Date().toISOString()
  };
}

export function createTrainingCampBattles(team: Team): TrainingCampBattle[] {
  const bubble = [...team.roster]
    .filter((player) => {
      const status = getPlayerRosterStatus(player);
      return status === "active" || status === "scratched" || status === "affiliate";
    })
    .sort((a, b) => Math.abs(72 - a.overall) - Math.abs(72 - b.overall))
    .slice(0, 8);
  return bubble.map((player) => ({
    id: `camp-battle-${team.id}-${player.id}`,
    teamId: team.id,
    position: player.position,
    headline: `${player.position} roster spot: ${player.displayName}`,
    contenders: [player.id, ...bubble.filter((candidate) => candidate.position === player.position && candidate.id !== player.id).slice(0, 2).map((candidate) => candidate.id)],
    recommendation:
      getPlayerRosterStatus(player) === "affiliate"
        ? "Keep developing unless roster repair needs a call-up."
        : player.overall >= 73
          ? "Keep with the major-club group."
          : "Bubble depth; affiliate assignment is sensible."
  }));
}

export function recommendTrainingCampCuts(team: Team): RosterMove[] {
  const moves: RosterMove[] = [];
  let simulated = team;
  simulated = autoSendSurplusPlayersToAffiliate(simulated, new Date().toISOString().slice(0, 10), 0, moves);
  return moves;
}

export function finalizeTrainingCampRoster(franchise: FranchiseState, teamId: string): FranchiseState {
  const team = franchise.league.teams.find((candidate) => candidate.id === teamId);
  if (!team) return franchise;
  const moves: RosterMove[] = [];
  const finalizedTeam = {
    ...autoSendSurplusPlayersToAffiliate(team, franchise.league.currentDate, franchise.league.currentDayIndex, moves),
    lines: autoFillBestLineup(team).lineup
  };
  return {
    ...franchise,
    league: {
      ...franchise.league,
      teams: franchise.league.teams.map((candidate) => (candidate.id === teamId ? finalizedTeam : candidate))
    },
    rosterMoveHistory: [...moves, ...(franchise.rosterMoveHistory ?? [])].slice(0, 140),
    updatedAt: new Date().toISOString()
  };
}

export function autoFinalizeAiTrainingCamp(franchise: FranchiseState, _rng = new SeededRng(`${franchise.franchiseId}-ai-camp`)): FranchiseState {
  const teams = franchise.league.teams.map((team) => {
    const moves: RosterMove[] = [];
    const trimmed = autoSendSurplusPlayersToAffiliate(team, franchise.league.currentDate, franchise.league.currentDayIndex, moves);
    return {
      ...trimmed,
      lines: autoFillBestLineup(trimmed).lineup
    };
  });
  return {
    ...franchise,
    league: {
      ...franchise.league,
      teams
    }
  };
}

export function createTrainingCampNews(franchise: FranchiseState): NewsItem[] {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId);
  if (!team) return [];
  const report = validateRosterForGame(team);
  const promotions = getAffiliatePromotionCandidates(team);
  return [
    {
      id: `training-camp-${team.id}-${franchise.league.seasonYear}`,
      type: "trainingCamp",
      date: franchise.league.currentDate,
      headline: "Training Camp: Roster board finalized",
      body: report.errors.length
        ? `The staff still sees ${report.errors.length} roster issue${report.errors.length === 1 ? "" : "s"} after camp.`
        : `${team.fullName} leave camp game-valid with ${promotions.length} affiliate promotion candidate${promotions.length === 1 ? "" : "s"} tracked.`,
      severity: report.errors.length ? "medium" : "low",
      teamId: team.id
    }
  ];
}
