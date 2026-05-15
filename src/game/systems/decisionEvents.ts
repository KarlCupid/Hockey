import { TUNING } from "./tuning";
import { SeededRng, clamp } from "../rng";
import type {
  DecisionEvent,
  DecisionEventSeverity,
  DecisionEventType,
  DecisionOption,
  DecisionOptionTone,
  FranchiseState,
  GameResult,
  NarrativeTemplate,
  NewsItem,
  Player,
  RosterMove,
  RoomId,
  SeasonPhase,
  Team
} from "../types";
import { getPlayerRelationship, getTeamDynamics, normalizeRelationship, normalizeTeamDynamics } from "./relationships";
import { getPlayerRosterStatus } from "./rosterRules";
import { applyGmTraitModifiers } from "./gmProfile";
import { NARRATIVE_TEMPLATES } from "../content/narrativeTemplates";
import { createDecisionEventFromTemplate, getTemplateContextFromFranchise, selectNarrativeTemplate } from "./narrativeTemplateEngine";
import { calculateEventSeverity, shouldGenerateDecisionEvent } from "./livingOpsTuning";

export interface DecisionGenerationContext {
  kind?: "postGame" | "phase" | "roster" | "contract" | "playoff" | "draftReaction" | "freeAgencyMiss" | "tradeRumor" | "manual";
  result?: GameResult;
  previousPhase?: SeasonPhase;
  nextPhase?: SeasonPhase;
  move?: RosterMove;
  player?: Player;
  playerId?: string;
  prospectId?: string;
  relatedStoryArcId?: string;
}

const ACTIVE_EVENT_CAP = 8;
const HIGH_SEVERITY_CAP = 3;

export function generateDecisionEvents(franchise: FranchiseState, context: DecisionGenerationContext = {}, rng = new SeededRng(`${franchise.franchiseId}-decisions`)): DecisionEvent[] {
  const events: DecisionEvent[] = [];
  if (context.kind === "postGame" && context.result) events.push(...generatePostGameDecisionEvents(franchise, context.result, rng));
  if (context.kind === "phase" && context.previousPhase && context.nextPhase) events.push(...generatePhaseDecisionEvents(franchise, context.previousPhase, context.nextPhase, rng));
  if (context.kind === "roster" && context.move) events.push(...generateRosterDecisionEvents(franchise, context.move, rng));
  if (context.kind === "contract" && context.player) events.push(...generateContractDecisionEvents(franchise, context.player, rng));
  if (context.kind === "playoff") events.push(...generatePlayoffDecisionEvents(franchise, rng));
  if (context.kind === "draftReaction") {
    const event = createDraftReactionEvent(franchise, context.prospectId, rng);
    if (event) events.push(event);
  }
  if (context.kind === "freeAgencyMiss") {
    const event = createFreeAgencyRumorEvent(franchise, context.playerId, rng);
    if (event) events.push(event);
  }
  if (context.kind === "tradeRumor" && context.playerId) {
    const event = createTradeRumorEvent(franchise, context.playerId, rng);
    if (event) events.push(event);
  }
  if (context.kind !== "manual") {
    const event = createCadenceTemplateEvent(franchise, context, rng);
    if (event) events.push(event);
  }
  return dedupeDecisionEvents(events);
}

