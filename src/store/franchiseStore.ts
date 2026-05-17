import { create } from "zustand";
import { AUTOSAVE_SLOT_ID } from "../game/constants";
import { createFranchise } from "../game/generators/generateLeague";
import { createCustomFranchiseFromDataPack } from "../game/generators/generateCustomLeague";
import { clamp, SeededRng } from "../game/rng";
import { createGameNews } from "../game/systems/news";
import { autoFillBestLineup, validateLineup } from "../game/systems/lineupValidation";
import { applyGameToStandings, recordString } from "../game/systems/standings";
import {
  deleteSave,
  exportSaveToJson,
  importSaveFromJson,
  listSaveMetadata,
  listSaveSnapshots,
  readSave,
  repairFranchiseState,
  recoverLastGoodSave,
  restoreSaveSnapshot,
  deleteSaveSnapshot,
  exportSaveSnapshotToJson,
  validateSaveIntegrity,
  writeSaveWithBackup,
  type SaveSnapshotMetadata
} from "../game/systems/saves";
import { capNewsItems, createPhaseTransitionNews } from "../game/systems/storyEngine";
import { repairAllTeamRosters } from "../game/systems/aiRosterManagement";
import { tickAffiliateDevelopment } from "../game/systems/affiliate";
import { evaluateAchievements, type AchievementContext } from "../game/systems/achievements";
import { dismissAssistantGmReport as dismissAssistantGmReportPure, generateAssistantGmReport } from "../game/systems/assistantGm";
import { createBugReport, createDiagnosticSummary, serializeBugReport } from "../game/systems/bugReport";
import { createDemoFranchise } from "../game/systems/demoMode";
import { getCapWarnings } from "../game/systems/contracts";
import { createDifficultyTuning } from "../game/systems/difficulty";
import {
  applyMediaPressureDrift,
  applyNaturalSentimentDecay,
  applyRelationshipDrift,
  applyTeamChemistryDrift
} from "../game/systems/livingOpsTuning";
import { recordLocalTelemetry } from "../game/systems/localTelemetry";
import { evaluateMilestones, type MilestoneContext } from "../game/systems/milestones";
import { assignDevelopmentPlan as assignDevelopmentPlanPure, removeDevelopmentPlan as removeDevelopmentPlanPure, tickDevelopment } from "../game/systems/development";
import {
  applyAcceptedContractOffer,
  createContractNegotiationNews,
  evaluateContractOffer
} from "../game/systems/contractNegotiation";
import {
  generateContractDecisionEvents,
  generateDecisionEvents,
  generatePhaseDecisionEvents,
  generatePostGameDecisionEvents,
  generateRosterDecisionEvents,
  mergeDecisionEvents,
  resolveDecisionEvent as resolveDecisionEventPure
} from "../game/systems/decisionEvents";
import { updateFanSentiment, updateMediaState } from "../game/systems/fanMedia";
import { generateInitialPlayerRelationships, generateAgentsForPlayers, generateInitialTeamDynamics } from "../game/systems/relationships";
import { createTeamMeeting, createPlayerMeeting } from "../game/systems/playerMeetings";
import { createOwnerMeeting } from "../game/systems/ownerMeetings";
import { createAgentCall, getAgentForPlayer } from "../game/systems/agentInteractions";
import { createPressConference } from "../game/systems/pressConferences";
import { createStoryArcDecisionEvent, updateStoryArcs } from "../game/systems/storyArcs";
import {
  advanceFreeAgencyDay as advanceFreeAgencyDayPure,
  applyFreeAgentSigning,
  completeFreeAgency as completeFreeAgencyPure,
  createFreeAgentMarket
} from "../game/systems/freeAgency";
import {
  autoCompleteDraft as autoCompleteDraftPure,
  autoDraftUntilUserPick as autoDraftUntilUserPickPure,
  makeUserDraftSelection as makeUserDraftSelectionPure
} from "../game/systems/draftExecution";
import { signProspect as signProspectPure } from "../game/systems/prospects";
import {
  activatePlayer as activatePlayerPure,
  callUpPlayer as callUpPlayerPure,
  placePlayerOnIR as placePlayerOnIRPure,
  removePlayerFromIR as removePlayerFromIRPure,
  scratchPlayer as scratchPlayerPure,
  sendDownPlayer as sendDownPlayerPure
} from "../game/systems/rosterManagement";
import { canAssignPlayerToLineup, getPlayerRosterStatus } from "../game/systems/rosterRules";
import { advanceSeasonPhase as advanceSeasonPhasePure, completeRegularSeason as completeRegularSeasonPure } from "../game/systems/seasonLifecycle";
import {
  applyPlayoffGameResult,
  getCurrentUserPlayoffGame,
  playoffGameAsSchedule,
  simulatePlayoffsUntil
} from "../game/systems/playoffs";
import { tickScouting, toggleWatchlist, moveProspectOnBoard, updateScoutingAssignment } from "../game/systems/scouting";
import { fireStaff as fireStaffPure, hireStaff as hireStaffPure, replaceStaff as replaceStaffPure } from "../game/systems/staff";
import { applyTrade, evaluateTrade, generateTradeBlock, generateUntouchables, inferTeamNeeds } from "../game/systems/trades";
import { completeTutorialStep as completeTutorialStepPure, dismissTutorialStep as dismissTutorialStepPure, resetTutorial as resetTutorialPure, skipTutorial as skipTutorialPure } from "../game/systems/tutorial";
import { assembleGameResult, nextGameForTeam, simulateGame } from "../game/simulation/simulateGame";
import { useSettingsStore } from "./settingsStore";
import { useUiStore } from "./uiStore";
import { useRuntimeHealthStore } from "./runtimeHealthStore";
import type { TacticKey } from "../game/systems/tactics";
import type {
  DevelopmentFocus,
  DevelopmentIntensity,
  FranchiseSetupOptions,
  FranchiseState,
  GameDifficulty,
  GameResult,
  LeagueState,
  Lineup,
  NewsItem,
  PeriodSimulationResult,
  Player,
  PlayerStatUpdate,
  RoleExpectation,
  SaveSlotMetadata,
  ScoutingAssignment,
  SeasonPhase,
  StaffRole,
  StoryFrequency,
  Tactics,
  Team,
  ContractOffer,
  DataPack,
  TradeAsset,
  TradeEvaluation,
  TradeProposal
} from "../game/types";

