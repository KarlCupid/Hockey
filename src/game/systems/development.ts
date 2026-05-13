import { clamp } from "../rng";
import type { SeededRng } from "../rng";
import type {
  DevelopmentFocus,
  DevelopmentIntensity,
  DevelopmentPlan,
  DevelopmentState,
  DevelopmentUpdate,
  GoalieAttributes,
  LeagueState,
  NewsItem,
  Player,
  SkaterAttributes,
  StaffState,
  Team
} from "../types";
import { calculateTeamStaffModifiers } from "./staff";

export interface DevelopmentTickResult {
  league: LeagueState;
  development: DevelopmentState;
  news: NewsItem[];
}

type SkaterAttributeKey = keyof SkaterAttributes;
type GoalieAttributeKey = keyof GoalieAttributes;

const INTENSITY_PROGRESS: Record<DevelopmentIntensity, number> = {
  Light: 12,
  Normal: 18,
  Aggressive: 26
};

export function assignDevelopmentPlan(
  state: DevelopmentState,
  input: Omit<DevelopmentPlan, "progress" | "lastUpdatedDayIndex" | "note"> & { dayIndex: number }
): DevelopmentState {
  const note = planNote(input.focus, input.intensity);
  const nextPlan: DevelopmentPlan = {
    playerId: input.playerId,
    focus: input.focus,
    intensity: input.intensity,
    progress: state.plans.find((plan) => plan.playerId === input.playerId)?.progress ?? 0,
    lastUpdatedDayIndex: input.dayIndex,
    note
  };
  const existing = state.plans.some((plan) => plan.playerId === input.playerId);
  if (existing) {
    return {
      ...state,
      plans: state.plans.map((plan) => (plan.playerId === input.playerId ? nextPlan : plan))
    };
  }
  if (state.plans.length >= 5) return state;
  return {
    ...state,
    plans: [...state.plans, nextPlan]
  };
}

export function removeDevelopmentPlan(state: DevelopmentState, playerId: string): DevelopmentState {
  return {
    ...state,
    plans: state.plans.filter((plan) => plan.playerId !== playerId)
  };
}

export function tickDevelopment(state: DevelopmentState, league: LeagueState, dayIndex: number, rng: SeededRng, staffState?: StaffState): DevelopmentTickResult {
  const updates: DevelopmentUpdate[] = [];
  const news: NewsItem[] = [];
  let plans = state.plans;
  const teams = league.teams.map((team) => {
    let rosterChanged = false;
    const roster = team.roster.map((player) => {
      const plan = plans.find((candidate) => candidate.playerId === player.id);
      if (!plan) return maybeDeclineVeteran(player, league.currentDate, updates, rng);
      const staffModifier = calculateTeamStaffModifiers(staffState, team.id).development;
      const progressGain = calculateDevelopmentProgress(player, plan, rng, staffModifier);
      const nextProgress = clamp(plan.progress + progressGain, 0, 120);
      plans = plans.map((candidate) =>
        candidate.playerId === player.id ? { ...candidate, progress: nextProgress >= 100 ? nextProgress - 100 : nextProgress, lastUpdatedDayIndex: dayIndex } : candidate
      );
      const riskAdjusted = applyIntensityRisk(player, plan, rng);
      let nextPlayer = riskAdjusted.player;
      if (nextProgress >= 100 && player.injuryStatus === "healthy") {
        const improved = improvePlayerForFocus(nextPlayer, plan.focus, league.currentDate, updates, rng);
        nextPlayer = improved;
        if (updates[updates.length - 1]?.playerId === player.id) {
          const item = updates[updates.length - 1];
          news.push({
            id: `development-news-${item.id}`,
            type: "development",
            date: league.currentDate,
            headline: item.headline,
            body: item.body,
            severity: "low",
            teamId: team.id,
            playerId: player.id
          });
        }
      }
      if (riskAdjusted.warning && news.length < 4) {
        news.push({
          id: `development-risk-${player.id}-${dayIndex}`,
          type: "development",
          date: league.currentDate,
          headline: `Development Staff: ${player.displayName}'s workload is showing`,
          body: riskAdjusted.warning,
          severity: "medium",
          teamId: team.id,
          playerId: player.id
        });
      }
      rosterChanged = rosterChanged || nextPlayer !== player;
      return nextPlayer;
    });
    return rosterChanged ? { ...team, roster } : team;
  });

  return {
    league: {
      ...league,
      teams
    },
    development: {
      plans,
      recentUpdates: [...updates, ...state.recentUpdates].slice(0, 16)
    },
    news: news.slice(0, 5)
  };
}

export function calculateDevelopmentProgress(player: Player, plan: DevelopmentPlan, rng: SeededRng, staffModifier = 0): number {
  const ageCurve = player.age <= 22 ? 10 : player.age <= 25 ? 7 : player.age <= 29 ? 3 : player.age <= 33 ? 0 : -4;
  const upside = Math.max(0, player.potential - player.overall) * 0.55;
  const morale = (player.morale - 50) * 0.05;
  const form = (player.form - 50) * 0.05;
  const fatigue = player.fatigue > 70 ? -6 : player.fatigue > 55 ? -2 : 2;
  const injury = player.injuryStatus === "healthy" ? 0 : -10;
  return Math.max(3, Math.round(INTENSITY_PROGRESS[plan.intensity] + ageCurve + upside + morale + form + fatigue + injury + staffModifier * 2 + rng.int(-3, 4)));
}

