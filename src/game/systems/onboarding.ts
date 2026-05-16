import type { AssistantGmReport, FranchiseState, RoomId } from "../types";
import { getGuideTopics } from "./guide";
import { getNextBestAction } from "./actionQueue";

export interface OnboardingChecklistStep {
  id: string;
  label: string;
  roomId: RoomId;
  completed: boolean;
  helperText: string;
}

export interface OnboardingChecklist {
  id: string;
  title: string;
  available: boolean;
  steps: OnboardingChecklistStep[];
}

export function getFirstHourChecklist(franchise: FranchiseState): OnboardingChecklist {
  const completedTutorial = new Set(franchise.tutorialState.completedStepIds);
  const hasResult = Boolean(franchise.lastResult);
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId);
  return {
    id: "first-hour",
    title: "First Hour Checklist",
    available: true,
    steps: [
      step("open-gm", "Open the GM Office and read the day", "gm", completedTutorial.has("open-gm-office"), "Start with inbox, owner pressure, and Assistant GM guidance."),
      step("check-roster", "Check roster health", "roster", completedTutorial.has("open-roster-office"), "Make sure the active group can play before game day."),
      step("set-lines", "Set lines and goalie", "coach", completedTutorial.has("open-coach-office"), "Confirm the top line, special teams, and starter."),
      step("sim-game", "Sim one game", "arena", hasResult, "Use instant, period, or broadcast mode to create the first result."),
      step("read-result", "Read what changed after the game", "arena", hasResult, "Review three stars, fatigue, morale, and the next recommendation."),
      step("save-locally", "Save or verify autosave", "saves", franchise.saveStatus === "saved", "Manual saves and autosaves stay local to this device."),
      step("check-standings", "Check standings context", "standings", Boolean(team && team.stats.gamesPlayed > 0), "See how the result moved the table.")
    ]
  };
}

export function getAfterFirstGameChecklist(franchise: FranchiseState): OnboardingChecklist {
  const hasResult = Boolean(franchise.lastResult);
  return {
    id: "after-first-game",
    title: "After Your First Game",
    available: hasResult,
    steps: [
      step("read-story", "Read the game story", "arena", hasResult, "Look for why the score happened, not just the score."),
      step("check-fatigue", "Check fatigue and injuries", "medical", Boolean(franchise.lastResult?.fatigueChanges.length || franchise.lastResult?.injuries.length), "Watch for workload spikes before the next sim."),
      step("review-room", "Review morale and form", "locker", Boolean(franchise.lastResult?.moraleChanges.length), "Post-game mood can shape meetings and lineup choices."),
      step("next-action", "Follow one recommended action", "gm", Boolean(getNextBestAction(franchise)), "The game should always offer one clean next step.")
    ]
  };
}

export function getBeforeOffseasonChecklist(franchise: FranchiseState): OnboardingChecklist {
  const available = ["seasonReview", "retirements", "draftLottery", "draft", "reSigning", "freeAgency", "staffHiring"].includes(franchise.seasonPhase);
  return {
    id: "before-offseason",
    title: "Before Offseason",
    available,
    steps: [
      step("owner-goals", "Review owner goals", "ownerSuite", franchise.ownerState.seasonGoals.some((goal) => goal.status !== "active"), "Know what ownership thinks before contracts and draft work."),
      step("expiring", "Review expiring contracts", "contracts", false, "Identify core players, useful depth, and cap pressure."),
      step("draft-board", "Review draft board", "scouting", franchise.scouting.watchlist.length > 0, "Shortlist prospects before picks arrive."),
      step("development", "Review development plans", "development", franchise.development.plans.length > 0, "Set growth priorities before the new season.")
    ]
  };
}

export function getCustomLeagueFirstStartChecklist(franchise: FranchiseState): OnboardingChecklist {
  return {
    id: "custom-league-first-start",
    title: "Custom League First Start",
    available: Boolean(franchise.customLeagueName || franchise.dataPackMetadata),
    steps: [
      step("rules", "Confirm rule labels", "settings", Boolean(franchise.league.ruleSet.label), "Check schedule, playoffs, draft, and roster limits."),
      step("team-identity", "Review team identity", "gm", Boolean(franchise.customLeagueName), "Make sure fictional names and colors read clearly."),
      step("save-pack", "Export a safety save", "saves", franchise.saveStatus === "saved", "Keep a local checkpoint before long playtests.")
    ]
  };
}

export function validateOnboardingChecklist(checklist: OnboardingChecklist): string[] {
  const issues: string[] = [];
  if (!checklist.id.trim()) issues.push("Checklist is missing an id.");
  if (!checklist.title.trim()) issues.push("Checklist is missing a title.");
  if (!checklist.steps.length) issues.push(`${checklist.id} has no steps.`);
  checklist.steps.forEach((item) => {
    if (!item.id.trim()) issues.push(`${checklist.id} has a step without an id.`);
    if (!item.label.trim()) issues.push(`${checklist.id}:${item.id} is missing a label.`);
    if (!item.helperText.trim()) issues.push(`${checklist.id}:${item.id} is missing helper text.`);
  });
  return issues;
}

export function tutorialSkipKeepsGuideAvailable(franchise: FranchiseState): boolean {
  return franchise.tutorialState.mode === "off" && getGuideTopics().length > 0;
}

export function createFirstHourAssistantGmReport(franchise: FranchiseState): AssistantGmReport {
  const checklist = getFirstHourChecklist(franchise);
  const nextIncomplete = checklist.steps.find((item) => !item.completed) ?? checklist.steps[checklist.steps.length - 1];
  return {
    id: `agm-first-hour-${franchise.franchiseId}`,
    date: franchise.league.currentDate,
    type: "daily",
    headline: "First-hour plan is ready",
    summary: "The fastest way into the dynasty loop is roster check, lines, one sim, result review, then save.",
    recommendations: [
      {
        id: "first-hour-next-step",
        category: nextIncomplete.roomId === "roster" ? "roster" : nextIncomplete.roomId === "coach" ? "lineup" : "phase",
        priority: nextIncomplete.roomId === "arena" ? "high" : "medium",
        title: nextIncomplete.label,
        body: nextIncomplete.helperText,
        actionLabel: `Open ${nextIncomplete.roomId === "gm" ? "GM Office" : nextIncomplete.roomId}`,
        targetRoomId: nextIncomplete.roomId,
        estimatedImpact: "medium"
      }
    ],
    riskFlags: [],
    opportunityFlags: ["First-hour checklist is available from GM Office and Help."],
    linkedRoomIds: Array.from(new Set(checklist.steps.map((item) => item.roomId))).slice(0, 5)
  };
}

function step(id: string, label: string, roomId: RoomId, completed: boolean, helperText: string): OnboardingChecklistStep {
  return { id, label, roomId, completed, helperText };
}
