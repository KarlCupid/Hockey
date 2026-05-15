import { generateDraftClass } from "../generators/generateDraftClass";
import { emptyRecord, emptyTeamStats } from "../generators/generateLeague";
import { generateSchedule } from "../generators/generateSchedule";
import { DRAFT_PICK_ROUNDS } from "../constants";
import { SeededRng } from "../rng";
import { simulateGame } from "../simulation/simulateGame";
import { repairAllTeamRosters } from "./aiRosterManagement";
import { keepUnsignedRFAsAsRights, releaseUnsignedUFAsToMarket } from "./contractNegotiation";
import { generateInitialDraftPicks } from "./draftPicks";
import { createDraftOrder, resolveDraftLottery } from "./draftExecution";
import { createFreeAgentMarket } from "./freeAgency";
import { createAwards, createSeasonHistory as createHistorySeason } from "./history";
import { autoFillBestLineup } from "./lineupValidation";
import { createDefaultOwnerState, createOwnerEvaluationNews, evaluateJobSecurity, generateOwnerGoals, updateOwnerGoalProgress } from "./owner";
import { captureOwnerGoalOutcomes } from "./ownerGoalReporting";
import {
  agePlayers as agePlayersPure,
  applyOffseasonDevelopment,
  decrementContracts as decrementContractsPure,
  recoverFatigueAndInjuries as recoverFatigueAndInjuriesPure,
  resetPlayerSeasonStats as resetPlayerSeasonStatsPure,
  runRetirements
} from "./playerLifecycle";
import { createPlayoffState } from "./playoffs";
import { applyGameToStandings } from "./standings";
import { generateStaffMarket, tickStaffContracts } from "./staff";
import { runTrainingCampRosterSetup } from "./trainingCamp";
import type { FranchiseState, LeagueState, ScheduleGame, SeasonHistory, SeasonPhase, Team } from "../types";

export function getSeasonPhase(franchise: FranchiseState): SeasonPhase {
  return franchise.seasonPhase ?? (franchise.league.completed ? "seasonReview" : "regularSeason");
}

export function canAdvanceSeasonPhase(franchise: FranchiseState): boolean {
  const phase = getSeasonPhase(franchise);
  if (phase === "regularSeason") return franchise.league.completed || franchise.league.schedule.every((game) => game.played);
  if (phase === "playoffs") return Boolean(franchise.playoffState?.completed);
  if (phase === "draft") return Boolean(franchise.offseasonState?.draftState?.completed);
  if (phase === "freeAgency") return Boolean(franchise.freeAgencyState?.completed);
  return phase !== "completed";
}

