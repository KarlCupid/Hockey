import { fatigueBand, formBand, moraleBand, playerStatusNote } from "../../game/systems/morale";
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
        <StatBadge label="Morale" value={moraleBand(player.morale)} tone={player.morale > 70 ? "good" : player.morale < 45 ? "bad" : "default"} />
        <StatBadge label="Form" value={formBand(player.form)} tone={player.form > 70 ? "good" : player.form < 45 ? "warn" : "default"} />
        <StatBadge label="Fatigue" value={fatigueBand(player.fatigue)} tone={player.fatigue > 75 ? "bad" : player.fatigue > 60 ? "warn" : "good"} />
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
      </dl>
      <p className="player-note">{playerStatusNote(player)}</p>
      <div className="player-card__stats">
        <span>{player.stats.gamesPlayed} GP</span>
        <span>{player.stats.goals} G</span>
        <span>{player.stats.assists} A</span>
        <span>{player.stats.points} P</span>
        {player.position === "G" && <span>{player.stats.saves} SV</span>}
      </div>
    </article>
  );
}
