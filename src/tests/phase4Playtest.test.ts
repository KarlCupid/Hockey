import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { TeamCrest } from "../components/branding/TeamCrest";
import { createFranchise } from "../game/generators/generateLeague";
import { SeededRng } from "../game/rng";
import { getAllTeamBranding, hasCompleteFictionalBranding, TEAM_BRANDING } from "../game/assets/teamBranding";
import { getJerseyTemplates } from "../game/assets/jerseyTemplates";
import { deterministicPortraitKey } from "../game/assets/portraitRegistry";
import { generateBalanceReport, assertReportFinite } from "../game/systems/balanceReport";
import { validateDynastyInvariants } from "../game/systems/dynastyInvariants";
import { runDynastyPlaytest } from "../game/systems/dynastyPlaytest";
import { autoCompleteDraft, resolveDraftLottery } from "../game/systems/draftExecution";
import { createFreeAgentMarket, completeFreeAgency } from "../game/systems/freeAgency";
import {
  getAdvancePreview,
  getDangerWarnings,
  getPhaseDescription,
  getPhaseLabel,
  getRecommendedNextAction
} from "../game/systems/phaseGuidance";
import { signProspect } from "../game/systems/prospects";
import {
  exportSaveToJson,
  importSaveFromJson,
  safeDeserializeFranchise,
  serializeFranchise,
  validateSaveIntegrity
} from "../game/systems/saves";
import { advanceSeasonPhase, completeRegularSeason } from "../game/systems/seasonLifecycle";
import { simulatePlayoffsUntil } from "../game/systems/playoffs";
import { dedupeNewsItems, groupLowPriorityNews, createPhaseTransitionNews, createMilestoneNews } from "../game/systems/storyEngine";
import { estimateMarketSalary } from "../game/systems/contracts";
import { TUNING, isPlausibleSalaryRange } from "../game/systems/tuning";
import { DEFAULT_SETTINGS, normalizeSettings, parseSettings, serializeSettings } from "../store/settingsStore";
import type { FranchiseState, NewsItem, SeasonPhase } from "../game/types";

