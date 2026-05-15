import { describe, expect, it } from "vitest";
import { FICTIONAL_ARENA_NAMES } from "../game/content/arenaNames";
import { FICTIONAL_CITY_POOL } from "../game/content/fictionalCities";
import { FICTIONAL_RIVALRY_FLAVOR } from "../game/content/rivalryFlavor";
import { FICTIONAL_TEAM_NICKNAMES } from "../game/content/teamNamePools";
import { SCENARIO_TEMPLATES } from "../game/content/scenarioTemplates";
import { createCustomFranchiseFromDataPack, generateLeagueFromTemplate } from "../game/generators/generateCustomLeague";
import { SeededRng } from "../game/rng";
import { simulateGame, nextGameForTeam } from "../game/simulation/simulateGame";
import { applyGameToStandings } from "../game/systems/standings";
import {
  createDataPackFromCurrentLeague,
  createDefaultDataPack,
  createDefaultLeagueTemplate,
  createLeagueRulesPreset,
  exportDataPackJson,
  importDataPackJson,
  repairDataPack,
  validateDataPack
} from "../game/systems/dataPacks";
import { detectRealWorldContent } from "../game/systems/dataPackValidation";
import { validateDynastyInvariants } from "../game/systems/dynastyInvariants";
import { createScenarioDataPack, getBuiltInScenarios, validateBuiltInScenarios } from "../game/systems/scenarios";
import { exportSaveToJson, importSaveFromJson } from "../game/systems/saves";
import { createBugReport } from "../game/systems/bugReport";
import { completeRegularSeason, advanceSeasonPhase } from "../game/systems/seasonLifecycle";
import { simulatePlayoffsUntil } from "../game/systems/playoffs";
import { autoCompleteDraft } from "../game/systems/draftExecution";
import { advanceFreeAgencyDay } from "../game/systems/freeAgency";
import { repairAllTeamRosters } from "../game/systems/aiRosterManagement";
import { createRuleSetForTeamCount } from "../game/systems/leagueRules";
import { createDefaultEditorTeam, hasSafeGeneratedBranding, validateEditorTeam } from "../components/editors/TeamCreator";
import {
  autoBalanceCustomRoster,
  autoGenerateCustomRoster,
  createDefaultCustomPlayer,
  ensureUniqueCustomPlayerIds,
  validateCustomPlayerDefinition,
  validateRosterDepth
} from "../components/editors/RosterEditor";
import { autoBalanceDraftClass, createDraftClassPack, repairDuplicatePublicRanks, validateDraftClassPack } from "../components/editors/DraftClassEditor";
import { useDataPackStore } from "../store/dataPackStore";
import type { DataPack, FranchiseState, GameResult } from "../game/types";

