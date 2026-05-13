import { create } from "zustand";
import { AUTOSAVE_SLOT_ID } from "../game/constants";
import { createFranchise } from "../game/generators/generateLeague";
import { clamp, SeededRng } from "../game/rng";
import { createGameNews } from "../game/systems/news";
import { autoFillBestLineup, validateLineup } from "../game/systems/lineupValidation";
import { applyGameToStandings, recordString } from "../game/systems/standings";
import { deleteSave, listSaveMetadata, readSave, writeSave } from "../game/systems/saves";
import { getCapWarnings } from "../game/systems/contracts";
import { assignDevelopmentPlan as assignDevelopmentPlanPure, removeDevelopmentPlan as removeDevelopmentPlanPure, tickDevelopment } from "../game/systems/development";
import {
  applyAcceptedContractOffer,
  createContractNegotiationNews,
  evaluateContractOffer
} from "../game/systems/contractNegotiation";
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
import { assembleGameResult, nextGameForTeam, simulateGame } from "../game/simulation/simulateGame";
import type { TacticKey } from "../game/systems/tactics";
import type {
  DevelopmentFocus,
  DevelopmentIntensity,
  FranchiseState,
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
  StaffRole,
  Tactics,
  Team,
  ContractOffer,
  TradeAsset,
  TradeEvaluation,
  TradeProposal
} from "../game/types";

interface FranchiseStore {
  franchise: FranchiseState | null;
  saves: SaveSlotMetadata[];
  loadError?: string;
  activeTradeProposal?: TradeProposal;
  lastTradeEvaluation?: TradeEvaluation;
  startNewFranchise: (teamId: string) => void;
  refreshSaves: () => Promise<void>;
  saveToSlot: (slotId: string) => Promise<void>;
  loadFromSlot: (slotId: string) => Promise<void>;
  deleteSlot: (slotId: string) => Promise<void>;
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
  submitContractOffer: (playerId: string, salary: number, years: number, rolePromise?: RoleExpectation) => void;
  submitFreeAgentOffer: (freeAgentId: string, salary: number, years: number, rolePromise?: RoleExpectation) => void;
  advanceFreeAgencyDay: () => void;
  completeFreeAgency: () => void;
  hireStaff: (staffId: string, role?: StaffRole) => void;
  fireStaff: (staffId: string) => void;
  replaceStaff: (outgoingStaffId: string, incomingStaffId: string) => void;
  tickFrontOfficeSystemsAfterGame: () => void;
}

