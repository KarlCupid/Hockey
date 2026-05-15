import { clamp } from "../rng";
import type { DecisionEventSeverity, FranchiseState, StoryFrequency } from "../types";

export interface EventCadenceTuning {
  storyFrequency: StoryFrequency;
  decisionChance: number;
  maxActiveEvents: number;
  maxEventsPerSeason: number;
  highSeverityChance: number;
  naturalDecayRate: number;
  pressureSpikeScale: number;
}

export interface SentimentDrift {
  ownerTrustDelta: number;
  fanSentimentDelta: number;
  mediaPressureDelta: number;
  chemistryDelta: number;
}

const BASE_BY_FREQUENCY: Record<StoryFrequency, Omit<EventCadenceTuning, "storyFrequency">> = {
  quiet: {
    decisionChance: 0.2,
    maxActiveEvents: 4,
    maxEventsPerSeason: 10,
    highSeverityChance: 0.12,
    naturalDecayRate: 1.8,
    pressureSpikeScale: 0.72
  },
  normal: {
    decisionChance: 0.48,
    maxActiveEvents: 7,
    maxEventsPerSeason: 25,
    highSeverityChance: 0.2,
    naturalDecayRate: 2.7,
    pressureSpikeScale: 1
  },
  dramatic: {
    decisionChance: 0.78,
    maxActiveEvents: 9,
    maxEventsPerSeason: 45,
    highSeverityChance: 0.3,
    naturalDecayRate: 3.4,
    pressureSpikeScale: 1.28
  }
};

export function getEventCadenceTuning(franchise: FranchiseState): EventCadenceTuning {
  const storyFrequency = franchise.gmProfile?.storyFrequency ?? "normal";
  const base = BASE_BY_FREQUENCY[storyFrequency] ?? BASE_BY_FREQUENCY.normal;
  const multiplier = franchise.difficultyTuning?.storyEventMultiplier ?? 1;
  return {
    storyFrequency,
    decisionChance: clampNumber(base.decisionChance * multiplier, 0.06, 0.95),
    maxActiveEvents: base.maxActiveEvents,
    maxEventsPerSeason: base.maxEventsPerSeason,
    highSeverityChance: clampNumber(base.highSeverityChance * multiplier, 0.05, 0.55),
    naturalDecayRate: base.naturalDecayRate,
    pressureSpikeScale: base.pressureSpikeScale * (franchise.difficultyTuning?.mediaPressureMultiplier ?? 1)
  };
}

export function shouldGenerateDecisionEvent(
  franchise: FranchiseState,
  trigger: string,
  rng: { chance(probability: number): boolean }
): boolean {
  const tuning = getEventCadenceTuning(franchise);
  const activeEvents = franchise.decisionEvents.filter((event) => event.status === "active").length;
  if (activeEvents >= tuning.maxActiveEvents) return false;

  const seasonEventCount = franchise.decisionEvents.filter((event) => event.createdDate.slice(0, 4) === franchise.league.currentDate.slice(0, 4)).length;
  if (seasonEventCount >= tuning.maxEventsPerSeason) return false;

  const triggerModifier = trigger.includes("loss") || trigger.includes("owner") || trigger.includes("phase") ? 1.2 : 1;
  const activePenalty = Math.max(0.45, 1 - activeEvents * 0.08);
  return rng.chance(clampNumber(tuning.decisionChance * triggerModifier * activePenalty, 0.03, 0.95));
}

export function calculateEventSeverity(franchise: FranchiseState, trigger: string): DecisionEventSeverity {
  const dynamics = franchise.teamDynamics[franchise.selectedTeamId];
  const pressure = Math.max(dynamics?.mediaPressure ?? 0, franchise.mediaState.pressure);
  const failedGoals = franchise.ownerState.seasonGoals.filter((goal) => goal.status === "failed").length;
  const hotTrigger = trigger.includes("owner") || trigger.includes("playoff") || trigger.includes("loss");
  const score =
    pressure * 0.35 +
    (100 - (dynamics?.ownerTrust ?? 70)) * 0.24 +
    (100 - (dynamics?.chemistry ?? 60)) * 0.18 +
    failedGoals * 12 +
    (hotTrigger ? 10 : 0);
  if (score >= 78) return "critical";
  if (score >= 55) return "high";
  if (score >= 32) return "medium";
  return "low";
}