describe("Phase 9 data-pack validation and safety", () => {
  it("validates generated packs, handles invalid JSON, flags duplicate IDs, ratings, positions, and real-world terms", () => {
    const pack = createDefaultDataPack();
    expect(validateDataPack(pack).valid).toBe(true);

    const invalidJson = importDataPackJson("{not json");
    expect(invalidJson.error).toBeTruthy();
    expect(invalidJson.report.valid).toBe(false);

    const duplicateTeamPack: DataPack = {
      ...pack,
      leagueTemplate: {
        ...pack.leagueTemplate!,
        teams: pack.leagueTemplate!.teams.map((team, index) => (index === 1 ? { ...team, id: pack.leagueTemplate!.teams[0].id } : team))
      }
    };
    expect(validateDataPack(duplicateTeamPack).duplicateIdWarnings.some((message) => message.includes("Duplicate team"))).toBe(true);

    const invalidPlayerPack: DataPack = {
      ...pack,
      leagueTemplate: {
        ...pack.leagueTemplate!,
        teams: [
          {
            ...pack.leagueTemplate!.teams[0],
            players: [{ ...createDefaultCustomPlayer("harbor-city", 0), position: "QB" as never, overall: 120 }]
          },
          ...pack.leagueTemplate!.teams.slice(1)
        ]
      }
    };
    const invalidReport = validateDataPack(invalidPlayerPack);
    expect(invalidReport.errors.some((message) => message.includes("invalid position"))).toBe(true);
    expect(invalidReport.errors.some((message) => message.includes("overall"))).toBe(true);
    expect(repairDataPack(invalidPlayerPack).pack.leagueTemplate?.teams[0].players?.[0].overall).toBe(99);

    const realWorldPack = { ...pack, name: "NHL Maple Leafs Scenario" };
    expect(validateDataPack(realWorldPack).realWorldContentFlags).toEqual(expect.arrayContaining(["NHL", "Maple Leafs"]));
  });

  it("roundtrips data-pack JSON and validates supported custom team counts honestly", () => {
    const pack = createDefaultDataPack();
    const imported = importDataPackJson(exportDataPackJson(pack));
    expect(imported.report.valid).toBe(true);
    expect(imported.pack?.name).toBe(pack.name);

    const template = createDefaultLeagueTemplate();
    const eightTeamRules = createRuleSetForTeamCount(8);
    const supported: DataPack = {
      ...pack,
      leagueTemplate: {
        ...template,
        id: "experimental-8",
        name: "Experimental 8",
        rules: eightTeamRules,
        teamCount: eightTeamRules.teamCount,
        scheduleLength: eightTeamRules.gamesPerTeam,
        playoffTeamCount: eightTeamRules.playoffTeamCount,
        playoffSeriesLength: eightTeamRules.playoffSeriesLength,
        draftRounds: eightTeamRules.draftRounds,
        capCeiling: eightTeamRules.capCeiling,
        capFloor: eightTeamRules.capFloor,
        teams: template.teams.slice(0, 8),
        rulesPreset: createLeagueRulesPreset("fictional-8-test", "Fictional 8 Test", 8)
      }
    };
    const supportedReport = validateDataPack(supported);
    expect(supportedReport.valid, supportedReport.errors.join("; ")).toBe(true);
    expect(supportedReport.supported).toBe(true);

    const unsupported: DataPack = {
      ...pack,
      leagueTemplate: {
        ...template,
        id: "experimental-14",
        name: "Experimental 14",
        teamCount: 14,
        teams: template.teams,
        rules: undefined,
        rulesPreset: { ...template.rulesPreset, teamCount: 14 }
      }
    };
    const unsupportedReport = validateDataPack(unsupported);
    expect(unsupportedReport.valid).toBe(false);
    expect(unsupportedReport.supported).toBe(false);
    expect([...unsupportedReport.errors, ...unsupportedReport.unsupportedReasons].join(" ")).toContain("8, 10, 12, or 16");
  });
});

describe("Phase 9 custom league generation and integration", () => {
  it("generates a valid 12-team custom franchise with schedule, caps, branding, save metadata, and first-game simulation", () => {
    const pack = createDefaultDataPack();
    const franchise = createCustomFranchiseFromDataPack(pack, "harbor-city", undefined, { seed: "phase9-custom-start" });
    const league = generateLeagueFromTemplate(pack.leagueTemplate!, "phase9-league");

    expect(league.teams).toHaveLength(12);
    expect(league.schedule.every((game) => league.teams.some((team) => team.id === game.homeTeamId) && league.teams.some((team) => team.id === game.awayTeamId))).toBe(true);
    expect(franchise.customLeagueName).toBe(pack.leagueTemplate?.name);
    expect(franchise.sourceDataPackId).toBe(pack.id);
    expect(franchise.league.teams[0].customBranding?.crestInitials).toBeTruthy();
    expect(franchise.league.teams.every((team) => team.capCeiling === pack.leagueTemplate?.capCeiling)).toBe(true);
    expect(validateDynastyInvariants(franchise).errors).toHaveLength(0);

    const applied = simulateOneUserGame(franchise);
    expect(applied.result.finalScore.home + applied.result.finalScore.away).toBeGreaterThanOrEqual(0);
    expect(validateDynastyInvariants(applied.franchise).errors).toHaveLength(0);

    const restored = importSaveFromJson(exportSaveToJson(applied.franchise));
    expect(restored.dataPackMetadata?.dataPackName).toBe(pack.name);
    expect(createBugReport(restored).dataPackMetadata?.dataPackId).toBe(pack.id);
  });

  it("exports the current league as a valid data pack and unlocks custom achievements on custom starts", () => {
    const pack = createDefaultDataPack();
    const franchise = createCustomFranchiseFromDataPack(pack, "harbor-city", undefined, { seed: "phase9-export-current" });
    const exported = createDataPackFromCurrentLeague(franchise);
    expect(validateDataPack(exported).valid).toBe(true);
    expect(exported.leagueTemplate?.teams[0].players?.length).toBeGreaterThan(20);
    expect(franchise.achievements.find((achievement) => achievement.id === "world-builder")?.unlockedAt).toBeTruthy();
  });
});

