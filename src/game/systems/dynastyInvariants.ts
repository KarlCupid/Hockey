import { SCHEMA_VERSION } from "../constants";
import { autoFillBestLineup, validateLineup } from "./lineupValidation";
import { calculateActiveRosterCapHit, calculateAffiliateCommitments, calculateTeamCapHit } from "./contracts";
import { getPlayerRosterStatus, validateRosterForGame } from "./rosterRules";
import { TUNING } from "./tuning";
import type { DraftSelection, FranchiseState, Player, SeasonPhase, StaffMember, Team } from "../types";

export interface DynastyInvariantIssue {
  code: string;
  message: string;
  path?: string;
}

export interface DynastyInvariantReport {
  checkedAt: string;
  valid: boolean;
  errors: DynastyInvariantIssue[];
  warnings: DynastyInvariantIssue[];
  summary: {
    teams: number;
    activePlayers: number;
    draftPicks: number;
    prospects: number;
    phase: SeasonPhase;
    schemaVersion: number;
  };
}

const VALID_PHASES: SeasonPhase[] = [
  "regularSeason",
  "playoffs",
  "seasonReview",
  "retirements",
  "draftLottery",
  "draft",
  "reSigning",
  "freeAgency",
  "staffHiring",
  "trainingCamp",
  "preseason",
  "completed"
];

const REAL_HOCKEY_NAMES = /NHL|Maple Leafs|Canadiens|Rangers|Bruins|Blackhawks|Red Wings|Flyers|Penguins|Oilers|Flames|Canucks|Avalanche|Golden Knights|Kraken/i;

export function validateDynastyInvariants(franchise: FranchiseState): DynastyInvariantReport {
  const errors: DynastyInvariantIssue[] = [];
  const warnings: DynastyInvariantIssue[] = [];
  const teams = franchise.league?.teams ?? [];
  const teamIds = new Set<string>();
  const playerIds = new Set<string>();
  const allPlayers: Player[] = [];

  if (franchise.schemaVersion !== SCHEMA_VERSION) {
    warnings.push(issue("schema.version", `Save schema is v${franchise.schemaVersion}; current runtime hydrates to v${SCHEMA_VERSION}.`, "schemaVersion"));
  }

  if (teams.length !== TUNING.dynasty.requiredTeams) {
    errors.push(issue("league.teamCount", `Expected exactly ${TUNING.dynasty.requiredTeams} teams, found ${teams.length}.`, "league.teams"));
  }

  teams.forEach((team, teamIndex) => {
    const teamPath = `league.teams[${teamIndex}]`;
    if (teamIds.has(team.id)) errors.push(issue("team.duplicateId", `Duplicate team id ${team.id}.`, `${teamPath}.id`));
    teamIds.add(team.id);

    if (REAL_HOCKEY_NAMES.test(`${team.fullName} ${team.city} ${team.nickname}`)) {
      errors.push(issue("team.realBranding", `Team branding must stay fictional: ${team.fullName}.`, teamPath));
    }

    validateTeamRoster(team, teamPath, playerIds, allPlayers, errors, warnings);
    validateDraftPicks(team, teamPath, errors);
    validateStandings(team, teamPath, errors);

    const capHit = calculateTeamCapHit(team);
    if (!Number.isFinite(capHit)) errors.push(issue("team.capNaN", `${team.fullName} cap hit is not a finite number.`, teamPath));
    if (!Number.isFinite(calculateAffiliateCommitments(team))) errors.push(issue("team.affiliateCapNaN", `${team.fullName} affiliate commitments are not finite.`, teamPath));
  });

  validateSchedule(franchise, teamIds, errors);
  validatePlayoffs(franchise, teamIds, errors);
  validateDraftState(franchise, errors);
  validateProspectPools(franchise, playerIds, errors, warnings);
  validateFreeAgency(franchise, playerIds, errors);
  validateStaff(franchise, errors, warnings);
  validateHistory(franchise, errors, warnings);
  validateLivingOps(franchise, teamIds, playerIds, errors, warnings);
  validateReleaseCandidateState(franchise, teamIds, errors, warnings);
  validatePhase(franchise, errors, warnings);
  validateJsonSerializable(franchise, errors);

  return {
    checkedAt: new Date().toISOString(),
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      teams: teams.length,
      activePlayers: allPlayers.length,
      draftPicks: teams.reduce((sum, team) => sum + team.draftPicks.length, 0),
      prospects: Object.values(franchise.prospectPools ?? {}).reduce((sum, pool) => sum + pool.length, 0),
      phase: franchise.seasonPhase,
      schemaVersion: franchise.schemaVersion
    }
  };
}

