import { describe, expect, it, beforeAll } from "vitest";
import closedBetaChecklist from "../../CLOSED_BETA_CHECKLIST.md?raw";
import knownIssuesText from "../../KNOWN_ISSUES.md?raw";
import { createFranchise } from "../game/generators/generateLeague";
import { nextGameForTeam, simulateGame } from "../game/simulation/simulateGame";
import { evaluateAchievements } from "../game/systems/achievements";
import { assertClosedBetaReportFinite, generateClosedBetaBalanceReport, type ClosedBetaBalanceReport } from "../game/systems/balanceReport";
import { createFeedbackEntry, addFeedbackEntry, exportFeedbackBundle, summarizeFeedback, validateFeedbackEntry, type BetaFeedbackState } from "../game/systems/betaFeedback";
import { createBugReport, serializeBugReport } from "../game/systems/bugReport";
import { NARRATIVE_TEMPLATES } from "../game/content/narrativeTemplates";
import { getAudioCuePreviewItems, getTeamGoalHornVariant, AUDIO_CUES } from "../game/audio/audioCues";
import { GeneratedAudioEngine, clampVolume } from "../game/audio/audioEngine";
import { renderTemplate, validateNarrativeTemplates, type TemplateContext } from "../game/systems/narrativeTemplateEngine";
import { createFirstHourAssistantGmReport, getAfterFirstGameChecklist, getFirstHourChecklist, tutorialSkipKeepsGuideAvailable, validateOnboardingChecklist } from "../game/systems/onboarding";
import { createPostGameSummary, postGameSummaryHasRawIds } from "../game/systems/postGameSummary";
import { applyGameToStandings } from "../game/systems/standings";
import { skipTutorial } from "../game/systems/tutorial";
import { createFrictionRecommendation, detectUxFriction, summarizeUxFriction } from "../game/systems/uxFriction";
import { validateDynastyInvariants } from "../game/systems/dynastyInvariants";
import { useFeedbackStore } from "../store/feedbackStore";
import { useFranchiseStore } from "../store/franchiseStore";
import { getSeverityTone, getStatusToneClass, isValidStatusClass } from "../components/ui/statusStyles";
import type { FranchiseState, GameResult } from "../game/types";

let balanceV2: ClosedBetaBalanceReport;

beforeAll(() => {
  balanceV2 = generateClosedBetaBalanceReport(["phase12-balance"]);
});