describe("Phase 9 editor helpers", () => {
  it("validates team creator defaults, colors, abbreviations, and safe generated branding", () => {
    const team = createDefaultEditorTeam(2);
    expect(validateEditorTeam(team)).toEqual([]);
    expect(hasSafeGeneratedBranding(team)).toBe(true);
    expect(validateEditorTeam({ ...team, abbreviation: "TOOLONG" }).some((message) => message.includes("abbreviation"))).toBe(true);
    expect(validateEditorTeam({ ...team, primaryColor: "blue" }).some((message) => message.includes("primary color"))).toBe(true);
  });

  it("validates, repairs, auto-generates, balances, and deduplicates custom rosters", () => {
    const player = createDefaultCustomPlayer("phase9", 0);
    expect(validateCustomPlayerDefinition(player)).toEqual([]);
    expect(validateCustomPlayerDefinition({ ...player, position: "QB" as never }).some((message) => message.includes("invalid position"))).toBe(true);

    const roster = autoGenerateCustomRoster("phase9-team", "phase9-roster", "goalieFirst");
    expect(validateRosterDepth(roster)).toEqual([]);
    expect(roster.filter((candidate) => candidate.position === "G").every((goalie) => goalie.overall >= 72)).toBe(true);

    const short = roster.filter((candidate) => candidate.position !== "G");
    expect(validateRosterDepth(short).some((message) => message.includes("goalies"))).toBe(true);
    expect(validateRosterDepth(autoBalanceCustomRoster(short, "phase9-team"))).toEqual([]);
    expect(new Set(ensureUniqueCustomPlayerIds([player, player], "phase9").map((candidate) => candidate.id)).size).toBe(2);
  });

  it("validates, repairs, balances, roundtrips, and applies custom draft classes", () => {
    const draft = createDraftClassPack("phase9-draft", 2027, 48);
    expect(validateDraftClassPack(draft)).toEqual([]);
    const tooSmall = createDraftClassPack("phase9-small-draft", 2027, 12);
    expect(validateDraftClassPack(tooSmall).some((message) => message.includes("at least"))).toBe(true);

    const duplicateRanks = repairDuplicatePublicRanks(draft.prospects.map((prospect) => ({ ...prospect, publicRank: 1 })));
    expect(new Set(duplicateRanks.map((prospect) => prospect.publicRank)).size).toBe(duplicateRanks.length);

    const balanced = autoBalanceDraftClass(tooSmall);
    expect(validateDraftClassPack(balanced)).toEqual([]);

    const pack = { ...createDefaultDataPack(), draftClass: balanced };
    const franchise = createCustomFranchiseFromDataPack(pack, "harbor-city", undefined, { seed: "phase9-custom-draft" });
    expect(franchise.scouting.draftClass.length).toBeGreaterThanOrEqual(48);
  });
});

describe("Phase 9 scenario starts", () => {
  it("validates built-in scenarios and applies cap, injury, owner, and story modifiers", () => {
    expect(getBuiltInScenarios()).toHaveLength(12);
    expect(validateBuiltInScenarios()).toEqual([]);

    const defaultPack = createDefaultDataPack();
    const capScenario = getBuiltInScenarios().find((scenario) => scenario.id === "cap-crunch")!;
    const capFranchise = createCustomFranchiseFromDataPack(createScenarioDataPack(capScenario, defaultPack), "harbor-city", undefined, { seed: "phase9-cap" });
    expect(capFranchise.league.teams.find((team) => team.id === capFranchise.selectedTeamId)?.capCeiling).toBeLessThan(defaultPack.leagueTemplate!.capCeiling);

    const injuryScenario = getBuiltInScenarios().find((scenario) => scenario.id === "injury-storm")!;
    const injuryFranchise = createCustomFranchiseFromDataPack(createScenarioDataPack(injuryScenario, defaultPack), "harbor-city", undefined, { seed: "phase9-injury" });
    expect(injuryFranchise.league.teams.find((team) => team.id === injuryFranchise.selectedTeamId)?.roster.some((player) => player.injuryStatus !== "healthy")).toBe(true);

    const ownerScenario = getBuiltInScenarios().find((scenario) => scenario.id === "owner-pressure-cooker")!;
    const ownerFranchise = createCustomFranchiseFromDataPack(createScenarioDataPack(ownerScenario, defaultPack), "harbor-city", undefined, { seed: "phase9-owner" });
    expect(ownerFranchise.ownerState.jobSecurity).toBeLessThan(65);
    expect(ownerFranchise.decisionEvents.some((event) => event.tags.includes("scenario"))).toBe(true);
    expect(ownerFranchise.storyArcs.some((arc) => arc.tags.includes("scenario"))).toBe(true);
    expect(ownerFranchise.achievements.find((achievement) => achievement.id === "scenario-specialist")?.unlockedAt).toBeTruthy();
    expect(validateDynastyInvariants(ownerFranchise).errors).toHaveLength(0);
  });
});

