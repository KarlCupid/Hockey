import { SeededRng, clamp } from "../rng";
import type { AgentProfile, FranchiseState, Player, PlayerRelationship, Team, TeamDynamics } from "../types";
import { getPlayerRosterStatus } from "./rosterRules";

const AGENT_NAMES = [
  "Mara Voss",
  "Theo Calder",
  "Iris Vale",
  "Jonas Pike",
  "Nadia Keene",
  "Rafe Sutter",
  "Clara Stone",
  "Bennett Rowe",
  "Tessa Lind",
  "Milo Cross"
];

const AGENT_PERSONALITIES: AgentProfile["personality"][] = [
  "Collaborative",
  "Hardball",
  "Public Pressure",
  "Loyalty First",
  "Money First",
  "Role First",
  "Low Drama"
];

export function generateAgentsForPlayers(franchise: FranchiseState, rng = new SeededRng(`${franchise.franchiseId}-agents`)): AgentProfile[] {
  const players = franchise.league.teams.flatMap((team) => team.roster);
  const buckets = Math.min(AGENT_NAMES.length, Math.max(4, Math.ceil(players.length / 26)));
  const agents: AgentProfile[] = Array.from({ length: buckets }, (_, index) => {
    const personality = AGENT_PERSONALITIES[index % AGENT_PERSONALITIES.length];
    return {
      id: `agent-${index + 1}`,
      displayName: AGENT_NAMES[index],
      personality,
      clientPlayerIds: [],
      relationship: clamp(54 + rng.int(-8, 10)),
      publicPressure: personality === "Public Pressure" ? 62 : personality === "Low Drama" ? 28 : clamp(42 + rng.int(-12, 14)),
      negotiationStyle: negotiationStyleFor(personality),
      notes: [`${personality} representative with a ${personality === "Low Drama" ? "quiet" : "noticeable"} media footprint.`]
    };
  });

  players
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((player, index) => {
      const preferred =
        player.personality === "High-Maintenance Star"
          ? agents.find((agent) => agent.personality === "Public Pressure" || agent.personality === "Hardball")
          : player.roleExpectation.includes("Franchise") || player.overall >= 84
            ? agents.find((agent) => agent.personality === "Money First" || agent.personality === "Role First")
            : undefined;
      const agent = preferred ?? agents[index % agents.length];
      agent.clientPlayerIds.push(player.id);
    });

  return agents;
}

export function generateInitialPlayerRelationships(franchise: FranchiseState): Record<string, PlayerRelationship> {
  const agentByPlayer = new Map((franchise.agents ?? []).flatMap((agent) => agent.clientPlayerIds.map((playerId) => [playerId, agent.id] as const)));
  return Object.fromEntries(
    franchise.league.teams.flatMap((team) =>
      team.roster.map((player) => {
        const roleSatisfaction = getRoleSatisfaction(player, team);
        const pressureTolerance =
          player.personality === "Leader" || player.personality === "Professional"
            ? 70
            : player.personality === "High-Maintenance Star"
              ? 46
              : player.age <= 22
                ? 50
                : 58;
        const trust = clamp(58 + (player.morale - 50) * 0.28 + (player.personality === "Locker-Room Glue" ? 8 : 0));
        return [
          player.id,
          {
            playerId: player.id,
            trust,
            roleSatisfaction,
            communication: clamp(55 + (player.personality === "Quiet Worker" ? -6 : player.personality === "Leader" ? 8 : 0)),
            pressureTolerance,
            agentId: agentByPlayer.get(player.id),
            notes: [createRelationshipNote(player, { playerId: player.id, trust, roleSatisfaction, communication: 55, pressureTolerance, agentId: agentByPlayer.get(player.id), notes: [] }, team)]
          }
        ] satisfies [string, PlayerRelationship];
      })
    )
  );
}

