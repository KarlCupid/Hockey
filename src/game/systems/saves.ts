import localforage from "localforage";
import { z } from "zod";
import { AUTOSAVE_SLOT_ID, SALARY_CAP_CEILING, SALARY_CAP_FLOOR, SAVE_SLOT_COUNT, SCHEMA_VERSION } from "../constants";
import { generateDraftClass } from "../generators/generateDraftClass";
import { SeededRng } from "../rng";
import type { FranchiseState, LeagueHistory, OwnerState, Player, ProspectRights, SaveSlotMetadata, ScoutingState, StaffState, Team } from "../types";
import { contractSummary, createContractForPlayer } from "./contracts";
import { generateInitialDraftPicks } from "./draftPicks";
import { createDefaultOwnerState } from "./owner";
import { createPlayoffState } from "./playoffs";
import { generateScoutingAssignments, rankDraftBoard } from "./scouting";
import { generateStaffForLeague } from "./staff";
import { recordString } from "./standings";
import { generateTradeBlock, generateUntouchables, inferTeamNeeds } from "./trades";

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

export function saveKey(slotId: string): string {
  return `franchise-ice:${slotId}`;
}

export function serializeFranchise(franchise: FranchiseState): string {
  return JSON.stringify({
    ...franchise,
    saveStatus: "idle"
  });
}

export function deserializeFranchise(payload: string): FranchiseState {
  const parsed = JSON.parse(payload) as FranchiseState;
  const result = saveSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("Save data is missing required franchise fields.");
  }
  if (parsed.schemaVersion > SCHEMA_VERSION) {
    throw new Error(`Unsupported save schema version ${parsed.schemaVersion}.`);
  }
  return hydrateFranchiseState(parsed);
}

export function hydrateFranchiseState(input: FranchiseState): FranchiseState {
  const seasonYear = input.league.seasonYear;
  const teamsWithContracts = input.league.teams.map((team) => hydrateTeamPlayers(team, input.franchiseId));
  const generatedPicks = generateInitialDraftPicks(teamsWithContracts, seasonYear);
  const teamsWithAssets = teamsWithContracts.map((team) => {
    const existing = Array.isArray(team.draftPicks) ? team.draftPicks : [];
    const draftPicks = existing.length ? existing : generatedPicks.filter((pick) => pick.ownerTeamId === team.id);
    const withCap = {
      ...team,
      capCeiling: team.capCeiling ?? SALARY_CAP_CEILING,
      capFloor: team.capFloor ?? SALARY_CAP_FLOOR,
      draftPicks,
      teamNeeds: Array.isArray(team.teamNeeds) && team.teamNeeds.length ? team.teamNeeds : inferTeamNeeds({ ...team, draftPicks }),
      untouchables: Array.isArray(team.untouchables) ? team.untouchables : [],
      tradeBlock: Array.isArray(team.tradeBlock) ? team.tradeBlock : []
    };
    const untouchables = withCap.untouchables.length ? withCap.untouchables : generateUntouchables(withCap);
    return {
      ...withCap,
      untouchables,
      tradeBlock: withCap.tradeBlock.length ? withCap.tradeBlock : generateTradeBlock({ ...withCap, untouchables }),
      teamNeeds: inferTeamNeeds(withCap)
    };
  });
  const scouting = hydrateScouting(input);
  const phase = hydrateSeasonPhase(input);
  const staffState = hydrateStaffState(input, teamsWithAssets);
  const prospectPools = hydrateProspectPools(input, teamsWithAssets);
  const history = hydrateHistory(input);
  const ownerBase: FranchiseState = {
    ...input,
    schemaVersion: SCHEMA_VERSION,
    league: {
      ...input.league,
      teams: teamsWithAssets,
      recentResults: input.league.recentResults ?? [],
      completed: input.league.completed ?? input.league.schedule.every((game) => game.played)
    },
    seasonPhase: phase,
    currentSeasonId: input.currentSeasonId ?? `${input.league.seasonYear}-${input.selectedTeamId}`,
    staffState,
    history,
    ownerState: input.ownerState ?? emptyOwnerState(input),
    prospectPools,
    scouting,
    development: input.development ?? { plans: [], recentUpdates: [] },
    tradeHistory: input.tradeHistory ?? [],
    transactionLog: input.transactionLog ?? [],
    saveStatus: "idle"
  };
  const ownerState = hydrateOwnerState(ownerBase);

  return {
    ...ownerBase,
    ownerState,
    playoffState: input.playoffState ?? (phase === "playoffs" ? createPlayoffState(ownerBase.league) : undefined),
    offseasonState: input.offseasonState,
    freeAgencyState: input.freeAgencyState,
    scouting,
    saveStatus: "idle"
  };
}

export async function writeSave(slotId: string, franchise: FranchiseState): Promise<SaveSlotMetadata> {
  const updated: FranchiseState = { ...franchise, updatedAt: new Date().toISOString(), saveStatus: "idle" };
  const payload = serializeFranchise(updated);
  await localforage.setItem(saveKey(slotId), payload);
  return metadataFor(slotId, updated);
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

export function metadataFor(slotId: string, franchise: FranchiseState): SaveSlotMetadata {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId) as Team;
  const gameNumber = franchise.league.schedule.filter(
    (game) => game.played && (game.homeTeamId === team.id || game.awayTeamId === team.id)
  ).length;

  return {
    slotId,
    label: slotId === AUTOSAVE_SLOT_ID ? "Autosave" : `Slot ${slotId.replace("slot-", "")}`,
    teamName: team.fullName,
    currentDate: franchise.league.currentDate,
    gameNumber,
    record: recordString(team),
    lastSaved: franchise.updatedAt,
    seasonYear: franchise.league.seasonYear,
    schemaVersion: franchise.schemaVersion
  };
}

function hydrateTeamPlayers(team: Team, franchiseId: string): Team {
  return {
    ...team,
    roster: team.roster.map((player) => hydratePlayerContract(player, franchiseId))
  };
}

function hydratePlayerContract(player: Player, franchiseId: string): Player {
  const contract = player.contract ?? createContractForPlayer(player, new SeededRng(`${franchiseId}-${player.id}-contract`));
  return {
    ...player,
    contract,
    contractSummary: contractSummary(contract)
  };
}

function hydrateScouting(input: FranchiseState): ScoutingState {
  const existing = input.scouting;
  const draftClass = existing?.draftClass?.length ? existing.draftClass : generateDraftClass(`${input.franchiseId}-draft`);
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

function hydrateOwnerState(input: FranchiseState): OwnerState {
  if (input.ownerState?.seasonGoals?.length) {
    return {
      ...input.ownerState,
      messages: input.ownerState.messages ?? [],
      jobSecurity: input.ownerState.jobSecurity ?? 65,
      patience: input.ownerState.patience ?? input.league.teams.find((team) => team.id === input.selectedTeamId)?.ownerPatience ?? 60
    };
  }
  return createDefaultOwnerState(input, new SeededRng(`${input.franchiseId}-owner-repair`));
}

function emptyOwnerState(input: FranchiseState): OwnerState {
  return {
    jobSecurity: 65,
    patience: input.league.teams.find((team) => team.id === input.selectedTeamId)?.ownerPatience ?? 60,
    seasonGoals: [],
    messages: []
  };
}
