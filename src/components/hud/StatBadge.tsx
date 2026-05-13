export function StatBadge({ label, value, tone = "default" }: { label: string; value: string | number; tone?: "default" | "good" | "warn" | "bad" }) {
  return (
    <span className={`stat-badge stat-badge--${tone}`}>
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}
