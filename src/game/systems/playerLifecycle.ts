import { emptyStats } from "../generators/generatePlayers";
import { SeededRng, clamp } from "../rng";
import { contractSummary } from "./contracts";
import { autoFillBestLineup } from "./lineupValidation";
import { calculateTeamStaffModifiers } from "./staff";
import type { FranchiseState, NewsItem, Player, Team, TransactionLogItem } from "../types";

export function agePlayers(franchise: FranchiseState): FranchiseState {
  return mapPlayers(franchise, (player) => ({ ...player, age: player.age + 1 }));
}

export function decrementContracts(franchise: FranchiseState): FranchiseState {
  return mapPlayers(franchise, (player) => {
    const contract = { ...player.contract, yearsRemaining: Math.max(0, player.contract.yearsRemaining - 1) };
    return { ...player, contract, contractSummary: contractSummary(contract) };
  });
}

export function recoverFatigueAndInjuries(franchise: FranchiseState): FranchiseState {
  return {
    ...franchise,
    league: {
      ...franchise.league,
      teams: franchise.league.teams.map((team) => {
        const medical = calculateTeamStaffModifiers(franchise.staffState, team.id).medical;
        return {
          ...team,
          roster: team.roster.map((player) => {
            const remaining = Math.max(0, player.injuryGamesRemaining - (3 + Math.round(Math.max(0, medical))));
            return {
              ...player,
              fatigue: clamp(Math.round(player.fatigue * 0.28 - medical * 1.4), 0, 100),
              injuryGamesRemaining: remaining,
              injuryStatus: remaining === 0 ? "healthy" : remaining <= 2 ? "day-to-day" : "out"
            };
          })
        };
      })
    }
  };
}

export function resetPlayerSeasonStats(franchise: FranchiseState): FranchiseState {
  return mapPlayers(franchise, (player) => ({
    ...player,
    careerHistory: [
      ...(player.careerHistory ?? []),
      {
        seasonYear: franchise.league.seasonYear,
        teamId: player.teamId,
        stats: player.stats,
        overallAtEnd: player.overall,
        contractSummary: player.contractSummary
      }
    ].slice(-10),
    stats: emptyStats()
  }));
}

export function runRetirements(franchise: FranchiseState, rng = new SeededRng(`${franchise.franchiseId}-retirements-${franchise.league.seasonYear}`)): FranchiseState {
  const retired: Player[] = [];
  const teams = franchise.league.teams.map((team) => {
    const roster = team.roster.filter((player) => {
      const chance = retirementChance(player);
      const retires = rng.chance(chance);
      if (retires) retired.push(player);
      return !retires;
    });
    const nextTeam = { ...team, roster };
    return { ...nextTeam, lines: autoFillBestLineup(nextTeam).lineup };
  });
  if (!retired.length) return franchise;
  const news = retired.slice(0, 6).map((player): NewsItem => ({
    id: `retirement-${player.id}-${franchise.league.seasonYear}`,
    type: "retirement",
    date: franchise.league.currentDate,
    headline: `Offseason Desk: ${player.displayName} retires`,
    body: `${player.age}-year-old ${player.position} closes the book after a fictional career spent around the league.`,
    severity: player.overall >= 80 ? "medium" : "low",
    teamId: player.teamId,
    playerId: player.id
  }));
  const logs = retired.map((player): TransactionLogItem => ({
    id: `retire-log-${player.id}-${franchise.league.seasonYear}`,
    date: franchise.league.currentDate,
    type: "retirement",
    headline: `${player.displayName} retired`,
    details: `${player.position}, age ${player.age}, ${player.overall} OVR.`,
    teamIds: [player.teamId],
    playerIds: [player.id]
  }));
  return {
    ...franchise,
    league: { ...franchise.league, teams },
    offseasonState: {
      ...(franchise.offseasonState ?? {
        year: franchise.league.seasonYear,
        retiredPlayerIds: [],
        retiredPlayerNames: [],
        reSigningCompleted: false,
        trainingCampCompleted: false,
        phaseLog: []
      }),
      retiredPlayerIds: [...(franchise.offseasonState?.retiredPlayerIds ?? []), ...retired.map((player) => player.id)],
      retiredPlayerNames: [...(franchise.offseasonState?.retiredPlayerNames ?? []), ...retired.map((player) => player.displayName)]
    },
    inbox: [...news, ...franchise.inbox].slice(0, 60),
    transactionLog: [...logs, ...franchise.transactionLog].slice(0, 60)
  };
}

export function applyOffseasonDevelopment(franchise: FranchiseState, rng = new SeededRng(`${franchise.franchiseId}-offseason-dev-${franchise.league.seasonYear}`)): FranchiseState {
  return {
    ...franchise,
    league: {
      ...franchise.league,
      teams: franchise.league.teams.map((team) => {
        const mods = calculateTeamStaffModifiers(franchise.staffState, team.id);
        return {
          ...team,
          roster: team.roster.map((player) => progressOrRegress(player, mods.development, rng))
        };
      })
    }
  };
}

export function createRetirementNews(player: Player, date: string): NewsItem {
  return {
    id: `retirement-${player.id}-${date}`,
    type: "retirement",
    date,
    headline: `Offseason Desk: ${player.displayName} retires`,
    body: `${player.position} retires at age ${player.age}.`,
    severity: player.overall >= 80 ? "medium" : "low",
    teamId: player.teamId,
    playerId: player.id
  };
}

function progressOrRegress(player: Player, staffMod: number, rng: SeededRng): Player {
  const youthChance = player.age <= 23 ? 0.48 : player.age <= 26 ? 0.28 : 0.08;
  const declineChance = player.age >= 34 ? 0.42 : player.age >= 31 ? 0.2 : 0.04;
  const upside = Math.max(0, player.potential - player.overall);
  let overall = player.overall;
  let potential = player.potential;
  const developmentRoll = youthChance + upside * 0.012 + staffMod * 0.018 - player.fatigue * 0.001;
  if (rng.chance(developmentRoll) && overall < potential) overall += 1;
  if (rng.chance(declineChance + Math.max(0, player.fatigue - 65) * 0.003)) overall -= 1;
  if (player.age >= 32 && rng.chance(0.18)) potential -= 1;
  return {
    ...player,
    overall: clamp(overall, 40, 99),
    potential: clamp(Math.max(potential, overall), 40, 99),
    form: clamp(52 + rng.int(-8, 10), 0, 100),
    morale: clamp(player.morale + rng.int(-2, 4), 0, 100)
  };
}

function retirementChance(player: Player): number {
  if (player.age < 35) return player.age >= 33 && player.overall <= 61 ? 0.08 : 0.01;
  const age = (player.age - 34) * 0.06;
  const quality = player.overall >= 84 ? -0.12 : player.overall <= 68 ? 0.16 : 0;
  const health = player.injuryStatus === "out" ? 0.08 : player.fatigue >= 80 ? 0.04 : 0;
  return clamp(0.08 + age + quality + health, 0.01, 0.72);
}

function mapPlayers(franchise: FranchiseState, updater: (player: Player, team: Team) => Player): FranchiseState {
  return {
    ...franchise,
    league: {
      ...franchise.league,
      teams: franchise.league.teams.map((team) => ({
        ...team,
        roster: team.roster.map((player) => updater(player, team))
      }))
    }
  };
}
