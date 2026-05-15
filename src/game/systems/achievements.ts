import type { Achievement, FranchiseState, GameResult } from "../types";
import { calculateCapSpace } from "./contracts";

export type AchievementContext =
  | { type: "newFranchise" }
  | { type: "gameResult"; result: GameResult; won: boolean }
  | { type: "lineupEdited" }
  | { type: "trade"; accepted: boolean }
  | { type: "draftPick" }
  | { type: "prospectWatchlist" }
  | { type: "prospectSigned" }
  | { type: "decisionResolved"; eventType?: string }
  | { type: "ownerGoal" }
  | { type: "seasonTransition" }
  | { type: "developmentTick"; improved?: boolean }
  | { type: "rosterRepair" }
  | { type: "playoffs"; seriesWon?: boolean; champion?: boolean; rivalryWin?: boolean };

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  achievement("first-day", "First Day on the Job", "Create a franchise and take the office.", "management"),
  achievement("first-win", "First Win", "Win your first game with the club.", "team"),
  achievement("lineup-architect", "Lineup Architect", "Edit or auto-fill the lineup.", "roster"),
  achievement("phones-hot", "The Phones Are Hot", "Complete your first accepted trade.", "trade"),
  achievement("draft-table-debut", "Draft Table Debut", "Make your first draft pick.", "draft"),
  achievement("scouts-eye", "Scout's Eye", "Add a prospect to the watchlist or sharpen the board.", "draft"),
  achievement("prospect-pipeline", "Prospect Pipeline", "Sign your first drafted prospect.", "development"),
  achievement("room-stabilizer", "Room Stabilizer", "Resolve your first player or team meeting.", "livingOps"),
  achievement("media-trained", "Media Trained", "Complete your first press conference.", "livingOps"),
  achievement("owners-confidence", "Owner's Confidence", "Complete an owner goal.", "management"),
  achievement("playoff-ticket", "Playoff Ticket", "Make the playoffs.", "playoffs"),
  achievement("series-winner", "Series Winner", "Win a playoff series.", "playoffs"),
  achievement("champion", "Champion", "Win the championship.", "playoffs", "The banner joins your local dynasty history."),
  achievement("dynasty-builder", "Dynasty Builder", "Complete three seasons.", "dynasty", undefined, 3),
  achievement("cap-surgeon", "Cap Surgeon", "Open a season under the cap with less than $1M in room.", "management"),
  achievement("development-win", "Development Win", "Improve a player overall through development.", "development"),
  achievement("rivalry-statement", "Rivalry Statement", "Beat a rival in the playoffs.", "playoffs"),
  achievement("emergency-solved", "Emergency Solved", "Repair an invalid roster.", "roster"),
  achievement("long-view", "The Long View", "Complete five seasons.", "dynasty", undefined, 5)
];

export function createDefaultAchievements(): Achievement[] {
  return DEFAULT_ACHIEVEMENTS.map((item) => ({ ...item }));
}

export function normalizeAchievements(achievements?: Achievement[]): Achievement[] {
  const existing = new Map((achievements ?? []).filter((item) => item?.id).map((item) => [item.id, item]));
  return createDefaultAchievements().map((base) => {
    const saved = existing.get(base.id);
    return saved
      ? {
          ...base,
          ...saved,
          progress: clampProgress(saved.progress, saved.target || base.target),
          target: saved.target || base.target
        }
      : base;
  });
}

export function unlockAchievement(franchise: FranchiseState, id: string, date = franchise.league.currentDate): FranchiseState {
  const achievements = normalizeAchievements(franchise.achievements);
  let unlocked = false;
  const nextAchievements = achievements.map((achievement) => {
    if (achievement.id !== id || achievement.unlockedAt) return achievement;
    unlocked = true;
    return { ...achievement, unlockedAt: date, progress: achievement.target };
  });
  return unlocked ? { ...franchise, achievements: nextAchievements, updatedAt: new Date().toISOString() } : { ...franchise, achievements: nextAchievements };
}

export function updateAchievementProgress(franchise: FranchiseState, id: string, progress: number): FranchiseState {
  const achievements = normalizeAchievements(franchise.achievements).map((achievement) =>
    achievement.id === id
      ? {
          ...achievement,
          progress: clampProgress(progress, achievement.target),
          unlockedAt: achievement.unlockedAt ?? (progress >= achievement.target ? franchise.league.currentDate : undefined)
        }
      : achievement
  );
  return { ...franchise, achievements };
}