export function advanceSeasonPhase(franchise: FranchiseState, rng = new SeededRng(`${franchise.franchiseId}-phase-${franchise.seasonPhase}`)): FranchiseState {
  const phase = getSeasonPhase(franchise);
  if (phase === "regularSeason") {
    if (!franchise.league.completed && !franchise.league.schedule.every((game) => game.played)) return franchise;
    const completed = franchise.league.completed ? franchise : completeRegularSeason(franchise, rng);
    return {
      ...completed,
      seasonPhase: "playoffs",
      playoffState: completed.playoffState ?? createPlayoffState(completed.league),
      updatedAt: new Date().toISOString()
    };
  }
  if (phase === "playoffs") {
    if (!franchise.playoffState?.completed) return franchise;
    return { ...franchise, seasonPhase: "seasonReview", updatedAt: new Date().toISOString() };
  }
  if (phase === "seasonReview") {
    const archived = captureOwnerGoalOutcomes(archiveSeasonHistory(franchise));
    const ownerState = evaluateJobSecurity(archived);
    const ownerNews = createOwnerEvaluationNews({ ...archived, ownerState });
    return {
      ...archived,
      ownerState: {
        ...ownerState,
        messages: [...ownerNews, ...ownerState.messages].slice(0, 12)
      },
      inbox: [...ownerNews, ...archived.inbox].slice(0, 60),
      seasonPhase: "retirements",
      updatedAt: new Date().toISOString()
    };
  }
  if (phase === "retirements") {
    const aged = agePlayers(decrementContracts(franchise));
    const developed = applyOffseasonDevelopment(aged, rng);
    const recovered = recoverFatigueAndInjuries(developed);
    return {
      ...runRetirements(recovered, rng),
      seasonPhase: "draftLottery",
      updatedAt: new Date().toISOString()
    };
  }
  if (phase === "draftLottery") {
    const draftState = resolveDraftLottery(franchise, rng);
    return {
      ...franchise,
      offseasonState: {
        ...(franchise.offseasonState ?? defaultOffseason(franchise)),
        draftState,
        phaseLog: [`Lottery resolved for ${franchise.league.seasonYear}.`, ...(franchise.offseasonState?.phaseLog ?? [])].slice(0, 12)
      },
      seasonPhase: "draft",
      inbox: [
        {
          id: `draft-lottery-${franchise.league.seasonYear}`,
          type: "draft" as const,
          date: franchise.league.currentDate,
          headline: "Draft Room: Lottery order locked",
          body: "The bottom four clubs shuffled for top-four drama; traded picks still draft for their current owners.",
          severity: "medium" as const,
          teamId: franchise.selectedTeamId
        },
        ...franchise.inbox
      ].slice(0, 60),
      updatedAt: new Date().toISOString()
    };
  }
  if (phase === "draft") {
    if (!franchise.offseasonState?.draftState?.completed) return franchise;
    return { ...franchise, seasonPhase: "reSigning", updatedAt: new Date().toISOString() };
  }
  if (phase === "reSigning") {
    const resolvedContracts = keepUnsignedRFAsAsRights(releaseUnsignedUFAsToMarket(franchise));
    return {
      ...resolvedContracts,
      offseasonState: {
        ...(resolvedContracts.offseasonState ?? defaultOffseason(resolvedContracts)),
        reSigningCompleted: true
      },
      freeAgencyState: resolvedContracts.freeAgencyState ?? createFreeAgentMarket(resolvedContracts, rng),
      seasonPhase: "freeAgency",
      updatedAt: new Date().toISOString()
    };
  }
  if (phase === "freeAgency") {
    if (!franchise.freeAgencyState?.completed) return franchise;
    return repairAllTeamRosters({ ...franchise, seasonPhase: "staffHiring", updatedAt: new Date().toISOString() }, "postFreeAgency");
  }
  if (phase === "staffHiring") {
    return repairAllTeamRosters({ ...franchise, seasonPhase: "trainingCamp", updatedAt: new Date().toISOString() }, "trainingCamp");
  }
  if (phase === "trainingCamp" || phase === "preseason") {
    return prepareNextSeason(franchise, rng);
  }
  return franchise;
}

export function completeRegularSeason(franchise: FranchiseState, rng = new SeededRng(`${franchise.franchiseId}-complete-regular`)): FranchiseState {
  const repaired = repairAllTeamRosters(franchise, "preGame");
  let league = {
    ...repaired.league,
    teams: repaired.league.teams.map((team) => ({ ...team, lines: autoFillBestLineup(team).lineup }))
  };
  league.schedule
    .filter((game) => !game.played)
    .sort((a, b) => a.dayIndex - b.dayIndex)
    .forEach((game) => {
      const result = simulateGame({
        game,
        homeTeam: findTeam(league, game.homeTeamId),
        awayTeam: findTeam(league, game.awayTeamId),
        seed: `${franchise.franchiseId}-${game.id}-${rng.next()}`
      });
      const withStandings = applyGameToStandings(league, result);
      league = {
        ...withStandings,
        schedule: withStandings.schedule.map((candidate) =>
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
          `${findTeam(withStandings, game.awayTeamId).abbreviation} ${result.finalScore.away} @ ${findTeam(withStandings, game.homeTeamId).abbreviation} ${result.finalScore.home}`,
          ...withStandings.recentResults
        ].slice(0, 10)
      };
    });
  const lastGame = [...league.schedule].sort((a, b) => b.dayIndex - a.dayIndex)[0];
  return {
    ...repaired,
    league: {
      ...league,
      currentDayIndex: lastGame?.dayIndex ?? league.currentDayIndex,
      currentDate: lastGame?.date ?? league.currentDate,
      completed: true
    },
    seasonPhase: "playoffs",
    playoffState: franchise.playoffState ?? createPlayoffState(league),
    updatedAt: new Date().toISOString()
  };
}

