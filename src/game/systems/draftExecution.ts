import { SeededRng } from "../rng";
import { normalizeLeagueRuleSet } from "./leagueRules";
import { sortStandings } from "./standings";
import { convertProspectToRights } from "./prospects";
import type {
  DraftPick,
  DraftPickContext,
  DraftSelection,
  DraftState,
  FranchiseState,
  NewsItem,
  Prospect,
  ScoutingState,
  Team
} from "../types";

export function createDraftOrder(franchise: FranchiseState): DraftState {
  const ruleSet = normalizeLeagueRuleSet(franchise.league.ruleSet);
  const contexts = buildPickContexts(franchise, baseOriginalTeamOrder(franchise));
  const state = toDraftState(franchise.league.seasonYear, contexts, [], ruleSet);
  return { ...state, userPickPending: state.draftOrder[0] === franchise.selectedTeamId };
}

export function resolveDraftLottery(franchise: FranchiseState, rng = new SeededRng(`${franchise.franchiseId}-lottery-${franchise.league.seasonYear}`)): DraftState {
  const ruleSet = normalizeLeagueRuleSet(franchise.league.ruleSet);
  const base = baseOriginalTeamOrder(franchise);
  const lotteryTeams = ruleSet.draftFormat.lotteryTeams;
  const lotteryOrder = shuffle(base.slice(0, lotteryTeams), rng);
  const contexts = buildPickContexts(franchise, [...lotteryOrder, ...base.slice(lotteryTeams)]);
  const state = toDraftState(franchise.league.seasonYear, contexts, franchise.offseasonState?.draftState?.selections ?? [], ruleSet);
  return { ...state, userPickPending: state.draftOrder[state.selections.length] === franchise.selectedTeamId };
}

export function getCurrentPick(draftState: DraftState, franchise?: FranchiseState): DraftPickContext | undefined {
  if (draftState.completed) return undefined;
  if (draftState.pickContexts?.length) return draftState.pickContexts[draftState.selections.length];
  if (franchise) return buildPickContexts(franchise, originalOrderFromDraftState(franchise, draftState))[draftState.selections.length];
  const teamId = draftState.draftOrder[draftState.selections.length];
  if (!teamId) return undefined;
  return {
    year: draftState.year,
    round: draftState.round,
    pickNumber: draftState.pickNumber,
    teamId,
    originalTeamId: teamId,
    ownerTeamId: teamId,
    pickId: `${draftState.year}-r${draftState.round}-${teamId}`
  };
}

export function makeUserDraftSelection(franchise: FranchiseState, prospectId: string): FranchiseState {
  const draftState = ensureDraftState(franchise);
  const pick = getCurrentPick(draftState, franchise);
  if (!pick || pick.ownerTeamId !== franchise.selectedTeamId) return franchise;
  return makeSelection(franchise, pick, prospectId);
}

export function makeAiDraftSelection(franchise: FranchiseState, teamId: string, rng = new SeededRng(`${franchise.franchiseId}-ai-draft`)): FranchiseState {
  const draftState = ensureDraftState(franchise);
  const pick = getCurrentPick(draftState, franchise);
  if (!pick || pick.ownerTeamId !== teamId) return franchise;
  const prospect = chooseAiProspect(franchise, teamId, rng);
  return prospect ? makeSelection(franchise, pick, prospect.id) : franchise;
}

export function autoDraftUntilUserPick(franchise: FranchiseState, rng = new SeededRng(`${franchise.franchiseId}-auto-draft`)): FranchiseState {
  let next = franchise;
  let safety = 0;
  while (safety < ensureDraftState(next).draftOrder.length + 5) {
    const state = ensureDraftState(next);
    const pick = getCurrentPick(state, next);
    if (!pick || state.completed || pick.ownerTeamId === next.selectedTeamId) break;
    next = makeAiDraftSelection(next, pick.ownerTeamId, new SeededRng(`${rng.next()}-${pick.pickNumber}`));
    safety += 1;
  }
  return next;
}

