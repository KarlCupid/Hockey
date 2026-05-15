import { SALARY_CAP_CEILING, SALARY_CAP_FLOOR, SCHEMA_VERSION } from "../constants";
import { generateDraftClass } from "../generators/generateDraftClass";
import {
  nearestSupportedLeagueSize,
  normalizeLeagueRuleSet,
  playoffTeamCountForFormat,
  validateLeagueRuleSet
} from "./leagueRules";
import type {
  Contract,
  CustomLeagueTemplate,
  CustomPlayerDefinition,
  CustomTeamDefinition,
  DataPack,
  DataPackValidationReport,
  Position,
  Prospect,
  ScenarioDefinition,
  ScenarioModifier
} from "../types";

const DATA_PACK_VERSION = 2;
const VALID_TYPES = ["league", "scenario", "branding", "roster", "draftClass", "full"];
const VALID_TEAM_COUNTS = [8, 10, 12, 16];
const VALID_PLAYOFF_COUNTS = [4, 6, 8, 10];
const VALID_DRAFT_ROUNDS = [3, 4, 5, 7];
const VALID_POSITIONS: Position[] = ["LW", "C", "RW", "LD", "RD", "G"];
const VALID_SCENARIO_MODIFIERS: ScenarioModifier["type"][] = [
  "capAdjustment",
  "rosterAdjustment",
  "injury",
  "morale",
  "fanSentiment",
  "ownerTrust",
  "draftPicks",
  "prospects",
  "contracts",
  "story"
];
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export const REAL_WORLD_CONTENT_FILTER_NOTE =
  "Basic fictional-content filter only. It flags obvious restricted terms but is not a legal guarantee.";

export const RESTRICTED_REAL_WORLD_TERMS = [
  "NHL",
  "National Hockey League",
  "Stanley Cup",
  "Maple Leafs",
  "Canadiens",
  "Rangers",
  "Bruins",
  "Blackhawks",
  "Red Wings",
  "Oilers",
  "Canucks",
  "Penguins",
  "Flyers",
  "Lightning",
  "Avalanche",
  "Wayne Gretzky",
  "Mario Lemieux",
  "Sidney Crosby",
  "Connor McDavid",
  "Alex Ovechkin",
  "Patrick Kane",
  "Auston Matthews"
];

export function validateDataPack(pack: unknown): DataPackValidationReport {
  const report = emptyReport();
  if (!isRecord(pack)) {
    report.errors.push("Data pack must be a JSON object.");
    return finishReport(report);
  }

  const candidate = pack as Partial<DataPack>;
  if (candidate.schemaVersion !== SCHEMA_VERSION) {
    report.warnings.push(`Data pack schemaVersion should match runtime schema ${SCHEMA_VERSION}.`);
  }
  if (!Number.isFinite(candidate.dataPackVersion)) {
    report.errors.push("Data pack is missing dataPackVersion.");
  }
  if (!candidate.id || typeof candidate.id !== "string") report.errors.push("Data pack is missing id.");
  if (!candidate.name || typeof candidate.name !== "string") report.errors.push("Data pack is missing name.");
  if (!VALID_TYPES.includes(String(candidate.type))) report.errors.push("Data pack type is invalid.");
  if (candidate.fictionalOnly !== true) report.errors.push("fictionalOnly must be true for local Franchise Ice packs.");

  const realWorldFlags = validateNoRealWorldBranding(candidate as DataPack);
  report.realWorldContentFlags.push(...realWorldFlags);
  if (realWorldFlags.length) {
    report.errors.push(`${REAL_WORLD_CONTENT_FILTER_NOTE} Flags: ${realWorldFlags.slice(0, 5).join(", ")}`);
  } else {
    report.warnings.push(REAL_WORLD_CONTENT_FILTER_NOTE);
  }

  const unsupported = detectUnsupportedSerializableValues(candidate);
  report.errors.push(...unsupported);

  if (candidate.leagueTemplate) {
    const leagueErrors = validateLeagueTemplate(candidate.leagueTemplate);
    const ruleReport = validateLeagueRuleSet(candidate.leagueTemplate.rules ?? candidate.leagueTemplate);
    report.errors.push(...leagueErrors.errors);
    report.warnings.push(...leagueErrors.warnings);
    report.duplicateIdWarnings.push(...leagueErrors.duplicateIdWarnings);
    report.balanceWarnings.push(...leagueErrors.balanceWarnings);
    if (!ruleReport.supported) {
      report.unsupportedReasons.push(...ruleReport.errors);
      report.suggestedFixes.push("Repair to nearest supported format: 8, 10, 12, or 16 teams with a matching schedule, playoff, and draft preset.");
    }
  } else if (candidate.type === "league" || candidate.type === "full") {
    report.errors.push("League or full data packs require leagueTemplate.");
  }

  if (candidate.branding?.teams) {
    report.errors.push(...validateTeamDefinitions(candidate.branding.teams as CustomTeamDefinition[]).filter((message) => message.includes("invalid") || message.includes("missing")));
  }

  if (candidate.rosters?.teamRosters) {
    candidate.rosters.teamRosters.forEach((entry) => {
      report.errors.push(...validatePlayerDefinitions(entry.players));
      report.duplicateIdWarnings.push(...duplicateWarnings(entry.players.map((player) => player.id), `roster ${entry.teamId} player`));
    });
  }

  if (candidate.draftClass) {
    report.errors.push(...validateDraftClass(candidate.draftClass.prospects));
    if (candidate.leagueTemplate) {
      const rules = normalizeLeagueRuleSet(candidate.leagueTemplate.rules ?? candidate.leagueTemplate);
      const required = rules.teamCount * rules.draftRounds;
      const preferred = rules.draftClassSize;
      if ((candidate.draftClass.prospects?.length ?? 0) < required) report.errors.push(`Draft class needs at least ${required} prospects for this rule set.`);
      if ((candidate.draftClass.prospects?.length ?? 0) < preferred) report.warnings.push(`Draft class is below the recommended ${preferred} prospects for this rule set.`);
    }
  } else if (candidate.type === "draftClass") {
    report.errors.push("Draft class data packs require draftClass.");
  }

  if (candidate.scenario) {
    report.errors.push(...validateScenario(candidate.scenario));
    if (candidate.leagueTemplate) {
      report.errors.push(...validateScenarioReferences(candidate.scenario, candidate.leagueTemplate));
    }
  } else if (candidate.type === "scenario") {
    report.errors.push("Scenario data packs require scenario.");
  }

  return finishReport(report);
}

