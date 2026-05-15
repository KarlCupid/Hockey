import type { FranchiseState } from "../types";
import { updateFanSentiment } from "./fanMedia";
import { getTeamDynamics } from "./relationships";

export type FanSentimentScenario =
  | "starTraded"
  | "fanFavoriteReSigned"
  | "bigFreeAgentSigned"
  | "playoffMiss"
  | "playoffBerth"
  | "championship"
  | "rivalryWin"
  | "rivalryLoss"
  | "draftRiskyPick"
  | "losingStreak"
  | "prospectBreakout";

export interface FanSentimentScenarioResult {
  scenario: FanSentimentScenario;
  before: number;
  after: number;
  delta: number;
  note: string;
}

export function applyFanSentimentScenario(franchise: FranchiseState, scenario: FanSentimentScenario): FranchiseState {
  switch (scenario) {
    case "starTraded":
      return updateFanSentiment(franchise, { tradeStar: true });
    case "fanFavoriteReSigned":
    case "bigFreeAgentSigned":
    case "prospectBreakout":
      return updateFanSentiment(franchise, { majorSigning: true });
    case "playoffMiss":
    case "rivalryLoss":
    case "draftRiskyPick":
    case "losingStreak":
      return updateFanSentiment(franchise, { missedTarget: true, win: false });
    case "playoffBerth":
    case "championship":
    case "rivalryWin":
      return updateFanSentiment(franchise, { win: true, majorSigning: scenario === "championship" });
  }
}

export function runFanSentimentScenario(franchise: FranchiseState, scenario: FanSentimentScenario): FanSentimentScenarioResult {
  const before = getTeamDynamics(franchise, franchise.selectedTeamId).fanSentiment;
  const next = applyFanSentimentScenario(franchise, scenario);
  const after = getTeamDynamics(next, next.selectedTeamId).fanSentiment;
  return {
    scenario,
    before,
    after,
    delta: after - before,
    note: noteForScenario(scenario, after - before)
  };
}

export function runFanSentimentBalanceScenarios(franchise: FranchiseState): FanSentimentScenarioResult[] {
  const scenarios: FanSentimentScenario[] = [
    "starTraded",
    "fanFavoriteReSigned",
    "bigFreeAgentSigned",
    "playoffMiss",
    "playoffBerth",
    "championship",
    "rivalryWin",
    "rivalryLoss",
    "draftRiskyPick",
    "losingStreak",
    "prospectBreakout"
  ];
  return scenarios.map((scenario) => runFanSentimentScenario(franchise, scenario));
}

function noteForScenario(scenario: FanSentimentScenario, delta: number): string {
  const direction = delta > 0 ? "raises" : delta < 0 ? "lowers" : "does not move";
  return `${scenario} ${direction} fan sentiment by ${Math.abs(delta)}.`;
}