export function autoCompleteDraft(franchise: FranchiseState, rng = new SeededRng(`${franchise.franchiseId}-complete-draft`)): FranchiseState {
  let next = franchise;
  let safety = 0;
  while (safety < ensureDraftState(next).draftOrder.length + 5) {
    const state = ensureDraftState(next);
    const pick = getCurrentPick(state, next);
    if (!pick || state.completed) break;
    const prospect = chooseAiProspect(next, pick.ownerTeamId, new SeededRng(`${rng.next()}-${pick.pickNumber}`));
    if (!prospect) break;
    next = makeSelection(next, pick, prospect.id);
    safety += 1;
  }
  return next;
}

export function addProspectRightsToTeam(franchise: FranchiseState, selection: DraftSelection): FranchiseState {
  const prospect = franchise.scouting.draftClass.find((candidate) => candidate.id === selection.prospectId);
  if (!prospect) return franchise;
  const rights = convertProspectToRights(selection, prospect);
  return {
    ...franchise,
    prospectPools: {
      ...franchise.prospectPools,
      [selection.teamId]: [...(franchise.prospectPools[selection.teamId] ?? []), rights]
    }
  };
}

export function createDraftSelectionGrade(selection: DraftSelection, scoutingState: ScoutingState): string {
  const prospect = scoutingState.draftClass.find((candidate) => candidate.id === selection.prospectId);
  const certainty = prospect?.scouting.certainty ?? 40;
  const value = selection.actualPotential + selection.actualOverall * 0.45 - selection.pickNumber * 0.18 + certainty * 0.08;
  if (value >= 122) return "A";
  if (value >= 112) return "B+";
  if (value >= 103) return "B";
  if (value >= 94) return "C+";
  if (value >= 86) return "C";
  return "D";
}

export function createDraftNews(selection: DraftSelection, franchise: FranchiseState): NewsItem[] {
  const team = franchise.league.teams.find((candidate) => candidate.id === selection.teamId);
  return [
    {
      id: `draft-news-${selection.id}`,
      type: "draft",
      date: franchise.league.currentDate,
      headline: `Draft Room: ${team?.nickname ?? "Club"} select ${selection.prospectName}`,
      body: `Round ${selection.round}, Pick ${selection.pickNumber}: ${selection.position}, ${selection.visibleGrade} grade after the card goes in.`,
      severity: selection.round === 1 ? "medium" : "low",
      teamId: selection.teamId
    }
  ];
}

export function createDraftRecap(franchise: FranchiseState): NewsItem[] {
  const state = franchise.offseasonState?.draftState;
  if (!state?.completed) return [];
  const userPicks = state.selections.filter((selection) => selection.teamId === franchise.selectedTeamId);
  return [
    {
      id: `draft-recap-${state.year}-${franchise.selectedTeamId}`,
      type: "draft",
      date: franchise.league.currentDate,
      headline: "Draft Room: Class archived",
      body: `${state.selections.length} picks were made. Your table added ${userPicks.length} prospect right${userPicks.length === 1 ? "" : "s"} to the pipeline.`,
      severity: "medium",
      teamId: franchise.selectedTeamId
    }
  ];
}

