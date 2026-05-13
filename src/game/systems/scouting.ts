import { SeededRng, clamp } from "../rng";
import type {
  DraftBoardStrategy,
  LeagueState,
  NewsItem,
  Prospect,
  ScoutingAssignment,
  ScoutingPriority,
  ScoutingRegion,
  ScoutingState,
  StaffState
} from "../types";
import { calculateTeamStaffModifiers } from "./staff";

export interface VisibleProspectReport {
  id: string;
  displayName: string;
  age: number;
  position: Prospect["position"];
  handedness: Prospect["handedness"];
  nationality: string;
  archetype: Prospect["archetype"];
  league: string;
  publicRank: number;
  projectedRound: number;
  risk: Prospect["risk"];
  personality: Prospect["personality"];
  strengths: string[];
  weaknesses: string[];
  combineScore: number;
  scouting: Prospect["scouting"];
  projectionSummary: string;
}

export interface ScoutingTickResult {
  state: ScoutingState;
  news: NewsItem[];
}

const REGIONS: ScoutingRegion[] = ["Domestic", "Nordic", "Central Europe", "Eastern Europe", "US College", "Junior"];
const DEFAULT_PRIORITIES: ScoutingPriority[] = ["Balanced", "High Upside", "Safe Picks"];

export function generateScoutingAssignments(): ScoutingAssignment[] {
  return DEFAULT_PRIORITIES.map((priority, index) => ({
    id: `scout-${index + 1}`,
    region: REGIONS[index],
    priority,
    progress: 0,
    active: true
  }));
}

export function tickScouting(
  state: ScoutingState,
  league: LeagueState,
  dayIndex: number,
  rng: SeededRng,
  staffState?: StaffState,
  teamId?: string
): ScoutingTickResult {
  const news: NewsItem[] = [];
  let draftClass = state.draftClass;
  const assignments = state.assignments.map((assignment) => {
    if (!assignment.active) return assignment;
    const progress = clamp(assignment.progress + rng.int(22, 36), 0, 100);
    const shouldReport = progress >= 100 || assignment.assignedProspectId;
    if (!shouldReport) return { ...assignment, progress };

    const target = selectTargetProspect(draftClass, assignment, rng);
    if (!target) return { ...assignment, progress };
    const before = target.scouting.certainty;
    const staffModifier = calculateTeamStaffModifiers(staffState, teamId ?? league.teams[0]?.id ?? "").scouting;
    const scouted = scoutProspect(target, assignment, rng, dayIndex, staffModifier);
    draftClass = draftClass.map((prospect) => (prospect.id === target.id ? scouted : prospect));

    if (scouted.scouting.certainty > before && news.length < 3) {
      news.push(createScoutingNews(scouted, league.currentDate, league.teams[0]?.id));
    }

    return {
      ...assignment,
      progress: progress >= 100 ? progress - 100 : progress
    };
  });

  return {
    state: {
      ...state,
      draftClass,
      assignments,
      lastScoutingTickDayIndex: dayIndex
    },
    news
  };
}

export function scoutProspect(prospect: Prospect, assignment: ScoutingAssignment, rng: SeededRng, dayIndex?: number, staffModifier = 0): Prospect {
  const priorityBonus = priorityMatchesProspect(assignment.priority, prospect) ? 7 : 3;
  const amount = rng.int(7, 14) + priorityBonus + Math.max(0, Math.round(staffModifier * 1.5));
  const updated = updateProspectCertainty(prospect, amount, dayIndex);
  const note = createScoutNote(updated, assignment.priority, rng);
  return {
    ...updated,
    scouting: {
      ...updated.scouting,
      viewings: updated.scouting.viewings + 1,
      scoutNotes: [note, ...updated.scouting.scoutNotes].slice(0, 5)
    }
  };
}

export function updateProspectCertainty(prospect: Prospect, amount: number, dayIndex?: number): Prospect {
  const certainty = clamp(prospect.scouting.certainty + amount, 0, 100);
  const spread = Math.max(2, Math.round((100 - certainty) / 10));
  return {
    ...prospect,
    scouting: {
      ...prospect.scouting,
      certainty,
      estimatedOverallLow: clamp(prospect.actualOverall - spread - 1, 40, 99),
      estimatedOverallHigh: clamp(prospect.actualOverall + spread, 40, 99),
      estimatedPotentialLow: clamp(prospect.actualPotential - spread - 2, 40, 99),
      estimatedPotentialHigh: clamp(prospect.actualPotential + spread + 1, 40, 99),
      lastUpdatedDayIndex: dayIndex
    }
  };
}

export function getVisibleProspectReport(prospect: Prospect): VisibleProspectReport {
  const certainty = prospect.scouting.certainty;
  const ceiling =
    prospect.scouting.estimatedPotentialHigh >= 88
      ? "top-of-board upside"
      : prospect.scouting.estimatedPotentialHigh >= 82
        ? "middle-six or second-pair upside"
        : "depth projection";
  return {
    id: prospect.id,
    displayName: prospect.displayName,
    age: prospect.age,
    position: prospect.position,
    handedness: prospect.handedness,
    nationality: prospect.nationality,
    archetype: prospect.archetype,
    league: prospect.league,
    publicRank: prospect.publicRank,
    projectedRound: prospect.projectedRound,
    risk: prospect.risk,
    personality: prospect.personality,
    strengths: prospect.strengths,
    weaknesses: prospect.weaknesses,
    combineScore: prospect.combineScore,
    scouting: prospect.scouting,
    projectionSummary: `${certainty}% certainty with ${ceiling}.`
  };
}

