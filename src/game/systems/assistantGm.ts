import { calculateCapSpace, formatMoney, getCapWarnings, getExpiringContracts } from "./contracts";
import { getAffiliatePromotionCandidates } from "./affiliate";
import { validateRosterForGame } from "./rosterRules";
import { DEFAULT_FACILITY_BLUEPRINT } from "../facility/facilityBlueprint";
import { getBreadcrumbForRoom, getRoomEntrancePrompt } from "../facility/facilityWayfinding";
import { getDistrictForRoom, getRoomDefinition } from "../facility/facilityNavigation";
import type { AssistantGmRecommendation, AssistantGmReport, FranchiseState, Player, RoomId } from "../types";

export interface AssistantGmReportContext {
  type?: AssistantGmReport["type"];
  date?: string;
}

export function generateAssistantGmReport(franchise: FranchiseState, context: AssistantGmReportContext = {}): AssistantGmReport {
  const recommendations = [
    ...generatePhaseRecommendations(franchise),
    ...generateRosterRecommendations(franchise),
    ...generateLineupRecommendations(franchise),
    ...generateContractRecommendations(franchise),
    ...generateTradeRecommendations(franchise),
    ...generateScoutingRecommendations(franchise),
    ...generateDevelopmentRecommendations(franchise),
    ...generateStoryRecommendations(franchise),
    ...generateFreeAgencyRecommendations(franchise),
    ...generateStaffRecommendations(franchise)
  ].sort(prioritySort);

  const risks = recommendations.filter((item) => item.priority === "urgent" || item.priority === "high").map((item) => item.title).slice(0, 5);
  const opportunities = recommendations.filter((item) => item.priority === "medium" || item.priority === "low").map((item) => item.title).slice(0, 5);
  const linkedRoomIds = Array.from(new Set(recommendations.map((item) => item.targetRoomId).filter(Boolean))) as RoomId[];

  return {
    id: `assistant-${context.type ?? "weekly"}-${franchise.league.currentDate}-${recommendations.length}`,
    date: context.date ?? franchise.league.currentDate,
    type: context.type ?? "weekly",
    headline: recommendations.some((item) => item.priority === "urgent")
      ? "Assistant GM: urgent work on the board"
      : recommendations.length
        ? "Assistant GM: weekly hockey-ops read"
        : "Assistant GM: room is under control",
    summary: recommendations.length
      ? `${recommendations.length} recommendation${recommendations.length === 1 ? "" : "s"} across ${linkedRoomIds.length || 1} room${linkedRoomIds.length === 1 ? "" : "s"}. ${getAssistantGmTone(franchise)}`
      : `No urgent action needed. ${getAssistantGmTone(franchise)}`,
    recommendations: recommendations.slice(0, helpLimit(franchise)),
    riskFlags: risks,
    opportunityFlags: opportunities,
    linkedRoomIds
  };
}

export function generateDailyRecommendations(franchise: FranchiseState): AssistantGmRecommendation[] {
  return [...generateRosterRecommendations(franchise), ...generateStoryRecommendations(franchise)].sort(prioritySort).slice(0, 6);
}

export function generateWeeklyRecommendations(franchise: FranchiseState): AssistantGmRecommendation[] {
  return generateAssistantGmReport(franchise, { type: "weekly" }).recommendations;
}

export function generatePhaseRecommendations(franchise: FranchiseState): AssistantGmRecommendation[] {
  const recommendations: AssistantGmRecommendation[] = [];
  if (franchise.seasonPhase === "draft" && franchise.offseasonState?.draftState?.userPickPending) {
    recommendations.push(recommendation("phase-draft-pick", "phase", "urgent", "Draft pick is on the clock", "The room is waiting for your selection. Open the draft board before advancing.", "Open Draft Board", "scouting", "large"));
  }
  if (franchise.seasonPhase === "freeAgency" && franchise.freeAgencyState && !franchise.freeAgencyState.completed) {
    recommendations.push(recommendation("phase-free-agency", "freeAgency", "medium", "Free agency window is active", "Review the market for one useful fit before the day advances.", "Open Free Agency", "freeAgency", "medium"));
  }
  if (franchise.seasonPhase === "reSigning") {
    recommendations.push(recommendation("phase-resign", "contract", "medium", "Re-signing decisions are live", "Sort the expiring list before depth pieces distract from the core.", "Open Contract Office", "contracts", "medium"));
  }
  return recommendations;
}

