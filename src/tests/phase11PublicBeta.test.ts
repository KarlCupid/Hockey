import { beforeAll, describe, expect, it } from "vitest";
import localforage from "localforage";
import { createCustomFranchiseFromDataPack } from "../game/generators/generateCustomLeague";
import { SeededRng } from "../game/rng";
import { nextGameForTeam, simulateGame } from "../game/simulation/simulateGame";
import { evaluateAchievements } from "../game/systems/achievements";
import { createBugReport, serializeBugReport } from "../game/systems/bugReport";
import { createDemoFranchise } from "../game/systems/demoMode";
import { getDesktopRecommendedMessage, getLowSpecSettingsPreset, getRecommendedDisplayMode } from "../game/systems/displayModes";
import { validateDynastyInvariants } from "../game/systems/dynastyInvariants";
import { checkBundleBudgetFromManifest, isKnownBundleException, summarizeRuntimePerformanceSettings } from "../game/systems/performanceBudget";
import { getPwaMetadata, registerServiceWorker } from "../game/systems/pwa";
import {
  addRuntimeHealthEvent,
  capRuntimeHealthEvents,
  clearRuntimeHealth,
  createRuntimeHealthBugReportSection,
  createRuntimeHealthState,
  getRuntimeHealthStatus
} from "../game/systems/runtimeHealth";
import {
  createSaveSnapshot,
  deleteSave,
  deleteSaveSnapshot,
  exportSaveSnapshotToJson,
  exportSaveToJson,
  importSaveFromJson,
  importSaveSnapshotJson,
  listSaveSnapshots,
  readSave,
  recoverLastGoodSave,
  restoreSaveSnapshot,
  saveKey,
  writeSave,
  writeSaveWithBackup
} from "../game/systems/saves";
import { applyGameToStandings } from "../game/systems/standings";
import { getPlaytestChecklists, markPlaytestChecklistStep, parsePlaytestChecklistProgress, serializePlaytestChecklistProgress, validatePlaytestChecklists } from "../game/systems/playtestChecklist";
import { getVersionSummary } from "../game/systems/version";
import { createDefaultDataPack } from "../game/systems/dataPacks";
import { completeRegularSeason } from "../game/systems/seasonLifecycle";
import { simulatePlayoffsUntil } from "../game/systems/playoffs";
import { advanceSeasonPhase } from "../game/systems/seasonLifecycle";
import { autoCompleteDraft } from "../game/systems/draftExecution";
import { advanceFreeAgencyDay } from "../game/systems/freeAgency";
import { repairAllTeamRosters } from "../game/systems/aiRosterManagement";
import { updatePackRuleSet } from "../components/editors/DataPackLibrary";
import type { FranchiseState, GameResult } from "../game/types";

const TEST_STORAGE_DRIVER = "phase11-memory-storage";
const testStorage = new Map<string, unknown>();

beforeAll(async () => {
  const driver: LocalForageDriver = {
    _driver: TEST_STORAGE_DRIVER,
    _support: true,
    _initStorage: () => undefined,
    clear: (callback) => {
      testStorage.clear();
      callback?.(null);
      return Promise.resolve();
    },
    getItem: <T>(key: string, callback?: (err: unknown, value: T | null) => void) => {
      const value = (testStorage.has(key) ? testStorage.get(key) : null) as T | null;
      callback?.(null, value);
      return Promise.resolve(value);
    },
    iterate: <T, U>(iteratee: (value: T, key: string, iterationNumber: number) => U, callback?: (err: unknown, result: U) => void) => {
      let index = 1;
      let result: U | undefined;
      for (const [key, value] of testStorage.entries()) {
        result = iteratee(value as T, key, index);
        index += 1;
        if (result !== undefined) break;
      }
      callback?.(null, result as U);
      return Promise.resolve(result as U);
    },
    key: (keyIndex, callback) => {
      const key = Array.from(testStorage.keys())[keyIndex] ?? "";
      callback?.(null, key);
      return Promise.resolve(key);
    },
    keys: (callback) => {
      const keys = Array.from(testStorage.keys());
      callback?.(null, keys);
      return Promise.resolve(keys);
    },
    length: (callback) => {
      callback?.(null, testStorage.size);
      return Promise.resolve(testStorage.size);
    },
    removeItem: (key, callback) => {
      testStorage.delete(key);
      callback?.(null);
      return Promise.resolve();
    },
    setItem: <T>(key: string, value: T, callback?: (err: unknown, value: T) => void) => {
      testStorage.set(key, value);
      callback?.(null, value);
      return Promise.resolve(value);
    },
    dropInstance: (_options, callback) => {
      testStorage.clear();
      callback?.(null);
      return Promise.resolve();
    }
  };
  await localforage.defineDriver(driver);
  await localforage.setDriver(TEST_STORAGE_DRIVER);
});

