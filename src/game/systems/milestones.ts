import type { FranchiseMilestone, FranchiseState, GameResult } from "../types";

export type MilestoneContext =
  | { type: "firstWin"; result?: GameResult }
  | { type: "firstTrade"; playerIds?: string[] }
  | { type: "firstDraftPick"; playerIds?: string[] }
  | { type: "firstPlayoffBerth" }
  | { type: "championship" }
  | { type: "prospectBreakout"; playerIds?: string[] }
  | { type: "starReSigned"; playerIds?: string[] }
  | { type: "rivalryWin"; playerIds?: string[] }
  | { type: "ownerGoalMet" }
  | { type: "majorStoryResolved"; relatedEventId?: string; playerIds?: string[] }
  | { type: "seasonCompleted" }
  | { type: "newSeasonStarted" };

const COPY: Record<FranchiseMilestone["type"], { headline: string; body: string; importance: FranchiseMilestone["importance"] }> = {
  firstWin: {
    headline: "First win in the books",
    body: "The first result gave the office a real starting point for the season story.",
    importance: "major"
  },
  firstTrade: {
    headline: "First trade call completed",
    body: "The franchise made its first roster-altering deal under your watch.",
    importance: "major"
  },
  firstDraftPick: {
    headline: "First draft card submitted",
    body: "The pipeline has its first prospect tied to this front-office era.",
    importance: "major"
  },
  firstPlayoffBerth: {
    headline: "Playoff ticket punched",
    body: "The club reached the postseason and gave the market a bigger stage.",
    importance: "major"
  },
  championship: {
    headline: "Championship banner earned",
    body: "A historic season ended with the biggest prize in the fictional league.",
    importance: "historic"
  },
  prospectBreakout: {
    headline: "Prospect breakout logged",
    body: "A young player forced the development office to update the long-term board.",
    importance: "major"
  },
  starReSigned: {
    headline: "Core player re-signed",
    body: "The front office kept a major piece in the building.",
    importance: "major"
  },
  rivalryWin: {
    headline: "Rivalry statement made",
    body: "The club took a meaningful game from a heated rival.",
    importance: "major"
  },
  ownerGoalMet: {
    headline: "Owner goal delivered",
    body: "Ownership saw a clear target move from expectation to completion.",
    importance: "minor"
  },
  majorStoryResolved: {
    headline: "Major story resolved",
    body: "A pressure point around the club reached a conclusion.",
    importance: "major"
  },
  seasonCompleted: {
    headline: "Season archived",
    body: "The campaign moved into history with its record, awards, and lessons preserved.",
    importance: "major"
  },
  newSeasonStarted: {
    headline: "New season opened",
    body: "Training camp closed and a fresh schedule arrived on the desk.",
    importance: "minor"
  }
};

export function createMilestone(franchise: FranchiseState, type: FranchiseMilestone["type"], context: Partial<MilestoneContext> = {}): FranchiseMilestone {
  const copy = COPY[type];
  return {
    id: `milestone-${franchise.league.seasonYear}-${type}-${franchise.league.currentDayIndex}`,
    date: franchise.league.currentDate,
    seasonYear: franchise.league.seasonYear,
    type,
    headline: copy.headline,
    body: copy.body,
    teamId: franchise.selectedTeamId,
    playerIds: "playerIds" in context ? context.playerIds : undefined,
    relatedEventId: "relatedEventId" in context ? context.relatedEventId : undefined,
    importance: copy.importance
  };
}

export function evaluateMilestones(franchise: FranchiseState, context?: MilestoneContext): FranchiseState {
  let next: FranchiseState = { ...franchise, milestones: normalizeMilestones(franchise.milestones) };
  const team = next.league.teams.find((candidate) => candidate.id === next.selectedTeamId);
  if (team && team.record.wins > 0) next = addMilestoneIfMissing(next, "firstWin");
  if (next.tradeHistory.some((trade) => trade.status === "accepted")) next = addMilestoneIfMissing(next, "firstTrade");
  if (next.history.draftHistory.some((selection) => selection.teamId === next.selectedTeamId)) next = addMilestoneIfMissing(next, "firstDraftPick");
  if (next.history.seasons.some((season) => season.selectedTeamPlayoffResult !== "Missed playoffs")) next = addMilestoneIfMissing(next, "firstPlayoffBerth");
  if (next.history.champions.some((champion) => champion.teamId === next.selectedTeamId)) next = addMilestoneIfMissing(next, "championship");
  if ((next.ownerState.goalOutcomeHistory ?? []).some((goal) => goal.status === "met")) next = addMilestoneIfMissing(next, "ownerGoalMet");
  if (!context) return next;
  return addMilestoneIfMissing(next, context.type, context);
}

export function getRecentMilestones(franchise: FranchiseState, limit = 5): FranchiseMilestone[] {
  return normalizeMilestones(franchise.milestones)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
    .slice(0, limit);
}

export function normalizeMilestones(milestones?: FranchiseMilestone[]): FranchiseMilestone[] {
  const seen = new Set<string>();
  return (milestones ?? [])
    .filter((milestone): milestone is FranchiseMilestone => Boolean(milestone?.id && milestone.type && milestone.date))
    .filter((milestone) => {
      if (seen.has(milestone.id)) return false;
      seen.add(milestone.id);
      return true;
    })
    .slice(0, 80);
}

function addMilestoneIfMissing(franchise: FranchiseState, type: FranchiseMilestone["type"], context: Partial<MilestoneContext> = {}): FranchiseState {
  if (franchise.milestones.some((milestone) => milestone.type === type)) return franchise;
  return {
    ...franchise,
    milestones: [createMilestone(franchise, type, context), ...franchise.milestones].slice(0, 80),
    updatedAt: new Date().toISOString()
  };
}
