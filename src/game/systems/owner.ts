import { calculateCapSpace } from "./contracts";
import { normalizeLeagueRuleSet } from "./leagueRules";
import { sortStandings } from "./standings";
import { SeededRng, clamp } from "../rng";
import type { FranchiseState, NewsItem, OwnerGoal, OwnerState } from "../types";

export function generateOwnerGoals(franchise: FranchiseState, rng = new SeededRng(`${franchise.franchiseId}-owner-${franchise.league.seasonYear}`)): OwnerGoal[] {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId)!;
  const gameMode = franchise.gmProfile?.gameMode ?? "standardDynasty";
  const previous = franchise.history?.seasons?.[0];
  const standings = sortStandings(franchise.league.teams);
  const playoffLine = normalizeLeagueRuleSet(franchise.league.ruleSet).playoffTeamCount;
  const rank = standings.findIndex((candidate) => candidate.id === team.id) + 1;
  const averageOverall = team.roster.reduce((sum, player) => sum + player.overall, 0) / Math.max(1, team.roster.length);
  const rebuilding = rank > playoffLine || averageOverall < 72 || team.record.points < Math.max(8, team.stats.gamesPlayed * 0.85);
  const contender = rank > 0 && rank <= Math.max(2, Math.floor(playoffLine / 2)) && averageOverall >= 74;
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
    },
    {
      id: `goal-${franchise.league.seasonYear}-win-round`,
      type: "winRound",
      label: "Win a playoff round",
      target: 1,
      progress: 0,
      status: "active",
      importance: contender ? "high" : "medium"
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
  if (gameMode === "sandbox") {
    return [
      { ...rng.pick(frontOffice), importance: "low" },
      { ...rng.pick(development.filter((goal) => goal.type !== "sellVeteran")), importance: "low" },
      { ...rng.pick(performance.filter((goal) => goal.type !== "winRound")), importance: "low" }
    ];
  }
  if (gameMode === "rebuildChallenge") {
    return [
      { ...frontOffice.find((goal) => goal.type === "buildThroughDraft")!, importance: "high" },
      { ...development.find((goal) => goal.type === "developProspect")!, importance: "high" },
      { ...frontOffice.find((goal) => goal.type === "stayUnderCap")!, importance: "medium" }
    ];
  }
  if (gameMode === "contenderChallenge") {
    return [
      { ...performance.find((goal) => goal.type === "makePlayoffs")!, importance: "high" },
      { ...performance.find((goal) => goal.type === "winRound")!, importance: "high" },
      { ...frontOffice.find((goal) => goal.type === "stayUnderCap")!, importance: "medium" }
    ];
  }
  if (gameMode === "pressureCooker") {
    return [
      { ...rng.pick(performance), importance: "high" },
      { ...rng.pick(performance.filter((goal) => goal.type !== "improveRecord")), importance: "high" },
      { ...rng.pick(frontOffice), importance: "medium" }
    ];
  }
  if (rebuilding) return [rng.pick(frontOffice), rng.pick(development), rng.pick(development.filter((goal) => goal.type !== "sellVeteran"))];
  if (contender) return [rng.pick(performance.filter((goal) => goal.type !== "improveRecord")), rng.pick(performance), rng.pick(frontOffice)];
  return [rng.pick(performance), rng.pick(frontOffice), rng.pick(development)];
}

export function updateOwnerGoalProgress(franchise: FranchiseState): OwnerState {
  const standings = sortStandings(franchise.league.teams);
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId)!;
  const playoffLine = normalizeLeagueRuleSet(franchise.league.ruleSet).playoffTeamCount;
  const rank = standings.findIndex((candidate) => candidate.id === team.id) + 1;
  const goals = franchise.ownerState.seasonGoals.map((goal) => {
    let progress = goal.progress;
    if (goal.type === "makePlayoffs") progress = rank > 0 && rank <= playoffLine ? 1 : 0;
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
    seasonGoals: goals,
    goalOutcomeHistory: franchise.ownerState.goalOutcomeHistory ?? []
  };
}

export function evaluateJobSecurity(franchise: FranchiseState): OwnerState {
  const owner = updateOwnerGoalProgress(franchise);
  const standings = sortStandings(franchise.league.teams);
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId)!;
  const playoffLine = normalizeLeagueRuleSet(franchise.league.ruleSet).playoffTeamCount;
  const rank = standings.findIndex((candidate) => candidate.id === team.id) + 1;
  const pointsPace = team.stats.gamesPlayed ? team.record.points / team.stats.gamesPlayed : 1;
  const rawDelta = owner.seasonGoals.reduce((sum, goal) => {
    const weight = goal.importance === "high" ? 9 : goal.importance === "medium" ? 6 : 3;
    if (goal.status === "met") return sum + weight;
    if (goal.status === "failed") return sum - weight;
    return sum - Math.round(weight * 0.35);
  }, rank > 0 && rank <= Math.max(2, Math.floor(playoffLine / 2)) ? 8 : rank > 0 && rank <= playoffLine ? 5 : pointsPace >= 1 ? 2 : -3);
  const volatility = franchise.difficultyTuning?.jobSecurityVolatility ?? 1;
  const patienceMultiplier = franchise.difficultyTuning?.ownerPatienceMultiplier ?? 1;
  const modeFloor = franchise.gmProfile?.gameMode === "sandbox" ? 35 : 0;
  const delta = Math.round(rawDelta * volatility * patienceMultiplier);
  return {
    ...owner,
    jobSecurity: clamp(owner.jobSecurity + delta, modeFloor, 100),
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
    messages: [],
    goalOutcomeHistory: franchise.ownerState?.goalOutcomeHistory ?? []
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
    messages: [message],
    goalOutcomeHistory: base.goalOutcomeHistory ?? []
  };
}
