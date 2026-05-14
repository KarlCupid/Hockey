export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="ui-empty-state">
      <strong>{title}</strong>
      {body && <span>{body}</span>}
    </div>
  );
}