describe("Phase 4 dynasty invariants and playtest harness", () => {
  it("passes invariants on a new franchise", () => {
    const franchise = createFranchise("harbor-city", "phase4-new");
    const report = validateDynastyInvariants(franchise);

    expect(report.valid).toBe(true);
    expect(report.summary.teams).toBe(12);
  });

  it("completes a deterministic three-season playtest with no fatal errors", () => {
    const report = runDynastyPlaytest("phase4-three-season", 3);

    expect(report.seasonsCompleted).toBe(3);
    expect(report.errors).toEqual([]);
    expect(report.championHistory.length).toBeGreaterThan(0);
  });

  it("keeps player IDs unique after draft, free agency, prospect signing, and new seasons", () => {
    const report = runDynastyPlaytest("phase4-unique-players", 3);
    const ids = report.finalFranchise.league.teams.flatMap((team) => team.roster.map((player) => player.id));

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("maintains draft pick ownership consistency", () => {
    const report = runDynastyPlaytest("phase4-pick-owners", 3);
    report.finalFranchise.league.teams.forEach((team) => {
      team.draftPicks.forEach((pick) => expect(pick.ownerTeamId).toBe(team.id));
    });
  });

  it("serializes and imports after three simulated seasons", () => {
    const report = runDynastyPlaytest("phase4-save-roundtrip", 3);
    const restored = importSaveFromJson(exportSaveToJson(report.finalFranchise));

    expect(restored.league.seasonYear).toBe(report.finalFranchise.league.seasonYear);
    expect(validateDynastyInvariants(restored).valid).toBe(true);
  });

  it("does not double-apply champion, draft, free-agency, or new-season transitions", () => {
    const completed = completeRegularSeason(createFranchise("harbor-city", "phase4-repeat"), new SeededRng("phase4-repeat"));
    const championed = simulatePlayoffsUntil(completed, "champion", "phase4-repeat");
    const reviewA = advanceSeasonPhase(championed, new SeededRng("repeat-review"));
    const reviewB = advanceSeasonPhase(championed, new SeededRng("repeat-review"));
    expect(reviewA.history.champions.length).toBe(reviewB.history.champions.length);

    const lottery = advanceSeasonPhase(advanceSeasonPhase(reviewA, new SeededRng("repeat-retire")), new SeededRng("repeat-lottery"));
    const drafted = autoCompleteDraft(lottery, new SeededRng("repeat-draft"));
    const draftedAgain = autoCompleteDraft(drafted, new SeededRng("repeat-draft"));
    expect(draftedAgain.offseasonState?.draftState?.selections.length).toBe(drafted.offseasonState?.draftState?.selections.length);

    const fa = { ...drafted, seasonPhase: "freeAgency" as const, freeAgencyState: createFreeAgentMarket(drafted, new SeededRng("repeat-fa")) };
    const completedFa = completeFreeAgency(fa);
    expect(completeFreeAgency(completedFa).freeAgencyState?.currentDay).toBe(completedFa.freeAgencyState?.currentDay);

    const camp = { ...completedFa, seasonPhase: "trainingCamp" as const };
    const next = advanceSeasonPhase(camp, new SeededRng("repeat-camp"));
    const repeated = advanceSeasonPhase(next, new SeededRng("repeat-camp"));
    expect(repeated.league.seasonYear).toBe(next.league.seasonYear);
  });
});

describe("Phase 4 balance report and tuning", () => {
  it("returns finite numeric summaries", () => {
    const report = generateBalanceReport(["balance-a"], 1);

    expect(assertReportFinite(report)).toBe(true);
    expect(report.leagueScoring.averageGoalsPerGame).toBeGreaterThan(0);
  });

  it("produces non-empty champion history across five seeded seasons", () => {
    const report = generateBalanceReport(["seed-a", "seed-b", "seed-c", "seed-d", "seed-e"], 1);

    expect(report.ownerGameplay.champions.length).toBeGreaterThan(0);
    expect(assertReportFinite(report)).toBe(true);
  });

  it("keeps tuning salary ranges plausible", () => {
    const franchise = createFranchise("harbor-city", "salary-plausible");
    const players = franchise.league.teams.flatMap((team) => team.roster);
    const starSalary = Math.max(...players.filter((player) => player.overall >= TUNING.economy.starOverallThreshold).map(estimateMarketSalary));
    const depthSalary = Math.min(...players.filter((player) => player.overall <= TUNING.economy.depthOverallThreshold).map(estimateMarketSalary));

    expect(isPlausibleSalaryRange(starSalary, depthSalary)).toBe(true);
  });
});

describe("Phase 4 phase guidance", () => {
  const phases: SeasonPhase[] = [
    "regularSeason",
    "playoffs",
    "seasonReview",
    "retirements",
    "draftLottery",
    "draft",
    "reSigning",
    "freeAgency",
    "staffHiring",
    "trainingCamp",
    "preseason",
    "completed"
  ];

  it("has label, description, and recommended action for every phase", () => {
    const franchise = createFranchise("harbor-city", "phase-guidance");
    phases.forEach((phase) => {
      const adjusted = { ...franchise, seasonPhase: phase };
      expect(getPhaseLabel(phase).length).toBeGreaterThan(0);
      expect(getPhaseDescription(adjusted).length).toBeGreaterThan(0);
      expect(getRecommendedNextAction(adjusted).length).toBeGreaterThan(0);
    });
  });

  it("warns about unsigned UFAs when advancing from re-signing", () => {
    const franchise = createFranchise("harbor-city", "ufa-warning");
    const team = franchise.league.teams[0];
    const ufa = { ...team.roster[0], contract: { ...team.roster[0].contract, yearsRemaining: 0, expiryStatus: "UFA" as const } };
    const adjusted = {
      ...franchise,
      seasonPhase: "reSigning" as const,
      league: { ...franchise.league, teams: [{ ...team, roster: [ufa, ...team.roster.slice(1)] }, ...franchise.league.teams.slice(1)] }
    };

    expect(getDangerWarnings(adjusted).some((warning) => warning.includes("UFA"))).toBe(true);
  });

  it("warns if the user has a pending draft pick", () => {
    const franchise = createFranchise("harbor-city", "draft-warning");
    const draftState = resolveDraftLottery(franchise, new SeededRng("draft-warning"));
    const adjusted = {
      ...franchise,
      selectedTeamId: draftState.draftOrder[0],
      seasonPhase: "draft" as const,
      offseasonState: {
        year: franchise.league.seasonYear,
        retiredPlayerIds: [],
        retiredPlayerNames: [],
        reSigningCompleted: false,
        trainingCampCompleted: false,
        phaseLog: [],
        draftState: { ...draftState, userPickPending: true }
      }
    };

    expect(getDangerWarnings(adjusted).some((warning) => warning.includes("Round"))).toBe(true);
    expect(getAdvancePreview(adjusted)).toContain("re-signing");
  });

  it("starts a new franchise guide in regular-season mode", () => {
    const franchise = createFranchise("harbor-city", "guide-start");

    expect(getPhaseLabel(franchise.seasonPhase)).toBe("Regular Season");
    expect(getRecommendedNextAction(franchise)).toContain("simulate");
  });
});

describe("Phase 4 save integrity", () => {
  it("returns an error for corrupt JSON instead of crashing", () => {
    const result = safeDeserializeFranchise("{nope");

    expect(result.error).toBeTruthy();
  });

  it("repairs missing Phase 3 fields", () => {
    const legacy = JSON.parse(serializeFranchise(createFranchise("harbor-city", "missing-fields"))) as FranchiseState;
    delete (legacy as Partial<FranchiseState>).staffState;
    delete (legacy as Partial<FranchiseState>).ownerState;
    delete (legacy as Partial<FranchiseState>).history;
    delete (legacy as Partial<FranchiseState>).prospectPools;

    const result = safeDeserializeFranchise(JSON.stringify(legacy));

    expect(result.franchise?.staffState.teamStaff[result.franchise.selectedTeamId].length).toBeGreaterThanOrEqual(7);
    expect(result.warnings.some((warning) => warning.includes("Repaired missing field"))).toBe(true);
  });

  it("reports duplicate player IDs", () => {
    const franchise = createFranchise("harbor-city", "duplicate-warning");
    const duplicate = franchise.league.teams[0].roster[0].id;
    const adjusted = {
      ...franchise,
      league: {
        ...franchise.league,
        teams: [
          { ...franchise.league.teams[0], roster: [{ ...franchise.league.teams[0].roster[0] }, { ...franchise.league.teams[0].roster[1], id: duplicate }, ...franchise.league.teams[0].roster.slice(2)] },
          ...franchise.league.teams.slice(1)
        ]
      }
    };

    expect(validateSaveIntegrity(adjusted).warnings.some((warning) => warning.includes("Duplicate player id"))).toBe(true);
  });

  it("roundtrips export/import and validates imported saves", () => {
    const franchise = createFranchise("harbor-city", "import-validate");
    const imported = importSaveFromJson(exportSaveToJson(franchise));

    expect(validateSaveIntegrity(imported).errors).toEqual([]);
    expect(imported.selectedTeamId).toBe(franchise.selectedTeamId);
  });
});

describe("Phase 4 fictional branding", () => {
  it("defines branding and jerseys for every fictional team", () => {
    expect(getAllTeamBranding()).toHaveLength(12);
    expect(hasCompleteFictionalBranding()).toBe(true);
    getAllTeamBranding().forEach((brand) => {
      expect(getJerseyTemplates(brand.teamId).home.baseColor).toBeTruthy();
    });
  });

  it("renders fictional crests without raw real hockey names", () => {
    const markup = renderToStaticMarkup(createElement(TeamCrest, { teamId: "harbor-city" }));

    expect(markup).not.toMatch(/NHL|Maple Leafs|Canadiens|Rangers/i);
    expect(markup).toContain("HCB");
  });

  it("creates deterministic player portrait keys", () => {
    const first = deterministicPortraitKey("player-a", "C", 22, "Leader");
    const second = deterministicPortraitKey("player-a", "C", 22, "Leader");

    expect(first).toBe(second);
  });

  it("keeps the branding registry clear of real hockey team names", () => {
    expect(JSON.stringify(TEAM_BRANDING)).not.toMatch(/NHL|Maple Leafs|Canadiens|Rangers|Bruins|Oilers/i);
  });
});

describe("Phase 4 settings and story engine", () => {
  it("has valid settings defaults and serialization", () => {
    const roundtrip = parseSettings(serializeSettings(DEFAULT_SETTINGS));

    expect(roundtrip.confirmPhaseAdvances).toBe(true);
    expect(normalizeSettings({ uiScale: "spacious" }).uiScale).toBe("spacious");
  });

  it("can reset guide tokens", () => {
    const settings = normalizeSettings({ dynastyGuideResetToken: 4 });

    expect({ ...settings, dynastyGuideResetToken: settings.dynastyGuideResetToken + 1 }.dynastyGuideResetToken).toBe(5);
  });

  it("dedupes repeated news and groups low-priority stories", () => {
    const item: NewsItem = {
      id: "cap-a",
      type: "cap",
      date: "2026-10-03",
      headline: "Cap warning",
      body: "Same warning",
      severity: "low"
    };
    const deduped = dedupeNewsItems([item, { ...item, id: "cap-b" }]);
    const grouped = groupLowPriorityNews(Array.from({ length: 8 }, (_, index) => ({ ...item, id: `low-${index}`, body: `Low ${index}` })), 5);

    expect(deduped).toHaveLength(1);
    expect(grouped.some((news) => news.headline.includes("grouped"))).toBe(true);
  });

  it("creates one phase transition story and champion milestone with fictional team", () => {
    const franchise = completeRegularSeason(createFranchise("harbor-city", "story-phase"), new SeededRng("story-phase"));
    const phaseStories = createPhaseTransitionNews(franchise, "regularSeason", "playoffs");
    const championed = simulatePlayoffsUntil({ ...franchise, seasonPhase: "playoffs" as const }, "champion", "story-phase");
    const championStory = createMilestoneNews(championed, "champion")[0];

    expect(phaseStories).toHaveLength(1);
    expect(championStory.headline).not.toMatch(/NHL|Maple Leafs|Canadiens|Rangers/i);
  });

  it("keeps three-season playtests from producing empty rosters and creates varied draft prospects", () => {
    const report = runDynastyPlaytest("phase4-roster-health", 3);
    const minRoster = Math.min(...report.finalFranchise.league.teams.map((team) => team.roster.length));
    const risks = new Set(report.finalFranchise.scouting.draftClass.map((prospect) => prospect.risk));

    expect(minRoster).toBeGreaterThan(0);
    expect(risks.size).toBeGreaterThan(1);
  });
});
