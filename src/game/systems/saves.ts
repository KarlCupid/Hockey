import localforage from "localforage";
import { z } from "zod";
import { ACTIVE_ROSTER_LIMIT, ACTIVE_ROSTER_MINIMUM, AUTOSAVE_SLOT_ID, SALARY_CAP_CEILING, SALARY_CAP_FLOOR, SAVE_SLOT_COUNT, SCHEMA_VERSION } from "../constants";
import { generateDraftClass } from "../generators/generateDraftClass";
import { SeededRng } from "../rng";
import type {
  AgentProfile,
  AssistantGmReport,
  DifficultyTuning,
  DecisionEvent,
  FranchiseState,
  GMAvatarStyle,
  GMBackground,
  GMProfile,
  GameDifficulty,
  GameMode,
  LeagueHistory,
  MediaState,
  OwnerState,
  Player,
  PlayerDevelopmentPath,
  PlayerRelationship,
  PlayoffState,
  ProspectRights,
  RosterStatus,
  SaveSlotMetadata,
  ScoutingState,
  StaffState,
  StoryArc,
  StoryFrequency,
  Team,
  TeamDynamics
} from "../types";
import { generateAffiliateForTeam } from "./affiliate";
import { repairAllTeamRosters } from "./aiRosterManagement";
import { normalizeAchievements } from "./achievements";
import { contractSummary, createContractForPlayer } from "./contracts";
import { validateDynastyInvariants } from "./dynastyInvariants";
import { generateInitialDraftPicks } from "./draftPicks";
import { normalizeLeagueRuleSet } from "./leagueRules";
import { createDefaultOwnerState } from "./owner";
import { createPlayoffState } from "./playoffs";
import { validateSchedule } from "../generators/generateSchedule";
import { generateScoutingAssignments, rankDraftBoard } from "./scouting";
import { generateStaffForLeague } from "./staff";
import { recordString } from "./standings";
import { generateTradeBlock, generateUntouchables, inferTeamNeeds } from "./trades";
import { autoSetInitialRosterStatuses } from "./rosterManagement";
import { defaultMediaState } from "./fanMedia";
import { generateAssistantGmReport } from "./assistantGm";
import { createDifficultyTuning } from "./difficulty";
import { createGmProfile } from "./gmProfile";
import { capTelemetry } from "./localTelemetry";
import { normalizeMilestones } from "./milestones";
import { normalizeTutorialState } from "./tutorial";
import { getVersionSummary } from "./version";
import { NARRATIVE_TEMPLATE_VERSION } from "../content/narrativeTemplates";
import {
  generateAgentsForPlayers,
  generateInitialPlayerRelationships,
  generateInitialTeamDynamics,
  normalizeRelationship,
  normalizeTeamDynamics
} from "./relationships";

