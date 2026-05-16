import type { FranchiseState, RoomId, SeasonPhase } from "../types";
import { validateDynastyInvariants } from "./dynastyInvariants";
import { getRuleSetDescription, normalizeLeagueRuleSet } from "./leagueRules";
import { summarizeTelemetry } from "./localTelemetry";
import { validateSaveIntegrity } from "./saves";
import { getVersionSummary } from "./version";

export const FEEDBACK_ENTRY_LIMIT = 120;

export type BetaFeedbackCategory = "bug" | "confusing" | "balance" | "ui" | "performance" | "content" | "suggestion" | "positive";
export type BetaFeedbackSeverity = "low" | "medium" | "high" | "critical";

export interface BetaFeedbackEntry {
  id: string;
  createdAt: string;
  category: BetaFeedbackCategory;
  severity: BetaFeedbackSeverity;
  roomId?: RoomId;
  phase?: SeasonPhase;
  headline: string;
  notes: string;
  includeDiagnostics: boolean;
  includeSaveSummary: boolean;
  tags: string[];
}

export interface BetaFeedbackState {
  entries: BetaFeedbackEntry[];
  lastExportedAt?: string;
}

export interface FeedbackContext {
  roomId?: RoomId;
  phase?: SeasonPhase;
  createdAt?: string;
  tags?: string[];
}

export type FeedbackInput = Partial<Omit<BetaFeedbackEntry, "id" | "createdAt">> & {
  headline: string;
  notes?: string;
};

export interface FeedbackSummary {
  total: number;
  cappedAt: number;
  categoryCounts: Record<BetaFeedbackCategory, number>;
  severityCounts: Record<BetaFeedbackSeverity, number>;
  highSeverityCount: number;
  diagnosticRequests: number;
  saveSummaryRequests: number;
  topTags: string[];
  mostRecentAt?: string;
}

const CATEGORIES: BetaFeedbackCategory[] = ["bug", "confusing", "balance", "ui", "performance", "content", "suggestion", "positive"];
const SEVERITIES: BetaFeedbackSeverity[] = ["low", "medium", "high", "critical"];

export function createFeedbackEntry(input: FeedbackInput, franchise?: FranchiseState, context: FeedbackContext = {}): BetaFeedbackEntry {
  const createdAt = context.createdAt ?? new Date().toISOString();
  const headline = input.headline.trim();
  const tags = normalizeTags([...(context.tags ?? []), ...(input.tags ?? [])]);
  return {
    id: `feedback-${Date.parse(createdAt) || Date.now()}-${slugify(headline).slice(0, 32) || "entry"}`,
    createdAt,
    category: input.category ?? "suggestion",
    severity: input.severity ?? "medium",
    roomId: input.roomId ?? context.roomId,
    phase: input.phase ?? context.phase ?? franchise?.seasonPhase,
    headline,
    notes: input.notes?.trim() ?? "",
    includeDiagnostics: Boolean(input.includeDiagnostics),
    includeSaveSummary: Boolean(input.includeSaveSummary),
    tags
  };
}

export function addFeedbackEntry(state: BetaFeedbackState, entry: BetaFeedbackEntry): BetaFeedbackState {
  const entries = [entry, ...state.entries.filter((candidate) => candidate.id !== entry.id)].slice(0, FEEDBACK_ENTRY_LIMIT);
  return { ...state, entries };
}

export function updateFeedbackEntry(state: BetaFeedbackState, id: string, patch: Partial<BetaFeedbackEntry>): BetaFeedbackState {
  return {
    ...state,
    entries: state.entries.map((entry) =>
      entry.id === id
        ? {
            ...entry,
            ...patch,
            id: entry.id,
            createdAt: entry.createdAt,
            headline: patch.headline === undefined ? entry.headline : patch.headline.trim(),
            notes: patch.notes === undefined ? entry.notes : patch.notes.trim(),
            tags: patch.tags === undefined ? entry.tags : normalizeTags(patch.tags)
          }
        : entry
    )
  };
}

export function deleteFeedbackEntry(state: BetaFeedbackState, id: string): BetaFeedbackState {
  return { ...state, entries: state.entries.filter((entry) => entry.id !== id) };
}