export function repairDataPack(pack: DataPack): { pack: DataPack; report: DataPackValidationReport } {
  const repaired = sanitizeDataPack(pack);
  const repairedFields: string[] = [];
  repaired.schemaVersion = SCHEMA_VERSION;
  repaired.dataPackVersion = Number.isFinite(repaired.dataPackVersion) ? repaired.dataPackVersion : DATA_PACK_VERSION;
  repaired.id = safeId(repaired.id || "custom-pack", "pack");
  repaired.name = cleanedText(repaired.name || "Custom Fictional Pack", 72);
  repaired.description = cleanedText(repaired.description || "Local fictional Franchise Ice data pack.", 220);
  repaired.authorLabel = cleanedText(repaired.authorLabel || "Local GM", 48);
  repaired.createdAt = validIso(repaired.createdAt) ? repaired.createdAt : new Date().toISOString();
  repaired.updatedAt = new Date().toISOString();
  repaired.fictionalOnly = true;
  repaired.contentWarnings = Array.isArray(repaired.contentWarnings) ? repaired.contentWarnings.slice(0, 12) : [];
  repairedFields.push("schemaVersion", "fictionalOnly", "updatedAt");

  if (repaired.leagueTemplate) {
    repaired.leagueTemplate = repairLeagueTemplate(repaired.leagueTemplate, repairedFields);
  }
  if (repaired.rosters) {
    repaired.rosters = {
      ...repaired.rosters,
      id: safeId(repaired.rosters.id || `${repaired.id}-rosters`, "rosters"),
      name: cleanedText(repaired.rosters.name || `${repaired.name} Rosters`, 72),
      teamRosters: repaired.rosters.teamRosters.map((entry) => ({
        teamId: safeId(entry.teamId || "team", "team"),
        players: repairPlayerDefinitions(entry.players, repairedFields)
      }))
    };
  }
  if (repaired.draftClass) {
    const rules = repaired.leagueTemplate ? normalizeLeagueRuleSet(repaired.leagueTemplate.rules ?? repaired.leagueTemplate) : undefined;
    const requiredProspects = rules?.draftClassSize ?? 0;
    const repairedProspects = repairDraftClass(repaired.draftClass.prospects, repairedFields);
    const filledProspects =
      requiredProspects > repairedProspects.length
        ? [...repairedProspects, ...generateDraftClass(`${repaired.id}-draft-repair`, requiredProspects - repairedProspects.length)]
        : repairedProspects;
    if (filledProspects.length !== repairedProspects.length) repairedFields.push("draftClass.prospects");
    repaired.draftClass = {
      ...repaired.draftClass,
      id: safeId(repaired.draftClass.id || `${repaired.id}-draft`, "draft"),
      seasonYear: clampNumber(repaired.draftClass.seasonYear, 2026, 2200, 2026),
      name: cleanedText(repaired.draftClass.name || `${repaired.name} Draft Class`, 72),
      prospects: filledProspects
    };
  }

  const unique = ensureUniqueDataPackIds(repaired);
  const report = validateDataPack(unique);
  report.repairedFields.push(...Array.from(new Set(repairedFields)));
  unique.validation = report;
  return { pack: unique, report };
}