const saveSchema = z.object({
  schemaVersion: z.number(),
  franchiseId: z.string(),
  selectedTeamId: z.string(),
  league: z.object({
    seasonYear: z.number(),
    currentDayIndex: z.number(),
    currentDate: z.string(),
    teams: z.array(z.unknown()),
    schedule: z.array(z.unknown())
  }),
  inbox: z.array(z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string()
});

localforage.config({
  name: "FranchiseIce",
  storeName: "saves"
});

export interface SaveIntegrityReport {
  schemaVersion: number;
  warnings: string[];
  errors: string[];
  repairedFields: string[];
  lastValidatedAt: string;
}

export interface SaveSnapshotMetadata {
  slotId: string;
  snapshotId: string;
  createdAt: string;
  reason: string;
  teamName: string;
  season: number;
  phase: FranchiseState["seasonPhase"];
  schemaVersion: number;
  integrityStatus: "valid" | "warnings" | "errors";
}

interface SaveSnapshotRecord {
  metadata: SaveSnapshotMetadata;
  payload: string;
}

export function saveKey(slotId: string): string {
  return `franchise-ice:${slotId}`;
}

export function saveSnapshotKey(snapshotId: string): string {
  return `franchise-ice:snapshot:${snapshotId}`;
}

export function serializeFranchise(franchise: FranchiseState): string {
  return JSON.stringify({
    ...franchise,
    saveStatus: "idle"
  });
}

export function deserializeFranchise(payload: string): FranchiseState {
  const result = safeDeserializeFranchise(payload);
  if (result.error || !result.franchise) {
    throw new Error(result.error ?? "Save data could not be loaded.");
  }
  return result.franchise;
}

export function hydrateFranchiseState(input: FranchiseState): FranchiseState {
  const seasonYear = input.league.seasonYear;
  const teamsNeedingStatusRepair = new Set(
    input.league.teams.filter((team) => team.roster.some((player) => !validRosterStatus(player.rosterStatus))).map((team) => team.id)
  );
  const teamsWithContracts = input.league.teams.map((team) => hydrateTeamPlayers(team, input.franchiseId));
  const hydratedRuleSet = normalizeLeagueRuleSet(input.league.ruleSet ?? {
    teamCount: teamsWithContracts.length,
    gamesPerTeam: gamesPerTeamFromSchedule(input),
    playoffTeamCount: input.playoffState?.qualifiedTeamIds?.length,
    draftRounds: input.offseasonState?.draftState?.draftRounds
  });
  const generatedPicks = generateInitialDraftPicks(teamsWithContracts, seasonYear, hydratedRuleSet.draftRounds);
  const teamsWithAssets = teamsWithContracts.map((team) => {
    const existing = Array.isArray(team.draftPicks) ? team.draftPicks : [];
    const draftPicks = existing.length ? existing : generatedPicks.filter((pick) => pick.ownerTeamId === team.id);
    const withCap = {
      ...team,
      capCeiling: team.capCeiling ?? SALARY_CAP_CEILING,
      capFloor: team.capFloor ?? SALARY_CAP_FLOOR,
      affiliate: team.affiliate ?? generateAffiliateForTeam(team),
      rosterMoveLog: team.rosterMoveLog ?? [],
      activeRosterLimit: team.activeRosterLimit ?? ACTIVE_ROSTER_LIMIT,
      activeRosterMinimum: team.activeRosterMinimum ?? ACTIVE_ROSTER_MINIMUM,
      draftPicks,
      teamNeeds: Array.isArray(team.teamNeeds) && team.teamNeeds.length ? team.teamNeeds : inferTeamNeeds({ ...team, draftPicks }),
      untouchables: Array.isArray(team.untouchables) ? team.untouchables : [],
      tradeBlock: Array.isArray(team.tradeBlock) ? team.tradeBlock : []
    };
    const untouchables = withCap.untouchables.length ? withCap.untouchables : generateUntouchables(withCap);
    const hydratedTeam = {
      ...withCap,
      untouchables,
      tradeBlock: withCap.tradeBlock.length ? withCap.tradeBlock : generateTradeBlock({ ...withCap, untouchables }),
      teamNeeds: inferTeamNeeds(withCap)
    };
    return teamsNeedingStatusRepair.has(team.id) ? autoSetInitialRosterStatuses(hydratedTeam) : hydratedTeam;
  });
  const scouting = hydrateScouting(input);
  const phase = hydrateSeasonPhase(input);
  const staffState = hydrateStaffState(input, teamsWithAssets);
  const prospectPools = hydrateProspectPools(input, teamsWithAssets);
  const history = hydrateHistory(input);
  const gmProfile = hydrateGmProfile(input);
  const difficultyTuning = hydrateDifficultyTuning(input, gmProfile);
  const ownerBase: FranchiseState = {
    ...input,
    schemaVersion: SCHEMA_VERSION,
    league: {
      ...input.league,
      teams: teamsWithAssets,
      ruleSet: hydratedRuleSet,
      scheduleReport: validateSchedule(input.league.schedule ?? [], teamsWithAssets, hydratedRuleSet),
      recentResults: input.league.recentResults ?? [],
      completed: input.league.completed ?? input.league.schedule.every((game) => game.played)
    },
    seasonPhase: phase,
    currentSeasonId: input.currentSeasonId ?? `${input.league.seasonYear}-${input.selectedTeamId}`,
    gmProfile,
    difficultyTuning,
    assistantGmReports: hydrateAssistantGmReports(input),
    narrativeTemplateVersion: input.narrativeTemplateVersion ?? NARRATIVE_TEMPLATE_VERSION,
    tutorialState: normalizeTutorialState(input.tutorialState),
    achievements: normalizeAchievements(input.achievements),
    milestones: normalizeMilestones(input.milestones),
    localTelemetry: capTelemetry(input.localTelemetry ?? []),
    sourceDataPackId: input.sourceDataPackId,
    sourceScenarioId: input.sourceScenarioId,
    customLeagueName: input.customLeagueName,
    dataPackMetadata: hydrateDataPackMetadata(input),
    staffState,
    history,
    ownerState: input.ownerState ?? emptyOwnerState(input),
    prospectPools,
    decisionEvents: input.decisionEvents ?? [],
    storyArcs: input.storyArcs ?? [],
    playerRelationships: input.playerRelationships ?? {},
    agents: input.agents ?? [],
    teamDynamics: input.teamDynamics ?? {},
    mediaState: input.mediaState ?? {
      pressure: 45,
      narrative: "quiet",
      recentQuestions: [],
      columnistTone: "neutral"
    },
    scouting,
    development: input.development ?? { plans: [], recentUpdates: [] },
    tradeHistory: input.tradeHistory ?? [],
    rosterMoveHistory: input.rosterMoveHistory ?? [],
    transactionLog: input.transactionLog ?? [],
    saveStatus: "idle"
  };
  const ownerState = hydrateOwnerState(ownerBase);
  const livingBase = hydrateLivingOpsState({
    ...ownerBase,
    ownerState,
    playoffState: hydratePlayoffState(input.playoffState, ownerBase.league, phase),
    offseasonState: input.offseasonState,
    freeAgencyState: input.freeAgencyState,
    scouting,
    rosterMoveHistory: input.rosterMoveHistory ?? [],
    saveStatus: "idle"
  });
  const repaired = repairAllTeamRosters(livingBase, "playtestRepair");
  const living = hydrateLivingOpsState(repaired);
  return {
    ...living,
    assistantGmReports: living.assistantGmReports.length
      ? living.assistantGmReports
      : [generateAssistantGmReport(living, { type: "daily", date: living.league.currentDate })]
  };
}

export function validateSaveIntegrity(franchise: FranchiseState): SaveIntegrityReport {
  const report = validateDynastyInvariants(franchise);
  const duplicateWarnings = report.errors
    .filter((item) => item.code.includes("duplicate"))
    .map((item) => item.message);
  return {
    schemaVersion: franchise.schemaVersion,
    warnings: [...report.warnings.map((item) => item.message), ...duplicateWarnings, ...getPhase7IntegrityWarnings(franchise), ...getPhase8IntegrityWarnings(franchise)],
    errors: report.errors.map((item) => item.message),
    repairedFields: collectMissingFieldRepairs(franchise),
    lastValidatedAt: new Date().toISOString()
  };
}

export function repairFranchiseState(franchise: FranchiseState): FranchiseState {
  const hydrated = hydrateFranchiseState(franchise);
  const repairedLiving = hydrateLivingOpsState(hydrated);
  return {
    ...hydrated,
    league: {
      ...hydrated.league,
      teams: hydrated.league.teams.map((team) => ({
        ...team,
        roster: team.roster.map((player) => ({
          ...player,
          teamId: team.id,
          contractSummary: contractSummary(player.contract)
        })),
        draftPicks: team.draftPicks.map((pick) => ({ ...pick, ownerTeamId: team.id }))
      }))
    },
    prospectPools: Object.fromEntries(hydrated.league.teams.map((team) => [team.id, hydrated.prospectPools[team.id] ?? []])),
    decisionEvents: repairedLiving.decisionEvents,
    storyArcs: repairedLiving.storyArcs,
    playerRelationships: repairedLiving.playerRelationships,
    agents: repairedLiving.agents,
    teamDynamics: repairedLiving.teamDynamics,
    mediaState: repairedLiving.mediaState,
    gmProfile: repairedLiving.gmProfile,
    difficultyTuning: repairedLiving.difficultyTuning,
    assistantGmReports: repairedLiving.assistantGmReports,
    narrativeTemplateVersion: repairedLiving.narrativeTemplateVersion,
    saveStatus: "idle"
  };
}

export function safeDeserializeFranchise(raw: string): { franchise?: FranchiseState; error?: string; warnings: string[] } {
  let parsed: FranchiseState;
  try {
    parsed = JSON.parse(raw) as FranchiseState;
  } catch {
    return { error: "Save JSON is corrupt or incomplete.", warnings: [] };
  }
  const result = saveSchema.safeParse(parsed);
  if (!result.success) {
    return { error: "Save data is missing required franchise fields.", warnings: result.error.issues.map((item) => item.message) };
  }
  if (parsed.schemaVersion > SCHEMA_VERSION) {
    return { error: `Unsupported save schema version ${parsed.schemaVersion}.`, warnings: [] };
  }
  const repairedFields = collectMissingFieldRepairs(parsed);
  const repaired = repairFranchiseState(parsed);
  const integrity = validateSaveIntegrity(repaired);
  return {
    franchise: repaired,
    warnings: [
      ...integrity.warnings,
      ...repairedFields.map((field) => `Repaired missing field: ${field}`),
      ...integrity.errors.map((error) => `Invariant issue: ${error}`)
    ]
  };
}

export function exportSaveToJson(franchise: FranchiseState): string {
  return JSON.stringify({ ...franchise, saveStatus: "idle" }, null, 2);
}

export function importSaveFromJson(raw: string): FranchiseState {
  const result = safeDeserializeFranchise(raw);
  if (result.error || !result.franchise) {
    throw new Error(result.error ?? "Save import failed.");
  }
  validateSaveIntegrity(result.franchise);
  return result.franchise;
}

export async function writeSave(slotId: string, franchise: FranchiseState): Promise<SaveSlotMetadata> {
  const updated: FranchiseState = { ...franchise, updatedAt: new Date().toISOString(), saveStatus: "idle" };
  const payload = serializeFranchise(updated);
  await localforage.setItem(saveKey(slotId), payload);
  return metadataFor(slotId, updated);
}

export function validateBeforeWrite(franchise: FranchiseState): SaveIntegrityReport {
  return validateSaveIntegrity(franchise);
}

export async function writeSaveWithBackup(slotId: string, franchise: FranchiseState, reason = "manual save"): Promise<SaveSlotMetadata> {
  const existingPayload = await localforage.getItem<string>(saveKey(slotId));
  if (existingPayload) {
    const existing = safeDeserializeFranchise(existingPayload);
    if (existing.franchise) {
      await createSaveSnapshot(existing.franchise, `Before ${reason}`, slotId);
    }
  }
  const integrity = validateBeforeWrite(franchise);
  if (integrity.errors.length) {
    throw new Error(`Save blocked by integrity errors: ${integrity.errors.slice(0, 2).join("; ")}`);
  }
  const metadata = await writeSave(slotId, franchise);
  await pruneOldSnapshots(slotId, slotId === AUTOSAVE_SLOT_ID ? 2 : 5);
  return metadata;
}

export async function readSave(slotId: string): Promise<FranchiseState | null> {
  const payload = await localforage.getItem<string>(saveKey(slotId));
  if (!payload) return null;
  return deserializeFranchise(payload);
}

export async function deleteSave(slotId: string): Promise<void> {
  await localforage.removeItem(saveKey(slotId));
}

export async function listSaveMetadata(): Promise<SaveSlotMetadata[]> {
  const ids = [AUTOSAVE_SLOT_ID, ...Array.from({ length: SAVE_SLOT_COUNT }, (_, index) => `slot-${index + 1}`)];
  const metadata: SaveSlotMetadata[] = [];
  for (const slotId of ids) {
    const save = await readSave(slotId).catch(() => null);
    if (save) metadata.push(metadataFor(slotId, save));
  }
  return metadata;
}

export async function createSaveSnapshot(franchise: FranchiseState, reason: string, slotId = "unslotted"): Promise<SaveSnapshotMetadata> {
  const createdAt = new Date().toISOString();
  const snapshotId = `${slotId}-${createdAt.replace(/[:.]/g, "-")}-${franchise.franchiseId.replace(/[^a-z0-9-]+/gi, "-")}`.slice(0, 180);
  const metadata = snapshotMetadataFor(slotId, snapshotId, franchise, reason, createdAt);
  const record: SaveSnapshotRecord = {
    metadata,
    payload: serializeFranchise({ ...franchise, saveStatus: "idle" })
  };
  await localforage.setItem(saveSnapshotKey(snapshotId), record);
  return metadata;
}

export async function listSaveSnapshots(slotId: string): Promise<SaveSnapshotMetadata[]> {
  const keys = await localforage.keys();
  const records = await Promise.all(
    keys
      .filter((key) => key.startsWith(`franchise-ice:snapshot:${slotId}-`))
      .map((key) => localforage.getItem<SaveSnapshotRecord>(key).catch(() => null))
  );
  return records
    .filter((record): record is SaveSnapshotRecord => Boolean(record?.metadata?.snapshotId))
    .map((record) => record.metadata)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function restoreSaveSnapshot(snapshotId: string): Promise<FranchiseState | null> {
  const record = await localforage.getItem<SaveSnapshotRecord>(saveSnapshotKey(snapshotId));
  if (!record?.payload) return null;
  return deserializeFranchise(record.payload);
}

export async function deleteSaveSnapshot(snapshotId: string): Promise<void> {
  await localforage.removeItem(saveSnapshotKey(snapshotId));
}

export async function pruneOldSnapshots(slotId: string, maxCount = 5): Promise<SaveSnapshotMetadata[]> {
  const snapshots = await listSaveSnapshots(slotId);
  const stale = snapshots.slice(Math.max(0, maxCount));
  await Promise.all(stale.map((snapshot) => deleteSaveSnapshot(snapshot.snapshotId)));
  return snapshots.slice(0, maxCount);
}

export async function recoverLastGoodSave(slotId: string): Promise<FranchiseState | null> {
  const snapshots = await listSaveSnapshots(slotId);
  for (const snapshot of snapshots) {
    const restored = await restoreSaveSnapshot(snapshot.snapshotId).catch(() => null);
    if (!restored) continue;
    const integrity = validateSaveIntegrity(restored);
    if (!integrity.errors.length) return restored;
  }
  return null;
}

export async function exportSaveSnapshotToJson(snapshotId: string): Promise<string | undefined> {
  const record = await localforage.getItem<SaveSnapshotRecord>(saveSnapshotKey(snapshotId));
  return record ? JSON.stringify(record, null, 2) : undefined;
}

export async function importSaveSnapshotJson(raw: string): Promise<SaveSnapshotMetadata> {
  const parsed = JSON.parse(raw) as SaveSnapshotRecord;
  if (!parsed?.metadata?.snapshotId || !parsed.payload) throw new Error("Snapshot JSON is missing metadata or payload.");
  const restored = deserializeFranchise(parsed.payload);
  const metadata = snapshotMetadataFor(parsed.metadata.slotId, parsed.metadata.snapshotId, restored, parsed.metadata.reason, parsed.metadata.createdAt);
  await localforage.setItem(saveSnapshotKey(metadata.snapshotId), { metadata, payload: serializeFranchise(restored) });
  return metadata;
}

export function metadataFor(slotId: string, franchise: FranchiseState): SaveSlotMetadata {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId) as Team;
  const gameNumber = franchise.league.schedule.filter(
    (game) => game.played && (game.homeTeamId === team.id || game.awayTeamId === team.id)
  ).length;
  const version = getVersionSummary();

  return {
    slotId,
    label: slotId === AUTOSAVE_SLOT_ID ? "Autosave" : `Slot ${slotId.replace("slot-", "")}`,
    teamName: team.fullName,
    currentDate: franchise.league.currentDate,
    gameNumber,
    record: recordString(team),
    lastSaved: franchise.updatedAt,
    seasonYear: franchise.league.seasonYear,
    schemaVersion: franchise.schemaVersion,
    appVersion: version.appVersion,
    releasePhase: version.buildPhase,
    seasonPhase: franchise.seasonPhase
  };
}

function snapshotMetadataFor(slotId: string, snapshotId: string, franchise: FranchiseState, reason: string, createdAt: string): SaveSnapshotMetadata {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId) as Team;
  const integrity = validateSaveIntegrity(franchise);
  return {
    slotId,
    snapshotId,
    createdAt,
    reason,
    teamName: team?.fullName ?? franchise.selectedTeamId,
    season: franchise.league.seasonYear,
    phase: franchise.seasonPhase,
    schemaVersion: franchise.schemaVersion,
    integrityStatus: integrity.errors.length ? "errors" : integrity.warnings.length ? "warnings" : "valid"
  };
}

