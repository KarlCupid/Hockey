import { createDefaultDataPack } from "./dataPacks";
import { validateDynastyInvariants } from "./dynastyInvariants";
import { createPlayerMeeting } from "./playerMeetings";
import { createPressConference } from "./pressConferences";
import { mergeDecisionEvents } from "./decisionEvents";
import { updateAchievementProgress } from "./achievements";
import { generateAssistantGmReport } from "./assistantGm";
import { createFranchise } from "../generators/generateLeague";
import type { DataPack, FranchiseState } from "../types";

export function createDemoFranchise(): FranchiseState {
  const base = createFranchise("harbor-city", {
    seed: "phase11-demo-franchise",
    gmName: "Beta Desk",
    gameMode: "sandbox",
    difficulty: "relaxed",
    storyFrequency: "normal",
    startPreset: "balanced"
  });
  const selectedTeam = base.league.teams.find((team) => team.id === base.selectedTeamId) ?? base.league.teams[0];
  const player = selectedTeam.roster.find((candidate) => candidate.roleExpectation === "Top Six") ?? selectedTeam.roster[0];
  const prospect = base.scouting.draftClass[0];
  const withEvents = mergeDecisionEvents(base, [
    createPressConference(base, { topic: "A calm first media availability before the beta opening game." }),
    player ? createPlayerMeeting(base, player.id, { reason: "A mild roster-role conversation for the demo save." }) : undefined
  ].filter(Boolean) as ReturnType<typeof createPressConference>[]);
  const withScouting = {
    ...withEvents,
    scouting: {
      ...withEvents.scouting,
      watchlist: prospect ? [prospect.id, ...withEvents.scouting.watchlist.filter((id) => id !== prospect.id)] : withEvents.scouting.watchlist
    },
    inbox: [
      {
        id: "phase11-demo-scouting-note",
        type: "scouting" as const,
        date: withEvents.league.currentDate,
        headline: "Assistant GM: Keep one eye on the top prospect",
        body: prospect ? `${prospect.displayName} is already on the demo watchlist so the scouting loop has something immediate to inspect.` : "The demo starts with scouting context ready for review.",
        severity: "low" as const,
        teamId: withEvents.selectedTeamId
      },
      ...withEvents.inbox
    ].slice(0, 60)
  };
  const withAchievementProgress = updateAchievementProgress(withScouting, "dynasty-builder", 2);
  const withAssistantReport = {
    ...withAchievementProgress,
    assistantGmReports: [
      generateAssistantGmReport(withAchievementProgress, { type: "daily", date: withAchievementProgress.league.currentDate }),
      ...withAchievementProgress.assistantGmReports
    ].slice(0, 20),
    saveStatus: "idle" as const,
    updatedAt: withAchievementProgress.createdAt
  };
  return withAssistantReport;
}

export function createDemoDataPack(): DataPack {
  const pack = createDefaultDataPack();
  return {
    ...pack,
    id: "phase11-demo-fictional-pack",
    name: "Phase 11 Demo Fictional Pack",
    description: "A deterministic local-only fictional data pack used by the public beta demo entry point.",
    updatedAt: new Date().toISOString()
  };
}

export function getDemoScenarioSummary(): string {
  return "A deterministic Harbor City sandbox with one upcoming game, Assistant GM guidance, a mild press/player decision, a scouting watchlist item, and near-progress on a local achievement.";
}

export function resetDemoFranchise(): FranchiseState {
  return createDemoFranchise();
}

export function validateDemoFranchise(franchise = createDemoFranchise()) {
  return validateDynastyInvariants(franchise);
}
