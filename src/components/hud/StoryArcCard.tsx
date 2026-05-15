import type { StoryArc } from "../../game/types";
import { ProgressBar } from "../ui/ProgressBar";

export function StoryArcCard({ arc }: { arc: StoryArc }) {
  return (
    <article className="story-card">
      <small>{arc.type} | {arc.status} | intensity {arc.intensity}/100</small>
      <strong>{arc.headline}</strong>
      <p>{arc.summary}</p>
      <ProgressBar value={arc.progress} max={100} label={`${arc.progress}/100 storyline progress`} />
      {arc.resolution && <p className="muted">{arc.resolution}</p>}
    </article>
  );
}
