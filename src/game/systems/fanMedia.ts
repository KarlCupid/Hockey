import { SeededRng, clamp } from "../rng";
import type { FranchiseState, MediaState, NewsItem } from "../types";
import { applyGmTraitModifiers } from "./gmProfile";
import { getTeamDynamics, normalizeTeamDynamics } from "./relationships";
import { recordString } from "./standings";

export function updateFanSentiment(franchise: FranchiseState, context: { win?: boolean; majorSigning?: boolean; missedTarget?: boolean; tradeStar?: boolean } = {}): FranchiseState {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId)!;
  const dynamics = getTeamDynamics(franchise, team.id);
  const streak = team.record.streak.startsWith("W") ? Number(team.record.streak.slice(1) || 1) : team.record.streak.startsWith("L") ? -Number(team.record.streak.slice(1) || 1) : 0;
  const pressureMultiplier = franchise.difficultyTuning?.fanPatienceMultiplier ?? 1;
  const delta =
    ((context.win === true ? 3 : context.win === false ? -3 : 0) +
      streak * 0.8 +
      (context.majorSigning ? 5 : 0) -
      (context.missedTarget ? 4 : 0) -
      (context.tradeStar ? 7 : 0)) *
    pressureMultiplier;
  const fanSentiment = clamp(dynamics.fanSentiment + delta);
  return {
    ...franchise,
    league: {
      ...franchise.league,
      teams: franchise.league.teams.map((candidate) => (candidate.id === team.id ? { ...candidate, fanConfidence: fanSentiment } : candidate))
    },
    teamDynamics: {
      ...franchise.teamDynamics,
      [team.id]: normalizeTeamDynamics({ ...dynamics, fanSentiment })
    },
    updatedAt: new Date().toISOString()
  };
}

export function updateMediaState(franchise: FranchiseState, context: { win?: boolean; uglyLoss?: boolean; rumor?: boolean; transparentAnswer?: boolean } = {}): FranchiseState {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId)!;
  const dynamics = getTeamDynamics(franchise, team.id);
  const streakPressure = team.record.streak.startsWith("L") ? Number(team.record.streak.slice(1) || 1) * 2 : team.record.streak.startsWith("W") ? -Number(team.record.streak.slice(1) || 1) : 0;
  const gmModifiers = applyGmTraitModifiers(franchise, { type: "press" });
  const pressureMultiplier = franchise.difficultyTuning?.mediaPressureMultiplier ?? 1;
  const pressure = clamp(
    franchise.mediaState.pressure +
      Math.round((streakPressure + (context.uglyLoss ? 8 : 0) + (context.rumor ? 5 : 0)) * pressureMultiplier) -
      (context.transparentAnswer ? 4 + Math.max(0, -(gmModifiers.mediaPressureModifier ?? 0)) : 0)
  );
  return {
    ...franchise,
    mediaState: {
      ...franchise.mediaState,
      pressure,
      narrative: narrativeFor(pressure, team.record.points, team.stats.gamesPlayed),
      columnistTone: pressure >= 70 ? "critical" : pressure >= 58 ? "provocative" : pressure <= 35 ? "friendly" : "neutral"
    },
    teamDynamics: {
      ...franchise.teamDynamics,
      [team.id]: normalizeTeamDynamics({ ...dynamics, mediaPressure: pressure })
    },
    updatedAt: new Date().toISOString()
  };
}

export function createMediaNarrative(franchise: FranchiseState): string {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId)!;
  if (franchise.mediaState.narrative === "hotSeat") return `The local beat is openly asking whether ${team.nickname} management can calm the file.`;
  if (franchise.mediaState.narrative === "playoffBuzz") return `${team.nickname} coverage has shifted toward playoff credibility and deadline choices.`;
  if (franchise.mediaState.narrative === "rebuildDebate") return `The market is debating whether ${team.fullName} should lean into the future.`;
  if (franchise.mediaState.narrative === "optimistic") return `The tone around ${team.fullName} is cautiously upbeat.`;
  if (franchise.mediaState.narrative === "skeptical") return `Reporters are giving the plan room, but every answer is being checked against the standings.`;
  return "The media cycle is quiet enough for the front office to set the next story.";
}

export function createFanPulse(franchise: FranchiseState): string {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId)!;
  const band = getFanSentimentBand(getTeamDynamics(franchise, team.id).fanSentiment);
  return `${band}: ${team.fullName} fans see ${recordString(team)} and want ${team.record.streak.startsWith("L") ? "a response" : "the plan to keep building"}.`;
}

export function getFanSentimentBand(value: number): string {
  if (value >= 78) return "Believing";
  if (value >= 62) return "Warm";
  if (value >= 45) return "Split";
  if (value >= 28) return "Restless";
  return "Angry";
}

export function getColumnistHeadline(franchise: FranchiseState, rng = new SeededRng(`${franchise.franchiseId}-columnist-${franchise.league.currentDate}`)): NewsItem {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId)!;
  const pressure = franchise.mediaState.pressure;
  const headline =
    pressure >= 75
      ? `Column: ${team.nickname} cannot keep calling this just noise`
      : pressure >= 55
        ? `Column: ${team.nickname} need a cleaner answer before the next homestand`
        : pressure <= 35
          ? `Column: ${team.nickname} have bought themselves a quieter week`
          : `Column: ${team.nickname} still searching for the next clean story`;
  return {
    id: `columnist-${team.id}-${franchise.league.currentDate}-${Math.round(pressure)}`,
    type: "media",
    date: franchise.league.currentDate,
    headline,
    body: createMediaNarrative(franchise),
    severity: pressure >= 70 ? "high" : pressure >= 52 ? "medium" : "low",
    teamId: team.id
  };
}

export function defaultMediaState(franchise: FranchiseState): MediaState {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId)!;
  const basePressure = clamp(42 + (team.marketSize === "Large" ? 10 : team.marketSize === "Small" ? -6 : 0));
  return {
    pressure: basePressure,
    narrative: narrativeFor(basePressure, team.record.points, team.stats.gamesPlayed),
    recentQuestions: [],
    columnistTone: basePressure >= 58 ? "provocative" : basePressure <= 34 ? "friendly" : "neutral"
  };
}

function narrativeFor(pressure: number, points: number, gamesPlayed: number): MediaState["narrative"] {
  if (pressure >= 78) return "hotSeat";
  if (gamesPlayed > 0 && points >= gamesPlayed * 1.25) return "playoffBuzz";
  if (gamesPlayed > 0 && points <= gamesPlayed * 0.75) return "rebuildDebate";
  if (pressure >= 58) return "skeptical";
  if (pressure <= 35) return "optimistic";
  return "quiet";
}
