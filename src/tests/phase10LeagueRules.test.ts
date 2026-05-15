import { describe, expect, it } from "vitest";
import { createCustomFranchiseFromDataPack, generateLeagueFromTemplate } from "../game/generators/generateCustomLeague";
import { generateScheduleForRuleSet, validateSchedule } from "../game/generators/generateSchedule";
import { SeededRng } from "../game/rng";
import { nextGameForTeam, simulateGame } from "../game/simulation/simulateGame";
import { createBugReport } from "../game/systems/bugReport";
import { repairDataPack, validateDataPack, createDefaultDataPack } from "../game/systems/dataPacks";
import { createDraftOrder, autoCompleteDraft } from "../game/systems/draftExecution";
import { transferPick } from "../game/systems/draftPicks";
import { validateDynastyInvariants } from "../game/systems/dynastyInvariants";
import {
  createDefaultRuleSet,
  createRuleSetForTeamCount,
  getRuleSetDescription,
  getSupportedLeagueSizes,
  normalizeLeagueRuleSet,
  validateLeagueRuleSet
} from "../game/systems/leagueRules";
import { createPlayoffState, advancePlayoffSeries, simulatePlayoffsUntil } from "../game/systems/playoffs";
import { repairAllTeamRosters } from "../game/systems/aiRosterManagement";
import { applyGameToStandings } from "../game/systems/standings";
import { completeRegularSeason, advanceSeasonPhase } from "../game/systems/seasonLifecycle";
import { advanceFreeAgencyDay } from "../game/systems/freeAgency";
import { exportSaveToJson, importSaveFromJson } from "../game/systems/saves";
import { updatePackRuleSet } from "../components/editors/DataPackLibrary";
import type { DataPack, FranchiseState, GameResult, LeagueSize, PlayoffSeriesFormat } from "../game/types";

const SIZES: LeagueSize[] = [8, 10, 12, 16];

describe("Phase 10 league rule presets", () => {
  it("validates rule presets for every supported size and describes them", () => {
    expect(getSupportedLeagueSizes()).toEqual([8, 10, 12, 16]);
    SIZES.forEach((size) => {
      const rules = createRuleSetForTeamCount(size);
      const report = validateLeagueRuleSet(rules);
      expect(report.valid, `${size}-team rules should validate`).toBe(true);
      expect(report.supported).toBe(true);
      expect(getRuleSetDescription(rules)).toContain(`${size} teams`);
    });
    expect(createDefaultRuleSet().teamCount).toBe(12);
    expect(createDefaultRuleSet().gamesPerTeam).toBe(22);
  });

  it("rejects unsupported team counts and unsupported playoff formats", () => {
    expect(validateLeagueRuleSet({ teamCount: 14 }).supported).toBe(false);
    expect(validateLeagueRuleSet({ teamCount: 8, playoffFormat: "top8" }).errors.join(" ")).toContain("not supported");
    expect(validateLeagueRuleSet({ ...createRuleSetForTeamCount(8), draftClassSize: 8 }).errors.join(" ")).toContain("Draft class");
  });
});

describe("Phase 10 schedule generation", () => {
  it("creates deterministic valid schedules for 8, 10, 12, and 16 teams", () => {
    SIZES.forEach((size) => {
      const franchise = franchiseForSize(size, `schedule-${size}`);
      const rules = franchise.league.ruleSet;
      const schedule = generateScheduleForRuleSet(franchise.league.teams, rules, `deterministic-${size}`);
      const again = generateScheduleForRuleSet(franchise.league.teams, rules, `deterministic-${size}`);
      const report = validateSchedule(schedule, franchise.league.teams, rules);
      expect(schedule).toEqual(again);
      expect(report.valid, report.errors.join("; ")).toBe(true);
      expect(Object.values(report.gamesPerTeam)).toEqual(Array(size).fill(rules.gamesPerTeam));
      expect(schedule.every((game) => game.homeTeamId !== game.awayTeamId)).toBe(true);
      expect(schedule.every((game) => franchise.league.teams.some((team) => team.id === game.homeTeamId) && franchise.league.teams.some((team) => team.id === game.awayTeamId))).toBe(true);
      expect(report.homeAwayBalanceWarnings.length).toBeLessThanOrEqual(size);
    });
  });
});