function hydrateLivingOpsState(input: FranchiseState): FranchiseState {
  const playerIds = new Set(input.league.teams.flatMap((team) => team.roster.map((player) => player.id)));
  const teamIds = new Set(input.league.teams.map((team) => team.id));
  const staffIds = new Set(Object.values(input.staffState?.teamStaff ?? {}).flatMap((staff) => staff.map((member) => member.id)));
  const prospectIds = new Set([
    ...input.scouting.draftClass.map((prospect) => prospect.id),
    ...Object.values(input.prospectPools ?? {}).flatMap((pool) => pool.map((rights) => rights.prospectId))
  ]);
  const agents = hydrateAgents(input, playerIds);
  const withAgents = { ...input, agents };
  const generatedRelationships = generateInitialPlayerRelationships(withAgents);
  const playerRelationships: Record<string, PlayerRelationship> = {};
  playerIds.forEach((playerId) => {
    const existing = input.playerRelationships?.[playerId];
    playerRelationships[playerId] = normalizeRelationship({
      ...(generatedRelationships[playerId] ?? {
        playerId,
        trust: 55,
        roleSatisfaction: 55,
        communication: 55,
        pressureTolerance: 55,
        notes: []
      }),
      ...(existing ?? {}),
      playerId,
      agentId: agents.find((agent) => agent.clientPlayerIds.includes(playerId))?.id ?? existing?.agentId
    });
  });

  const dynamicsBase = generateInitialTeamDynamics({ ...withAgents, playerRelationships });
  const teamDynamics: Record<string, TeamDynamics> = {};
  teamIds.forEach((teamId) => {
    teamDynamics[teamId] = normalizeTeamDynamics({
      ...dynamicsBase[teamId],
      ...(input.teamDynamics?.[teamId] ?? {}),
      rivalryHeatByTeamId: {
        ...dynamicsBase[teamId].rivalryHeatByTeamId,
        ...(input.teamDynamics?.[teamId]?.rivalryHeatByTeamId ?? {})
      }
    });
  });
  const mediaState: MediaState = normalizeMediaState(input.mediaState ?? defaultMediaState({ ...withAgents, playerRelationships, teamDynamics }));

  return {
    ...input,
    agents,
    playerRelationships,
    teamDynamics,
    mediaState,
    decisionEvents: sanitizeDecisionEvents(input.decisionEvents ?? [], teamIds, playerIds, staffIds, prospectIds),
    storyArcs: sanitizeStoryArcs(input.storyArcs ?? [], teamIds, playerIds, staffIds)
  };
}

