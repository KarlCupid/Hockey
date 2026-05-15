import { getCapWarnings, getExpiringContracts } from "./contracts";
import { validateRosterForGame } from "./rosterRules";
import type { ActionQueueItem, FranchiseState, RoomBadge, RoomId } from "../types";

export function getMasterActionQueue(franchise: FranchiseState): ActionQueueItem[] {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId);
  if (!team) return [];
  const items: ActionQueueItem[] = [];
  const rosterReport = validateRosterForGame(team);
  const highDecision = franchise.decisionEvents.find(
    (event) => event.status === "active" && (event.severity === "high" || event.severity === "critical")
  );

  if (rosterReport.errors.length) {
    items.push({
      id: "queue-invalid-roster",
      priority: "urgent",
      label: "Fix roster before game day",
      description: rosterReport.errors[0],
      roomId: "roster",
      category: "roster",
      blocking: true
    });
  }

  if (franchise.offseasonState?.draftState?.userPickPending) {
    items.push({
      id: "queue-draft-pick",
      priority: "urgent",
      label: "Make your draft pick",
      description: "The draft cannot continue until your table makes the selection.",
      roomId: "scouting",
      category: "phase",
      blocking: true
    });
  }

  if (highDecision) {
    items.push({
      id: `queue-decision-${highDecision.id}`,
      priority: "urgent",
      label: highDecision.headline,
      description: "A high-severity decision is active and should be resolved before it hardens into a story.",
      roomId: highDecision.locationRoom ?? "gm",
      category: "story",
      blocking: false,
      relatedEventId: highDecision.id,
      relatedPlayerId: highDecision.playerIds?.[0]
    });
  }

  const capWarning = getCapWarnings(team)[0];
  if (capWarning) {
    items.push({
      id: "queue-cap-warning",
      priority: capWarning.includes("over") ? "high" : "medium",
      label: "Review the cap board",
      description: capWarning,
      roomId: "contracts",
      category: "cap",
      blocking: false
    });
  }

  const expiringStar = getExpiringContracts(team).find((player) => player.overall >= 84);
  if (expiringStar) {
    items.push({
      id: "queue-expiring-star",
      priority: "high",
      label: `${expiringStar.displayName} needs a contract read`,
      description: "A core player is within one year of expiry.",
      roomId: "contracts",
      category: "contract",
      blocking: false,
      relatedPlayerId: expiringStar.id
    });
  }

  if (franchise.freeAgencyState && !franchise.freeAgencyState.completed) {
    items.push({
      id: "queue-free-agency",
      priority: "medium",
      label: "Check free agency market",
      description: "The market is open and useful fits can disappear quickly.",
      roomId: "freeAgency",
      category: "freeAgency",
      blocking: false
    });
  }

  const failedGoal = franchise.ownerState.seasonGoals.find((goal) => goal.status === "failed");
  const lowProgressGoal = franchise.ownerState.seasonGoals.find((goal) => goal.status === "active" && goal.importance === "high" && goal.progress < 35);
  if (failedGoal || lowProgressGoal) {
    items.push({
      id: "queue-owner-risk",
      priority: failedGoal ? "high" : "medium",
      label: "Owner goal risk",
      description: failedGoal ? `${failedGoal.label} has failed.` : `${lowProgressGoal?.label} is behind pace.`,
      roomId: "ownerSuite",
      category: "owner",
      blocking: false
    });
  }

  if (!items.some((item) => item.priority === "urgent" || item.blocking)) {
    items.push({
      id: "queue-first-prep",
      priority: "low",
      label: "Review next-game prep",
      description: "Check lineup, cap pressure, and the latest Assistant GM note before advancing.",
      roomId: "gm",
      category: "phase",
      blocking: false
    });
  }

  return items.sort(actionSort);
}

export function getRoomBadges(franchise: FranchiseState): Record<RoomId, RoomBadge[]> {
  const badges = emptyBadgeRecord();
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId);
  if (!team) return badges;
  const rosterReport = validateRosterForGame(team);
  const activeDecisions = franchise.decisionEvents.filter((event) => event.status === "active");
  const highDecisions = activeDecisions.filter((event) => event.severity === "high" || event.severity === "critical");
  const expiring = getExpiringContracts(team).filter((player) => player.overall >= 76);
  const staff = franchise.staffState.teamStaff[franchise.selectedTeamId] ?? [];
  const staffVacancy = !staff.some((member) => member.role === "Head Scout") || !staff.some((member) => member.role === "Assistant GM");

  if (franchise.inbox.length) badges.gm.push(badge("news", "News", "info", Math.min(franchise.inbox.length, 9)));
  if (activeDecisions.length) {
    badges.gm.push(badge("decision", "Decision", highDecisions.length ? "danger" : "warning", activeDecisions.length));
    for (const event of activeDecisions) {
      badges[event.locationRoom ?? "gm"].push(badge(`decision-${event.id}`, "Decision", event.severity === "high" || event.severity === "critical" ? "danger" : "warning"));
    }
  }
  if (rosterReport.errors.length) badges.roster.push(badge("invalid-roster", "Invalid", "danger", rosterReport.errors.length));
  if (franchise.offseasonState?.draftState?.userPickPending) badges.scouting.push(badge("draft-pick", "Pick", "danger"));
  if (expiring.length) badges.contracts.push(badge("expiring", "Expiring", "warning", expiring.length));
  if (franchise.freeAgencyState && !franchise.freeAgencyState.completed) badges.freeAgency.push(badge("free-agency", "Market", "info"));
  if (staffVacancy) badges.staff.push(badge("staff-vacancy", "Vacancy", "warning"));
  if (franchise.ownerState.seasonGoals.some((goal) => goal.status === "failed" || (goal.importance === "high" && goal.progress < 35))) {
    badges.ownerSuite.push(badge("owner-risk", "Goal Risk", "danger"));
  }
  if (getCapWarnings(team).length) badges.contracts.push(badge("cap", "Cap", "warning"));
  return badges;
}

export function getUrgentActionCount(franchise: FranchiseState): number {
  return getMasterActionQueue(franchise).filter((item) => item.priority === "urgent" || item.blocking).length;
}

export function getNextBestAction(franchise: FranchiseState): ActionQueueItem | undefined {
  return getMasterActionQueue(franchise)[0];
}

function emptyBadgeRecord(): Record<RoomId, RoomBadge[]> {
  return {
    gm: [],
    press: [],
    ownerSuite: [],
    agents: [],
    playerMeetings: [],
    roster: [],
    coach: [],
    locker: [],
    medical: [],
    arena: [],
    standings: [],
    saves: [],
    contracts: [],
    trades: [],
    scouting: [],
    development: [],
    freeAgency: [],
    staff: [],
    draft: [],
    settings: [],
    devTools: []
  };
}

function badge(id: string, label: string, tone: RoomBadge["tone"], count?: number): RoomBadge {
  return { id, label, tone, count };
}

function actionSort(a: ActionQueueItem, b: ActionQueueItem): number {
  const rank = { urgent: 0, high: 1, medium: 2, low: 3 };
  const priority = rank[a.priority] - rank[b.priority];
  if (priority !== 0) return priority;
  if (a.blocking !== b.blocking) return a.blocking ? -1 : 1;
  return a.label.localeCompare(b.label);
}