describe("Phase 10 playoff engine", () => {
  it("builds and resolves top4, top6 with byes, top8, and top10 play-in brackets", () => {
    const cases = [
      { size: 8 as LeagueSize, playoffFormat: "top4" as const },
      { size: 8 as LeagueSize, playoffFormat: "top6WithByes" as const },
      { size: 10 as LeagueSize, playoffFormat: "top6WithByes" as const },
      { size: 12 as LeagueSize, playoffFormat: "top8" as const },
      { size: 16 as LeagueSize, playoffFormat: "top8" as const },
      { size: 16 as LeagueSize, playoffFormat: "top10WithPlayIn" as const }
    ];
    cases.forEach(({ size, playoffFormat }) => {
      const franchise = rankedFranchise(franchiseForSize(size, `playoffs-${size}-${playoffFormat}`, { playoffFormat }));
      const withPlayoffs = { ...franchise, playoffState: createPlayoffState(franchise.league), seasonPhase: "playoffs" as const };
      if (playoffFormat === "top10WithPlayIn") expect(withPlayoffs.playoffState.playInGames).toHaveLength(2);
      const resolved = simulatePlayoffsUntil(withPlayoffs, "champion", `resolve-${size}-${playoffFormat}`);
      expect(resolved.playoffState?.completed).toBe(true);
      expect(resolved.playoffState?.championTeamId).toBeTruthy();
    });
  });

  it("marks best-of-3/5/7 series complete at the correct win count", () => {
    const wins: Record<PlayoffSeriesFormat, number> = { singleGame: 1, bestOf3: 2, bestOf5: 3, bestOf7: 4 };
    (["singleGame", "bestOf3", "bestOf5", "bestOf7"] as PlayoffSeriesFormat[]).forEach((seriesFormat) => {
      const franchise = rankedFranchise(franchiseForSize(8, `series-${seriesFormat}`, { playoffSeriesFormat: seriesFormat }));
      const state = createPlayoffState(franchise.league);
      const series = state.bracket[0];
      const advanced = advancePlayoffSeries({
        ...state,
        bracket: [{ ...series, homeWins: wins[seriesFormat] }, ...state.bracket.slice(1)]
      });
      expect(advanced.bracket[0].completed).toBe(true);
      expect(advanced.bracket[0].winnerTeamId).toBe(series.homeSeedTeamId);
    });
  });
});

describe("Phase 10 draft execution", () => {
  it("uses rule-set draft rounds, sufficient draft classes, and no duplicate AI selections", () => {
    const cases = [
      { size: 8 as LeagueSize, rounds: 3, picks: 24 },
      { size: 10 as LeagueSize, rounds: 5, picks: 50 },
      { size: 12 as LeagueSize, rounds: 4, picks: 48 },
      { size: 16 as LeagueSize, rounds: 7, picks: 112 }
    ];
    cases.forEach(({ size, rounds, picks }) => {
      const franchise = franchiseForSize(size, `draft-${size}-${rounds}`, { draftRounds: rounds });
      const order = createDraftOrder(franchise);
      expect(order.draftOrder).toHaveLength(picks);
      expect(franchise.scouting.draftClass.length).toBeGreaterThanOrEqual(picks);
      const drafted = autoCompleteDraft({ ...franchise, offseasonState: { year: franchise.league.seasonYear, draftState: order, retiredPlayerIds: [], retiredPlayerNames: [], reSigningCompleted: false, trainingCampCompleted: false, phaseLog: [] }, seasonPhase: "draft" }, new SeededRng(`ai-${size}`));
      const selections = drafted.offseasonState?.draftState?.selections ?? [];
      expect(new Set(selections.map((selection) => selection.prospectId)).size).toBe(selections.length);
      expect(drafted.history.draftHistory.length).toBe(selections.length);
    });
  });

  it("honors traded picks in custom draft order", () => {
    const franchise = franchiseForSize(8, "draft-trade");
    const [from, to, ...rest] = franchise.league.teams;
    const pick = from.draftPicks.find((candidate) => candidate.round === 1)!;
    const transferred = transferPick(pick.id, from, to);
    const next: FranchiseState = {
      ...franchise,
      league: {
        ...franchise.league,
        teams: [transferred.fromTeam, transferred.toTeam, ...rest]
      }
    };
    const order = createDraftOrder(next);
    expect(order.pickContexts?.find((context) => context.pickId === pick.id)?.ownerTeamId).toBe(to.id);
  });
});