export function calculateSentimentDrift(franchise: FranchiseState): SentimentDrift {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId);
  const tuning = franchise.difficultyTuning;
  if (!team) {
    return { ownerTrustDelta: 0, fanSentimentDelta: 0, mediaPressureDelta: 0, chemistryDelta: 0 };
  }

  const gamesPlayed = team.record.wins + team.record.losses + team.record.overtimeLosses;
  const pointPct = gamesPlayed > 0 ? (team.record.wins * 2 + team.record.overtimeLosses) / (gamesPlayed * 2) : 0.5;
  const failedGoals = franchise.ownerState.seasonGoals.filter((goal) => goal.status === "failed").length;
  const metGoals = franchise.ownerState.seasonGoals.filter((goal) => goal.status === "met").length;
  const rosterChurn = franchise.rosterMoveHistory.filter((move) => move.teamId === team.id).length;
  const unresolved = franchise.teamDynamics[team.id]?.unresolvedIssues.length ?? 0;
  const goalDifferential = team.record.goalsFor - team.record.goalsAgainst;

  const ownerMultiplier = tuning?.ownerPatienceMultiplier ?? 1;
  const mediaMultiplier = tuning?.mediaPressureMultiplier ?? 1;
  const fanMultiplier = tuning?.fanPatienceMultiplier ?? 1;

  const ownerTrustDelta = Math.round(((pointPct - 0.52) * 8 + metGoals * 1.5 - failedGoals * 6) * ownerMultiplier);
  const fanSentimentDelta = Math.round(((pointPct - 0.5) * 10 + goalDifferential * 0.08 - failedGoals * 2) * fanMultiplier);
  const mediaPressureDelta = Math.round(((0.52 - pointPct) * 14 + failedGoals * 4 + unresolved * 1.4) * mediaMultiplier);
  const chemistryDelta = Math.round((pointPct - 0.5) * 5 - rosterChurn * 0.35 - unresolved * 1.2);

  return {
    ownerTrustDelta,
    fanSentimentDelta,
    mediaPressureDelta,
    chemistryDelta
  };
}

export function applyNaturalSentimentDecay(franchise: FranchiseState): FranchiseState {
  const teamId = franchise.selectedTeamId;
  const dynamics = franchise.teamDynamics[teamId];
  if (!dynamics) return franchise;
  const tuning = getEventCadenceTuning(franchise);
  const drift = calculateSentimentDrift(franchise);

  const nextDynamics = {
    ...dynamics,
    ownerTrust: clamp(
      Math.round(moveToward(dynamics.ownerTrust, 74, tuning.naturalDecayRate) + drift.ownerTrustDelta * 0.35)
    ),
    fanSentiment: clamp(
      Math.round(moveToward(dynamics.fanSentiment, 62, tuning.naturalDecayRate * 0.8) + drift.fanSentimentDelta * 0.35)
    ),
    chemistry: clamp(Math.round(moveToward(dynamics.chemistry, 66, tuning.naturalDecayRate * 0.7) + drift.chemistryDelta * 0.3)),
    mediaPressure: clamp(
      Math.round(moveToward(dynamics.mediaPressure, 28, tuning.naturalDecayRate) + drift.mediaPressureDelta * 0.35)
    )
  };

  return {
    ...franchise,
    teamDynamics: {
      ...franchise.teamDynamics,
      [teamId]: nextDynamics
    },
    mediaState: {
      ...franchise.mediaState,
      pressure: clamp(Math.round(moveToward(franchise.mediaState.pressure, 26, tuning.naturalDecayRate) + drift.mediaPressureDelta * 0.25))
    }
  };
}

