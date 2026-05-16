import { Html } from "@react-three/drei";
import type { CSSProperties } from "react";

export function FacilitySignage({
  label,
  position,
  color,
  tone = "room"
}: {
  label: string;
  position: [number, number, number];
  color: string;
  tone?: "room" | "district" | "landmark";
}) {
  return (
    <Html position={position} center distanceFactor={tone === "district" ? 14 : 10}>
      <span className={`facility-signage facility-signage--${tone}`} style={{ "--signage-color": color } as CSSProperties}>
        {label}
      </span>
    </Html>
  );
}
