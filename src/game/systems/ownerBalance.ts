import { createFranchise } from "../generators/generateLeague";
import { SeededRng } from "../rng";
import type { OwnerGoal } from "../types";
import { evaluateJobSecurity, generateOwnerGoals } from "./owner";

export interface OwnerGoalBalanceSample {
  seeds: string[];
  completionRate: number;
  averageSecurityDelta: number;
  rebuildingGoalMix: OwnerGoal["type"][];
  contenderGoalMix: OwnerGoal["type"][];
}

export function runOwnerGoalBalanceSample(seeds = ["owner-a", "owner-b", "owner-c", "owner-d"]): OwnerGoalBalanceSample {
  let completed = 0;
  let total = 0;
  let delta = 0;
  const rebuildingGoalMix = new Set<OwnerGoal["type"]>();
  const contenderGoalMix = new Set<OwnerGoal["type"]>();

  seeds.forEach((seed, index) => {
    const franchise = createFranchise("harbor-city", seed);
    const selected = franchise.league.teams.find((team) => team.id === franchise.selectedTeamId)!;
    const successful = {
      ...franchise,
      league: {
        ...franchise.league,
        teams: franchise.league.teams.map((team) =>
          team.id === selected.id
            ? {
                ...team,
                record: { ...team.record, wins: 15, losses: 5, overtimeLosses: 2, points: 32 },
                stats: { ...team.stats, gamesPlayed: 22 }
              }
            : team
        )
      }
    };
    const evaluated = evaluateJobSecurity(successful);
    delta += evaluated.jobSecurity - successful.ownerState.jobSecurity;
    completed += evaluated.seasonGoals.filter((goal) => goal.status === "met").length;
    total += evaluated.seasonGoals.length;

    const rebuilding = {
      ...franchise,
      league: {
        ...franchise.league,
        teams: franchise.league.teams.map((team) =>
          team.id === selected.id
            ? {
                ...team,
                record: { ...team.record, wins: 5, losses: 16, overtimeLosses: 1, points: 11 },
                stats: { ...team.stats, gamesPlayed: 22 }
              }
            : team
        )
      }
    };
    generateOwnerGoals(rebuilding, new SeededRng(`${seed}-rebuild-${index}`)).forEach((goal) => rebuildingGoalMix.add(goal.type));

    const contender = {
      ...franchise,
      league: {
        ...franchise.league,
        teams: franchise.league.teams.map((team) =>
          team.id === selected.id
            ? {
                ...team,
                record: { ...team.record, wins: 16, losses: 4, overtimeLosses: 2, points: 34 },
                stats: { ...team.stats, gamesPlayed: 22 },
                roster: team.roster.map((player) => ({ ...player, overall: Math.max(player.overall, 75) }))
              }
            : team
        )
      }
    };
    generateOwnerGoals(contender, new SeededRng(`${seed}-contender-${index}`)).forEach((goal) => contenderGoalMix.add(goal.type));
  });

  return {
    seeds,
    completionRate: total ? Number((completed / total).toFixed(3)) : 0,
    averageSecurityDelta: seeds.length ? Number((delta / seeds.length).toFixed(3)) : 0,
    rebuildingGoalMix: Array.from(rebuildingGoalMix),
    contenderGoalMix: Array.from(contenderGoalMix)
  };
}
