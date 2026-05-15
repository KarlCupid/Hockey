import type { FranchiseState, GameEvent, GameResult, Team } from "../types";
import { recordString } from "./standings";

export interface BroadcastIntro {
  homeName: string;
  awayName: string;
  headline: string;
  taleOfTape: Array<{ label: string; home: string; away: string }>;
}

export interface NarrativeBeat {
  id: string;
  label: string;
  body: string;
  animation: boolean;
}

export interface ThreeStarsPresentation {
  title: string;
  stars: Array<{ rank: number; playerName: string; teamName: string; reason: string }>;
}

export function createBroadcastIntro(franchise: FranchiseState, game: { homeTeamId: string; awayTeamId: string }): BroadcastIntro {
  const home = findTeam(franchise.league.teams, game.homeTeamId);
  const away = findTeam(franchise.league.teams, game.awayTeamId);
  return {
    homeName: home.fullName,
    awayName: away.fullName,
    headline: `${away.nickname} visit ${home.nickname} with the standings file open.`,
    taleOfTape: [
      { label: "Record", home: recordString(home), away: recordString(away) },
      { label: "Market Pulse", home: `${home.fanConfidence}/100`, away: `${away.fanConfidence}/100` },
      { label: "Team Identity", home: home.teamPersonality, away: away.teamPersonality }
    ]
  };
}

export function findTurningPoint(result: GameResult): GameEvent | undefined {
  const decisiveGoalTeam =
    result.finalScore.home > result.finalScore.away ? result.homeTeamId : result.finalScore.away > result.finalScore.home ? result.awayTeamId : undefined;
  const goals = result.eventTimeline.filter((event) => event.type === "goal" || event.type === "powerPlayGoal");
  return (
    [...goals].reverse().find((event) => "teamId" in event && event.teamId === decisiveGoalTeam) ??
    result.eventTimeline.find((event) => event.type === "momentumSwing") ??
    goals[goals.length - 1] ??
    result.eventTimeline[0]
  );
}

export function createGameNarrativeBeats(result: GameResult, teams: Team[], reducedMotion = false): NarrativeBeat[] {
  const home = findTeam(teams, result.homeTeamId);
  const away = findTeam(teams, result.awayTeamId);
  const turningPoint = findTurningPoint(result);
  const winner = result.finalScore.home > result.finalScore.away ? home : away;
  return [
    {
      id: `${result.id}-intro`,
      label: "Broadcast Intro",
      body: `${away.fullName} at ${home.fullName}: ${away.abbreviation} ${result.finalScore.away}, ${home.abbreviation} ${result.finalScore.home}.`,
      animation: !reducedMotion
    },
    {
      id: `${result.id}-turning-point`,
      label: "Turning Point",
      body: turningPoint?.description ?? `${winner.fullName} found the cleaner game state late.`,
      animation: !reducedMotion
    },
    {
      id: `${result.id}-clipboard`,
      label: "Coach's Clipboard",
      body: result.coachNotes[0] ?? `${winner.nickname} managed the game state well enough to tilt the final sheet.`,
      animation: false
    },
    {
      id: `${result.id}-final`,
      label: "Final Horn",
      body: `${winner.fullName} leave the arena with a ${Math.max(result.finalScore.home, result.finalScore.away)}-${Math.min(result.finalScore.home, result.finalScore.away)} result${result.finalScore.overtime ? " after overtime" : ""}.`,
      animation: !reducedMotion
    }
  ];
}

export function createThreeStarsPresentation(result: GameResult, teams: Team[]): ThreeStarsPresentation {
  return {
    title: "Three Stars",
    stars: result.threeStars.map((star, index) => {
      const team = findTeam(teams, star.teamId);
      const player = team.roster.find((candidate) => candidate.id === star.playerId);
      return {
        rank: index + 1,
        playerName: player?.displayName ?? "Fictional skater",
        teamName: team.fullName,
        reason: star.reason
      };
    })
  };
}

export function createFanReactionFromResult(franchise: FranchiseState, result: GameResult): string {
  const team = findTeam(franchise.league.teams, franchise.selectedTeamId);
  const userHome = result.homeTeamId === team.id;
  const won = userHome ? result.finalScore.home > result.finalScore.away : result.finalScore.away > result.finalScore.home;
  if (won && result.finalScore.overtime) return `${team.nickname} fans are loud about surviving overtime and banking the result.`;
  if (won) return `${team.nickname} fans leave warmer about the plan after a clean win.`;
  if (Math.abs(result.finalScore.home - result.finalScore.away) >= 3) return `${team.nickname} fans want answers after a rough night.`;
  return `${team.nickname} fans are split: the margin was close, but the points stayed elsewhere.`;
}

export function createMediaPromptFromResult(franchise: FranchiseState, result: GameResult): string | undefined {
  const team = findTeam(franchise.league.teams, franchise.selectedTeamId);
  const userHome = result.homeTeamId === team.id;
  const won = userHome ? result.finalScore.home > result.finalScore.away : result.finalScore.away > result.finalScore.home;
  if (!won && Math.abs(result.finalScore.home - result.finalScore.away) >= 3) return "Media question: How do you explain the breakdown and who responds next?";
  if (won && result.threeStars.some((star) => star.teamId === team.id)) return "Media question: Was tonight a statement about your room buying in?";
  if (result.injuries.some((injury) => injury.teamId === team.id)) return "Media question: How does the injury change tomorrow's lineup plan?";
  return undefined;
}

function findTeam(teams: Team[], teamId: string): Team {
  return teams.find((team) => team.id === teamId) ?? teams[0];
}
