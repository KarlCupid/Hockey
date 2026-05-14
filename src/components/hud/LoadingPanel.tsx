export function LoadingPanel({ label = "Loading operations panel..." }: { label?: string }) {
  return (
    <div className="loading-panel" role="status" aria-live="polite">
      <span />
      <strong>{label}</strong>
    </div>
  );
}