function makeSelection(franchise: FranchiseState, pick: DraftPickContext, prospectId: string): FranchiseState {
  const state = ensureDraftState(franchise);
  if (state.selections.some((selection) => selection.prospectId === prospectId)) return franchise;
  const prospect = franchise.scouting.draftClass.find((candidate) => candidate.id === prospectId);
  if (!prospect) return franchise;
  const selectionBase: DraftSelection = {
    id: `draft-${state.year}-${pick.pickNumber}-${prospect.id}`,
    year: state.year,
    round: pick.round,
    pickNumber: pick.pickNumber,
    teamId: pick.ownerTeamId,
    prospectId: prospect.id,
    prospectName: prospect.displayName,
    position: prospect.position,
    actualOverall: prospect.actualOverall,
    actualPotential: prospect.actualPotential,
    visibleGrade: "C",
    signed: false
  };
  const selection = {
    ...selectionBase,
    visibleGrade: createDraftSelectionGrade(selectionBase, franchise.scouting)
  };
  const selections = [...state.selections, selection];
  const completed = selections.length >= state.draftOrder.length;
  const nextIndex = selections.length;
  const draftRounds = state.draftRounds ?? normalizeLeagueRuleSet(franchise.league.ruleSet).draftRounds;
  const nextRound = Math.min(draftRounds, Math.floor(nextIndex / franchise.league.teams.length) + 1);
  const nextState: DraftState = {
    ...state,
    selections,
    round: completed ? draftRounds : nextRound,
    pickNumber: Math.min(state.draftOrder.length, nextIndex + 1),
    userPickPending: !completed && state.draftOrder[nextIndex] === franchise.selectedTeamId,
    completed
  };
  const withRights = addProspectRightsToTeam(
    {
      ...franchise,
      offseasonState: {
        ...(franchise.offseasonState ?? defaultOffseason(franchise)),
        draftState: nextState
      },
      history: {
        ...franchise.history,
        draftHistory: [...franchise.history.draftHistory, selection]
      },
      inbox: [...createDraftNews(selection, franchise), ...franchise.inbox].slice(0, 60),
      transactionLog: [
        {
          id: `draft-transaction-${selection.id}`,
          date: franchise.league.currentDate,
          type: "draft" as const,
          headline: `${selection.prospectName} drafted`,
          details: `Round ${selection.round}, Pick ${selection.pickNumber} by ${teamLabel(franchise, selection.teamId)}.`,
          teamIds: [selection.teamId]
        },
        ...franchise.transactionLog
      ].slice(0, 50),
      updatedAt: new Date().toISOString()
    },
    selection
  );
  if (!completed) return withRights;
  return {
    ...withRights,
    inbox: [...createDraftRecap(withRights), ...withRights.inbox].slice(0, 60),
    seasonPhase: "reSigning"
  };
}

function ensureDraftState(franchise: FranchiseState): DraftState {
  return franchise.offseasonState?.draftState ?? createDraftOrder(franchise);
}

function toDraftState(year: number, contexts: DraftPickContext[], selections: DraftSelection[], ruleSet = normalizeLeagueRuleSet()): DraftState {
  const completed = selections.length >= contexts.length;
  const next = contexts[selections.length];
  return {
    year,
    round: next?.round ?? ruleSet.draftRounds,
    pickNumber: next?.pickNumber ?? contexts.length,
    draftOrder: contexts.map((context) => context.ownerTeamId),
    pickContexts: contexts,
    selections,
    userPickPending: false,
    completed,
    draftRounds: ruleSet.draftRounds,
    draftClassSize: ruleSet.draftClassSize,
    leagueRuleSetId: ruleSet.id
  };
}

function buildPickContexts(franchise: FranchiseState, originalTeamOrder: string[]): DraftPickContext[] {
  const ruleSet = normalizeLeagueRuleSet(franchise.league.ruleSet);
  const allPicks = franchise.league.teams.flatMap((team) => team.draftPicks.filter((pick) => pick.seasonYear === franchise.league.seasonYear));
  const contexts: DraftPickContext[] = [];
  for (let round = 1; round <= ruleSet.draftRounds; round += 1) {
    originalTeamOrder.forEach((originalTeamId) => {
      const pick = allPicks.find((candidate) => candidate.round === round && candidate.originalTeamId === originalTeamId);
      if (pick) contexts.push(contextForPick(pick, contexts.length + 1));
    });
  }
  return contexts;
}

function contextForPick(pick: DraftPick, pickNumber: number): DraftPickContext {
  return {
    year: pick.seasonYear,
    round: pick.round,
    pickNumber,
    teamId: pick.ownerTeamId,
    ownerTeamId: pick.ownerTeamId,
    originalTeamId: pick.originalTeamId,
    pickId: pick.id
  };
}

function baseOriginalTeamOrder(franchise: FranchiseState): string[] {
  const standings = sortStandings(franchise.league.teams);
  const ruleSet = normalizeLeagueRuleSet(franchise.league.ruleSet);
  const playoffIds = new Set(franchise.playoffState?.qualifiedTeamIds ?? standings.slice(0, ruleSet.playoffTeamCount).map((team) => team.id));
  const nonPlayoff = franchise.league.teams
    .filter((team) => !playoffIds.has(team.id))
    .sort(worstFirst)
    .map((team) => team.id);
  const playoff = franchise.league.teams
    .filter((team) => playoffIds.has(team.id))
    .sort(playoffPickSort(franchise))
    .map((team) => team.id);
  return [...nonPlayoff, ...playoff];
}

