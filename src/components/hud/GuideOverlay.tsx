import { useMemo, useState } from "react";
import { getGuideTopics, getStarterGuideTopicIds, searchGuideTopics } from "../../game/systems/guide";
import type { GuideTopic } from "../../game/types";
import { useUiStore } from "../../store/uiStore";

export function GuideOverlay({ compact = false }: { compact?: boolean }) {
  const topics = getGuideTopics();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<GuideTopic["category"] | "all">("all");
  const [selectedId, setSelectedId] = useState(getStarterGuideTopicIds()[0]);
  const setActiveRoom = useUiStore((state) => state.setActiveRoom);
  const filtered = useMemo(() => {
    const searched = searchGuideTopics(query);
    return category === "all" ? searched : searched.filter((topic) => topic.category === category);
  }, [category, query]);
  const selected = topics.find((topic) => topic.id === selectedId) ?? filtered[0] ?? topics[0];
  const categories = Array.from(new Set(topics.map((topic) => topic.category)));

  return (
    <div className={compact ? "guide-overlay guide-overlay--compact" : "guide-overlay"} aria-label="Learn the Game guide">
      <aside className="guide-sidebar">
        <label className="select-field">
          <span>Search guide</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Roster, draft, saves..." />
        </label>
        <label className="select-field">
          <span>Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value as GuideTopic["category"] | "all")}>
            <option value="all">All topics</option>
            {categories.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <div className="guide-topic-list">
          {filtered.map((topic) => (
            <button type="button" className={topic.id === selected.id ? "is-selected" : ""} key={topic.id} onClick={() => setSelectedId(topic.id)}>
              <strong>{topic.title}</strong>
              <span>{topic.summary}</span>
            </button>
          ))}
        </div>
      </aside>
      <article className="guide-topic-detail">
        <small>{selected.category}</small>
        <h3>{selected.title}</h3>
        <p>{selected.summary}</p>
        <p>{selected.body}</p>
        {!!selected.relatedRoomIds.length && (
          <div className="button-row">
            {selected.relatedRoomIds.slice(0, 4).map((roomId) => (
              <button type="button" key={roomId} onClick={() => setActiveRoom(roomId)}>
                Open {roomId}
              </button>
            ))}
          </div>
        )}
        {!!selected.relatedActions.length && (
          <div className="tag-row" aria-label="Related guide actions">
            {selected.relatedActions.map((action) => (
              <span key={action}>{action}</span>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