describe("Phase 11 version, PWA, performance, runtime health, and display helpers", () => {
  it("summarizes version, manifest metadata, and service worker no-op behavior", async () => {
    const version = getVersionSummary();
    expect(version.releaseLabel).toContain(version.appVersion);
    expect(version.releaseLabel).toContain("Phase 12");
    expect(version.releaseLabel).toContain("schema v8");

    const metadata = getPwaMetadata();
    expect(metadata.name).toBe("Franchise Ice");
    expect(metadata.shortName).toBe("Franchise Ice");
    expect(metadata.display).toBe("standalone");
    expect(metadata.manifestPath).toContain("manifest.webmanifest");

    const registration = await registerServiceWorker({ enabled: true });
    expect(registration.supported).toBe(false);
    expect(registration.registered).toBe(false);
  });

  it("reports bundle budgets, known three-r3f exception, and low-spec settings", () => {
    const report = checkBundleBudgetFromManifest({
      "assets/index.js": { file: "assets/index.js", size: 180 * 1024 },
      "assets/three-r3f.js": { file: "assets/three-r3f.js", size: 997 * 1024 },
      "assets/DataPackLibrary.js": { file: "assets/DataPackLibrary.js", size: 140 * 1024 }
    });
    expect(Number.isNaN(report.totalJsKb)).toBe(false);
    expect(report.totalJsKb).toBeGreaterThan(0);
    expect(isKnownBundleException("three-r3f")).toBe(true);
    expect(report.knownExceptions.join(" ")).toContain("Three.js");

    const preset = getLowSpecSettingsPreset();
    expect(preset.reduced3DDetail).toBe(true);
    expect(preset.reduceMotion).toBe(true);
    expect(preset.tableDensity).toBe("compact");
    expect(summarizeRuntimePerformanceSettings(preset).lowSpecRecommended).toBe(false);
  });

  it("tracks runtime health, caps events, creates bug-report text, clears, and recommends display modes", () => {
    let health = createRuntimeHealthState();
    health = addRuntimeHealthEvent(health, { type: "error", severity: "high", message: "Panel exploded safely" });
    expect(getRuntimeHealthStatus(health)).toBe("needsAttention");
    for (let index = 0; index < 80; index += 1) {
      health = addRuntimeHealthEvent(health, { type: "warning", severity: "low", message: `Warning ${index}` });
    }
    expect(capRuntimeHealthEvents(health).events.length).toBeLessThanOrEqual(60);
    expect(createRuntimeHealthBugReportSection(health)).toContain("Runtime Health");
    expect(clearRuntimeHealth(health).events).toHaveLength(0);

    expect(getRecommendedDisplayMode(1366, 768).mode).toBe("desktopCompact");
    expect(getRecommendedDisplayMode(900, 600).supported).toBe(false);
    expect(getDesktopRecommendedMessage(900, 600)).toContain("Desktop browser recommended");
  });
});