interface FranchiseStore {
  franchise: FranchiseState | null;
  saves: SaveSlotMetadata[];
  saveSnapshots: SaveSnapshotMetadata[];
  loadError?: string;
  activeTradeProposal?: TradeProposal;
  lastTradeEvaluation?: TradeEvaluation;
  startNewFranchise: (teamId: string, setupOptions?: FranchiseSetupOptions) => void;
  startDemoFranchise: () => void;
  startFranchiseFromDataPack: (pack: DataPack, selectedTeamId: string, setupOptions?: FranchiseSetupOptions) => void;
  updateDifficultySettings: (patch: Partial<{ difficulty: GameDifficulty; storyFrequency: StoryFrequency }>) => void;
  dismissAssistantGmReport: (reportId: string) => void;
  completeTutorialStep: (stepId: string) => void;
  dismissTutorialStep: (stepId: string) => void;
  resetTutorial: () => void;
  skipTutorial: () => void;
  recordTelemetryEvent: (type: FranchiseState["localTelemetry"][number]["type"], label: string, details?: FranchiseState["localTelemetry"][number]["details"]) => void;
  exportBugReport: (userNote?: string, includeFullSave?: boolean) => string | undefined;
  copyDiagnosticSummary: () => string | undefined;
  refreshSaves: () => Promise<void>;
  refreshSnapshots: (slotId: string) => Promise<void>;
  saveToSlot: (slotId: string) => Promise<boolean>;
  loadFromSlot: (slotId: string) => Promise<void>;
  deleteSlot: (slotId: string) => Promise<void>;
  restoreSnapshot: (snapshotId: string) => Promise<void>;
  deleteSnapshot: (snapshotId: string, slotId?: string) => Promise<void>;
  exportSnapshotJson: (snapshotId: string) => Promise<string | undefined>;
  recoverSlot: (slotId: string) => Promise<void>;
  importFromJson: (raw: string) => void;
  exportCurrentJson: () => string | undefined;
  repairCurrentSave: () => void;
  autoFillLineup: () => void;
  setLineupSlot: (path: string, playerId: string) => void;
  setTactic: (key: TacticKey, value: number) => void;
  setTactics: (tactics: Tactics) => void;
  applyGameResult: (result: GameResult, autosave?: boolean) => Promise<void>;
  simulateInstantNextGame: () => Promise<GameResult | undefined>;
  applyPeriodGame: (periods: PeriodSimulationResult[], seed: string) => Promise<GameResult | undefined>;
  simToEndRegularSeason: () => void;
  advanceSeasonPhase: () => void;
  simulateNextPlayoffDay: () => void;
  simulateCurrentPlayoffRound: () => void;
  simulateToPlayoffChampion: () => void;
  proposeTrade: (toTeamId: string) => void;
  toggleTradeAsset: (asset: TradeAsset) => void;
  submitTradeProposal: () => Promise<TradeEvaluation | undefined>;
  clearTradeProposal: () => void;
  addPlayerToTradeBlock: (playerId: string) => void;
  removePlayerFromTradeBlock: (playerId: string) => void;
  setScoutingAssignment: (
    assignmentId: string,
    patch: Partial<Pick<ScoutingAssignment, "region" | "priority" | "assignedProspectId" | "active">>
  ) => void;
  toggleProspectWatchlist: (prospectId: string) => void;
  moveProspectOnDraftBoard: (prospectId: string, direction: "up" | "down") => void;
  makeDraftSelection: (prospectId: string) => void;
  autoDraftUntilUserPick: () => void;
  autoCompleteDraft: () => void;
  assignDevelopmentPlan: (playerId: string, focus: DevelopmentFocus, intensity: DevelopmentIntensity) => void;
  removeDevelopmentPlan: (playerId: string) => void;
  signProspect: (prospectId: string) => void;
  signProspectTo: (prospectId: string, destination: "active" | "affiliate") => void;
  callUpPlayer: (teamId: string, playerId: string) => void;
  sendDownPlayer: (teamId: string, playerId: string) => void;
  scratchPlayer: (teamId: string, playerId: string) => void;
  activatePlayer: (teamId: string, playerId: string) => void;
  placePlayerOnIR: (teamId: string, playerId: string) => void;
  removePlayerFromIR: (teamId: string, playerId: string) => void;
  submitContractOffer: (playerId: string, salary: number, years: number, rolePromise?: RoleExpectation) => void;
  submitFreeAgentOffer: (freeAgentId: string, salary: number, years: number, rolePromise?: RoleExpectation) => void;
  advanceFreeAgencyDay: () => void;
  completeFreeAgency: () => void;
  hireStaff: (staffId: string, role?: StaffRole) => void;
  fireStaff: (staffId: string) => void;
  replaceStaff: (outgoingStaffId: string, incomingStaffId: string) => void;
  tickFrontOfficeSystemsAfterGame: () => void;
  resolveDecisionEvent: (eventId: string, optionId: string) => void;
  generateSampleDecisionEvent: (type?: "press" | "owner" | "agent" | "player" | "team") => void;
  autoResolveActiveDecisionEvents: () => void;
  schedulePlayerMeeting: (playerId: string) => void;
  scheduleTeamMeeting: () => void;
  resetLivingOpsState: () => void;
}