function validateReleaseCandidateState(franchise: FranchiseState, teamIds: Set<string>, errors: DynastyInvariantIssue[], warnings: DynastyInvariantIssue[]) {
  if (!franchise.tutorialState) warnings.push(issue("phase8.tutorialMissing", "Tutorial state is missing.", "tutorialState"));
  if (!Array.isArray(franchise.achievements)) warnings.push(issue("phase8.achievementsMissing", "Achievements are missing.", "achievements"));
  if (!Array.isArray(franchise.milestones)) warnings.push(issue("phase8.milestonesMissing", "Franchise milestones are missing.", "milestones"));
  if (!Array.isArray(franchise.localTelemetry)) warnings.push(issue("phase8.telemetryMissing", "Local telemetry is missing.", "localTelemetry"));
  if ((franchise.localTelemetry ?? []).length > 150) warnings.push(issue("phase8.telemetryCap", "Local telemetry exceeds the release-candidate cap.", "localTelemetry"));

  const achievementIds = new Set<string>();
  (franchise.achievements ?? []).forEach((achievement, index) => {
    if (achievementIds.has(achievement.id)) errors.push(issue("phase8.achievementDuplicate", `Duplicate achievement id ${achievement.id}.`, `achievements[${index}]`));
    achievementIds.add(achievement.id);
  });

  (franchise.milestones ?? []).forEach((milestone, index) => {
    if (!teamIds.has(milestone.teamId)) warnings.push(issue("phase8.milestoneTeam", `Milestone references missing team ${milestone.teamId}.`, `milestones[${index}]`));
  });
}

export function getInvariantMessages(report: DynastyInvariantReport): string[] {
  return [...report.errors, ...report.warnings].map((item) => `${item.code}: ${item.message}`);
}

function validateTeamRoster(
  team: Team,
  teamPath: string,
  playerIds: Set<string>,
  allPlayers: Player[],
  errors: DynastyInvariantIssue[],
  warnings: DynastyInvariantIssue[]
) {
  const localIds = new Set<string>();
  team.roster.forEach((player, playerIndex) => {
    const playerPath = `${teamPath}.roster[${playerIndex}]`;
    allPlayers.push(player);
    if (localIds.has(player.id)) errors.push(issue("player.duplicateOnTeam", `${team.fullName} has duplicate player id ${player.id}.`, playerPath));
    localIds.add(player.id);
    if (playerIds.has(player.id)) errors.push(issue("player.duplicateInLeague", `Duplicate player id across league rosters: ${player.id}.`, playerPath));
    playerIds.add(player.id);
    if (player.teamId !== team.id) errors.push(issue("player.teamMismatch", `${player.displayName} has teamId ${player.teamId}, expected ${team.id}.`, playerPath));
    validatePlayer(player, playerPath, errors);
  });

  const counts = countPositions(team);
  const canFillLineup = counts.forwards >= 12 && counts.defense >= 6 && counts.goalies >= 2;
  const rosterReport = validateRosterForGame(team);
  if (!team.affiliate) errors.push(issue("team.missingAffiliate", `${team.fullName} is missing a Phase 5 affiliate.`, `${teamPath}.affiliate`));
  if (!Array.isArray(team.rosterMoveLog)) warnings.push(issue("team.missingRosterMoveLog", `${team.fullName} is missing roster move log.`, `${teamPath}.rosterMoveLog`));
  if (rosterReport.activeCount > (team.activeRosterLimit ?? 23)) warnings.push(issue("team.activeRosterOverLimit", `${team.fullName} active roster is over limit.`, `${teamPath}.roster`));
  if (rosterReport.activeCount < (team.activeRosterMinimum ?? 20)) warnings.push(issue("team.activeRosterUnderMinimum", `${team.fullName} active roster is below minimum.`, `${teamPath}.roster`));
  if (canFillLineup) {
    const autofilled = autoFillBestLineup(team);
    const lineupErrors = validateLineup({ ...team, lines: autofilled.lineup }).errors;
    if (lineupErrors.length) {
      errors.push(issue("team.lineupAutofill", `${team.fullName} should auto-fill a valid lineup but has ${lineupErrors.join("; ")}.`, `${teamPath}.lines`));
    }
  } else {
    warnings.push(
      issue(
        "team.rosterShort",
        `${team.fullName} may not have enough active players to auto-fill every lineup slot (${counts.forwards}F/${counts.defense}D/${counts.goalies}G).`,
        `${teamPath}.roster`
      )
    );
  }
}