export function createSeasonReview(franchise: FranchiseState): SeasonHistory {
  return createHistorySeason(franchise);
}

export function archiveSeasonHistory(franchise: FranchiseState): FranchiseState {
  if (franchise.history.seasons.some((season) => season.seasonYear === franchise.league.seasonYear)) return franchise;
  const season = createSeasonReview(franchise);
  const awards = createAwards(franchise);
  const championTeam = season.championTeamId ? franchise.league.teams.find((team) => team.id === season.championTeamId) : undefined;
  return {
    ...franchise,
    history: {
      ...franchise.history,
      seasons: [season, ...franchise.history.seasons],
      champions: championTeam
        ? [
            {
              seasonYear: franchise.league.seasonYear,
              teamId: championTeam.id,
              teamName: championTeam.fullName
            },
            ...franchise.history.champions
          ]
        : franchise.history.champions,
      awards: [...awards, ...franchise.history.awards],
      transactionHistory: [...franchise.transactionLog, ...franchise.history.transactionHistory].slice(0, 120)
    }
  };
}

export function prepareNextSeason(franchise: FranchiseState, rng = new SeededRng(`${franchise.franchiseId}-next-season`)): FranchiseState {
  const nextYear = franchise.league.seasonYear + 1;
  let next = captureOwnerGoalOutcomes(runTrainingCampRosterSetup(franchise, rng));
  next = resetPlayerSeasonStats(next);
  next = recoverFatigueAndInjuries(next);
  next = tickStaffContracts(next);
  next = generateNewSeasonSchedule(next, nextYear);
  next = generateNewDraftClassForSeason(next, rng);
  next = ensureFutureDraftPicks(next, nextYear);
  const ownerState = createDefaultOwnerState(
    {
      ...next,
      league: { ...next.league, seasonYear: nextYear },
      seasonPhase: "regularSeason"
    },
    rng
  );
  const opened: FranchiseState = {
    ...next,
    seasonPhase: "regularSeason",
    playoffState: undefined,
    offseasonState: {
      year: nextYear,
      retiredPlayerIds: [],
      retiredPlayerNames: [],
      reSigningCompleted: false,
      trainingCampCompleted: false,
      phaseLog: [`Training camp completed. ${nextYear} season opened.`]
    },
    freeAgencyState: undefined,
    staffState: {
      ...next.staffState,
      staffMarket: [...next.staffState.staffMarket, ...generateStaffMarket(rng, 6)].slice(0, 24)
    },
    ownerState,
    inbox: [...ownerState.messages, ...next.inbox].slice(0, 60),
    currentSeasonId: `${nextYear}-${next.selectedTeamId}`,
    updatedAt: new Date().toISOString()
  };
  return repairAllTeamRosters(opened, "newSeason");
}

export function resetPlayerSeasonStats(franchise: FranchiseState): FranchiseState {
  return resetPlayerSeasonStatsPure(franchise);
}

export function decrementContracts(franchise: FranchiseState): FranchiseState {
  return decrementContractsPure(franchise);
}

export function agePlayers(franchise: FranchiseState): FranchiseState {
  return agePlayersPure(franchise);
}

export function recoverFatigueAndInjuries(franchise: FranchiseState): FranchiseState {
  return recoverFatigueAndInjuriesPure(franchise);
}