export const useFranchiseStore = create<FranchiseStore>((set, get) => ({
  franchise: null,
  saves: [],
  saveSnapshots: [],
  loadError: undefined,
  activeTradeProposal: undefined,
  lastTradeEvaluation: undefined,
  startNewFranchise: (teamId, setupOptions) => {
    const franchise = recordTelemetryIfEnabled(createFranchise(teamId, setupOptions ?? undefined), "phaseAdvanced", "New franchise created", {
      teamId,
      seasonYear: new Date().getFullYear()
    });
    set({ franchise, loadError: undefined });
  },
  startDemoFranchise: () => {
    const franchise = recordTelemetryIfEnabled(createDemoFranchise(), "phaseAdvanced", "Demo franchise opened", {
      teamId: "harbor-city",
      seasonYear: 2026
    });
    set({ franchise, loadError: undefined });
  },
  startFranchiseFromDataPack: (pack, selectedTeamId, setupOptions) => {
    try {
      const franchise = recordTelemetryIfEnabled(
        createCustomFranchiseFromDataPack(pack, selectedTeamId, undefined, setupOptions ?? {}),
        "phaseAdvanced",
        pack.scenario ? "Scenario franchise created" : "Custom league franchise created",
        {
          teamId: selectedTeamId,
          dataPackId: pack.id,
          scenarioId: pack.scenario?.id ?? ""
        }
      );
      set({ franchise, loadError: undefined });
    } catch (error) {
      set({ loadError: error instanceof Error ? error.message : "Custom data pack start failed." });
    }
  },
  updateDifficultySettings: (patch) => {
    const franchise = get().franchise;
    if (!franchise) return;
    const gmProfile = {
      ...franchise.gmProfile,
      difficulty: patch.difficulty ?? franchise.gmProfile.difficulty,
      storyFrequency: patch.storyFrequency ?? franchise.gmProfile.storyFrequency
    };
    set({
      franchise: {
        ...franchise,
        gmProfile,
        difficultyTuning: createDifficultyTuning(gmProfile.difficulty, gmProfile.gameMode, gmProfile.storyFrequency),
        updatedAt: new Date().toISOString()
      }
    });
  },
  dismissAssistantGmReport: (reportId) => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: dismissAssistantGmReportPure(franchise, reportId) });
  },
  completeTutorialStep: (stepId) => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: recordTelemetryIfEnabled(completeTutorialStepPure(franchise, stepId), "tutorialStepCompleted", stepId) });
  },
  dismissTutorialStep: (stepId) => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: dismissTutorialStepPure(franchise, stepId) });
  },
  resetTutorial: () => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: resetTutorialPure(franchise, useSettingsStore.getState().settings.tutorialMode) });
  },
  skipTutorial: () => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: recordTelemetryIfEnabled(skipTutorialPure(franchise), "tutorialSkipped", "Tutorial skipped") });
  },
  recordTelemetryEvent: (type, label, details) => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: recordTelemetryIfEnabled(franchise, type, label, details) });
  },
  exportBugReport: (userNote, includeFullSave = false) => {
    const franchise = get().franchise;
    if (!franchise) return undefined;
    return serializeBugReport(createBugReport(franchise, { userNote, includeFullSave, lastRoom: useUiActiveRoom(), runtimeHealth: useRuntimeHealthStore.getState().runtimeHealth }));
  },
  copyDiagnosticSummary: () => {
    const franchise = get().franchise;
    return franchise ? createDiagnosticSummary(franchise, useUiActiveRoom(), useRuntimeHealthStore.getState().runtimeHealth) : undefined;
  },
  refreshSaves: async () => {
    const saves = await listSaveMetadata().catch(() => []);
    set({ saves });
  },
  refreshSnapshots: async (slotId) => {
    const saveSnapshots = await listSaveSnapshots(slotId).catch(() => []);
    set({ saveSnapshots });
  },
  saveToSlot: async (slotId) => {
    const franchise = get().franchise;
    if (!franchise) return false;
    set({ franchise: { ...franchise, saveStatus: "saving" } });
    try {
      const readyToSave = completeTutorialStepPure(franchise, "save-franchise");
      await writeSaveWithBackup(slotId, { ...readyToSave, updatedAt: new Date().toISOString() }, slotId === AUTOSAVE_SLOT_ID ? "autosave" : "manual save");
      const saves = await listSaveMetadata();
      const saveSnapshots = await listSaveSnapshots(slotId).catch(() => get().saveSnapshots);
      set({ franchise: { ...readyToSave, saveStatus: "saved", updatedAt: new Date().toISOString() }, saves, saveSnapshots, loadError: undefined });
      return true;
    } catch (error) {
      useRuntimeHealthStore.getState().addRuntimeEvent({
        type: "warning",
        severity: "high",
        message: "Save failed",
        details: error instanceof Error ? error.message : "Unknown save failure",
        roomId: useUiActiveRoom(),
        phase: franchise.seasonPhase
      });
      set({ franchise: { ...franchise, saveStatus: "error" }, loadError: error instanceof Error ? error.message : "Save failed" });
      return false;
    }
  },
  loadFromSlot: async (slotId) => {
    try {
      const save = await readSave(slotId);
      if (!save) {
        set({ loadError: "No save exists in that slot." });
        return;
      }
      set({ franchise: recordTelemetryIfEnabled(save, "saveLoaded", `Loaded ${slotId}`, { slotId }), loadError: undefined });
    } catch (error) {
      const recovered = await recoverLastGoodSave(slotId).catch(() => null);
      useRuntimeHealthStore.getState().addRuntimeEvent({
        type: "warning",
        severity: recovered ? "medium" : "high",
        message: recovered ? `Load failed for ${slotId}; last good snapshot is available.` : `Load failed for ${slotId}.`,
        details: error instanceof Error ? error.message : "Save could not be loaded.",
        roomId: useUiActiveRoom()
      });
      set({ loadError: error instanceof Error ? error.message : "Save could not be loaded." });
    }
  },
  deleteSlot: async (slotId) => {
    await deleteSave(slotId);
    await get().refreshSaves();
  },
  restoreSnapshot: async (snapshotId) => {
    const restored = await restoreSaveSnapshot(snapshotId);
    if (!restored) {
      set({ loadError: "Snapshot could not be restored." });
      return;
    }
    set({ franchise: recordTelemetryIfEnabled(restored, "saveLoaded", `Restored snapshot ${snapshotId.slice(0, 24)}`), loadError: undefined });
  },
  deleteSnapshot: async (snapshotId, slotId) => {
    await deleteSaveSnapshot(snapshotId);
    if (slotId) await get().refreshSnapshots(slotId);
  },
  exportSnapshotJson: async (snapshotId) => exportSaveSnapshotToJson(snapshotId),
  recoverSlot: async (slotId) => {
    const recovered = await recoverLastGoodSave(slotId);
    if (!recovered) {
      set({ loadError: "No recoverable snapshot was found for that slot." });
      return;
    }
    set({ franchise: recordTelemetryIfEnabled(recovered, "saveLoaded", `Recovered ${slotId} from last good snapshot`, { slotId }), loadError: undefined });
  },
  importFromJson: (raw) => {
    try {
      const franchise = recordTelemetryIfEnabled(importSaveFromJson(raw), "saveLoaded", "Imported save JSON");
      const integrity = validateSaveIntegrity(franchise);
      set({
        franchise,
        loadError: integrity.errors.length ? integrity.errors[0] : integrity.warnings[0]
      });
    } catch (error) {
      useRuntimeHealthStore.getState().addRuntimeEvent({
        type: "warning",
        severity: "high",
        message: "Save import failed",
        details: error instanceof Error ? error.message : "Unknown import failure",
        roomId: useUiActiveRoom()
      });
      set({ loadError: error instanceof Error ? error.message : "Save import failed." });
    }
  },
  exportCurrentJson: () => {
    const franchise = get().franchise;
    return franchise ? exportSaveToJson(franchise) : undefined;
  },
  repairCurrentSave: () => {
    const franchise = get().franchise;
    if (!franchise) return;
    const repaired = recordTelemetryIfEnabled(applyPhase8Progress(repairFranchiseState(franchise), { type: "rosterRepair" }), "saveRepaired", "Manual save repair");
    const integrity = validateSaveIntegrity(repaired);
    useRuntimeHealthStore.getState().addRuntimeEvent({
      type: "saveRepair",
      severity: integrity.errors.length ? "high" : integrity.warnings.length ? "medium" : "low",
      message: "Manual save repair completed",
      details: `warnings=${integrity.warnings.length}; errors=${integrity.errors.length}; repaired=${integrity.repairedFields.length}`,
      roomId: useUiActiveRoom(),
      phase: repaired.seasonPhase
    });
    set({
      franchise: repaired,
      loadError: integrity.warnings[0] ?? undefined
    });
  },
  autoFillLineup: () => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({
      franchise: applyPhase8Progress(completeTutorialStepPure(updateSelectedTeam(franchise, (team) => ({ ...team, lines: autoFillBestLineup(team).lineup })), "review-lines"), {
        type: "lineupEdited"
      })
    });
  },
  setLineupSlot: (path, playerId) => {
    const franchise = get().franchise;
    if (!franchise) return;
    const team = selectedTeam(franchise);
    const player = team.roster.find((candidate) => candidate.id === playerId);
    if (!player || !canAssignPlayerToLineup(player)) return;
    const nextLineup = structuredClone(team.lines) as Lineup;
    const [section, indexRaw, slot] = path.split(".");
    const index = Number(indexRaw);
    const assigned = new Set(
      [
        ...nextLineup.forwardLines.flatMap((line) => [line.lw, line.c, line.rw]),
        ...nextLineup.defensePairs.flatMap((pair) => [pair.ld, pair.rd]),
        nextLineup.goalies.starter,
        nextLineup.goalies.backup
      ].filter(Boolean)
    );
    const currentValue =
      section === "forwardLines"
        ? nextLineup.forwardLines[index]?.[slot as keyof (typeof nextLineup.forwardLines)[number]]
        : section === "defensePairs"
          ? nextLineup.defensePairs[index]?.[slot as keyof (typeof nextLineup.defensePairs)[number]]
          : nextLineup.goalies[slot as keyof typeof nextLineup.goalies];
    if (assigned.has(playerId) && currentValue !== playerId) return;
    if (section === "forwardLines") {
      nextLineup.forwardLines[index] = { ...nextLineup.forwardLines[index], [slot]: playerId };
    } else if (section === "defensePairs") {
      nextLineup.defensePairs[index] = { ...nextLineup.defensePairs[index], [slot]: playerId };
    } else if (section === "goalies") {
      nextLineup.goalies = { ...nextLineup.goalies, [slot]: playerId };
    }
    set({
      franchise: applyPhase8Progress(completeTutorialStepPure(updateSelectedTeam(franchise, (candidate) => ({
        ...candidate,
        roster:
          getPlayerRosterStatus(player) === "scratched"
            ? candidate.roster.map((candidatePlayer) => (candidatePlayer.id === player.id ? { ...candidatePlayer, rosterStatus: "active" as const } : candidatePlayer))
            : candidate.roster,
        lines: nextLineup
      })), "review-lines"), { type: "lineupEdited" })
    });
  },
  setTactic: (key, value) => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({
      franchise: completeTutorialStepPure(updateSelectedTeam(franchise, (team) => ({
        ...team,
        tactics: { ...team.tactics, [key]: clamp(value) }
      })), "adjust-tactic")
    });
  },
  setTactics: (tactics) => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({
      franchise: completeTutorialStepPure(updateSelectedTeam(franchise, (team) => ({
        ...team,
        tactics: {
          forecheckIntensity: clamp(tactics.forecheckIntensity),
          defensiveStructure: clamp(tactics.defensiveStructure),
          offensiveRisk: clamp(tactics.offensiveRisk),
          physicality: clamp(tactics.physicality),
          pace: clamp(tactics.pace),
          shotVolume: clamp(tactics.shotVolume),
          specialTeamsAggression: clamp(tactics.specialTeamsAggression)
        }
      })), "adjust-tactic")
    });
  },
  simulateInstantNextGame: async () => {
    const franchise = get().franchise;
    if (!franchise) return undefined;
    if (franchise.seasonPhase === "playoffs") {
      const playoffGame = getCurrentUserPlayoffGame(franchise);
      if (!playoffGame) return undefined;
      const homeTeam = findTeam(franchise.league, playoffGame.homeTeamId);
      const awayTeam = findTeam(franchise.league, playoffGame.awayTeamId);
      if (validateLineup(selectedTeam(franchise)).errors.length) return undefined;
      const result = simulateGame({
        game: playoffGameAsSchedule(playoffGame, franchise.league.currentDayIndex, franchise.league.currentDate),
        homeTeam,
        awayTeam,
        seed: `${franchise.franchiseId}-${playoffGame.id}-${franchise.playoffState?.currentRound ?? 1}`
      });
      const next = tickLivingOpsAfterGame(applyPlayoffGameResult(franchise, playoffGame, result), result, true);
      const autoSave = useSettingsStore.getState().settings.autoSave;
      set({ franchise: { ...next, saveStatus: autoSave ? "saving" : next.saveStatus } });
      const saved = autoSave
        ? await writeSaveWithBackup(AUTOSAVE_SLOT_ID, next, "playoff autosave")
            .then(() => true)
            .catch(() => false)
        : true;
      if (autoSave) await get().refreshSaves();
      const latest = get().franchise;
      if (autoSave && latest?.lastResult?.id === result.id) set({ franchise: { ...latest, saveStatus: saved ? "saved" : "error" } });
      return result;
    }
    const game = nextGameForTeam(franchise.selectedTeamId, franchise.league.schedule, franchise.league.currentDayIndex);
    if (!game) return undefined;
    const homeTeam = findTeam(franchise.league, game.homeTeamId);
    const awayTeam = findTeam(franchise.league, game.awayTeamId);
    if (validateLineup(selectedTeam(franchise)).errors.length) return undefined;
    const result = simulateGame({
      game,
      homeTeam,
      awayTeam,
      seed: `${franchise.franchiseId}-${game.id}-${franchise.league.currentDayIndex}`
    });
    await get().applyGameResult(result, true);
    return result;
  },
  applyPeriodGame: async (periods, seed) => {
    const franchise = get().franchise;
    if (!franchise) return undefined;
    if (franchise.seasonPhase === "playoffs") {
      const playoffGame = getCurrentUserPlayoffGame(franchise);
      if (!playoffGame) return undefined;
      const result = assembleGameResult(
        playoffGameAsSchedule(playoffGame, franchise.league.currentDayIndex, franchise.league.currentDate),
        findTeam(franchise.league, playoffGame.homeTeamId),
        findTeam(franchise.league, playoffGame.awayTeamId),
        seed,
        periods
      );
      await get().applyGameResult(result, true);
      return result;
    }
    const game = nextGameForTeam(franchise.selectedTeamId, franchise.league.schedule, franchise.league.currentDayIndex);
    if (!game) return undefined;
    const result = assembleGameResult(game, findTeam(franchise.league, game.homeTeamId), findTeam(franchise.league, game.awayTeamId), seed, periods);
    await get().applyGameResult(result, true);
    return result;
  },
  applyGameResult: async (result, autosave = false) => {
    const franchise = get().franchise;
    if (!franchise) return;
    const playoffGame = franchise.playoffState?.bracket.flatMap((series) => series.games).find((game) => game.id === result.gameId);
    let next = playoffGame ? applyPlayoffGameResult(franchise, playoffGame, result) : applyDetailedResult(franchise, result);
    if (!playoffGame) {
      next = simulateRemainingDay(next, result.gameId);
      next = tickFrontOfficeSystems(next);
    }
    next = tickLivingOpsAfterGame(next, result, Boolean(playoffGame));
    const userHome = result.homeTeamId === franchise.selectedTeamId;
    const won = userHome ? result.finalScore.home > result.finalScore.away : result.finalScore.away > result.finalScore.home;
    next = recordTelemetryIfEnabled(
      applyPhase8Progress(completeTutorialStepPure(next, "sim-first-game"), { type: "gameResult", result, won }, won ? { type: "firstWin", result } : undefined),
      "gameSimulated",
      `${result.awayTeamId} at ${result.homeTeamId}`,
      { gameId: result.gameId, won }
    );
    const autoSaveEnabled = useSettingsStore.getState().settings.autoSave;
    set({ franchise: { ...next, saveStatus: autosave && autoSaveEnabled ? "saving" : next.saveStatus } });
    if (autosave && autoSaveEnabled) {
      const saved = await writeSaveWithBackup(AUTOSAVE_SLOT_ID, next, "post-game autosave")
        .then(() => true)
        .catch(() => false);
      await get().refreshSaves();
      const latest = get().franchise;
      if (latest?.lastResult?.id === result.id) set({ franchise: { ...latest, saveStatus: saved ? "saved" : "error" } });
    }
  },
  simToEndRegularSeason: () => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: recordTelemetryIfEnabled(applyPhase8Progress(completeRegularSeasonPure(franchise, new SeededRng(`${franchise.franchiseId}-sim-to-end`))), "phaseAdvanced", "Simmed to end of regular season") });
  },
  advanceSeasonPhase: () => {
    const franchise = get().franchise;
    if (!franchise) return;
    let next = advanceSeasonPhasePure(franchise, new SeededRng(`${franchise.franchiseId}-advance-${franchise.seasonPhase}`));
    const news = next.seasonPhase !== franchise.seasonPhase ? createPhaseTransitionNews(next, franchise.seasonPhase, next.seasonPhase) : [];
    if (next.seasonPhase !== franchise.seasonPhase) {
      next = tickLivingOpsForPhase(next, franchise.seasonPhase, next.seasonPhase);
      next = recordTelemetryIfEnabled(
        applyPhase8Progress(
          next,
          { type: "seasonTransition" },
          next.seasonPhase === "regularSeason" ? { type: "newSeasonStarted" } : franchise.seasonPhase === "seasonReview" ? { type: "seasonCompleted" } : undefined
        ),
        "phaseAdvanced",
        `${franchise.seasonPhase} to ${next.seasonPhase}`,
        { from: franchise.seasonPhase, to: next.seasonPhase }
      );
    }
    set({ franchise: news.length ? { ...next, inbox: capNewsItems([...news, ...next.inbox]) } : next });
  },
  simulateNextPlayoffDay: () => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: simulatePlayoffsUntil(franchise, "day") });
  },
  simulateCurrentPlayoffRound: () => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: simulatePlayoffsUntil(franchise, "round") });
  },
  simulateToPlayoffChampion: () => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: simulatePlayoffsUntil(franchise, "champion") });
  },
  proposeTrade: (toTeamId) => {
    const franchise = get().franchise;
    if (!franchise || toTeamId === franchise.selectedTeamId) return;
    set({
      activeTradeProposal: {
        id: `trade-${franchise.league.currentDayIndex}-${Date.now()}`,
        fromTeamId: franchise.selectedTeamId,
        toTeamId,
        assetsFrom: [],
        assetsTo: [],
        createdDayIndex: franchise.league.currentDayIndex,
        status: "draft"
      },
      lastTradeEvaluation: undefined
    });
  },
  toggleTradeAsset: (asset) => {
    const franchise = get().franchise;
    const proposal = get().activeTradeProposal;
    if (!franchise || !proposal) return;
    const side = asset.teamId === proposal.fromTeamId ? "assetsFrom" : "assetsTo";
    const otherSide = side === "assetsFrom" ? "assetsTo" : "assetsFrom";
    const exists = proposal[side].some((candidate) => candidate.type === asset.type && candidate.assetId === asset.assetId);
    const nextProposal: TradeProposal = {
      ...proposal,
      status: "draft",
      [side]: exists
        ? proposal[side].filter((candidate) => !(candidate.type === asset.type && candidate.assetId === asset.assetId))
        : [...proposal[side], asset],
      [otherSide]: proposal[otherSide].filter((candidate) => !(candidate.type === asset.type && candidate.assetId === asset.assetId))
    };
    set({
      activeTradeProposal: nextProposal,
      lastTradeEvaluation: evaluateTrade(nextProposal, franchise.league, franchise.difficultyTuning.tradeAiStrictness)
    });
  },
  submitTradeProposal: async () => {
    const franchise = get().franchise;
    const proposal = get().activeTradeProposal;
    if (!franchise || !proposal) return undefined;
    const evaluation = evaluateTrade(proposal, franchise.league, franchise.difficultyTuning.tradeAiStrictness);
    let next = applyTrade({ ...proposal, status: evaluation.accepted ? "accepted" : "rejected" }, franchise);
    if (!evaluation.accepted && shouldGenerateLivingOps()) {
      const playerRumors = proposal.assetsFrom
        .filter((asset) => asset.type === "player")
        .flatMap((asset) => generateDecisionEvents(franchise, { kind: "tradeRumor", playerId: asset.assetId }, new SeededRng(`${franchise.franchiseId}-trade-submit-${asset.assetId}`)));
      next = mergeDecisionEvents(next, playerRumors);
    }
    next = recordTelemetryIfEnabled(applyPhase8Progress(next, { type: "trade", accepted: evaluation.accepted }, evaluation.accepted ? { type: "firstTrade" } : undefined), "rosterMove", evaluation.accepted ? "Trade accepted" : "Trade rejected", {
      accepted: evaluation.accepted,
      tradeId: proposal.id
    });
    set({
      franchise: { ...next, saveStatus: evaluation.accepted ? "saving" : next.saveStatus },
      activeTradeProposal: evaluation.accepted ? undefined : { ...proposal, status: "rejected" },
      lastTradeEvaluation: evaluation
    });
    if (evaluation.accepted) {
      const saved = await writeSaveWithBackup(AUTOSAVE_SLOT_ID, next, "accepted trade autosave")
        .then(() => true)
        .catch(() => false);
      await get().refreshSaves();
      const latest = get().franchise;
      if (latest) set({ franchise: { ...latest, saveStatus: saved ? "saved" : "error" } });
    }
    return evaluation;
  },
  clearTradeProposal: () => set({ activeTradeProposal: undefined, lastTradeEvaluation: undefined }),
  addPlayerToTradeBlock: (playerId) => {
    const franchise = get().franchise;
    if (!franchise) return;
    const next = updateSelectedTeam(franchise, (team) => ({
        ...team,
        tradeBlock: team.tradeBlock.includes(playerId) ? team.tradeBlock : [...team.tradeBlock, playerId].slice(-8)
      }));
    set({ franchise: shouldGenerateLivingOps() ? mergeDecisionEvents(next, generateDecisionEvents(next, { kind: "tradeRumor", playerId }, new SeededRng(`${next.franchiseId}-trade-rumor-${playerId}`))) : next });
  },
  removePlayerFromTradeBlock: (playerId) => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({
      franchise: updateSelectedTeam(franchise, (team) => ({
        ...team,
        tradeBlock: team.tradeBlock.filter((id) => id !== playerId)
      }))
    });
  },
  setScoutingAssignment: (assignmentId, patch) => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({
      franchise: {
        ...franchise,
        scouting: updateScoutingAssignment(franchise.scouting, assignmentId, patch),
        updatedAt: new Date().toISOString()
      }
    });
  },
  toggleProspectWatchlist: (prospectId) => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({
      franchise: {
        ...franchise,
        scouting: toggleWatchlist(franchise.scouting, prospectId),
        updatedAt: new Date().toISOString()
      }
    });
    const latest = get().franchise;
    if (latest) set({ franchise: applyPhase8Progress(latest, { type: "prospectWatchlist" }) });
  },
  moveProspectOnDraftBoard: (prospectId, direction) => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({
      franchise: {
        ...franchise,
        scouting: moveProspectOnBoard(franchise.scouting, prospectId, direction),
        updatedAt: new Date().toISOString()
      }
    });
  },
  makeDraftSelection: (prospectId) => {
    const franchise = get().franchise;
    if (!franchise) return;
    const next = makeUserDraftSelectionPure(franchise, prospectId);
    const withPhase8 = applyPhase8Progress(
      shouldGenerateLivingOps() ? mergeDecisionEvents(next, generateDecisionEvents(next, { kind: "draftReaction", prospectId }, new SeededRng(`${next.franchiseId}-draft-reaction-${prospectId}`))) : next,
      { type: "draftPick" },
      { type: "firstDraftPick" }
    );
    set({ franchise: withPhase8 });
  },
  autoDraftUntilUserPick: () => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: autoDraftUntilUserPickPure(franchise, new SeededRng(`${franchise.franchiseId}-draft-until-user`)) });
  },
  autoCompleteDraft: () => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: autoCompleteDraftPure(franchise, new SeededRng(`${franchise.franchiseId}-draft-complete`)) });
  },
  assignDevelopmentPlan: (playerId, focus, intensity) => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({
      franchise: {
        ...franchise,
        development: assignDevelopmentPlanPure(franchise.development, {
          playerId,
          focus,
          intensity,
          dayIndex: franchise.league.currentDayIndex
        }),
        updatedAt: new Date().toISOString()
      }
    });
  },
  removeDevelopmentPlan: (playerId) => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({
      franchise: {
        ...franchise,
        development: removeDevelopmentPlanPure(franchise.development, playerId),
        updatedAt: new Date().toISOString()
      }
    });
  },
  signProspect: (prospectId) => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: applyPhase8Progress(signProspectPure(franchise, prospectId, "affiliate"), { type: "prospectSigned" }) });
  },
  signProspectTo: (prospectId, destination) => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: applyPhase8Progress(signProspectPure(franchise, prospectId, destination), { type: "prospectSigned" }) });
  },
  callUpPlayer: (teamId, playerId) => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: recordTelemetryIfEnabled(tickLivingOpsForRosterMove(callUpPlayerPure(franchise, teamId, playerId)), "rosterMove", "Player called up", { teamId, playerId }) });
  },
  sendDownPlayer: (teamId, playerId) => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: recordTelemetryIfEnabled(tickLivingOpsForRosterMove(sendDownPlayerPure(franchise, teamId, playerId)), "rosterMove", "Player sent down", { teamId, playerId }) });
  },
  scratchPlayer: (teamId, playerId) => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: recordTelemetryIfEnabled(tickLivingOpsForRosterMove(scratchPlayerPure(franchise, teamId, playerId)), "rosterMove", "Player scratched", { teamId, playerId }) });
  },
  activatePlayer: (teamId, playerId) => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: recordTelemetryIfEnabled(tickLivingOpsForRosterMove(activatePlayerPure(franchise, teamId, playerId)), "rosterMove", "Player activated", { teamId, playerId }) });
  },
  placePlayerOnIR: (teamId, playerId) => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: recordTelemetryIfEnabled(tickLivingOpsForRosterMove(placePlayerOnIRPure(franchise, teamId, playerId)), "rosterMove", "Player placed on injured reserve", { teamId, playerId }) });
  },
  removePlayerFromIR: (teamId, playerId) => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: recordTelemetryIfEnabled(tickLivingOpsForRosterMove(removePlayerFromIRPure(franchise, teamId, playerId)), "rosterMove", "Player removed from injured reserve", { teamId, playerId }) });
  },
  submitContractOffer: (playerId, salary, years, rolePromise) => {
    const franchise = get().franchise;
    if (!franchise) return;
    const team = selectedTeam(franchise);
    const player = team.roster.find((candidate) => candidate.id === playerId);
    if (!player) return;
    const offer: ContractOffer = {
      id: `offer-${playerId}-${franchise.league.currentDate}-${salary}-${years}`,
      playerId,
      teamId: team.id,
      salary,
      capHit: salary,
      years,
      rolePromise,
      offerType: "extension",
      status: "draft"
    };
    const evaluation = evaluateContractOffer(player, offer, team, franchise);
    if (evaluation.accepted) {
      set({ franchise: applyAcceptedContractOffer(franchise, { ...offer, status: "accepted", evaluation }) });
      return;
    }
    const withNews = {
      ...franchise,
      inbox: [...createContractNegotiationNews(player, { ...offer, status: "rejected", evaluation }, evaluation, franchise.league.currentDate, team.id), ...franchise.inbox].slice(0, 60),
      updatedAt: new Date().toISOString()
    };
    set({
      franchise: shouldGenerateLivingOps() ? mergeDecisionEvents(withNews, generateContractDecisionEvents(withNews, player, new SeededRng(`${withNews.franchiseId}-contract-${player.id}`))) : withNews
    });
  },
  submitFreeAgentOffer: (freeAgentId, salary, years, rolePromise) => {
    const franchise = get().franchise;
    if (!franchise) return;
    const state = franchise.freeAgencyState ?? createFreeAgentMarket(franchise, new SeededRng(`${franchise.franchiseId}-fa-market`));
    const freeAgent = state.market.find((candidate) => candidate.player.id === freeAgentId);
    if (!freeAgent) return;
    const offer: ContractOffer = {
      id: `fa-offer-${freeAgentId}-${franchise.league.currentDate}-${salary}-${years}`,
      playerId: freeAgentId,
      teamId: franchise.selectedTeamId,
      salary,
      capHit: salary,
      years,
      rolePromise,
      offerType: "freeAgent",
      status: "draft"
    };
    const next = applyFreeAgentSigning({ ...franchise, freeAgencyState: state }, freeAgentId, offer);
    const signed = next.freeAgencyState?.userSignings.includes(freeAgentId);
    const generated = signed ? [] : generateDecisionEvents(next, { kind: "freeAgencyMiss", playerId: freeAgentId }, new SeededRng(`${next.franchiseId}-fa-miss-${freeAgentId}`));
    set({ franchise: shouldGenerateLivingOps() ? mergeDecisionEvents(next, generated) : next });
  },
  advanceFreeAgencyDay: () => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: advanceFreeAgencyDayPure(franchise, new SeededRng(`${franchise.franchiseId}-fa-day`)) });
  },
  completeFreeAgency: () => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: completeFreeAgencyPure(franchise) });
  },
  hireStaff: (staffId, role) => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: hireStaffPure(franchise, staffId, role) });
  },
  fireStaff: (staffId) => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: fireStaffPure(franchise, staffId) });
  },
  replaceStaff: (outgoingStaffId, incomingStaffId) => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: replaceStaffPure(franchise, outgoingStaffId, incomingStaffId) });
  },
  tickFrontOfficeSystemsAfterGame: () => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: tickFrontOfficeSystems(franchise) });
  },
  resolveDecisionEvent: (eventId, optionId) => {
    const franchise = get().franchise;
    if (!franchise) return;
    const event = franchise.decisionEvents.find((candidate) => candidate.id === eventId);
    const resolved = resolveDecisionEventPure(franchise, eventId, optionId, new SeededRng(`${franchise.franchiseId}-${eventId}-${optionId}`));
    set({
      franchise: recordTelemetryIfEnabled(
        applyPhase8Progress(
          resolved,
          { type: "decisionResolved", eventType: event?.type },
          event && (event.severity === "high" || event.severity === "critical") ? { type: "majorStoryResolved", relatedEventId: event.id } : undefined
        ),
        "decisionResolved",
        event?.type ?? "Decision resolved",
        { eventId, optionId }
      )
    });
  },
  generateSampleDecisionEvent: (type = "press") => {
    const franchise = get().franchise;
    if (!franchise) return;
    const team = selectedTeam(franchise);
    const player = [...team.roster].sort((a, b) => b.overall - a.overall)[0];
    const agent = player ? getAgentForPlayer(franchise, player.id) : undefined;
    const event =
      type === "owner"
        ? createOwnerMeeting(franchise, { topic: "Sample owner pressure meeting" })
        : type === "agent" && player && agent
          ? createAgentCall(franchise, agent.id, player.id, { topic: "Sample agent pressure call." })
          : type === "player" && player
            ? createPlayerMeeting(franchise, player.id, { reason: "Sample player relationship meeting." })
            : type === "team"
              ? createTeamMeeting(franchise, { reason: "Sample team meeting." })
              : createPressConference(franchise, { topic: "Sample media availability" });
    set({ franchise: mergeDecisionEvents(franchise, [event]) });
  },
  autoResolveActiveDecisionEvents: () => {
    const franchise = get().franchise;
    if (!franchise) return;
    const next = franchise.decisionEvents
      .filter((event) => event.status === "active")
      .reduce((state, event) => resolveDecisionEventPure(state, event.id, preferredOptionId(event), new SeededRng(`${state.franchiseId}-auto-${event.id}`)), franchise);
    set({ franchise: next });
  },
  schedulePlayerMeeting: (playerId) => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: mergeDecisionEvents(franchise, [createPlayerMeeting(franchise, playerId)]) });
  },
  scheduleTeamMeeting: () => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: mergeDecisionEvents(franchise, [createTeamMeeting(franchise)]) });
  },
  resetLivingOpsState: () => {
    const franchise = get().franchise;
    if (!franchise) return;
    if (typeof window !== "undefined" && !window.confirm("Reset all story, relationship, agent, media, and decision state?")) return;
    const agents = generateAgentsForPlayers(franchise, new SeededRng(`${franchise.franchiseId}-reset-agents`));
    const withAgents = { ...franchise, agents, decisionEvents: [], storyArcs: [] };
    const playerRelationships = generateInitialPlayerRelationships(withAgents);
    const withRelationships = { ...withAgents, playerRelationships };
    set({
      franchise: {
        ...withRelationships,
        teamDynamics: generateInitialTeamDynamics(withRelationships),
        mediaState: {
          pressure: 45,
          narrative: "quiet",
          recentQuestions: [],
          columnistTone: "neutral"
        },
        updatedAt: new Date().toISOString()
      }
    });
  }
}));

