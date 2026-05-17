import { SeededRng, clamp } from "../rng";
import { SCENARIO_TEMPLATES } from "../content/scenarioTemplates";
import type { DataPack, DecisionEvent, FranchiseState, NewsItem, Player, ScenarioDefinition, StoryArc, Team } from "../types";
import { validateScenario as validateScenarioDefinition } from "./dataPackValidation";
import { createDefaultDataPack } from "./dataPacks";

export function getBuiltInScenarios(): ScenarioDefinition[] {
  return SCENARIO_TEMPLATES.map((scenario) => ({ ...scenario, modifiers: scenario.modifiers.map((modifier) => ({ ...modifier })) }));
}

export function getScenarioTemplate(id: string): ScenarioDefinition | undefined {
  return getBuiltInScenarios().find((scenario) => scenario.id === id);
}

export function validateBuiltInScenarios(): string[] {
  return getBuiltInScenarios().flatMap((scenario) => validateScenarioDefinition(scenario).map((message) => `${scenario.name}: ${message}`));
}

export function createScenarioDataPack(scenario: ScenarioDefinition, basePack: DataPack = createDefaultDataPack()): DataPack {
  const now = new Date().toISOString();
  return {
    ...basePack,
    id: `${basePack.id}-${scenario.id}`,
    type: "scenario",
    name: scenario.name,
    description: scenario.description,
    createdAt: now,
    updatedAt: now,
    scenario,
    validation: undefined
  };
}

export function applyScenarioToFranchise(franchise: FranchiseState, scenario: ScenarioDefinition, rng = new SeededRng(scenario.id)): FranchiseState {
  const selectedTeamId = scenario.selectedTeamSuggestion && hasTeam(franchise, scenario.selectedTeamSuggestion) ? scenario.selectedTeamSuggestion : franchise.selectedTeamId;
  let next: FranchiseState = {
    ...franchise,
    selectedTeamId,
    sourceScenarioId: scenario.id,
    dataPackMetadata: {
      dataPackId: franchise.dataPackMetadata?.dataPackId ?? franchise.sourceDataPackId ?? "built-in",
      dataPackName: franchise.dataPackMetadata?.dataPackName ?? franchise.customLeagueName ?? "Built-in Fictional League",
      scenarioName: scenario.name,
      importedAt: franchise.dataPackMetadata?.importedAt ?? new Date().toISOString()
    },
    seasonPhase: scenario.startPhase ?? franchise.seasonPhase,
    league: {
      ...franchise.league,
      currentDayIndex: scenario.startingDayIndex ?? franchise.league.currentDayIndex
    },
    ownerState: scenario.ownerGoalOverrides?.length
      ? { ...franchise.ownerState, seasonGoals: scenario.ownerGoalOverrides }
      : franchise.ownerState
  };

  scenario.modifiers.forEach((modifier) => {
    const targetTeamId = modifier.targetTeamId && hasTeam(next, modifier.targetTeamId) ? modifier.targetTeamId : selectedTeamId;
    if (modifier.type === "capAdjustment") next = updateTeam(next, targetTeamId, (team) => applyCapAdjustment(team, modifier.value ?? 0));
    if (modifier.type === "injury") next = updateTeam(next, targetTeamId, (team) => applyInjuries(team, modifier.value ?? 1, modifier.payload, rng));
    if (modifier.type === "morale") next = updateTeam(next, targetTeamId, (team) => applyMorale(team, modifier.value ?? 0));
    if (modifier.type === "fanSentiment") next = updateTeamDynamics(next, targetTeamId, { fanSentiment: modifier.value ?? 0 });
    if (modifier.type === "ownerTrust") next = updateOwnerTrust(next, targetTeamId, modifier.value ?? 0);
    if (modifier.type === "contracts") next = updateTeam(next, targetTeamId, (team) => applyContractPressure(team, modifier.value ?? 1));
    if (modifier.type === "draftPicks") next = addScenarioTransaction(next, targetTeamId, "draft", modifier.label);
    if (modifier.type === "prospects") next = addScenarioTransaction(next, targetTeamId, "prospect", modifier.label);
    if (modifier.type === "rosterAdjustment") next = addScenarioTransaction(next, targetTeamId, "roster", modifier.label);
    if (modifier.type === "story") next = addScenarioStory(next, scenario, targetTeamId, modifier.label);
  });

  const scenarioSeverity: NewsItem["severity"] = scenario.scenarioType === "chaos" || scenario.scenarioType === "injuryCrisis" ? "high" : "medium";
  next = {
    ...next,
    decisionEvents: mergeScenarioEvents(next.decisionEvents, [
      ...(scenario.initialDecisionEvents ?? []),
      createScenarioDecisionEvent(next, scenario, selectedTeamId)
    ]),
    storyArcs: mergeScenarioArcs(next.storyArcs, [...(scenario.initialStoryArcs ?? [])]),
    inbox: [
      {
        id: `scenario-${scenario.id}-${next.league.currentDate}`,
        type: "media" as const,
        date: next.league.currentDate,
        headline: `Scenario Start: ${scenario.name}`,
        body: scenario.description,
        severity: scenarioSeverity,
        teamId: selectedTeamId
      },
      ...next.inbox
    ].slice(0, 60),
    updatedAt: new Date().toISOString()
  };
  return next;
}