export function importDataPackJson(raw: string): { pack?: DataPack; report: DataPackValidationReport; error?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const report = emptyReport();
    report.errors.push("Data pack JSON is corrupt or incomplete.");
    return { report: finishReport(report), error: "Data pack JSON is corrupt or incomplete." };
  }
  const pack = sanitizeDataPack(parsed);
  const report = validateDataPack(pack);
  pack.validation = report;
  return { pack, report };
}

export function exportDataPackJson(pack: DataPack): string {
  return JSON.stringify(sanitizeDataPack({ ...pack, validation: validateDataPack(pack) }), null, 2);
}

export function sanitizeDataPack(pack: unknown): DataPack {
  const cloned = jsonClone(isRecord(pack) ? pack : {});
  const input = cloned as Partial<DataPack>;
  return {
    schemaVersion: Number(input.schemaVersion ?? SCHEMA_VERSION),
    dataPackVersion: Number(input.dataPackVersion ?? DATA_PACK_VERSION),
    id: String(input.id ?? "custom-pack"),
    type: VALID_TYPES.includes(String(input.type)) ? (input.type as DataPack["type"]) : "full",
    name: String(input.name ?? "Custom Fictional Pack"),
    description: String(input.description ?? "Local fictional Franchise Ice data pack."),
    authorLabel: String(input.authorLabel ?? "Local GM"),
    createdAt: String(input.createdAt ?? new Date().toISOString()),
    updatedAt: String(input.updatedAt ?? new Date().toISOString()),
    fictionalOnly: input.fictionalOnly === true,
    contentWarnings: Array.isArray(input.contentWarnings) ? input.contentWarnings.map(String) : [],
    leagueTemplate: input.leagueTemplate as DataPack["leagueTemplate"],
    scenario: input.scenario as DataPack["scenario"],
    branding: input.branding as DataPack["branding"],
    rosters: input.rosters as DataPack["rosters"],
    draftClass: input.draftClass as DataPack["draftClass"],
    validation: input.validation as DataPack["validation"]
  };
}

export function detectRealWorldContent(text: string): string[] {
  const haystack = text.toLowerCase();
  return RESTRICTED_REAL_WORLD_TERMS.filter((term) => {
    const escaped = term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const boundary = /^[a-z0-9 ]+$/i.test(term) ? "\\b" : "";
    return new RegExp(`${boundary}${escaped}${boundary}`, "i").test(haystack);
  });
}

export function validateNoRealWorldBranding(pack: DataPack): string[] {
  const strings = collectStrings(pack);
  return Array.from(new Set(strings.flatMap((value) => detectRealWorldContent(value)))).sort();
}

export function validateTeamDefinitions(teams: Array<Partial<CustomTeamDefinition>>): string[] {
  const messages: string[] = [];
  if (!Array.isArray(teams) || teams.length === 0) return ["Team definitions are missing."];
  messages.push(...duplicateWarnings(teams.map((team) => team.id), "team"));
  teams.forEach((team, index) => {
    const label = team.fullName ?? team.id ?? `Team ${index + 1}`;
    if (!team.id) messages.push(`${label} is missing id.`);
    if (!team.city || !team.nickname || !team.fullName) messages.push(`${label} is missing city, nickname, or fullName.`);
    if (!/^[A-Z]{2,4}$/.test(team.abbreviation ?? "")) messages.push(`${label} has invalid abbreviation.`);
    if (!isValidColor(team.primaryColor)) messages.push(`${label} has invalid primary color.`);
    if (!isValidColor(team.secondaryColor)) messages.push(`${label} has invalid secondary color.`);
    if (!isValidColor(team.accentColor)) messages.push(`${label} has invalid accent color.`);
    if (!["Small", "Medium", "Large"].includes(team.marketSize ?? "")) messages.push(`${label} has invalid market size.`);
    if (!Number.isFinite(team.ownerPatience) || team.ownerPatience! < 0 || team.ownerPatience! > 100) messages.push(`${label} has invalid owner patience.`);
    if (!Number.isFinite(team.fanConfidence) || team.fanConfidence! < 0 || team.fanConfidence! > 100) messages.push(`${label} has invalid fan confidence.`);
    if ((team.rivalryTeamIds ?? []).some((id) => id === team.id)) messages.push(`${label} cannot list itself as a rivalry team.`);
    if (team.players) messages.push(...validatePlayerDefinitions(team.players).map((message) => `${label}: ${message}`));
  });
  return messages;
}

