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

  if (!won && userGoals <= oppGoals - 3) {
    items.push({
      id: `media-ugly-${result.id}`,
      type: "media",
      date,
      headline: "Media Room: The questions got shorter after an ugly loss",
      body: `Shot quality and bench response will be the first two topics after a ${oppGoals}-${userGoals} night against ${opponent.nickname}.`,
      severity: "high",
      teamId: userTeam.id
    });
  }

  if (won && userGoals >= oppGoals + 3) {
    items.push({
      id: `room-praise-${result.id}`,
      type: "morale",
      date,
      headline: "Locker Room Note: Strong win gives the group a little swagger",
      body: "Players were talking about details instead of excuses, which is usually a sign the plan landed.",
      severity: "low",
      teamId: userTeam.id
    });
  }

  if (userTeam.ownerPatience < 45 && !won) {
    items.push({
      id: `owner-impatient-${result.id}`,
      type: "owner",
      date,
      headline: "Owner's Suite: The process is fine, but the table needs to move",
      body: `Ownership still sees the plan, but ${recordString(userTeam)} is not the kind of patience exercise they enjoy.`,
      severity: "high",
      teamId: userTeam.id
    });
  }

  if (Math.abs(userTeam.fanConfidence - 55) >= 15) {
    items.push({
      id: `fans-${result.id}`,
      type: "excitement",
      date,
      headline: userTeam.fanConfidence >= 70 ? "Fans Buzzing: The building is starting to believe" : "Fans Pulse: Confidence is getting thin",
      body:
        userTeam.fanConfidence >= 70
          ? "The city is not planning a parade, but it is refreshing the standings more often."
          : "The market can live with a plan. It has less patience for the same problem twice.",
      severity: userTeam.fanConfidence >= 70 ? "low" : "medium",
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
    const player = userTeam.roster.find((candidate) => candidate.id === star.playerId);
    items.push({
      id: `breakout-${result.id}-${star.playerId}`,
      type: "breakout",
      date,
      headline: player?.age && player.age <= 23 ? "Fans Buzzing: Rookie moment has the city talking" : "Breakout Watch: A performance that changes the meeting",
      body: star.reason,
      severity: "low",
      teamId: userTeam.id,
      playerId: star.playerId
    });
  }

  const roleFrustration = userTeam.roster.find(
    (player) =>
      player.injuryStatus === "healthy" &&
      player.morale <= 42 &&
      ["Franchise Driver", "Top Line", "Top Six", "Top Pair", "Starter"].includes(player.roleExpectation)
  );
  if (roleFrustration) {
    items.push({
      id: `role-${result.id}-${roleFrustration.id}`,
      type: "morale",
      date,
      headline: "Locker Room Note: Veteran voice wants the role picture clearer",
      body: `${roleFrustration.displayName} carries a ${roleFrustration.roleExpectation} expectation, and the staff may need to define the path before frustration travels.`,
      severity: "medium",
      teamId: userTeam.id,
      playerId: roleFrustration.id
    });
  }

  const goalieStory = createGoalieStory(result, userTeam, date);
  if (goalieStory) items.push(goalieStory);

  const tiredPlayer = userTeam.roster.find((player) => player.fatigue >= 82);
  if (tiredPlayer) {
    items.push({
      id: `fatigue-${result.id}-${tiredPlayer.id}`,
      type: "media",
      date,
      headline: `Analytics Desk: ${tiredPlayer.displayName}'s workload is flashing yellow`,
      body: "Fatigue is not a headline until it becomes a mistake. The staff can still get ahead of it.",
      severity: "medium",
      teamId: userTeam.id,
      playerId: tiredPlayer.id
    });
  }

  const personalityNote = userTeam.roster.find((player) => player.personality === "High-Maintenance Star" || player.personality === "Locker-Room Glue");
  if (personalityNote && (won || userTeam.record.streak.startsWith("L"))) {
    items.push({
      id: `personality-${result.id}-${personalityNote.id}`,
      type: "morale",
      date,
      headline:
        personalityNote.personality === "Locker-Room Glue"
          ? "Room Tone: The glue guys matter after nights like this"
          : "Media Room: Star temperature is part of the job now",
      body:
        personalityNote.personality === "Locker-Room Glue"
          ? `${personalityNote.displayName} kept the room pointed at tomorrow instead of the noise.`
          : `${personalityNote.displayName} can change a game, but his mood can change a week.`,
      severity: personalityNote.personality === "Locker-Room Glue" ? "low" : "medium",
      teamId: userTeam.id,
      playerId: personalityNote.id
    });
  }

  if (opponent.record.streak.startsWith("W") && Number(opponent.record.streak.slice(1)) >= 3) {
    items.push({
      id: `rival-${result.id}`,
      type: "rival",
      date,
      headline: `Rival Watch: ${opponent.nickname} keep stacking points`,
      body: `${opponent.fullName} are turning their own streak into standings pressure around the league.`,
      severity: "low",
      teamId: opponent.id
    });
  }

  if (userTeam.record.points >= 18 || userTeam.record.points <= 8) {
    items.push({
      id: `standings-${result.id}`,
      type: "standings",
      date,
      headline: userTeam.record.points >= 18 ? "Standings Desk: The hunt is real" : "Standings Desk: The runway is already shorter",
      body:
        userTeam.record.points >= 18
          ? "The top-four projection is still only a projection, but the room has put itself in the conversation."
          : "No one is eliminated in a vertical slice, but the table is asking for urgency.",
      severity: userTeam.record.points >= 18 ? "low" : "medium",
      teamId: userTeam.id
    });
  }

  return items.slice(0, 8);
}

function createGoalieStory(result: GameResult, userTeam: Team, date: string): NewsItem | undefined {
  const starterLineupId = userTeam.lines.goalies.starter;
  const backupLineupId = userTeam.lines.goalies.backup;
  const starterStats = result.goalieStats.find((goalie) => goalie.goalieId === starterLineupId);
  const starter = userTeam.roster.find((player) => player.id === starterLineupId);
  const backup = userTeam.roster.find((player) => player.id === backupLineupId);
  if (!starter || !backup || !starterStats) return undefined;
  const savePct = starterStats.shotsAgainst > 0 ? starterStats.saves / starterStats.shotsAgainst : 1;
  if (starterStats.goalsAgainst >= 4 || savePct < 0.875) {
    return {
      id: `goalie-${result.id}-${starter.id}`,
      type: "goalie",
      date,
      headline: `Media Room: Are the ${userTeam.nickname} asking too much of their starter?`,
      body: `${starter.displayName} saw ${starterStats.shotsAgainst} shots while ${backup.displayName} waited. The next crease decision will get noticed.`,
      severity: "medium",
      teamId: userTeam.id,
      playerId: starter.id
    };
  }
  return undefined;
}
