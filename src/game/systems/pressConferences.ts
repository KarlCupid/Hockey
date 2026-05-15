import { SeededRng } from "../rng";
import type { DecisionEvent, DecisionOption, FranchiseState, GameResult } from "../types";
import { mergeDecisionEvents, resolveDecisionEvent } from "./decisionEvents";

export function createPressConference(franchise: FranchiseState, context: { result?: GameResult; topic?: string } = {}, rng = new SeededRng(`${franchise.franchiseId}-press`)): DecisionEvent {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId)!;
  const result = context.result;
  const questionOptions = result ? createPostGameQuestions(franchise, result, rng) : createPlayoffQuestions(franchise, rng);
  return {
    id: `decision-pressConference-${franchise.league.currentDate}-${context.topic ?? result?.gameId ?? "general"}`,
    type: "pressConference",
    status: "active",
    severity: result ? "medium" : franchise.seasonPhase === "playoffs" ? "high" : "low",
    createdDate: franchise.league.currentDate,
    expiresDate: addDays(franchise.league.currentDate, 4),
    phase: franchise.seasonPhase,
    teamId: team.id,
    relatedGameId: result?.gameId,
    headline: context.topic ?? (result ? "Post-game media availability" : "Media availability"),
    body: result ? "The press room is asking for the story of the night." : "The local beat wants the organization temperature.",
    sourceLabel: "Press Room",
    locationRoom: "press",
    options: questionOptions,
    tags: ["press", result ? "postgame" : franchise.seasonPhase],
    repeatKey: `press-${franchise.league.currentDate}-${context.topic ?? result?.gameId ?? "general"}`
  };
}

export function createPostGameQuestions(franchise: FranchiseState, result: GameResult, rng = new SeededRng(`${result.id}-press-options`)): DecisionOption[] {
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId)!;
  const home = result.homeTeamId === team.id;
  const forGoals = home ? result.finalScore.home : result.finalScore.away;
  const againstGoals = home ? result.finalScore.away : result.finalScore.home;
  const won = forGoals > againstGoals;
  return [
    {
      id: "transparent",
      label: won ? "Credit the details" : "Own the mistakes",
      tone: "transparent",
      description: won ? "Explain why the win was repeatable without over-selling it." : "Name the issue and the next correction.",
      preview: getPressTonePreview({ tone: "transparent" } as DecisionOption)
    },
    {
      id: "supportive",
      label: "Back the players",
      tone: "supportive",
      description: "Keep the public heat away from the room.",
      preview: getPressTonePreview({ tone: "supportive" } as DecisionOption)
    },
    {
      id: "firm",
      label: won ? "Keep standards high" : "Demand a response",
      tone: "firm",
      description: "Make the standard clear without naming individuals.",
      preview: getPressTonePreview({ tone: "firm" } as DecisionOption)
    }
  ];
}

export function createPlayoffQuestions(franchise: FranchiseState, rng = new SeededRng(`${franchise.franchiseId}-playoff-press`)): DecisionOption[] {
  return [
    { id: "transparent", label: "Name the stakes", tone: "transparent", description: "Be clear about the playoff moment.", preview: "Media pressure down, owner trust up." },
    { id: "supportive", label: "Shield the room", tone: "supportive", description: "Put pressure on your desk and back the group.", preview: "Morale and chemistry up." },
    { id: "aggressive", label: "Challenge publicly", tone: "aggressive", description: "Turn the question into a challenge.", preview: "Fans up, media pressure up." }
  ];
}

export function applyPressConferenceOutcome(franchise: FranchiseState, event: DecisionEvent, option: DecisionOption): FranchiseState {
  const withEvent = franchise.decisionEvents.some((candidate) => candidate.id === event.id) ? franchise : mergeDecisionEvents(franchise, [event]);
  return resolveDecisionEvent(withEvent, event.id, option.id, new SeededRng(`${event.id}-${option.id}-press`));
}

export function getPressTonePreview(option: Pick<DecisionOption, "tone">): string {
  if (option.tone === "transparent") return "Media pressure -4, owner trust +2, player trust +1.";
  if (option.tone === "supportive") return "Player morale +3, chemistry +2, media slightly calmer.";
  if (option.tone === "firm") return "Accountability +2, owner trust +2, media pressure +1.";
  if (option.tone === "aggressive") return "Fan sentiment +3, media pressure +4, room trust risk.";
  return "Keeps the temperature mostly steady.";
}

function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}
