import { useEffect } from "react";
import { useUiStore } from "../../store/uiStore";
import { upcomingOpponent, recordLabel, selectedTeam } from "../../store/franchiseStore";
import { useFranchiseStore } from "../../store/franchiseStore";
import { describePlayoffResult, getCurrentUserPlayoffGame } from "../../game/systems/playoffs";
import { ownerMoodLabel } from "../../game/systems/owner";
import type { FranchiseState } from "../../game/types";
import { SaveLoadPanel } from "./SaveLoadPanel";

export function GMOfficePanel() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const simulateInstantNextGame = useFranchiseStore((state) => state.simulateInstantNextGame);
  const simToEndRegularSeason = useFranchiseStore((state) => state.simToEndRegularSeason);
  const advanceSeasonPhase = useFranchiseStore((state) => state.advanceSeasonPhase);
  const simulateNextPlayoffDay = useFranchiseStore((state) => state.simulateNextPlayoffDay);
  const simulateCurrentPlayoffRound = useFranchiseStore((state) => state.simulateCurrentPlayoffRound);
  const simulateToPlayoffChampion = useFranchiseStore((state) => state.simulateToPlayoffChampion);
  const autoDraftUntilUserPick = useFranchiseStore((state) => state.autoDraftUntilUserPick);
  const autoCompleteDraft = useFranchiseStore((state) => state.autoCompleteDraft);
  const advanceFreeAgencyDay = useFranchiseStore((state) => state.advanceFreeAgencyDay);
  const completeFreeAgency = useFranchiseStore((state) => state.completeFreeAgency);
  const setActiveRoom = useUiStore((state) => state.setActiveRoom);
  const markChecklistItem = useUiStore((state) => state.markChecklistItem);
  useEffect(() => {
    markChecklistItem("readInbox");
  }, [markChecklistItem]);
  if (!franchise) return null;
  const team = selectedTeam(franchise);
  const opponent = upcomingOpponent(franchise);
  const playoffGame = getCurrentUserPlayoffGame(franchise);
  const userSchedule = franchise.league.schedule
    .filter((game) => game.homeTeamId === team.id || game.awayTeamId === team.id)
    .slice(Math.max(0, team.stats.gamesPlayed - 1), team.stats.gamesPlayed + 5);
  const mood = team.ownerPatience < 38 ? "Demanding" : team.ownerPatience < 62 ? "Concerned" : "Patient";
  const fan = team.fanConfidence < 42 ? "Falling" : team.fanConfidence < 66 ? "Stable" : "Rising";
  const phaseLabel = phaseTitle(franchise.seasonPhase);

  return (
    <div className="room-stack">
      <section className="command-strip">
        <div>
          <small>Current Phase</small>
          <strong>{phaseLabel}</strong>
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
        <button type="button" onClick={() => setActiveRoom("arena")} disabled={!opponent && !playoffGame}>
          Go to Arena
        </button>
        <button
          type="button"
          onClick={() => {
            markChecklistItem("simulateGame");
            void simulateInstantNextGame();
          }}
          disabled={!opponent && !playoffGame}
        >
          {playoffGame ? "Instant Sim Playoff Game" : "Instant Sim Next Game"}
        </button>
      </section>
      <section className="panel-section">
        <h3>Calendar Command Center</h3>
        <div className="season-pulse">
          <span>Season <strong>{franchise.league.seasonYear}</strong></span>
          <span>Date <strong>{franchise.league.currentDate}</strong></span>
          <span>Next action <strong>{nextAction(franchise)}</strong></span>
          <span>Owner confidence <strong>{ownerMoodLabel(franchise.ownerState)} | {franchise.ownerState.jobSecurity}/100</strong></span>
        </div>
        {franchise.seasonPhase === "regularSeason" && (
          <div className="button-row">
            <button type="button" onClick={() => setActiveRoom("arena")} disabled={!opponent}>
              Sim to next user game
            </button>
            <button type="button" onClick={() => window.confirm("Sim the rest of the regular season?") && simToEndRegularSeason()}>
              Sim to end of regular season
            </button>
            <button type="button" disabled={!franchise.league.completed} onClick={advanceSeasonPhase}>
              Start playoffs
            </button>
          </div>
        )}
        {franchise.seasonPhase === "playoffs" && (
          <>
            <p className="muted">{describePlayoffResult(franchise)}</p>
            <div className="button-row">
              <button type="button" onClick={() => setActiveRoom("arena")} disabled={!playoffGame}>
                User playoff game
              </button>
              <button type="button" onClick={simulateNextPlayoffDay}>Sim next playoff game/day</button>
              <button type="button" onClick={simulateCurrentPlayoffRound}>Sim current round</button>
              <button type="button" onClick={simulateToPlayoffChampion}>Sim to champion</button>
              <button type="button" disabled={!franchise.playoffState?.completed} onClick={advanceSeasonPhase}>
                Advance to season review
              </button>
            </div>
          </>
        )}
        {["seasonReview", "retirements", "draftLottery", "staffHiring", "trainingCamp", "preseason"].includes(franchise.seasonPhase) && (
          <div className="button-row">
            <button type="button" onClick={advanceSeasonPhase}>
              Advance to next major phase
            </button>
          </div>
        )}
        {franchise.seasonPhase === "draft" && (
          <div className="button-row">
            <button type="button" onClick={() => setActiveRoom("scouting")}>Open Draft Room</button>
            <button type="button" onClick={autoDraftUntilUserPick}>Auto-draft until user pick</button>
            <button type="button" onClick={() => window.confirm("Auto-complete the rest of the draft?") && autoCompleteDraft()}>
              Auto-complete draft
            </button>
            <button type="button" disabled={!franchise.offseasonState?.draftState?.completed} onClick={advanceSeasonPhase}>
              Advance to re-signing
            </button>
          </div>
        )}
        {franchise.seasonPhase === "reSigning" && (
          <div className="button-row">
            <button type="button" onClick={() => setActiveRoom("contracts")}>Open Re-Signing Board</button>
            <button type="button" onClick={() => window.confirm("Unsigned UFAs will enter free agency. Continue?") && advanceSeasonPhase()}>
              Advance to free agency
            </button>
          </div>
        )}
        {franchise.seasonPhase === "freeAgency" && (
          <div className="button-row">
            <button type="button" onClick={() => setActiveRoom("freeAgency")}>Open Free Agency Office</button>
            <button type="button" onClick={advanceFreeAgencyDay}>Advance one free agency day</button>
            <button type="button" onClick={() => window.confirm("Resolve the rest of free agency?") && completeFreeAgency()}>Auto-resolve free agency</button>
            <button type="button" disabled={!franchise.freeAgencyState?.completed} onClick={advanceSeasonPhase}>Advance to staff hiring</button>
          </div>
        )}
        <h4>Owner Goals</h4>
        <div className="asset-list asset-list--compact">
          {franchise.ownerState.seasonGoals.map((goal) => (
            <article key={goal.id}>
              <strong>{goal.label}</strong>
              <span>{goal.status} | {goal.importance} importance | progress {Math.round(goal.progress)} / {goal.target}</span>
            </article>
          ))}
        </div>
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
          <p className="muted">Contracts, trades, scouting, development, free agency, staff, and dynasty history now feed the same inbox and local save.</p>
          <div className="button-row">
            <button type="button" onClick={() => setActiveRoom("contracts")}>Cap Office</button>
            <button type="button" onClick={() => setActiveRoom("trades")}>Trade Room</button>
            <button type="button" onClick={() => setActiveRoom("scouting")}>Scouting</button>
            <button type="button" onClick={() => setActiveRoom("development")}>Development</button>
            <button type="button" onClick={() => setActiveRoom("freeAgency")}>Free Agency</button>
            <button type="button" onClick={() => setActiveRoom("staff")}>Staff</button>
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

function phaseTitle(phase: string): string {
  const labels: Record<string, string> = {
    regularSeason: "Regular Season",
    playoffs: "Playoffs",
    seasonReview: "Season Review",
    retirements: "Retirements",
    draftLottery: "Draft Lottery",
    draft: "Draft",
    reSigning: "Re-Signing",
    freeAgency: "Free Agency",
    staffHiring: "Staff Hiring",
    trainingCamp: "Training Camp",
    preseason: "Preseason",
    completed: "Completed"
  };
  return labels[phase] ?? phase;
}

function nextAction(franchise: FranchiseState): string {
  if (franchise.seasonPhase === "regularSeason") return franchise.league.completed ? "Start playoffs" : "Play the schedule";
  if (franchise.seasonPhase === "playoffs") return franchise.playoffState?.completed ? "Advance to review" : "Resolve bracket";
  if (franchise.seasonPhase === "draft") return franchise.offseasonState?.draftState?.userPickPending ? "Make your pick" : "Auto-draft to your table";
  if (franchise.seasonPhase === "freeAgency") return `Free agency day ${franchise.freeAgencyState?.currentDay ?? 1}`;
  if (franchise.seasonPhase === "trainingCamp") return "Start next season";
  return `Advance from ${phaseTitle(franchise.seasonPhase)}`;
}
