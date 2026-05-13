import { recordString, sortStandings } from "./standings";
import type { AwardEntry, FranchiseState, Player, SeasonHistory, TimelineItem } from "../types";

export function createSeasonHistory(franchise: FranchiseState): SeasonHistory {
  const standings = sortStandings(franchise.league.teams);
  const selected = franchise.league.teams.find((team) => team.id === franchise.selectedTeamId)!;
  const selectedRank = standings.findIndex((team) => team.id === selected.id) + 1;
  const champion = franchise.playoffState?.championTeamId;
  return {
    seasonYear: franchise.league.seasonYear,
    championTeamId: champion,
    selectedTeamRecord: recordString(selected),
    selectedTeamFinish: `#${selectedRank} of ${franchise.league.teams.length}`,
    selectedTeamPlayoffResult: describeSelectedPlayoffResult(franchise),
    standingsSnapshot: standings.map((team, index) => ({
      teamId: team.id,
      rank: index + 1,
      wins: team.record.wins,
      losses: team.record.losses,
      overtimeLosses: team.record.overtimeLosses,
      points: team.record.points,
      goalDifferential: team.record.goalsFor - team.record.goalsAgainst
    })),
    topScorer: getTopScorerForSeason(franchise)?.displayName ?? "No scorer recorded",
    bestGoalie: getBestGoalieForSeason(franchise)?.displayName ?? "No goalie recorded",
    majorStories: [
      champion ? `${teamName(franchise, champion)} lifted the championship banner.` : "Champion still undecided.",
      `${selected.fullName} finished ${recordString(selected)} with ${selected.record.points} points.`,
      franchise.history.draftHistory.filter((selection) => selection.year === franchise.league.seasonYear).length
        ? "Draft board assets were archived into the franchise file."
        : "Draft history will populate after the draft."
    ]
  };
}

export function createAwards(franchise: FranchiseState): AwardEntry[] {
  const seasonYear = franchise.league.seasonYear;
  const allPlayers = franchise.league.teams.flatMap((team) => team.roster);
  const mvp = [...allPlayers].sort((a, b) => playerPoints(b) - playerPoints(a) || b.overall - a.overall)[0];
  const goalie = getBestGoalieForSeason(franchise);
  const rookie = [...allPlayers].filter((player) => player.age <= 21).sort((a, b) => playerPoints(b) + b.overall * 0.5 - (playerPoints(a) + a.overall * 0.5))[0];
  const defenseman = [...allPlayers]
    .filter((player) => player.position === "LD" || player.position === "RD")
    .sort((a, b) => playerPoints(b) + b.overall * 0.8 - (playerPoints(a) + a.overall * 0.8))[0];
  const champion = franchise.playoffState?.championTeamId;
  const storyTeam = champion ? franchise.league.teams.find((team) => team.id === champion) : sortStandings(franchise.league.teams)[0];

  return [
    award("mvp", seasonYear, "Most Valuable Player", mvp, `${mvp?.displayName ?? "A quiet leader"} drove the scoring race.`),
    award("goalie", seasonYear, "Top Goalie", goalie, `${goalie?.displayName ?? "A steady goalie"} owned the crease by the numbers.`),
    award("rookie", seasonYear, "Top Rookie", rookie, `${rookie?.displayName ?? "A young player"} made the strongest early impression.`),
    award("defense", seasonYear, "Best Defenseman", defenseman, `${defenseman?.displayName ?? "A blue-line anchor"} shaped play at both ends.`),
    {
      id: `award-story-${seasonYear}`,
      seasonYear,
      award: "Coach/GM Story",
      teamId: storyTeam?.id,
      displayName: storyTeam?.fullName ?? "League Office",
      reason: champion ? "Champion front office gets the headline." : "Best regular-season story gets the headline."
    }
  ];
}