function validatePlayer(player: Player, path: string, errors: DynastyInvariantIssue[]) {
  const status = getPlayerRosterStatus(player);
  if (!player.rosterStatus) errors.push(issue("player.missingRosterStatus", `${player.displayName} is missing roster status.`, `${path}.rosterStatus`));
  if (status === "prospectRights") errors.push(issue("player.prospectRightsOnRoster", `${player.displayName} is a prospect-rights marker on a signed roster.`, path));
  if (player.age < 0) errors.push(issue("player.negativeAge", `${player.displayName} has a negative age.`, `${path}.age`));
  if (player.overall < 40 || player.overall > 99) errors.push(issue("player.overallBounds", `${player.displayName} overall is out of bounds.`, `${path}.overall`));
  if (player.potential < 40 || player.potential > 99) errors.push(issue("player.potentialBounds", `${player.displayName} potential is out of bounds.`, `${path}.potential`));
  (["morale", "form", "fatigue"] as const).forEach((key) => {
    if (player[key] < 0 || player[key] > 100) errors.push(issue("player.bandBounds", `${player.displayName} ${key} is outside 0-100.`, `${path}.${key}`));
  });
  if (player.injuryGamesRemaining < 0) errors.push(issue("player.negativeInjury", `${player.displayName} has negative injury games.`, `${path}.injuryGamesRemaining`));
  if (player.contract.salary < 0 || player.contract.capHit < 0) errors.push(issue("contract.negativeMoney", `${player.displayName} has a negative contract value.`, `${path}.contract`));
  if (player.contract.yearsRemaining < 0 || player.contract.yearsRemaining > 8) {
    errors.push(issue("contract.impossibleYears", `${player.displayName} has impossible contract years: ${player.contract.yearsRemaining}.`, `${path}.contract.yearsRemaining`));
  }
  if (player.careerHistory) {
    try {
      JSON.stringify(player.careerHistory);
    } catch {
      errors.push(issue("player.careerHistorySerialization", `${player.displayName} career history is not serializable.`, `${path}.careerHistory`));
    }
  }
}

function validateDraftPicks(team: Team, teamPath: string, errors: DynastyInvariantIssue[]) {
  const pickIds = new Set<string>();
  team.draftPicks.forEach((pick, index) => {
    const path = `${teamPath}.draftPicks[${index}]`;
    if (pickIds.has(pick.id)) errors.push(issue("pick.duplicateOnTeam", `${team.fullName} has duplicate draft pick ${pick.id}.`, path));
    pickIds.add(pick.id);
    if (pick.ownerTeamId !== team.id) errors.push(issue("pick.ownerMismatch", `${pick.label} lives with ${team.id} but owner is ${pick.ownerTeamId}.`, path));
    if (pick.round < 1) errors.push(issue("pick.roundInvalid", `${pick.label} has invalid round ${pick.round}.`, path));
  });
}

function validateStandings(team: Team, teamPath: string, errors: DynastyInvariantIssue[]) {
  Object.entries(team.record).forEach(([key, value]) => {
    if (typeof value === "number" && value < 0) errors.push(issue("standings.negative", `${team.fullName} has negative record value ${key}.`, `${teamPath}.record.${key}`));
  });
  Object.entries(team.stats).forEach(([key, value]) => {
    if (typeof value === "number" && value < 0) errors.push(issue("teamStats.negative", `${team.fullName} has negative stat value ${key}.`, `${teamPath}.stats.${key}`));
  });
}

function validateSchedule(franchise: FranchiseState, teamIds: Set<string>, errors: DynastyInvariantIssue[]) {
  franchise.league.schedule.forEach((game, index) => {
    if (!teamIds.has(game.homeTeamId) || !teamIds.has(game.awayTeamId)) {
      errors.push(issue("schedule.invalidTeam", `Schedule game ${game.id} references invalid teams.`, `league.schedule[${index}]`));
    }
  });
}

function validatePlayoffs(franchise: FranchiseState, teamIds: Set<string>, errors: DynastyInvariantIssue[]) {
  franchise.playoffState?.bracket.forEach((series, seriesIndex) => {
    [series.homeSeedTeamId, series.awaySeedTeamId, series.winnerTeamId].filter(Boolean).forEach((teamId) => {
      if (!teamIds.has(teamId!)) errors.push(issue("playoffs.invalidSeriesTeam", `Playoff series ${series.id} references invalid team ${teamId}.`, `playoffState.bracket[${seriesIndex}]`));
    });
    series.games.forEach((game, gameIndex) => {
      if (!teamIds.has(game.homeTeamId) || !teamIds.has(game.awayTeamId)) {
        errors.push(issue("playoffs.invalidGameTeam", `Playoff game ${game.id} references invalid teams.`, `playoffState.bracket[${seriesIndex}].games[${gameIndex}]`));
      }
    });
  });
}