describe("Phase 9 data-pack store and custom playtest", () => {
  it("adds, lists, validates, imports, exports, and removes packs in the local data-pack store", async () => {
    const store = useDataPackStore.getState();
    const pack = { ...createDefaultDataPack(), id: "phase9-store-pack", name: "Phase 9 Store Pack" };
    const report = await store.addPack(pack);
    expect(report.valid).toBe(true);
    expect(useDataPackStore.getState().importedPacks.some((candidate) => candidate.id === pack.id)).toBe(true);
    expect(useDataPackStore.getState().validatePack(pack.id)?.valid).toBe(true);
    expect(useDataPackStore.getState().exportPackJson(pack.id)).toContain("Phase 9 Store Pack");

    const imported = await useDataPackStore.getState().importPackFromJson(exportDataPackJson({ ...pack, id: "phase9-store-import" }));
    expect(imported.report.valid).toBe(true);
    expect(useDataPackStore.getState().importedPacks.some((candidate) => candidate.id === "phase9-store-import")).toBe(true);

    await useDataPackStore.getState().removePack(pack.id);
    await useDataPackStore.getState().removePack("phase9-store-import");
    expect(useDataPackStore.getState().importedPacks.some((candidate) => candidate.id === pack.id)).toBe(false);
  });

  it("runs a two-season custom mini playtest with no fatal invariant errors", () => {
    let franchise = createCustomFranchiseFromDataPack(createDefaultDataPack(), "harbor-city", undefined, { seed: "phase9-two-season" });
    const errors: string[] = [];
    for (let season = 0; season < 2; season += 1) {
      franchise = repairAllTeamRosters(franchise, "preGame");
      franchise = completeRegularSeason(franchise, new SeededRng(`phase9-regular-${season}`));
      franchise = importSaveFromJson(exportSaveToJson(franchise));
      errors.push(...validateDynastyInvariants(franchise).errors.map((issue) => issue.message));
      franchise = simulatePlayoffsUntil(franchise, "champion", `phase9-playoffs-${season}`);
      franchise = importSaveFromJson(exportSaveToJson(franchise));
      errors.push(...validateDynastyInvariants(franchise).errors.map((issue) => issue.message));
      franchise = advanceSeasonPhase(franchise, new SeededRng(`phase9-review-${season}`));
      franchise = advanceSeasonPhase(franchise, new SeededRng(`phase9-retire-${season}`));
      franchise = advanceSeasonPhase(franchise, new SeededRng(`phase9-lottery-${season}`));
      franchise = autoCompleteDraft(franchise, new SeededRng(`phase9-draft-${season}`));
      franchise = advanceSeasonPhase(franchise, new SeededRng(`phase9-resign-${season}`));
      while (franchise.freeAgencyState && !franchise.freeAgencyState.completed) {
        franchise = advanceFreeAgencyDay(franchise, new SeededRng(`phase9-fa-${season}-${franchise.freeAgencyState.currentDay}`));
      }
      franchise = repairAllTeamRosters(franchise, "postFreeAgency");
      franchise = advanceSeasonPhase(franchise, new SeededRng(`phase9-staff-${season}`));
      franchise = advanceSeasonPhase(franchise, new SeededRng(`phase9-camp-${season}`));
      franchise = repairAllTeamRosters(franchise, "newSeason");
      franchise = importSaveFromJson(exportSaveToJson(franchise));
      errors.push(...validateDynastyInvariants(franchise).errors.map((issue) => issue.message));
    }
    expect(errors).toEqual([]);
    expect(franchise.customLeagueName).toBeTruthy();
  });

  it("keeps expanded fictional content deterministic and free of obvious restricted branding", () => {
    const content = [
      ...FICTIONAL_CITY_POOL,
      ...FICTIONAL_TEAM_NICKNAMES,
      ...FICTIONAL_ARENA_NAMES,
      ...FICTIONAL_RIVALRY_FLAVOR,
      ...SCENARIO_TEMPLATES.map((scenario) => `${scenario.name} ${scenario.description}`)
    ].join(" ");
    expect(detectRealWorldContent(content)).toEqual([]);
    expect(FICTIONAL_CITY_POOL.length).toBeGreaterThanOrEqual(20);
    expect(FICTIONAL_TEAM_NICKNAMES.length).toBeGreaterThanOrEqual(20);
    expect(createDefaultDataPack().leagueTemplate?.teams.map((team) => team.fullName)).toEqual(createDefaultDataPack().leagueTemplate?.teams.map((team) => team.fullName));
  });
});