describe("Phase 11 save snapshots, demo mode, checklists, and release smoke", () => {
  it("creates, prunes, restores, recovers, and roundtrips save snapshots", async () => {
    const slotId = "phase11-slot";
    await deleteSave(slotId);
    const franchise = createDemoFranchise();
    await writeSave(slotId, franchise);
    const updated = { ...franchise, league: { ...franchise.league, currentDate: "2026-10-04" }, updatedAt: new Date().toISOString() };
    await writeSaveWithBackup(slotId, updated, "phase11 test overwrite");
    let snapshots = await listSaveSnapshots(slotId);
    expect(snapshots.length).toBeGreaterThanOrEqual(1);

    for (let index = 0; index < 7; index += 1) {
      await createSaveSnapshot({ ...franchise, updatedAt: new Date(Date.now() + index).toISOString() }, `extra ${index}`, slotId);
    }
    snapshots = await listSaveSnapshots(slotId);
    expect(snapshots.length).toBeGreaterThan(5);
    await writeSaveWithBackup(slotId, { ...updated, updatedAt: new Date().toISOString() }, "prune trigger");
    snapshots = await listSaveSnapshots(slotId);
    expect(snapshots.length).toBeLessThanOrEqual(5);

    const restored = await restoreSaveSnapshot(snapshots[0].snapshotId);
    expect(restored?.selectedTeamId).toBe(franchise.selectedTeamId);

    const exported = await exportSaveSnapshotToJson(snapshots[0].snapshotId);
    expect(exported).toContain("snapshotId");
    const importedMetadata = await importSaveSnapshotJson(exported!);
    expect(importedMetadata.snapshotId).toBeTruthy();

    await localforage.setItem(saveKey(slotId), "{bad");
    const recovered = await recoverLastGoodSave(slotId);
    expect(recovered?.selectedTeamId).toBe(franchise.selectedTeamId);

    await Promise.all((await listSaveSnapshots(slotId)).map((snapshot) => deleteSaveSnapshot(snapshot.snapshotId)));
    await deleteSave(slotId);
  });

  it("creates a valid demo franchise with an upcoming game, decision context, simulation, and save/export/import", async () => {
    let franchise = createDemoFranchise();
    expect(validateDynastyInvariants(franchise).errors).toEqual([]);
    expect(nextGameForTeam(franchise.selectedTeamId, franchise.league.schedule, franchise.league.currentDayIndex)).toBeTruthy();
    expect(franchise.assistantGmReports[0].recommendations.length).toBeGreaterThan(0);
    expect(franchise.decisionEvents.length).toBeGreaterThan(0);
    expect(franchise.scouting.watchlist.length).toBeGreaterThan(0);

    const applied = simulateOneUserGame(franchise);
    franchise = applied.franchise;
    expect(applied.result.finalScore.home + applied.result.finalScore.away).toBeGreaterThanOrEqual(0);
    const restored = importSaveFromJson(exportSaveToJson(franchise));
    expect(restored.selectedTeamId).toBe(franchise.selectedTeamId);

    const slotId = "phase11-demo-save";
    await writeSaveWithBackup(slotId, franchise, "demo save");
    expect((await readSave(slotId))?.selectedTeamId).toBe(franchise.selectedTeamId);
    await deleteSave(slotId);
  });

  it("validates playtest checklists and serializes checklist progress", () => {
    expect(validatePlaytestChecklists()).toEqual([]);
    const checklists = getPlaytestChecklists();
    const bugChecklist = checklists.find((checklist) => checklist.id === "bug-report");
    expect(bugChecklist?.steps.some((step) => step.diagnosticsRelevant)).toBe(true);
    const progress = markPlaytestChecklistStep({ completedStepIds: [], updatedAt: "2026-01-01" }, "export-report");
    expect(parsePlaytestChecklistProgress(serializePlaytestChecklistProgress(progress)).completedStepIds).toContain("export-report");
  });

  it("runs a store-level style release smoke across demo, snapshot, bug report, invariants, custom 16, tutorial, and achievements", async () => {
    let franchise = createDemoFranchise();
    const applied = simulateOneUserGame(franchise);
    franchise = evaluateAchievements(applied.franchise, { type: "gameResult", result: applied.result, won: didUserWin(applied.result, franchise.selectedTeamId) });
    expect(franchise.achievements.find((item) => item.id === "first-day")?.unlockedAt).toBeTruthy();

    const slotId = "phase11-smoke";
    await writeSave(slotId, franchise);
    const next = { ...franchise, updatedAt: new Date().toISOString() };
    await writeSaveWithBackup(slotId, next, "release smoke overwrite");
    const snapshot = (await listSaveSnapshots(slotId))[0];
    expect(snapshot).toBeTruthy();
    expect((await restoreSaveSnapshot(snapshot.snapshotId))?.selectedTeamId).toBe(franchise.selectedTeamId);
    expect(serializeBugReport(createBugReport(franchise))).toContain("appVersion");
    expect(validateDynastyInvariants(franchise).errors).toEqual([]);

    const custom16 = createCustomFranchiseFromDataPack(updatePackRuleSet(createDefaultDataPack(), { teamCount: 16 }), "harbor-city", undefined, { seed: "phase11-custom-16" });
    expect(validateDynastyInvariants(runOneCustomSeason(custom16)).errors).toEqual([]);

    await Promise.all((await listSaveSnapshots(slotId)).map((item) => deleteSaveSnapshot(item.snapshotId)));
    await deleteSave(slotId);
  });
});

