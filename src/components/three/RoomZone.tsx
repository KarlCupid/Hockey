import { Text } from "@react-three/drei";
import type { Vector3Tuple } from "three";
import type { RoomId } from "../../game/types";

export interface RoomZoneConfig {
  id: RoomId;
  label: string;
  position: Vector3Tuple;
  color: string;
}

export function RoomZone({ zone, active, onOpen }: { zone: RoomZoneConfig; active: boolean; onOpen: (room: RoomId) => void }) {
  return (
    <group position={zone.position}>
      <mesh position={[0, 0.03, 0]} onClick={() => onOpen(zone.id)}>
        <cylinderGeometry args={[1.15, 1.15, 0.06, 40]} />
        <meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={active ? 1.8 : 0.8} transparent opacity={active ? 0.62 : 0.36} />
      </mesh>
      {active && (
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.28, 1.36, 56]} />
          <meshStandardMaterial color={zone.color} emissive={zone.color} emissiveIntensity={1.4} transparent opacity={0.9} />
        </mesh>
      )}
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[2.35, 0.42, 0.08]} />
        <meshStandardMaterial color="#f5fbff" emissive={active ? zone.color : "#0d2035"} emissiveIntensity={active ? 0.45 : 0.12} />
      </mesh>
      <Text position={[0, 1.22, 0.06]} fontSize={0.18} color="#07111f" anchorX="center" anchorY="middle" maxWidth={2.1}>
        {zone.label}
      </Text>
      {active && (
        <Text position={[0, 1.62, 0.04]} fontSize={0.16} color={zone.color} anchorX="center" anchorY="middle" maxWidth={2.2}>
          PRESS E
        </Text>
      )}
    </group>
  );
}