function applyCapAdjustment(team: Team, amount: number): Team {
  const capCeiling = Math.max(team.capFloor + 5_000_000, team.capCeiling + amount);
  return { ...team, capCeiling };
}

function applyInjuries(team: Team, count: number, payload: unknown, rng: SeededRng): Team {
  const desiredPosition = typeof payload === "object" && payload && "position" in payload ? String((payload as { position?: string }).position) : undefined;
  const games = typeof payload === "object" && payload && "games" in payload ? Number((payload as { games?: number }).games) : 3;
  const candidates = team.roster.filter((player) => player.injuryStatus === "healthy" && (!desiredPosition || player.position === desiredPosition));
  const selected = new Set<string>();
  for (let index = 0; index < Math.min(count, candidates.length); index += 1) {
    const player = candidates[(index + rng.int(0, Math.max(0, candidates.length - 1))) % candidates.length];
    selected.add(player.id);
  }
  return {
    ...team,
    roster: team.roster.map((player) =>
      selected.has(player.id)
        ? { ...player, injuryStatus: games <= 2 ? "day-to-day" : "out", injuryGamesRemaining: Math.max(1, Math.round(games)) }
        : player
    )
  };
}

function applyMorale(team: Team, amount: number): Team {
  return {
    ...team,
    roster: team.roster.map((player) => ({ ...player, morale: clamp(player.morale + amount, 0, 100) }))
  };
}

function applyContractPressure(team: Team, count: number): Team {
  const targets = new Set(
    [...team.roster]
      .sort((a, b) => b.overall - a.overall)
      .slice(0, Math.max(1, Math.round(count)))
      .map((player) => player.id)
  );
  return {
    ...team,
    roster: team.roster.map((player) =>
      targets.has(player.id)
        ? {
            ...player,
            contract: { ...player.contract, yearsRemaining: 1 },
            contractSummary: `$${(player.contract.capHit / 1_000_000).toFixed(1)}M | 1 yr | ${player.contract.expiryStatus}`
          }
        : player
    )
  };
}

function updateOwnerTrust(franchise: FranchiseState, teamId: string, amount: number): FranchiseState {
  const next = updateTeamDynamics(franchise, teamId, { ownerTrust: amount });
  if (teamId !== franchise.selectedTeamId) return next;
  return {
    ...next,
    ownerState: {
      ...next.ownerState,
      jobSecurity: clamp(next.ownerState.jobSecurity + amount, 0, 100)
    }
  };
}

function updateTeamDynamics(franchise: FranchiseState, teamId: string, delta: Partial<Record<"fanSentiment" | "ownerTrust", number>>): FranchiseState {
  const dynamics = franchise.teamDynamics[teamId];
  if (!dynamics) return franchise;
  return {
    ...franchise,
    teamDynamics: {
      ...franchise.teamDynamics,
      [teamId]: {
        ...dynamics,
        fanSentiment: clamp(dynamics.fanSentiment + (delta.fanSentiment ?? 0), 0, 100),
        ownerTrust: clamp(dynamics.ownerTrust + (delta.ownerTrust ?? 0), 0, 100)
      }
    },
    mediaState: delta.fanSentiment && teamId === franchise.selectedTeamId ? { ...franchise.mediaState, pressure: clamp(franchise.mediaState.pressure - delta.fanSentiment, 0, 100) } : franchise.mediaState
  };
}