export function validateDraftState(draftState: DraftState, franchise: FranchiseState): string[] {
  const messages: string[] = [];
  const ruleSet = normalizeLeagueRuleSet(franchise.league.ruleSet);
  const expectedPicks = franchise.league.teams.length * ruleSet.draftRounds;
  if (draftState.draftOrder.length !== expectedPicks) messages.push(`Draft order has ${draftState.draftOrder.length} picks; expected ${expectedPicks}.`);
  if ((draftState.draftRounds ?? ruleSet.draftRounds) !== ruleSet.draftRounds) messages.push("Draft state rounds do not match league rules.");
  if ((draftState.draftClassSize ?? ruleSet.draftClassSize) < expectedPicks) messages.push("Draft class size is smaller than the draft order.");
  const selectedProspects = new Set<string>();
  draftState.selections.forEach((selection) => {
    if (selectedProspects.has(selection.prospectId)) messages.push(`Duplicate drafted prospect: ${selection.prospectName}.`);
    selectedProspects.add(selection.prospectId);
  });
  return messages;
}

function originalOrderFromDraftState(franchise: FranchiseState, _state: DraftState): string[] {
  return baseOriginalTeamOrder(franchise);
}

function worstFirst(a: Team, b: Team): number {
  if (a.record.points !== b.record.points) return a.record.points - b.record.points;
  if (a.record.wins !== b.record.wins) return a.record.wins - b.record.wins;
  const aDiff = a.record.goalsFor - a.record.goalsAgainst;
  const bDiff = b.record.goalsFor - b.record.goalsAgainst;
  return aDiff - bDiff;
}

function playoffPickSort(franchise: FranchiseState): (a: Team, b: Team) => number {
  return (a, b) => playoffFinishScore(franchise, a.id) - playoffFinishScore(franchise, b.id) || worstFirst(a, b);
}

function playoffFinishScore(franchise: FranchiseState, teamId: string): number {
  if (franchise.playoffState?.championTeamId === teamId) return 99;
  const highestRound = Math.max(0, ...(franchise.playoffState?.bracket.filter((series) => [series.homeSeedTeamId, series.awaySeedTeamId].includes(teamId)).map((series) => series.round) ?? []));
  return 50 + highestRound * 10;
}

function chooseAiProspect(franchise: FranchiseState, teamId: string, rng: SeededRng): Prospect | undefined {
  const selected = new Set(ensureDraftState(franchise).selections.map((selection) => selection.prospectId));
  const team = franchise.league.teams.find((candidate) => candidate.id === teamId);
  const pool = franchise.scouting.draftClass.filter((prospect) => !selected.has(prospect.id));
  if (!pool.length) return undefined;
  const positionNeed = new Set(team?.teamNeeds.slice(0, 2).map((need) => need.position) ?? []);
  return [...pool].sort((a, b) => scoreProspect(b, positionNeed, rng) - scoreProspect(a, positionNeed, rng))[0];
}

function scoreProspect(prospect: Prospect, positionNeed: Set<string>, rng: SeededRng): number {
  const visiblePotential = (prospect.scouting.estimatedPotentialLow + prospect.scouting.estimatedPotentialHigh) / 2;
  const visibleOverall = (prospect.scouting.estimatedOverallLow + prospect.scouting.estimatedOverallHigh) / 2;
  const need = positionNeed.has(prospect.position) ? 8 : 0;
  const risk = prospect.risk === "Low" ? 4 : prospect.risk === "Boom/Bust" ? -2 : 0;
  return visiblePotential * 1.2 + visibleOverall * 0.5 + need + risk - prospect.publicRank * 0.22 + rng.float(-2, 2);
}

function shuffle<T>(items: T[], rng: SeededRng): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function defaultOffseason(franchise: FranchiseState) {
  return {
    year: franchise.league.seasonYear,
    retiredPlayerIds: [],
    retiredPlayerNames: [],
    reSigningCompleted: false,
    trainingCampCompleted: false,
    phaseLog: []
  };
}

function teamLabel(franchise: FranchiseState, teamId: string): string {
  return franchise.league.teams.find((team) => team.id === teamId)?.fullName ?? teamId;
}