function hydrateAgents(input: FranchiseState, playerIds: Set<string>): AgentProfile[] {
  const generated = generateAgentsForPlayers(input, new SeededRng(`${input.franchiseId}-agents-repair`));
  const existing = Array.isArray(input.agents) && input.agents.length ? input.agents : generated;
  const agents = existing.map((agent, index) => ({
    ...agent,
    id: agent.id ?? `agent-${index + 1}`,
    displayName: agent.displayName ?? generated[index % generated.length]?.displayName ?? `Agent ${index + 1}`,
    personality: agent.personality ?? generated[index % generated.length]?.personality ?? "Collaborative",
    clientPlayerIds: (agent.clientPlayerIds ?? []).filter((playerId) => playerIds.has(playerId)),
    relationship: clampNumber(agent.relationship, 55),
    publicPressure: clampNumber(agent.publicPressure, 45),
    negotiationStyle: agent.negotiationStyle ?? generated[index % generated.length]?.negotiationStyle ?? "Prefers direct negotiation.",
    notes: (agent.notes ?? []).slice(0, 8)
  }));
  const assigned = new Set(agents.flatMap((agent) => agent.clientPlayerIds));
  Array.from(playerIds)
    .filter((playerId) => !assigned.has(playerId))
    .forEach((playerId, index) => {
      const agent = agents[index % Math.max(1, agents.length)] ?? generated[0];
      if (!agents.includes(agent)) agents.push(agent);
      agent.clientPlayerIds = [...agent.clientPlayerIds, playerId];
    });
  return agents.length ? agents : generated;
}

