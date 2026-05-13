import localforage from "localforage";
import { z } from "zod";
import { AUTOSAVE_SLOT_ID, SAVE_SLOT_COUNT, SCHEMA_VERSION } from "../constants";
import type { FranchiseState, SaveSlotMetadata, Team } from "../types";
import { recordString } from "./standings";

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
  if (parsed.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`Unsupported save schema version ${parsed.schemaVersion}.`);
  }
  return {
    ...parsed,
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