function validateDraftState(franchise: FranchiseState, errors: DynastyInvariantIssue[]) {
  const selections = franchise.offseasonState?.draftState?.selections ?? [];
  const prospectIds = new Set<string>();
  selections.forEach((selection, index) => {
    if (prospectIds.has(selection.prospectId)) {
      errors.push(issue("draft.duplicateProspect", `${selection.prospectName} was drafted more than once.`, `offseasonState.draftState.selections[${index}]`));
    }
    prospectIds.add(selection.prospectId);
  });
}

function validateProspectPools(franchise: FranchiseState, playerIds: Set<string>, errors: DynastyInvariantIssue[], warnings: DynastyInvariantIssue[]) {
  const draftedSelections = new Map<string, DraftSelection>();
  (franchise.history?.draftHistory ?? []).forEach((selection) => draftedSelections.set(`${selection.year}:${selection.prospectId}`, selection));
  Object.entries(franchise.prospectPools ?? {}).forEach(([teamId, pool]) => {
    const localProspects = new Set<string>();
    pool.forEach((rights, index) => {
      const path = `prospectPools.${teamId}[${index}]`;
      if (localProspects.has(rights.prospectId)) errors.push(issue("prospect.duplicateRights", `${rights.displayName} appears twice in one prospect pool.`, path));
      localProspects.add(rights.prospectId);
      if (rights.teamId !== teamId) errors.push(issue("prospect.teamMismatch", `${rights.displayName} rights live under ${teamId} but say ${rights.teamId}.`, path));
      if (rights.signed && !playerIds.has(`player-${rights.prospectId}`)) {
        warnings.push(issue("prospect.signedMissingPlayer", `${rights.displayName} is marked signed but no active entry-contract player was found.`, path));
      }
      if (!rights.signed && playerIds.has(`player-${rights.prospectId}`)) {
        errors.push(issue("prospect.unsignedDuplicatePlayer", `${rights.displayName} is unsigned but also exists as a signed player.`, path));
      }
      const selection = draftedSelections.get(`${rights.acquiredYear}:${rights.prospectId}`);
      if (selection && selection.teamId !== teamId) {
        errors.push(issue("prospect.selectionMismatch", `${rights.displayName} rights do not match draft selection team.`, path));
      }
    });
  });

  const retired = new Set(franchise.offseasonState?.retiredPlayerIds ?? []);
  if (retired.size) {
    playerIds.forEach((playerId) => {
      if (retired.has(playerId)) errors.push(issue("player.retiredActive", `Retired player ${playerId} is still on an active roster.`));
    });
  }
}

function validateFreeAgency(franchise: FranchiseState, activePlayerIds: Set<string>, errors: DynastyInvariantIssue[]) {
  franchise.freeAgencyState?.market.forEach((entry, index) => {
    if (entry.signedByTeamId || entry.player.teamId !== "free-agent") {
      errors.push(issue("freeAgency.signedInMarket", `${entry.player.displayName} is still in the free-agent market after signing.`, `freeAgencyState.market[${index}]`));
    }
    if (activePlayerIds.has(entry.player.id)) {
      errors.push(issue("freeAgency.activeDuplicate", `${entry.player.displayName} exists in the free-agent market and an active roster.`, `freeAgencyState.market[${index}]`));
    }
  });
}

function validateStaff(franchise: FranchiseState, errors: DynastyInvariantIssue[], warnings: DynastyInvariantIssue[]) {
  const signedStaffIds = new Set<string>();
  Object.entries(franchise.staffState?.teamStaff ?? {}).forEach(([teamId, staff]) => {
    const roles = new Set<string>();
    staff.forEach((member, index) => {
      const path = `staffState.teamStaff.${teamId}[${index}]`;
      if (member.signedTeamId && member.signedTeamId !== teamId) errors.push(issue("staff.teamMismatch", `${member.displayName} signed team mismatch.`, path));
      if (roles.has(member.role)) warnings.push(issue("staff.duplicateRole", `${teamId} has duplicate staff role ${member.role}.`, path));
      roles.add(member.role);
      signedStaffIds.add(member.id);
    });
  });
  franchise.staffState?.staffMarket?.forEach((member: StaffMember, index) => {
    if (member.signedTeamId || signedStaffIds.has(member.id)) {
      errors.push(issue("staff.marketSigned", `${member.displayName} is both signed and on the staff market.`, `staffState.staffMarket[${index}]`));
    }
  });
}