export function archiveChampion(franchise: FranchiseState): FranchiseState {
  const championTeamId = franchise.playoffState?.championTeamId;
  if (!championTeamId || franchise.history.champions.some((entry) => entry.seasonYear === franchise.league.seasonYear)) return franchise;
  return {
    ...franchise,
    history: {
      ...franchise.history,
      champions: [
        {
          seasonYear: franchise.league.seasonYear,
          teamId: championTeamId,
          teamName: teamName(franchise, championTeamId)
        },
        ...franchise.history.champions
      ]
    }
  };
}

export function createFranchiseTimeline(franchise: FranchiseState): TimelineItem[] {
  const seasons = franchise.history.seasons.map((season) => ({
    id: `timeline-season-${season.seasonYear}`,
    date: `${season.seasonYear}`,
    title: `${season.seasonYear} season archived`,
    body: `${season.selectedTeamFinish} | ${season.selectedTeamPlayoffResult}`,
    type: "season" as const
  }));
  const drafts = franchise.history.draftHistory
    .filter((selection) => selection.teamId === franchise.selectedTeamId)
    .slice(0, 8)
    .map((selection) => ({
      id: `timeline-draft-${selection.id}`,
      date: `${selection.year}`,
      title: `Drafted ${selection.prospectName}`,
      body: `Round ${selection.round}, Pick ${selection.pickNumber} | ${selection.visibleGrade}`,
      type: "draft" as const
    }));
  const transactions = franchise.transactionLog
    .filter((item) => item.teamIds?.includes(franchise.selectedTeamId))
    .slice(0, 10)
    .map((item) => ({
      id: `timeline-transaction-${item.id}`,
      date: item.date,
      title: item.headline,
      body: item.details,
      type: item.type === "retirement" ? "retirement" : item.type === "staff" ? "staff" : item.type === "freeAgency" ? "freeAgency" : "contract"
    })) satisfies TimelineItem[];
  return [...transactions, ...drafts, ...seasons].slice(0, 18);
}

export function getTopScorerForSeason(franchise: FranchiseState): Player | undefined {
  return franchise.league.teams
    .flatMap((team) => team.roster)
    .filter((player) => player.position !== "G")
    .sort((a, b) => playerPoints(b) - playerPoints(a) || b.stats.goals - a.stats.goals)[0];
}

export function getBestGoalieForSeason(franchise: FranchiseState): Player | undefined {
  return franchise.league.teams
    .flatMap((team) => team.roster)
    .filter((player) => player.position === "G")
    .sort((a, b) => goalieScore(b) - goalieScore(a))[0];
}

function award(id: string, seasonYear: number, awardName: AwardEntry["award"], player: Player | undefined, reason: string): AwardEntry {
  return {
    id: `award-${id}-${seasonYear}`,
    seasonYear,
    award: awardName,
    playerId: player?.id,
    teamId: player?.teamId,
    displayName: player?.displayName ?? "Not awarded",
    reason
  };
}

function describeSelectedPlayoffResult(franchise: FranchiseState): string {
  const teamId = franchise.selectedTeamId;
  if (!franchise.playoffState) return "No playoff bracket";
  if (franchise.playoffState.championTeamId === teamId) return "Champion";
  const latestElimination = [...franchise.playoffState.bracket].reverse().find((series) => series.completed && [series.homeSeedTeamId, series.awaySeedTeamId].includes(teamId));
  if (!franchise.playoffState.qualifiedTeamIds.includes(teamId)) return "Missed playoffs";
  if (!latestElimination) return "Qualified";
  return `Eliminated in Round ${latestElimination.round}`;
}

function teamName(franchise: FranchiseState, teamId: string): string {
  return franchise.league.teams.find((team) => team.id === teamId)?.fullName ?? teamId;
}

function playerPoints(player: Player): number {
  return player.stats.points || player.stats.goals + player.stats.assists;
}

function goalieScore(player: Player): number {
  const shots = Math.max(1, player.stats.saves + player.stats.goalsAgainst);
  const savePct = player.stats.saves / shots;
  return player.stats.goalieWins * 3 + player.stats.shutouts * 5 + savePct * 100 + player.overall * 0.25;
}
