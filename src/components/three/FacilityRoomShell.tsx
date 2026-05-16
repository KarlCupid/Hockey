import type { FacilityRoomDefinition } from "../../game/facility/facilityTypes";
import { FacilitySignage } from "./FacilitySignage";

export function FacilityRoomShell({ room, active, reducedDetail }: { room: FacilityRoomDefinition; active: boolean; reducedDetail: boolean }) {
  const entrance = entranceMarker(room);
  return (
    <group position={[room.position.x, 0, room.position.z]}>
      <mesh receiveShadow position={[0, 0.025, 0]}>
        <boxGeometry args={[room.size.width, 0.05, room.size.depth]} />
        <meshStandardMaterial color={room.colorToken} transparent opacity={active ? 0.22 : 0.1} roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.24, -room.size.depth / 2]}>
        <boxGeometry args={[room.size.width, 0.48, 0.12]} />
        <meshStandardMaterial color="#102035" emissive={room.colorToken} emissiveIntensity={active ? 0.12 : 0.04} />
      </mesh>
      <mesh position={[0, 0.24, room.size.depth / 2]}>
        <boxGeometry args={[room.size.width, 0.48, 0.12]} />
        <meshStandardMaterial color="#102035" emissive={room.colorToken} emissiveIntensity={active ? 0.12 : 0.04} />
      </mesh>
      <mesh position={[-room.size.width / 2, 0.24, 0]}>
        <boxGeometry args={[0.12, 0.48, room.size.depth]} />
        <meshStandardMaterial color="#102035" emissive={room.colorToken} emissiveIntensity={active ? 0.12 : 0.04} />
      </mesh>
      <mesh position={[room.size.width / 2, 0.24, 0]}>
        <boxGeometry args={[0.12, 0.48, room.size.depth]} />
        <meshStandardMaterial color="#102035" emissive={room.colorToken} emissiveIntensity={active ? 0.12 : 0.04} />
      </mesh>
      <mesh position={[entrance.x, 0.075, entrance.z]} rotation={[-Math.PI / 2, 0, entrance.rotation]}>
        <planeGeometry args={[0.6, 0.28]} />
        <meshStandardMaterial color="#f5fbff" emissive={room.colorToken} emissiveIntensity={0.22} transparent opacity={0.82} />
      </mesh>
      {!reducedDetail && (
        <pointLight position={[0, 1.55, 0]} intensity={0.12} color={room.colorToken} />
      )}
      <FacilitySignage label={room.signage} position={[0, 1.18, 0]} color={room.colorToken} />
    </group>
  );
}

function entranceMarker(room: FacilityRoomDefinition): { x: number; z: number; rotation: number } {
  if (room.entranceFacing === "north") return { x: 0, z: -room.size.depth / 2 - 0.08, rotation: 0 };
  if (room.entranceFacing === "south") return { x: 0, z: room.size.depth / 2 + 0.08, rotation: Math.PI };
  if (room.entranceFacing === "east") return { x: room.size.width / 2 + 0.08, z: 0, rotation: Math.PI / 2 };
  return { x: -room.size.width / 2 - 0.08, z: 0, rotation: -Math.PI / 2 };
}