export function developmentCandidateScore(player: Player): number {
  const youth = player.age <= 22 ? 22 : player.age <= 25 ? 15 : player.age <= 29 ? 6 : player.age >= 33 ? -5 : 0;
  return youth + Math.max(0, player.potential - player.overall) * 2 + (player.overall < 74 ? 6 : 0) - Math.max(0, player.fatigue - 65) * 0.2;
}

function improvePlayerForFocus(player: Player, focus: DevelopmentFocus, date: string, updates: DevelopmentUpdate[], rng: SeededRng): Player {
  const keys = attributeKeysForFocus(player, focus);
  if (!keys.length) return player;
  const key = rng.pick(keys);
  const attributes = { ...player.attributes };
  const current = attributes[key as keyof typeof attributes] as number;
  attributes[key as keyof typeof attributes] = clamp(current + 1, 40, 99) as never;
  const overallBoost = player.age <= 25 && player.overall < player.potential && rng.chance(0.35) ? 1 : 0;
  const nextPlayer = {
    ...player,
    attributes,
    overall: clamp(player.overall + overallBoost, 40, Math.max(player.overall, player.potential)),
    form: clamp(player.form + 2, 0, 100),
    morale: clamp(player.morale + 1, 0, 100)
  };
  updates.push({
    id: `dev-${player.id}-${date}-${key}`,
    playerId: player.id,
    date,
    headline: `Development Staff: ${player.displayName}'s ${formatAttribute(key)} work is starting to show`,
    body: `${focus} sessions produced a small but real improvement.`,
    attributeChanged: formatAttribute(key),
    amount: 1
  });
  return nextPlayer;
}

function maybeDeclineVeteran(player: Player, date: string, updates: DevelopmentUpdate[], rng: SeededRng): Player {
  if (player.age < 34 || player.fatigue < 78 || player.form > 42 || !rng.chance(0.04)) return player;
  const keys = attributeKeysForFocus(player, player.position === "G" ? "Goalie Technique" : "Skating");
  const key = keys[0];
  const attributes = { ...player.attributes };
  const current = attributes[key as keyof typeof attributes] as number;
  attributes[key as keyof typeof attributes] = clamp(current - 1, 40, 99) as never;
  updates.push({
    id: `decline-${player.id}-${date}-${key}`,
    playerId: player.id,
    date,
    headline: `Development Staff: ${player.displayName} may be losing a step`,
    body: "Fatigue and age are starting to tug at the margins.",
    attributeChanged: formatAttribute(key),
    amount: -1
  });
  return {
    ...player,
    attributes,
    overall: rng.chance(0.25) ? clamp(player.overall - 1, 40, 99) : player.overall,
    form: clamp(player.form - 1, 0, 100)
  };
}

function applyIntensityRisk(player: Player, plan: DevelopmentPlan, rng: SeededRng): { player: Player; warning?: string } {
  if (plan.intensity === "Light") {
    return { player: { ...player, fatigue: clamp(player.fatigue + (rng.chance(0.18) ? 1 : 0), 0, 100) } };
  }
  if (plan.intensity === "Normal") {
    return { player: { ...player, fatigue: clamp(player.fatigue + (rng.chance(0.28) ? 2 : 0), 0, 100) } };
  }
  const fatigueHit = rng.int(1, 3) + (rng.chance(0.45) ? rng.int(1, 2) : 0);
  const moraleHit = rng.chance(0.32) ? rng.int(1, 3) : 0;
  const next = {
    ...player,
    fatigue: clamp(player.fatigue + fatigueHit, 0, 100),
    morale: clamp(player.morale - moraleHit, 0, 100)
  };
  return {
    player: next,
    warning: fatigueHit >= 4 || moraleHit >= 2 ? `Aggressive ${plan.focus.toLowerCase()} work may be wearing on ${player.displayName}.` : undefined
  };
}

function attributeKeysForFocus(player: Player, focus: DevelopmentFocus): Array<SkaterAttributeKey | GoalieAttributeKey> {
  if ("reflexes" in player.attributes) {
    const goalie: Record<DevelopmentFocus, GoalieAttributeKey[]> = {
      "Offensive Skill": ["puckTracking"],
      "Defensive Reliability": ["positioning"],
      Skating: ["athleticism"],
      "Strength & Physicality": ["athleticism", "stamina"],
      "Hockey IQ": ["puckTracking", "mentalToughness"],
      "Special Teams": ["puckTracking", "positioning"],
      "Goalie Technique": ["reflexes", "positioning", "reboundControl"],
      Leadership: ["mentalToughness", "consistency"]
    };
    return goalie[focus];
  }
  const skater: Record<DevelopmentFocus, SkaterAttributeKey[]> = {
    "Offensive Skill": ["shooting", "passing", "puckHandling"],
    "Defensive Reliability": ["defense", "discipline", "hockeyIQ"],
    Skating: ["skating", "stamina"],
    "Strength & Physicality": ["physicality", "stamina"],
    "Hockey IQ": ["hockeyIQ", "consistency"],
    "Special Teams": ["passing", "discipline", "hockeyIQ"],
    "Goalie Technique": ["hockeyIQ"],
    Leadership: ["leadership", "consistency"]
  };
  return skater[focus];
}

function planNote(focus: DevelopmentFocus, intensity: DevelopmentIntensity): string {
  if (intensity === "Aggressive") return `${focus} focus with higher upside and real workload risk.`;
  if (intensity === "Light") return `${focus} focus with careful workload management.`;
  return `${focus} focus with balanced staff attention.`;
}

function formatAttribute(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase());
}