export function validatePlayerDefinitions(players: Array<Partial<CustomPlayerDefinition>>): string[] {
  const messages: string[] = [];
  if (!Array.isArray(players)) return ["Player definitions are missing."];
  messages.push(...duplicateWarnings(players.map((player) => player.id), "player"));
  players.forEach((player, index) => {
    const label = player.displayName ?? player.id ?? `Player ${index + 1}`;
    if (!player.id) messages.push(`${label} is missing id.`);
    if (!player.firstName || !player.lastName || !player.displayName) messages.push(`${label} is missing a fictional name.`);
    if (!VALID_POSITIONS.includes(player.position as Position)) messages.push(`${label} has invalid position.`);
    if (player.handedness !== "L" && player.handedness !== "R") messages.push(`${label} has invalid handedness.`);
    if (!Number.isFinite(player.age) || player.age! < 17 || player.age! > 45) messages.push(`${label} age must be 17-45.`);
    if (!Number.isFinite(player.overall) || player.overall! < 40 || player.overall! > 99) messages.push(`${label} overall must be 40-99.`);
    if (!Number.isFinite(player.potential) || player.potential! < 40 || player.potential! > 99) messages.push(`${label} potential must be 40-99.`);
    if (Number.isFinite(player.overall) && Number.isFinite(player.potential) && player.potential! < Math.max(40, player.overall! - 8)) {
      messages.push(`${label} potential is too far below overall.`);
    }
    if (player.contract) messages.push(...validateContract(player.contract, label));
  });
  return messages;
}

export function validateDraftClass(prospects: Array<Partial<Prospect>>): string[] {
  const messages: string[] = [];
  if (!Array.isArray(prospects) || prospects.length === 0) return ["Draft class is missing prospects."];
  messages.push(...duplicateWarnings(prospects.map((prospect) => prospect.id), "prospect"));
  messages.push(...duplicateWarnings(prospects.map((prospect) => String(prospect.publicRank)), "prospect public rank"));
  prospects.forEach((prospect, index) => {
    const label = prospect.displayName ?? prospect.id ?? `Prospect ${index + 1}`;
    if (!VALID_POSITIONS.includes(prospect.position as Position)) messages.push(`${label} has invalid position.`);
    if (!Number.isFinite(prospect.age) || prospect.age! < 16 || prospect.age! > 22) messages.push(`${label} age must be 16-22.`);
    if (!Number.isFinite(prospect.publicRank) || prospect.publicRank! < 1) messages.push(`${label} has invalid public rank.`);
    if (!Number.isFinite(prospect.projectedRound) || prospect.projectedRound! < 1) messages.push(`${label} has invalid projected round.`);
    if (!Number.isFinite(prospect.actualOverall) || prospect.actualOverall! < 40 || prospect.actualOverall! > 99) messages.push(`${label} actual overall must be 40-99.`);
    if (!Number.isFinite(prospect.actualPotential) || prospect.actualPotential! < 40 || prospect.actualPotential! > 99) messages.push(`${label} actual potential must be 40-99.`);
  });
  return messages;
}

export function validateScenario(scenario: Partial<ScenarioDefinition>): string[] {
  const messages: string[] = [];
  if (!scenario.id) messages.push("Scenario is missing id.");
  if (!scenario.name) messages.push("Scenario is missing name.");
  if (!scenario.description) messages.push("Scenario is missing description.");
  if (!Array.isArray(scenario.setupNotes)) messages.push("Scenario setupNotes must be an array.");
  if (!Array.isArray(scenario.modifiers)) messages.push("Scenario modifiers must be an array.");
  (scenario.modifiers ?? []).forEach((modifier) => {
    if (!VALID_SCENARIO_MODIFIERS.includes(modifier.type)) messages.push(`${modifier.label || modifier.id} has invalid scenario modifier type.`);
  });
  return messages;
}

export function validateLeagueBalance(template: Partial<CustomLeagueTemplate>): string[] {
  const messages: string[] = [];
  const rules = validateLeagueRuleSet(template.rules ?? template);
  messages.push(...rules.errors, ...rules.warnings);
  return messages;
}

