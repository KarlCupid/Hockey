import { useEffect } from "react";
import { useUiStore } from "../../store/uiStore";
import { upcomingOpponent, recordLabel, selectedTeam } from "../../store/franchiseStore";
import { useFranchiseStore } from "../../store/franchiseStore";
import { SaveLoadPanel } from "./SaveLoadPanel";

export function GMOfficePanel() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const simulateInstantNextGame = useFranchiseStore((state) => state.simulateInstantNextGame);
  const setActiveRoom = useUiStore((state) => state.setActiveRoom);
  const markChecklistItem = useUiStore((state) => state.markChecklistItem);
  useEffect(() => {
    markChecklistItem("readInbox");
  }, [markChecklistItem]);
  if (!franchise) return null;
  const team = selectedTeam(franchise);
  const opponent = upcomingOpponent(franchise);
  const userSchedule = franchise.league.schedule
    .filter((game) => game.homeTeamId === team.id || game.awayTeamId === team.id)
    .slice(Math.max(0, team.stats.gamesPlayed - 1), team.stats.gamesPlayed + 5);
  const mood = team.ownerPatience < 38 ? "Demanding" : team.ownerPatience < 62 ? "Concerned" : "Patient";
  const fan = team.fanConfidence < 42 ? "Falling" : team.fanConfidence < 66 ? "Stable" : "Rising";

  return (
    <div className="room-stack">
      <section className="command-strip">
        <div>
          <small>Next Game</small>
          <strong>{opponent ? `${team.fullName} vs ${opponent.fullName}` : "Season Complete"}</strong>
        </div>
        <div>
          <small>Record</small>
          <strong>{recordLabel(team)}</strong>
        </div>
        <div>
          <small>Owner Mood</small>
          <strong>{mood}</strong>
        </div>
        <div>
          <small>Fan Confidence</small>
          <strong>{fan}</strong>
        </div>
        <button type="button" onClick={() => setActiveRoom("arena")} disabled={!opponent}>
          Go to Arena
        </button>
        <button
          type="button"
          onClick={() => {
            markChecklistItem("simulateGame");
            void simulateInstantNextGame();
          }}
          disabled={!opponent}
        >
          Instant Sim Next Game
        </button>
      </section>
      <div className="room-grid room-grid--two">
        <section className="panel-section">
          <h3>Inbox / News</h3>
          <div className="news-list">
            {franchise.inbox.map((item) => (
              <article className={`news-item news-item--${item.severity}`} key={item.id}>
                <small>{item.date} | {item.type} | {item.severity} priority</small>
                <strong>{item.headline}</strong>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="panel-section">
          <h3>Calendar & Recent Results</h3>
          <div className="calendar-card">
            <strong>{franchise.league.currentDate}</strong>
            <span>Regular season day {franchise.league.currentDayIndex + 1} of 22</span>
          </div>
          <h4>Schedule</h4>
          <div className="schedule-list">
            {userSchedule.map((game) => {
              const home = franchise.league.teams.find((candidate) => candidate.id === game.homeTeamId)!;
              const away = franchise.league.teams.find((candidate) => candidate.id === game.awayTeamId)!;
              const matchup = `${away.abbreviation} @ ${home.abbreviation}`;
              return (
                <article className={game.played ? "schedule-row schedule-row--played" : "schedule-row"} key={game.id}>
                  <span>{game.date}</span>
                  <strong>{matchup}</strong>
                  <small>
                    {game.played && game.result
                      ? `${game.result.awayGoals}-${game.result.homeGoals}${game.result.overtime ? " OT" : ""}`
                      : game.dayIndex === franchise.league.currentDayIndex
                        ? "Next game"
                        : "Upcoming"}
                  </small>
                </article>
              );
            })}
          </div>
          <h4>Recent League Results</h4>
          {franchise.league.recentResults.length ? (
            <ul className="compact-list">
              {franchise.league.recentResults.slice(0, 8).map((result) => (
                <li key={result}>{result}</li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No results yet. The room is quiet before puck drop.</p>
          )}
          <h4>Front Office Expansion</h4>
          <p className="muted">Contracts, trades, scouting, and development now feed the same inbox and local save.</p>
          <div className="button-row">
            <button type="button" onClick={() => setActiveRoom("contracts")}>Cap Office</button>
            <button type="button" onClick={() => setActiveRoom("trades")}>Trade Room</button>
            <button type="button" onClick={() => setActiveRoom("scouting")}>Scouting</button>
            <button type="button" onClick={() => setActiveRoom("development")}>Development</button>
          </div>
          <h4>Transaction Log</h4>
          {franchise.transactionLog.length ? (
            <div className="asset-list asset-list--compact">
              {franchise.transactionLog.slice(0, 8).map((item) => (
                <article key={item.id}>
                  <strong>{item.headline}</strong>
                  <span>
                    {item.date} | {item.type}
                  </span>
                  <small>{item.details}</small>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">No front-office transactions logged yet.</p>
          )}
          <h4>Local Save</h4>
          <SaveLoadPanel />
        </section>
      </div>
    </div>
  );
}
