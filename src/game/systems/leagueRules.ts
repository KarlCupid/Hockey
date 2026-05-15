import {
  ACTIVE_ROSTER_LIMIT,
  ACTIVE_ROSTER_MINIMUM,
  REGULAR_SEASON_DAYS,
  SALARY_CAP_CEILING,
  SALARY_CAP_FLOOR,
  START_DATE
} from "../constants";
import type {
  LeagueRuleSet,
  LeagueRuleValidationReport,
  LeagueSize,
  PlayoffFormat,
  PlayoffSeriesFormat,
  ScheduleFormat
} from "../types";

const SUPPORTED_LEAGUE_SIZES: LeagueSize[] = [8, 10, 12, 16];

const SCHEDULE_GAMES: Record<LeagueSize, Partial<Record<ScheduleFormat, number>>> = {
  8: {
    doubleRoundRobin: 14,
    balancedShort: 14,
    balancedStandard: 21,
    balancedLong: 28
  },
  10: {
    doubleRoundRobin: 18,
    balancedShort: 18,
    balancedStandard: 27,
    balancedLong: 36
  },
  12: {
    doubleRoundRobin: 22,
    balancedShort: 22,
    balancedStandard: REGULAR_SEASON_DAYS,
    balancedLong: 44
  },
  16: {
    doubleRoundRobin: 30,
    balancedShort: 30,
    balancedStandard: 45,
    balancedLong: 60
  }
};

const PLAYOFF_FORMATS: Record<LeagueSize, PlayoffFormat[]> = {
  8: ["top4", "top6WithByes"],
  10: ["top4", "top6WithByes", "top8"],
  12: ["top4", "top6WithByes", "top8"],
  16: ["top8", "top10WithPlayIn"]
};

const DRAFT_ROUND_LIMITS: Record<LeagueSize, { min: number; max: number; default: number }> = {
  8: { min: 3, max: 5, default: 3 },
  10: { min: 3, max: 5, default: 4 },
  12: { min: 3, max: 7, default: 4 },
  16: { min: 4, max: 7, default: 5 }
};

const PLAYOFF_TEAM_COUNT_BY_FORMAT: Record<PlayoffFormat, number> = {
  top4: 4,
  top6WithByes: 6,
  top8: 8,
  top10WithPlayIn: 10
};

const SERIES_LENGTH_BY_FORMAT: Record<PlayoffSeriesFormat, number> = {
  singleGame: 1,
  bestOf3: 3,
  bestOf5: 5,
  bestOf7: 7
};

export function getSupportedLeagueSizes(): LeagueSize[] {
  return [...SUPPORTED_LEAGUE_SIZES];
}

export function createDefaultRuleSet(): LeagueRuleSet {
  return createRuleSetForTeamCount(12);
}

export function createRuleSetForTeamCount(teamCountInput: number): LeagueRuleSet {
  const teamCount = toLeagueSize(teamCountInput) ?? 12;
  const draftRounds = DRAFT_ROUND_LIMITS[teamCount].default;
  const playoffFormat = defaultPlayoffFormat(teamCount);
  const scheduleFormat: ScheduleFormat = "balancedStandard";
  const gamesPerTeam = SCHEDULE_GAMES[teamCount][scheduleFormat] ?? SCHEDULE_GAMES[teamCount].doubleRoundRobin ?? REGULAR_SEASON_DAYS;
  const playoffSeriesFormat: PlayoffSeriesFormat = "bestOf5";
  const draftFormat = {
    rounds: draftRounds,
    prospectsPerPickMultiplier: 2,
    lotteryTeams: defaultLotteryTeams(teamCount)
  };
  return {
    id: `fictional-${teamCount}-team-standard`,
    label: `${teamCount}-Team Fictional Standard`,
    description: `${teamCount} fictional clubs, ${gamesPerTeam} games per team, ${formatPlayoffLabel(playoffFormat)}, and ${draftRounds} draft rounds.`,
    teamCount,
    scheduleFormat,
    gamesPerTeam,
    playoffTeamCount: PLAYOFF_TEAM_COUNT_BY_FORMAT[playoffFormat],
    playoffFormat,
    playoffSeriesFormat,
    playoffSeriesLength: SERIES_LENGTH_BY_FORMAT[playoffSeriesFormat],
    draftRounds,
    draftClassSize: teamCount * draftRounds * draftFormat.prospectsPerPickMultiplier,
    draftFormat,
    capCeiling: SALARY_CAP_CEILING,
    capFloor: SALARY_CAP_FLOOR,
    activeRosterMin: ACTIVE_ROSTER_MINIMUM,
    activeRosterMax: ACTIVE_ROSTER_LIMIT,
    affiliateEnabled: true,
    tradeDeadlineDayIndex: Math.max(1, Math.floor(gamesPerTeam * 0.72)),
    seasonStartDate: START_DATE
  };
}

