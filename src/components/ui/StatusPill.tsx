import { getStatusToneClass, type UiStatusTone } from "./statusStyles";

export function StatusPill({ label, tone = "neutral" }: { label: string; tone?: UiStatusTone }) {
  return <span className={getStatusToneClass(tone)}>{label}</span>;
}