function validateHistory(franchise: FranchiseState, errors: DynastyInvariantIssue[], warnings: DynastyInvariantIssue[]) {
  const championYears = new Set<number>();
  (franchise.history?.champions ?? []).forEach((entry, index) => {
    if (championYears.has(entry.seasonYear)) errors.push(issue("history.duplicateChampion", `Champion archived twice for ${entry.seasonYear}.`, `history.champions[${index}]`));
    championYears.add(entry.seasonYear);
  });
  if ((franchise.history?.champions ?? []).some((entry) => REAL_HOCKEY_NAMES.test(entry.teamName))) {
    errors.push(issue("history.realBranding", "Champion history contains real hockey branding."));
  }
  if (franchise.inbox.length > TUNING.dynasty.inboxLimit) {
    warnings.push(issue("inbox.length", `Inbox has ${franchise.inbox.length} items; UI cap target is ${TUNING.dynasty.inboxLimit}.`, "inbox"));
  }
}

function validateLivingOps(franchise: FranchiseState, teamIds: Set<string>, playerIds: Set<string>, errors: DynastyInvariantIssue[], warnings: DynastyInvariantIssue[]) {
  const staffIds = new Set(Object.values(franchise.staffState?.teamStaff ?? {}).flatMap((staff) => staff.map((member) => member.id)));
  const prospectIds = new Set([
    ...(franchise.scouting?.draftClass ?? []).map((prospect) => prospect.id),
    ...Object.values(franchise.prospectPools ?? {}).flatMap((pool) => pool.map((rights) => rights.prospectId))
  ]);
  const activeEvents = (franchise.decisionEvents ?? []).filter((event) => event.status === "active");
  if (activeEvents.length > 8) errors.push(issue("living.decisionCap", `Active decision events exceed cap: ${activeEvents.length}.`, "decisionEvents"));
  const highActive = activeEvents.filter((event) => event.severity === "high" || event.severity === "critical");
  if (highActive.length > 3) errors.push(issue("living.highDecisionCap", `High-severity active events exceed cap: ${highActive.length}.`, "decisionEvents"));
  const repeatKeys = new Set<string>();
  activeEvents.forEach((event, index) => {
    const path = `decisionEvents[${index}]`;
    if (!teamIds.has(event.teamId)) errors.push(issue("living.decisionTeam", `${event.headline} references missing team ${event.teamId}.`, path));
    (event.playerIds ?? []).forEach((playerId) => {
      if (!playerIds.has(playerId)) errors.push(issue("living.decisionPlayer", `${event.headline} references missing player ${playerId}.`, path));
    });
    (event.staffIds ?? []).forEach((staffId) => {
      if (!staffIds.has(staffId)) errors.push(issue("living.decisionStaff", `${event.headline} references missing staff ${staffId}.`, path));
    });
    (event.prospectIds ?? []).forEach((prospectId) => {
      if (!prospectIds.has(prospectId)) errors.push(issue("living.decisionProspect", `${event.headline} references missing prospect ${prospectId}.`, path));
    });
    if (event.repeatKey) {
      if (repeatKeys.has(event.repeatKey)) errors.push(issue("living.duplicateRepeatKey", `Duplicate active decision repeatKey ${event.repeatKey}.`, path));
      repeatKeys.add(event.repeatKey);
    }
  });
  (franchise.decisionEvents ?? []).forEach((event, index) => {
    if (event.status !== "active" && (event.severity === "high" || event.severity === "critical") && !event.selectedOptionId && event.status !== "expired") {
      warnings.push(issue("living.resolvedUrgent", `${event.headline} is no longer active but still lacks resolution context.`, `decisionEvents[${index}]`));
    }
  });

  if ((franchise.storyArcs ?? []).length > 24) errors.push(issue("living.storyCap", `Story arcs exceed cap: ${franchise.storyArcs.length}.`, "storyArcs"));
  (franchise.storyArcs ?? []).forEach((arc, index) => {
    const path = `storyArcs[${index}]`;
    if (!teamIds.has(arc.teamId)) errors.push(issue("living.storyTeam", `${arc.headline} references missing team ${arc.teamId}.`, path));
    arc.playerIds.forEach((playerId) => {
      if (!playerIds.has(playerId)) errors.push(issue("living.storyPlayer", `${arc.headline} references missing player ${playerId}.`, path));
    });
    (arc.staffIds ?? []).forEach((staffId) => {
      if (!staffIds.has(staffId)) errors.push(issue("living.storyStaff", `${arc.headline} references missing staff ${staffId}.`, path));
    });
    if (!within100(arc.intensity) || !within100(arc.progress)) errors.push(issue("living.storyBounds", `${arc.headline} has out-of-bounds intensity/progress.`, path));
  });

  (franchise.agents ?? []).forEach((agent, index) => {
    if (!within100(agent.relationship) || !within100(agent.publicPressure)) errors.push(issue("living.agentBounds", `${agent.displayName} has out-of-bounds agent values.`, `agents[${index}]`));
    agent.clientPlayerIds.forEach((playerId) => {
      if (!playerIds.has(playerId)) errors.push(issue("living.agentClient", `${agent.displayName} references missing client ${playerId}.`, `agents[${index}]`));
    });
  });

  playerIds.forEach((playerId) => {
    const relationship = franchise.playerRelationships?.[playerId];
    if (!relationship) {
      errors.push(issue("living.missingRelationship", `Active player ${playerId} is missing relationship state.`, "playerRelationships"));
      return;
    }
    if (!within100(relationship.trust) || !within100(relationship.roleSatisfaction) || !within100(relationship.communication) || !within100(relationship.pressureTolerance)) {
      errors.push(issue("living.relationshipBounds", `Relationship values for ${playerId} are outside 0-100.`, `playerRelationships.${playerId}`));
    }
  });

  teamIds.forEach((teamId) => {
    const dynamics = franchise.teamDynamics?.[teamId];
    if (!dynamics) {
      errors.push(issue("living.missingTeamDynamics", `Team ${teamId} is missing dynamics state.`, "teamDynamics"));
      return;
    }
    (["chemistry", "leadership", "accountability", "mediaPressure", "fanSentiment", "ownerTrust"] as const).forEach((key) => {
      if (!within100(dynamics[key])) errors.push(issue("living.dynamicsBounds", `${teamId} ${key} is outside 0-100.`, `teamDynamics.${teamId}.${key}`));
    });
    Object.values(dynamics.rivalryHeatByTeamId ?? {}).forEach((value) => {
      if (!within100(value)) errors.push(issue("living.rivalryBounds", `${teamId} has rivalry heat outside 0-100.`, `teamDynamics.${teamId}.rivalryHeatByTeamId`));
    });
  });

  if (franchise.mediaState && !within100(franchise.mediaState.pressure)) {
    errors.push(issue("living.mediaBounds", "Media pressure is outside 0-100.", "mediaState.pressure"));
  }
}