describe("Phase 9 acceptance checklist spot checks", () => {
  it("returns a safe report for invalid JSON", () => {
    expect(importDataPackJson("nope").report.errors[0]).toContain("corrupt");
  });

  it("flags obvious restricted real-world hockey terms", () => {
    expect(detectRealWorldContent("National Hockey League Stanley Cup")).toEqual(expect.arrayContaining(["National Hockey League", "Stanley Cup"]));
  });

  it("flags duplicate team ids in league templates", () => {
    const pack = createDefaultDataPack();
    const duplicate = {
      ...pack,
      leagueTemplate: {
        ...pack.leagueTemplate!,
        teams: pack.leagueTemplate!.teams.map((team, index) => (index === 2 ? { ...team, id: pack.leagueTemplate!.teams[0].id } : team))
      }
    };
    expect(validateDataPack(duplicate).duplicateIdWarnings.length).toBeGreaterThan(0);
  });

  it("starts supported custom team counts and rejects unsupported dynasty counts", () => {
    const pack = createDefaultDataPack();
    const eightTeamRules = createRuleSetForTeamCount(8);
    const eightTeamLeague = generateLeagueFromTemplate({
      ...pack.leagueTemplate!,
      rules: eightTeamRules,
      teamCount: eightTeamRules.teamCount,
      scheduleLength: eightTeamRules.gamesPerTeam,
      playoffTeamCount: eightTeamRules.playoffTeamCount,
      playoffSeriesLength: eightTeamRules.playoffSeriesLength,
      draftRounds: eightTeamRules.draftRounds,
      teams: pack.leagueTemplate!.teams.slice(0, 8),
      rulesPreset: createLeagueRulesPreset("fictional-8-spot", "Fictional 8 Spot", 8)
    });
    expect(eightTeamLeague.teams).toHaveLength(8);
    expect(() =>
      generateLeagueFromTemplate({
        ...pack.leagueTemplate!,
        teamCount: 14,
        rules: undefined,
        teams: pack.leagueTemplate!.teams
      })
    ).toThrow(/8, 10, 12, or 16/);
  });

  it("validates a custom team branding preview source", () => {
    const team = createDefaultEditorTeam(4);
    expect(validateEditorTeam(team)).toEqual([]);
    expect(team.branding.crestShape).toBeTruthy();
  });

  it("flags draft classes with too few prospects", () => {
    expect(validateDraftClassPack(createDraftClassPack("tiny", 2028, 8)).some((message) => message.includes("at least"))).toBe(true);
  });

  it("starts scenario franchises with scenario metadata", () => {
    const scenario = getBuiltInScenarios()[1];
    const franchise = createCustomFranchiseFromDataPack(createScenarioDataPack(scenario, createDefaultDataPack()), "harbor-city", undefined, { seed: "phase9-metadata" });
    expect(franchise.dataPackMetadata?.scenarioName).toBe(scenario.name);
  });

  it("includes custom metadata in bug reports without full pack data", () => {
    const franchise = createCustomFranchiseFromDataPack(createDefaultDataPack(), "harbor-city", undefined, { seed: "phase9-bug-meta" });
    const report = createBugReport(franchise);
    expect(report.customLeagueName).toBeTruthy();
    expect(report.fullSaveJson).toBeUndefined();
  });

  it("keeps data-pack export JSON local and serializable", () => {
    const json = exportDataPackJson(createDefaultDataPack());
    expect(JSON.parse(json).fictionalOnly).toBe(true);
    expect(json).not.toContain("WebGLRenderer");
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
    }
  };
}