export function applyRelationshipDrift(franchise: FranchiseState): FranchiseState {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId);
  if (!team) return franchise;
  const churnPenalty = Math.min(4, franchise.rosterMoveHistory.filter((move) => move.teamId === team.id).length * 0.1);
  const losingPenalty = team.record.losses > team.record.wins ? 1.2 : 0;
  const activeIssuePenalty = franchise.decisionEvents.filter((event) => event.status === "active" && event.teamId === team.id).length * 0.4;
  const totalPenalty = churnPenalty + losingPenalty + activeIssuePenalty;
  if (totalPenalty <= 0) return franchise;

  const nextRelationships = { ...franchise.playerRelationships };
  for (const player of team.roster.filter((candidate) => candidate.rosterStatus === "active").slice(0, 24)) {
    const relationship = nextRelationships[player.id];
    if (!relationship) continue;
    nextRelationships[player.id] = {
      ...relationship,
      trust: clamp(Math.round(relationship.trust - totalPenalty * 0.5)),
      roleSatisfaction: clamp(Math.round(relationship.roleSatisfaction - totalPenalty * 0.35))
    };
  }
  return { ...franchise, playerRelationships: nextRelationships };
}

export function applyMediaPressureDrift(franchise: FranchiseState): FranchiseState {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId);
  const dynamics = franchise.teamDynamics[franchise.selectedTeamId];
  if (!team || !dynamics) return franchise;
  const losingSeason = team.record.losses > team.record.wins;
  const losingStreak = /^L\d+/.test(team.record.streak) ? Number(team.record.streak.slice(1)) : 0;
  const failedGoals = franchise.ownerState.seasonGoals.filter((goal) => goal.status === "failed").length;
  const multiplier = franchise.difficultyTuning?.mediaPressureMultiplier ?? 1;
  const storyFloor = franchise.gmProfile.storyFrequency === "dramatic" ? 10 : franchise.gmProfile.storyFrequency === "quiet" ? 2 : 6;
  const spike = Math.round(((losingSeason ? 5 : 0) + losingStreak * 1.5 + failedGoals * 3) * multiplier);
  const pressureFloor = Math.round(storyFloor * multiplier);
  const nextPressure = clamp(Math.max(dynamics.mediaPressure + spike, pressureFloor));
  return {
    ...franchise,
    teamDynamics: {
      ...franchise.teamDynamics,
      [team.id]: { ...dynamics, mediaPressure: nextPressure }
    },
    mediaState: {
      ...franchise.mediaState,
      pressure: clamp(Math.max(franchise.mediaState.pressure + Math.round(spike * 0.8), pressureFloor)),
      narrative: nextPressure >= 72 ? "hotSeat" : nextPressure >= 52 ? "skeptical" : franchise.mediaState.narrative
    }
  };
}

export function applyTeamChemistryDrift(franchise: FranchiseState): FranchiseState {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId);
  const dynamics = franchise.teamDynamics[franchise.selectedTeamId];
  if (!team || !dynamics) return franchise;
  const churn = franchise.rosterMoveHistory.filter((move) => move.teamId === team.id).length;
  const unresolved = dynamics.unresolvedIssues.length + franchise.decisionEvents.filter((event) => event.status === "active" && event.teamId === team.id).length;
  const losingStreak = /^L\d+/.test(team.record.streak) ? Number(team.record.streak.slice(1)) : 0;
  const winningStreak = /^W\d+/.test(team.record.streak) ? Number(team.record.streak.slice(1)) : 0;
  const delta = Math.round(winningStreak * 0.5 - losingStreak * 1.1 - churn * 0.25 - unresolved * 1.4);
  return {
    ...franchise,
    teamDynamics: {
      ...franchise.teamDynamics,
      [team.id]: {
        ...dynamics,
        chemistry: clamp(dynamics.chemistry + delta),
        roomMood: roomMoodFor(clamp(dynamics.chemistry + delta))
      }
    }
  };
}

function moveToward(value: number, target: number, amount: number): number {
  if (value > target) return Math.max(target, value - amount);
  if (value < target) return Math.min(target, value + amount);
  return value;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roomMoodFor(chemistry: number): FranchiseState["teamDynamics"][string]["roomMood"] {
  if (chemistry >= 84) return "surging";
  if (chemistry >= 70) return "confident";
  if (chemistry >= 52) return "steady";
  if (chemistry >= 36) return "fragile";
  return "tense";
}
