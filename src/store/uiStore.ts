import { create } from "zustand";
import type { RoomId } from "../game/types";

export type FirstDayChecklistId =
  | "visitGm"
  | "readInbox"
  | "visitLocker"
  | "openPlayerCard"
  | "visitCoach"
  | "editLineup"
  | "adjustTactic"
  | "visitArena"
  | "simulateGame"
  | "reviewResult"
  | "checkStandings"
  | "saveFranchise";

interface UiStore {
  activeRoom?: RoomId;
  nearbyRoom?: RoomId;
  operationsMapOpen: boolean;
  checklistCollapsed: boolean;
  checklistDismissed: boolean;
  checklistCompleted: Record<FirstDayChecklistId, boolean>;
  setActiveRoom: (room?: RoomId) => void;
  setNearbyRoom: (room?: RoomId) => void;
  toggleOperationsMap: () => void;
  setOperationsMapOpen: (open: boolean) => void;
  markChecklistItem: (id: FirstDayChecklistId) => void;
  setChecklistCollapsed: (collapsed: boolean) => void;
  dismissChecklist: () => void;
}

const initialChecklist: Record<FirstDayChecklistId, boolean> = {
  visitGm: false,
  readInbox: false,
  visitLocker: false,
  openPlayerCard: false,
  visitCoach: false,
  editLineup: false,
  adjustTactic: false,
  visitArena: false,
  simulateGame: false,
  reviewResult: false,
  checkStandings: false,
  saveFranchise: false
};

const roomChecklistMap: Partial<Record<RoomId, FirstDayChecklistId>> = {
  gm: "visitGm",
  locker: "visitLocker",
  coach: "visitCoach",
  arena: "visitArena",
  standings: "checkStandings"
};

export const useUiStore = create<UiStore>((set) => ({
  activeRoom: undefined,
  nearbyRoom: undefined,
  operationsMapOpen: false,
  checklistCollapsed: false,
  checklistDismissed: false,
  checklistCompleted: initialChecklist,
  setActiveRoom: (room) =>
    set((state) => {
      const checklistId = room ? roomChecklistMap[room] : undefined;
      return {
        activeRoom: room,
        checklistCompleted: checklistId ? { ...state.checklistCompleted, [checklistId]: true } : state.checklistCompleted
      };
    }),
  setNearbyRoom: (room) => set({ nearbyRoom: room }),
  toggleOperationsMap: () => set((state) => ({ operationsMapOpen: !state.operationsMapOpen })),
  setOperationsMapOpen: (open) => set({ operationsMapOpen: open }),
  markChecklistItem: (id) => set((state) => ({ checklistCompleted: { ...state.checklistCompleted, [id]: true } })),
  setChecklistCollapsed: (collapsed) => set({ checklistCollapsed: collapsed }),
  dismissChecklist: () => set({ checklistDismissed: true })
}));