function applyPhase8Progress(franchise: FranchiseState, achievementContext?: AchievementContext, milestoneContext?: MilestoneContext): FranchiseState {
  return evaluateMilestones(evaluateAchievements(franchise, achievementContext), milestoneContext);
}

function recordTelemetryIfEnabled(
  franchise: FranchiseState,
  type: FranchiseState["localTelemetry"][number]["type"],
  label: string,
  details?: FranchiseState["localTelemetry"][number]["details"]
): FranchiseState {
  return recordLocalTelemetry(franchise, type, label, details, useSettingsStore.getState().settings.telemetryEnabledLocalOnly);
}

function useUiActiveRoom() {
  return useUiStore.getState().activeRoom;
}

export function selectedTeam(franchise: FranchiseState): Team {
  return findTeam(franchise.league, franchise.selectedTeamId);
}

export function findTeam(league: LeagueState, teamId: string): Team {
  const team = league.teams.find((candidate) => candidate.id === teamId);
  if (!team) throw new Error(`Team not found: ${teamId}`);
  return team;
}

export function upcomingOpponent(franchise: FranchiseState): Team | undefined {
  const next = nextGameForTeam(franchise.selectedTeamId, franchise.league.schedule, franchise.league.currentDayIndex);
  if (!next) return undefined;
  const opponentId = next.homeTeamId === franchise.selectedTeamId ? next.awayTeamId : next.homeTeamId;
  return findTeam(franchise.league, opponentId);
}

