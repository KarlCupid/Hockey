import { getCurrentPick } from "./draftExecution";
import { getPendingExpiringPlayers } from "./contractNegotiation";
import { nextGameForTeam } from "../simulation/simulateGame";
import type { FranchiseState, SeasonPhase } from "../types";

export interface PhaseChecklistItem {
  id: string;
  label: string;
  complete: boolean;
  optional?: boolean;
}

const PHASE_LABELS: Record<SeasonPhase, string> = {
  regularSeason: "Regular Season",
  playoffs: "Playoffs",
  seasonReview: "Season Review",
  retirements: "Retirements",
  draftLottery: "Draft Lottery",
  draft: "Draft",
  reSigning: "Re-Signing",
  freeAgency: "Free Agency",
  staffHiring: "Staff Hiring",
  trainingCamp: "Training Camp",
  preseason: "Preseason",
  completed: "Completed"
};

const PHASE_DESCRIPTIONS: Record<SeasonPhase, string> = {
  regularSeason: "Play the schedule, manage fatigue, tune lines, and bank enough points for the top-eight playoff line.",
  playoffs: "Best-of-five series decide the champion. Every sim can swing the bracket and the franchise story.",
  seasonReview: "Archive the season, evaluate owner goals, and turn the year into history before the offseason opens.",
  retirements: "Veterans age, contracts tick down, recoveries process, and retirement decisions clear space on the board.",
  draftLottery: "The bottom clubs and traded picks settle the top of the draft order before the room goes on the clock.",
  draft: "Use scouting certainty, public rank, and team needs to add fictional prospect rights to the pipeline.",
  reSigning: "Handle expiring contracts. Unsigned UFAs will enter free agency if you advance.",
  freeAgency: "A seven-day market lets you and AI teams sign players who fit cap, role, and roster limits.",
  staffHiring: "Set the hockey operations staff before camp. Staff ratings lightly shape scouting, development, recovery, and negotiation.",
  trainingCamp: "Lock the offseason, reset the schedule and stats, refresh owner goals, and start the next season.",
  preseason: "A light staging phase for the next regular season; current prototype advances directly into the season.",
  completed: "The current dynasty loop is complete."
};

export function getPhaseLabel(phase: SeasonPhase): string {
  return PHASE_LABELS[phase] ?? phase;
}

export function getPhaseDescription(franchise: FranchiseState): string {
  return PHASE_DESCRIPTIONS[franchise.seasonPhase];
}

export function getRecommendedNextAction(franchise: FranchiseState): string {
  const phase = franchise.seasonPhase;
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId);
  if (phase === "regularSeason") {
    if (franchise.league.completed) return "Start the playoff bracket.";
    const game = nextGameForTeam(franchise.selectedTeamId, franchise.league.schedule, franchise.league.currentDayIndex);
    return game ? "Review lineup health, then simulate the next game." : "Complete the schedule and open playoffs.";
  }
  if (phase === "playoffs") return franchise.playoffState?.completed ? "Advance to season review." : "Resolve the next playoff game or round.";
  if (phase === "seasonReview") return "Archive the year and let ownership evaluate the season.";
  if (phase === "retirements") return "Process aging, contract ticks, recovery, and retirements.";
  if (phase === "draftLottery") return "Resolve the lottery and lock the owned-pick draft order.";
  if (phase === "draft") {
    const pick = franchise.offseasonState?.draftState ? getCurrentPick(franchise.offseasonState.draftState, franchise) : undefined;
    if (pick?.ownerTeamId === franchise.selectedTeamId) return `Make your pick: Round ${pick.round}, Pick ${pick.pickNumber}.`;
    return "Auto-draft until your next pick or finish the class.";
  }
  if (phase === "reSigning") {
    const pending = team ? getPendingExpiringPlayers(franchise, team.id).length : 0;
    return pending ? `Resolve ${pending} expiring contract decision${pending === 1 ? "" : "s"}.` : "Advance to free agency.";
  }
  if (phase === "freeAgency") return franchise.freeAgencyState?.completed ? "Advance to staff hiring." : "Advance a market day or make a targeted offer.";
  if (phase === "staffHiring") return "Review staff chairs, then advance to training camp.";
  if (phase === "trainingCamp" || phase === "preseason") return "Start the next season.";
  return "No required action.";
}