export function generatePostGameDecisionEvents(franchise: FranchiseState, result: GameResult, rng = new SeededRng(`${franchise.franchiseId}-${result.id}-decisions`)): DecisionEvent[] {
  const team = selectedTeam(franchise);
  const opponent = findTeam(franchise, result.homeTeamId === team.id ? result.awayTeamId : result.homeTeamId);
  const userHome = result.homeTeamId === team.id;
  const goalsFor = userHome ? result.finalScore.home : result.finalScore.away;
  const goalsAgainst = userHome ? result.finalScore.away : result.finalScore.home;
  const won = goalsFor > goalsAgainst;
  const streakCount = team.record.streak.startsWith("L") || team.record.streak.startsWith("W") ? Number(team.record.streak.slice(1) || 1) : 0;
  const events: DecisionEvent[] = [];

  if (!won && (streakCount >= 2 || goalsAgainst - goalsFor >= 3)) {
    events.push(
      createEvent({
        franchise,
        type: "pressConference",
        severity: goalsAgainst - goalsFor >= 4 ? "high" : "medium",
        room: "press",
        sourceLabel: "Press Room",
        headline: "Press waiting after a hard loss",
        body: `Reporters want your read on the ${goalsAgainst}-${goalsFor} loss to ${opponent.fullName}. The tone can calm the market or turn the questions sharper.`,
        tags: ["postgame", "media", "loss"],
        repeatKey: `postgame-press-${result.gameId}`,
        relatedGameId: result.gameId,
        options: pressOptions()
      })
    );
  }

  if (team.record.streak.startsWith("L") && streakCount >= 3) {
    events.push(
      createEvent({
        franchise,
        type: "teamMeeting",
        severity: "high",
        room: "playerMeetings",
        sourceLabel: "Locker Room",
        headline: "Team meeting recommended",
        body: `${team.fullName} have dropped ${streakCount} straight. The group needs a clear message before the room starts creating its own answers.`,
        tags: ["losing-streak", "chemistry"],
        repeatKey: `team-meeting-losing-${team.id}-${team.record.streak}`,
        relatedGameId: result.gameId,
        options: teamMeetingOptions()
      })
    );
  }

  if (franchise.ownerState.jobSecurity <= 45 || (!won && team.ownerPatience < 55 && streakCount >= 2)) {
    events.push(
      createEvent({
        franchise,
        type: "ownerMeeting",
        severity: franchise.ownerState.jobSecurity <= 30 ? "critical" : "high",
        room: "ownerSuite",
        sourceLabel: "Owner Suite",
        headline: "Owner wants a private explanation",
        body: "Ownership is asking whether this is a short dip or a plan problem. A steady answer can buy oxygen; a vague one will not.",
        tags: ["owner", "pressure"],
        repeatKey: `owner-pressure-${team.id}-${team.record.streak}`,
        options: ownerOptions()
      })
    );
  }

  const star = result.threeStars.find((item) => item.teamId === team.id);
  const starPlayer = star ? team.roster.find((player) => player.id === star.playerId) : undefined;
  if (won && starPlayer && (starPlayer.age <= 22 || starPlayer.form >= 73)) {
    events.push(
      createEvent({
        franchise,
        type: starPlayer.age <= 22 ? "prospectBuzz" : "mediaQuestion",
        severity: "low",
        room: starPlayer.age <= 22 ? "development" : "press",
        sourceLabel: starPlayer.age <= 22 ? "Development Office" : "Media Room",
        playerIds: [starPlayer.id],
        headline: `${starPlayer.displayName} has the room buzzing`,
        body: starPlayer.age <= 22 ? "A young player just gave the market something to dream on. How you frame it affects pressure and confidence." : star?.reason ?? "A standout performance changed the media tone.",
        tags: ["breakout", "media"],
        repeatKey: `breakout-${starPlayer.id}-${franchise.league.currentDate}`,
        relatedGameId: result.gameId,
        options: playerPraiseOptions()
      })
    );
  }

  const starter = team.lines.goalies.starter ? team.roster.find((player) => player.id === team.lines.goalies.starter) : undefined;
  const backup = team.lines.goalies.backup ? team.roster.find((player) => player.id === team.lines.goalies.backup) : undefined;
  const starterStats = starter ? result.goalieStats.find((goalie) => goalie.goalieId === starter.id) : undefined;
  if (starter && backup && starterStats && starterStats.goalsAgainst >= 4 && backup.form >= starter.form + 8) {
    events.push(
      createEvent({
        franchise,
        type: "goalieControversy",
        severity: "medium",
        room: "press",
        sourceLabel: "Crease Watch",
        playerIds: [starter.id, backup.id],
        headline: "Goalie question is out in the open",
        body: `${starter.displayName} took the loss while ${backup.displayName}'s recent form sits higher. The next answer will reach both goalies.`,
        tags: ["goalie", "media", "roles"],
        repeatKey: `goalie-controversy-${starter.id}-${backup.id}`,
        relatedGameId: result.gameId,
        options: goalieOptions(starter, backup)
      })
    );
  }

  return dedupeDecisionEvents(events);
}

export function generatePhaseDecisionEvents(
  franchise: FranchiseState,
  previousPhase: SeasonPhase,
  nextPhase: SeasonPhase,
  rng = new SeededRng(`${franchise.franchiseId}-${previousPhase}-${nextPhase}-decisions`)
): DecisionEvent[] {
  const events: DecisionEvent[] = [];
  const team = selectedTeam(franchise);
  if (nextPhase === "playoffs" || franchise.seasonPhase === "playoffs") {
    events.push(...generatePlayoffDecisionEvents({ ...franchise, seasonPhase: "playoffs" }, rng));
  }
  if (nextPhase === "draft") {
    const event = createDraftReactionEvent(franchise, undefined, rng);
    if (event) events.push(event);
  }
  if (nextPhase === "freeAgency") {
    events.push(
      createEvent({
        franchise,
        type: "freeAgencyRumor",
        severity: "medium",
        room: "freeAgency",
        sourceLabel: "Free Agency Wire",
        headline: "Market opens with your club in the rumor mix",
        body: `${team.fullName} are being tied to the top of the market. Agents notice whether you sound disciplined or desperate.`,
        tags: ["free-agency", "media"],
        repeatKey: `fa-open-${franchise.league.seasonYear}-${team.id}`,
        options: marketOptions()
      })
    );
  }
  if (nextPhase === "trainingCamp") {
    events.push(
      createEvent({
        franchise,
        type: "teamMeeting",
        severity: "medium",
        room: "playerMeetings",
        sourceLabel: "Training Camp",
        headline: "Set the camp tone",
        body: "The first team meeting can sharpen accountability, lower anxiety, or create pressure around jobs.",
        tags: ["training-camp", "team-meeting"],
        repeatKey: `camp-tone-${franchise.league.seasonYear}-${team.id}`,
        options: teamMeetingOptions()
      })
    );
  }
  return dedupeDecisionEvents(events);
}

