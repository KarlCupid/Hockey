import type { FranchiseState, GameResult, Player, RoomId, Team } from "../types";
import { getAchievementSummary } from "./achievements";
import { getNextBestAction } from "./actionQueue";

export interface PostGameSummaryCard {
  id: string;
  title: string;
  body: string;
  roomId?: RoomId;
  tone: "neutral" | "positive" | "warning" | "danger";
}

export interface PostGameSummary {
  headline: string;
  subhead: string;
  cards: PostGameSummaryCard[];
  nextRecommendation: {
    label: string;
    body: string;
    roomId: RoomId;
  };
  animationFlags: {
    scorePulse: boolean;
    achievementSwell: boolean;
    eventFeedMotion: boolean;
  };
}

export function createPostGameSummary(franchise: FranchiseState, result: GameResult, teams: Team[] = franchise.league.teams, options: { reducedMotion?: boolean } = {}): PostGameSummary {
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const players = new Map(teams.flatMap((team) => team.roster.map((player) => [player.id, player] as const)));
  const selectedTeam = teamById.get(franchise.selectedTeamId);
  const away = teamById.get(result.awayTeamId);
  const home = teamById.get(result.homeTeamId);
  const selectedScore = result.homeTeamId === franchise.selectedTeamId ? result.finalScore.home : result.finalScore.away;
  const opponentScore = result.homeTeamId === franchise.selectedTeamId ? result.finalScore.away : result.finalScore.home;
  const selectedWon = selectedScore > opponentScore;
  const nextAction = getNextBestAction(franchise);
  const achievements = getAchievementSummary(franchise);
  const fatigueWarnings = result.fatigueChanges.filter((change) => change.amount >= 8).slice(0, 3);
  const moraleRisers = result.moraleChanges.filter((change) => change.amount >= 3).slice(0, 3);
  const moraleFallers = result.moraleChanges.filter((change) => change.amount <= -2).slice(0, 3);

  const cards: PostGameSummaryCard[] = [
    {
      id: "record-movement",
      title: "Record Movement",
      body: `${selectedTeam?.fullName ?? "Your club"} ${selectedWon ? "banked two points" : "left points on the table"} after a ${selectedScore}-${opponentScore} ${selectedWon ? "win" : "loss"}.`,
      roomId: "standings",
      tone: selectedWon ? "positive" : "warning"
    },
    {
      id: "standings-context",
      title: "Standings Context",
      body: `${away?.fullName ?? "The road side"} and ${home?.fullName ?? "the home side"} now have updated records. Check the standings board for the new chase line.`,
      roomId: "standings",
      tone: "neutral"
    },
    {
      id: "morale-fatigue",
      title: "Room Pulse",
      body: createRoomPulse(players, moraleRisers, moraleFallers, fatigueWarnings),
      roomId: fatigueWarnings.length ? "medical" : "locker",
      tone: fatigueWarnings.length ? "warning" : moraleRisers.length ? "positive" : "neutral"
    },
    {
      id: "story-fallout",
      title: "Story Fallout",
      body: result.newsEvents[0]?.headline ? `${result.newsEvents[0].headline}. ${result.newsEvents[0].body}` : "No major story fallout landed after this one, which is sometimes its own gift in hockey ops.",
      roomId: "gm",
      tone: result.newsEvents.length ? "warning" : "neutral"
    },
    {
      id: "achievement-fallout",
      title: "Milestone Watch",
      body: achievements.recent.length
        ? `Latest unlock: ${achievements.recent[0].label}. Progress sits at ${achievements.unlocked}/${achievements.total}.`
        : `No achievement unlocked this game. Progress sits at ${achievements.unlocked}/${achievements.total}.`,
      roomId: "standings",
      tone: achievements.recent.length ? "positive" : "neutral"
    }
  ];

  return {
    headline: `${selectedTeam?.fullName ?? "Your club"} ${selectedWon ? "wins" : "falls"} ${selectedScore}-${opponentScore}`,
    subhead: "Post-game office readout",
    cards: cards.map((card) => ({ ...card, body: scrubIds(card.body) })),
    nextRecommendation: {
      label: nextAction?.label ?? "Return to GM Computer",
      body: nextAction?.description ?? "Review the inbox, save locally, and choose the next room with intent.",
      roomId: nextAction?.roomId ?? "gm"
    },
    animationFlags: {
      scorePulse: !options.reducedMotion,
      achievementSwell: !options.reducedMotion && achievements.recent.length > 0,
      eventFeedMotion: !options.reducedMotion
    }
  };
}

export function postGameSummaryHasRawIds(summary: PostGameSummary): boolean {
  const text = [summary.headline, summary.subhead, summary.nextRecommendation.label, summary.nextRecommendation.body, ...summary.cards.flatMap((card) => [card.title, card.body])].join(" ");
  return /\b(team|player|game|pick|prospect|event)-[a-z0-9-]{4,}\b/i.test(text);
}

function createRoomPulse(
  players: Map<string, Player>,
  moraleRisers: GameResult["moraleChanges"],
  moraleFallers: GameResult["moraleChanges"],
  fatigueWarnings: GameResult["fatigueChanges"]
): string {
  const pieces: string[] = [];
  if (moraleRisers.length) pieces.push(`${playerName(players, moraleRisers[0].playerId)} lifted the bench mood.`);
  if (moraleFallers.length) pieces.push(`${playerName(players, moraleFallers[0].playerId)} may need a steadier touch.`);
  if (fatigueWarnings.length) pieces.push(`${playerName(players, fatigueWarnings[0].playerId)} carries the biggest workload warning.`);
  return pieces.length ? pieces.join(" ") : "Morale and workload stayed fairly clean after the final horn.";
}

function playerName(players: Map<string, Player>, playerId: string): string {
  return players.get(playerId)?.displayName ?? "A roster player";
}

function scrubIds(value: string): string {
  return value.replace(/\b(team|player|game|pick|prospect|event)-[a-z0-9-]{4,}\b/gi, "the related item");
}
