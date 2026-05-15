import { create } from "zustand";
import {
  addRuntimeHealthEvent,
  clearRuntimeHealth,
  createRuntimeHealthState,
  type RuntimeHealthEvent,
  type RuntimeHealthState
} from "../game/systems/runtimeHealth";

interface RuntimeHealthStore {
  runtimeHealth: RuntimeHealthState;
  addRuntimeEvent: (event: Omit<RuntimeHealthEvent, "id" | "timestamp"> & Partial<Pick<RuntimeHealthEvent, "id" | "timestamp">>) => void;
  clearRuntimeEvents: () => void;
}

const STORAGE_KEY = "franchise-ice:runtime-health:v1";

export const useRuntimeHealthStore = create<RuntimeHealthStore>((set) => ({
  runtimeHealth: readRuntimeHealth(),
  addRuntimeEvent: (event) =>
    set((state) => {
      const runtimeHealth = addRuntimeHealthEvent(state.runtimeHealth, event);
      persistRuntimeHealth(runtimeHealth);
      return { runtimeHealth };
    }),
  clearRuntimeEvents: () =>
    set((state) => {
      const runtimeHealth = clearRuntimeHealth(state.runtimeHealth);
      persistRuntimeHealth(runtimeHealth);
      return { runtimeHealth };
    })
}));

function readRuntimeHealth(): RuntimeHealthState {
  if (typeof window === "undefined") return createRuntimeHealthState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createRuntimeHealthState();
    const parsed = JSON.parse(raw) as RuntimeHealthState;
    if (!Array.isArray(parsed.events)) return createRuntimeHealthState();
    return {
      events: parsed.events,
      lastCheckedAt: parsed.lastCheckedAt ?? new Date().toISOString(),
      status: parsed.status ?? "healthy"
    };
  } catch {
    return createRuntimeHealthState();
  }
}

function persistRuntimeHealth(state: RuntimeHealthState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
