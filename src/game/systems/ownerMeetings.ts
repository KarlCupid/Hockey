import { SeededRng } from "../rng";
import type { DecisionEvent, DecisionOption, FranchiseState } from "../types";
import { mergeDecisionEvents, resolveDecisionEvent } from "./decisionEvents";
import { calculateCapSpace, formatMoney } from "./contracts";
import { ownerMoodLabel } from "./owner";
import { recordString } from "./standings";

export function createOwnerMeeting(franchise: FranchiseState, context: { topic?: string } = {}, rng = new SeededRng(`${franchise.franchiseId}-owner-meeting`)): DecisionEvent {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId)!;
  const demand = getOwnerDemandLevel(franchise);
  return {
    id: `decision-ownerMeeting-${franchise.league.currentDate}-${context.topic ?? demand}`,
    type: "ownerMeeting",
    status: "active",
    severity: demand === "furious" ? "critical" : demand === "demanding" ? "high" : demand === "concerned" ? "medium" : "low",
    createdDate: franchise.league.currentDate,
    expiresDate: addDays(franchise.league.currentDate, 7),
    phase: franchise.seasonPhase,
    teamId: team.id,
    headline: context.topic ?? "Owner wants the state of the plan",
    body: createOwnerMeetingSummary(franchise),
    sourceLabel: "Owner Suite",
    locationRoom: "ownerSuite",
    options: [
      { id: "transparent", label: "Walk through the plan", tone: "transparent", description: "Explain record, cap, goals, and next decisions.", preview: "Owner trust +6, media pressure -2." },
      { id: "patient", label: "Ask for patience", tone: "patient", description: "Emphasize development runway and long-term stability.", preview: "Owner trust +2, fan sentiment -1." },
      { id: "aggressive", label: "Promise action", tone: "aggressive", description: "Commit to changing the roster temperature.", preview: "Owner trust +3, media pressure +3, chemistry risk." }
    ],
    tags: ["owner", "job-security"],
    repeatKey: `owner-meeting-${franchise.league.currentDate}-${demand}`
  };
}

export function applyOwnerMeetingOutcome(franchise: FranchiseState, event: DecisionEvent, option: DecisionOption): FranchiseState {
  const withEvent = franchise.decisionEvents.some((candidate) => candidate.id === event.id) ? franchise : mergeDecisionEvents(franchise, [event]);
  return resolveDecisionEvent(withEvent, event.id, option.id, new SeededRng(`${event.id}-${option.id}-owner`));
}

export function createOwnerMeetingSummary(franchise: FranchiseState): string {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId)!;
  const goalsMet = franchise.ownerState.seasonGoals.filter((goal) => goal.status === "met").length;
  const cap = calculateCapSpace(team);
  return `${team.fullName} sit ${recordString(team)} with owner confidence at ${ownerMoodLabel(franchise.ownerState)} (${franchise.ownerState.jobSecurity}/100), ${goalsMet}/${franchise.ownerState.seasonGoals.length} goals met, and ${formatMoney(cap)} in cap space.`;
}

export function getOwnerDemandLevel(franchise: FranchiseState): "patient" | "concerned" | "demanding" | "furious" {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId)!;
  if (franchise.ownerState.jobSecurity <= 24) return "furious";
  if (franchise.ownerState.jobSecurity <= 42 || (team.record.streak.startsWith("L") && Number(team.record.streak.slice(1) || 0) >= 3)) return "demanding";
  if (franchise.ownerState.jobSecurity <= 60 || team.record.points < team.stats.gamesPlayed) return "concerned";
  return "patient";
}

function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}
