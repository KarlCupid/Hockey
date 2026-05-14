import { create } from "zustand";

export type UiScale = "compact" | "normal" | "spacious";
export type TableDensity = "compact" | "normal";
export type BroadcastSpeedDefault = "slow" | "normal" | "fast";

export interface AppSettings {
  reduceMotion: boolean;
  reduced3DDetail: boolean;
  broadcastSpeedDefault: BroadcastSpeedDefault;
  autoSave: boolean;
  confirmPhaseAdvances: boolean;
  uiScale: UiScale;
  tableDensity: TableDensity;
  soundPlaceholder: boolean;
  autoRepairAiRosters: boolean;
  autoFixUserRosterOnSeasonStart: boolean;
  dynastyGuideResetToken: number;
}

interface SettingsStore {
  settings: AppSettings;
  helpOpen: boolean;
  updateSettings: (patch: Partial<AppSettings>) => void;
  setHelpOpen: (open: boolean) => void;
  toggleHelp: () => void;
  resetGuides: () => void;
}

const STORAGE_KEY = "franchise-ice:settings:v1";

export const DEFAULT_SETTINGS: AppSettings = {
  reduceMotion: false,
  reduced3DDetail: false,
  broadcastSpeedDefault: "normal",
  autoSave: true,
  confirmPhaseAdvances: true,
  uiScale: "normal",
  tableDensity: "normal",
  soundPlaceholder: false,
  autoRepairAiRosters: true,
  autoFixUserRosterOnSeasonStart: false,
  dynastyGuideResetToken: 0
};

export function serializeSettings(settings: AppSettings): string {
  return JSON.stringify(settings);
}

export function parseSettings(raw: string | null | undefined): AppSettings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return normalizeSettings(parsed);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function normalizeSettings(input: Partial<AppSettings>): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...input,
    broadcastSpeedDefault: ["slow", "normal", "fast"].includes(input.broadcastSpeedDefault ?? "")
      ? (input.broadcastSpeedDefault as BroadcastSpeedDefault)
      : DEFAULT_SETTINGS.broadcastSpeedDefault,
    uiScale: ["compact", "normal", "spacious"].includes(input.uiScale ?? "") ? (input.uiScale as UiScale) : DEFAULT_SETTINGS.uiScale,
    tableDensity: ["compact", "normal"].includes(input.tableDensity ?? "") ? (input.tableDensity as TableDensity) : DEFAULT_SETTINGS.tableDensity,
    dynastyGuideResetToken: Number.isFinite(input.dynastyGuideResetToken) ? Number(input.dynastyGuideResetToken) : 0
  };
}

function readStoredSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  return parseSettings(window.localStorage.getItem(STORAGE_KEY));
}

function persistSettings(settings: AppSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, serializeSettings(settings));
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: readStoredSettings(),
  helpOpen: false,
  updateSettings: (patch) =>
    set((state) => {
      const settings = normalizeSettings({ ...state.settings, ...patch });
      persistSettings(settings);
      return { settings };
    }),
  setHelpOpen: (open) => set({ helpOpen: open }),
  toggleHelp: () => set((state) => ({ helpOpen: !state.helpOpen })),
  resetGuides: () =>
    set((state) => {
      const settings = { ...state.settings, dynastyGuideResetToken: state.settings.dynastyGuideResetToken + 1 };
      persistSettings(settings);
      return { settings };
    })
}));
