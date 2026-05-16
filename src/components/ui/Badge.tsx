import type { ReactNode } from "react";
import { getStatusToneClass, type UiStatusTone } from "./statusStyles";

export function Badge({ tone = "neutral", children }: { tone?: UiStatusTone; children: ReactNode }) {
  return <span className={getStatusToneClass(tone)}>{children}</span>;
}
