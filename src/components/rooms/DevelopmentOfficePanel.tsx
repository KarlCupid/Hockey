import { useState } from "react";
import { developmentCandidateScore } from "../../game/systems/development";
import type { DevelopmentFocus, DevelopmentIntensity, Player } from "../../game/types";
import { selectedTeam, useFranchiseStore } from "../../store/franchiseStore";

const FOCUSES: DevelopmentFocus[] = [
  "Offensive Skill",
  "Defensive Reliability",
  "Skating",
  "Strength & Physicality",
  "Hockey IQ",
  "Special Teams",
  "Goalie Technique",
  "Leadership"
];
const INTENSITIES: DevelopmentIntensity[] = ["Light", "Normal", "Aggressive"];

export function DevelopmentOfficePanel() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const assignDevelopmentPlan = useFranchiseStore((state) => state.assignDevelopmentPlan);
  const removeDevelopmentPlan = useFranchiseStore((state) => state.removeDevelopmentPlan);
  const [playerId, setPlayerId] = useState<string>("");
  const [focus, setFocus] = useState<DevelopmentFocus>("Skating");
  const [intensity, setIntensity] = useState<DevelopmentIntensity>("Normal");

  if (!franchise) return null;
  const team = selectedTeam(franchise);
  const candidates = [...team.roster].sort((a, b) => developmentCandidateScore(b) - developmentCandidateScore(a)).slice(0, 10);
  const selectedPlayer = team.roster.find((player) => player.id === playerId) ?? candidates[0];

  const assign = () => {
    if (!selectedPlayer) return;
    assignDevelopmentPlan(selectedPlayer.id, selectedPlayer.position === "G" && focus !== "Leadership" ? "Goalie Technique" : focus, intensity);
    setPlayerId(selectedPlayer.id);
  };

  return (
    <div className="room-stack">
      <section className="command-strip command-strip--front-office">
        <div>
          <small>Active Plans</small>
          <strong>{franchise.development.plans.length}/5</strong>
        </div>
        <div>
          <small>Recent Updates</small>
          <strong>{franchise.development.recentUpdates.length}</strong>
        </div>
        <div>
          <small>Best Candidate</small>
          <strong>{candidates[0]?.displayName ?? "None"}</strong>
        </div>
        <p className="muted">Development plans tick forward after games. Aggressive work can accelerate progress, but fatigue and morale can bite back.</p>
      </section>

      <div className="room-grid room-grid--two">
        <section className="panel-section">
          <h3>Active Development Plans</h3>
          {franchise.development.plans.length ? (
            <div className="asset-list">
              {franchise.development.plans.map((plan) => {
                const player = findPlayer(team.roster, plan.playerId);
                return (
                  <article key={plan.playerId}>
                    <strong>{player?.displayName ?? "Departed player"}</strong>
                    <span>
                      {plan.focus} | {plan.intensity} | Progress {plan.progress}%
                    </span>
                    <small>{plan.note}</small>
                    <button type="button" onClick={() => removeDevelopmentPlan(plan.playerId)}>
                      Remove Plan
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="empty-state">No active plans. Pick a player and give the staff a direction.</p>
          )}

          <h3>Assign New Plan</h3>
          <div className="line-editor line-editor--pair">
            <label className="select-field">
              <span>Player</span>
              <select value={selectedPlayer?.id ?? ""} onChange={(event) => setPlayerId(event.target.value)}>
                {team.roster.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.displayName} | {player.position} | {player.age} yrs | {player.overall}/{player.potential}
                  </option>
                ))}
              </select>
            </label>
            <label className="select-field">
              <span>Focus</span>
              <select value={focus} onChange={(event) => setFocus(event.target.value as DevelopmentFocus)}>
                {FOCUSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="select-field">
              <span>Intensity</span>
              <select value={intensity} onChange={(event) => setIntensity(event.target.value as DevelopmentIntensity)}>
                {INTENSITIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={assign} disabled={!selectedPlayer || franchise.development.plans.length >= 5 && !franchise.development.plans.some((plan) => plan.playerId === selectedPlayer.id)}>
              Add / Update Plan
            </button>
          </div>

          <h3>Development Candidates</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Pos</th>
                  <th>Age</th>
                  <th>OVR</th>
                  <th>POT</th>
                  <th>Morale</th>
                  <th>Fatigue</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((player) => (
                  <tr key={player.id} className={selectedPlayer?.id === player.id ? "is-selected" : ""} onClick={() => setPlayerId(player.id)}>
                    <td>{player.displayName}</td>
                    <td>{player.position}</td>
                    <td>{player.age}</td>
                    <td>{player.overall}</td>
                    <td>{player.potential}</td>
                    <td>{player.morale}</td>
                    <td>{player.fatigue}</td>
                    <td>{Math.round(developmentCandidateScore(player))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel-section">
          <h3>Selected Player</h3>
          {selectedPlayer ? (
            <article className="prospect-detail">
              <header>
                <strong>{selectedPlayer.displayName}</strong>
                <span>
                  {selectedPlayer.position} | {selectedPlayer.age} yrs | {selectedPlayer.roleExpectation}
                </span>
              </header>
              <p>
                {selectedPlayer.overall} OVR / {selectedPlayer.potential} POT. Current form {selectedPlayer.form}, morale {selectedPlayer.morale}, fatigue {selectedPlayer.fatigue}.
              </p>
              <p className="muted">Young players and high-potential players progress faster. Injuries, fatigue, and poor form slow the work.</p>
            </article>
          ) : (
            <p className="empty-state">No player selected.</p>
          )}

          <h3>Recent Development Updates</h3>
          {franchise.development.recentUpdates.length ? (
            <div className="asset-list">
              {franchise.development.recentUpdates.map((update) => {
                const player = team.roster.find((candidate) => candidate.id === update.playerId);
                return (
                  <article key={update.id}>
                    <strong>{update.headline}</strong>
                    <span>{player ? `${player.displayName} | ` : ""}{update.body}</span>
                    {update.attributeChanged && <small>{update.attributeChanged} {update.amount && update.amount > 0 ? `+${update.amount}` : update.amount}</small>}
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="empty-state">Updates appear after games once plans have time to work.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function findPlayer(players: Player[], playerId: string): Player | undefined {
  return players.find((player) => player.id === playerId);
}
