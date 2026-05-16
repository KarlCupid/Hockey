export interface ToastItem {
  id: string;
  title: string;
  body?: string;
}

export function ToastStack({ items }: { items: ToastItem[] }) {
  if (!items.length) return null;
  return (
    <div className="ui-toast-stack" aria-live="polite">
      {items.map((item) => (
        <article key={item.id}>
          <strong>{item.title}</strong>
          {item.body && <span>{item.body}</span>}
        </article>
      ))}
    </div>
  );
}