export function generateRosterDecisionEvents(franchise: FranchiseState, move: RosterMove, rng = new SeededRng(`${move.id}-decision`)): DecisionEvent[] {
  const team = findTeam(franchise, move.teamId);
  const player = team.roster.find((candidate) => candidate.id === move.playerId);
  if (!player || !move.userInitiated) return [];
  const relationship = getPlayerRelationship(franchise, player.id);
  if (!["sendDown", "scratch", "callUp"].includes(move.type) && relationship.trust > 38) return [];
  const severity: DecisionEventSeverity = move.type === "callUp" ? "low" : relationship.trust <= 36 || player.overall >= 78 ? "medium" : "low";
  return [
    createEvent({
      franchise,
      type: "playerMeeting",
      severity,
      room: "playerMeetings",
      sourceLabel: "Player Meeting Room",
      playerIds: [player.id],
      headline: `${player.displayName} needs roster clarity`,
      body: `${player.displayName} was moved from ${move.fromStatus} to ${move.toStatus}. A short meeting can protect trust before the room fills in the blanks.`,
      tags: ["roster", move.type],
      repeatKey: `roster-meeting-${move.type}-${player.id}-${franchise.league.currentDayIndex}`,
      options: playerMeetingOptions(player)
    })
  ];
}

export function generateContractDecisionEvents(franchise: FranchiseState, player: Player, rng = new SeededRng(`${player.id}-contract-decision`)): DecisionEvent[] {
  const agent = franchise.agents.find((candidate) => candidate.clientPlayerIds.includes(player.id));
  return [
    createEvent({
      franchise,
      type: "agentCall",
      severity: player.overall >= 82 ? "high" : "medium",
      room: "agents",
      sourceLabel: agent?.displayName ?? "Agent Desk",
      playerIds: [player.id],
      headline: `${agent?.displayName ?? "Agent"} wants to talk about ${player.displayName}`,
      body: "The player's camp did not like the last contract shape. How you respond can change patience, public pressure, and the next ask.",
      tags: ["contract", "agent"],
      repeatKey: `contract-agent-${player.id}-${franchise.league.currentDate}`,
      options: agentOptions()
    })
  ];
}

export function generatePlayoffDecisionEvents(franchise: FranchiseState, rng = new SeededRng(`${franchise.franchiseId}-playoff-decisions`)): DecisionEvent[] {
  const team = selectedTeam(franchise);
  const eliminationish = franchise.playoffState?.bracket.some(
    (series) => !series.completed && (series.homeSeedTeamId === team.id || series.awaySeedTeamId === team.id) && Math.max(series.homeWins, series.awayWins) >= series.bestOf - 1
  );
  return [
    createEvent({
      franchise,
      type: "playoffPressure",
      severity: eliminationish ? "critical" : "high",
      room: "press",
      sourceLabel: "Playoff Media",
      headline: eliminationish ? "Elimination pressure is sitting in the room" : "Playoff pressure has arrived",
      body: eliminationish
        ? "The next game can change the whole file. Players, ownership, media, and fans are waiting for the tone."
        : "The market wants to know whether this group is ready for playoff hockey.",
      tags: ["playoffs", "media", "owner"],
      repeatKey: `playoff-pressure-${franchise.league.seasonYear}-${team.id}-${eliminationish ? "elimination" : "open"}`,
      options: playoffOptions()
    })
  ];
}

export function resolveDecisionEvent(franchise: FranchiseState, eventId: string, optionId: string, rng = new SeededRng(`${eventId}-${optionId}`)): FranchiseState {
  const event = franchise.decisionEvents.find((candidate) => candidate.id === eventId);
  const option = event?.options.find((candidate) => candidate.id === optionId);
  if (!event || !option || event.status !== "active") return franchise;
  const outcome = buildOutcome(franchise, event, option, rng);
  const withOutcome = applyOutcome(franchise, event, option, outcome);
  return {
    ...withOutcome,
    decisionEvents: withOutcome.decisionEvents.map((candidate) =>
      candidate.id === event.id ? { ...candidate, status: "resolved" as const, selectedOptionId: option.id, outcome } : candidate
    ),
    inbox: [...(outcome.newsItems ?? createDecisionNews(event, option, outcome)), ...withOutcome.inbox].slice(0, TUNING.dynasty.inboxLimit),
    updatedAt: new Date().toISOString()
  };
}

export function expireDecisionEvents(franchise: FranchiseState, currentDate: string): FranchiseState {
  return {
    ...franchise,
    decisionEvents: franchise.decisionEvents.map((event) =>
      event.status === "active" && event.expiresDate && event.expiresDate < currentDate ? { ...event, status: "expired" as const } : event
    )
  };
}

