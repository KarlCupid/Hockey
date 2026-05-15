import { describe, expect, it } from "vitest";
import { createFranchise } from "../game/generators/generateLeague";
import { AUDIO_CUES, requiredAudioCueIds } from "../game/audio/audioCues";
import { GeneratedAudioEngine, clampVolume } from "../game/audio/audioEngine";
import { getKeyboardShortcuts, getAccessibilitySettingsSummary, getContrastClass, getUiScaleClass } from "../game/systems/accessibility";
import { createDefaultAchievements, evaluateAchievements, unlockAchievement } from "../game/systems/achievements";
import { createBugReport, serializeBugReport } from "../game/systems/bugReport";
import { createBroadcastIntro, createGameNarrativeBeats, findTurningPoint } from "../game/systems/broadcastStory";
import { runDynastyPlaytest } from "../game/systems/dynastyPlaytest";
import { runFanSentimentScenario } from "../game/systems/fanSentimentBalance";
import { getGuideTopics, validateGuideCoverage } from "../game/systems/guide";
import { recordLocalTelemetry } from "../game/systems/localTelemetry";
import { evaluateMilestones } from "../game/systems/milestones";
import { captureOwnerGoalOutcomes, createOwnerGoalReport } from "../game/systems/ownerGoalReporting";
import { generateAssistantGmReport } from "../game/systems/assistantGm";
import { validateDynastyInvariants } from "../game/systems/dynastyInvariants";
import { applyGameToStandings } from "../game/systems/standings";
import { exportSaveToJson, importSaveFromJson } from "../game/systems/saves";
import { SCHEMA_VERSION } from "../game/constants";
import {
  completeTutorialStep,
  createDefaultTutorialState,
  dismissTutorialStep,
  getContextualHint,
  getCurrentTutorialStep,
  getTutorialSteps,
  resetTutorial
} from "../game/systems/tutorial";
import { nextGameForTeam, simulateGame } from "../game/simulation/simulateGame";
import { DEFAULT_SETTINGS, normalizeSettings } from "../store/settingsStore";
import type { FranchiseState, GameResult, RoomId } from "../game/types";

const ALL_ROOMS: RoomId[] = [
  "gm",
  "press",
  "ownerSuite",
  "agents",
  "playerMeetings",
  "roster",
  "coach",
  "locker",
  "medical",
  "arena",
  "standings",
  "saves",
  "contracts",
  "trades",
  "scouting",
  "development",
  "freeAgency",
  "staff",
  "draft",
  "settings",
  "devTools"
];

describe("Phase 8 tutorial and guide", () => {
  it("creates, completes, dismisses, resets, hints, and serializes tutorial state", () => {
    let franchise = createFranchise("harbor-city", "phase8-tutorial");
    expect(franchise.schemaVersion).toBe(SCHEMA_VERSION);
    expect(franchise.tutorialState).toEqual(createDefaultTutorialState("firstFranchise"));
    expect(getCurrentTutorialStep(franchise)?.id).toBe("move-facility");

    franchise = completeTutorialStep(franchise, "move-facility");
    expect(franchise.tutorialState.completedStepIds).toContain("move-facility");
    expect(getCurrentTutorialStep(franchise)?.id).toBe("open-gm-office");

    franchise = dismissTutorialStep(franchise, "open-gm-office");
    expect(franchise.tutorialState.dismissedStepIds).toContain("open-gm-office");
    expect(getCurrentTutorialStep(franchise)?.id).toBe("read-assistant-gm");
    expect(getContextualHint(franchise, "gm")).toContain("Assistant GM");

    franchise = resetTutorial(franchise);
    expect(franchise.tutorialState.completedStepIds).toHaveLength(0);
    expect(JSON.parse(JSON.stringify(franchise.tutorialState)).mode).toBe("guided");
    expect(getTutorialSteps(franchise).length).toBeGreaterThan(12);
  });

  it("covers every major room with Learn the Game topics", () => {
    const topics = getGuideTopics();
    expect(validateGuideCoverage(ALL_ROOMS)).toEqual([]);
    expect(topics.every((topic) => topic.title && topic.body && topic.category)).toBe(true);
    expect(JSON.stringify(topics)).not.toContain("TODO");
    expect(JSON.stringify(topics)).not.toContain("{{");
  });
});

