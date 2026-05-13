import type { ReactNode } from "react";

export function Interactable({ children }: { children: ReactNode }) {
  return <group>{children}</group>;
}
