import { getDecisionEventsForRoom } from "../../game/systems/decisionEvents";
import { createFanPulse, createMediaNarrative, getColumnistHeadline } from "../../game/systems/fanMedia";
import { getMediaPressureBand } from "../../game/systems/relationships";
import { useFranchiseStore } from "../../store/franchiseStore";
import { DecisionEventCard } from "../hud/DecisionEventCard";
import { StatBadge } from "../hud/StatBadge";

export function PressRoomPanel() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const resolveDecisionEvent = useFranchiseStore((state) => state.resolveDecisionEvent);
  const generateSampleDecisionEvent = useFranchiseStore((state) => state.generateSampleDecisionEvent);
  if (!franchise) return null;
  const events = getDecisionEventsForRoom(franchise, "press");
  const recent = franchise.decisionEvents.filter((event) => event.status !== "active" && event.locationRoom === "press").slice(0, 5);
  const headline = getColumnistHeadline(franchise);

  return (
    <div className="room-stack">
      <section className="command-strip command-strip--front-office">
        <StatBadge label="Media Pressure" value={`${franchise.mediaState.pressure}/100`} tone={franchise.mediaState.pressure >= 70 ? "bad" : franchise.mediaState.pressure >= 55 ? "warn" : "good"} />
        <StatBadge label="Pressure Band" value={getMediaPressureBand(franchise.mediaState.pressure)} />
        <StatBadge label="Narrative" value={franchise.mediaState.narrative} />
        <StatBadge label="Columnist" value={franchise.mediaState.columnistTone} />
        <button type="button" onClick={() => generateSampleDecisionEvent("press")}>Generate sample press event</button>
      </section>

      <div className="room-grid room-grid--two">
        <section className="panel-section">
          <h3>Active Press Conferences</h3>
          <div className="news-list">
            {events.length ? events.map((event) => <DecisionEventCard key={event.id} event={event} onResolve={resolveDecisionEvent} />) : <p className="empty-state">No reporters waiting right now.</p>}
          </div>
        </section>

        <section className="panel-section">
          <h3>Media Narrative</h3>
          <article className={`news-item news-item--${headline.severity}`}>
            <small>{headline.date} | media pulse</small>
            <strong>{headline.headline}</strong>
            <p>{headline.body}</p>
          </article>
          <p className="muted">{createMediaNarrative(franchise)}</p>
          <p className="muted">{createFanPulse(franchise)}</p>
          <h4>Recent Questions</h4>
          {franchise.mediaState.recentQuestions.length ? (
            <ul className="compact-list">{franchise.mediaState.recentQuestions.map((question) => <li key={question}>{question}</li>)}</ul>
          ) : (
            <p className="empty-state">No recent media questions logged.</p>
          )}
        </section>
      </div>

      <section className="panel-section">
        <h3>Recent Press Outcomes</h3>
        <div className="asset-list asset-list--compact">
          {recent.length ? recent.map((event) => <DecisionEventCard key={event.id} event={event} compact />) : <p className="empty-state">No resolved press decisions yet.</p>}
        </div>
      </section>
    </div>
  );
}