function sanitizeDecisionEvents(
  events: DecisionEvent[],
  teamIds: Set<string>,
  playerIds: Set<string>,
  staffIds: Set<string>,
  prospectIds: Set<string>
): DecisionEvent[] {
  const activeRepeatKeys = new Set<string>();
  return events
    .filter((event) => teamIds.has(event.teamId))
    .filter((event) => (event.playerIds ?? []).every((playerId) => playerIds.has(playerId)))
    .filter((event) => (event.staffIds ?? []).every((staffId) => staffIds.has(staffId)))
    .filter((event) => (event.prospectIds ?? []).every((prospectId) => prospectIds.has(prospectId)))
    .filter((event) => {
      if (event.status !== "active" || !event.repeatKey) return true;
      if (activeRepeatKeys.has(event.repeatKey)) return false;
      activeRepeatKeys.add(event.repeatKey);
      return true;
    })
    .slice(0, 80);
}

function sanitizeStoryArcs(events: StoryArc[], teamIds: Set<string>, playerIds: Set<string>, staffIds: Set<string>): StoryArc[] {
  return events
    .filter((arc) => teamIds.has(arc.teamId))
    .filter((arc) => arc.playerIds.every((playerId) => playerIds.has(playerId)))
    .filter((arc) => (arc.staffIds ?? []).every((staffId) => staffIds.has(staffId)))
    .map((arc) => ({
      ...arc,
      intensity: clampNumber(arc.intensity, 50),
      progress: clampNumber(arc.progress, 0),
      recentEventIds: (arc.recentEventIds ?? []).slice(0, 10),
      tags: (arc.tags ?? []).slice(0, 8)
    }))
    .slice(0, 24);
}

function normalizeMediaState(mediaState: MediaState): MediaState {
  return {
    pressure: clampNumber(mediaState.pressure, 45),
    narrative: ["quiet", "optimistic", "skeptical", "hotSeat", "playoffBuzz", "rebuildDebate"].includes(mediaState.narrative) ? mediaState.narrative : "quiet",
    recentQuestions: (mediaState.recentQuestions ?? []).slice(0, 8),
    columnistTone: ["friendly", "neutral", "critical", "provocative"].includes(mediaState.columnistTone) ? mediaState.columnistTone : "neutral"
  };
}

