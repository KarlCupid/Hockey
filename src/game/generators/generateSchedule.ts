import { START_DATE } from "../constants";
import type { ScheduleGame, Team } from "../types";

export function generateSchedule(teams: Team[], targetGamesPerTeam?: number): ScheduleGame[] {
  const ids = teams.map((team) => team.id);
  const rounds = createRoundRobin(ids);
  const mirroredRounds = [...rounds, ...rounds.map((round) => round.map(([home, away]) => [away, home] as [string, string]))];
  const desiredDays = Math.max(1, Math.round(targetGamesPerTeam ?? mirroredRounds.length));
  const scheduledRounds = Array.from({ length: desiredDays }, (_, index) => {
    const round = mirroredRounds[index % mirroredRounds.length];
    const cycle = Math.floor(index / mirroredRounds.length);
    return cycle % 2 === 0 ? round : round.map(([home, away]) => [away, home] as [string, string]);
  });
  const schedule: ScheduleGame[] = [];
  const start = new Date(`${START_DATE}T12:00:00Z`);

  scheduledRounds.forEach(
    (round, dayIndex) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + dayIndex * 2);
      round.forEach(([homeTeamId, awayTeamId], gameIndex) => {
        schedule.push({
          id: `day-${dayIndex + 1}-game-${gameIndex + 1}`,
          dayIndex,
          date: date.toISOString().slice(0, 10),
          homeTeamId,
          awayTeamId,
          played: false
        });
      });
    }
  );

  return schedule;
}

function createRoundRobin(ids: string[]): Array<Array<[string, string]>> {
  const teams = [...ids];
  const rounds: Array<Array<[string, string]>> = [];
  const n = teams.length;

  for (let round = 0; round < n - 1; round += 1) {
    const games: Array<[string, string]> = [];
    for (let i = 0; i < n / 2; i += 1) {
      const home = teams[i];
      const away = teams[n - 1 - i];
      games.push(round % 2 === 0 ? [home, away] : [away, home]);
    }
    rounds.push(games);
    teams.splice(1, 0, teams.pop() as string);
  }

  return rounds;
}
