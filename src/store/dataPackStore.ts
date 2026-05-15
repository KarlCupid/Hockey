import localforage from "localforage";
import { create } from "zustand";
import type { DataPack, DataPackValidationReport } from "../game/types";
import { exportDataPackJson, importDataPackJson, repairDataPack, validateDataPack } from "../game/systems/dataPacks";
import { useRuntimeHealthStore } from "./runtimeHealthStore";

const dataPackDb = localforage.createInstance({
  name: "FranchiseIce",
  storeName: "dataPacks"
});

const DATA_PACK_KEY_PREFIX = "franchise-ice:data-pack:";

interface DataPackStore {
  importedPacks: DataPack[];
  selectedPackId?: string;
  recentImports: string[];
  validationHistory: DataPackValidationReport[];
  loadPacks: () => Promise<void>;
  addPack: (pack: DataPack) => Promise<DataPackValidationReport>;
  removePack: (packId: string) => Promise<void>;
  selectPack: (packId?: string) => void;
  validatePack: (packId: string) => DataPackValidationReport | undefined;
  repairPack: (packId: string) => Promise<DataPackValidationReport | undefined>;
  importPackFromJson: (raw: string) => Promise<{ pack?: DataPack; report: DataPackValidationReport; error?: string }>;
  exportPackJson: (packId: string) => string | undefined;
  duplicatePack: (packId: string) => Promise<DataPack | undefined>;
  renamePack: (packId: string, name: string) => Promise<void>;
}

export const useDataPackStore = create<DataPackStore>((set, get) => ({
  importedPacks: [],
  selectedPackId: undefined,
  recentImports: [],
  validationHistory: [],
  loadPacks: async () => {
    try {
      const keys = (await dataPackDb.keys()).filter((key) => key.startsWith(DATA_PACK_KEY_PREFIX));
      const packs = await Promise.all(keys.map((key) => dataPackDb.getItem<DataPack>(key)));
      set({ importedPacks: packs.filter(Boolean) as DataPack[] });
    } catch {
      set((state) => ({ importedPacks: state.importedPacks }));
    }
  },
  addPack: async (pack) => {
    const report = validateDataPack(pack);
    logImportWarnings(report, `Data pack saved: ${pack.name}`);
    const ready = { ...pack, validation: report, updatedAt: new Date().toISOString() };
    set((state) => ({
      importedPacks: [ready, ...state.importedPacks.filter((candidate) => candidate.id !== ready.id)],
      selectedPackId: ready.id,
      recentImports: [ready.id, ...state.recentImports.filter((id) => id !== ready.id)].slice(0, 8),
      validationHistory: [report, ...state.validationHistory].slice(0, 20)
    }));
    await dataPackDb.setItem(packKey(ready.id), ready).catch(() => undefined);
    return report;
  },
  removePack: async (packId) => {
    set((state) => ({
      importedPacks: state.importedPacks.filter((pack) => pack.id !== packId),
      selectedPackId: state.selectedPackId === packId ? undefined : state.selectedPackId,
      recentImports: state.recentImports.filter((id) => id !== packId)
    }));
    await dataPackDb.removeItem(packKey(packId)).catch(() => undefined);
  },
  selectPack: (packId) => set({ selectedPackId: packId }),
  validatePack: (packId) => {
    const pack = get().importedPacks.find((candidate) => candidate.id === packId);
    if (!pack) return undefined;
    const report = validateDataPack(pack);
    logImportWarnings(report, `Data pack validated: ${pack.name}`);
    set((state) => ({
      importedPacks: state.importedPacks.map((candidate) => (candidate.id === packId ? { ...candidate, validation: report } : candidate)),
      validationHistory: [report, ...state.validationHistory].slice(0, 20)
    }));
    return report;
  },
  repairPack: async (packId) => {
    const pack = get().importedPacks.find((candidate) => candidate.id === packId);
    if (!pack) return undefined;
    const repaired = repairDataPack(pack);
    await get().addPack(repaired.pack);
    return repaired.report;
  },
  importPackFromJson: async (raw) => {
    const result = importDataPackJson(raw);
    logImportWarnings(result.report, result.pack ? `Data pack imported: ${result.pack.name}` : "Data pack import failed");
    if (result.pack) await get().addPack(result.pack);
    else set((state) => ({ validationHistory: [result.report, ...state.validationHistory].slice(0, 20) }));
    return result;
  },
  exportPackJson: (packId) => {
    const pack = get().importedPacks.find((candidate) => candidate.id === packId);
    return pack ? exportDataPackJson(pack) : undefined;
  },
  duplicatePack: async (packId) => {
    const pack = get().importedPacks.find((candidate) => candidate.id === packId);
    if (!pack) return undefined;
    const now = new Date().toISOString();
    const copy = {
      ...pack,
      id: `${pack.id}-copy-${Date.now()}`,
      name: `${pack.name} Copy`,
      createdAt: now,
      updatedAt: now,
      validation: undefined
    };
    await get().addPack(copy);
    return copy;
  },
  renamePack: async (packId, name) => {
    const pack = get().importedPacks.find((candidate) => candidate.id === packId);
    if (!pack) return;
    await get().addPack({ ...pack, name: name.trim().slice(0, 72) || pack.name, updatedAt: new Date().toISOString() });
  }
}));

function packKey(packId: string): string {
  return `${DATA_PACK_KEY_PREFIX}${packId}`;
}

function logImportWarnings(report: DataPackValidationReport, message: string) {
  const meaningfulWarnings = report.warnings.filter((warning) => !warning.includes("Basic fictional-content filter"));
  const issueCount =
    report.errors.length +
    meaningfulWarnings.length +
    report.realWorldContentFlags.length +
    report.unsupportedReasons.length +
    report.duplicateIdWarnings.length;
  if (!issueCount) return;
  useRuntimeHealthStore.getState().addRuntimeEvent({
    type: "importWarning",
    severity: report.errors.length || report.realWorldContentFlags.length ? "high" : "medium",
    message,
    details: [...report.errors, ...report.unsupportedReasons, ...report.duplicateIdWarnings, ...report.realWorldContentFlags.map((term) => `Restricted term: ${term}`), ...meaningfulWarnings]
      .slice(0, 8)
      .join(" | ")
  });
}