describe("Phase 8 achievements, milestones, telemetry, and diagnostics", () => {
  it("unlocks first-win/trade/championship achievements without duplicates and serializes them", () => {
    let franchise = createFranchise("harbor-city", "phase8-achievements");
    franchise = unlockAchievement(franchise, "first-win", "2026-10-04");
    franchise = unlockAchievement(franchise, "first-win", "2026-10-05");
    franchise = evaluateAchievements({ ...franchise, tradeHistory: [{ id: "t1", fromTeamId: franchise.selectedTeamId, toTeamId: "prairie-falls", assetsFrom: [], assetsTo: [], createdDayIndex: 0, status: "accepted" }] });
    franchise = evaluateAchievements({
      ...franchise,
      history: {
        ...franchise.history,
        champions: [{ seasonYear: 2026, teamId: franchise.selectedTeamId, teamName: "Harbor City" }]
      }
    });

    const firstWin = franchise.achievements.filter((item) => item.id === "first-win" && item.unlockedAt);
    expect(firstWin).toHaveLength(1);
    expect(franchise.achievements.find((item) => item.id === "phones-hot")?.unlockedAt).toBeTruthy();
    expect(franchise.achievements.find((item) => item.id === "champion")?.unlockedAt).toBeTruthy();
    expect(JSON.parse(JSON.stringify(franchise.achievements)).length).toBe(createDefaultAchievements().length);
  });

  it("creates milestone entries and capped local telemetry, and bug reports exclude full saves by default", () => {
    let franchise = createFranchise("harbor-city", "phase8-telemetry");
    franchise = evaluateMilestones(franchise, { type: "firstDraftPick" });
    expect(franchise.milestones.find((item) => item.type === "firstDraftPick")).toBeTruthy();

    for (let index = 0; index < 180; index += 1) {
      franchise = recordLocalTelemetry(franchise, "roomOpened", `Room ${index}`, { index }, true);
    }
    expect(franchise.localTelemetry.length).toBeLessThanOrEqual(150);
    const disabled = recordLocalTelemetry(franchise, "roomOpened", "Disabled", undefined, false);
    expect(disabled.localTelemetry.length).toBe(franchise.localTelemetry.length);

    const report = createBugReport(franchise, { userNote: "test note" });
    expect(report.recentTelemetry.length).toBeGreaterThan(0);
    expect(report.fullSaveJson).toBeUndefined();
    expect(serializeBugReport(report)).toContain("schemaVersion");
  });
});

