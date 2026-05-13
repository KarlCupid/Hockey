import { sortStandings } from "../../game/systems/standings";
import { useFranchiseStore } from "../../store/franchiseStore";

export function StandingsPanel() {
  const franchise = useFranchiseStore((state) => state.franchise);
  if (!franchise) return null;
  const standings = sortStandings(franchise.league.teams);

  return (
    <div className="room-grid room-grid--two">
      <section className="panel-section">
        <h3>League Standings</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Team</th>
                <th>W</th>
                <th>L</th>
                <th>OTL</th>
                <th>PTS</th>
                <th>GF</th>
                <th>GA</th>
                <th>Streak</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team, index) => (
                <tr key={team.id} className={team.id === franchise.selectedTeamId ? "is-selected" : ""}>
                  <td>{index + 1}</td>
                  <td>{team.fullName}</td>
                  <td>{team.record.wins}</td>
                  <td>{team.record.losses}</td>
                  <td>{team.record.overtimeLosses}</td>
                  <td>{team.record.points}</td>
                  <td>{team.record.goalsFor}</td>
                  <td>{team.record.goalsAgainst}</td>
                  <td>{team.record.streak}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel-section">
        <h3>Trophy Hall Notes</h3>
        {franchise.league.completed ? (
          <SeasonSummary />
        ) : (
          <p className="empty-state">Season summary unlocks after Game 22. Right now every point is still up for argument.</p>
        )}
        <h3>Recent League Results</h3>
        {franchise.league.recentResults.length ? (
          <ul className="compact-list">
            {franchise.league.recentResults.map((result) => (
              <li key={result}>{result}</li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">No league results yet.</p>
        )}
      </section>
    </div>
  );
}

function SeasonSummary() {
  const franchise = useFranchiseStore((state) => state.franchise)!;
  const team = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId)!;
  const rank = sortStandings(franchise.league.teams).findIndex((candidate) => candidate.id === team.id) + 1;
  const topScorer = [...team.roster].sort((a, b) => b.stats.points - a.stats.points)[0];
  const bestGoalie = [...team.roster].filter((player) => player.position === "G").sort((a, b) => b.stats.goalieWins - a.stats.goalieWins)[0];
  return (
    <div className="season-summary">
      <strong>{team.fullName}: Season Complete</strong>
      <span>Final rank: {rank}/12</span>
      <span>Top scorer: {topScorer.displayName}, {topScorer.stats.points} points</span>
      <span>Best goalie: {bestGoalie.displayName}, {bestGoalie.stats.goalieWins} wins</span>
      <span>{team.fanConfidence > 60 ? "Fans believe the room is moving forward." : "Fans want a sharper plan by camp."}</span>
    </div>
  );
}