export function ensureUniqueDataPackIds(pack: DataPack): DataPack {
  const next = sanitizeDataPack(pack);
  if (next.leagueTemplate) {
    const teamIds = new Set<string>();
    next.leagueTemplate.teams = next.leagueTemplate.teams.map((team, index) => {
      const id = uniqueId(safeId(team.id || `team-${index + 1}`, "team"), teamIds);
      const playerIds = new Set<string>();
      return {
        ...team,
        id,
        players: team.players?.map((player, playerIndex) => ({
          ...player,
          id: uniqueId(safeId(player.id || `${id}-player-${playerIndex + 1}`, `${id}-player`), playerIds)
        }))
      };
    });
  }
  if (next.rosters) {
    next.rosters.teamRosters = next.rosters.teamRosters.map((entry) => {
      const playerIds = new Set<string>();
      return {
        ...entry,
        players: entry.players.map((player, index) => ({
          ...player,
          id: uniqueId(safeId(player.id || `${entry.teamId}-player-${index + 1}`, `${entry.teamId}-player`), playerIds)
        }))
      };
    });
  }
  if (next.draftClass) {
    const prospectIds = new Set<string>();
    next.draftClass.prospects = next.draftClass.prospects.map((prospect, index) => ({
      ...prospect,
      id: uniqueId(safeId(prospect.id || `prospect-${index + 1}`, "prospect"), prospectIds)
    }));
  }
  return next;
}

export function createDataPackSummary(pack: DataPack): string {
  const report = pack.validation ?? validateDataPack(pack);
  const parts = [
    `${pack.name} (${pack.type})`,
    pack.leagueTemplate ? `${pack.leagueTemplate.teamCount} teams` : undefined,
    pack.scenario ? `Scenario: ${pack.scenario.name}` : undefined,
    pack.draftClass ? `${pack.draftClass.prospects.length} prospects` : undefined,
    report.valid ? "valid" : `${report.errors.length} errors`
  ].filter(Boolean);
  return parts.join(" | ");
}

function validateLeagueTemplate(template: Partial<CustomLeagueTemplate>) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const duplicateIdWarnings: string[] = [];
  const balanceWarnings = validateLeagueBalance(template);
  const ruleReport = validateLeagueRuleSet(template.rules ?? template);
  if (!template.id) errors.push("League template is missing id.");
  if (!template.name) errors.push("League template is missing name.");
  if (!Number.isFinite(template.seasonYear) || template.seasonYear! < 2026) errors.push("League seasonYear must be 2026 or later.");
  if (!Array.isArray(template.teams)) errors.push("League template teams must be an array.");
  if (!ruleReport.supported) errors.push(...ruleReport.errors);
  if (template.teams) {
    const rules = ruleReport.normalizedRuleSet ?? normalizeLeagueRuleSet(template.rules ?? template);
    if (template.teamCount !== rules.teamCount) errors.push("League teamCount must match ruleSet team count.");
    if (template.teams.length > rules.teamCount) errors.push("League template has more teams than the selected ruleSet supports.");
    if (template.teams.length < rules.teamCount) warnings.push(`League template has ${template.teams.length} teams; repair/generation will fill to ${rules.teamCount}.`);
    const teamMessages = validateTeamDefinitions(template.teams);
    errors.push(...teamMessages.filter((message) => !message.toLowerCase().includes("duplicate")));
    duplicateIdWarnings.push(...teamMessages.filter((message) => message.toLowerCase().includes("duplicate")));
  }
  if (!template.rules && !template.rulesPreset) warnings.push("League template is missing Phase 10 ruleSet; legacy fields will be normalized.");
  warnings.push(...balanceWarnings);
  return { errors, warnings, duplicateIdWarnings, balanceWarnings };
}

function validateScenarioReferences(scenario: ScenarioDefinition, template: CustomLeagueTemplate): string[] {
  const messages: string[] = [];
  const teamIds = new Set(template.teams.map((team) => team.id));
  const playerIds = new Set(template.teams.flatMap((team) => team.players?.map((player) => player.id) ?? []));
  scenario.modifiers.forEach((modifier) => {
    if (modifier.targetTeamId && !teamIds.has(modifier.targetTeamId)) messages.push(`${modifier.label} references unknown team.`);
    if (modifier.targetPlayerId && playerIds.size > 0 && !playerIds.has(modifier.targetPlayerId)) messages.push(`${modifier.label} references unknown player.`);
  });
  return messages;
}