export function generateInitialTeamDynamics(franchise: FranchiseState): Record<string, TeamDynamics> {
  return Object.fromEntries(
    franchise.league.teams.map((team) => {
      const chemistry = clamp(55 + (team.fanConfidence - 50) * 0.2 + (team.record.wins - team.record.losses) * 0.8);
      const ownerTrust = team.id === franchise.selectedTeamId ? franchise.ownerState?.jobSecurity ?? team.ownerPatience : team.ownerPatience;
      const relationships = Object.fromEntries(team.roster.map((player) => [player.id, franchise.playerRelationships?.[player.id]]).filter((entry) => Boolean(entry[1]))) as Record<
        string,
        PlayerRelationship
      >;
      const base: TeamDynamics = {
        chemistry,
        leadership: clamp(48 + leadershipScore(team)),
        accountability: clamp(54 + team.tactics.defensiveStructure * 0.12 - team.tactics.offensiveRisk * 0.05),
        roomMood: "steady",
        mediaPressure: clamp(45 + (team.marketSize === "Large" ? 9 : team.marketSize === "Small" ? -5 : 0) - team.record.points * 0.15),
        fanSentiment: clamp(team.fanConfidence),
        ownerTrust: clamp(ownerTrust),
        rivalryHeatByTeamId: Object.fromEntries(franchise.league.teams.filter((candidate) => candidate.id !== team.id).map((candidate) => [candidate.id, 18])),
        unresolvedIssues: []
      };
      return [team.id, { ...base, roomMood: calculateRoomMood(team, relationships, base) }] satisfies [string, TeamDynamics];
    })
  );
}

export function getPlayerRelationship(franchise: FranchiseState, playerId: string): PlayerRelationship {
  return (
    franchise.playerRelationships[playerId] ?? {
      playerId,
      trust: 55,
      roleSatisfaction: 55,
      communication: 55,
      pressureTolerance: 55,
      agentId: franchise.agents.find((agent) => agent.clientPlayerIds.includes(playerId))?.id,
      notes: ["Relationship file was rebuilt from current roster context."]
    }
  );
}

export function updatePlayerRelationship(franchise: FranchiseState, playerId: string, patch: Partial<PlayerRelationship>): FranchiseState {
  const current = getPlayerRelationship(franchise, playerId);
  return {
    ...franchise,
    playerRelationships: {
      ...franchise.playerRelationships,
      [playerId]: normalizeRelationship({ ...current, ...patch })
    },
    updatedAt: new Date().toISOString()
  };
}

export function getTeamDynamics(franchise: FranchiseState, teamId: string): TeamDynamics {
  const team = franchise.league.teams.find((candidate) => candidate.id === teamId);
  return (
    franchise.teamDynamics[teamId] ?? {
      chemistry: 55,
      leadership: 55,
      accountability: 55,
      roomMood: "steady",
      mediaPressure: 50,
      fanSentiment: team?.fanConfidence ?? 55,
      ownerTrust: teamId === franchise.selectedTeamId ? franchise.ownerState.jobSecurity : team?.ownerPatience ?? 55,
      rivalryHeatByTeamId: Object.fromEntries(franchise.league.teams.filter((candidate) => candidate.id !== teamId).map((candidate) => [candidate.id, 18])),
      unresolvedIssues: []
    }
  );
}

export function updateTeamDynamics(franchise: FranchiseState, teamId: string, patch: Partial<TeamDynamics>): FranchiseState {
  const current = getTeamDynamics(franchise, teamId);
  return {
    ...franchise,
    teamDynamics: {
      ...franchise.teamDynamics,
      [teamId]: normalizeTeamDynamics({ ...current, ...patch })
    },
    updatedAt: new Date().toISOString()
  };
}

export function calculateRoomMood(team: Team, relationships: Record<string, PlayerRelationship>, dynamics: TeamDynamics): TeamDynamics["roomMood"] {
  const values = Object.values(relationships);
  const avgTrust = values.length ? values.reduce((sum, item) => sum + item.trust, 0) / values.length : 55;
  const avgRole = values.length ? values.reduce((sum, item) => sum + item.roleSatisfaction, 0) / values.length : 55;
  const losingPenalty = team.record.streak.startsWith("L") ? Number(team.record.streak.slice(1) || 1) * 4 : 0;
  const score = dynamics.chemistry * 0.46 + avgTrust * 0.28 + avgRole * 0.18 + dynamics.leadership * 0.08 - losingPenalty;
  if (score >= 78) return "surging";
  if (score >= 66) return "confident";
  if (score >= 49) return "steady";
  if (score >= 35) return "fragile";
  return "tense";
}