export function getActiveDecisionEvents(franchise: FranchiseState): DecisionEvent[] {
  return franchise.decisionEvents.filter((event) => event.status === "active").slice(0, ACTIVE_EVENT_CAP);
}

export function getDecisionEventsForRoom(franchise: FranchiseState, roomId: RoomId): DecisionEvent[] {
  return getActiveDecisionEvents(franchise).filter((event) => event.locationRoom === roomId || (!event.locationRoom && roomId === "gm"));
}

export function dedupeDecisionEvents(events: DecisionEvent[]): DecisionEvent[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    const key = event.repeatKey ?? `${event.type}-${event.teamId}-${event.playerIds?.join(",") ?? ""}-${event.headline}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function mergeDecisionEvents(franchise: FranchiseState, generated: DecisionEvent[]): FranchiseState {
  const existing = franchise.decisionEvents ?? [];
  const activeRepeatKeys = new Set(existing.filter((event) => event.status === "active" && event.repeatKey).map((event) => event.repeatKey as string));
  const nextEvents = generated.filter((event) => !event.repeatKey || !activeRepeatKeys.has(event.repeatKey));
  const deduped = enforceEventCaps(dedupeDecisionEvents([...nextEvents, ...existing]));
  return {
    ...franchise,
    decisionEvents: deduped,
    updatedAt: nextEvents.length ? new Date().toISOString() : franchise.updatedAt
  };
}

export function createDecisionNews(event: DecisionEvent, option: DecisionOption, outcome: { summary: string }): NewsItem[] {
  return [
    {
      id: `decision-news-${event.id}-${option.id}`,
      type: event.type === "tradeRumor" ? "trade" : event.type === "contractStandoff" || event.type === "agentCall" ? "contract" : "media",
      date: event.createdDate,
      headline: `${event.sourceLabel}: ${event.headline}`,
      body: outcome.summary,
      severity: event.severity === "critical" ? "high" : event.severity === "high" ? "medium" : "low",
      teamId: event.teamId,
      playerId: event.playerIds?.[0]
    }
  ];
}

function createDraftReactionEvent(franchise: FranchiseState, prospectId: string | undefined, rng: SeededRng): DecisionEvent | undefined {
  const prospect =
    franchise.scouting.draftClass.find((candidate) => candidate.id === prospectId) ??
    franchise.scouting.draftClass.find((candidate) => candidate.projectedRound === 1) ??
    franchise.scouting.draftClass[0];
  if (!prospect) return undefined;
  return createEvent({
    franchise,
    type: "draftReaction",
    severity: prospect.risk === "Boom/Bust" || prospect.risk === "High" ? "medium" : "low",
    room: "press",
    sourceLabel: "Draft Media",
    prospectIds: [prospect.id],
    headline: `Draft reaction: ${prospect.displayName} is already a storyline`,
    body: `The pick brings ${prospect.position} upside and ${prospect.risk.toLowerCase()} risk. The way you frame it affects fan patience and scout confidence.`,
    tags: ["draft", "media", "prospect"],
    repeatKey: `draft-reaction-${franchise.league.seasonYear}-${prospect.id}`,
    options: marketOptions()
  });
}

function createFreeAgencyRumorEvent(franchise: FranchiseState, playerId: string | undefined, rng: SeededRng): DecisionEvent | undefined {
  const target = franchise.freeAgencyState?.market.find((entry) => !playerId || entry.player.id === playerId)?.player;
  return createEvent({
    franchise,
    type: "freeAgencyRumor",
    severity: "medium",
    room: "freeAgency",
    sourceLabel: "Free Agency Wire",
    playerIds: target ? [target.id] : undefined,
    headline: target ? `Rumor mill cools on ${target.displayName}` : "Fans want a free-agency answer",
    body: target ? "Missing a target can be framed as discipline or as a lack of ambition." : "The market is moving and the fan base is comparing every quiet hour.",
    tags: ["free-agency", "fan-sentiment"],
    repeatKey: `fa-miss-${franchise.league.currentDate}-${target?.id ?? franchise.selectedTeamId}`,
    options: marketOptions()
  });
}

function createTradeRumorEvent(franchise: FranchiseState, playerId: string, rng: SeededRng): DecisionEvent | undefined {
  const team = selectedTeam(franchise);
  const player = team.roster.find((candidate) => candidate.id === playerId);
  if (!player) return undefined;
  return createEvent({
    franchise,
    type: "tradeRumor",
    severity: player.overall >= 82 ? "high" : "medium",
    room: "trades",
    sourceLabel: "Trade Wire",
    playerIds: [player.id],
    headline: `${player.displayName}'s name is out there`,
    body: "A rumor can create flexibility, but it also reaches the player, his agent, and the room.",
    tags: ["trade", "media", "trust"],
    repeatKey: `trade-rumor-${player.id}-${franchise.league.currentDayIndex}`,
    options: rumorOptions(player)
  });
}