export function generateRosterRecommendations(franchise: FranchiseState): AssistantGmRecommendation[] {
  const team = selectedTeam(franchise);
  if (!team) return [];
  const report = validateRosterForGame(team);
  const recommendations: AssistantGmRecommendation[] = [];
  if (report.errors.length) {
    recommendations.push(
      recommendation("roster-invalid", "roster", "urgent", "Roster is not game-ready", report.errors[0], "Fix Roster", "roster", "large")
    );
  }
  if (report.capSpace < 0) {
    recommendations.push(
      recommendation("roster-cap-over", "cap", "urgent", "Active cap is over the ceiling", `${team.fullName} need ${formatMoney(Math.abs(report.capSpace))} in relief.`, "Review Cap", "contracts", "large")
    );
  } else if (report.capSpace <= 3_000_000) {
    recommendations.push(
      recommendation("roster-cap-tight", "cap", "medium", "Cap room is tight", `${team.fullName} have ${formatMoney(report.capSpace)} in active cap room.`, "Review Cap", "contracts", "medium")
    );
  }
  const weakPosition = weakestPosition(team.roster);
  if (weakPosition) {
    recommendations.push(
      recommendation("roster-depth", "roster", "medium", `${weakPosition} depth is thin`, "One injury could force a rushed call-up or staff workaround.", "Check Depth", "roster", "medium")
    );
  }
  const candidates = getAffiliatePromotionCandidates(team);
  if (candidates.length) {
    recommendations.push(
      recommendation(
        "roster-promotion",
        "roster",
        "medium",
        `${candidates[0].displayName} is pushing for a look`,
        "The affiliate report suggests a promotion conversation is reasonable.",
        "Review Affiliate",
        "roster",
        "medium",
        candidates[0].id
      )
    );
  }
  return recommendations;
}

export function generateLineupRecommendations(franchise: FranchiseState): AssistantGmRecommendation[] {
  const team = selectedTeam(franchise);
  if (!team) return [];
  const tiredGoalie = team.roster
    .filter((player) => player.position === "G" && player.rosterStatus !== "retired")
    .sort((a, b) => b.fatigue - a.fatigue)[0];
  if (tiredGoalie && tiredGoalie.fatigue >= 78) {
    return [
      recommendation(
        "lineup-tired-goalie",
        "lineup",
        "high",
        `${tiredGoalie.displayName} needs a crease check`,
        "Goalie fatigue is high enough to create performance and injury risk.",
        "Review Lines",
        "coach",
        "medium",
        tiredGoalie.id
      )
    ];
  }
  return [];
}

export function generateContractRecommendations(franchise: FranchiseState): AssistantGmRecommendation[] {
  const team = selectedTeam(franchise);
  if (!team) return [];
  const recommendations: AssistantGmRecommendation[] = [];
  const expiring = getExpiringContracts(team).filter((player) => player.overall >= 76);
  const star = expiring.find((player) => player.overall >= 84) ?? expiring[0];
  if (star) {
    recommendations.push(
      recommendation(
        "contract-expiring-star",
        "contract",
        star.overall >= 84 ? "high" : "medium",
        `${star.displayName} is entering contract pressure`,
        `${star.contractSummary} expires soon. Start the read before the agent controls the story.`,
        "Open Contract Office",
        "contracts",
        star.overall >= 84 ? "large" : "medium",
        star.id
      )
    );
  }
  for (const warning of getCapWarnings(team).slice(0, 1)) {
    recommendations.push(recommendation("contract-cap-warning", "cap", "medium", "Cap plan needs attention", warning, "Review Cap", "contracts", "medium"));
  }
  return recommendations;
}

