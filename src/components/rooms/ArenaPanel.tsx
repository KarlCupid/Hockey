import { useState } from "react";
import { simulatePeriod } from "../../game/simulation/simulatePeriod";
import { canSimulate, nextGameForTeam, simulateGame } from "../../game/simulation/simulateGame";
import type { GameResult, PeriodSimulationResult } from "../../game/types";
import { TACTIC_LABELS, type TacticKey } from "../../game/systems/tactics";
import { findTeam, selectedTeam, upcomingOpponent, useFranchiseStore } from "../../store/franchiseStore";
import { ArenaVisualization } from "../three/ArenaVisualization";
import { StatBadge } from "../hud/StatBadge";

export function ArenaPanel() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const applyGameResult = useFranchiseStore((state) => state.applyGameResult);
  const simulateInstantNextGame = useFranchiseStore((state) => state.simulateInstantNextGame);
  const applyPeriodGame = useFranchiseStore((state) => state.applyPeriodGame);
  const setTactic = useFranchiseStore((state) => state.setTactic);
  const [periods, setPeriods] = useState<PeriodSimulationResult[]>([]);
  const [broadcastResult, setBroadcastResult] = useState<GameResult | undefined>();
  const [localResult, setLocalResult] = useState<GameResult | undefined>();

  if (!franchise) return null;
  const activeFranchise = franchise;
  const team = selectedTeam(activeFranchise);
  const game = nextGameForTeam(activeFranchise.selectedTeamId, activeFranchise.league.schedule, activeFranchise.league.currentDayIndex);
  const opponent = upcomingOpponent(activeFranchise);
  const errors = canSimulate(team);
  const result = localResult ?? activeFranchise.lastResult;

  const preview = game
    ? {
        home: findTeam(activeFranchise.league, game.homeTeamId),
        away: findTeam(activeFranchise.league, game.awayTeamId)
      }
    : undefined;

  async function instant() {
    const next = await simulateInstantNextGame();
    if (next) setLocalResult(next);
  }

  function prepareBroadcast() {
    if (!game || !preview) return;
    setBroadcastResult(
      simulateGame({
        game,
        homeTeam: preview.home,
        awayTeam: preview.away,
        seed: `${activeFranchise.franchiseId}-${game.id}-broadcast`
      })
    );
  }

  async function finishBroadcast(resultToApply: GameResult) {
    await applyGameResult(resultToApply, true);
    setLocalResult(resultToApply);
    setBroadcastResult(undefined);
  }

  async function simNextPeriod() {
    if (!game || !preview) return;
    const period = periods.length + 1;
    const scoreBefore = periods.reduce(
      (score, item) => ({ home: score.home + item.homeGoals, away: score.away + item.awayGoals }),
      { home: 0, away: 0 }
    );
    const periodResult = simulatePeriod({
      gameId: game.id,
      period,
      homeTeam: preview.home,
      awayTeam: preview.away,
      homeTactics: preview.home.id === team.id ? team.tactics : preview.home.tactics,
      awayTactics: preview.away.id === team.id ? team.tactics : preview.away.tactics,
      seed: `${activeFranchise.franchiseId}-${game.id}-period`,
      scoreBefore
    });
    const nextPeriods = [...periods, periodResult];
    setPeriods(nextPeriods);
    if (nextPeriods.length === 3) {
      const final = await applyPeriodGame(nextPeriods, `${activeFranchise.franchiseId}-${game.id}-period`);
      if (final) setLocalResult(final);
      setPeriods([]);
    }
  }

  if (broadcastResult && preview) {
    return <ArenaVisualization result={broadcastResult} homeTeam={preview.home} awayTeam={preview.away} onFinish={() => void finishBroadcast(broadcastResult)} />;
  }

  return (
    <div className="room-stack">
      <section className="command-strip">
        <div>
          <small>Matchup</small>
          <strong>{opponent && game ? `${preview?.away.fullName} @ ${preview?.home.fullName}` : "Season Complete"}</strong>
        </div>
        <div>
          <small>Lineup</small>
          <strong>{errors.length ? "Invalid" : "Ready"}</strong>
        </div>
        <button type="button" disabled={!game || errors.length > 0} onClick={() => void instant()}>
          Instant Simulation
        </button>
        <button type="button" disabled={!game || errors.length > 0 || periods.length >= 3} onClick={() => void simNextPeriod()}>
          Simulate Period {periods.length + 1}
        </button>
        <button type="button" disabled={!game || errors.length > 0} onClick={prepareBroadcast}>
          Arena Broadcast
        </button>
      </section>

      {errors.length > 0 && (
        <section className="panel-section">
          <h3>Cannot Simulate Yet</h3>
          {errors.map((error) => (
            <p className="error-text" key={error}>{error}</p>
          ))}
        </section>
      )}

      <div className="room-grid room-grid--two">
        <section className="panel-section">
          <h3>Opponent Preview</h3>
          {preview ? (
            <div className="comparison-grid">
              <Compare label="Offense" home={avgOverall(preview.home, ["LW", "C", "RW"])} away={avgOverall(preview.away, ["LW", "C", "RW"])} />
              <Compare label="Defense" home={avgOverall(preview.home, ["LD", "RD"])} away={avgOverall(preview.away, ["LD", "RD"])} />
              <Compare label="Goaltending" home={avgOverall(preview.home, ["G"])} away={avgOverall(preview.away, ["G"])} />
              <Compare label="Special Teams" home={preview.home.tactics.specialTeamsAggression} away={preview.away.tactics.specialTeamsAggression} />
              <Compare label="Fatigue" home={100 - avg(preview.home.roster, "fatigue")} away={100 - avg(preview.away.roster, "fatigue")} />
              <Compare label="Form" home={avg(preview.home.roster, "form")} away={avg(preview.away.roster, "form")} />
            </div>
          ) : (
            <p className="empty-state">The regular season is complete.</p>
          )}
          <h3>Period-by-Period Bench Controls</h3>
          {periods.length > 0 && (
            <div className="period-summary">
              {periods.map((period) => (
                <article key={period.period}>
                  <strong>
                    Period {period.period}: {period.homeGoals}-{period.awayGoals}
                  </strong>
                  <span>
                    Shots {period.homeShots}-{period.awayShots}. {period.momentum}
                  </span>
                </article>
              ))}
            </div>
          )}
          {periods.length > 0 && periods.length < 3 && (
            <div className="mini-tactics">
              {(Object.keys(team.tactics) as TacticKey[]).map((key) => (
                <label key={key}>
                  <span>{TACTIC_LABELS[key]}</span>
                  <input type="range" min="0" max="100" value={team.tactics[key]} onChange={(event) => setTactic(key, Number(event.target.value))} />
                </label>
              ))}
            </div>
          )}
        </section>

        <section className="panel-section">
          <h3>Game Result</h3>
          {result ? <GameResultPanel result={result} /> : <p className="empty-state">Pick a sim mode to put the plan on the ice.</p>}
        </section>
      </div>
    </div>
  );
}

