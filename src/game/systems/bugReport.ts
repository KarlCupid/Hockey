import { SCHEMA_VERSION } from "../constants";
import type { BugReport, FranchiseState, RoomId } from "../types";
import { exportSaveToJson, validateSaveIntegrity } from "./saves";
import { validateDynastyInvariants } from "./dynastyInvariants";
import { getRuleSetDescription, normalizeLeagueRuleSet } from "./leagueRules";
import { summarizeTelemetry } from "./localTelemetry";
import { createRuntimeHealthBugReportSection, type RuntimeHealthState } from "./runtimeHealth";
import { getVersionSummary } from "./version";
import { detectUxFriction, summarizeUxFriction } from "./uxFriction";

export interface BugReportOptions {
  appVersion?: string;
  lastRoom?: RoomId;
  userNote?: string;
  consoleNotes?: string[];
  runtimeHealth?: RuntimeHealthState;
  includeFullSave?: boolean;
}

export function createBugReport(franchise: FranchiseState, options: BugReportOptions = {}): BugReport {
  const integrity = validateSaveIntegrity(franchise);
  const invariants = validateDynastyInvariants(franchise);
  const friction = summarizeUxFriction(detectUxFriction(franchise));
  const createdAt = new Date().toISOString();
  const version = getVersionSummary();
  return {
    id: `bug-report-${franchise.franchiseId}-${createdAt}`,
    createdAt,
    appVersion: options.appVersion ?? version.appVersion,
    releasePhase: version.buildPhase,
    releaseChannel: version.releaseChannel,
    schemaVersion: franchise.schemaVersion ?? SCHEMA_VERSION,
    currentPhase: franchise.seasonPhase,
    selectedTeamId: franchise.selectedTeamId,
    customLeagueName: franchise.customLeagueName,
    ruleSetSummary: getRuleSetDescription(normalizeLeagueRuleSet(franchise.league.ruleSet)),
    dataPackMetadata: franchise.dataPackMetadata,
    lastRoom: options.lastRoom,
    recentTelemetry: (franchise.localTelemetry ?? []).slice(0, 40),
    runtimeHealthSummary: options.runtimeHealth ? createRuntimeHealthBugReportSection(options.runtimeHealth) : undefined,
    runtimeHealthEvents: options.runtimeHealth?.events.slice(0, 20),
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
    uxFrictionSummary: [
      `signals=${friction.total}`,
      `high=${friction.highSeverityCount}`,
      `critical=${friction.criticalCount}`,
      `top=${friction.topRecommendations.slice(0, 2).join(" | ") || "none"}`
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

export function createDiagnosticSummary(franchise: FranchiseState, lastRoom?: RoomId, runtimeHealth?: RuntimeHealthState): string {
  const report = createBugReport(franchise, { lastRoom, runtimeHealth });
  const version = getVersionSummary();
  return [
    "Franchise Ice Diagnostic Summary",
    `Version: ${version.releaseLabel}`,
    `Report: ${report.id}`,
    `Schema: ${report.schemaVersion}`,
    `Phase: ${report.currentPhase}`,
    `Team: ${report.selectedTeamId}`,
    `Custom league: ${report.customLeagueName ?? "standard fictional league"}`,
    `Rules: ${report.ruleSetSummary ?? "standard fictional rules"}`,
    `Data pack: ${report.dataPackMetadata?.dataPackName ?? "none"}`,
    `Last room: ${report.lastRoom ?? "unknown"}`,
    `Runtime health: ${report.runtimeHealthSummary ?? "not attached"}`,
    `Integrity: ${report.saveIntegritySummary}`,
    `Invariants: ${report.invariantSummary}`,
    `UX friction: ${report.uxFrictionSummary ?? "none"}`
  ].join("\n");
}
