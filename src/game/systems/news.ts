import type { GameResult, NewsItem, Team } from "../types";
import { recordString } from "./standings";

export function createGameNews(result: GameResult, userTeam: Team, opponent: Team, date: string): NewsItem[] {
  const userHome = result.homeTeamId === userTeam.id;
  const userGoals = userHome ? result.finalScore.home : result.finalScore.away;
  const oppGoals = userHome ? result.finalScore.away : result.finalScore.home;
  const won = userGoals > oppGoals;
  const items: NewsItem[] = [
    {
      id: `recap-${result.id}`,
      type: "gameRecap",
      date,
      headline: won
        ? `Local Column: ${userTeam.nickname} bank two points with bite`
        : `Local Column: ${userTeam.nickname} leave points on the table`,
      body: `${userTeam.fullName} ${won ? "beat" : "fell to"} ${opponent.fullName} ${userGoals}-${oppGoals}. ${result.momentumSummary}`,
      severity: won ? "low" : "medium",
      teamId: userTeam.id
    }
  ];

  if (userTeam.record.streak.startsWith("L") && Number(userTeam.record.streak.slice(1)) >= 2) {
    items.push({
      id: `pressure-${result.id}`,
      type: "pressure",
      date,
      headline: "Owner's Suite: Progress needs to show soon",
      body: `The record sits at ${recordString(userTeam)} and the patience meter is not bottomless.`,
      severity: "high",
      teamId: userTeam.id
    });
  }

  if (userTeam.record.streak.startsWith("W") && Number(userTeam.record.streak.slice(1)) >= 2) {
    items.push({
      id: `buzz-${result.id}`,
      type: "excitement",
      date,
      headline: `Fans Buzzing: ${userTeam.nickname} starting to look connected`,
      body: "The top of the lineup has found a rhythm, and the building felt louder after the final horn.",
      severity: "low",
      teamId: userTeam.id
    });
  }

  result.injuries
    .filter((injury) => injury.teamId === userTeam.id)
    .forEach((injury) => {
      items.push({
        id: `injury-${result.id}-${injury.playerId}`,
        type: "injury",
        date,
        headline: "Medical Update: Player listed day-to-day",
        body: injury.note,
        severity: "medium",
        teamId: userTeam.id,
        playerId: injury.playerId
      });
    });

  const star = result.threeStars.find((item) => item.teamId === userTeam.id);
  if (star) {
    items.push({
      id: `breakout-${result.id}-${star.playerId}`,
      type: "breakout",
      date,
      headline: "Breakout Watch: A performance that changes the meeting",
      body: star.reason,
      severity: "low",
      teamId: userTeam.id,
      playerId: star.playerId
    });
  }

  return items;
}