export function GameResultPanel({ result }: { result: GameResult }) {
  return (
    <div className="result-panel">
      <div className="scoreboard-card">
        <strong>
          {result.finalScore.away} - {result.finalScore.home}
        </strong>
        <span>{result.finalScore.overtime ? "Final / OT" : "Final"}</span>
      </div>
      <div className="badge-row">
        <StatBadge label="Shots" value={`${result.shots.away}-${result.shots.home}`} />
        <StatBadge label="PP" value={`${result.powerPlayGoals.away}/${result.powerPlayAttempts.away} | ${result.powerPlayGoals.home}/${result.powerPlayAttempts.home}`} />
        <StatBadge label="Events" value={result.eventTimeline.length} />
      </div>
      <h4>Period Scores</h4>
      <div className="period-row">
        {result.periodScores.map((period) => (
          <span key={period.period}>
            P{period.period}: {period.away}-{period.home}
          </span>
        ))}
      </div>
      <h4>Three Stars</h4>
      <ol className="compact-list">
        {result.threeStars.map((star) => (
          <li key={star.playerId}>{star.reason}</li>
        ))}
      </ol>
      <h4>Coach Notes</h4>
      <ul className="compact-list">
        {result.coachNotes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
      {result.injuries.length > 0 && (
        <>
          <h4>Injuries</h4>
          {result.injuries.map((injury) => (
            <p className="warning-text" key={injury.playerId}>{injury.note}</p>
          ))}
        </>
      )}
      <h4>Event Feed</h4>
      <div className="event-feed">
        {result.eventTimeline.slice(0, 12).map((event) => (
          <p key={event.id}>
            <strong>P{event.period} {event.time}</strong> {event.description}
          </p>
        ))}
      </div>
    </div>
  );
}

function Compare({ label, home, away }: { label: string; home: number; away: number }) {
  return (
    <div className="compare-row">
      <span>{label}</span>
      <strong>{away}</strong>
      <meter min="40" max="100" value={(home + away) / 2} />
      <strong>{home}</strong>
    </div>
  );
}

function avgOverall(team: { roster: Array<{ position: string; overall: number }> }, positions: string[]) {
  const players = team.roster.filter((player) => positions.includes(player.position));
  return Math.round(players.reduce((sum, player) => sum + player.overall, 0) / players.length);
}

function avg<T extends "fatigue" | "form">(players: Array<Record<T, number>>, key: T) {
  return Math.round(players.reduce((sum, player) => sum + player[key], 0) / players.length);
}
