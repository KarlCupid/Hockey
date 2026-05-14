import type { ReactNode } from "react";

export function WarningCallout({ title, children, tone = "warning" }: { title: string; children: ReactNode; tone?: "warning" | "danger" | "info" }) {
  return (
    <aside className={`warning-callout warning-callout--${tone}`}>
      <strong>{title}</strong>
      <div>{children}</div>
    </aside>
  );
}