describe("Phase 12 closed beta feedback and UX friction", () => {
  it("validates feedback entries", () => {
    const franchise = createFranchise("harbor-city", { seed: "phase12-feedback" });
    const entry = createFeedbackEntry({ category: "confusing", severity: "medium", headline: "Result flow confused me", notes: "I missed the next action.", includeDiagnostics: true, tags: ["first-hour"] }, franchise, { roomId: "arena" });
    expect(validateFeedbackEntry(entry)).toEqual([]);
    expect(entry.roomId).toBe("arena");
  });

  it("serializes feedback bundles", () => {
    const franchise = createFranchise("harbor-city", { seed: "phase12-feedback-bundle" });
    const entry = createFeedbackEntry({ category: "ui", severity: "low", headline: "Button hierarchy helped", notes: "Primary action was clear." }, franchise);
    const state = addFeedbackEntry({ entries: [] }, entry);
    const bundle = JSON.parse(exportFeedbackBundle(franchise, state));
    expect(bundle.bundleType).toBe("franchise-ice-closed-beta-feedback");
    expect(bundle.summary.total).toBe(1);
  });

  it("includes diagnostics when requested", () => {
    const franchise = createFranchise("harbor-city", { seed: "phase12-diagnostics" });
    const state = addFeedbackEntry({ entries: [] }, createFeedbackEntry({ category: "bug", severity: "high", headline: "Blocked sim", notes: "Roster looked valid.", includeDiagnostics: true }, franchise));
    const bundle = exportFeedbackBundle(franchise, state);
    expect(bundle).toContain("runtimeHealth");
    expect(bundle).toContain("saveIntegrity");
  });

  it("excludes full saves by default", () => {
    const franchise = createFranchise("harbor-city", { seed: "phase12-no-full-save" });
    const state = addFeedbackEntry({ entries: [] }, createFeedbackEntry({ category: "suggestion", severity: "low", headline: "Tiny note", notes: "Keep the summary card." }, franchise));
    expect(exportFeedbackBundle(franchise, state)).not.toContain("fullSaveJson");
  });

  it("caps and summarizes feedback entries", () => {
    const franchise = createFranchise("harbor-city", { seed: "phase12-feedback-cap" });
    let state: BetaFeedbackState = { entries: [] };
    for (let index = 0; index < 140; index += 1) {
      state = addFeedbackEntry(state, createFeedbackEntry({ headline: `Entry ${index}`, category: "positive", severity: "low", notes: "Local note" }, franchise));
    }
    expect(state.entries.length).toBeLessThanOrEqual(120);
    expect(summarizeFeedback(state.entries).categoryCounts.positive).toBeGreaterThan(0);
  });

  it("detects invalid roster sim friction", () => {
    const franchise = withInvalidRoster(createFranchise("harbor-city", { seed: "phase12-invalid-roster" }));
    const signals = detectUxFriction(franchise, [{ id: "sim-blocked", timestamp: new Date().toISOString(), type: "simBlocked", label: "Invalid roster blocked sim", details: { reason: "invalidRoster" } }]);
    expect(signals.some((signal) => signal.type === "invalidRosterSimBlocked")).toBe(true);
  });

  it("detects unresolved blocking actions", () => {
    const signals = detectUxFriction(withInvalidRoster(createFranchise("harbor-city", { seed: "phase12-blocking" })));
    expect(signals.some((signal) => signal.type === "blockingActionStale")).toBe(true);
  });

  it("serializes friction summaries", () => {
    const signals = detectUxFriction(withInvalidRoster(createFranchise("harbor-city", { seed: "phase12-friction-summary" })));
    const summary = summarizeUxFriction(signals);
    expect(JSON.stringify(summary)).toContain("invalidRosterSimBlocked");
  });

  it("creates Assistant GM friction recommendations", () => {
    const signal = detectUxFriction(withInvalidRoster(createFranchise("harbor-city", { seed: "phase12-friction-rec" })))[0];
    const recommendation = createFrictionRecommendation(signal);
    expect(recommendation.targetRoomId).toBeTruthy();
    expect(recommendation.body).toContain(signal.message.slice(0, 12));
  });

  it("detects Custom League Lab validation friction", () => {
    const franchise = createFranchise("harbor-city", { seed: "phase12-custom-lab-friction" });
    const signals = detectUxFriction(franchise, [
      { id: "lab-1", timestamp: new Date().toISOString(), type: "validationError", label: "Custom League Lab validation errors", details: { validationErrors: 2 } },
      { id: "lab-2", timestamp: new Date().toISOString(), type: "validationError", label: "Custom League Lab validation errors", details: { validationErrors: 1 } }
    ]);
    expect(signals.some((signal) => signal.type === "customLeagueValidationLoop")).toBe(true);
  });
});

