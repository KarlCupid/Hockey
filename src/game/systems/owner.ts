import { calculateCapSpace } from "./contracts";
import { sortStandings } from "./standings";
import { SeededRng, clamp } from "../rng";
import type { FranchiseState, NewsItem, OwnerGoal, OwnerState } from "../types";

export function generateOwnerGoals(franchise: FranchiseState, rng = new SeededRng(`${franchise.franchiseId}-owner-${franchise.league.seasonYear}`)): OwnerGoal[] {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId)!;
  const previous = franchise.history?.seasons?.[0];
  const performance: OwnerGoal[] = [
    {
      id: `goal-${franchise.league.seasonYear}-make-playoffs`,
      type: "makePlayoffs",
      label: "Make the playoffs",
      target: 1,
      progress: 0,
      status: "active",
      importance: team.ownerPatience < 55 ? "high" : "medium"
    },
    {
      id: `goal-${franchise.league.seasonYear}-improve-record`,
      type: "improveRecord",
      label: previous ? "Improve last season's points" : "Establish a competitive points pace",
      target: previous?.standingsSnapshot.find((item) => item.teamId === team.id)?.points ?? 22,
      progress: team.record.points,
      status: "active",
      importance: "medium"
    }
  ];
  const frontOffice: OwnerGoal[] = [
    {
      id: `goal-${franchise.league.seasonYear}-cap-space`,
      type: "stayUnderCap",
      label: "Keep at least $2M in cap space",
      target: 2_000_000,
      progress: Math.max(0, calculateCapSpace(team)),
      status: "active",
      importance: team.marketSize === "Small" ? "high" : "medium"
    },
    {
      id: `goal-${franchise.league.seasonYear}-draft-build`,
      type: "buildThroughDraft",
      label: "Draft at least one defenseman in the first two rounds",
      target: 1,
      progress: 0,
      status: "active",
      importance: "medium"
    }
  ];
  const development: OwnerGoal[] = [
    {
      id: `goal-${franchise.league.seasonYear}-develop-prospect`,
      type: "developProspect",
      label: "Develop a player under 23 by at least +1 overall",
      target: 1,
      progress: 0,
      status: "active",
      importance: "low"
    },
    {
      id: `goal-${franchise.league.seasonYear}-sell-veteran`,
      type: "sellVeteran",
      label: "Create flexibility if the playoff race slips",
      target: 1,
      progress: 0,
      status: "active",
      importance: "low"
    }
  ];
  return [rng.pick(performance), rng.pick(frontOffice), rng.pick(development)];
}

export function updateOwnerGoalProgress(franchise: FranchiseState): OwnerState {
  const standings = sortStandings(franchise.league.teams);
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId)!;
  const rank = standings.findIndex((candidate) => candidate.id === team.id) + 1;
  const goals = franchise.ownerState.seasonGoals.map((goal) => {
    let progress = goal.progress;
    if (goal.type === "makePlayoffs") progress = rank > 0 && rank <= 8 ? 1 : 0;
    if (goal.type === "improveRecord") progress = team.record.points;
    if (goal.type === "stayUnderCap") progress = Math.max(0, calculateCapSpace(team));
    if (goal.type === "buildThroughDraft") {
      progress = franchise.history.draftHistory.some(
        (selection) =>
          selection.year === franchise.league.seasonYear &&
          selection.teamId === team.id &&
          selection.round <= 2 &&
          (selection.position === "LD" || selection.position === "RD")
      )
        ? 1
        : 0;
    }
    if (goal.type === "winRound") {
      progress =
        franchise.playoffState?.bracket.some((series) => series.completed && series.winnerTeamId === team.id && series.round === 1) ?? false
          ? 1
          : 0;
    }
    const met =
      goal.type === "stayUnderCap"
        ? progress >= goal.target
        : goal.type === "improveRecord"
          ? progress > goal.target
          : progress >= goal.target;
    const status: OwnerGoal["status"] = met ? "met" : goal.status === "failed" ? "failed" : "active";
    return {
      ...goal,
      progress,
      status
    };
  });
  return {
    ...franchise.ownerState,
    seasonGoals: goals
  };
}

export function evaluateJobSecurity(franchise: FranchiseState): OwnerState {
  const owner = updateOwnerGoalProgress(franchise);
  const delta = owner.seasonGoals.reduce((sum, goal) => {
    const weight = goal.importance === "high" ? 9 : goal.importance === "medium" ? 6 : 3;
    if (goal.status === "met") return sum + weight;
    if (goal.status === "failed") return sum - weight;
    return sum;
  }, 0);
  return {
    ...owner,
    jobSecurity: clamp(owner.jobSecurity + delta, 0, 100),
    lastEvaluationDate: franchise.league.currentDate
  };
}

export function createOwnerEvaluationNews(franchise: FranchiseState): NewsItem[] {
  const owner = evaluateJobSecurity(franchise);
  const mood = ownerMoodLabel(owner);
  return [
    {
      id: `owner-eval-${franchise.league.seasonYear}-${franchise.league.currentDate}`,
      type: "owner",
      date: franchise.league.currentDate,
      headline: `Owner's Suite: Confidence is ${mood.toLowerCase()}`,
      body: `${owner.seasonGoals.filter((goal) => goal.status === "met").length} goals met, ${owner.seasonGoals.filter((goal) => goal.status === "failed").length} missed. The prototype lets you continue no matter how hot the seat gets.`,
      severity: owner.jobSecurity < 35 ? "high" : owner.jobSecurity < 60 ? "medium" : "low",
      teamId: franchise.selectedTeamId
    }
  ];
}

export function ownerMoodLabel(ownerState: OwnerState): string {
  if (ownerState.jobSecurity >= 78) return "Secure";
  if (ownerState.jobSecurity >= 58) return "Steady";
  if (ownerState.jobSecurity >= 36) return "Uneasy";
  if (ownerState.jobSecurity > 0) return "Fragile";
  return "Collapsed";
}

export function createDefaultOwnerState(franchise: FranchiseState, rng = new SeededRng(`${franchise.franchiseId}-owner-default`)): OwnerState {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId)!;
  const base: OwnerState = {
    jobSecurity: clamp(62 + Math.round((team.ownerPatience - 50) * 0.25), 35, 85),
    patience: team.ownerPatience,
    seasonGoals: [],
    messages: []
  };
  const withOwner = { ...franchise, ownerState: base };
  const goals = generateOwnerGoals(withOwner, rng);
  const message: NewsItem = {
    id: `owner-goals-${franchise.league.seasonYear}-${team.id}`,
    type: "owner",
    date: franchise.league.currentDate,
    headline: "Owner's Suite: Season goals posted",
    body: goals.map((goal) => goal.label).join(" | "),
    severity: "medium",
    teamId: team.id
  };
  return {
    ...base,
    seasonGoals: goals,
    messages: [message]
  };
}