function addScenarioTransaction(franchise: FranchiseState, teamId: string, type: "draft" | "prospect" | "roster", label: string): FranchiseState {
  return {
    ...franchise,
    transactionLog: [
      {
        id: `scenario-${type}-${franchise.sourceScenarioId ?? "scenario"}-${franchise.transactionLog.length + 1}`,
        date: franchise.league.currentDate,
        type,
        headline: label,
        details: "Scenario setup added this local fictional pressure note.",
        teamIds: [teamId]
      },
      ...franchise.transactionLog
    ].slice(0, 40)
  };
}

function addScenarioStory(franchise: FranchiseState, scenario: ScenarioDefinition, teamId: string, label: string): FranchiseState {
  const arc: StoryArc = {
    id: `scenario-arc-${scenario.id}-${teamId}`,
    type:
      scenario.scenarioType === "capCrunch"
        ? "contractStandoff"
        : scenario.scenarioType === "injuryCrisis"
          ? "goalieControversy"
          : scenario.scenarioType === "rebuild"
            ? "rebuildTension"
            : scenario.scenarioType === "playoffPush"
              ? "playoffPressure"
              : "ownerPressure",
    status: "active",
    teamId,
    playerIds: topPlayers(franchise, teamId).slice(0, 2).map((player) => player.id),
    startedDate: franchise.league.currentDate,
    lastUpdatedDate: franchise.league.currentDate,
    intensity: scenario.scenarioType === "chaos" ? 74 : 58,
    progress: 10,
    headline: label,
    summary: scenario.description,
    recentEventIds: [],
    tags: ["scenario", scenario.scenarioType]
  };
  return { ...franchise, storyArcs: mergeScenarioArcs(franchise.storyArcs, [arc]) };
}

function createScenarioDecisionEvent(franchise: FranchiseState, scenario: ScenarioDefinition, teamId: string): DecisionEvent {
  const sourceLabel =
    scenario.scenarioType === "capCrunch"
      ? "Cap Desk"
      : scenario.scenarioType === "injuryCrisis"
        ? "Medical Room"
        : scenario.scenarioType === "rebuild"
          ? "Owner Suite"
          : "GM Computer";
  return {
    id: `scenario-event-${scenario.id}-${teamId}`,
    type: scenario.scenarioType === "injuryCrisis" ? "injuryConcern" : scenario.scenarioType === "capCrunch" ? "contractStandoff" : "ownerMeeting",
    status: "active",
    severity: scenario.scenarioType === "chaos" || scenario.scenarioType === "injuryCrisis" ? "high" : "medium",
    createdDate: franchise.league.currentDate,
    phase: franchise.seasonPhase,
    teamId,
    playerIds: topPlayers(franchise, teamId).slice(0, 1).map((player) => player.id),
    headline: scenario.name,
    body: scenario.description,
    sourceLabel,
    locationRoom: scenario.scenarioType === "injuryCrisis" ? "medical" : scenario.scenarioType === "capCrunch" ? "contracts" : "gm",
    options: [
      {
        id: "transparent-plan",
        label: "Set a transparent plan",
        tone: "transparent",
        description: "Tell the room exactly how the staff will handle it.",
        preview: "Owner trust steadies; media pressure settles."
      },
      {
        id: "patient-room",
        label: "Keep the room patient",
        tone: "patient",
        description: "Lower the temperature and buy time.",
        preview: "Morale steadies with a smaller public gain."
      }
    ],
    tags: ["scenario", scenario.scenarioType],
    repeatKey: `scenario-${scenario.id}`
  };
}

function updateTeam(franchise: FranchiseState, teamId: string, update: (team: Team) => Team): FranchiseState {
  return {
    ...franchise,
    league: {
      ...franchise.league,
      teams: franchise.league.teams.map((team) => (team.id === teamId ? update(team) : team))
    }
  };
}

function mergeScenarioEvents(existing: DecisionEvent[], incoming: DecisionEvent[]): DecisionEvent[] {
  const seen = new Set(existing.map((event) => event.id));
  return [...incoming.filter((event) => !seen.has(event.id)), ...existing].slice(0, 80);
}

function mergeScenarioArcs(existing: StoryArc[], incoming: StoryArc[]): StoryArc[] {
  const seen = new Set(existing.map((arc) => arc.id));
  return [...incoming.filter((arc) => !seen.has(arc.id)), ...existing].slice(0, 24);
}

function hasTeam(franchise: FranchiseState, teamId: string): boolean {
  return franchise.league.teams.some((team) => team.id === teamId);
}

function topPlayers(franchise: FranchiseState, teamId: string): Player[] {
  return [...(franchise.league.teams.find((team) => team.id === teamId)?.roster ?? [])].sort((a, b) => b.overall - a.overall);
}