function validateContract(contract: Contract, label: string): string[] {
  const messages: string[] = [];
  if (!Number.isFinite(contract.salary) || contract.salary < 0) messages.push(`${label} has invalid contract salary.`);
  if (!Number.isFinite(contract.capHit) || contract.capHit < 0) messages.push(`${label} has invalid contract cap hit.`);
  if (!Number.isFinite(contract.yearsRemaining) || contract.yearsRemaining < 0 || contract.yearsRemaining > 8) messages.push(`${label} has invalid contract years.`);
  if (!["UFA", "RFA", "Prospect"].includes(contract.expiryStatus)) messages.push(`${label} has invalid contract expiry status.`);
  return messages;
}

function repairLeagueTemplate(template: CustomLeagueTemplate, repairedFields: string[]): CustomLeagueTemplate {
  const requestedTeamCount = Number(template.rules?.teamCount ?? template.teamCount);
  const teamCount = VALID_TEAM_COUNTS.includes(requestedTeamCount) ? requestedTeamCount : nearestSupportedLeagueSize(requestedTeamCount);
  const ruleSet = normalizeLeagueRuleSet({ ...(template.rules ?? template), teamCount });
  const capCeiling = clampNumber(ruleSet.capCeiling, 70_000_000, 140_000_000, SALARY_CAP_CEILING);
  const capFloor = clampNumber(ruleSet.capFloor, 35_000_000, Math.min(100_000_000, capCeiling - 1_000_000), SALARY_CAP_FLOOR);
  const repairedTeams = repairTeamDefinitions(template.teams ?? [], repairedFields);
  const teams = fillTeamDefinitions(repairedTeams, teamCount, repairedFields).slice(0, teamCount);
  repairedFields.push("leagueTemplate.rules");
  return {
    ...template,
    id: safeId(template.id || "custom-league", "league"),
    name: cleanedText(template.name || "Custom Fictional League", 72),
    description: cleanedText(template.description || "A local fictional custom league.", 220),
    seasonYear: clampNumber(template.seasonYear, 2026, 2200, 2026),
    teamCount,
    rules: {
      ...ruleSet,
      capCeiling,
      capFloor
    },
    scheduleLength: ruleSet.gamesPerTeam,
    playoffTeamCount: playoffTeamCountForFormat(ruleSet.playoffFormat),
    playoffSeriesLength: ruleSet.playoffSeriesLength,
    draftRounds: ruleSet.draftRounds,
    capCeiling,
    capFloor,
    teams,
    rulesPreset: {
      ...template.rulesPreset,
      id: safeId(template.rulesPreset?.id || "fictional-standard", "rules"),
      label: cleanedText(template.rulesPreset?.label || ruleSet.label, 48),
      description: cleanedText(template.rulesPreset?.description || ruleSet.description, 140),
      teamCount,
      scheduleLength: ruleSet.gamesPerTeam,
      playoffTeamCount: ruleSet.playoffTeamCount,
      playoffSeriesLength: ruleSet.playoffSeriesLength,
      draftRounds: ruleSet.draftRounds,
      capCeiling,
      capFloor,
      rosterActiveMin: ruleSet.activeRosterMin,
      rosterActiveMax: ruleSet.activeRosterMax,
      affiliateEnabled: ruleSet.affiliateEnabled,
      tradeDifficultyModifier: clampNumber(template.rulesPreset?.tradeDifficultyModifier, 0.5, 1.8, 1),
      developmentPaceModifier: clampNumber(template.rulesPreset?.developmentPaceModifier, 0.5, 1.8, 1),
      injuryModifier: clampNumber(template.rulesPreset?.injuryModifier, 0.4, 2, 1)
    }
  };
}