function createCadenceTemplateEvent(franchise: FranchiseState, context: DecisionGenerationContext, rng: SeededRng): DecisionEvent | undefined {
  const trigger = context.kind ?? "ambient";
  if (!shouldGenerateDecisionEvent(franchise, trigger, rng)) return undefined;
  const category = categoryForContext(context, franchise);
  const template = selectNarrativeTemplate(
    NARRATIVE_TEMPLATES,
    getTemplateContextFromFranchise(franchise, { category, tags: tagsForContext(context), playerId: context.playerId ?? context.player?.id }),
    rng
  );
  const severity = calculateEventSeverity(franchise, trigger);
  const event = createDecisionEventFromTemplate(template, getTemplateContextFromFranchise(franchise, { category, tags: tagsForContext(context), playerId: context.playerId ?? context.player?.id }), rng);
  return {
    ...event,
    severity,
    createdDate: franchise.league.currentDate,
    expiresDate: addDays(franchise.league.currentDate, severity === "low" ? 5 : severity === "medium" ? 7 : 10),
    phase: franchise.seasonPhase,
    repeatKey: `${template.id}-${franchise.league.seasonYear}-${franchise.league.currentDayIndex}-${trigger}`
  };
}

function categoryForContext(context: DecisionGenerationContext, franchise: FranchiseState): NarrativeTemplate["category"] {
  if (context.kind === "postGame") return franchise.mediaState.pressure >= 55 ? "press" : "team";
  if (context.kind === "phase" && context.nextPhase === "draft") return "draft";
  if (context.kind === "phase" && context.nextPhase === "freeAgency") return "freeAgency";
  if (context.kind === "phase" && context.nextPhase === "playoffs") return "playoff";
  if (context.kind === "roster") return "player";
  if (context.kind === "contract") return "agent";
  if (context.kind === "playoff") return "playoff";
  if (context.kind === "draftReaction") return "draft";
  if (context.kind === "freeAgencyMiss") return "freeAgency";
  if (context.kind === "tradeRumor") return "trade";
  return franchise.mediaState.pressure >= 62 ? "media" : "team";
}

function tagsForContext(context: DecisionGenerationContext): string[] {
  if (context.kind === "postGame") return ["postgame", context.result ? "game" : "team"];
  if (context.kind === "phase") return ["phase", context.nextPhase ?? "season"];
  if (context.kind === "roster") return ["roster"];
  if (context.kind === "contract") return ["contract", "agent"];
  if (context.kind === "playoff") return ["playoff"];
  if (context.kind === "draftReaction") return ["draft"];
  if (context.kind === "freeAgencyMiss") return ["freeAgency"];
  if (context.kind === "tradeRumor") return ["trade"];
  return ["team"];
}

function buildOutcome(franchise: FranchiseState, event: DecisionEvent, option: DecisionOption, rng: SeededRng) {
  const severityWeight = event.severity === "critical" ? 2 : event.severity === "high" ? 1.45 : event.severity === "medium" ? 1 : 0.62;
  const tone = toneImpact(option.tone);
  const gmModifiers = applyGmTraitModifiers(franchise, {
    type:
      event.type === "pressConference" || event.type === "mediaQuestion"
        ? "press"
        : event.type === "ownerMeeting"
          ? "owner"
          : event.type === "playerMeeting" || event.type === "teamMeeting"
            ? "player"
            : event.type === "agentCall" || event.type === "contractStandoff"
              ? "contract"
              : "story"
  });
  const playerIds = event.playerIds ?? [];
  const playerTrustBonus = event.type === "playerMeeting" || event.type === "teamMeeting" ? (gmModifiers.playerTrustModifier ?? 0) : 0;
  const moraleDelta = playerIds.length
    ? Object.fromEntries(playerIds.map((playerId) => [playerId, Math.round(tone.playerMorale * severityWeight + playerTrustBonus * 0.35)]))
    : undefined;
  const roleDelta = playerIds.length
    ? Object.fromEntries(playerIds.map((playerId) => [playerId, Math.round(tone.role * severityWeight + playerTrustBonus * 0.4)]))
    : undefined;
  const agent = event.type === "agentCall" && playerIds[0] ? franchise.agents.find((candidate) => candidate.clientPlayerIds.includes(playerIds[0])) : undefined;
  const summary = summaryFor(event, option);
  return {
    summary,
    moraleDeltaByPlayerId: moraleDelta,
    formDeltaByPlayerId: playerIds.length && option.tone === "supportive" ? Object.fromEntries(playerIds.map((playerId) => [playerId, 1])) : undefined,
    fatigueDeltaByPlayerId: event.type === "teamMeeting" && option.tone === "aggressive" ? Object.fromEntries(playerIds.map((playerId) => [playerId, 3])) : undefined,
    roleSatisfactionDeltaByPlayerId: roleDelta,
    chemistryDelta: Math.round(tone.chemistry * severityWeight + (event.type === "teamMeeting" ? 4 : 0)),
    fanSentimentDelta: Math.round(tone.fan * severityWeight),
    ownerTrustDelta: Math.round((tone.owner + (event.type === "ownerMeeting" ? 3 : 0)) * severityWeight + (gmModifiers.ownerTrustModifier ?? 0) * 0.45),
    mediaPressureDelta: Math.round(tone.media * severityWeight + (gmModifiers.mediaPressureModifier ?? 0) * (event.type === "pressConference" || event.type === "mediaQuestion" ? 0.65 : 0.2)),
    agentRelationshipDeltaByAgentId: agent ? { [agent.id]: Math.round(tone.agent * severityWeight + (gmModifiers.negotiationModifier ?? 0) * 0.35) } : undefined,
    contractInterestDeltaByPlayerId:
      event.type === "agentCall" || event.type === "contractStandoff"
        ? Object.fromEntries(playerIds.map((playerId) => [playerId, Math.round(tone.agent * severityWeight + (gmModifiers.negotiationModifier ?? 0) * 0.35)]))
        : undefined,
    tradeNoiseDeltaByPlayerId: event.type === "tradeRumor" ? Object.fromEntries(playerIds.map((playerId) => [playerId, Math.round((option.tone === "transparent" ? -5 : 5) * severityWeight)])) : undefined,
    newsItems: createDecisionNews(event, option, { summary })
  };
}

