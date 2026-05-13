import { sortStandings } from "../../game/systems/standings";
import { createSeasonCompleteSummary, createSeasonPulse } from "../../game/systems/seasonSummary";
import { useFranchiseStore } from "../../store/franchiseStore";

export function StandingsPanel() {
  const franchise = useFranchiseStore((state) => state.franchise);
  if (!franchise) return null;
  const standings = sortStandings(franchise.league.teams);
  const selectedTeam = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId)!;
  const pulse = createSeasonPulse(franchise.league, franchise.selectedTeamId);

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
                <th>GP</th>
                <th>W</th>
                <th>L</th>
                <th>OTL</th>
                <th>PTS</th>
                <th>GF</th>
                <th>GA</th>
                <th>DIFF</th>
                <th>Streak</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team, index) => (
                <tr key={team.id} className={team.id === franchise.selectedTeamId ? "is-selected" : ""}>
                  <td>{index + 1}</td>
                  <td>{team.fullName}</td>
                  <td>{team.stats.gamesPlayed}</td>
                  <td>{team.record.wins}</td>
                  <td>{team.record.losses}</td>
                  <td>{team.record.overtimeLosses}</td>
                  <td>{team.record.points}</td>
                  <td>{team.record.goalsFor}</td>
                  <td>{team.record.goalsAgainst}</td>
                  <td>{team.record.goalsFor - team.record.goalsAgainst}</td>
                  <td>{team.record.streak}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel-section">
        <h3>Selected Team Pulse</h3>
        <div className="season-pulse">
          <span>Current rank <strong>{pulse.rank}/12</strong></span>
          <span>Points pace <strong>{pulse.pointsPace}</strong></span>
          <span>Fan confidence <strong>{pulse.fanConfidence}</strong></span>
          <span>Owner patience <strong>{pulse.ownerPatience}</strong></span>
          <span>Top scorer <strong>{pulse.topScorer}</strong></span>
          <span>Best goalie <strong>{pulse.bestGoalie}</strong></span>
          <span>Biggest concern <strong>{pulse.biggestConcern}</strong></span>
        </div>
        <h3>Current Playoff Picture</h3>
        <p className="muted">Placeholder projection only. Playoffs arrive in Phase 2.</p>
        <div className="hunt-list">
          {standings.slice(0, 4).map((team, index) => (
            <article className={team.id === selectedTeam.id ? "is-selected" : ""} key={team.id}>
              <span>#{index + 1}</span>
              <strong>{team.fullName}</strong>
              <small>In the hunt | {team.record.points} pts</small>
            </article>
          ))}
        </div>
        <h3>Trophy Hall Notes</h3>
        {franchise.league.completed ? (
          <SeasonSummary selectedTeamId={franchise.selectedTeamId} />
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

function SeasonSummary({ selectedTeamId }: { selectedTeamId: string }) {
  const franchise = useFranchiseStore((state) => state.franchise)!;
  const team = franchise.league.teams.find((candidate) => candidate.id === selectedTeamId)!;
  const summary = createSeasonCompleteSummary(franchise.league, selectedTeamId);
  return (
    <div className="season-summary">
      <strong>{team.fullName}: Season Complete</strong>
      <span>Final record: {summary.finalRecord}</span>
      <span>League rank: {summary.leagueRank}/12</span>
      <span>Goals for/against: {summary.goalsFor}/{summary.goalsAgainst}</span>
      <span>Top scorer: {summary.topScorer}</span>
      <span>Best goalie: {summary.bestGoalie}</span>
      <span>Best win: {summary.bestWin}</span>
      <span>Worst loss: {summary.worstLoss}</span>
      <span>Owner reaction: {summary.ownerReaction}</span>
      <span>Fan reaction: {summary.fanReaction}</span>
      <span>{summary.phaseTwoNote}</span>
    </div>
  );
}