function repairTeamDefinitions(teams: CustomTeamDefinition[], repairedFields: string[]): CustomTeamDefinition[] {
  return teams.map((team, index) => ({
    ...team,
    id: safeId(team.id || `custom-team-${index + 1}`, "team"),
    city: cleanedText(team.city || `Fictional City ${index + 1}`, 40),
    nickname: cleanedText(team.nickname || `Club ${index + 1}`, 32),
    fullName: cleanedText(team.fullName || `${team.city || `Fictional City ${index + 1}`} ${team.nickname || `Club ${index + 1}`}`, 72),
    abbreviation: /^[A-Z]{2,4}$/.test(team.abbreviation) ? team.abbreviation : `T${String(index + 1).padStart(2, "0")}`.slice(0, 4),
    marketSize: ["Small", "Medium", "Large"].includes(team.marketSize) ? team.marketSize : "Medium",
    primaryColor: isValidColor(team.primaryColor) ? team.primaryColor : "#61c9ff",
    secondaryColor: isValidColor(team.secondaryColor) ? team.secondaryColor : "#102033",
    accentColor: isValidColor(team.accentColor) ? team.accentColor : "#f5fbff",
    ownerPatience: clampNumber(team.ownerPatience, 0, 100, 60),
    fanConfidence: clampNumber(team.fanConfidence, 0, 100, 60),
    arenaName: cleanedText(team.arenaName || "Fictional Ice Hall", 60),
    affiliateName: cleanedText(team.affiliateName || `${team.nickname || "Club"} Reserve`, 60),
    rivalryTeamIds: (team.rivalryTeamIds ?? []).filter((id) => id !== team.id).slice(0, 3),
    branding: {
      crestShape: cleanedText(team.branding?.crestShape || "shield", 24),
      crestInitials: cleanedText(team.branding?.crestInitials || team.abbreviation || "FI", 4).toUpperCase(),
      jerseyPattern: cleanedText(team.branding?.jerseyPattern || "double", 24),
      homeJersey: cleanedText(team.branding?.homeJersey || "Home concept", 80),
      awayJersey: cleanedText(team.branding?.awayJersey || "Away concept", 80),
      alternateJersey: cleanedText(team.branding?.alternateJersey || "Alternate concept", 80),
      arenaMood: cleanedText(team.branding?.arenaMood || "fictional energy", 80),
      broadcastStyle: cleanedText(team.branding?.broadcastStyle || "glass", 32),
      chant: cleanedText(team.branding?.chant || "Let's go", 48),
      colorValidationWarnings: team.branding?.colorValidationWarnings ?? []
    },
    players: team.players ? repairPlayerDefinitions(team.players, repairedFields) : undefined
  }));
}

function fillTeamDefinitions(teams: CustomTeamDefinition[], teamCount: number, repairedFields: string[]): CustomTeamDefinition[] {
  if (teams.length >= teamCount) return teams;
  const existingIds = new Set(teams.map((team) => team.id));
  const generated = Array.from({ length: teamCount - teams.length }, (_, offset) => {
    const index = teams.length + offset;
    const id = uniqueId(`generated-club-${index + 1}`, existingIds);
    return {
      id,
      city: `Fictional City ${index + 1}`,
      nickname: `Club ${index + 1}`,
      fullName: `Fictional City ${index + 1} Club ${index + 1}`,
      abbreviation: `T${String(index + 1).padStart(2, "0")}`.slice(0, 4),
      marketSize: "Medium" as const,
      primaryColor: index % 2 === 0 ? "#61c9ff" : "#f4c95d",
      secondaryColor: "#102033",
      accentColor: "#f5fbff",
      teamPersonality: "Generated fictional depth club",
      ownerPatience: 60,
      fanConfidence: 58,
      arenaName: "Fictional Ice Hall",
      affiliateName: `Club ${index + 1} Reserve`,
      rivalryTeamIds: [],
      branding: {
        crestShape: "shield",
        crestInitials: `T${String(index + 1).padStart(2, "0")}`.slice(0, 4),
        jerseyPattern: "double",
        homeJersey: "Generated home concept",
        awayJersey: "Generated away concept",
        alternateJersey: "Generated alternate concept",
        arenaMood: "new fictional market",
        broadcastStyle: "glass",
        chant: "Rise up",
        colorValidationWarnings: []
      },
      rosterStrategy: "balanced" as const
    };
  });
  if (generated.length) repairedFields.push("leagueTemplate.teams");
  return [...teams, ...generated];
}

function repairPlayerDefinitions(players: CustomPlayerDefinition[], repairedFields: string[]): CustomPlayerDefinition[] {
  const ids = new Set<string>();
  return players.map((player, index) => {
    const position = VALID_POSITIONS.includes(player.position) ? player.position : "C";
    const overall = clampNumber(player.overall, 40, 99, 65);
    const potential = Math.max(clampNumber(player.potential, 40, 99, Math.max(overall, 70)), Math.max(40, overall - 8));
    if (overall !== player.overall || potential !== player.potential || position !== player.position) repairedFields.push(`player.${player.id || index}`);
    return {
      ...player,
      id: uniqueId(safeId(player.id || `player-${index + 1}`, "player"), ids),
      firstName: cleanedText(player.firstName || "Fictional", 32),
      lastName: cleanedText(player.lastName || `Player${index + 1}`, 32),
      displayName: cleanedText(player.displayName || `${player.firstName || "Fictional"} ${player.lastName || `Player${index + 1}`}`, 72),
      age: clampNumber(player.age, 17, 45, 25),
      position,
      handedness: player.handedness === "R" ? "R" : "L",
      nationality: cleanedText(player.nationality || "Canada", 32),
      overall,
      potential,
      morale: clampNumber(player.morale, 0, 100, 60),
      form: clampNumber(player.form, 0, 100, 55),
      fatigue: clampNumber(player.fatigue, 0, 100, 24)
    };
  });
}

