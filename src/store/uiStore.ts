import { create } from "zustand";
import type { RoomId } from "../game/types";

interface UiStore {
  activeRoom?: RoomId;
  nearbyRoom?: RoomId;
  setActiveRoom: (room?: RoomId) => void;
  setNearbyRoom: (room?: RoomId) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  activeRoom: undefined,
  nearbyRoom: undefined,
  setActiveRoom: (room) => set({ activeRoom: room }),
  setNearbyRoom: (room) => set({ nearbyRoom: room })
}));