function within100(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

function validatePhase(franchise: FranchiseState, errors: DynastyInvariantIssue[], warnings: DynastyInvariantIssue[]) {
  if (!VALID_PHASES.includes(franchise.seasonPhase)) {
    errors.push(issue("phase.invalid", `Invalid season phase ${franchise.seasonPhase}.`, "seasonPhase"));
  }
  if (franchise.seasonPhase === "draft" && franchise.offseasonState?.draftState?.completed) {
    warnings.push(issue("phase.completedDraft", "Draft phase is active even though the draft is completed.", "seasonPhase"));
  }
  if (franchise.seasonPhase === "freeAgency" && franchise.freeAgencyState?.completed) {
    warnings.push(issue("phase.completedFreeAgency", "Free agency phase is active even though the market is completed.", "seasonPhase"));
  }
}

function validateJsonSerializable(franchise: FranchiseState, errors: DynastyInvariantIssue[]) {
  try {
    JSON.stringify(franchise);
  } catch {
    errors.push(issue("save.serialization", "Franchise state is not JSON-serializable."));
  }
}

function countPositions(team: Team) {
  const healthy = team.roster.filter((player) => {
    const status = getPlayerRosterStatus(player);
    return (status === "active" || status === "scratched") && player.injuryStatus === "healthy";
  });
  return {
    forwards: healthy.filter((player) => ["LW", "C", "RW"].includes(player.position)).length,
    defense: healthy.filter((player) => player.position === "LD" || player.position === "RD").length,
    goalies: healthy.filter((player) => player.position === "G").length
  };
}

function issue(code: string, message: string, path?: string): DynastyInvariantIssue {
  return { code, message, path };
}