function updateSelectedTeam(franchise: FranchiseState, updater: (team: Team) => Team): FranchiseState {
  return {
    ...franchise,
    league: {
      ...franchise.league,
      teams: franchise.league.teams.map((team) => (team.id === franchise.selectedTeamId ? updater(team) : team))
    },
    updatedAt: new Date().toISOString()
  };
}

function applyDetailedResult(franchise: FranchiseState, result: GameResult): FranchiseState {
  const leagueWithRecords = applyGameToStandings(franchise.league, result);
  const teamsWithStats = leagueWithRecords.teams.map((team) => applyResultToTeam(team, result, franchise.selectedTeamId));
  const schedule = leagueWithRecords.schedule.map((game) =>
    game.id === result.gameId
      ? {
          ...game,
          played: true,
          result: {
            homeGoals: result.finalScore.home,
            awayGoals: result.finalScore.away,
            overtime: result.finalScore.overtime
          }
        }
      : game
  );
  const userTeam = teamsWithStats.find((team) => team.id === franchise.selectedTeamId)!;
  const opponent = teamsWithStats.find((team) => team.id === (result.homeTeamId === userTeam.id ? result.awayTeamId : result.homeTeamId))!;
  const news = createGameNews(result, userTeam, opponent, franchise.league.currentDate);
  const recent = `${findTeam(franchise.league, result.awayTeamId).abbreviation} ${result.finalScore.away} @ ${findTeam(franchise.league, result.homeTeamId).abbreviation} ${result.finalScore.home}`;

  return {
    ...franchise,
    league: {
      ...leagueWithRecords,
      teams: teamsWithStats,
      schedule,
      recentResults: [recent, ...leagueWithRecords.recentResults].slice(0, 10)
    },
    inbox: capNewsItems([...news, ...franchise.inbox], 60),
    lastResult: { ...result, newsEvents: news },
    updatedAt: new Date().toISOString()
  };
}

