import { SeededRng, clamp } from "../rng";
import type { DecisionEvent, FranchiseState, NewsItem, Player, StoryArc, StoryArcType, Team } from "../types";
import { getAffiliatePromotionCandidates } from "./affiliate";
import { getPlayerRelationship, getTeamDynamics } from "./relationships";
import { getPlayerRosterStatus } from "./rosterRules";

const STORY_CAP = 24;

export function detectStoryArcTriggers(franchise: FranchiseState, rng = new SeededRng(`${franchise.franchiseId}-story-triggers`)): StoryArc[] {
  const team = selectedTeam(franchise);
  const activeKeys = new Set((franchise.storyArcs ?? []).filter((arc) => arc.status === "active" || arc.status === "cooldown").map(storyKey));
  const arcs: StoryArc[] = [];
  const push = (arc: StoryArc) => {
    if (!activeKeys.has(storyKey(arc))) arcs.push(arc);
  };

  const starter = team.lines.goalies.starter ? team.roster.find((player) => player.id === team.lines.goalies.starter) : undefined;
  const backup = team.lines.goalies.backup ? team.roster.find((player) => player.id === team.lines.goalies.backup) : undefined;
  if (starter && backup && starter.form <= 42 && backup.form >= 64) {
    push(createArc(franchise, "goalieControversy", [starter.id, backup.id], "Goalie controversy is building", `${starter.displayName}'s cold run and ${backup.displayName}'s form are turning crease management into a daily question.`, ["goalie", "media"], 62));
  }

  const star = team.roster.find((player) => player.overall >= 83 && getPlayerRelationship(franchise, player.id).roleSatisfaction <= 43);
  if (star) {
    push(createArc(franchise, "starRoleDemand", [star.id], `${star.displayName} wants a bigger role`, "A high-end player is looking for proof that the organization sees him the way he sees himself.", ["role", "trust"], 58));
  }

  const rookie = team.roster.find((player) => player.age <= 22 && (player.form >= 74 || player.stats.points >= Math.max(3, player.stats.gamesPlayed * 0.7)));
  if (rookie) {
    push(createArc(franchise, "rookieBreakout", [rookie.id], `${rookie.displayName} is forcing attention`, "The room likes the spark, but the market may run faster than the development plan.", ["rookie", "breakout"], 50));
  }

  const rumor = team.roster.find((player) => team.tradeBlock.includes(player.id) || player.morale <= 38);
  if (rumor) {
    push(createArc(franchise, "tradeRumor", [rumor.id], `${rumor.displayName} is in the rumor lane`, "Roster logic, agent pressure, and media speculation are starting to overlap.", ["trade", "media"], rumor.overall >= 82 ? 70 : 48));
  }

  const standoff = team.roster.find((player) => player.contract.yearsRemaining <= 1 && player.overall >= 81 && (player.morale <= 50 || getPlayerRelationship(franchise, player.id).trust <= 48));
  if (standoff) {
    push(createArc(franchise, "contractStandoff", [standoff.id], `${standoff.displayName}'s next deal is getting louder`, "The contract file now has agent leverage, role expectation, and market chatter attached.", ["contract", "agent"], 58));
  }

  const veteran = team.roster.find((player) => player.age >= 31 && player.overall >= 76 && team.record.streak.startsWith("L") && Number(team.record.streak.slice(1) || 0) >= 3);
  if (veteran) {
    push(createArc(franchise, "rebuildTension", [veteran.id], `${veteran.displayName} is watching the direction`, "A veteran on a losing team wants to know whether this is a push, a reset, or a holding pattern.", ["veteran", "direction"], 54));
  }

  if (franchise.seasonPhase === "playoffs") {
    push(createArc(franchise, "playoffPressure", [], "Playoff pressure is defining the week", "Every answer is louder in the bracket. The room, owner, and fans are reading the same scoreboard.", ["playoffs", "pressure"], 70));
  }

  const dynamics = getTeamDynamics(franchise, team.id);
  const hotRival = Object.entries(dynamics.rivalryHeatByTeamId).find(([, value]) => value >= 70);
  if (hotRival) {
    push(createArc(franchise, "rivalryEscalation", [], "Rivalry heat is climbing", "Recent nights have turned a normal matchup into an operations-room talking point.", ["rivalry"], hotRival[1]));
  }

  if (franchise.ownerState.jobSecurity <= 42) {
    push(createArc(franchise, "ownerPressure", [], "Owner pressure is becoming public", "Job security is low enough that every phase conversation carries a second meaning.", ["owner", "pressure"], 72));
  }

  if (dynamics.chemistry <= 38 && team.record.streak.startsWith("L")) {
    push(createArc(franchise, "lockerRoomSplit", team.roster.filter((player) => player.morale <= 45).slice(0, 3).map((player) => player.id), "The locker room needs a reset", "Low chemistry and losing have created different explanations inside the same room.", ["chemistry", "locker"], 66));
  }

  const promotion = getAffiliatePromotionCandidates(team)[0];
  if (promotion) {
    push(
      createArc(
        franchise,
        "prospectPromotion",
        [promotion.id],
        `${promotion.displayName} is pushing for a look`,
        `${promotion.displayName}'s affiliate work is creating promotion buzz inside the development office.`,
        ["prospect", "promotion"],
        46
      )
    );
  }

  return arcs.slice(0, 6);
}