function clampNumber(value: number | undefined, fallback: number): number {
  return Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? Number(value) : fallback)));
}

function hydrateTeamPlayers(team: Team, franchiseId: string): Team {
  return {
    ...team,
    roster: team.roster.map((player) => hydratePlayerContract(player, franchiseId))
  };
}

function gamesPerTeamFromSchedule(input: FranchiseState): number {
  const firstTeamId = input.league.teams[0]?.id;
  if (!firstTeamId) return 22;
  return input.league.schedule.filter((game) => game.homeTeamId === firstTeamId || game.awayTeamId === firstTeamId).length || 22;
}

function hydratePlayerContract(player: Player, franchiseId: string): Player {
  const contract = player.contract ?? createContractForPlayer(player, new SeededRng(`${franchiseId}-${player.id}-contract`));
  return {
    ...player,
    contract,
    contractSummary: contractSummary(contract),
    rosterStatus: validRosterStatus(player.rosterStatus) ? player.rosterStatus : "active",
    acquiredVia: player.acquiredVia ?? "generated",
    waiverEligible: player.waiverEligible ?? false,
    affiliateSeasons: player.affiliateSeasons ?? 0,
    careerStage: player.careerStage ?? inferCareerStage(player),
    developmentPath: normalizeDevelopmentPath(player.developmentPath) ?? defaultDevelopmentPath(player)
  };
}

function hydrateScouting(input: FranchiseState): ScoutingState {
  const existing = input.scouting;
  const ruleSet = normalizeLeagueRuleSet(input.league.ruleSet);
  const draftClass = existing?.draftClass?.length ? existing.draftClass : generateDraftClass(`${input.franchiseId}-draft`, ruleSet.draftClassSize);
  return {
    draftClass,
    assignments: existing?.assignments?.length ? existing.assignments : generateScoutingAssignments(),
    watchlist: existing?.watchlist ?? [],
    teamDraftBoard: existing?.teamDraftBoard?.length ? existing.teamDraftBoard : rankDraftBoard(draftClass, "Best Player Available"),
    lastScoutingTickDayIndex: existing?.lastScoutingTickDayIndex ?? input.league.currentDayIndex
  };
}

function hydrateSeasonPhase(input: FranchiseState): FranchiseState["seasonPhase"] {
  if (input.seasonPhase) return input.seasonPhase;
  const completed = input.league.completed ?? input.league.schedule.every((game) => game.played);
  if (!completed) return "regularSeason";
  if (input.playoffState?.completed) return "seasonReview";
  return "playoffs";
}

function hydratePlayoffState(playoffState: PlayoffState | undefined, league: FranchiseState["league"], phase: FranchiseState["seasonPhase"]): PlayoffState | undefined {
  if (!playoffState) return phase === "playoffs" ? createPlayoffState(league) : undefined;
  const ruleSet = normalizeLeagueRuleSet(league.ruleSet);
  return {
    ...playoffState,
    format: playoffState.format ?? ruleSet.playoffFormat,
    seriesFormat: playoffState.seriesFormat ?? ruleSet.playoffSeriesFormat,
    playoffTeamCount: playoffState.playoffTeamCount ?? ruleSet.playoffTeamCount,
    byes: playoffState.byes,
    playInGames: playoffState.playInGames,
    recentPlayoffResults: playoffState.recentPlayoffResults ?? []
  };
}

function hydrateStaffState(input: FranchiseState, teams: Team[]): StaffState {
  if (input.staffState?.teamStaff && input.staffState.staffMarket) {
    const generated = generateStaffForLeague(teams, new SeededRng(`${input.franchiseId}-staff-repair`));
    return {
      teamStaff: Object.fromEntries(
        teams.map((team) => {
          const existing = input.staffState.teamStaff[team.id] ?? [];
          const missing = generated.teamStaff[team.id].filter((member) => !existing.some((candidate) => candidate.role === member.role));
          return [team.id, [...existing, ...missing]];
        })
      ),
      staffMarket: input.staffState.staffMarket.length ? input.staffState.staffMarket : generated.staffMarket,
      recentStaffMoves: input.staffState.recentStaffMoves ?? []
    };
  }
  return generateStaffForLeague(teams, new SeededRng(`${input.franchiseId}-staff-repair`));
}

function hydrateProspectPools(input: FranchiseState, teams: Team[]): Record<string, ProspectRights[]> {
  const existing = input.prospectPools ?? {};
  return Object.fromEntries(teams.map((team) => [team.id, existing[team.id] ?? []]));
}

function hydrateHistory(input: FranchiseState): LeagueHistory {
  return {
    seasons: input.history?.seasons ?? [],
    champions: input.history?.champions ?? [],
    awards: input.history?.awards ?? [],
    draftHistory: input.history?.draftHistory ?? [],
    transactionHistory: input.history?.transactionHistory ?? []
  };
}

function hydrateGmProfile(input: FranchiseState): GMProfile {
  const raw = (input as Partial<FranchiseState>).gmProfile as Partial<GMProfile> | undefined;
  const background = validGmBackground(raw?.background) ? raw.background : "Former Coach";
  return createGmProfile({
    displayName: raw?.displayName,
    background,
    avatarStyle: validGmAvatarStyle(raw?.avatarStyle) ? raw.avatarStyle : "classicSuit",
    difficulty: validGameDifficulty(raw?.difficulty) ? raw.difficulty : "standard",
    gameMode: validGameMode(raw?.gameMode) ? raw.gameMode : "standardDynasty",
    storyFrequency: validStoryFrequency(raw?.storyFrequency) ? raw.storyFrequency : "normal",
    createdAt: raw?.createdAt ?? input.createdAt
  });
}

