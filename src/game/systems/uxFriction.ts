import type { AssistantGmRecommendation, FranchiseState, LocalTelemetryEvent, RoomId, SeasonPhase } from "../types";
import { getMasterActionQueue } from "./actionQueue";
import { validateRosterForGame } from "./rosterRules";

export type UxFrictionSignalType =
  | "roomBounce"
  | "blockingActionStale"
  | "invalidRosterSimBlocked"
  | "pendingDraftPickDrift"
  | "ignoredHighSeverityDecision"
  | "customLeagueValidationLoop"
  | "tutorialClosedQuickly"
  | "saveDeskAfterLoadErrors"
  | "unreadResultsRun"
  | "assistantBacklog";

export interface UxFrictionSignal {
  id: string;
  type: UxFrictionSignalType;
  severity: "low" | "medium" | "high" | "critical";
  roomId?: RoomId;
  phase?: SeasonPhase;
  message: string;
  firstDetectedAt: string;
  count: number;
  suggestedFix: string;
}

export interface UxFrictionSummary {
  total: number;
  highSeverityCount: number;
  criticalCount: number;
  byType: Record<string, number>;
  byRoom: Record<string, number>;
  topRecommendations: string[];
}

export interface UxFrictionSettings {
  assistantGmReportsEnabled?: boolean;
  telemetryEnabledLocalOnly?: boolean;
}

export function detectUxFriction(
  franchise: FranchiseState,
  localTelemetry: LocalTelemetryEvent[] = franchise.localTelemetry ?? [],
  settings: UxFrictionSettings = {}
): UxFrictionSignal[] {
  const now = new Date().toISOString();
  const signals: UxFrictionSignal[] = [];
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId);
  const rosterReport = team ? validateRosterForGame(team) : undefined;
  const simBlockedEvents = localTelemetry.filter((event) => event.type === "simBlocked" || matches(event, "invalid roster") || event.details?.reason === "invalidRoster");
  if ((rosterReport?.errors.length ?? 0) > 0 || simBlockedEvents.length > 0) {
    signals.push(signal("invalidRosterSimBlocked", "high", "roster", franchise.seasonPhase, now, Math.max(1, rosterReport?.errors.length ?? simBlockedEvents.length), rosterReport?.errors[0] ?? "A game simulation was blocked by roster validation.", "Open Roster Office and use auto-fill or scratch/call up players until the game roster is valid."));
  }

  const blockingActions = getMasterActionQueue(franchise).filter((item) => item.blocking);
  if (blockingActions.length) {
    const first = blockingActions[0];
    signals.push(signal("blockingActionStale", first.priority === "urgent" ? "high" : "medium", first.roomId, franchise.seasonPhase, now, blockingActions.length, `${first.label}: ${first.description}`, `Go to ${roomName(first.roomId)} and resolve the blocking item before advancing.`));
  }

  if (franchise.offseasonState?.draftState?.userPickPending) {
    signals.push(signal("pendingDraftPickDrift", "high", "scouting", franchise.seasonPhase, now, 1, "The draft table is waiting on your next selection.", "Open Scouting Department or Draft Stage and make the pending pick before checking other rooms."));
  }

  const highDecisions = franchise.decisionEvents.filter((event) => event.status === "active" && (event.severity === "high" || event.severity === "critical"));
  if (highDecisions.length) {
    const first = highDecisions[0];
    signals.push(signal("ignoredHighSeverityDecision", first.severity, first.locationRoom ?? "gm", first.phase ?? franchise.seasonPhase, now, highDecisions.length, `${first.headline} is still unresolved.`, "Open the highlighted conversation room and pick an answer before the story pressure climbs."));
  }

  const labErrors = localTelemetry.filter((event) => event.type === "validationError" || matches(event, "custom league") || Number(event.details?.validationErrors ?? 0) > 0);
  if (labErrors.length >= 2) {
    signals.push(signal("customLeagueValidationLoop", "medium", "settings", franchise.seasonPhase, now, labErrors.length, "Custom League Lab has repeated validation errors.", "Show the validation repair list and try the recommended data-pack repair before starting the league."));
  }

  const quickTutorialSkips = localTelemetry.filter((event) => event.type === "tutorialSkipped" || matches(event, "tutorial skipped"));
  if (quickTutorialSkips.length) {
    signals.push(signal("tutorialClosedQuickly", "low", "gm", franchise.seasonPhase, now, quickTutorialSkips.length, "The tutorial was skipped early.", "Keep the first-hour checklist visible and point the player back to Help when they pause."));
  }

  const loadErrors = localTelemetry.filter((event) => event.type === "saveLoaded" && event.details?.status === "error");
  const saveDeskOpens = localTelemetry.filter((event) => event.type === "roomOpened" && String(event.details?.roomId ?? "").includes("saves"));
  if (loadErrors.length && saveDeskOpens.length >= 2) {
    signals.push(signal("saveDeskAfterLoadErrors", "medium", "saves", franchise.seasonPhase, now, saveDeskOpens.length, "Save Desk was reopened after load errors.", "Offer snapshot recovery, repair current save, and export a bug report from the same desk."));
  }

  const gamesSimulated = localTelemetry.filter((event) => event.type === "gameSimulated").length;
  const resultsViewed = localTelemetry.filter((event) => event.type === "resultViewed" || (event.type === "roomOpened" && event.details?.roomId === "arena")).length;
  if (gamesSimulated >= 5 && resultsViewed <= 1) {
    signals.push(signal("unreadResultsRun", "low", "arena", franchise.seasonPhase, now, gamesSimulated, "Several games were simulated without much result review.", "After each game, surface the summary card and next recommended action before another sim."));
  }

  const roomBounce = detectRoomBounce(localTelemetry, now, franchise.seasonPhase);
  if (roomBounce) signals.push(roomBounce);

  if (settings.assistantGmReportsEnabled !== false) {
    const recCount = franchise.assistantGmReports.filter((report) => !report.dismissed).reduce((sum, report) => sum + report.recommendations.length, 0);
    if (recCount >= 12) {
      signals.push(signal("assistantBacklog", "medium", "gm", franchise.seasonPhase, now, recCount, "Assistant GM recommendations are stacking up.", "Collapse older reports and pin one next action so the player has a cleaner path."));
    }
  }

  return dedupeSignals(signals);
}

