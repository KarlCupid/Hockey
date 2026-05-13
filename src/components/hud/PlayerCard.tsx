import { createPlayerCoachRead, createPlayerManagementRisk, getFatigueBand, getFormBand, getMoraleBand } from "../../game/systems/playerNotes";
import type { Player } from "../../game/types";
import { StatBadge } from "./StatBadge";

export function PlayerCard({ player }: { player: Player }) {
  return (
    <article className="player-card">
      <header>
        <span className="player-card__pos">{player.position}</span>
        <div>
          <h3>{player.displayName}</h3>
          <p>
            {player.age} yrs | {player.nationality} | {player.handedness} shot
          </p>
        </div>
        <strong className="player-card__overall">{player.overall}</strong>
      </header>
      <div className="badge-row">
        <StatBadge label="Overall" value={player.overall} />
        <StatBadge label="Potential" value={player.potential} />
        <StatBadge label="Morale" value={getMoraleBand(player.morale)} tone={player.morale > 70 ? "good" : player.morale < 45 ? "bad" : "default"} />
        <StatBadge label="Form" value={getFormBand(player.form)} tone={player.form > 70 ? "good" : player.form < 45 ? "warn" : "default"} />
        <StatBadge label="Fatigue" value={getFatigueBand(player.fatigue)} tone={player.fatigue > 75 ? "bad" : player.fatigue > 60 ? "warn" : "good"} />
      </div>
      <dl className="mini-grid">
        <div>
          <dt>Archetype</dt>
          <dd>{player.archetype}</dd>
        </div>
        <div>
          <dt>Personality</dt>
          <dd>{player.personality}</dd>
        </div>
        <div>
          <dt>Role</dt>
          <dd>{player.roleExpectation}</dd>
        </div>
        <div>
          <dt>Contract</dt>
          <dd>{player.contractSummary}</dd>
        </div>
        <div>
          <dt>Injury</dt>
          <dd>{player.injuryStatus === "healthy" ? "Healthy" : `${player.injuryStatus} (${player.injuryGamesRemaining} game(s))`}</dd>
        </div>
      </dl>
      <div className="player-card__notes">
        <article>
          <small>Coach read</small>
          <p>{createPlayerCoachRead(player)}</p>
        </article>
        <article>
          <small>Management risk</small>
          <p>{createPlayerManagementRisk(player)}</p>
        </article>
      </div>
      <section className="player-card__stats">
        <strong>Season Stats</strong>
        {player.position === "G" ? (
          <>
            <span>{player.stats.gamesPlayed} GP</span>
            <span>{player.stats.goalieWins}-{player.stats.goalieLosses}</span>
            <span>{player.stats.saves} saves</span>
            <span>{player.stats.goalsAgainst} GA</span>
            <span>{player.stats.shutouts} SO</span>
          </>
        ) : (
          <>
            <span>{player.stats.gamesPlayed} GP</span>
            <span>{player.stats.goals} G</span>
            <span>{player.stats.assists} A</span>
            <span>{player.stats.points} P</span>
            <span>{player.stats.plusMinus >= 0 ? `+${player.stats.plusMinus}` : player.stats.plusMinus}</span>
            <span>{player.stats.shots} shots</span>
          </>
        )}
      </section>
    </article>
  );
}