function hydrateDifficultyTuning(input: FranchiseState, gmProfile: GMProfile): DifficultyTuning {
  const raw = (input as Partial<FranchiseState>).difficultyTuning as Partial<DifficultyTuning> | undefined;
  if (!raw || !validGameDifficulty(raw.difficulty)) {
    return createDifficultyTuning(gmProfile.difficulty, gmProfile.gameMode, gmProfile.storyFrequency);
  }
  return createDifficultyTuning(raw.difficulty, gmProfile.gameMode, gmProfile.storyFrequency);
}

function hydrateAssistantGmReports(input: FranchiseState): AssistantGmReport[] {
  const raw = (input as Partial<FranchiseState>).assistantGmReports;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((report): report is AssistantGmReport => Boolean(report && typeof report.id === "string" && Array.isArray(report.recommendations)))
    .map((report) => ({
      ...report,
      riskFlags: report.riskFlags ?? [],
      opportunityFlags: report.opportunityFlags ?? [],
      linkedRoomIds: report.linkedRoomIds ?? []
    }))
    .slice(0, 20);
}

function hydrateOwnerState(input: FranchiseState): OwnerState {
  if (input.ownerState?.seasonGoals?.length) {
    return {
      ...input.ownerState,
      messages: input.ownerState.messages ?? [],
      jobSecurity: input.ownerState.jobSecurity ?? 65,
      patience: input.ownerState.patience ?? input.league.teams.find((team) => team.id === input.selectedTeamId)?.ownerPatience ?? 60,
      goalOutcomeHistory: input.ownerState.goalOutcomeHistory ?? []
    };
  }
  return createDefaultOwnerState(input, new SeededRng(`${input.franchiseId}-owner-repair`));
}

function emptyOwnerState(input: FranchiseState): OwnerState {
  return {
    jobSecurity: 65,
    patience: input.league.teams.find((team) => team.id === input.selectedTeamId)?.ownerPatience ?? 60,
    seasonGoals: [],
    messages: [],
    goalOutcomeHistory: []
  };
}

function collectMissingFieldRepairs(input: FranchiseState): string[] {
  const repaired: string[] = [];
  if (input.schemaVersion !== SCHEMA_VERSION) repaired.push("schemaVersion");
  if (!input.league.ruleSet) repaired.push("league.ruleSet");
  if (!(input as Partial<FranchiseState>).gmProfile) repaired.push("gmProfile");
  if ((input as Partial<FranchiseState>).gmProfile && !validGameDifficulty((input as Partial<FranchiseState>).gmProfile?.difficulty)) {
    repaired.push("gmProfile.difficulty");
  }
  if ((input as Partial<FranchiseState>).gmProfile && !validStoryFrequency((input as Partial<FranchiseState>).gmProfile?.storyFrequency)) {
    repaired.push("gmProfile.storyFrequency");
  }
  if (!(input as Partial<FranchiseState>).difficultyTuning) repaired.push("difficultyTuning");
  if (!(input as Partial<FranchiseState>).assistantGmReports) repaired.push("assistantGmReports");
  if (!(input as Partial<FranchiseState>).narrativeTemplateVersion) repaired.push("narrativeTemplateVersion");
  if (!(input as Partial<FranchiseState>).tutorialState) repaired.push("tutorialState");
  if (!(input as Partial<FranchiseState>).achievements) repaired.push("achievements");
  if (!(input as Partial<FranchiseState>).milestones) repaired.push("milestones");
  if (!(input as Partial<FranchiseState>).localTelemetry) repaired.push("localTelemetry");
  if ((input.sourceDataPackId || input.customLeagueName) && !input.dataPackMetadata) repaired.push("dataPackMetadata");
  if (!input.seasonPhase) repaired.push("seasonPhase");
  if (!input.currentSeasonId) repaired.push("currentSeasonId");
  if (!input.staffState) repaired.push("staffState");
  if (!input.ownerState) repaired.push("ownerState");
  if (!input.history) repaired.push("history");
  if (!input.prospectPools) repaired.push("prospectPools");
  if (!input.scouting) repaired.push("scouting");
  if (!input.development) repaired.push("development");
  if (!input.rosterMoveHistory) repaired.push("rosterMoveHistory");
  if (!input.decisionEvents) repaired.push("decisionEvents");
  if (!input.storyArcs) repaired.push("storyArcs");
  if (!input.playerRelationships) repaired.push("playerRelationships");
  if (!input.agents) repaired.push("agents");
  if (!input.teamDynamics) repaired.push("teamDynamics");
  if (!input.mediaState) repaired.push("mediaState");
  input.league.teams.forEach((team) => {
    if (!team.affiliate) repaired.push(`${team.id}.affiliate`);
    if (!team.rosterMoveLog) repaired.push(`${team.id}.rosterMoveLog`);
    if (!team.activeRosterLimit) repaired.push(`${team.id}.activeRosterLimit`);
    if (!team.activeRosterMinimum) repaired.push(`${team.id}.activeRosterMinimum`);
    if (!team.draftPicks) repaired.push(`${team.id}.draftPicks`);
    if (!team.teamNeeds) repaired.push(`${team.id}.teamNeeds`);
    if (!team.tradeBlock) repaired.push(`${team.id}.tradeBlock`);
    if (!team.untouchables) repaired.push(`${team.id}.untouchables`);
    team.roster.forEach((player) => {
      if (!player.contract) repaired.push(`${team.id}.${player.id}.contract`);
      if (!player.rosterStatus) repaired.push(`${team.id}.${player.id}.rosterStatus`);
      if (!player.developmentPath) repaired.push(`${team.id}.${player.id}.developmentPath`);
    });
  });
  return repaired;
}