export function generateTradeRecommendations(franchise: FranchiseState): AssistantGmRecommendation[] {
  const team = selectedTeam(franchise);
  if (!team || !team.tradeBlock.length) return [];
  return [
    recommendation(
      "trade-block-live",
      "trade",
      "low",
      "Trade block has useful signals",
      `${team.tradeBlock.length} player${team.tradeBlock.length === 1 ? "" : "s"} are marked as movable. Check whether the market helps a weak position.`,
      "Open War Room",
      "trades",
      "small"
    )
  ];
}

export function generateScoutingRecommendations(franchise: FranchiseState): AssistantGmRecommendation[] {
  const idle = franchise.scouting.assignments.filter((assignment) => !assignment.active).length;
  if (idle > 0) {
    return [
      recommendation("scouting-idle", "scouting", "medium", "Scouting assignment is idle", `${idle} assignment${idle === 1 ? "" : "s"} can be re-aimed before the board settles.`, "Open Scouting", "scouting", "medium")
    ];
  }
  if (!franchise.scouting.watchlist.length) {
    return [
      recommendation("scouting-watchlist", "scouting", "low", "Draft watchlist is empty", "Mark a few prospects so the draft room has an opinion before pressure arrives.", "Open Draft Board", "scouting", "small")
    ];
  }
  return [];
}

export function generateDevelopmentRecommendations(franchise: FranchiseState): AssistantGmRecommendation[] {
  const team = selectedTeam(franchise);
  if (!team) return [];
  const plannedIds = new Set(franchise.development.plans.map((plan) => plan.playerId));
  const candidate = team.roster
    .filter((player) => player.age <= 24 && player.potential >= 78 && !plannedIds.has(player.id) && player.rosterStatus !== "retired")
    .sort((a, b) => b.potential - a.potential)[0];
  if (!candidate) return [];
  return [
    recommendation(
      "development-missing-plan",
      "development",
      "medium",
      `${candidate.displayName} needs a development plan`,
      "A high-upside player is moving through the year without a clear focus.",
      "Open Development",
      "development",
      "medium",
      candidate.id
    )
  ];
}

export function generateStoryRecommendations(franchise: FranchiseState): AssistantGmRecommendation[] {
  const activeDecision = franchise.decisionEvents.find((event) => event.status === "active" && event.severity !== "low");
  const activeArc = franchise.storyArcs.find((arc) => arc.status === "active" && arc.intensity >= 55);
  const recommendations: AssistantGmRecommendation[] = [];
  if (activeDecision) {
    recommendations.push(
      recommendation(
        "story-active-decision",
        "story",
        activeDecision.severity === "critical" || activeDecision.severity === "high" ? "urgent" : "high",
        activeDecision.headline,
        "There is an active decision event that can shape the room before it expires.",
        "Resolve Decision",
        activeDecision.locationRoom ?? "gm",
        "large",
        activeDecision.playerIds?.[0],
        activeDecision.id
      )
    );
  }
  if (activeArc) {
    recommendations.push(
      recommendation("story-active-arc", "story", "medium", activeArc.headline, activeArc.summary, "Review Story Arc", "gm", "medium", activeArc.playerIds[0])
    );
  }
  return recommendations;
}

export function getAssistantGmTone(franchise: FranchiseState): string {
  const pressure = franchise.mediaState.pressure;
  const help = franchise.difficultyTuning.assistantGmHelpLevel;
  if (help === "minimal") return pressure >= 65 ? "I'll keep this blunt and focused." : "I'll stay out of the way unless something matters.";
  if (help === "detailed") return "I'll keep the board readable and explain the why behind each item.";
  return pressure >= 65 ? "Let's keep the room calm and handle the real risks first." : "Nothing here needs theater, just good sequencing.";
}