function repairDraftClass(prospects: Prospect[], repairedFields: string[]): Prospect[] {
  const ids = new Set<string>();
  const ranks = new Set<number>();
  return prospects.map((prospect, index) => {
    let publicRank = clampNumber(prospect.publicRank, 1, 999, index + 1);
    while (ranks.has(publicRank)) publicRank += 1;
    ranks.add(publicRank);
    if (publicRank !== prospect.publicRank) repairedFields.push(`prospect.${prospect.id}.publicRank`);
    return {
      ...prospect,
      id: uniqueId(safeId(prospect.id || `prospect-${index + 1}`, "prospect"), ids),
      age: clampNumber(prospect.age, 16, 22, 18),
      position: VALID_POSITIONS.includes(prospect.position) ? prospect.position : "C",
      publicRank,
      projectedRound: clampNumber(prospect.projectedRound, 1, 7, Math.ceil(publicRank / 18)),
      actualOverall: clampNumber(prospect.actualOverall, 40, 99, 58),
      actualPotential: clampNumber(prospect.actualPotential, 40, 99, 76)
    };
  });
}

function emptyReport(): DataPackValidationReport {
  return {
    valid: false,
    supported: false,
    errors: [],
    warnings: [],
    unsupportedReasons: [],
    suggestedFixes: [],
    repairedFields: [],
    realWorldContentFlags: [],
    duplicateIdWarnings: [],
    balanceWarnings: [],
    generatedFallbacks: []
  };
}

function finishReport(report: DataPackValidationReport): DataPackValidationReport {
  const errors = Array.from(new Set(report.errors));
  const realWorldContentFlags = Array.from(new Set(report.realWorldContentFlags));
  const unsupportedReasons = Array.from(new Set(report.unsupportedReasons.length ? report.unsupportedReasons : errors.filter((message) => message.toLowerCase().includes("unsupported"))));
  const supported = unsupportedReasons.length === 0;
  return {
    ...report,
    valid: supported && errors.length === 0 && realWorldContentFlags.length === 0 && report.duplicateIdWarnings.length === 0,
    supported,
    errors,
    warnings: Array.from(new Set(report.warnings)),
    unsupportedReasons,
    suggestedFixes: Array.from(new Set(report.suggestedFixes)),
    repairedFields: Array.from(new Set(report.repairedFields)),
    realWorldContentFlags,
    duplicateIdWarnings: Array.from(new Set(report.duplicateIdWarnings)),
    balanceWarnings: Array.from(new Set(report.balanceWarnings)),
    generatedFallbacks: Array.from(new Set(report.generatedFallbacks))
  };
}

function duplicateWarnings(values: Array<string | number | undefined>, label: string): string[] {
  const seen = new Set<string>();
  const warnings: string[] = [];
  values.filter(Boolean).forEach((value) => {
    const normalized = String(value);
    if (seen.has(normalized)) warnings.push(`Duplicate ${label} id or key: ${normalized}.`);
    seen.add(normalized);
  });
  return warnings;
}

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (isRecord(value)) return Object.values(value).flatMap(collectStrings);
  return [];
}

function detectUnsupportedSerializableValues(value: unknown, path = "pack", seen = new Set<unknown>()): string[] {
  if (typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") return [`Unsupported non-serializable value at ${path}.`];
  if (!value || typeof value !== "object") return [];
  if (seen.has(value)) return [`Circular or repeated object reference at ${path}.`];
  seen.add(value);
  if (typeof Element !== "undefined" && value instanceof Element) return [`Renderer/browser object is not allowed at ${path}.`];
  if (Array.isArray(value)) return value.flatMap((item, index) => detectUnsupportedSerializableValues(item, `${path}[${index}]`, seen));
  return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) => detectUnsupportedSerializableValues(item, `${path}.${key}`, seen));
}

function jsonClone<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return {} as T;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isValidColor(value: unknown): value is string {
  return typeof value === "string" && COLOR_PATTERN.test(value);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

function clampToAllowed(value: unknown, allowed: number[], fallback: number): number {
  const numeric = Number(value);
  return allowed.includes(numeric) ? numeric : fallback;
}

function safeId(value: string, fallback: string): string {
  const id = String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return id || fallback;
}

function uniqueId(value: string, seen: Set<string>): string {
  let next = value;
  let suffix = 2;
  while (seen.has(next)) {
    next = `${value}-${suffix}`;
    suffix += 1;
  }
  seen.add(next);
  return next;
}

function cleanedText(value: string, maxLength: number): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function validIso(value: unknown): boolean {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}