function getPhase7IntegrityWarnings(franchise: FranchiseState): string[] {
  const warnings: string[] = [];
  if (!franchise.gmProfile?.displayName) warnings.push("GM profile is missing a display name.");
  if (!validGameDifficulty(franchise.gmProfile?.difficulty)) warnings.push("GM difficulty is invalid and will repair to standard.");
  if (!validGameMode(franchise.gmProfile?.gameMode)) warnings.push("Game mode is invalid and will repair to Standard Dynasty.");
  if (!validStoryFrequency(franchise.gmProfile?.storyFrequency)) warnings.push("Story frequency is invalid and will repair to normal.");
  if (!franchise.difficultyTuning) warnings.push("Difficulty tuning is missing.");
  if (!Number.isFinite(franchise.narrativeTemplateVersion)) warnings.push("Narrative template version is missing.");
  return warnings;
}

function getPhase8IntegrityWarnings(franchise: FranchiseState): string[] {
  const warnings: string[] = [];
  if (!franchise.tutorialState) warnings.push("Tutorial state is missing.");
  if (!Array.isArray(franchise.achievements)) warnings.push("Achievements are missing.");
  if (!Array.isArray(franchise.milestones)) warnings.push("Milestones are missing.");
  if (!Array.isArray(franchise.localTelemetry)) warnings.push("Local telemetry buffer is missing.");
  if ((franchise.localTelemetry ?? []).length > 150) warnings.push("Local telemetry buffer exceeds the Phase 8 cap.");
  return warnings;
}

function hydrateDataPackMetadata(input: FranchiseState): FranchiseState["dataPackMetadata"] {
  if (input.dataPackMetadata?.dataPackId && input.dataPackMetadata.dataPackName) {
    return {
      dataPackId: input.dataPackMetadata.dataPackId,
      dataPackName: input.dataPackMetadata.dataPackName,
      scenarioName: input.dataPackMetadata.scenarioName,
      importedAt: input.dataPackMetadata.importedAt
    };
  }
  if (!input.sourceDataPackId && !input.customLeagueName && !input.sourceScenarioId) return undefined;
  return {
    dataPackId: input.sourceDataPackId ?? "custom-local",
    dataPackName: input.customLeagueName ?? "Custom Fictional League",
    scenarioName: input.sourceScenarioId,
    importedAt: input.createdAt
  };
}

function validRosterStatus(status: Player["rosterStatus"]): status is RosterStatus {
  return Boolean(status && ["active", "scratched", "affiliate", "injuredReserve", "prospectRights", "retired"].includes(status));
}

function validGameDifficulty(value: unknown): value is GameDifficulty {
  return value === "relaxed" || value === "standard" || value === "demanding" || value === "hardcore";
}

function validStoryFrequency(value: unknown): value is StoryFrequency {
  return value === "quiet" || value === "normal" || value === "dramatic";
}

function validGameMode(value: unknown): value is GameMode {
  return value === "sandbox" || value === "standardDynasty" || value === "pressureCooker" || value === "rebuildChallenge" || value === "contenderChallenge";
}

function validGmBackground(value: unknown): value is GMBackground {
  return (
    value === "Former Coach" ||
    value === "Cap Strategist" ||
    value === "Scout at Heart" ||
    value === "Player Relationship Builder" ||
    value === "Analytics Executive" ||
    value === "Old-School Hockey Ops" ||
    value === "Owner Favorite" ||
    value === "Media Savvy"
  );
}

function validGmAvatarStyle(value: unknown): value is GMAvatarStyle {
  return value === "classicSuit" || value === "teamPolo" || value === "rinkJacket" || value === "analyticsDesk";
}

function defaultDevelopmentPath(player: Player): PlayerDevelopmentPath {
  const upside = Math.max(0, player.potential - player.overall);
  return {
    track: player.position === "G" && upside >= 6 ? "Goalie Project" : player.age <= 23 || upside >= 8 ? "Prospect Pipeline" : player.overall >= 73 ? "Major Club Regular" : "Veteran Depth",
    confidence: Math.max(35, Math.min(92, 52 + upside + (player.overall >= 75 ? 8 : 0))),
    lastReport: "Hydrated into the Phase 5 player pathway model.",
    projectedRole: player.roleExpectation,
    eta: player.overall >= 73 ? "Now" : player.age <= 24 ? "Next Season" : "Long Term"
  };
}

function normalizeDevelopmentPath(path?: PlayerDevelopmentPath): PlayerDevelopmentPath | undefined {
  if (!path) return undefined;
  return {
    ...path,
    track: String(path.track) === "NHL Regular" ? "Major Club Regular" : path.track
  };
}

function inferCareerStage(player: Player): Player["careerStage"] {
  if (player.age <= 21 || player.potential - player.overall >= 9) return "prospect";
  if (player.age <= 24) return "rookie";
  if (player.age <= 30) return "prime";
  if (player.age <= 34) return "veteran";
  return "decline";
}