export function normalizeLeagueRuleSet(input?: unknown): LeagueRuleSet {
  const record = isRecord(input) ? input : {};
  const nestedRules = isRecord(record.rules) ? record.rules : undefined;
  const source = nestedRules ?? record;
  const teamCount = toLeagueSize(Number(source.teamCount ?? record.teamCount)) ?? 12;
  const base = createRuleSetForTeamCount(teamCount);
  const scheduleFormat = isScheduleFormat(source.scheduleFormat) ? source.scheduleFormat : inferScheduleFormat(teamCount, Number(source.gamesPerTeam ?? record.scheduleLength), base.scheduleFormat);
  const gamesPerTeam = normalizeGamesPerTeam(teamCount, Number(source.gamesPerTeam ?? record.scheduleLength), scheduleFormat);
  const playoffFormat = isPlayoffFormat(source.playoffFormat)
    ? source.playoffFormat
    : inferPlayoffFormat(teamCount, Number(source.playoffTeamCount ?? record.playoffTeamCount), base.playoffFormat);
  const seriesFormat = isPlayoffSeriesFormat(source.playoffSeriesFormat)
    ? source.playoffSeriesFormat
    : inferSeriesFormat(Number(source.playoffSeriesLength ?? record.playoffSeriesLength), base.playoffSeriesFormat);
  const roundLimits = DRAFT_ROUND_LIMITS[teamCount];
  const draftRounds = clampInteger(Number(source.draftRounds ?? record.draftRounds), roundLimits.min, roundLimits.max, base.draftRounds);
  const draftMultiplier = clampInteger(Number(isRecord(source.draftFormat) ? source.draftFormat.prospectsPerPickMultiplier : undefined), 1, 4, 2);
  const minimumDraftClass = teamCount * draftRounds;
  const preferredDraftClass = teamCount * draftRounds * draftMultiplier;
  const draftClassSize = Math.max(
    minimumDraftClass,
    clampInteger(Number(source.draftClassSize ?? record.draftClassSize), minimumDraftClass, 240, preferredDraftClass)
  );
  const capCeiling = clampInteger(Number(source.capCeiling ?? record.capCeiling), 70_000_000, 140_000_000, base.capCeiling);
  const capFloor = clampInteger(Number(source.capFloor ?? record.capFloor), 35_000_000, Math.min(100_000_000, capCeiling - 1_000_000), base.capFloor);
  const activeRosterMin = clampInteger(Number(source.activeRosterMin ?? source.rosterActiveMin), 18, 23, base.activeRosterMin);
  const activeRosterMax = clampInteger(Number(source.activeRosterMax ?? source.rosterActiveMax), activeRosterMin, 30, base.activeRosterMax);
  const normalized: LeagueRuleSet = {
    ...base,
    id: cleanId(String(source.id ?? base.id)),
    label: cleanText(String(source.label ?? base.label), 72),
    description: cleanText(String(source.description ?? base.description), 220),
    teamCount,
    scheduleFormat,
    gamesPerTeam,
    playoffFormat,
    playoffTeamCount: PLAYOFF_TEAM_COUNT_BY_FORMAT[playoffFormat],
    playoffSeriesFormat: seriesFormat,
    playoffSeriesLength: SERIES_LENGTH_BY_FORMAT[seriesFormat],
    draftRounds,
    draftClassSize,
    draftFormat: {
      rounds: draftRounds,
      prospectsPerPickMultiplier: draftMultiplier,
      lotteryTeams: clampInteger(Number(isRecord(source.draftFormat) ? source.draftFormat.lotteryTeams : undefined), 3, 6, defaultLotteryTeams(teamCount))
    },
    capCeiling,
    capFloor,
    activeRosterMin,
    activeRosterMax,
    affiliateEnabled: source.affiliateEnabled === false ? false : true,
    tradeDeadlineDayIndex: Number.isFinite(Number(source.tradeDeadlineDayIndex))
      ? clampInteger(Number(source.tradeDeadlineDayIndex), 1, Math.max(1, gamesPerTeam), base.tradeDeadlineDayIndex ?? Math.floor(gamesPerTeam * 0.72))
      : base.tradeDeadlineDayIndex,
    seasonStartDate: typeof source.seasonStartDate === "string" && !Number.isNaN(Date.parse(source.seasonStartDate)) ? source.seasonStartDate : START_DATE
  };
  return {
    ...normalized,
    description: source.description ? normalized.description : getRuleSetDescription(normalized)
  };
}