export function summarizeFeedback(entries: BetaFeedbackEntry[]): FeedbackSummary {
  const categoryCounts = Object.fromEntries(CATEGORIES.map((category) => [category, 0])) as Record<BetaFeedbackCategory, number>;
  const severityCounts = Object.fromEntries(SEVERITIES.map((severity) => [severity, 0])) as Record<BetaFeedbackSeverity, number>;
  const tagCounts = new Map<string, number>();
  entries.forEach((entry) => {
    categoryCounts[entry.category] += 1;
    severityCounts[entry.severity] += 1;
    entry.tags.forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1));
  });
  return {
    total: entries.length,
    cappedAt: FEEDBACK_ENTRY_LIMIT,
    categoryCounts,
    severityCounts,
    highSeverityCount: severityCounts.high + severityCounts.critical,
    diagnosticRequests: entries.filter((entry) => entry.includeDiagnostics).length,
    saveSummaryRequests: entries.filter((entry) => entry.includeSaveSummary).length,
    topTags: [...tagCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8).map(([tag]) => tag),
    mostRecentAt: entries[0]?.createdAt
  };
}

export function validateFeedbackEntry(entry: BetaFeedbackEntry): string[] {
  const issues: string[] = [];
  if (!entry.id?.trim()) issues.push("Feedback entry is missing an id.");
  if (Number.isNaN(Date.parse(entry.createdAt))) issues.push("Feedback entry has an invalid createdAt timestamp.");
  if (!CATEGORIES.includes(entry.category)) issues.push(`Unsupported feedback category: ${entry.category}.`);
  if (!SEVERITIES.includes(entry.severity)) issues.push(`Unsupported feedback severity: ${entry.severity}.`);
  if (entry.headline.trim().length < 4) issues.push("Feedback headline should be at least 4 characters.");
  if (entry.headline.length > 96) issues.push("Feedback headline should stay under 96 characters.");
  if (entry.notes.length > 4000) issues.push("Feedback notes should stay under 4000 characters.");
  if (entry.tags.length > 12) issues.push("Feedback entries can include up to 12 tags.");
  entry.tags.forEach((tag) => {
    if (tag.length > 28) issues.push(`Feedback tag is too long: ${tag}.`);
  });
  return issues;
}

export function exportFeedbackBundle(franchise: FranchiseState | undefined, feedbackState: BetaFeedbackState): string {
  const exportedAt = new Date().toISOString();
  const entries = feedbackState.entries.slice(0, FEEDBACK_ENTRY_LIMIT);
  const wantsDiagnostics = entries.some((entry) => entry.includeDiagnostics);
  const wantsSaveSummary = entries.some((entry) => entry.includeSaveSummary);
  const version = getVersionSummary();
  const bundle = {
    bundleType: "franchise-ice-closed-beta-feedback",
    exportedAt,
    localOnly: true,
    app: version,
    summary: summarizeFeedback(entries),
    entries,
    diagnostics: franchise && wantsDiagnostics ? createDiagnostics(franchise) : undefined,
    saveSummary: franchise && wantsSaveSummary ? createSaveSummary(franchise) : undefined,
    fullSaveJson: undefined
  };
  return JSON.stringify(bundle, null, 2);
}

function createDiagnostics(franchise: FranchiseState) {
  const integrity = validateSaveIntegrity(franchise);
  const invariants = validateDynastyInvariants(franchise);
  return {
    version: getVersionSummary().releaseLabel,
    runtimeHealth: "Attach the Save Desk bug report for full runtime event details.",
    telemetrySummary: summarizeTelemetry(franchise.localTelemetry ?? []),
    saveIntegrity: {
      schemaVersion: integrity.schemaVersion,
      warnings: integrity.warnings.length,
      errors: integrity.errors.length,
      repairedFields: integrity.repairedFields.length
    },
    invariants: {
      valid: invariants.valid,
      warnings: invariants.warnings.length,
      errors: invariants.errors.length
    }
  };
}

function createSaveSummary(franchise: FranchiseState) {
  const selectedTeam = franchise.league.teams.find((team) => team.id === franchise.selectedTeamId);
  return {
    franchiseId: franchise.franchiseId,
    schemaVersion: franchise.schemaVersion,
    phase: franchise.seasonPhase,
    date: franchise.league.currentDate,
    seasonYear: franchise.league.seasonYear,
    selectedTeam: selectedTeam?.fullName ?? "Unknown fictional club",
    record: selectedTeam ? `${selectedTeam.record.wins}-${selectedTeam.record.losses}-${selectedTeam.record.overtimeLosses}` : "unknown",
    customLeagueName: franchise.customLeagueName,
    rules: getRuleSetDescription(normalizeLeagueRuleSet(franchise.league.ruleSet)),
    achievementsUnlocked: franchise.achievements.filter((achievement) => achievement.unlockedAt).length,
    activeDecisionEvents: franchise.decisionEvents.filter((event) => event.status === "active").length,
    recentTelemetryCount: franchise.localTelemetry.length
  };
}

function normalizeTags(tags: string[]): string[] {
  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, ""))
        .filter(Boolean)
    )
  ).slice(0, 12);
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