function simulateRemainingDay(franchise: FranchiseState, userGameId: string): FranchiseState {
  const day = franchise.league.currentDayIndex;
  const starting = useSettingsStore.getState().settings.autoRepairAiRosters ? repairAllTeamRosters(franchise, "preGame") : franchise;
  const games = starting.league.schedule.filter((game) => game.dayIndex === day && !game.played && game.id !== userGameId);
  let next = starting;
  games.forEach((game) => {
    const result = simulateGame({
      game,
      homeTeam: findTeam(next.league, game.homeTeamId),
      awayTeam: findTeam(next.league, game.awayTeamId),
      seed: `${next.league.id}-${game.id}-ai`
    });
    const league = applyGameToStandings(next.league, result);
    next = {
      ...next,
      league: {
        ...league,
        schedule: league.schedule.map((candidate) =>
          candidate.id === game.id
            ? {
                ...candidate,
                played: true,
                result: {
                  homeGoals: result.finalScore.home,
                  awayGoals: result.finalScore.away,
                  overtime: result.finalScore.overtime
                }
              }
            : candidate
        ),
        recentResults: [
          `${findTeam(league, game.awayTeamId).abbreviation} ${result.finalScore.away} @ ${findTeam(league, game.homeTeamId).abbreviation} ${result.finalScore.home}`,
          ...league.recentResults
        ].slice(0, 10)
      }
    };
  });

  const nextDay = day + 1;
  const nextGame = next.league.schedule.find((game) => !game.played && game.dayIndex >= nextDay);
  return {
    ...next,
    league: {
      ...next.league,
      currentDayIndex: nextGame?.dayIndex ?? nextDay,
      currentDate: nextGame?.date ?? next.league.currentDate,
      completed: !nextGame
    }
  };
}