function applyOutcome(franchise: FranchiseState, event: DecisionEvent, option: DecisionOption, outcome: ReturnType<typeof buildOutcome>): FranchiseState {
  const teamId = event.teamId;
  const dynamics = getTeamDynamics(franchise, teamId);
  const moraleDeltas = outcome.moraleDeltaByPlayerId ?? {};
  const formDeltas = outcome.formDeltaByPlayerId ?? {};
  const fatigueDeltas = outcome.fatigueDeltaByPlayerId ?? {};
  const roleDeltas = outcome.roleSatisfactionDeltaByPlayerId ?? {};
  const nextRelationships = { ...franchise.playerRelationships };
  Object.entries(roleDeltas).forEach(([playerId, delta]) => {
    const current = getPlayerRelationship(franchise, playerId);
    nextRelationships[playerId] = normalizeRelationship({
      ...current,
      trust: current.trust + (moraleDeltas[playerId] ?? 0) * 0.7,
      roleSatisfaction: current.roleSatisfaction + delta,
      communication: current.communication + (option.tone === "transparent" ? 5 : option.tone === "deflect" ? -5 : 1),
      lastMeetingDate: event.type === "playerMeeting" || event.type === "teamMeeting" ? franchise.league.currentDate : current.lastMeetingDate,
      notes: [outcome.summary, ...current.notes].slice(0, 8)
    });
  });
  const nextTeams = franchise.league.teams.map((team) =>
    team.id === teamId
      ? {
          ...team,
          fanConfidence: clamp(team.fanConfidence + (outcome.fanSentimentDelta ?? 0)),
          roster: team.roster.map((player) => ({
            ...player,
            morale: clamp(player.morale + (moraleDeltas[player.id] ?? 0)),
            form: clamp(player.form + (formDeltas[player.id] ?? 0)),
            fatigue: clamp(player.fatigue + (fatigueDeltas[player.id] ?? 0))
          }))
        }
      : team
  );
  const nextAgents = franchise.agents.map((agent) => ({
    ...agent,
    relationship: clamp(agent.relationship + (outcome.agentRelationshipDeltaByAgentId?.[agent.id] ?? 0)),
    publicPressure: clamp(agent.publicPressure + (event.type === "agentCall" && option.tone === "deflect" ? 6 : option.tone === "transparent" ? -3 : 0)),
    notes: outcome.agentRelationshipDeltaByAgentId?.[agent.id] ? [outcome.summary, ...agent.notes].slice(0, 8) : agent.notes
  }));
  const nextDynamics = normalizeTeamDynamics({
    ...dynamics,
    chemistry: dynamics.chemistry + (outcome.chemistryDelta ?? 0),
    fanSentiment: dynamics.fanSentiment + (outcome.fanSentimentDelta ?? 0),
    ownerTrust: dynamics.ownerTrust + (outcome.ownerTrustDelta ?? 0),
    mediaPressure: dynamics.mediaPressure + (outcome.mediaPressureDelta ?? 0),
    roomMood: dynamics.roomMood,
    unresolvedIssues: event.severity === "low" ? dynamics.unresolvedIssues : dynamics.unresolvedIssues.filter((issue) => !event.tags.some((tag) => issue.includes(tag)))
  });
  return {
    ...franchise,
    league: { ...franchise.league, teams: nextTeams },
    playerRelationships: nextRelationships,
    agents: nextAgents,
    ownerState: { ...franchise.ownerState, jobSecurity: clamp(franchise.ownerState.jobSecurity + (outcome.ownerTrustDelta ?? 0)) },
    teamDynamics: { ...franchise.teamDynamics, [teamId]: nextDynamics },
    mediaState: {
      ...franchise.mediaState,
      pressure: clamp(franchise.mediaState.pressure + (outcome.mediaPressureDelta ?? 0)),
      recentQuestions: [event.headline, ...franchise.mediaState.recentQuestions].slice(0, 8),
      narrative: mediaNarrativeFor(clamp(franchise.mediaState.pressure + (outcome.mediaPressureDelta ?? 0)), selectedTeam({ ...franchise, league: { ...franchise.league, teams: nextTeams } }))
    }
  };
}

