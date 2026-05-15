import { useState } from "react";
import { getDecisionEventsForRoom } from "../../game/systems/decisionEvents";
import { getPlayerMeetingReasons, getTeamMeetingNeed } from "../../game/systems/playerMeetings";
import { getPlayerRelationship, getTeamDynamics } from "../../game/systems/relationships";
import { getPlayerRosterStatus, getRosterStatusLabel } from "../../game/systems/rosterRules";
import { selectedTeam, useFranchiseStore } from "../../store/franchiseStore";
import { DecisionEventCard } from "../hud/DecisionEventCard";
import { RelationshipBadge } from "../hud/RelationshipBadge";
import { TeamDynamicsPanel } from "../hud/TeamDynamicsPanel";
import { StatBadge } from "../hud/StatBadge";

export function PlayerMeetingPanel() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const resolveDecisionEvent = useFranchiseStore((state) => state.resolveDecisionEvent);
  const schedulePlayerMeeting = useFranchiseStore((state) => state.schedulePlayerMeeting);
  const scheduleTeamMeeting = useFranchiseStore((state) => state.scheduleTeamMeeting);
  const generateSampleDecisionEvent = useFranchiseStore((state) => state.generateSampleDecisionEvent);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | undefined>();
  if (!franchise) return null;
  const team = selectedTeam(franchise);
  const dynamics = getTeamDynamics(franchise, team.id);
  const events = getDecisionEventsForRoom(franchise, "playerMeetings");
  const playersNeedingAttention = team.roster
    .map((player) => ({ player, relationship: getPlayerRelationship(franchise, player.id), reasons: getPlayerMeetingReasons(franchise, player) }))
    .filter(({ player, relationship, reasons }) => relationship.trust <= 52 || relationship.roleSatisfaction <= 52 || player.morale <= 45 || reasons.some((reason) => !reason.includes("stable")))
    .sort((a, b) => a.relationship.trust + a.relationship.roleSatisfaction - (b.relationship.trust + b.relationship.roleSatisfaction))
    .slice(0, 12);
  const selected = team.roster.find((player) => player.id === selectedPlayerId) ?? playersNeedingAttention[0]?.player ?? team.roster[0];

  return (
    <div className="room-stack">
      <section className="command-strip command-strip--front-office">
        <StatBadge label="Chemistry" value={`${dynamics.chemistry}/100`} tone={dynamics.chemistry >= 62 ? "good" : dynamics.chemistry <= 42 ? "bad" : "warn"} />
        <StatBadge label="Room Mood" value={dynamics.roomMood} />
        <StatBadge label="Needs Attention" value={playersNeedingAttention.length} />
        <StatBadge label="Active Meetings" value={events.length} />
        <button type="button" onClick={scheduleTeamMeeting}>Schedule Team Meeting</button>
        <button type="button" onClick={() => generateSampleDecisionEvent("player")}>Generate player meeting</button>
      </section>

      <div className="room-grid room-grid--two">
        <section className="panel-section">
          <h3>Players Needing Attention</h3>
          <div className="asset-list">
            {playersNeedingAttention.map(({ player, relationship, reasons }) => {
              const agent = franchise.agents.find((candidate) => candidate.clientPlayerIds.includes(player.id));
              return (
                <article key={player.id} className={selected.id === player.id ? "is-selected" : ""}>
                  <strong>{player.displayName}</strong>
                  <span>{player.position} | {player.roleExpectation} | {getRosterStatusLabel(getPlayerRosterStatus(player))}</span>
                  <RelationshipBadge relationship={relationship} agent={agent} />
                  <small>{reasons[0]}</small>
                  <div className="button-row">
                    <button type="button" onClick={() => setSelectedPlayerId(player.id)}>Review</button>
                    <button type="button" onClick={() => schedulePlayerMeeting(player.id)}>Schedule Meeting</button>
                  </div>
                </article>
              );
            })}
            {!playersNeedingAttention.length && <p className="empty-state">No urgent one-on-one meetings are flagged.</p>}
          </div>
        </section>

        <section className="panel-section">
          <h3>Active Player And Team Meetings</h3>
          <div className="news-list">
            {events.length ? events.map((event) => <DecisionEventCard key={event.id} event={event} onResolve={resolveDecisionEvent} />) : <p className="empty-state">No meeting decisions are active.</p>}
          </div>
          <h4>Recommended Team Meeting</h4>
          <p className="muted">{getTeamMeetingNeed(franchise) ?? "No team meeting is urgent, but a proactive reset is available."}</p>
        </section>
      </div>

      <div className="room-grid room-grid--two">
        <TeamDynamicsPanel franchise={franchise} />
        <section className="panel-section">
          <h3>Meeting History</h3>
          <div className="asset-list asset-list--compact">
            {franchise.decisionEvents
              .filter((event) => event.status !== "active" && (event.type === "playerMeeting" || event.type === "teamMeeting"))
              .slice(0, 6)
              .map((event) => (
                <article key={event.id}>
                  <strong>{event.headline}</strong>
                  <span>{event.outcome?.summary ?? event.status}</span>
                </article>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}