function tickFrontOfficeSystems(franchise: FranchiseState): FranchiseState {
  const dayIndex = franchise.league.currentDayIndex;
  const repaired = useSettingsStore.getState().settings.autoRepairAiRosters ? repairAllTeamRosters(franchise, "preGame") : franchise;
  const refreshedLeague: LeagueState = {
    ...repaired.league,
    teams: repaired.league.teams.map(refreshFrontOfficeTeam)
  };
  const rng = new SeededRng(`${repaired.franchiseId}-front-office-${dayIndex}`);
  const scoutingResult =
    repaired.scouting.lastScoutingTickDayIndex === dayIndex
      ? { state: repaired.scouting, news: [] as NewsItem[] }
      : tickScouting(repaired.scouting, refreshedLeague, dayIndex, rng, repaired.staffState, repaired.selectedTeamId);
  const developmentResult = tickDevelopment(repaired.development, refreshedLeague, dayIndex, rng, repaired.staffState);
  const affiliateResult = tickAffiliateDevelopment({ ...repaired, league: developmentResult.league, development: developmentResult.development }, rng);
  const capNews = createCapAndContractNews({ ...affiliateResult, league: affiliateResult.league }, dayIndex);
  const frontOfficeNews = [...developmentResult.news, ...scoutingResult.news, ...capNews].map((item) => ({
    ...item,
    teamId: item.type === "scouting" ? repaired.selectedTeamId : item.teamId ?? repaired.selectedTeamId
  }));
  const transactions = [
    ...developmentResult.news.slice(0, 2).map((item) => ({
      id: `transaction-${item.id}`,
      date: item.date,
      type: "development" as const,
      headline: item.headline,
      details: item.body,
      playerIds: item.playerId ? [item.playerId] : undefined
    })),
    ...scoutingResult.news.slice(0, 2).map((item) => ({
      id: `transaction-${item.id}`,
      date: item.date,
      type: "scouting" as const,
      headline: item.headline,
      details: item.body,
      teamIds: item.teamId ? [item.teamId] : [repaired.selectedTeamId]
    }))
  ];

  return {
    ...affiliateResult,
    league: {
      ...affiliateResult.league,
      teams: affiliateResult.league.teams.map(refreshFrontOfficeTeam)
    },
    scouting: scoutingResult.state,
    development: affiliateResult.development,
    inbox: capNewsItems([...frontOfficeNews, ...affiliateResult.inbox], 60),
    transactionLog: [...transactions, ...affiliateResult.transactionLog].slice(0, 30),
    updatedAt: new Date().toISOString()
  };
}

function tickLivingOpsAfterGame(franchise: FranchiseState, result: GameResult, playoffGame: boolean): FranchiseState {
  if (!shouldGenerateLivingOps()) return franchise;
  const team = selectedTeam(franchise);
  const userHome = result.homeTeamId === team.id;
  const won = userHome ? result.finalScore.home > result.finalScore.away : result.finalScore.away > result.finalScore.home;
  const uglyLoss = !won && Math.abs(result.finalScore.home - result.finalScore.away) >= 3;
  let next = updateFanSentiment(franchise, { win: won });
  next = updateMediaState(next, { win: won, uglyLoss });
  next = applyNaturalSentimentDecay(next);
  next = applyMediaPressureDrift(next);
  next = applyTeamChemistryDrift(next);
  next = applyRelationshipDrift(next);
  const events = [
    ...generateDecisionEvents(next, { kind: "postGame", result }, new SeededRng(`${next.franchiseId}-${result.id}-living`)),
    ...(playoffGame ? generateDecisionEvents(next, { kind: "playoff" }, new SeededRng(`${next.franchiseId}-${result.id}-playoff-living`)) : [])
  ];
  next = mergeDecisionEvents(next, filterEventsBySettings(events));
  next = updateStoryArcs(next, new SeededRng(`${next.franchiseId}-${result.id}-story`));
  next = mergeDecisionEvents(next, filterEventsBySettings(next.storyArcs.flatMap((arc) => createStoryArcDecisionEvent(next, arc) ?? [])));
  return appendAssistantGmReport(autoResolveLowSeverityIfNeeded(next), "postGame");
}

function tickLivingOpsForPhase(franchise: FranchiseState, previousPhase: SeasonPhase, nextPhase: SeasonPhase): FranchiseState {
  if (!shouldGenerateLivingOps()) return franchise;
  let next = applyNaturalSentimentDecay(franchise);
  next = mergeDecisionEvents(
    next,
    filterEventsBySettings(generateDecisionEvents(next, { kind: "phase", previousPhase, nextPhase }, new SeededRng(`${franchise.franchiseId}-${previousPhase}-${nextPhase}-living`)))
  );
  next = updateStoryArcs(next, new SeededRng(`${next.franchiseId}-${nextPhase}-story`));
  return appendAssistantGmReport(
    autoResolveLowSeverityIfNeeded(mergeDecisionEvents(next, filterEventsBySettings(next.storyArcs.flatMap((arc) => createStoryArcDecisionEvent(next, arc) ?? [])))),
    "phase"
  );
}