function enforceEventCaps(events: DecisionEvent[]): DecisionEvent[] {
  const active: DecisionEvent[] = [];
  let highCount = 0;
  const retained: DecisionEvent[] = [];
  events.forEach((event) => {
    if (event.status !== "active") {
      retained.push(event);
      return;
    }
    const highish = event.severity === "high" || event.severity === "critical";
    if (active.length >= ACTIVE_EVENT_CAP) return;
    if (highish && highCount >= HIGH_SEVERITY_CAP) return;
    if (highish) highCount += 1;
    active.push(event);
  });
  return [...active, ...retained].slice(0, 80);
}

function createEvent(input: {
  franchise: FranchiseState;
  type: DecisionEventType;
  severity: DecisionEventSeverity;
  room: RoomId;
  sourceLabel: string;
  headline: string;
  body: string;
  tags: string[];
  repeatKey: string;
  options: DecisionOption[];
  playerIds?: string[];
  staffIds?: string[];
  prospectIds?: string[];
  relatedGameId?: string;
  relatedStoryArcId?: string;
}): DecisionEvent {
  return {
    id: `decision-${input.type}-${input.repeatKey}`,
    type: input.type,
    status: "active",
    severity: input.severity,
    createdDate: input.franchise.league.currentDate,
    expiresDate: addDays(input.franchise.league.currentDate, input.severity === "low" ? 5 : input.severity === "medium" ? 7 : 10),
    phase: input.franchise.seasonPhase,
    teamId: input.franchise.selectedTeamId,
    playerIds: input.playerIds,
    staffIds: input.staffIds,
    prospectIds: input.prospectIds,
    relatedGameId: input.relatedGameId,
    relatedStoryArcId: input.relatedStoryArcId,
    headline: input.headline,
    body: input.body,
    sourceLabel: input.sourceLabel,
    locationRoom: input.room,
    options: input.options,
    tags: input.tags,
    repeatKey: input.repeatKey
  };
}

function pressOptions(): DecisionOption[] {
  return [
    option("transparent", "Own the result", "transparent", "Accept the performance issue and name the next adjustment.", "Media -4, trust +2, owner +1"),
    option("support", "Back the room", "supportive", "Protect the players publicly and keep the heat on your desk.", "Morale +3, media -1, owner neutral"),
    option("firm", "Demand a response", "firm", "Make it clear the standard was not met.", "Accountability +2, morale -1, media +1")
  ];
}

function ownerOptions(): DecisionOption[] {
  return [
    option("transparent", "Show the plan", "transparent", "Use goals, cap discipline, and roster health to explain the next step.", "Owner +6, media -2"),
    option("patient", "Ask for runway", "patient", "Frame this as a long build that needs steadiness.", "Owner +2, fan -1"),
    option("aggressive", "Promise a shakeup", "aggressive", "Signal urgency and willingness to act.", "Owner +3, media +3, room -2", "Raises pressure if the next move is quiet.")
  ];
}

function teamMeetingOptions(): DecisionOption[] {
  return [
    option("supportive", "Reset the room", "supportive", "Emphasize belief, details, and shared responsibility.", "Chemistry +6, morale +2"),
    option("firm", "Raise standards", "firm", "Call out habits and demand a response.", "Accountability +4, morale mixed"),
    option("patient", "Quiet confidence", "patient", "Slow the week down and lower the noise.", "Fatigue -1, media pressure -2")
  ];
}

function playerMeetingOptions(player: Player): DecisionOption[] {
  return [
    option("transparent", "Explain the role", "transparent", `Be direct with ${player.displayName} about usage and the path back.`, "Trust +4, role clarity +4"),
    option("supportive", "Keep him close", "supportive", "Emphasize value to the organization and invite feedback.", "Trust +5, morale +2"),
    option("firm", "Hold the line", "firm", "Make clear the decision is performance-based.", "Accountability +2, trust -2")
  ];
}

function playerPraiseOptions(): DecisionOption[] {
  return [
    option("patient", "Manage the hype", "patient", "Praise the performance but keep expectations realistic.", "Fan +2, pressure -2"),
    option("supportive", "Celebrate it", "supportive", "Let the player feel the moment.", "Morale +4, fan +3, media +1"),
    option("conservative", "Keep it internal", "conservative", "Avoid turning one night into a promise.", "Pressure -3, fan neutral")
  ];
}

function goalieOptions(starter: Player, backup: Player): DecisionOption[] {
  return [
    option("transparent", "Call it a competition", "transparent", "Be honest that performance will drive the crease.", "Role satisfaction mixed, media -1"),
    option("supportive", `Back ${starter.displayName}`, "supportive", "Protect the starter publicly.", "Starter trust +4, backup role -2"),
    option("risky", `Hint at ${backup.displayName}`, "risky", "Signal a possible change before telling the room.", "Fan +2, media +4, trust risk", "The starter's agent may call.")
  ];
}