export function getPhaseChecklist(franchise: FranchiseState): PhaseChecklistItem[] {
  const phase = franchise.seasonPhase;
  const selected = franchise.league.teams.find((team) => team.id === franchise.selectedTeamId);
  if (phase === "regularSeason") {
    const nextGame = nextGameForTeam(franchise.selectedTeamId, franchise.league.schedule, franchise.league.currentDayIndex);
    return [
      { id: "lineup", label: "Lineup has no blocking errors", complete: Boolean(selected) },
      { id: "next-game", label: "Next game reviewed", complete: Boolean(nextGame), optional: true },
      { id: "season-complete", label: "Regular season complete", complete: franchise.league.completed }
    ];
  }
  if (phase === "playoffs") {
    return [
      { id: "bracket", label: "Playoff bracket created", complete: Boolean(franchise.playoffState) },
      { id: "champion", label: "Champion crowned", complete: Boolean(franchise.playoffState?.completed) }
    ];
  }
  if (phase === "draft") {
    const state = franchise.offseasonState?.draftState;
    return [
      { id: "lottery", label: "Draft order locked", complete: Boolean(state?.draftOrder.length) },
      { id: "user-pick", label: "User pick handled when on clock", complete: !state?.userPickPending },
      { id: "complete", label: "Draft completed", complete: Boolean(state?.completed) }
    ];
  }
  if (phase === "reSigning") {
    const pending = selected ? getPendingExpiringPlayers(franchise, selected.id) : [];
    return [
      { id: "expiring", label: "Expiring contracts reviewed", complete: pending.length === 0 },
      { id: "cap", label: "Cap room checked", complete: Boolean(selected), optional: true }
    ];
  }
  if (phase === "freeAgency") {
    return [
      { id: "market", label: "Market opened", complete: Boolean(franchise.freeAgencyState) },
      { id: "days", label: "Seven-day market completed", complete: Boolean(franchise.freeAgencyState?.completed) }
    ];
  }
  if (phase === "staffHiring") {
    const staff = franchise.staffState.teamStaff[franchise.selectedTeamId] ?? [];
    return [{ id: "staff", label: "Staff chairs reviewed", complete: staff.length >= 7 }];
  }
  if (phase === "trainingCamp" || phase === "preseason") {
    return [
      { id: "owner-goals", label: "Owner goals will refresh", complete: true, optional: true },
      { id: "new-season", label: "Ready to generate next season", complete: true }
    ];
  }
  return [{ id: phase, label: getRecommendedNextAction(franchise), complete: true }];
}

export function getAdvancePreview(franchise: FranchiseState, action = "advance"): string {
  const phase = franchise.seasonPhase;
  if (phase === "regularSeason") return franchise.league.completed ? "Creates the top-eight playoff bracket." : "No phase advance is available until the schedule is complete.";
  if (phase === "playoffs") return franchise.playoffState?.completed ? "Moves the champion into season review." : "The bracket must crown a champion first.";
  if (phase === "seasonReview") return "Archives history, awards, champion notes, and owner evaluation.";
  if (phase === "retirements") return "Ages players, decrements contracts, recovers injuries/fatigue, and runs retirements.";
  if (phase === "draftLottery") return "Locks the lottery order and opens the draft stage.";
  if (phase === "draft") return "Moves to re-signing after all picks are made.";
  if (phase === "reSigning") return "Unsigned UFAs leave rosters for the free-agent market; RFAs remain controlled.";
  if (phase === "freeAgency") return action === "day" ? "AI teams may sign players and the market day advances." : "Moves to staff hiring after the market is complete.";
  if (phase === "staffHiring") return "Locks current staff and opens training camp.";
  if (phase === "trainingCamp" || phase === "preseason") return "Resets stats, schedule, fatigue, owner goals, draft class, and starts the next season.";
  return "No further automatic changes.";
}

export function getDangerWarnings(franchise: FranchiseState, action = "advance"): string[] {
  const warnings: string[] = [];
  const selected = franchise.league.teams.find((team) => team.id === franchise.selectedTeamId);
  if (franchise.seasonPhase === "reSigning" && selected) {
    const pendingUfas = getPendingExpiringPlayers(franchise, selected.id).filter((player) => player.contract.expiryStatus === "UFA");
    if (pendingUfas.length) warnings.push(`${pendingUfas.length} unsigned UFA${pendingUfas.length === 1 ? "" : "s"} will enter free agency.`);
  }
  if (franchise.seasonPhase === "draft") {
    const pick = franchise.offseasonState?.draftState ? getCurrentPick(franchise.offseasonState.draftState, franchise) : undefined;
    if (pick?.ownerTeamId === franchise.selectedTeamId) warnings.push(`Your pending pick is Round ${pick.round}, Pick ${pick.pickNumber}.`);
  }
  if (franchise.seasonPhase === "freeAgency" && action !== "day" && !franchise.freeAgencyState?.completed) {
    warnings.push("Free agency is still active; advancing early skips remaining market days.");
  }
  if (franchise.seasonPhase === "trainingCamp" || franchise.seasonPhase === "preseason") {
    warnings.push("Starting next season resets season stats, schedule, fatigue, and owner goals.");
  }
  return warnings;
}
