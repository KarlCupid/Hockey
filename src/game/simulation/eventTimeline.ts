import type { GameEvent } from "../types";

export function sortTimeline(events: GameEvent[]): GameEvent[] {
  return [...events].sort((a, b) => {
    if (a.period !== b.period) return a.period - b.period;
    return timeToSeconds(b.time) - timeToSeconds(a.time);
  });
}

export function clockFromMinute(minute: number): string {
  const remaining = Math.max(0, 20 * 60 - Math.floor(minute * 60));
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function timeToSeconds(time: string): number {
  const [minutes, seconds] = time.split(":").map(Number);
  return minutes * 60 + seconds;
}