describe("Phase 8 audio, broadcast, accessibility, fan, and owner QA", () => {
  it("has valid generated audio cues and no-ops without Web Audio", () => {
    const cueIds = AUDIO_CUES.map((cue) => cue.id);
    expect(requiredAudioCueIds().every((id) => cueIds.includes(id))).toBe(true);
    expect(clampVolume(2)).toBe(1);
    expect(clampVolume(-1)).toBe(0);
    const engine = new GeneratedAudioEngine({});
    expect(engine.isAvailable()).toBe(false);
    expect(engine.playCue("ui-click", { audioEnabled: true, masterVolume: 1, uiVolume: 1, ambienceVolume: 1, broadcastVolume: 1 })).toBe(false);
  });

  it("builds broadcast story data without raw ids and respects reduced-motion flags", () => {
    const franchise = createFranchise("harbor-city", "phase8-broadcast");
    const result = simulateOneUserGame(franchise).result;
    const intro = createBroadcastIntro(franchise, result);
    const beats = createGameNarrativeBeats(result, franchise.league.teams, true);
    expect(intro.homeName).not.toBe(result.homeTeamId);
    expect(findTurningPoint(result)?.description).toBeTruthy();
    expect(beats.every((beat) => beat.animation === false)).toBe(true);
    expect(JSON.stringify(beats)).not.toContain("player-");
  });

  it("keeps accessibility settings and shortcuts valid", () => {
    const settings = normalizeSettings({ highContrastMode: true, largerText: true, reduceFlashes: true });
    const keys = getKeyboardShortcuts().map((shortcut) => shortcut.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(getAccessibilitySettingsSummary(settings).join(" ")).toContain("High contrast");
    expect(getUiScaleClass(settings)).toContain("larger-text");
    expect(getContrastClass(settings)).toContain("high-contrast");
    expect(normalizeSettings({ masterVolume: 3, tutorialMode: "guided" }).masterVolume).toBe(1);
    expect(DEFAULT_SETTINGS.telemetryEnabledLocalOnly).toBe(true);
  });

  it("samples targeted fan sentiment and captures owner goal outcomes before refresh", () => {
    const franchise = createFranchise("harbor-city", "phase8-fan-owner");
    expect(runFanSentimentScenario(franchise, "starTraded").delta).toBeLessThan(0);
    expect(runFanSentimentScenario(franchise, "championship").delta).toBeGreaterThan(0);
    expect(runFanSentimentScenario(franchise, "playoffMiss").delta).toBeLessThan(0);
    expect(runFanSentimentScenario(franchise, "bigFreeAgentSigned").delta).toBeGreaterThan(0);

    const goal = franchise.ownerState.seasonGoals[0];
    const withMetGoal: FranchiseState = {
      ...franchise,
      seasonPhase: "seasonReview",
      ownerState: {
        ...franchise.ownerState,
        seasonGoals: [{ ...goal, type: "stayUnderCap", progress: 1, target: 0, status: "met" }, ...franchise.ownerState.seasonGoals.slice(1)]
      }
    };
    const captured = captureOwnerGoalOutcomes(withMetGoal);
    const report = createOwnerGoalReport(captured);
    expect(report.met).toBeGreaterThan(0);
    expect(report.completionRate).toBeGreaterThan(0);
    expect(report.byCategory.performance.total + report.byCategory.cap.total + report.byCategory.draft.total + report.byCategory.development.total).toBe(report.total);
  });
});

describe("Phase 8 release-candidate smoke flow", () => {
  it("creates a franchise, guides a first loop, simulates to a win, saves/imports, checks invariants, and runs a mini playtest", () => {
    let franchise = createFranchise("harbor-city", {
      seed: "phase8-smoke",
      gmName: "Release Candidate",
      gameMode: "standardDynasty",
      difficulty: "standard",
      storyFrequency: "normal",
      startPreset: "balanced"
    });
    franchise = completeTutorialStep(franchise, "move-facility");
    franchise = { ...franchise, assistantGmReports: [generateAssistantGmReport(franchise, { type: "daily", date: franchise.league.currentDate })] };
    expect(franchise.assistantGmReports[0].recommendations.length).toBeGreaterThan(0);

    let lastResult: GameResult | undefined;
    for (let safety = 0; safety < 12; safety += 1) {
      const applied = simulateOneUserGame(franchise);
      franchise = applied.franchise;
      lastResult = applied.result;
      const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId)!;
      if (team.record.wins > 0) break;
    }
    expect(lastResult).toBeTruthy();
    franchise = evaluateAchievements(franchise);
    expect(franchise.achievements.find((item) => item.id === "first-win")?.unlockedAt).toBeTruthy();

    const restored = importSaveFromJson(exportSaveToJson(franchise));
    expect(restored.schemaVersion).toBe(SCHEMA_VERSION);
    expect(restored.tutorialState).toBeTruthy();
    expect(restored.achievements.length).toBeGreaterThan(10);
    expect(validateDynastyInvariants(restored).errors).toHaveLength(0);

    const report = runDynastyPlaytest("phase8-mini-playtest", 2, "harbor-city", { storyFrequency: "normal" });
    expect(report.seasonsCompleted).toBe(2);
    expect(report.errors).toHaveLength(0);
    expect(report.finalFranchise.schemaVersion).toBe(SCHEMA_VERSION);
    expect(report.livingOps.ownerGoalCompletionRate).toBeGreaterThanOrEqual(0);
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
    franchise: evaluateAchievements({
      ...franchise,
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
        currentDayIndex: nextGame?.dayIndex ?? currentDayIndex,
        currentDate: nextGame?.date ?? franchise.league.currentDate,
        completed: !nextGame
      },
      lastResult: result
    })
  };
}