export function validateLeagueRuleSet(ruleSetInput: unknown): LeagueRuleValidationReport {
  const rawRecord = isRecord(ruleSetInput) ? ruleSetInput : {};
  const rawRules = isRecord(rawRecord.rules) ? rawRecord.rules : rawRecord;
  const rawTeamCount = Number(rawRules.teamCount ?? rawRecord.teamCount);
  const rawDraftClassSize = Number(rawRules.draftClassSize ?? rawRecord.draftClassSize);
  const normalized = normalizeLeagueRuleSet(ruleSetInput);
  const errors: string[] = [];
  const warnings: string[] = [];
  const supportedSize = SUPPORTED_LEAGUE_SIZES.includes(rawTeamCount as LeagueSize);
  if (Number.isFinite(rawTeamCount) && !supportedSize) errors.push("Team count must be one of 8, 10, 12, or 16.");
  if (!getSupportedScheduleFormats(normalized.teamCount).includes(normalized.scheduleFormat)) {
    errors.push(`${normalized.scheduleFormat} is not supported for ${normalized.teamCount}-team leagues.`);
  }
  const allowedGames = allowedGamesForTeamCount(normalized.teamCount);
  if (!allowedGames.includes(normalized.gamesPerTeam)) {
    errors.push(`${normalized.gamesPerTeam} games per team is not supported for ${normalized.teamCount}-team leagues.`);
  }
  if (!getSupportedPlayoffFormats(normalized.teamCount).includes(normalized.playoffFormat)) {
    errors.push(`${formatPlayoffLabel(normalized.playoffFormat)} is not supported for ${normalized.teamCount}-team leagues.`);
  }
  if (normalized.playoffTeamCount !== PLAYOFF_TEAM_COUNT_BY_FORMAT[normalized.playoffFormat]) {
    errors.push("Playoff team count must match playoff format.");
  }
  if (normalized.playoffTeamCount >= normalized.teamCount) warnings.push("Playoff teams should be fewer than total league teams.");
  if (normalized.capFloor >= normalized.capCeiling) warnings.push("Cap floor must be below cap ceiling.");
  if (normalized.activeRosterMin > normalized.activeRosterMax) warnings.push("Active roster minimum cannot exceed maximum.");
  const roundLimits = DRAFT_ROUND_LIMITS[normalized.teamCount];
  if (normalized.draftRounds < roundLimits.min || normalized.draftRounds > roundLimits.max) {
    errors.push(`${normalized.teamCount}-team leagues support ${roundLimits.min}-${roundLimits.max} draft rounds.`);
  }
  const minimumDraftClass = normalized.teamCount * normalized.draftRounds;
  const preferredDraftClass = normalized.teamCount * normalized.draftRounds * 2;
  if (Number.isFinite(rawDraftClassSize) && rawDraftClassSize < minimumDraftClass) errors.push(`Draft class must include at least ${minimumDraftClass} prospects.`);
  if (Number.isFinite(rawDraftClassSize) && rawDraftClassSize >= minimumDraftClass && rawDraftClassSize < preferredDraftClass) {
    warnings.push(`Draft class is below the recommended ${preferredDraftClass} prospects.`);
  }
  if (normalized.draftClassSize < minimumDraftClass) errors.push(`Draft class must include at least ${minimumDraftClass} prospects.`);
  if (normalized.draftClassSize < preferredDraftClass) warnings.push(`Draft class is below the recommended ${preferredDraftClass} prospects.`);
  if (normalized.gamesPerTeam >= 45) warnings.push("Long custom schedules can make multi-season dry runs slower.");
  const valid = errors.length === 0 && !warnings.some((warning) => warning.includes("cannot exceed") || warning.includes("must be below"));
  return {
    valid,
    warnings,
    errors,
    supported: errors.length === 0,
    normalizedRuleSet: normalized
  };
}

export function getSupportedPlayoffFormats(teamCountInput: number): PlayoffFormat[] {
  const teamCount = toLeagueSize(teamCountInput) ?? 12;
  return [...PLAYOFF_FORMATS[teamCount]];
}

export function getSupportedScheduleFormats(teamCountInput: number): ScheduleFormat[] {
  const teamCount = toLeagueSize(teamCountInput) ?? 12;
  return Object.keys(SCHEDULE_GAMES[teamCount]) as ScheduleFormat[];
}

export function getRuleSetDescription(ruleSetInput: LeagueRuleSet): string {
  const ruleSet = normalizeLeagueRuleSet(ruleSetInput);
  return `${ruleSet.teamCount} teams, ${ruleSet.gamesPerTeam} games per team, ${formatPlayoffLabel(ruleSet.playoffFormat)}, ${formatSeriesLabel(ruleSet.playoffSeriesFormat)}, ${ruleSet.draftRounds} draft rounds, ${ruleSet.affiliateEnabled ? "affiliates on" : "affiliates off"}.`;
}