export function rankDraftBoard(prospects: Prospect[], strategy: DraftBoardStrategy): string[] {
  return [...prospects]
    .sort((a, b) => scoreProspectForStrategy(b, strategy) - scoreProspectForStrategy(a, strategy) || a.publicRank - b.publicRank)
    .map((prospect) => prospect.id);
}

export function toggleWatchlist(state: ScoutingState, prospectId: string): ScoutingState {
  const exists = state.watchlist.includes(prospectId);
  return {
    ...state,
    watchlist: exists ? state.watchlist.filter((id) => id !== prospectId) : [...state.watchlist, prospectId]
  };
}

export function moveProspectOnBoard(state: ScoutingState, prospectId: string, direction: "up" | "down"): ScoutingState {
  const board = state.teamDraftBoard.length ? [...state.teamDraftBoard] : state.draftClass.map((prospect) => prospect.id);
  const index = board.indexOf(prospectId);
  if (index < 0) return { ...state, teamDraftBoard: board };
  const targetIndex = direction === "up" ? Math.max(0, index - 1) : Math.min(board.length - 1, index + 1);
  const [item] = board.splice(index, 1);
  board.splice(targetIndex, 0, item);
  return { ...state, teamDraftBoard: board };
}

export function updateScoutingAssignment(
  state: ScoutingState,
  assignmentId: string,
  patch: Partial<Pick<ScoutingAssignment, "region" | "priority" | "assignedProspectId" | "active">>
): ScoutingState {
  return {
    ...state,
    assignments: state.assignments.map((assignment) => (assignment.id === assignmentId ? { ...assignment, ...patch } : assignment))
  };
}

function selectTargetProspect(prospects: Prospect[], assignment: ScoutingAssignment, rng: SeededRng): Prospect | undefined {
  if (assignment.assignedProspectId) return prospects.find((prospect) => prospect.id === assignment.assignedProspectId);
  const candidates = prospects.filter((prospect) => priorityMatchesProspect(assignment.priority, prospect));
  const pool = candidates.length ? candidates : prospects;
  return rng.weighted(pool, (prospect) => Math.max(1, 76 - prospect.publicRank + (100 - prospect.scouting.certainty) * 0.25));
}

function priorityMatchesProspect(priority: ScoutingPriority, prospect: Prospect): boolean {
  if (priority === "Goalies") return prospect.position === "G";
  if (priority === "Defense") return prospect.position === "LD" || prospect.position === "RD";
  if (priority === "Forwards") return ["LW", "C", "RW"].includes(prospect.position);
  if (priority === "High Upside") return prospect.scouting.estimatedPotentialHigh >= 84 || prospect.risk === "Boom/Bust";
  if (priority === "Safe Picks") return prospect.risk === "Low" || prospect.scouting.certainty >= 55;
  return true;
}

function scoreProspectForStrategy(prospect: Prospect, strategy: DraftBoardStrategy): number {
  const midpointOverall = (prospect.scouting.estimatedOverallLow + prospect.scouting.estimatedOverallHigh) / 2;
  const midpointPotential = (prospect.scouting.estimatedPotentialLow + prospect.scouting.estimatedPotentialHigh) / 2;
  const certainty = prospect.scouting.certainty * 0.12;
  const rankBonus = Math.max(0, 75 - prospect.publicRank) * 0.16;
  if (strategy === "High Upside") return midpointPotential * 1.2 + (prospect.risk === "Boom/Bust" ? 6 : 0) + rankBonus;
  if (strategy === "Safe Floor") return midpointOverall + certainty + (prospect.risk === "Low" ? 8 : -4);
  if (strategy === "Need: Forwards") return midpointPotential + (["LW", "C", "RW"].includes(prospect.position) ? 10 : 0);
  if (strategy === "Need: Defense") return midpointPotential + (prospect.position === "LD" || prospect.position === "RD" ? 10 : 0);
  if (strategy === "Need: Goalies") return midpointPotential + (prospect.position === "G" ? 16 : 0);
  return midpointPotential + midpointOverall * 0.55 + certainty + rankBonus;
}

function createScoutNote(prospect: Prospect, priority: ScoutingPriority, rng: SeededRng): string {
  if (prospect.risk === "Boom/Bust") return `${priority} view: upside is obvious, but the range remains wide.`;
  if (prospect.scouting.certainty >= 75) return `${priority} view: report is firming up after repeated looks.`;
  if (prospect.position === "G") return "Goalie track remains volatile; staff want more live viewings.";
  return rng.pick([
    "Staff like the habits away from the puck.",
    "Projection depends on pace translating against older competition.",
    "The interview read was steady and coachable.",
    "Late-round value flag added after a stronger viewing."
  ]);
}

function createScoutingNews(prospect: Prospect, date: string, teamId?: string): NewsItem {
  const highEnd = prospect.scouting.estimatedPotentialHigh >= 86;
  return {
    id: `scouting-${prospect.id}-${prospect.scouting.viewings}-${prospect.scouting.certainty}`,
    type: "scouting",
    date,
    headline: highEnd
      ? `Scouting Desk: ${prospect.displayName} keeps flashing upside`
      : `Scouting Desk: Report tightened on ${prospect.displayName}`,
    body: `${prospect.position} prospect now sits at ${prospect.scouting.certainty}% certainty with a projected Round ${prospect.projectedRound} range.`,
    severity: highEnd ? "medium" : "low",
    teamId
  };
}
