import type { FranchiseState, OwnerGoal, OwnerGoalOutcome } from "../types";
import { updateOwnerGoalProgress } from "./owner";

export interface OwnerGoalReport {
  total: number;
  met: number;
  failed: number;
  active: number;
  completionRate: number;
  byCategory: Record<OwnerGoalOutcome["category"], { total: number; met: number; completionRate: number }>;
  outcomes: OwnerGoalOutcome[];
}

export function categorizeOwnerGoal(goal: OwnerGoal): OwnerGoalOutcome["category"] {
  if (goal.type === "developProspect" || goal.type === "sellVeteran") return "development";
  if (goal.type === "stayUnderCap") return "cap";
  if (goal.type === "buildThroughDraft") return "draft";
  return "performance";
}

export function captureOwnerGoalOutcomes(franchise: FranchiseState): FranchiseState {
  const progressed = { ...franchise, ownerState: updateOwnerGoalProgress(franchise) };
  const existingIds = new Set(progressed.ownerState.goalOutcomeHistory?.map((outcome) => outcome.id) ?? []);
  const outcomes = progressed.ownerState.seasonGoals
    .filter((goal) => goal.status !== "active" || progressed.seasonPhase === "seasonReview" || progressed.league.completed)
    .map((goal) => toOutcome(progressed, goal))
    .filter((outcome) => !existingIds.has(outcome.id));
  if (!outcomes.length) return progressed;
  return {
    ...progressed,
    ownerState: {
      ...progressed.ownerState,
      goalOutcomeHistory: [...outcomes, ...(progressed.ownerState.goalOutcomeHistory ?? [])].slice(0, 80)
    }
  };
}

export function createOwnerGoalReport(franchise: FranchiseState): OwnerGoalReport {
  const outcomes = franchise.ownerState.goalOutcomeHistory?.length
    ? franchise.ownerState.goalOutcomeHistory
    : updateOwnerGoalProgress(franchise).seasonGoals.map((goal) => toOutcome(franchise, goal));
  const total = outcomes.length;
  const met = outcomes.filter((outcome) => outcome.status === "met").length;
  const failed = outcomes.filter((outcome) => outcome.status === "failed").length;
  const active = outcomes.filter((outcome) => outcome.status === "active").length;
  const byCategory = {
    performance: categorySummary(outcomes, "performance"),
    development: categorySummary(outcomes, "development"),
    cap: categorySummary(outcomes, "cap"),
    draft: categorySummary(outcomes, "draft")
  };
  return {
    total,
    met,
    failed,
    active,
    completionRate: total ? met / total : 0,
    byCategory,
    outcomes
  };
}

function toOutcome(franchise: FranchiseState, goal: OwnerGoal): OwnerGoalOutcome {
  return {
    id: `owner-goal-outcome-${franchise.league.seasonYear}-${goal.id}`,
    seasonYear: franchise.league.seasonYear,
    date: franchise.league.currentDate,
    goalId: goal.id,
    type: goal.type,
    label: goal.label,
    status: goal.status,
    progress: goal.progress,
    target: goal.target,
    importance: goal.importance,
    category: categorizeOwnerGoal(goal)
  };
}

function categorySummary(outcomes: OwnerGoalOutcome[], category: OwnerGoalOutcome["category"]) {
  const filtered = outcomes.filter((outcome) => outcome.category === category);
  const met = filtered.filter((outcome) => outcome.status === "met").length;
  return {
    total: filtered.length,
    met,
    completionRate: filtered.length ? met / filtered.length : 0
  };
}