export function evaluateAchievements(franchise: FranchiseState, context?: AchievementContext): FranchiseState {
  let next: FranchiseState = { ...franchise, achievements: normalizeAchievements(franchise.achievements) };
  const team = next.league.teams.find((candidate) => candidate.id === next.selectedTeamId);
  const selectedSeasonCount = next.history.seasons.length;

  if (!next.achievements.find((item) => item.id === "first-day")?.unlockedAt) next = unlockAchievement(next, "first-day", next.createdAt);
  if (team && team.record.wins > 0) next = unlockAchievement(next, "first-win");
  if (team && calculateCapSpace(team) >= 0 && calculateCapSpace(team) < 1_000_000) next = unlockAchievement(next, "cap-surgeon");
  if (selectedSeasonCount >= 3) next = updateAchievementProgress(next, "dynasty-builder", selectedSeasonCount);
  if (selectedSeasonCount >= 5) next = updateAchievementProgress(next, "long-view", selectedSeasonCount);
  if (next.ownerState.seasonGoals.some((goal) => goal.status === "met") || (next.ownerState.goalOutcomeHistory ?? []).some((goal) => goal.status === "met")) {
    next = unlockAchievement(next, "owners-confidence");
  }
  if (next.history.seasons.some((season) => season.selectedTeamPlayoffResult !== "Missed playoffs")) next = unlockAchievement(next, "playoff-ticket");
  if (next.history.champions.some((champion) => champion.teamId === next.selectedTeamId)) next = unlockAchievement(next, "champion");
  if (next.tradeHistory.some((trade) => trade.status === "accepted")) next = unlockAchievement(next, "phones-hot");
  if (next.history.draftHistory.some((selection) => selection.teamId === next.selectedTeamId)) next = unlockAchievement(next, "draft-table-debut");
  if ((next.prospectPools[next.selectedTeamId] ?? []).some((rights) => rights.signed)) next = unlockAchievement(next, "prospect-pipeline");

  if (!context) return next;
  if (context.type === "lineupEdited") next = unlockAchievement(next, "lineup-architect");
  if (context.type === "gameResult" && context.won) next = unlockAchievement(next, "first-win");
  if (context.type === "trade" && context.accepted) next = unlockAchievement(next, "phones-hot");
  if (context.type === "draftPick") next = unlockAchievement(next, "draft-table-debut");
  if (context.type === "prospectWatchlist") next = unlockAchievement(next, "scouts-eye");
  if (context.type === "prospectSigned") next = unlockAchievement(next, "prospect-pipeline");
  if (context.type === "decisionResolved" && (context.eventType === "playerMeeting" || context.eventType === "teamMeeting")) {
    next = unlockAchievement(next, "room-stabilizer");
  }
  if (context.type === "decisionResolved" && (context.eventType === "pressConference" || context.eventType === "mediaQuestion")) {
    next = unlockAchievement(next, "media-trained");
  }
  if (context.type === "ownerGoal") next = unlockAchievement(next, "owners-confidence");
  if (context.type === "developmentTick" && context.improved) next = unlockAchievement(next, "development-win");
  if (context.type === "rosterRepair") next = unlockAchievement(next, "emergency-solved");
  if (context.type === "playoffs") {
    if (context.seriesWon) next = unlockAchievement(next, "series-winner");
    if (context.champion) next = unlockAchievement(next, "champion");
    if (context.rivalryWin) next = unlockAchievement(next, "rivalry-statement");
  }
  return next;
}

export function getAchievementSummary(franchise: FranchiseState): {
  unlocked: number;
  total: number;
  recent: Achievement[];
  percent: number;
} {
  const achievements = normalizeAchievements(franchise.achievements);
  const unlocked = achievements.filter((item) => item.unlockedAt);
  return {
    unlocked: unlocked.length,
    total: achievements.length,
    recent: [...unlocked].sort((a, b) => (b.unlockedAt ?? "").localeCompare(a.unlockedAt ?? "")).slice(0, 5),
    percent: achievements.length ? Math.round((unlocked.length / achievements.length) * 100) : 0
  };
}

function achievement(
  id: string,
  label: string,
  description: string,
  category: Achievement["category"],
  rewardText?: string,
  target = 1
): Achievement {
  return {
    id,
    label,
    description,
    category,
    progress: 0,
    target,
    rewardText
  };
}

function clampProgress(progress: number, target: number): number {
  if (!Number.isFinite(progress)) return 0;
  return Math.max(0, Math.min(Math.max(1, target), Math.round(progress)));
}
