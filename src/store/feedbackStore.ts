import { create } from "zustand";
import {
  addFeedbackEntry,
  createFeedbackEntry,
  deleteFeedbackEntry,
  exportFeedbackBundle,
  updateFeedbackEntry,
  type BetaFeedbackEntry,
  type BetaFeedbackState,
  type FeedbackContext,
  type FeedbackInput
} from "../game/systems/betaFeedback";
import type { FranchiseState } from "../game/types";

interface FeedbackStore {
  feedbackState: BetaFeedbackState;
  addEntry: (input: FeedbackInput, franchise?: FranchiseState, context?: FeedbackContext) => BetaFeedbackEntry;
  updateEntry: (id: string, patch: Partial<BetaFeedbackEntry>) => void;
  deleteEntry: (id: string) => void;
  exportBundle: (franchise?: FranchiseState) => string;
  clearEntries: () => void;
}

const STORAGE_KEY = "franchise-ice:closed-beta-feedback:v1";
const DEFAULT_STATE: BetaFeedbackState = { entries: [] };

function readState(): BetaFeedbackState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "") as BetaFeedbackState;
    return { entries: Array.isArray(parsed.entries) ? parsed.entries : [], lastExportedAt: parsed.lastExportedAt };
  } catch {
    return DEFAULT_STATE;
  }
}

function persistState(state: BetaFeedbackState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const useFeedbackStore = create<FeedbackStore>((set, get) => ({
  feedbackState: readState(),
  addEntry: (input, franchise, context) => {
    const entry = createFeedbackEntry(input, franchise, context);
    set((state) => {
      const feedbackState = addFeedbackEntry(state.feedbackState, entry);
      persistState(feedbackState);
      return { feedbackState };
    });
    return entry;
  },
  updateEntry: (id, patch) =>
    set((state) => {
      const feedbackState = updateFeedbackEntry(state.feedbackState, id, patch);
      persistState(feedbackState);
      return { feedbackState };
    }),
  deleteEntry: (id) =>
    set((state) => {
      const feedbackState = deleteFeedbackEntry(state.feedbackState, id);
      persistState(feedbackState);
      return { feedbackState };
    }),
  exportBundle: (franchise) => {
    const exportedAt = new Date().toISOString();
    set((state) => {
      const feedbackState = { ...state.feedbackState, lastExportedAt: exportedAt };
      persistState(feedbackState);
      return { feedbackState };
    });
    return exportFeedbackBundle(franchise, { ...get().feedbackState, lastExportedAt: exportedAt });
  },
  clearEntries: () =>
    set(() => {
      persistState(DEFAULT_STATE);
      return { feedbackState: DEFAULT_STATE };
    })
}));
