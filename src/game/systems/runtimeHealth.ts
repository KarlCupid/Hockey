import type { RoomId, SeasonPhase } from "../types";

export type RuntimeHealthEventType =
  | "error"
  | "warning"
  | "saveRepair"
  | "invariantWarning"
  | "performanceWarning"
  | "audioWarning"
  | "pwaWarning"
  | "importWarning";

export type RuntimeHealthSeverity = "low" | "medium" | "high";
export type RuntimeHealthStatus = "healthy" | "warnings" | "needsAttention";

export interface RuntimeHealthEvent {
  id: string;
  timestamp: string;
  type: RuntimeHealthEventType;
  message: string;
  details?: string;
  roomId?: RoomId;
  phase?: SeasonPhase;
  severity: RuntimeHealthSeverity;
}

export interface RuntimeHealthState {
  events: RuntimeHealthEvent[];
  lastCheckedAt: string;
  status: RuntimeHealthStatus;
}

export const RUNTIME_HEALTH_EVENT_LIMIT = 60;

export function createRuntimeHealthState(): RuntimeHealthState {
  const now = new Date().toISOString();
  return {
    events: [],
    lastCheckedAt: now,
    status: "healthy"
  };
}

export function addRuntimeHealthEvent(
  state: RuntimeHealthState,
  event: Omit<RuntimeHealthEvent, "id" | "timestamp"> & Partial<Pick<RuntimeHealthEvent, "id" | "timestamp">>
): RuntimeHealthState {
  const timestamp = event.timestamp ?? new Date().toISOString();
  const nextEvent: RuntimeHealthEvent = {
    ...event,
    id: event.id ?? createRuntimeHealthEventId(event.type, event.message, timestamp),
    timestamp,
    message: event.message.slice(0, 240),
    details: event.details?.slice(0, 800)
  };
  const next = capRuntimeHealthEvents({
    ...state,
    events: [nextEvent, ...state.events],
    lastCheckedAt: timestamp
  });
  return { ...next, status: getRuntimeHealthStatus(next) };
}

export function capRuntimeHealthEvents(state: RuntimeHealthState, limit = RUNTIME_HEALTH_EVENT_LIMIT): RuntimeHealthState {
  return {
    ...state,
    events: state.events.filter(isRuntimeHealthEvent).slice(0, Math.max(1, limit))
  };
}

export function getRuntimeHealthStatus(state: RuntimeHealthState): RuntimeHealthStatus {
  if (state.events.some((event) => event.type === "error" || event.severity === "high")) return "needsAttention";
  if (state.events.some((event) => event.severity === "medium" || event.type !== "warning")) return "warnings";
  if (state.events.length) return "warnings";
  return "healthy";
}

export function summarizeRuntimeHealth(state: RuntimeHealthState): string {
  const capped = capRuntimeHealthEvents(state);
  const counts = capped.events.reduce<Record<string, number>>((summary, event) => {
    summary[event.type] = (summary[event.type] ?? 0) + 1;
    return summary;
  }, {});
  const countText = Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, count]) => `${type}: ${count}`)
    .join(", ");
  const latest = capped.events[0];
  return [
    `status=${getRuntimeHealthStatus(capped)}`,
    `events=${capped.events.length}`,
    countText ? `counts=${countText}` : "counts=none",
    latest ? `latest=${latest.type}/${latest.severity}: ${latest.message}` : "latest=none"
  ].join("; ");
}

export function clearRuntimeHealth(state: RuntimeHealthState): RuntimeHealthState {
  return {
    ...state,
    events: [],
    lastCheckedAt: new Date().toISOString(),
    status: "healthy"
  };
}

export function createRuntimeHealthBugReportSection(state: RuntimeHealthState): string {
  const recent = capRuntimeHealthEvents(state).events.slice(0, 8);
  return [
    "Runtime Health",
    summarizeRuntimeHealth(state),
    ...recent.map((event) => `${event.timestamp} | ${event.type} | ${event.severity} | ${event.message}`)
  ].join("\n");
}

function createRuntimeHealthEventId(type: RuntimeHealthEventType, message: string, timestamp: string): string {
  return `runtime-${timestamp}-${type}-${message.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`.slice(0, 140);
}

function isRuntimeHealthEvent(event: RuntimeHealthEvent): event is RuntimeHealthEvent {
  return Boolean(event?.id && event.timestamp && event.type && event.message && event.severity);
}