function tickLivingOpsForRosterMove(franchise: FranchiseState): FranchiseState {
  if (!shouldGenerateLivingOps()) return franchise;
  const move = franchise.rosterMoveHistory[0];
  if (!move) return franchise;
  const events = generateDecisionEvents(franchise, { kind: "roster", move }, new SeededRng(`${franchise.franchiseId}-${move.id}-living`));
  return appendAssistantGmReport(autoResolveLowSeverityIfNeeded(mergeDecisionEvents(franchise, filterEventsBySettings(events))), "daily");
}

function appendAssistantGmReport(franchise: FranchiseState, type: "daily" | "weekly" | "phase" | "preGame" | "postGame" | "offseason"): FranchiseState {
  const settings = useSettingsStore.getState().settings as ReturnType<typeof useSettingsStore.getState>["settings"] & {
    assistantGmReportsEnabled?: boolean;
  };
  if (settings.assistantGmReportsEnabled === false) return franchise;
  const report = generateAssistantGmReport(franchise, { type, date: franchise.league.currentDate });
  return {
    ...franchise,
    assistantGmReports: [report, ...franchise.assistantGmReports.filter((candidate) => candidate.id !== report.id)].slice(0, 20)
  };
}

function shouldGenerateLivingOps(): boolean {
  return useSettingsStore.getState().settings.storyEventsEnabled;
}

function filterEventsBySettings<T extends { severity: string; type?: string }>(events: T[]): T[] {
  const settings = useSettingsStore.getState().settings;
  const frequency = settings.decisionEventFrequency;
  const pressFrequency = settings.pressConferenceFrequency;
  return events.filter((event, index) => {
    if (frequency === "High") return true;
    if (frequency === "Low" && event.severity === "low") return false;
    if (pressFrequency === "Key games only" && event.type === "pressConference" && event.severity === "low") return false;
    if (pressFrequency === "Frequent" && event.type === "pressConference") return true;
    return frequency === "Normal" ? index < 4 || event.severity === "high" || event.severity === "critical" : true;
  });
}

function autoResolveLowSeverityIfNeeded(franchise: FranchiseState): FranchiseState {
  if (!useSettingsStore.getState().settings.autoResolveLowSeverityEvents) return franchise;
  return franchise.decisionEvents
    .filter((event) => event.status === "active" && event.severity === "low")
    .reduce((state, event) => resolveDecisionEventPure(state, event.id, preferredOptionId(event), new SeededRng(`${state.franchiseId}-auto-low-${event.id}`)), franchise);
}

function refreshFrontOfficeTeam(team: Team): Team {
  const untouchables = generateUntouchables(team);
  const generatedBlock = generateTradeBlock({ ...team, untouchables });
  const validRosterIds = new Set(team.roster.map((player) => player.id));
  const tradeBlock = Array.from(
    new Set([...team.tradeBlock.filter((id) => validRosterIds.has(id) && !untouchables.includes(id)), ...generatedBlock])
  ).slice(0, 8);
  return {
    ...team,
    untouchables,
    tradeBlock,
    teamNeeds: inferTeamNeeds(team)
  };
}

function createCapAndContractNews(franchise: FranchiseState, dayIndex: number): NewsItem[] {
  const team = selectedTeam(franchise);
  const warnings = getCapWarnings(team);
  const news: NewsItem[] = [];
  const capWarning = warnings.find((warning) => warning.includes("cap"));
  if (capWarning) {
    news.push({
      id: `cap-${team.id}-${dayIndex}`,
      type: "cap",
      date: franchise.league.currentDate,
      headline: "Cap Desk: Front office math needs attention",
      body: capWarning,
      severity: capWarning.includes("over") ? "high" : "medium",
      teamId: team.id
    });
  }
  const expiring = team.roster.find((player) => player.contract.yearsRemaining <= 1 && player.overall >= 80);
  if (expiring) {
    news.push({
      id: `contract-${expiring.id}-${dayIndex}`,
      type: "contract",
      date: franchise.league.currentDate,
      headline: `Contract Desk: ${expiring.displayName}'s future is getting louder`,
      body: "Full negotiations arrive later, but the room knows an important deal is entering its final year.",
      severity: "medium",
      teamId: team.id,
      playerId: expiring.id
    });
  }
  return news.slice(0, 2);
}

function applyResultToTeam(team: Team, result: GameResult, selectedTeamId: string): Team {
  if (team.id !== result.homeTeamId && team.id !== result.awayTeamId) return team;
  const updates = result.playerStatUpdates.filter((update) => update.teamId === team.id);
  const updateById = new Map(updates.map((update) => [update.playerId, update]));
  const injuries = new Map(result.injuries.filter((injury) => injury.teamId === team.id).map((injury) => [injury.playerId, injury]));
  const morale = new Map(result.moraleChanges.map((change) => [change.playerId, change]));
  const fatigue = new Map(result.fatigueChanges.map((change) => [change.playerId, change]));

  return {
    ...team,
    fanConfidence: clamp(team.fanConfidence + (team.id === selectedTeamId ? (wonTeam(team.id, result) ? 3 : -3) : 0), 0, 100),
    roster: team.roster.map((player) => {
      const update = updateById.get(player.id);
      const injury = injuries.get(player.id);
      const moraleChange = morale.get(player.id);
      const fatigueChange = fatigue.get(player.id);
      const remainingInjuryGames = injury?.gamesRemaining ?? Math.max(0, player.injuryGamesRemaining - 1);
      const injuryStatus = injury
        ? injury.gamesRemaining <= 2
          ? "day-to-day"
          : "out"
        : remainingInjuryGames === 0
          ? "healthy"
          : remainingInjuryGames <= 2
            ? "day-to-day"
            : player.injuryStatus;
      return {
        ...player,
        stats: update ? applyPlayerStats(player, update) : player.stats,
        morale: clamp(player.morale + (moraleChange?.amount ?? 0), 0, 100),
        form: clamp(player.form + formDelta(update), 0, 100),
        fatigue: clamp(player.fatigue + (fatigueChange?.amount ?? -4), 0, 100),
        injuryStatus,
        injuryGamesRemaining: remainingInjuryGames
      };
    })
  };
}

function applyPlayerStats(player: Player, update: PlayerStatUpdate): Player["stats"] {
  const goals = player.stats.goals + (update.goals ?? 0);
  const assists = player.stats.assists + (update.assists ?? 0);
  return {
    gamesPlayed: player.stats.gamesPlayed + (update.gamesPlayed ?? 0),
    goals,
    assists,
    points: goals + assists,
    plusMinus: player.stats.plusMinus + (update.plusMinus ?? 0),
    penaltyMinutes: player.stats.penaltyMinutes + (update.penaltyMinutes ?? 0),
    shots: player.stats.shots + (update.shots ?? 0),
    hits: player.stats.hits + (update.hits ?? 0),
    blocks: player.stats.blocks + (update.blocks ?? 0),
    goalieWins: player.stats.goalieWins + (update.goalieWins ?? 0),
    goalieLosses: player.stats.goalieLosses + (update.goalieLosses ?? 0),
    saves: player.stats.saves + (update.saves ?? 0),
    goalsAgainst: player.stats.goalsAgainst + (update.goalsAgainst ?? 0),
    shutouts: player.stats.shutouts + (update.shutouts ?? 0)
  };
}

function formDelta(update?: PlayerStatUpdate): number {
  if (!update) return -1;
  return (update.goals ?? 0) * 4 + (update.assists ?? 0) * 2 + (update.goalieWins ?? 0) * 4 - (update.goalsAgainst ?? 0);
}

function wonTeam(teamId: string, result: GameResult): boolean {
  if (teamId === result.homeTeamId) return result.finalScore.home > result.finalScore.away;
  return result.finalScore.away > result.finalScore.home;
}

export function recordLabel(team: Team): string {
  return `${recordString(team)} (${team.record.points} pts)`;
}

function preferredOptionId(event: { options: Array<{ id: string; tone: string }> }): string {
  return event.options.find((option) => option.tone === "transparent")?.id ?? event.options.find((option) => option.tone === "supportive")?.id ?? event.options[0]?.id ?? "";
}