export function getRuleSetWarnings(ruleSet: LeagueRuleSet): string[] {
  return validateLeagueRuleSet(ruleSet).warnings;
}

export function playoffTeamCountForFormat(format: PlayoffFormat): number {
  return PLAYOFF_TEAM_COUNT_BY_FORMAT[format];
}

export function seriesLengthForFormat(format: PlayoffSeriesFormat): number {
  return SERIES_LENGTH_BY_FORMAT[format];
}

export function allowedGamesForTeamCount(teamCountInput: number): number[] {
  const teamCount = toLeagueSize(teamCountInput) ?? 12;
  return Array.from(new Set(Object.values(SCHEDULE_GAMES[teamCount]).filter((value): value is number => Number.isFinite(value)))).sort((a, b) => a - b);
}

export function nearestSupportedLeagueSize(teamCountInput: number): LeagueSize {
  return SUPPORTED_LEAGUE_SIZES.reduce((best, candidate) =>
    Math.abs(candidate - teamCountInput) < Math.abs(best - teamCountInput) ? candidate : best
  );
}

function defaultPlayoffFormat(teamCount: LeagueSize): PlayoffFormat {
  if (teamCount === 16) return "top8";
  if (teamCount === 8) return "top4";
  return "top8";
}

function defaultLotteryTeams(teamCount: LeagueSize): number {
  return Math.max(3, Math.min(6, Math.round(teamCount * 0.3)));
}

function normalizeGamesPerTeam(teamCount: LeagueSize, input: number, scheduleFormat: ScheduleFormat): number {
  const allowed = allowedGamesForTeamCount(teamCount);
  if (allowed.includes(input)) return input;
  return SCHEDULE_GAMES[teamCount][scheduleFormat] ?? SCHEDULE_GAMES[teamCount].doubleRoundRobin ?? allowed[0];
}

function inferScheduleFormat(teamCount: LeagueSize, gamesPerTeam: number, fallback: ScheduleFormat): ScheduleFormat {
  const entry = Object.entries(SCHEDULE_GAMES[teamCount]).find(([, games]) => games === gamesPerTeam);
  return (entry?.[0] as ScheduleFormat | undefined) ?? fallback;
}

function inferPlayoffFormat(teamCount: LeagueSize, playoffTeamCount: number, fallback: PlayoffFormat): PlayoffFormat {
  const candidate = (Object.entries(PLAYOFF_TEAM_COUNT_BY_FORMAT).find(([, count]) => count === playoffTeamCount)?.[0] as PlayoffFormat | undefined) ?? fallback;
  return getSupportedPlayoffFormats(teamCount).includes(candidate) ? candidate : fallback;
}

function inferSeriesFormat(seriesLength: number, fallback: PlayoffSeriesFormat): PlayoffSeriesFormat {
  return (Object.entries(SERIES_LENGTH_BY_FORMAT).find(([, length]) => length === seriesLength)?.[0] as PlayoffSeriesFormat | undefined) ?? fallback;
}

function toLeagueSize(value: number): LeagueSize | undefined {
  return SUPPORTED_LEAGUE_SIZES.find((size) => size === value);
}

function isScheduleFormat(value: unknown): value is ScheduleFormat {
  return value === "doubleRoundRobin" || value === "balancedShort" || value === "balancedStandard" || value === "balancedLong";
}

function isPlayoffFormat(value: unknown): value is PlayoffFormat {
  return value === "top4" || value === "top6WithByes" || value === "top8" || value === "top10WithPlayIn";
}

function isPlayoffSeriesFormat(value: unknown): value is PlayoffSeriesFormat {
  return value === "singleGame" || value === "bestOf3" || value === "bestOf5" || value === "bestOf7";
}

function formatPlayoffLabel(format: PlayoffFormat): string {
  if (format === "top4") return "top 4 playoffs";
  if (format === "top6WithByes") return "top 6 playoffs with byes";
  if (format === "top10WithPlayIn") return "top 10 playoffs with play-in";
  return "top 8 playoffs";
}

function formatSeriesLabel(format: PlayoffSeriesFormat): string {
  if (format === "singleGame") return "single-game rounds";
  if (format === "bestOf3") return "best-of-3 series";
  if (format === "bestOf7") return "best-of-7 series";
  return "best-of-5 series";
}

function clampInteger(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function cleanId(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "fictional-rules";
}

function cleanText(value: string, maxLength: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
