import { SeededRng } from "../rng";
import type { DecisionEvent, DecisionOption, FranchiseState, Player } from "../types";
import { generateDecisionEvents, mergeDecisionEvents, resolveDecisionEvent } from "./decisionEvents";
import { getPlayerRelationship, getTeamDynamics } from "./relationships";
import { getPlayerRosterStatus, getRosterStatusLabel } from "./rosterRules";

export function createPlayerMeeting(franchise: FranchiseState, playerId: string, context: { reason?: string } = {}, rng = new SeededRng(`${playerId}-meeting`)): DecisionEvent {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId)!;
  const player = team.roster.find((candidate) => candidate.id === playerId)!;
  const reasons = player ? getPlayerMeetingReasons(franchise, player) : ["The player needs clarity."];
  return {
    id: `decision-playerMeeting-${playerId}-${franchise.league.currentDate}`,
    type: "playerMeeting",
    status: "active",
    severity: player && player.overall >= 82 ? "high" : "medium",
    createdDate: franchise.league.currentDate,
    expiresDate: addDays(franchise.league.currentDate, 7),
    phase: franchise.seasonPhase,
    teamId: team.id,
    playerIds: [playerId],
    headline: `${player?.displayName ?? "Player"} meeting requested`,
    body: context.reason ?? reasons[0],
    sourceLabel: "Player Meeting Room",
    locationRoom: "playerMeetings",
    options: [
      { id: "transparent", label: "Explain the path", tone: "transparent", description: "Be direct about role, timeline, and standards.", preview: "Trust +4, role satisfaction +4." },
      { id: "supportive", label: "Rebuild confidence", tone: "supportive", description: "Emphasize belief and invite feedback.", preview: "Morale +3, trust +5." },
      { id: "firm", label: "Hold the standard", tone: "firm", description: "Keep the role earned through performance.", preview: "Accountability +2, trust mixed." }
    ],
    tags: ["player-meeting", "relationship"],
    repeatKey: `player-meeting-${playerId}-${franchise.league.currentDayIndex}`
  };
}

export function applyPlayerMeetingOutcome(franchise: FranchiseState, event: DecisionEvent, option: DecisionOption): FranchiseState {
  const withEvent = franchise.decisionEvents.some((candidate) => candidate.id === event.id) ? franchise : mergeDecisionEvents(franchise, [event]);
  return resolveDecisionEvent(withEvent, event.id, option.id, new SeededRng(`${event.id}-${option.id}-player`));
}

export function createTeamMeeting(franchise: FranchiseState, context: { reason?: string } = {}, rng = new SeededRng(`${franchise.franchiseId}-team-meeting`)): DecisionEvent {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId)!;
  return {
    id: `decision-teamMeeting-${team.id}-${franchise.league.currentDate}`,
    type: "teamMeeting",
    status: "active",
    severity: getTeamMeetingNeed(franchise) ? "high" : "medium",
    createdDate: franchise.league.currentDate,
    expiresDate: addDays(franchise.league.currentDate, 5),
    phase: franchise.seasonPhase,
    teamId: team.id,
    playerIds: team.roster.filter((player) => getPlayerRosterStatus(player) === "active").slice(0, 20).map((player) => player.id),
    headline: "Team meeting available",
    body: context.reason ?? getTeamMeetingNeed(franchise) ?? "The group could use a clear message from the front office and bench.",
    sourceLabel: "Locker Room",
    locationRoom: "playerMeetings",
    options: [
      { id: "supportive", label: "Reset together", tone: "supportive", description: "Back the room and make the next step simple.", preview: "Chemistry +6, morale +2." },
      { id: "transparent", label: "Name the issue", tone: "transparent", description: "Be honest about the pressure without blaming.", preview: "Media -2, trust +2." },
      { id: "firm", label: "Demand more", tone: "firm", description: "Make the standard clear and immediate.", preview: "Accountability +4, morale mixed." }
    ],
    tags: ["team-meeting", "chemistry"],
    repeatKey: `team-meeting-${team.id}-${franchise.league.currentDayIndex}`
  };
}

export function applyTeamMeetingOutcome(franchise: FranchiseState, event: DecisionEvent, option: DecisionOption): FranchiseState {
  const withEvent = franchise.decisionEvents.some((candidate) => candidate.id === event.id) ? franchise : mergeDecisionEvents(franchise, [event]);
  return resolveDecisionEvent(withEvent, event.id, option.id, new SeededRng(`${event.id}-${option.id}-team`));
}

export function getPlayerMeetingReasons(franchise: FranchiseState, player: Player): string[] {
  const relationship = getPlayerRelationship(franchise, player.id);
  const status = getPlayerRosterStatus(player);
  const reasons: string[] = [];
  if (relationship.trust <= 42) reasons.push(`${player.displayName}'s trust is strained and needs a direct conversation.`);
  if (relationship.roleSatisfaction <= 42) reasons.push(`${player.displayName} wants the ${player.roleExpectation} picture clarified.`);
  if (status === "scratched" || status === "affiliate") reasons.push(`${player.displayName} is currently ${getRosterStatusLabel(status).toLowerCase()} and needs roster context.`);
  if (player.morale <= 42) reasons.push(`${player.displayName}'s morale is low enough to travel around the room.`);
  if (franchise.storyArcs.some((arc) => arc.status === "active" && arc.playerIds.includes(player.id))) reasons.push(`${player.displayName} is part of an active storyline.`);
  return reasons.length ? reasons : [`${player.displayName} is stable, but a proactive check-in can keep the relationship clean.`];
}

export function getTeamMeetingNeed(franchise: FranchiseState): string | undefined {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId)!;
  const dynamics = getTeamDynamics(franchise, team.id);
  if (team.record.streak.startsWith("L") && Number(team.record.streak.slice(1) || 0) >= 3) return "A losing streak is creating noise in the room.";
  if (dynamics.chemistry <= 42) return "Team chemistry is fragile enough to need a reset.";
  if (franchise.seasonPhase === "playoffs") return "The playoff moment needs a deliberate room tone.";
  if (franchise.seasonPhase === "trainingCamp") return "Training camp is the right time to set role expectations.";
  if (franchise.decisionEvents.some((event) => event.status === "active" && event.severity === "critical")) return "A critical issue is active and the group needs clarity.";
  return undefined;
}

export function generateMeetingNeedFromRosterMove(franchise: FranchiseState, playerId: string): DecisionEvent[] {
  const move = franchise.rosterMoveHistory.find((candidate) => candidate.playerId === playerId);
  return move ? generateDecisionEvents(franchise, { kind: "roster", move }, new SeededRng(`${move.id}-meeting-need`)) : [];
}

function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}
