export function ProgressBar({ value, max = 100, label }: { value: number; max?: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / Math.max(1, max)) * 100)));
  return (
    <div className="progress-bar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} role="progressbar">
      <span style={{ width: `${pct}%` }} />
      {label && <b>{label}</b>}
    </div>
  );
}
