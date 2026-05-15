import { createPlayerCoachRead, createPlayerManagementRisk, getFatigueBand, getFormBand, getMoraleBand } from "../../game/systems/playerNotes";
import { contractSummary } from "../../game/systems/contracts";
import { createRelationshipNote, getPlayerRelationship, getPlayerTrustBand } from "../../game/systems/relationships";
import type { Player } from "../../game/types";
import { selectedTeam, useFranchiseStore } from "../../store/franchiseStore";
import { PlayerPortrait } from "../branding/PlayerPortrait";
import { StatBadge } from "./StatBadge";
import { RelationshipBadge } from "./RelationshipBadge";

export function PlayerCard({ player }: { player: Player }) {
  const franchise = useFranchiseStore((state) => state.franchise);
  const schedulePlayerMeeting = useFranchiseStore((state) => state.schedulePlayerMeeting);
  const relationship = franchise ? getPlayerRelationship(franchise, player.id) : undefined;
  const agent = franchise?.agents.find((candidate) => candidate.clientPlayerIds.includes(player.id));
  const team = franchise ? selectedTeam(franchise) : undefined;
  const activeStoryArcs = franchise?.storyArcs.filter((arc) => arc.status === "active" && arc.playerIds.includes(player.id)) ?? [];
  return (
    <article className="player-card">
      <header>
        <PlayerPortrait player={player} compact />
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
        {relationship && <StatBadge label="Trust" value={getPlayerTrustBand(relationship.trust)} tone={relationship.trust >= 62 ? "good" : relationship.trust <= 42 ? "bad" : "warn"} />}
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
          <dd>{contractSummary(player.contract)}</dd>
        </div>
        <div>
          <dt>Injury</dt>
          <dd>{player.injuryStatus === "healthy" ? "Healthy" : `${player.injuryStatus} (${player.injuryGamesRemaining} game(s))`}</dd>
        </div>
        {relationship && (
          <>
            <div>
              <dt>Role Satisfaction</dt>
              <dd>{relationship.roleSatisfaction}/100</dd>
            </div>
            <div>
              <dt>Agent</dt>
              <dd>{agent?.displayName ?? "Unassigned"}</dd>
            </div>
          </>
        )}
      </dl>
      {relationship && (
        <div className="player-card__relationship">
          <RelationshipBadge relationship={relationship} agent={agent} />
          <p>{team ? createRelationshipNote(player, relationship, team) : relationship.notes[0]}</p>
          <button type="button" onClick={() => schedulePlayerMeeting(player.id)}>Schedule Meeting</button>
        </div>
      )}
      {activeStoryArcs.length > 0 && (
        <div className="asset-list asset-list--compact">
          {activeStoryArcs.map((arc) => (
            <article key={arc.id}>
              <strong>{arc.headline}</strong>
              <span>{arc.summary}</span>
            </article>
          ))}
        </div>
      )}
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
