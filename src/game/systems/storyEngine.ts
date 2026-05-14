import { TUNING } from "./tuning";
import type { FranchiseState, NewsItem, NewsType } from "../types";

export interface StoryEventInput {
  id: string;
  type: NewsType;
  date: string;
  headline: string;
  body: string;
  severity?: NewsItem["severity"];
  teamId?: string;
  playerId?: string;
}

export function createStoryEvent(input: StoryEventInput): NewsItem {
  return {
    id: input.id,
    type: input.type,
    date: input.date,
    headline: input.headline,
    body: input.body,
    severity: input.severity ?? "low",
    teamId: input.teamId,
    playerId: input.playerId
  };
}

export function dedupeNewsItems(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  const next: NewsItem[] = [];
  items.forEach((item) => {
    const key = `${item.type}|${item.teamId ?? ""}|${item.playerId ?? ""}|${item.headline}|${item.body}`;
    if (seen.has(key)) return;
    seen.add(key);
    next.push(item);
  });
  return next;
}

export function groupLowPriorityNews(items: NewsItem[], limit = TUNING.dynasty.groupedLowPriorityLimit): NewsItem[] {
  const low = items.filter((item) => item.severity === "low");
  if (low.length <= limit) return items;
  const retained = items.filter((item) => item.severity !== "low");
  const grouped = low.slice(0, limit - 1);
  const hidden = low.length - grouped.length;
  return [
    ...retained,
    ...grouped,
    {
      id: `grouped-low-news-${low[0]?.date ?? new Date().toISOString().slice(0, 10)}-${hidden}`,
      type: "media",
      date: low[0]?.date ?? new Date().toISOString().slice(0, 10),
      headline: "Operations Brief: Minor notes grouped",
      body: `${hidden} low-priority update${hidden === 1 ? "" : "s"} were grouped to keep the inbox readable.`,
      severity: "low"
    }
  ];
}

export function capNewsItems(items: NewsItem[], limit = TUNING.dynasty.inboxLimit): NewsItem[] {
  return groupLowPriorityNews(dedupeNewsItems(items)).slice(0, limit);
}

export function createPhaseTransitionNews(franchise: FranchiseState, fromPhase: string, toPhase: string): NewsItem[] {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId);
  const label = toPhase.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase());
  const type: NewsType =
    toPhase === "draft"
      ? "draft"
      : toPhase === "freeAgency"
        ? "freeAgency"
        : toPhase === "trainingCamp"
          ? "trainingCamp"
          : "history";
  return [
    createStoryEvent({
      id: `phase-story-${franchise.league.seasonYear}-${fromPhase}-${toPhase}`,
      type,
      date: franchise.league.currentDate,
      headline: `League Desk: ${label} opens`,
      body: `${team?.fullName ?? "Your club"} move from ${fromPhase} into ${label}. The next decisions now shape the dynasty file.`,
      severity: ["draft", "freeAgency", "trainingCamp"].includes(toPhase) ? "medium" : "low",
      teamId: team?.id
    })
  ];
}

export function createMilestoneNews(franchise: FranchiseState, milestone: "champion" | "draftSteal" | "freeAgent" | "staffHire" | "ownerPressure" | "retirement"): NewsItem[] {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId);
  const champion = franchise.playoffState?.championTeamId
    ? franchise.league.teams.find((candidate) => candidate.id === franchise.playoffState?.championTeamId)
    : undefined;
  const templates: Record<typeof milestone, StoryEventInput> = {
    champion: {
      id: `story-champion-${franchise.league.seasonYear}-${champion?.id ?? "none"}`,
      type: "playoffs",
      date: franchise.league.currentDate,
      headline: champion ? `Trophy Hall: ${champion.fullName} own the last word` : "Trophy Hall: Champion watch continues",
      body: champion
        ? `${champion.fullName} finish the bracket with a banner moment built entirely inside the fictional league.`
        : "The bracket still needs a champion before the offseason story can close.",
      severity: champion ? "high" : "medium",
      teamId: champion?.id
    },
    draftSteal: {
      id: `story-draft-steal-${franchise.league.seasonYear}-${team?.id ?? "team"}`,
      type: "draft",
      date: franchise.league.currentDate,
      headline: "Draft Column: One table thinks it found value",
      body: "Scouts are already arguing about which mid-round card will make the room look clever in two years.",
      severity: "low",
      teamId: team?.id
    },
    freeAgent: {
      id: `story-fa-rumor-${franchise.league.seasonYear}-${team?.id ?? "team"}`,
      type: "freeAgency",
      date: franchise.league.currentDate,
      headline: "Free Agency Wire: Agents test the room",
      body: "The market is moving in waves rather than one loud stampede, leaving value for patient teams.",
      severity: "low",
      teamId: team?.id
    },
    staffHire: {
      id: `story-staff-${franchise.league.seasonYear}-${team?.id ?? "team"}`,
      type: "staff",
      date: franchise.league.currentDate,
      headline: "Staff Notebook: Back-room voices matter",
      body: "One staff change can tilt scouting reads, development plans, recovery, or negotiation confidence just enough to matter.",
      severity: "low",
      teamId: team?.id
    },
    ownerPressure: {
      id: `story-owner-pressure-${franchise.league.seasonYear}-${team?.id ?? "team"}`,
      type: "owner",
      date: franchise.league.currentDate,
      headline: "Owner's Suite: Patience has a scoreboard",
      body: "Goal progress is shaping the tone upstairs, but the prototype lets the dynasty continue through pressure.",
      severity: franchise.ownerState.jobSecurity < 40 ? "high" : "medium",
      teamId: team?.id
    },
    retirement: {
      id: `story-retirement-${franchise.league.seasonYear}-${team?.id ?? "team"}`,
      type: "retirement",
      date: franchise.league.currentDate,
      headline: "Veteran Tribute: The room changes quietly",
      body: "Every retirement moves a little responsibility to the next line of players.",
      severity: "low",
      teamId: team?.id
    }
  };
  return [createStoryEvent(templates[milestone])];
}