export function getRoleSatisfaction(player: Player, team: Team): number {
  const status = getPlayerRosterStatus(player);
  const assignedIds = new Set([
    ...team.lines.forwardLines.flatMap((line) => [line.lw, line.c, line.rw]),
    ...team.lines.defensePairs.flatMap((pair) => [pair.ld, pair.rd]),
    team.lines.goalies.starter,
    team.lines.goalies.backup
  ]);
  const expectsPrimeRole = ["Franchise Driver", "Top Line", "Top Six", "Top Pair", "Starter"].includes(player.roleExpectation);
  const expectsRoster = !["Depth"].includes(player.roleExpectation);
  let score = 58 + (player.morale - 50) * 0.24;
  if (assignedIds.has(player.id)) score += 13;
  if (status === "active") score += 5;
  if (status === "scratched") score -= expectsRoster ? 18 : 5;
  if (status === "affiliate") score -= expectsPrimeRole ? 36 : expectsRoster ? 22 : 8;
  if (status === "injuredReserve") score -= 6;
  if (expectsPrimeRole && !assignedIds.has(player.id)) score -= 18;
  if (player.age <= 22 && status === "affiliate") score += 7;
  return clamp(Math.round(score));
}

export function getPlayerTrustBand(value: number): string {
  if (value >= 78) return "Deep trust";
  if (value >= 62) return "Positive";
  if (value >= 45) return "Workable";
  if (value >= 28) return "Strained";
  return "Fractured";
}

export function getTeamChemistryBand(value: number): string {
  if (value >= 78) return "Connected";
  if (value >= 62) return "Healthy";
  if (value >= 45) return "Uneven";
  if (value >= 28) return "Fragile";
  return "Splintered";
}

export function getMediaPressureBand(value: number): string {
  if (value >= 78) return "Hot seat";
  if (value >= 62) return "Loud";
  if (value >= 45) return "Manageable";
  if (value >= 28) return "Quiet";
  return "Calm";
}

export function createRelationshipNote(player: Player, relationship: PlayerRelationship, team: Team): string {
  const role = getRoleSatisfaction(player, team);
  if (relationship.trust <= 38) return `${player.displayName} needs direct communication before the frustration becomes the story.`;
  if (role <= 38) return `${player.displayName} wants clarity on the ${player.roleExpectation} path.`;
  if (player.personality === "Leader") return `${player.displayName} can help stabilize the room if kept in the loop.`;
  if (player.age <= 22) return `${player.displayName} is still learning how the organization communicates.`;
  return `${player.displayName} is tracking the plan and expects honest updates.`;
}

export function normalizeRelationship(relationship: PlayerRelationship): PlayerRelationship {
  return {
    ...relationship,
    trust: clamp(Math.round(relationship.trust)),
    roleSatisfaction: clamp(Math.round(relationship.roleSatisfaction)),
    communication: clamp(Math.round(relationship.communication)),
    pressureTolerance: clamp(Math.round(relationship.pressureTolerance)),
    notes: relationship.notes.slice(0, 8)
  };
}

export function normalizeTeamDynamics(dynamics: TeamDynamics): TeamDynamics {
  return {
    ...dynamics,
    chemistry: clamp(Math.round(dynamics.chemistry)),
    leadership: clamp(Math.round(dynamics.leadership)),
    accountability: clamp(Math.round(dynamics.accountability)),
    mediaPressure: clamp(Math.round(dynamics.mediaPressure)),
    fanSentiment: clamp(Math.round(dynamics.fanSentiment)),
    ownerTrust: clamp(Math.round(dynamics.ownerTrust)),
    rivalryHeatByTeamId: Object.fromEntries(Object.entries(dynamics.rivalryHeatByTeamId).map(([teamId, value]) => [teamId, clamp(Math.round(value))])),
    unresolvedIssues: dynamics.unresolvedIssues.slice(0, 12)
  };
}

function negotiationStyleFor(personality: AgentProfile["personality"]): string {
  if (personality === "Hardball") return "Tests the top of every offer and rarely accepts the first answer.";
  if (personality === "Public Pressure") return "Uses media temperature when talks stall.";
  if (personality === "Loyalty First") return "Prioritizes trust and role honesty over pure dollars.";
  if (personality === "Money First") return "Measures respect through cap hit and term.";
  if (personality === "Role First") return "Pushes hard for usage clarity.";
  if (personality === "Low Drama") return "Keeps talks quiet if communication stays clean.";
  return "Prefers direct, collaborative negotiation.";
}

function leadershipScore(team: Team): number {
  return team.roster.reduce((sum, player) => {
    const value = "leadership" in player.attributes ? player.attributes.leadership : player.attributes.mentalToughness;
    return sum + (value - 50) * 0.035 + (player.personality === "Leader" || player.personality === "Veteran Mentor" ? 2.2 : 0);
  }, 0);
}