describe("Phase 10 custom leagues, data packs, saves, and dry runs", () => {
  it("creates 8, 10, 12, and 16 team custom franchises that pass invariants, sim, save, and import", () => {
    SIZES.forEach((size) => {
      const pack = packForSize(size);
      expect(validateDataPack(pack).valid).toBe(true);
      const league = generateLeagueFromTemplate(pack.leagueTemplate!, `league-${size}`);
      expect(league.teams).toHaveLength(size);
      const franchise = createCustomFranchiseFromDataPack(pack, pack.leagueTemplate!.teams[0].id, undefined, { seed: `custom-${size}` });
      expect(validateDynastyInvariants(franchise).errors).toEqual([]);
      const applied = simulateOneUserGame(franchise);
      expect(applied.result.finalScore.home + applied.result.finalScore.away).toBeGreaterThanOrEqual(0);
      const restored = importSaveFromJson(exportSaveToJson(applied.franchise));
      expect(restored.league.ruleSet.teamCount).toBe(size);
      expect(validateDynastyInvariants(restored).errors).toEqual([]);
    });
  });

  it("repairs old data packs, rejects unsupported sizes and bad playoff formats, and updates team count safely", () => {
    const base = createDefaultDataPack();
    const oldPack: DataPack = {
      ...base,
      leagueTemplate: {
        ...base.leagueTemplate!,
        rules: undefined
      }
    };
    expect(repairDataPack(oldPack).pack.leagueTemplate?.rules?.teamCount).toBe(12);
    const fourteen = { ...base, leagueTemplate: { ...base.leagueTemplate!, teamCount: 14, rules: { ...base.leagueTemplate!.rules!, teamCount: 14 as never } } };
    expect(validateDataPack(fourteen).valid).toBe(false);
    expect(repairDataPack(fourteen).pack.leagueTemplate?.teamCount).toBe(12);
    const badPlayoff = updatePackRuleSet(base, { teamCount: 8, playoffFormat: "top8" });
    expect(validateDataPack(badPlayoff).valid).toBe(false);
    const sixteen = updatePackRuleSet(base, { teamCount: 16 });
    expect(sixteen.leagueTemplate?.teams).toHaveLength(16);
    expect(validateDataPack(sixteen).valid).toBe(true);
  });

  it("hydrates schema 7 saves and bug reports include rule summaries", () => {
    const franchise = franchiseForSize(16, "schema-seven");
    const raw = JSON.parse(exportSaveToJson(franchise)) as FranchiseState;
    raw.schemaVersion = 7;
    delete (raw.league as Partial<typeof raw.league>).ruleSet;
    const restored = importSaveFromJson(JSON.stringify(raw));
    expect(restored.schemaVersion).toBe(8);
    expect(restored.league.ruleSet.teamCount).toBe(16);
    expect(createBugReport(restored).ruleSetSummary).toContain("16 teams");
  });

  it("runs two-season custom dry runs for 8, 10, and 16 teams without fatal invariant errors", () => {
    ([8, 10, 16] as LeagueSize[]).forEach((size) => {
      const final = runTwoSeasonMini(franchiseForSize(size, `dry-${size}`), `dry-${size}`);
      expect(validateDynastyInvariants(final).errors).toEqual([]);
      expect(final.history.champions.length).toBeGreaterThanOrEqual(1);
    });
  });
});

function packForSize(size: LeagueSize, patch: Partial<FranchiseState["league"]["ruleSet"]> = {}): DataPack {
  return updatePackRuleSet(createDefaultDataPack(), { teamCount: size, ...patch });
}

function franchiseForSize(size: LeagueSize, seed: string, patch: Partial<FranchiseState["league"]["ruleSet"]> = {}): FranchiseState {
  const pack = packForSize(size, patch);
  return createCustomFranchiseFromDataPack(pack, pack.leagueTemplate!.teams[0].id, undefined, { seed });
}

function rankedFranchise(franchise: FranchiseState): FranchiseState {
  const teams = franchise.league.teams.map((team, index) => ({
    ...team,
    record: {
      ...team.record,
      wins: Math.max(1, franchise.league.teams.length - index),
      losses: index,
      overtimeLosses: 0,
      points: (franchise.league.teams.length - index) * 2,
      goalsFor: 100 - index,
      goalsAgainst: 50 + index,
      streak: `W${Math.max(1, franchise.league.teams.length - index)}`
    }
  }));
  return { ...franchise, league: { ...franchise.league, teams } };
}

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
            ? { ...candidate, played: true, result: { homeGoals: result.finalScore.home, awayGoals: result.finalScore.away, overtime: result.finalScore.overtime } }
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

function runTwoSeasonMini(start: FranchiseState, seed: string): FranchiseState {
  let franchise = start;
  for (let season = 0; season < 2; season += 1) {
    franchise = repairAllTeamRosters(franchise, "preGame");
    franchise = completeRegularSeason(franchise, new SeededRng(`${seed}-regular-${season}`));
    franchise = importSaveFromJson(exportSaveToJson(franchise));
    franchise = simulatePlayoffsUntil(franchise, "champion", `${seed}-playoffs-${season}`);
    franchise = advanceSeasonPhase(franchise, new SeededRng(`${seed}-review-${season}`));
    franchise = advanceSeasonPhase(franchise, new SeededRng(`${seed}-retire-${season}`));
    franchise = advanceSeasonPhase(franchise, new SeededRng(`${seed}-lottery-${season}`));
    franchise = autoCompleteDraft(franchise, new SeededRng(`${seed}-draft-${season}`));
    franchise = advanceSeasonPhase(franchise, new SeededRng(`${seed}-resign-${season}`));
    while (franchise.freeAgencyState && !franchise.freeAgencyState.completed) {
      franchise = advanceFreeAgencyDay(franchise, new SeededRng(`${seed}-fa-${season}-${franchise.freeAgencyState.currentDay}`));
    }
    franchise = repairAllTeamRosters(franchise, "postFreeAgency");
    franchise = advanceSeasonPhase(franchise, new SeededRng(`${seed}-staff-${season}`));
    franchise = advanceSeasonPhase(franchise, new SeededRng(`${seed}-camp-${season}`));
    franchise = repairAllTeamRosters(franchise, "newSeason");
    franchise = importSaveFromJson(exportSaveToJson(franchise));
  }
  return franchise;
}
