import { sortStandings } from "../../game/systems/standings";
import { createSeasonCompleteSummary, createSeasonPulse } from "../../game/systems/seasonSummary";
import { createFranchiseTimeline } from "../../game/systems/history";
import { getAchievementSummary } from "../../game/systems/achievements";
import { getRecentMilestones } from "../../game/systems/milestones";
import { useFranchiseStore } from "../../store/franchiseStore";

export function StandingsPanel() {
  const franchise = useFranchiseStore((state) => state.franchise);
  if (!franchise) return null;
  const standings = sortStandings(franchise.league.teams);
  const selectedTeam = franchise.league.teams.find((candidate) => candidate.id === franchise.selectedTeamId)!;
  const pulse = createSeasonPulse(franchise.league, franchise.selectedTeamId);
  const timeline = createFranchiseTimeline(franchise);
  const achievementSummary = getAchievementSummary(franchise);
  const recentMilestones = getRecentMilestones(franchise, 8);

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
        <p className="muted">{franchise.seasonPhase === "playoffs" ? "Best-of-five fictional league bracket." : "Top eight qualify for the simplified best-of-five playoffs."}</p>
        <div className="hunt-list">
          {standings.slice(0, 8).map((team, index) => (
            <article className={team.id === selectedTeam.id ? "is-selected" : ""} key={team.id}>
              <span>#{index + 1}</span>
              <strong>{team.fullName}</strong>
              <small>{index < 8 ? "Playoff line" : "In the hunt"} | {team.record.points} pts</small>
            </article>
          ))}
        </div>
        {franchise.playoffState && (
          <>
            <h3>Playoff Bracket</h3>
            <div className="asset-list">
              {franchise.playoffState.bracket.map((series) => {
                const high = franchise.league.teams.find((team) => team.id === series.homeSeedTeamId)!;
                const low = franchise.league.teams.find((team) => team.id === series.awaySeedTeamId)!;
                return (
                  <article key={series.id}>
                    <strong>Round {series.round}: {high.abbreviation} {series.homeWins} - {series.awayWins} {low.abbreviation}</strong>
                    <span>{series.completed ? `Winner: ${franchise.league.teams.find((team) => team.id === series.winnerTeamId)?.fullName}` : "Series active"}</span>
                  </article>
                );
              })}
            </div>
          </>
        )}
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
        <h3>Champion History</h3>
        <div className="asset-list asset-list--compact">
          {franchise.history.champions.length ? (
            franchise.history.champions.map((champion) => (
              <article key={`${champion.seasonYear}-${champion.teamId}`}>
                <strong>{champion.seasonYear}: {champion.teamName}</strong>
                <span>Champion banner archived.</span>
              </article>
            ))
          ) : (
            <p className="empty-state">No champions archived yet.</p>
          )}
        </div>
        <h3>Awards</h3>
        <div className="asset-list asset-list--compact">
          {franchise.history.awards.slice(0, 8).map((award) => (
            <article key={award.id}>
              <strong>{award.award}: {award.displayName}</strong>
              <span>{award.seasonYear} | {award.reason}</span>
            </article>
          ))}
          {!franchise.history.awards.length && <p className="empty-state">Award cards unlock when a season is archived.</p>}
        </div>
        <h3>Achievements</h3>
        <div className="season-pulse">
          <span>Unlocked <strong>{achievementSummary.unlocked}/{achievementSummary.total}</strong></span>
          <span>Completion <strong>{achievementSummary.percent}%</strong></span>
        </div>
        <div className="asset-list asset-list--compact">
          {franchise.achievements.map((achievement) => (
            <article key={achievement.id} className={achievement.unlockedAt ? "achievement-card is-unlocked" : "achievement-card"}>
              <strong>{achievement.unlockedAt ? achievement.label : achievement.hidden ? "Hidden achievement" : achievement.label}</strong>
              <span>{achievement.unlockedAt ? `Unlocked ${achievement.unlockedAt}` : achievement.description}</span>
              <small>{achievement.progress}/{achievement.target} | {achievement.category}</small>
            </article>
          ))}
        </div>
        <h3>Franchise Milestones</h3>
        <div className="asset-list asset-list--compact">
          {recentMilestones.length ? recentMilestones.map((milestone) => (
            <article key={milestone.id} className={`milestone-card milestone-card--${milestone.importance}`}>
              <strong>{milestone.date} | {milestone.headline}</strong>
              <span>{milestone.body}</span>
            </article>
          )) : <p className="empty-state">Milestones unlock from wins, trades, draft picks, playoff moments, owner goals, and season transitions.</p>}
        </div>
        <h3>Franchise Timeline</h3>
        <div className="asset-list asset-list--compact">
          {timeline.length ? (
            timeline.map((item) => (
              <article key={item.id}>
                <strong>{item.date} | {item.title}</strong>
                <span>{item.body}</span>
              </article>
            ))
          ) : (
            <p className="empty-state">Your dynasty timeline starts after the first major transaction or season archive.</p>
          )}
        </div>
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
