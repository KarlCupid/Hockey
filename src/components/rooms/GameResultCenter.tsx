import { useMemo, useState } from "react";
import {
  createGameResultPresentation,
  filterPresentedEvents,
  type ResultEventFilter
} from "../../game/systems/resultPresentation";
import type { GameResult, Team } from "../../game/types";
import { BroadcastScorebug } from "../branding/BroadcastPackage";

const FILTERS: Array<{ id: ResultEventFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "goals", label: "Goals" },
  { id: "penalties", label: "Penalties" },
  { id: "injuries", label: "Injuries" },
  { id: "momentum", label: "Momentum" },
  { id: "saves", label: "Saves" }
];

export function GameResultCenter({ result, teams }: { result: GameResult; teams: Team[] }) {
  const [filter, setFilter] = useState<ResultEventFilter>("all");
  const presentation = useMemo(() => createGameResultPresentation(result, teams), [result, teams]);
  const events = filterPresentedEvents(presentation.eventFeed, filter);
  const homeTeam = teams.find((team) => team.id === result.homeTeamId);
  const awayTeam = teams.find((team) => team.id === result.awayTeamId);

  return (
    <div className="result-center">
      {homeTeam && awayTeam ? (
        <BroadcastScorebug
          awayTeam={awayTeam}
          homeTeam={homeTeam}
          awayScore={presentation.scoreboard.awayScore}
          homeScore={presentation.scoreboard.homeScore}
          label={presentation.scoreboard.finalLabel}
        />
      ) : (
        <section className="result-scoreboard">
          <div>
            <small>{presentation.scoreboard.awayTeam}</small>
            <strong>{presentation.scoreboard.awayAbbreviation} {presentation.scoreboard.awayScore}</strong>
          </div>
          <span>{presentation.scoreboard.finalLabel}</span>
          <div>
            <small>{presentation.scoreboard.homeTeam}</small>
            <strong>{presentation.scoreboard.homeScore} {presentation.scoreboard.homeAbbreviation}</strong>
          </div>
        </section>
      )}

      <section className="result-section">
        <h4>Period Scores</h4>
        <div className="period-row">
          {presentation.scoreboard.periodScores.map((period) => (
            <span key={period.period}>
              {period.period}: {period.away}-{period.home}
            </span>
          ))}
        </div>
      </section>

      <section className="result-section">
        <h4>Game Story</h4>
        <p>{presentation.gameStory}</p>
      </section>

      <div className="result-grid">
        <section className="result-section">
          <h4>Scoring Summary</h4>
          {presentation.scoringSummary.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Per</th>
                    <th>Time</th>
                    <th>Team</th>
                    <th>Scorer</th>
                    <th>Assists</th>
                    <th>PP</th>
                  </tr>
                </thead>
                <tbody>
                  {presentation.scoringSummary.map((goal, index) => (
                    <tr key={`${goal.period}-${goal.time}-${goal.scorer}-${index}`}>
                      <td>{goal.period}</td>
                      <td>{goal.time}</td>
                      <td>{goal.team}</td>
                      <td>{goal.scorer}</td>
                      <td>{goal.assists}</td>
                      <td>{goal.marker}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-state">No goals. The goalies owned the night.</p>
          )}
        </section>

        <section className="result-section">
          <h4>Penalty Summary</h4>
          {presentation.penaltySummary.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Per</th>
                    <th>Time</th>
                    <th>Team</th>
                    <th>Player</th>
                    <th>Min</th>
                  </tr>
                </thead>
                <tbody>
                  {presentation.penaltySummary.map((penalty, index) => (
                    <tr key={`${penalty.period}-${penalty.time}-${penalty.player}-${index}`}>
                      <td>{penalty.period}</td>
                      <td>{penalty.time}</td>
                      <td>{penalty.team}</td>
                      <td>{penalty.player}</td>
                      <td>{penalty.minutes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-state">No penalties. Rare, appreciated, probably discussed anyway.</p>
          )}
        </section>
      </div>

      <div className="result-grid">
        <section className="result-section">
          <h4>Goalie Stats</h4>
          <div className="result-card-list">
            {presentation.goalieStats.map((goalie) => (
              <article key={`${goalie.team}-${goalie.goalie}`}>
                <strong>{goalie.goalie}</strong>
                <span>{goalie.team}</span>
                <p>{goalie.saves}/{goalie.shotsAgainst} saves, {goalie.goalsAgainst} GA, {goalie.savePercentage} SV% {goalie.decision}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="result-section">
          <h4>Three Stars</h4>
          {presentation.threeStars.length ? (
            <ol className="compact-list">
              {presentation.threeStars.map((star, index) => (
                <li key={`${star.team}-${star.player}-${index}`}>
                  <strong>{star.player}</strong> <span>{star.team}</span>
                  <p>{star.reason}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="empty-state">No star selections. The rink kept its secrets.</p>
          )}
        </section>
      </div>

      <section className="result-section">
        <h4>Team Comparison</h4>
        <div className="comparison-table">
          {presentation.teamComparison.map((row) => (
            <div key={row.label}>
              <strong>{row.away}</strong>
              <span>{row.label}</span>
              <strong>{row.home}</strong>
            </div>
          ))}
        </div>
      </section>

      <div className="result-grid">
        <section className="result-section">
          <h4>Coaching Takeaways</h4>
          <ul className="compact-list">
            {presentation.coachingTakeaways.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
        <section className="result-section">
          <h4>Consequence Report</h4>
          <ConsequenceList title="New injuries" items={presentation.consequenceReport.injuries} empty="No new injuries reported." />
          <ConsequenceList title="Morale risers" items={presentation.consequenceReport.moraleRisers} empty="No major morale spikes." />
          <ConsequenceList title="Morale fallers" items={presentation.consequenceReport.moraleFallers} empty="No major morale drops." />
          <ConsequenceList title="Fatigue warnings" items={presentation.consequenceReport.fatigueWarnings} empty="No workload alerts." />
          {presentation.consequenceReport.news.length > 0 && (
            <div className="mini-news-stack">
              <strong>New inbox items</strong>
              {presentation.consequenceReport.news.map((item) => (
                <span key={item.id}>{item.headline}</span>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="result-section">
        <h4>Event Feed</h4>
        <div className="segmented-control">
          {FILTERS.map((item) => (
            <button className={filter === item.id ? "is-active" : ""} key={item.id} type="button" onClick={() => setFilter(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="event-feed event-feed--result">
          {events.map((event) => (
            <p key={event.id}>
              <strong>P{event.period} {event.time}</strong> <span>{event.team}</span> {event.text}
            </p>
          ))}
          {!events.length && <p className="empty-state">No events for that filter.</p>}
        </div>
      </section>
    </div>
  );
}

function ConsequenceList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="consequence-list">
      <strong>{title}</strong>
      {items.length ? (
        items.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)
      ) : (
        <span className="muted">{empty}</span>
      )}
    </div>
  );
}
