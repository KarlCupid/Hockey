export interface TimelineEntry {
  id: string;
  title: string;
  body: string;
  meta?: string;
}

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <ol className="ui-timeline">
      {entries.map((entry) => (
        <li key={entry.id}>
          <strong>{entry.title}</strong>
          {entry.meta && <small>{entry.meta}</small>}
          <p>{entry.body}</p>
        </li>
      ))}
    </ol>
  );
}