function simulateOneUserGame(franchise: FranchiseState): { franchise: FranchiseState; result: GameResult } {
  const game = nextGameForTeam(franchise.selectedTeamId, franchise.league.schedule, franchise.league.currentDayIndex);
  if (!game) throw new Error("No user game available.");
  const home = franchise.league.teams.find((team) => team.id === game.homeTeamId)!;
  const away = franchise.league.teams.find((team) => team.id === game.awayTeamId)!;
  const result = simulateGame({ game, homeTeam: home, awayTeam: away, seed: `${franchise.franchiseId}-${game.id}` });
  const league = applyGameToStandings(franchise.league, result);
  const currentDayIndex = game.dayIndex + 1;
  const nextGame = nextGameForTeam(franchise.selectedTeamId, league.schedule, currentDayIndex);
  return {
    result,
    franchise: {
      ...franchise,
      league: {
        ...league,
        schedule: league.schedule.map((candidate) =>
          candidate.id === game.id ? { ...candidate, played: true, result: { homeGoals: result.finalScore.home, awayGoals: result.finalScore.away, overtime: result.finalScore.overtime } } : candidate
        ),
        currentDayIndex: nextGame?.dayIndex ?? currentDayIndex,
        currentDate: nextGame?.date ?? franchise.league.currentDate,
        completed: !nextGame
      },
      lastResult: result
    }
  };
}

function didUserWin(result: GameResult, teamId: string): boolean {
  return result.homeTeamId === teamId ? result.finalScore.home > result.finalScore.away : result.finalScore.away > result.finalScore.home;
}

function runOneCustomSeason(franchise: FranchiseState): FranchiseState {
  let next = repairAllTeamRosters(franchise, "preGame");
  next = completeRegularSeason(next, new SeededRng("phase11-16-regular"));
  next = simulatePlayoffsUntil(next, "champion", "phase11-16-playoffs");
  next = advanceSeasonPhase(next, new SeededRng("phase11-16-review"));
  next = advanceSeasonPhase(next, new SeededRng("phase11-16-retirements"));
  next = advanceSeasonPhase(next, new SeededRng("phase11-16-lottery"));
  next = autoCompleteDraft(next, new SeededRng("phase11-16-draft"));
  next = advanceSeasonPhase(next, new SeededRng("phase11-16-resign"));
  while (next.freeAgencyState && !next.freeAgencyState.completed) {
    next = advanceFreeAgencyDay(next, new SeededRng(`phase11-16-fa-${next.freeAgencyState.currentDay}`));
  }
  next = repairAllTeamRosters(next, "postFreeAgency");
  next = advanceSeasonPhase(next, new SeededRng("phase11-16-staff"));
  next = advanceSeasonPhase(next, new SeededRng("phase11-16-camp"));
  return repairAllTeamRosters(importSaveFromJson(exportSaveToJson(next)), "newSeason");
}
