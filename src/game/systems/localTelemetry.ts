import type { FranchiseState, LocalTelemetryEvent } from "../types";

export const LOCAL_TELEMETRY_LIMIT = 150;

export function createLocalTelemetryEvent(
  type: LocalTelemetryEvent["type"],
  label: string,
  details?: LocalTelemetryEvent["details"],
  timestamp = new Date().toISOString()
): LocalTelemetryEvent {
  return {
    id: `telemetry-${timestamp}-${type}-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`.slice(0, 120),
    timestamp,
    type,
    label,
    details
  };
}

export function recordLocalTelemetry(
  franchise: FranchiseState,
  type: LocalTelemetryEvent["type"],
  label: string,
  details?: LocalTelemetryEvent["details"],
  enabled = true
): FranchiseState {
  if (!enabled) return franchise;
  return {
    ...franchise,
    localTelemetry: capTelemetry([createLocalTelemetryEvent(type, label, details), ...(franchise.localTelemetry ?? [])])
  };
}

export function capTelemetry(events: LocalTelemetryEvent[], limit = LOCAL_TELEMETRY_LIMIT): LocalTelemetryEvent[] {
  return events
    .filter((event): event is LocalTelemetryEvent => Boolean(event?.id && event.type && event.timestamp))
    .slice(0, Math.max(1, limit));
}

export function summarizeTelemetry(events: LocalTelemetryEvent[]): string[] {
  const counts = events.reduce<Record<string, number>>((summary, event) => {
    summary[event.type] = (summary[event.type] ?? 0) + 1;
    return summary;
  }, {});
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, count]) => `${type}: ${count}`);
}