describe("Phase 12 onboarding, content, and audio polish", () => {
  it("validates the first-hour checklist", () => {
    const checklist = getFirstHourChecklist(createFranchise("harbor-city", { seed: "phase12-first-hour" }));
    expect(validateOnboardingChecklist(checklist)).toEqual([]);
    expect(checklist.steps.some((step) => step.roomId === "arena")).toBe(true);
  });

  it("shows the after-first-game checklist after a result", () => {
    const { franchise } = simulateOneGame(createFranchise("harbor-city", { seed: "phase12-after-game" }));
    const checklist = getAfterFirstGameChecklist(franchise);
    expect(checklist.available).toBe(true);
    expect(validateOnboardingChecklist(checklist)).toEqual([]);
  });

  it("keeps the guide available after tutorial skip", () => {
    const skipped = skipTutorial(createFranchise("harbor-city", { seed: "phase12-skip" }));
    expect(tutorialSkipKeepsGuideAvailable(skipped)).toBe(true);
  });

  it("creates an Assistant GM first-hour report", () => {
    const report = createFirstHourAssistantGmReport(createFranchise("harbor-city", { seed: "phase12-first-hour-agm" }));
    expect(report.headline).toContain("First-hour");
    expect(report.recommendations.length).toBeGreaterThan(0);
  });

  it("validates expanded narrative templates", () => {
    expect(NARRATIVE_TEMPLATES.length).toBeGreaterThanOrEqual(160);
    expect(validateNarrativeTemplates(NARRATIVE_TEMPLATES)).toEqual([]);
  });

  it("renders templates without unresolved tokens", () => {
    const context: TemplateContext = {
      team: "Harbor City",
      opponent: "Northbank",
      rival: "Lakeview",
      player: "Mason Vale",
      prospect: "Evan Roque",
      agent: "Mira Kade",
      position: "center",
      record: "12-8-2",
      phase: "regular season",
      streak: "three-game slide",
      round: "first round",
      pick: "12",
      coach: "the coaching staff"
    };
    const rendered = NARRATIVE_TEMPLATES.flatMap((template) => [
      renderTemplate(template.headlineTemplate, context),
      renderTemplate(template.bodyTemplate, context),
      ...(template.optionTemplates ?? []).flatMap((option) => [
        renderTemplate(option.labelTemplate, context),
        renderTemplate(option.descriptionTemplate, context),
        renderTemplate(option.previewTemplate, context)
      ])
    ]);
    expect(rendered.some((line) => /\{[a-z]+\}/i.test(line))).toBe(false);
  });

  it("avoids obvious restricted real-world hockey terms", () => {
    expect(validateNarrativeTemplates(NARRATIVE_TEMPLATES)).toEqual([]);
  });

  it("keeps narrative headline and body lengths UI-safe", () => {
    expect(NARRATIVE_TEMPLATES.every((template) => template.headlineTemplate.length <= 80)).toBe(true);
    expect(NARRATIVE_TEMPLATES.every((template) => template.bodyTemplate.length <= 220)).toBe(true);
  });

  it("has preview labels for every audio cue", () => {
    expect(getAudioCuePreviewItems()).toHaveLength(AUDIO_CUES.length);
    expect(AUDIO_CUES.every((cue) => cue.previewLabel.length >= 4)).toBe(true);
  });

  it("creates deterministic team goal horn variants", () => {
    expect(getTeamGoalHornVariant("harbor-city")).toEqual(getTeamGoalHornVariant("harbor-city"));
    expect(getTeamGoalHornVariant("harbor-city").cueId).toBe("goal-horn");
  });

  it("keeps the audio engine safe when Web Audio is unavailable", () => {
    const engine = new GeneratedAudioEngine({});
    expect(engine.isAvailable()).toBe(false);
    expect(engine.playCue("ui-click", { audioEnabled: true, masterVolume: 1, uiVolume: 1, ambienceVolume: 1, broadcastVolume: 1 })).toBe(false);
  });

  it("clamps volume values", () => {
    expect(clampVolume(2)).toBe(1);
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume(undefined, 0.35)).toBe(0.35);
  });

  it("returns valid UI status helper classes", () => {
    expect(getSeverityTone("critical")).toBe("danger");
    expect(isValidStatusClass(getStatusToneClass("success"))).toBe(true);
  });
});

