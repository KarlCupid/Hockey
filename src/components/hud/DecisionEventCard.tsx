import type { DecisionEvent } from "../../game/types";
import { useSettingsStore } from "../../store/settingsStore";
import { roomLabel } from "./RoomPrompt";

export function DecisionEventCard({
  event,
  onGoTo,
  onResolve,
  compact = false
}: {
  event: DecisionEvent;
  onGoTo?: (roomId: NonNullable<DecisionEvent["locationRoom"]>) => void;
  onResolve?: (eventId: string, optionId: string) => void;
  compact?: boolean;
}) {
  const hidePreviews = useSettingsStore((state) => state.settings.hideConsequencePreviews);
  return (
    <article className={`decision-card decision-card--${event.severity}`}>
      <header>
        <div>
          <small>{event.sourceLabel} | {event.severity} | {event.status}</small>
          <strong>{event.headline}</strong>
        </div>
        {event.locationRoom && onGoTo && (
          <button type="button" onClick={() => onGoTo(event.locationRoom!)}>
            {roomLabel(event.locationRoom)}
          </button>
        )}
      </header>
      {!compact && <p>{event.body}</p>}
      {event.status === "active" && onResolve && (
        <div className="decision-options">
          {event.options.map((option) => (
            <button key={option.id} type="button" onClick={() => onResolve(event.id, option.id)}>
              <strong>{option.label}</strong>
              {!hidePreviews && <span>{option.preview}</span>}
            </button>
          ))}
        </div>
      )}
      {event.outcome && <p className="muted">{event.outcome.summary}</p>}
    </article>
  );
}
