import { SeededRng, clamp } from "../rng";
import type { AgentProfile, DecisionEvent, DecisionOption, FranchiseState, Player, PlayerRelationship } from "../types";
import { mergeDecisionEvents, resolveDecisionEvent } from "./decisionEvents";

export function createAgentCall(
  franchise: FranchiseState,
  agentId: string,
  playerId: string,
  context: { topic?: string } = {},
  rng = new SeededRng(`${agentId}-${playerId}-call`)
): DecisionEvent {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId)!;
  const player = team.roster.find((candidate) => candidate.id === playerId);
  const agent = franchise.agents.find((candidate) => candidate.id === agentId);
  const pressure = agent ? getAgentPressureLevel(agent) : "normal";
  return {
    id: `decision-agentCall-${agentId}-${playerId}-${franchise.league.currentDate}`,
    type: "agentCall",
    status: "active",
    severity: pressure === "public" || player?.overall && player.overall >= 84 ? "high" : "medium",
    createdDate: franchise.league.currentDate,
    expiresDate: addDays(franchise.league.currentDate, 6),
    phase: franchise.seasonPhase,
    teamId: team.id,
    playerIds: [playerId],
    headline: `${agent?.displayName ?? "Agent"} is calling about ${player?.displayName ?? "a client"}`,
    body: context.topic ?? `${agent?.negotiationStyle ?? "The player's camp wants clarity."}`,
    sourceLabel: "Agent Desk",
    locationRoom: "agents",
    options: [
      { id: "transparent", label: "Keep it private and direct", tone: "transparent", description: "Respect the camp's position and define next steps.", preview: "Agent relationship +5, public pressure -3." },
      { id: "firm", label: "Hold the club number", tone: "firm", description: "Make it clear the offer must fit the team model.", preview: "Cap discipline, agent relationship -2." },
      { id: "supportive", label: "Reassure the client", tone: "supportive", description: "Emphasize role, respect, and long-term fit.", preview: "Player trust +3, agent relationship +2." }
    ],
    tags: ["agent", "contract", pressure],
    repeatKey: `agent-call-${agentId}-${playerId}-${franchise.league.currentDayIndex}`
  };
}

export function applyAgentCallOutcome(franchise: FranchiseState, event: DecisionEvent, option: DecisionOption): FranchiseState {
  const withEvent = franchise.decisionEvents.some((candidate) => candidate.id === event.id) ? franchise : mergeDecisionEvents(franchise, [event]);
  return resolveDecisionEvent(withEvent, event.id, option.id, new SeededRng(`${event.id}-${option.id}-agent`));
}

export function getAgentForPlayer(franchise: FranchiseState, playerId: string): AgentProfile | undefined {
  return franchise.agents.find((agent) => agent.clientPlayerIds.includes(playerId));
}

export function getAgentPressureLevel(agent: AgentProfile): string {
  if (agent.publicPressure >= 78) return "public";
  if (agent.publicPressure >= 62) return "loud";
  if (agent.relationship <= 35) return "strained";
  if (agent.relationship >= 72) return "cooperative";
  return "normal";
}

export function modifyContractDemandFromAgent(player: Player, agent: AgentProfile | undefined, relationship: PlayerRelationship | undefined): number {
  if (!agent) return 1;
  const personality =
    agent.personality === "Money First"
      ? 1.035
      : agent.personality === "Hardball"
        ? 1.028
        : agent.personality === "Public Pressure"
          ? 1.02 + agent.publicPressure * 0.00035
          : agent.personality === "Loyalty First"
            ? 0.985
            : agent.personality === "Low Drama"
              ? 0.99
              : 1;
  const relationshipFactor = agent.relationship >= 72 ? 0.985 : agent.relationship <= 35 ? 1.035 : 1;
  const trustFactor = relationship && relationship.trust >= 70 ? 0.985 : relationship && relationship.trust <= 38 ? 1.025 : 1;
  const roleFactor = relationship && relationship.roleSatisfaction <= 42 && player.overall >= 78 ? 1.02 : 1;
  return clamp(personality * relationshipFactor * trustFactor * roleFactor, 0.92, 1.12);
}

function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}