export function dismissAssistantGmReport(franchise: FranchiseState, reportId: string): FranchiseState {
  return {
    ...franchise,
    assistantGmReports: franchise.assistantGmReports.map((report) =>
      report.id === reportId ? { ...report, dismissed: true } : report
    )
  };
}

function generateFreeAgencyRecommendations(franchise: FranchiseState): AssistantGmRecommendation[] {
  const target = franchise.freeAgencyState?.market.find((candidate) => !candidate.signedByTeamId && candidate.player.overall >= 76);
  if (!target) return [];
  return [
    recommendation(
      "free-agency-target",
      "freeAgency",
      "medium",
      `${target.player.displayName} is available`,
      "There is a credible free-agent target still on the board.",
      "Open Free Agency",
      "freeAgency",
      "medium",
      target.player.id
    )
  ];
}

function generateStaffRecommendations(franchise: FranchiseState): AssistantGmRecommendation[] {
  const staff = franchise.staffState.teamStaff[franchise.selectedTeamId] ?? [];
  const hasAssistantGm = staff.some((member) => member.role === "Assistant GM");
  const hasHeadScout = staff.some((member) => member.role === "Head Scout");
  if (hasAssistantGm && hasHeadScout) return [];
  return [
    recommendation(
      "staff-vacancy",
      "staff",
      hasHeadScout ? "medium" : "high",
      "Staff desk has a vacancy",
      hasHeadScout ? "An Assistant GM can improve weekly guidance." : "A Head Scout vacancy will dull draft and prospect reads.",
      "Open Staff Office",
      "staff",
      "medium"
    )
  ];
}

function recommendation(
  id: string,
  category: AssistantGmRecommendation["category"],
  priority: AssistantGmRecommendation["priority"],
  title: string,
  body: string,
  actionLabel: string,
  targetRoomId: RoomId,
  estimatedImpact: AssistantGmRecommendation["estimatedImpact"],
  targetPlayerId?: string,
  relatedEventId?: string
): AssistantGmRecommendation {
  const district = getDistrictForRoom(DEFAULT_FACILITY_BLUEPRINT, targetRoomId);
  const room = getRoomDefinition(DEFAULT_FACILITY_BLUEPRINT, targetRoomId);
  return {
    id,
    category,
    priority,
    title,
    body,
    actionLabel,
    targetRoomId,
    targetDistrictLabel: district.label,
    navigationHint: `${getBreadcrumbForRoom(DEFAULT_FACILITY_BLUEPRINT, targetRoomId).join(" -> ")}. ${getRoomEntrancePrompt(room)} near ${district.landmarkLabel}.`,
    targetPlayerId,
    estimatedImpact,
    ...(relatedEventId ? { targetTeamId: relatedEventId } : {})
  };
}

function selectedTeam(franchise: FranchiseState) {
  return franchise.league.teams.find((team) => team.id === franchise.selectedTeamId);
}

function weakestPosition(roster: Player[]): string | undefined {
  const active = roster.filter((player) => player.rosterStatus === "active" || player.rosterStatus === "scratched");
  const counts = {
    LW: active.filter((player) => player.position === "LW").length,
    C: active.filter((player) => player.position === "C").length,
    RW: active.filter((player) => player.position === "RW").length,
    D: active.filter((player) => player.position === "LD" || player.position === "RD").length,
    G: active.filter((player) => player.position === "G").length
  };
  if (counts.G < 2) return "Goalie";
  if (counts.D < 6) return "Defense";
  if (counts.C < 4) return "Center";
  if (counts.LW < 4) return "Left wing";
  if (counts.RW < 4) return "Right wing";
  return undefined;
}

function prioritySort(a: AssistantGmRecommendation, b: AssistantGmRecommendation): number {
  const rank = { urgent: 0, high: 1, medium: 2, low: 3 };
  return rank[a.priority] - rank[b.priority];
}

function helpLimit(franchise: FranchiseState): number {
  const help = franchise.difficultyTuning.assistantGmHelpLevel;
  if (help === "minimal") return 5;
  if (help === "detailed") return 12;
  return 8;
}