function agentOptions(): DecisionOption[] {
  return [
    option("transparent", "Respect the ask", "transparent", "Acknowledge the camp's position and keep the next step private.", "Agent +5, pressure -3"),
    option("firm", "Hold valuation", "firm", "Make clear the club will not chase beyond its number.", "Cap discipline, agent -2"),
    option("deflect", "Offer no comment", "deflect", "Keep the call short and vague.", "Media +4, agent -4")
  ];
}

function marketOptions(): DecisionOption[] {
  return [
    option("transparent", "Explain discipline", "transparent", "Frame the market through fit, cap, and patience.", "Fan -1, owner +3, media -2"),
    option("aggressive", "Signal ambition", "aggressive", "Tell the market you are hunting for impact.", "Fan +4, media +3"),
    option("conservative", "Stay quiet", "conservative", "Keep leverage by saying very little.", "Media -1, fan -2")
  ];
}

function playoffOptions(): DecisionOption[] {
  return [
    option("transparent", "Name the moment", "transparent", "Admit the stakes and make the standard clear.", "Owner +3, media -2, chemistry +2"),
    option("supportive", "Protect the room", "supportive", "Put the pressure on your desk and back the players.", "Morale +3, chemistry +2"),
    option("aggressive", "Challenge the group", "aggressive", "Turn the pressure into a public challenge.", "Form +1, media +4, trust risk")
  ];
}

function rumorOptions(player: Player): DecisionOption[] {
  return [
    option("transparent", `Call ${player.displayName}`, "transparent", "Speak to the player before answering the rumor.", "Trust +4, media -2"),
    option("deflect", "No comment", "deflect", "Avoid confirming anything.", "Media +3, trust -3"),
    option("firm", "Shut it down", "firm", "Publicly say the player is part of the plan.", "Trust +2, trade noise -4")
  ];
}

function option(id: string, label: string, tone: DecisionOptionTone, description: string, preview: string, hiddenRisk?: string): DecisionOption {
  return { id, label, tone, description, preview, hiddenRisk };
}

function toneImpact(tone: DecisionOptionTone) {
  const impacts: Record<DecisionOptionTone, { playerMorale: number; role: number; chemistry: number; fan: number; owner: number; media: number; agent: number }> = {
    supportive: { playerMorale: 4, role: 2, chemistry: 3, fan: 1, owner: 0, media: -1, agent: 2 },
    firm: { playerMorale: -1, role: 0, chemistry: 1, fan: 0, owner: 2, media: 1, agent: -1 },
    transparent: { playerMorale: 2, role: 4, chemistry: 2, fan: 0, owner: 3, media: -4, agent: 4 },
    deflect: { playerMorale: -2, role: -3, chemistry: -2, fan: -2, owner: -2, media: 5, agent: -4 },
    aggressive: { playerMorale: -1, role: -1, chemistry: 0, fan: 4, owner: 2, media: 4, agent: -2 },
    patient: { playerMorale: 1, role: 1, chemistry: 2, fan: -1, owner: 1, media: -2, agent: 1 },
    risky: { playerMorale: -3, role: -3, chemistry: -2, fan: 3, owner: 0, media: 5, agent: -3 },
    conservative: { playerMorale: 0, role: 0, chemistry: 0, fan: -2, owner: 2, media: -1, agent: 0 }
  };
  return impacts[tone];
}

function summaryFor(event: DecisionEvent, option: DecisionOption): string {
  if (event.type === "ownerMeeting") return `You chose a ${option.tone} owner-room response: ${option.preview}.`;
  if (event.type === "agentCall") return `The agent desk logged a ${option.tone} response: ${option.preview}.`;
  if (event.type === "playerMeeting" || event.type === "teamMeeting") return `The room heard a ${option.tone} message: ${option.preview}.`;
  if (event.type === "tradeRumor") return `The trade rumor was handled with a ${option.tone} tone: ${option.preview}.`;
  return `The organization answered with a ${option.tone} tone: ${option.preview}.`;
}

function mediaNarrativeFor(pressure: number, team: Team): FranchiseState["mediaState"]["narrative"] {
  if (pressure >= 78) return "hotSeat";
  if (team.record.points >= Math.max(12, team.stats.gamesPlayed * 1.25)) return "playoffBuzz";
  if (team.record.points <= Math.max(8, team.stats.gamesPlayed * 0.75)) return "rebuildDebate";
  if (pressure >= 58) return "skeptical";
  if (pressure <= 32) return "optimistic";
  return "quiet";
}

function selectedTeam(franchise: FranchiseState): Team {
  return findTeam(franchise, franchise.selectedTeamId);
}

function findTeam(franchise: FranchiseState, teamId: string): Team {
  const team = franchise.league.teams.find((candidate) => candidate.id === teamId);
  if (!team) throw new Error(`Team not found: ${teamId}`);
  return team;
}

function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}
