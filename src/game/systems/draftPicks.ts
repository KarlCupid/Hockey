import { DRAFT_PICK_ROUNDS, DRAFT_PICK_SEASONS } from "../constants";
import type { DraftPick, LeagueState, Team } from "../types";

const ROUND_VALUES: Record<number, number> = {
  1: 420,
  2: 245,
  3: 145,
  4: 85,
  5: 55,
  6: 38,
  7: 26
};

export function generateInitialDraftPicks(teams: Team[], seasonYear: number, draftRounds = DRAFT_PICK_ROUNDS): DraftPick[] {
  return teams.flatMap((team) =>
    Array.from({ length: DRAFT_PICK_SEASONS }, (_, seasonOffset) => seasonYear + seasonOffset).flatMap((year) =>
      Array.from({ length: draftRounds }, (_, index) => {
        const round = index + 1;
        return {
          id: `${year}-r${round}-${team.id}`,
          originalTeamId: team.id,
          ownerTeamId: team.id,
          seasonYear: year,
          round,
          label: `${year} Round ${round}`,
          projectedValue: ROUND_VALUES[round]
        };
      })
    )
  );
}

export function getTeamPicks(team: Team, seasonYear?: number): DraftPick[] {
  return [...team.draftPicks]
    .filter((pick) => seasonYear === undefined || pick.seasonYear === seasonYear)
    .sort((a, b) => a.seasonYear - b.seasonYear || a.round - b.round || a.originalTeamId.localeCompare(b.originalTeamId));
}

export function formatPickLabel(pick: DraftPick, teams: Team[]): string {
  const original = teams.find((team) => team.id === pick.originalTeamId);
  const source = original ? original.abbreviation : "Club";
  return `${pick.seasonYear} R${pick.round} (${source})`;
}

export function estimatePickValue(pick: DraftPick, league: LeagueState): number {
  const original = league.teams.find((team) => team.id === pick.originalTeamId);
  const base = pick.projectedValue || ROUND_VALUES[pick.round] || 50;
  if (!original) return base;
  const standingsRank = [...league.teams]
    .sort((a, b) => b.record.points - a.record.points || a.record.goalsFor - a.record.goalsAgainst - (b.record.goalsFor - b.record.goalsAgainst))
    .findIndex((team) => team.id === original.id);
  const highPickBonus = standingsRank >= 0 ? (league.teams.length - standingsRank) * -4 + 28 : 0;
  const currentSeasonPremium = pick.seasonYear === league.seasonYear ? 18 : 0;
  return Math.max(20, Math.round(base + highPickBonus + currentSeasonPremium));
}

export function transferPick(pickId: string, fromTeam: Team, toTeam: Team): { fromTeam: Team; toTeam: Team; pick?: DraftPick } {
  const pick = fromTeam.draftPicks.find((candidate) => candidate.id === pickId);
  if (!pick) return { fromTeam, toTeam };
  const transferred: DraftPick = { ...pick, ownerTeamId: toTeam.id };
  return {
    fromTeam: {
      ...fromTeam,
      draftPicks: fromTeam.draftPicks.filter((candidate) => candidate.id !== pickId)
    },
    toTeam: {
      ...toTeam,
      draftPicks: [...toTeam.draftPicks, transferred].sort((a, b) => a.seasonYear - b.seasonYear || a.round - b.round)
    },
    pick: transferred
  };
}