export const useFranchiseStore = create<FranchiseStore>((set, get) => ({
  franchise: null,
  saves: [],
  loadError: undefined,
  activeTradeProposal: undefined,
  lastTradeEvaluation: undefined,
  startNewFranchise: (teamId) => {
    set({ franchise: createFranchise(teamId), loadError: undefined });
  },
  refreshSaves: async () => {
    const saves = await listSaveMetadata().catch(() => []);
    set({ saves });
  },
  saveToSlot: async (slotId) => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: { ...franchise, saveStatus: "saving" } });
    try {
      await writeSave(slotId, { ...franchise, updatedAt: new Date().toISOString() });
      const saves = await listSaveMetadata();
      set({ franchise: { ...franchise, saveStatus: "saved", updatedAt: new Date().toISOString() }, saves });
    } catch (error) {
      set({ franchise: { ...franchise, saveStatus: "error" }, loadError: error instanceof Error ? error.message : "Save failed" });
    }
  },
  loadFromSlot: async (slotId) => {
    try {
      const save = await readSave(slotId);
      if (!save) {
        set({ loadError: "No save exists in that slot." });
        return;
      }
      set({ franchise: save, loadError: undefined });
    } catch (error) {
      set({ loadError: error instanceof Error ? error.message : "Save could not be loaded." });
    }
  },
  deleteSlot: async (slotId) => {
    await deleteSave(slotId);
    await get().refreshSaves();
  },
  autoFillLineup: () => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: updateSelectedTeam(franchise, (team) => ({ ...team, lines: autoFillBestLineup(team).lineup })) });
  },
  setLineupSlot: (path, playerId) => {
    const franchise = get().franchise;
    if (!franchise) return;
    const team = selectedTeam(franchise);
    const player = team.roster.find((candidate) => candidate.id === playerId);
    if (!player || player.injuryStatus !== "healthy") return;
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
    set({ franchise: updateSelectedTeam(franchise, (candidate) => ({ ...candidate, lines: nextLineup })) });
  },
  setTactic: (key, value) => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({
      franchise: updateSelectedTeam(franchise, (team) => ({
        ...team,
        tactics: { ...team.tactics, [key]: clamp(value) }
      }))
    });
  },
  setTactics: (tactics) => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({
      franchise: updateSelectedTeam(franchise, (team) => ({
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
      }))
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
      const next = applyPlayoffGameResult(franchise, playoffGame, result);
      set({ franchise: { ...next, saveStatus: "saving" } });
      const saved = await writeSave(AUTOSAVE_SLOT_ID, next)
        .then(() => true)
        .catch(() => false);
      await get().refreshSaves();
      const latest = get().franchise;
      if (latest?.lastResult?.id === result.id) set({ franchise: { ...latest, saveStatus: saved ? "saved" : "error" } });
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
    set({ franchise: { ...next, saveStatus: autosave ? "saving" : next.saveStatus } });
    if (autosave) {
      const saved = await writeSave(AUTOSAVE_SLOT_ID, next)
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
    set({ franchise: completeRegularSeasonPure(franchise, new SeededRng(`${franchise.franchiseId}-sim-to-end`)) });
  },
  advanceSeasonPhase: () => {
    const franchise = get().franchise;
    if (!franchise) return;
    set({ franchise: advanceSeasonPhasePure(franchise, new SeededRng(`${franchise.franchiseId}-advance-${franchise.seasonPhase}`)) });
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
      lastTradeEvaluation: evaluateTrade(nextProposal, franchise.league)
    });
  },
  submitTradeProposal: async () => {
    const franchise = get().franchise;
    const proposal = get().activeTradeProposal;
    if (!franchise || !proposal) return undefined;
    const evaluation = evaluateTrade(proposal, franchise.league);
    const next = applyTrade({ ...proposal, status: evaluation.accepted ? "accepted" : "rejected" }, franchise);
    set({
      franchise: { ...next, saveStatus: evaluation.accepted ? "saving" : next.saveStatus },
      activeTradeProposal: evaluation.accepted ? undefined : { ...proposal, status: "rejected" },
      lastTradeEvaluation: evaluation
    });
    if (evaluation.accepted) {
      const saved = await writeSave(AUTOSAVE_SLOT_ID, next)
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
    set({
      franchise: updateSelectedTeam(franchise, (team) => ({
        ...team,
        tradeBlock: team.tradeBlock.includes(playerId) ? team.tradeBlock : [...team.tradeBlock, playerId].slice(-8)
      }))
    });
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
    set({ franchise: makeUserDraftSelectionPure(franchise, prospectId) });
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
    set({ franchise: signProspectPure(franchise, prospectId) });
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
    set({
      franchise: {
        ...franchise,
        inbox: [...createContractNegotiationNews(player, { ...offer, status: "rejected", evaluation }, evaluation, franchise.league.currentDate, team.id), ...franchise.inbox].slice(0, 60),
        updatedAt: new Date().toISOString()
      }
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
    set({ franchise: applyFreeAgentSigning({ ...franchise, freeAgencyState: state }, freeAgentId, offer) });
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
  }
}));

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
    inbox: [...news, ...franchise.inbox].slice(0, 40),
    lastResult: { ...result, newsEvents: news },
    updatedAt: new Date().toISOString()
  };
}

function simulateRemainingDay(franchise: FranchiseState, userGameId: string): FranchiseState {
  const day = franchise.league.currentDayIndex;
  const games = franchise.league.schedule.filter((game) => game.dayIndex === day && !game.played && game.id !== userGameId);
  let next = franchise;
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
  const refreshedLeague: LeagueState = {
    ...franchise.league,
    teams: franchise.league.teams.map(refreshFrontOfficeTeam)
  };
  const rng = new SeededRng(`${franchise.franchiseId}-front-office-${dayIndex}`);
  const scoutingResult =
    franchise.scouting.lastScoutingTickDayIndex === dayIndex
      ? { state: franchise.scouting, news: [] as NewsItem[] }
      : tickScouting(franchise.scouting, refreshedLeague, dayIndex, rng, franchise.staffState, franchise.selectedTeamId);
  const developmentResult = tickDevelopment(franchise.development, refreshedLeague, dayIndex, rng, franchise.staffState);
  const capNews = createCapAndContractNews({ ...franchise, league: developmentResult.league }, dayIndex);
  const frontOfficeNews = [...developmentResult.news, ...scoutingResult.news, ...capNews].map((item) => ({
    ...item,
    teamId: item.type === "scouting" ? franchise.selectedTeamId : item.teamId ?? franchise.selectedTeamId
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
      teamIds: item.teamId ? [item.teamId] : [franchise.selectedTeamId]
    }))
  ];

  return {
    ...franchise,
    league: {
      ...developmentResult.league,
      teams: developmentResult.league.teams.map(refreshFrontOfficeTeam)
    },
    scouting: scoutingResult.state,
    development: developmentResult.development,
    inbox: [...frontOfficeNews, ...franchise.inbox].slice(0, 40),
    transactionLog: [...transactions, ...franchise.transactionLog].slice(0, 30),
    updatedAt: new Date().toISOString()
  };
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