export function summarizeUxFriction(signals: UxFrictionSignal[]): UxFrictionSummary {
  const byType: Record<string, number> = {};
  const byRoom: Record<string, number> = {};
  signals.forEach((signalItem) => {
    byType[signalItem.type] = (byType[signalItem.type] ?? 0) + signalItem.count;
    if (signalItem.roomId) byRoom[signalItem.roomId] = (byRoom[signalItem.roomId] ?? 0) + signalItem.count;
  });
  return {
    total: signals.length,
    highSeverityCount: signals.filter((item) => item.severity === "high" || item.severity === "critical").length,
    criticalCount: signals.filter((item) => item.severity === "critical").length,
    byType,
    byRoom,
    topRecommendations: signals
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.count - a.count)
      .slice(0, 5)
      .map((item) => item.suggestedFix)
  };
}

export function createFrictionRecommendation(signalItem: UxFrictionSignal): AssistantGmRecommendation {
  return {
    id: `friction-rec-${signalItem.id}`,
    category: signalItem.type === "invalidRosterSimBlocked" ? "roster" : signalItem.type === "ignoredHighSeverityDecision" ? "story" : "phase",
    priority: signalItem.severity === "critical" ? "urgent" : signalItem.severity === "high" ? "high" : signalItem.severity === "medium" ? "medium" : "low",
    title: signalItem.type === "roomBounce" ? "Need a hand finding the next step?" : "Need a hand?",
    body: signalItem.message,
    actionLabel: signalItem.suggestedFix,
    targetRoomId: signalItem.roomId ?? "gm",
    estimatedImpact: signalItem.severity === "low" ? "small" : signalItem.severity === "medium" ? "medium" : "large"
  };
}

export function includeFrictionInBugReport<T extends { uxFrictionSummary?: string }>(report: T, signals: UxFrictionSignal[]): T {
  const summary = summarizeUxFriction(signals);
  return {
    ...report,
    uxFrictionSummary: [
      `signals=${summary.total}`,
      `high=${summary.highSeverityCount}`,
      `critical=${summary.criticalCount}`,
      `top=${summary.topRecommendations.slice(0, 2).join(" | ") || "none"}`
    ].join("; ")
  };
}

function detectRoomBounce(localTelemetry: LocalTelemetryEvent[], now: string, phase: SeasonPhase): UxFrictionSignal | undefined {
  const recent = localTelemetry.slice(0, 30);
  const opensByRoom = new Map<RoomId, number>();
  const actions = recent.filter((event) => event.type !== "roomOpened");
  recent
    .filter((event) => event.type === "roomOpened")
    .forEach((event) => {
      const roomId = event.details?.roomId as RoomId | undefined;
      if (roomId) opensByRoom.set(roomId, (opensByRoom.get(roomId) ?? 0) + 1);
    });
  const bounced = [...opensByRoom.entries()].find(([, count]) => count >= 4 && actions.length <= 1);
  if (!bounced) return undefined;
  return signal("roomBounce", "low", bounced[0], phase, now, bounced[1], `The player opened ${roomName(bounced[0])} repeatedly without completing an action.`, "Show a short room objective and one primary button for the next useful action.");
}

function signal(
  type: UxFrictionSignalType,
  severity: UxFrictionSignal["severity"],
  roomId: RoomId | undefined,
  phase: SeasonPhase | undefined,
  firstDetectedAt: string,
  count: number,
  message: string,
  suggestedFix: string
): UxFrictionSignal {
  return {
    id: `ux-${type}-${roomId ?? "global"}-${phase ?? "any"}`,
    type,
    severity,
    roomId,
    phase,
    message,
    firstDetectedAt,
    count,
    suggestedFix
  };
}

function dedupeSignals(signals: UxFrictionSignal[]): UxFrictionSignal[] {
  const seen = new Map<string, UxFrictionSignal>();
  signals.forEach((signalItem) => {
    const existing = seen.get(signalItem.id);
    if (!existing || severityRank(signalItem.severity) > severityRank(existing.severity)) seen.set(signalItem.id, signalItem);
  });
  return [...seen.values()].sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.count - a.count);
}

function severityRank(severity: UxFrictionSignal["severity"]): number {
  return { low: 0, medium: 1, high: 2, critical: 3 }[severity];
}

function matches(event: LocalTelemetryEvent, text: string): boolean {
  const haystack = `${event.label} ${JSON.stringify(event.details ?? {})}`.toLowerCase();
  return haystack.includes(text.toLowerCase());
}

function roomName(roomId: RoomId): string {
  return roomId
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase())
    .replace("Gm", "GM");
}