export function generateNewSeasonSchedule(franchise: FranchiseState, forcedYear?: number): FranchiseState {
  const seasonYear = forcedYear ?? franchise.league.seasonYear + 1;
  const teams = franchise.league.teams.map((team) => ({
    ...team,
    record: emptyRecord(),
    stats: emptyTeamStats()
  }));
  const schedule = generateSchedule(teams).map((game) => withSeasonYear(game, seasonYear));
  return {
    ...franchise,
    league: {
      ...franchise.league,
      id: `${franchise.league.id}-${seasonYear}`,
      seasonYear,
      currentDayIndex: 0,
      currentDate: schedule[0]?.date ?? `${seasonYear}-10-03`,
      teams,
      schedule,
      recentResults: [],
      completed: false
    }
  };
}

export function generateNewDraftClassForSeason(franchise: FranchiseState, rng = new SeededRng(`${franchise.franchiseId}-new-draft`)): FranchiseState {
  const draftClass = generateDraftClass(`${franchise.franchiseId}-draft-${franchise.league.seasonYear}-${rng.next()}`);
  return {
    ...franchise,
    scouting: {
      ...franchise.scouting,
      draftClass,
      teamDraftBoard: draftClass.map((prospect) => prospect.id),
      watchlist: [],
      lastScoutingTickDayIndex: franchise.league.currentDayIndex
    }
  };
}

export function validateDynastyState(franchise: FranchiseState): string[] {
  const warnings: string[] = [];
  if (!franchise.seasonPhase) warnings.push("Missing season phase.");
  if (!franchise.staffState?.teamStaff) warnings.push("Missing staff state.");
  if (!franchise.history) warnings.push("Missing league history.");
  if (!franchise.ownerState?.seasonGoals) warnings.push("Missing owner goals.");
  franchise.league.teams.forEach((team) => {
    if (!franchise.prospectPools[team.id]) warnings.push(`Missing prospect pool for ${team.fullName}.`);
  });
  if (franchise.offseasonState?.draftState && franchise.offseasonState.draftState.draftOrder.length < franchise.league.teams.length * DRAFT_PICK_ROUNDS) {
    warnings.push("Draft order is shorter than expected.");
  }
  return warnings;
}

function ensureFutureDraftPicks(franchise: FranchiseState, seasonYear: number): FranchiseState {
  const existingIds = new Set(franchise.league.teams.flatMap((team) => team.draftPicks.map((pick) => pick.id)));
  const generated = generateInitialDraftPicks(franchise.league.teams, seasonYear);
  const additions = generated.filter((pick) => pick.seasonYear >= seasonYear && !existingIds.has(pick.id));
  const teams = franchise.league.teams.map((team) => ({
    ...team,
    draftPicks: [
      ...team.draftPicks.filter((pick) => pick.seasonYear >= seasonYear),
      ...additions.filter((pick) => pick.ownerTeamId === team.id)
    ].sort((a, b) => a.seasonYear - b.seasonYear || a.round - b.round || a.originalTeamId.localeCompare(b.originalTeamId))
  }));
  return {
    ...franchise,
    league: {
      ...franchise.league,
      teams
    }
  };
}

function withSeasonYear(game: ScheduleGame, seasonYear: number): ScheduleGame {
  return {
    ...game,
    id: `${seasonYear}-${game.id}`,
    date: `${seasonYear}${game.date.slice(4)}`
  };
}

function defaultOffseason(franchise: FranchiseState) {
  return {
    year: franchise.league.seasonYear,
    draftState: createDraftOrder(franchise),
    retiredPlayerIds: [],
    retiredPlayerNames: [],
    reSigningCompleted: false,
    trainingCampCompleted: false,
    phaseLog: []
  };
}

function findTeam(league: LeagueState, teamId: string): Team {
  const team = league.teams.find((candidate) => candidate.id === teamId);
  if (!team) throw new Error(`Team not found: ${teamId}`);
  return team;
}
