import { SCHEMA_VERSION } from "../constants";
import type { BugReport, FranchiseState, RoomId } from "../types";
import { exportSaveToJson, validateSaveIntegrity } from "./saves";
import { validateDynastyInvariants } from "./dynastyInvariants";
import { summarizeTelemetry } from "./localTelemetry";

export interface BugReportOptions {
  appVersion?: string;
  lastRoom?: RoomId;
  userNote?: string;
  consoleNotes?: string[];
  includeFullSave?: boolean;
}

export function createBugReport(franchise: FranchiseState, options: BugReportOptions = {}): BugReport {
  const integrity = validateSaveIntegrity(franchise);
  const invariants = validateDynastyInvariants(franchise);
  const createdAt = new Date().toISOString();
  return {
    id: `bug-report-${franchise.franchiseId}-${createdAt}`,
    createdAt,
    appVersion: options.appVersion ?? "local-dev",
    schemaVersion: franchise.schemaVersion ?? SCHEMA_VERSION,
    currentPhase: franchise.seasonPhase,
    selectedTeamId: franchise.selectedTeamId,
    lastRoom: options.lastRoom,
    recentTelemetry: (franchise.localTelemetry ?? []).slice(0, 40),
    saveIntegritySummary: [
      `schema=${integrity.schemaVersion}`,
      `warnings=${integrity.warnings.length}`,
      `errors=${integrity.errors.length}`,
      `repairs=${integrity.repairedFields.length}`
    ].join("; "),
    invariantSummary: [
      `warnings=${invariants.warnings.length}`,
      `errors=${invariants.errors.length}`,
      `telemetry=${summarizeTelemetry(franchise.localTelemetry ?? []).join(", ") || "none"}`
    ].join("; "),
    consoleNotes: options.consoleNotes?.slice(0, 20),
    userNote: options.userNote,
    includeFullSave: Boolean(options.includeFullSave),
    fullSaveJson: options.includeFullSave ? exportSaveToJson(franchise) : undefined
  };
}

export function serializeBugReport(report: BugReport): string {
  return JSON.stringify(report, null, 2);
}

export function createDiagnosticSummary(franchise: FranchiseState, lastRoom?: RoomId): string {
  const report = createBugReport(franchise, { lastRoom });
  return [
    "Franchise Ice Diagnostic Summary",
    `Report: ${report.id}`,
    `Schema: ${report.schemaVersion}`,
    `Phase: ${report.currentPhase}`,
    `Team: ${report.selectedTeamId}`,
    `Last room: ${report.lastRoom ?? "unknown"}`,
    `Integrity: ${report.saveIntegritySummary}`,
    `Invariants: ${report.invariantSummary}`
  ].join("\n");
}
