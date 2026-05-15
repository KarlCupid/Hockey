import { getDecisionEventsForRoom } from "../../game/systems/decisionEvents";
import { getOwnerDemandLevel, createOwnerMeetingSummary } from "../../game/systems/ownerMeetings";
import { ownerMoodLabel } from "../../game/systems/owner";
import { getTeamDynamics } from "../../game/systems/relationships";
import { selectedTeam, useFranchiseStore } from "../../store/franchiseStore";
import { DecisionEventCard } from "../hud/DecisionEventCard";
import { StatBadge } from "../hud/StatBadge";
import { ProgressBar } from "../ui/ProgressBar";

export function OwnerSuitePanel() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const resolveDecisionEvent = useFranchiseStore((state) => state.resolveDecisionEvent);
  const generateSampleDecisionEvent = useFranchiseStore((state) => state.generateSampleDecisionEvent);
  if (!franchise) return null;
  const team = selectedTeam(franchise);
  const dynamics = getTeamDynamics(franchise, team.id);
  const events = getDecisionEventsForRoom(franchise, "ownerSuite");
  const demand = getOwnerDemandLevel(franchise);

  return (
    <div className="room-stack">
      <section className="command-strip command-strip--front-office">
        <StatBadge label="Job Security" value={`${franchise.ownerState.jobSecurity}/100`} tone={franchise.ownerState.jobSecurity >= 62 ? "good" : franchise.ownerState.jobSecurity <= 42 ? "bad" : "warn"} />
        <StatBadge label="Owner Trust" value={`${dynamics.ownerTrust}/100`} tone={dynamics.ownerTrust >= 62 ? "good" : dynamics.ownerTrust <= 42 ? "bad" : "warn"} />
        <StatBadge label="Owner Mood" value={ownerMoodLabel(franchise.ownerState)} />
        <StatBadge label="Demand Level" value={demand} />
        <button type="button" onClick={() => generateSampleDecisionEvent("owner")}>Generate owner meeting</button>
      </section>

      <div className="room-grid room-grid--two">
        <section className="panel-section">
          <h3>Active Owner Meeting</h3>
          <p className="muted">{createOwnerMeetingSummary(franchise)}</p>
          <div className="news-list">
            {events.length ? events.map((event) => <DecisionEventCard key={event.id} event={event} onResolve={resolveDecisionEvent} />) : <p className="empty-state">No owner meeting is currently waiting.</p>}
          </div>
        </section>
        <section className="panel-section">
          <h3>Season Goals</h3>
          <div className="asset-list">
            {franchise.ownerState.seasonGoals.map((goal) => (
              <article key={goal.id}>
                <strong>{goal.label}</strong>
                <span>{goal.importance} importance | {goal.status}</span>
                <ProgressBar value={Math.min(goal.progress, goal.target)} max={Math.max(1, goal.target)} label={`${Math.round(goal.progress)} / ${goal.target}`} />
              </article>
            ))}
          </div>
          <h4>Owner Messages</h4>
          <div className="asset-list asset-list--compact">
            {franchise.ownerState.messages.slice(0, 4).map((message) => (
              <article key={message.id}>
                <strong>{message.headline}</strong>
                <span>{message.body}</span>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="panel-section">
        <h3>Phase Expectations</h3>
        <p className="muted">
          {team.fullName} ownership is reading the current {franchise.seasonPhase} phase through goal progress, cap discipline, public noise, and whether the room still looks connected.
        </p>
      </section>
    </div>
  );
}
