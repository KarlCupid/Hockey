import type { GameEvent, GameResult, Team } from "../types";

export type BroadcastEventChip = "Goal" | "Save" | "Penalty" | "Injury" | "Momentum" | "Final";

export interface BroadcastLiveState {
  awayScore: number;
  homeScore: number;
  periodLabel: string;
  timeLabel: string;
  chip: BroadcastEventChip;
  banner: string;
  accentColor: string;
}

export function getBroadcastLiveState(result: GameResult, awayTeam: Team, homeTeam: Team, processedEvents: number): BroadcastLiveState {
  const events = result.eventTimeline.slice(0, Math.max(0, processedEvents));
  const current = result.eventTimeline[Math.min(Math.max(0, processedEvents - 1), result.eventTimeline.length - 1)];
  const done = processedEvents >= result.eventTimeline.length;
  const score = events.reduce(
    (total, event) => {
      if (event.type !== "goal" && event.type !== "powerPlayGoal") return total;
      if (event.teamId === awayTeam.id) return { ...total, away: total.away + 1 };
      if (event.teamId === homeTeam.id) return { ...total, home: total.home + 1 };
      return total;
    },
    { away: 0, home: 0 }
  );
  const eventTeamId = current && "teamId" in current ? current.teamId : undefined;
  const eventTeam = eventTeamId === awayTeam.id ? awayTeam : eventTeamId === homeTeam.id ? homeTeam : undefined;

  return {
    awayScore: done ? result.finalScore.away : score.away,
    homeScore: done ? result.finalScore.home : score.home,
    periodLabel: done || !current ? "Final" : current.period === 4 ? "OT" : `P${current.period}`,
    timeLabel: done || !current ? "0:00" : current.time,
    chip: done ? "Final" : eventChip(current),
    banner: done ? "FINAL" : eventBanner(current, eventTeam),
    accentColor: eventTeam?.primaryColor ?? "#61c9ff"
  };
}

export function eventChip(event?: GameEvent): BroadcastEventChip {
  if (!event) return "Momentum";
  if (event.type === "goal" || event.type === "powerPlayGoal") return "Goal";
  if (event.type === "save" || event.type === "goalieHighlight" || event.type === "shot") return "Save";
  if (event.type === "penalty" || event.type === "powerPlayStart") return "Penalty";
  if (event.type === "injury") return "Injury";
  return "Momentum";
}

function eventBanner(event: GameEvent, team?: Team): string {
  if (event.type === "goal" || event.type === "powerPlayGoal") return `GOAL ${team?.abbreviation ?? ""}`.trim();
  if (event.type === "penalty" || event.type === "powerPlayStart") return "PENALTY";
  if (event.type === "injury") return "MEDICAL ALERT";
  if (event.type === "save" || event.type === "goalieHighlight") return "BIG SAVE";
  return "LIVE";
}