export function updateStoryArcs(franchise: FranchiseState, rng = new SeededRng(`${franchise.franchiseId}-story-update-${franchise.league.currentDayIndex}`)): FranchiseState {
  const newArcs = detectStoryArcTriggers(franchise, rng);
  const existing = (franchise.storyArcs ?? []).map((arc) => {
    if (arc.status === "active") {
      const intensity = getStoryArcIntensity(franchise, arc);
      const progress = clamp(arc.progress + Math.max(3, Math.round(intensity / 18)));
      const status: StoryArc["status"] = progress >= 100 ? "cooldown" : "active";
      return {
        ...arc,
        intensity,
        progress,
        status,
        lastUpdatedDate: franchise.league.currentDate,
        resolution: status === "cooldown" ? "Storyline cooled after the organization addressed the pressure window." : arc.resolution
      };
    }
    if (arc.status === "cooldown") {
      const days = dayDistance(arc.lastUpdatedDate, franchise.league.currentDate);
      return days >= 14 ? { ...arc, status: "resolved" as const, resolution: arc.resolution ?? "The story moved out of the daily cycle." } : arc;
    }
    return arc;
  });
  const keys = new Set(existing.filter((arc) => arc.status === "active" || arc.status === "cooldown").map(storyKey));
  const additions = newArcs.filter((arc) => !keys.has(storyKey(arc)));
  const inbox = additions.flatMap(createStoryArcNews);
  return {
    ...franchise,
    storyArcs: [...additions, ...existing].slice(0, STORY_CAP),
    inbox: [...inbox, ...franchise.inbox].slice(0, 60),
    updatedAt: additions.length ? new Date().toISOString() : franchise.updatedAt
  };
}

export function resolveStoryArc(franchise: FranchiseState, storyArcId: string, resolution: string): FranchiseState {
  return {
    ...franchise,
    storyArcs: franchise.storyArcs.map((arc) =>
      arc.id === storyArcId ? { ...arc, status: "resolved", resolution, progress: 100, lastUpdatedDate: franchise.league.currentDate } : arc
    ),
    updatedAt: new Date().toISOString()
  };
}

export function getStoryArcIntensity(franchise: FranchiseState, storyArc: StoryArc): number {
  const team = findTeam(franchise, storyArc.teamId);
  const dynamics = getTeamDynamics(franchise, storyArc.teamId);
  const playerPressure = storyArc.playerIds.reduce((sum, playerId) => {
    const player = team.roster.find((candidate) => candidate.id === playerId);
    const relationship = getPlayerRelationship(franchise, playerId);
    return sum + (player ? Math.max(0, 62 - relationship.trust) * 0.3 + Math.max(0, 62 - relationship.roleSatisfaction) * 0.3 + Math.max(0, 50 - player.morale) * 0.2 : 0);
  }, 0);
  const base = storyArc.type === "playoffPressure" || storyArc.type === "ownerPressure" ? 68 : storyArc.intensity;
  const losing = team.record.streak.startsWith("L") ? Number(team.record.streak.slice(1) || 1) * 3 : 0;
  return clamp(Math.round(base * 0.58 + dynamics.mediaPressure * 0.14 + (100 - dynamics.chemistry) * 0.12 + playerPressure + losing));
}

