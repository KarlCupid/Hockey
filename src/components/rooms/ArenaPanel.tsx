import { useState } from "react";
import { simulatePeriod } from "../../game/simulation/simulatePeriod";
import { assembleGameResult, canSimulate, nextGameForTeam, simulateGame } from "../../game/simulation/simulateGame";
import { createBenchReport } from "../../game/systems/benchReport";
import { getCurrentUserPlayoffGame, playoffGameAsSchedule } from "../../game/systems/playoffs";
import type { GameResult, PeriodSimulationResult } from "../../game/types";
import { TACTIC_LABELS, type TacticKey } from "../../game/systems/tactics";
import { findTeam, selectedTeam, upcomingOpponent, useFranchiseStore } from "../../store/franchiseStore";
import { ArenaVisualization } from "../three/ArenaVisualization";
import { StatBadge } from "../hud/StatBadge";
import { GameResultCenter } from "./GameResultCenter";
import { useUiStore } from "../../store/uiStore";

export function ArenaPanel() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const applyGameResult = useFranchiseStore((state) => state.applyGameResult);
  const simulateInstantNextGame = useFranchiseStore((state) => state.simulateInstantNextGame);
  const setTactic = useFranchiseStore((state) => state.setTactic);
  const markChecklistItem = useUiStore((state) => state.markChecklistItem);
  const [periods, setPeriods] = useState<PeriodSimulationResult[]>([]);
  const [periodFinal, setPeriodFinal] = useState<GameResult | undefined>();
  const [applyingPeriod, setApplyingPeriod] = useState(false);
  const [applyingBroadcast, setApplyingBroadcast] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<GameResult | undefined>();
  const [localResult, setLocalResult] = useState<GameResult | undefined>();

  if (!franchise) return null;
  const activeFranchise = franchise;
  const team = selectedTeam(activeFranchise);
  const playoffGame = activeFranchise.seasonPhase === "playoffs" ? getCurrentUserPlayoffGame(activeFranchise) : undefined;
  const regularGame = nextGameForTeam(activeFranchise.selectedTeamId, activeFranchise.league.schedule, activeFranchise.league.currentDayIndex);
  const game = playoffGame ? playoffGameAsSchedule(playoffGame, activeFranchise.league.currentDayIndex, activeFranchise.league.currentDate) : regularGame;
  const opponent = playoffGame
    ? findTeam(activeFranchise.league, playoffGame.homeTeamId === team.id ? playoffGame.awayTeamId : playoffGame.homeTeamId)
    : upcomingOpponent(activeFranchise);
  const errors = canSimulate(team);
  const result = activeFranchise.lastResult ?? localResult;

  const preview = game
    ? {
        home: findTeam(activeFranchise.league, game.homeTeamId),
        away: findTeam(activeFranchise.league, game.awayTeamId)
      }
    : undefined;

  async function instant() {
    const next = await simulateInstantNextGame();
    if (next) {
      setLocalResult(next);
      markChecklistItem("simulateGame");
      markChecklistItem("reviewResult");
    }
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
    if (applyingBroadcast) return;
    setApplyingBroadcast(true);
    await applyGameResult(resultToApply, true);
    setLocalResult(resultToApply);
    setBroadcastResult(undefined);
    setApplyingBroadcast(false);
    markChecklistItem("simulateGame");
    markChecklistItem("reviewResult");
  }

  function simNextPeriod() {
    if (!game || !preview || periodFinal) return;
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
      setPeriodFinal(assembleGameResult(game, preview.home, preview.away, `${activeFranchise.franchiseId}-${game.id}-period`, nextPeriods));
    }
  }

  async function applyPeriodFinal() {
    if (!periodFinal || applyingPeriod) return;
    setApplyingPeriod(true);
    await applyGameResult(periodFinal, true);
    setLocalResult(periodFinal);
    setPeriods([]);
    setPeriodFinal(undefined);
    setApplyingPeriod(false);
    markChecklistItem("simulateGame");
    markChecklistItem("reviewResult");
  }

  function resetPeriodSim() {
    setPeriods([]);
    setPeriodFinal(undefined);
  }

  if (broadcastResult && preview) {
    return (
      <ArenaVisualization
        result={broadcastResult}
        homeTeam={preview.home}
        awayTeam={preview.away}
        teams={activeFranchise.league.teams}
        applying={applyingBroadcast}
        onCancel={() => setBroadcastResult(undefined)}
        onFinish={() => void finishBroadcast(broadcastResult)}
      />
    );
  }

  const latestBenchReport =
    preview && periods.length
      ? createBenchReport({
          periods,
          selectedTeamId: team.id,
          homeTeam: preview.home,
          awayTeam: preview.away,
          tactics: team.tactics
        })
      : undefined;

  return (
    <div className="room-stack">
      <section className="command-strip">
        <div>
          <small>{playoffGame ? `Playoffs | Game ${playoffGame.gameNumber}` : "Matchup"}</small>
          <strong>{opponent && game ? `${preview?.away.fullName} @ ${preview?.home.fullName}` : activeFranchise.seasonPhase === "playoffs" ? "No user playoff game" : "Season Complete"}</strong>
        </div>
        <div>
          <small>Lineup</small>
          <strong>{errors.length ? "Invalid" : "Ready"}</strong>
        </div>
        <button type="button" disabled={!game || errors.length > 0} onClick={() => void instant()}>
          Instant Simulation
        </button>
        <button type="button" disabled={!game || errors.length > 0 || periods.length >= 3} onClick={() => void simNextPeriod()}>
          {periods.length ? `Simulate Next Period (${periods.length + 1})` : "Start Period Sim"}
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
            <p className="empty-state">{activeFranchise.seasonPhase === "playoffs" ? "Your club is not on the playoff schedule right now. Sim from the GM Computer or Trophy Hall." : "The regular season is complete."}</p>
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
          {latestBenchReport && (
            <article className="bench-report">
              <header>
                <small>Bench Report after Period {latestBenchReport.period}</small>
                <strong>{latestBenchReport.currentScore}</strong>
              </header>
              <div className="badge-row">
                <StatBadge label="Period shots" value={latestBenchReport.periodShots} />
                <StatBadge label="Momentum" value={latestBenchReport.momentumNote.includes("won") ? "Good" : latestBenchReport.momentumNote.includes("other") ? "Pressure" : "Even"} />
              </div>
              <p>{latestBenchReport.momentumNote}</p>
              <p>{latestBenchReport.powerPlayNote}</p>
              <p>{latestBenchReport.fatigueWarning}</p>
              <p>{latestBenchReport.goalieConfidenceNote}</p>
              <strong>Suggested adjustment: {latestBenchReport.suggestedAdjustment}</strong>
            </article>
          )}
          {periods.length > 0 && !periodFinal && periods.length < 3 && (
            <div className="mini-tactics">
              {(Object.keys(team.tactics) as TacticKey[]).map((key) => (
                <label key={key}>
                  <span>{TACTIC_LABELS[key]}</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={team.tactics[key]}
                    onChange={(event) => {
                      setTactic(key, Number(event.target.value));
                      markChecklistItem("adjustTactic");
                    }}
                  />
                </label>
              ))}
            </div>
          )}
          {periods.length > 0 && (
            <div className="button-row">
              <button type="button" onClick={resetPeriodSim}>
                Reset / Cancel Period Sim
              </button>
              {periodFinal && (
                <button type="button" disabled={applyingPeriod} onClick={() => void applyPeriodFinal()}>
                  {applyingPeriod ? "Applying..." : "Apply Period Result"}
                </button>
              )}
            </div>
          )}
        </section>

        <section className="panel-section">
          <h3>{periodFinal ? "Final Preview" : "Game Result Center"}</h3>
          {periodFinal ? (
            <GameResultCenter result={periodFinal} teams={activeFranchise.league.teams} />
          ) : result ? (
            <GameResultCenter result={result} teams={activeFranchise.league.teams} />
          ) : (
            <p className="empty-state">Pick a sim mode to put the plan on the ice.</p>
          )}
        </section>
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