describe("Phase 12 post-game, balance, docs, and smoke", () => {
  it("resolves player and team names in post-game summaries", () => {
    const { franchise, result } = simulateOneGame(createFranchise("harbor-city", { seed: "phase12-summary-names" }));
    const summary = createPostGameSummary(franchise, result);
    expect(summary.headline).toContain(franchise.league.teams.find((team) => team.id === franchise.selectedTeamId)?.fullName ?? "");
  });

  it("does not expose raw ids in post-game summaries", () => {
    const { franchise, result } = simulateOneGame(createFranchise("harbor-city", { seed: "phase12-summary-ids" }));
    expect(postGameSummaryHasRawIds(createPostGameSummary(franchise, result))).toBe(false);
  });

  it("includes next recommendations in post-game summaries", () => {
    const { franchise, result } = simulateOneGame(createFranchise("harbor-city", { seed: "phase12-next-rec" }));
    expect(createPostGameSummary(franchise, result).nextRecommendation.label.length).toBeGreaterThan(0);
  });

  it("shows achievement fallout and respects reduced motion", () => {
    const { franchise, result } = simulateOneGame(createFranchise("harbor-city", { seed: "phase12-achievement" }));
    const summary = createPostGameSummary(evaluateAchievements(franchise, { type: "gameResult", result, won: true }), result, franchise.league.teams, { reducedMotion: true });
    expect(summary.cards.some((card) => card.id === "achievement-fallout")).toBe(true);
    expect(summary.animationFlags.scorePulse).toBe(false);
  });

  it("keeps balance report v2 finite", () => {
    expect(assertClosedBetaReportFinite(balanceV2)).toBe(true);
  });

  it("includes custom 8- and 16-team rule labels", () => {
    expect(balanceV2.customLeagueRuleSetHealth.find((item) => item.teamCount === 8)?.ruleLabel).toContain("8");
    expect(balanceV2.customLeagueRuleSetHealth.find((item) => item.teamCount === 16)?.ruleLabel).toContain("16");
  });

  it("includes emergency replacement counts and achievement rates", () => {
    expect(balanceV2.rosterRepairs.emergencyReplacementCount).toBeGreaterThanOrEqual(0);
    expect(Object.keys(balanceV2.achievementUnlockRates).length).toBeGreaterThan(0);
  });

  it("includes story cadence", () => {
    expect(balanceV2.storyCadence.eventsPerSeason).toBeGreaterThanOrEqual(0);
  });

  it("validates closed beta checklist documentation", () => {
    expect(closedBetaChecklist).toContain("Build commands");
    expect(closedBetaChecklist).toContain("First 30-minute playtest");
    expect(closedBetaChecklist).toContain("Release blocker checklist");
  });

  it("validates known issues documentation", () => {
    expect(knownIssuesText).toContain("three-r3f chunk warning");
    expect(knownIssuesText).toContain("Generated audio is placeholder");
    expect(knownIssuesText).toContain("No backend/cloud");
  });

  it("runs a store-level closed beta smoke", () => {
    useFranchiseStore.getState().startDemoFranchise();
    let franchise = useFranchiseStore.getState().franchise!;
    const entry = useFeedbackStore.getState().addEntry({ category: "positive", severity: "low", headline: "Demo flow worked", notes: "The first loop was readable.", includeDiagnostics: true }, franchise, { roomId: "gm" });
    expect(validateFeedbackEntry(entry)).toEqual([]);
    const sim = simulateOneGame(franchise);
    franchise = evaluateAchievements(sim.franchise, { type: "gameResult", result: sim.result, won: true });
    useFranchiseStore.setState({ franchise });
    const report = serializeBugReport(createBugReport(franchise, { userNote: "Smoke export" }));
    expect(report).toContain("uxFrictionSummary");
    expect(exportFeedbackBundle(franchise, useFeedbackStore.getState().feedbackState)).toContain("Demo flow worked");
    expect(validateDynastyInvariants(franchise).errors).toEqual([]);
  });
});

function simulateOneGame(franchise: FranchiseState): { franchise: FranchiseState; result: GameResult } {
  const game = nextGameForTeam(franchise.selectedTeamId, franchise.league.schedule, franchise.league.currentDayIndex)!;
  const result = simulateGame({
    game,
    homeTeam: franchise.league.teams.find((team) => team.id === game.homeTeamId)!,
    awayTeam: franchise.league.teams.find((team) => team.id === game.awayTeamId)!,
    seed: `phase12-${game.id}`
  });
  return {
    result,
    franchise: {
      ...franchise,
      league: applyGameToStandings(franchise.league, result),
      lastResult: result
    }
  };
}

function withInvalidRoster(franchise: FranchiseState): FranchiseState {
  return {
    ...franchise,
    league: {
      ...franchise.league,
      teams: franchise.league.teams.map((team) => (team.id === franchise.selectedTeamId ? { ...team, roster: [] } : team))
    }
  };
}