export function createStoryArcNews(storyArc: StoryArc): NewsItem[] {
  return [
    {
      id: `story-arc-news-${storyArc.id}`,
      type:
        storyArc.type === "tradeRumor"
          ? "trade"
          : storyArc.type === "contractStandoff"
            ? "contract"
            : storyArc.type === "playoffPressure"
              ? "playoffs"
              : storyArc.type === "prospectPromotion" || storyArc.type === "rookieBreakout"
                ? "prospect"
                : "media",
      date: storyArc.startedDate,
      headline: `Storyline: ${storyArc.headline}`,
      body: storyArc.summary,
      severity: storyArc.intensity >= 72 ? "high" : storyArc.intensity >= 54 ? "medium" : "low",
      teamId: storyArc.teamId,
      playerId: storyArc.playerIds[0]
    }
  ];
}

export function createStoryArcDecisionEvent(franchise: FranchiseState, storyArc: StoryArc, rng = new SeededRng(`${storyArc.id}-decision`)): DecisionEvent | undefined {
  if (storyArc.status !== "active") return undefined;
  const room = roomForStory(storyArc.type);
  const type = decisionTypeForStory(storyArc.type);
  return {
    id: `decision-story-${storyArc.id}`,
    type,
    status: "active",
    severity: storyArc.intensity >= 82 ? "critical" : storyArc.intensity >= 64 ? "high" : "medium",
    createdDate: franchise.league.currentDate,
    expiresDate: addDays(franchise.league.currentDate, 8),
    phase: franchise.seasonPhase,
    teamId: storyArc.teamId,
    playerIds: storyArc.playerIds,
    relatedStoryArcId: storyArc.id,
    headline: storyArc.headline,
    body: storyArc.summary,
    sourceLabel: "Story Desk",
    locationRoom: room,
    tags: storyArc.tags,
    repeatKey: `story-event-${storyArc.id}`,
    options: [
      { id: "transparent", label: "Address it directly", tone: "transparent", description: "Speak clearly before the room or media sets the terms.", preview: "Trust +, media pressure -" },
      { id: "supportive", label: "Protect the people", tone: "supportive", description: "Back the player or group publicly.", preview: "Morale +, chemistry +" },
      { id: "firm", label: "Hold the standard", tone: "firm", description: "Keep the decision tied to team standards.", preview: "Owner/accountability +, trust mixed" }
    ]
  };
}

function createArc(franchise: FranchiseState, type: StoryArcType, playerIds: string[], headline: string, summary: string, tags: string[], intensity: number): StoryArc {
  return {
    id: `story-${type}-${franchise.selectedTeamId}-${playerIds.join("-") || franchise.league.seasonYear}`,
    type,
    status: "active",
    teamId: franchise.selectedTeamId,
    playerIds,
    startedDate: franchise.league.currentDate,
    lastUpdatedDate: franchise.league.currentDate,
    intensity: clamp(intensity),
    progress: Math.max(8, Math.round(intensity / 4)),
    headline,
    summary,
    recentEventIds: [],
    tags
  };
}

function storyKey(arc: StoryArc): string {
  return `${arc.type}:${arc.teamId}:${arc.playerIds.slice().sort().join(",")}`;
}

function roomForStory(type: StoryArcType) {
  if (type === "ownerPressure") return "ownerSuite";
  if (type === "contractStandoff") return "agents";
  if (type === "tradeRumor") return "trades";
  if (type === "prospectPromotion" || type === "rookieBreakout") return "playerMeetings";
  if (type === "lockerRoomSplit" || type === "starRoleDemand" || type === "rebuildTension") return "playerMeetings";
  return "press";
}

function decisionTypeForStory(type: StoryArcType): DecisionEvent["type"] {
  if (type === "ownerPressure") return "ownerMeeting";
  if (type === "contractStandoff") return "agentCall";
  if (type === "tradeRumor") return "tradeRumor";
  if (type === "lockerRoomSplit") return "lockerRoomIssue";
  if (type === "prospectPromotion" || type === "rookieBreakout") return "prospectBuzz";
  if (type === "goalieControversy") return "goalieControversy";
  if (type === "playoffPressure") return "playoffPressure";
  if (type === "rivalryEscalation") return "rivalryHeat";
  return "playerMeeting";
}

function selectedTeam(franchise: FranchiseState): Team {
  return findTeam(franchise, franchise.selectedTeamId);
}

function findTeam(franchise: FranchiseState, teamId: string): Team {
  const team = franchise.league.teams.find((candidate) => candidate.id === teamId);
  if (!team) throw new Error(`Team not found: ${teamId}`);
  return team;
}

function dayDistance(fromDate: string, toDate: string): number {
  return Math.round((Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86_400_000);
}

function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}
