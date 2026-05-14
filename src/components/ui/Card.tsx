import type { ReactNode } from "react";

export function Card({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "warning" | "success" }) {
  return <section className={`ui-card ui-card--${tone}`}>{children}</section>;
}
