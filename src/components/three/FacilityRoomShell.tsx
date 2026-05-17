import type { FacilityRoomDefinition } from "../../game/facility/facilityTypes";
import { FacilitySignage } from "./FacilitySignage";

export function FacilityRoomShell({ room, active, reducedDetail }: { room: FacilityRoomDefinition; active: boolean; reducedDetail: boolean }) {
  const entrance = entranceMarker(room);
  const shell = shellStyle(room);
  return (
    <group position={[room.position.x, 0, room.position.z]}>
      <mesh receiveShadow position={[0, 0.025, 0]}>
        <boxGeometry args={[room.size.width, 0.05, room.size.depth]} />
        <meshStandardMaterial color={room.colorToken} transparent opacity={active ? 0.24 : shell.floorOpacity} roughness={0.72} />
      </mesh>
      <Wall x={0} z={-room.size.depth / 2} width={room.size.width} depth={0.12} height={shell.wallHeight} color={shell.wallColor} accent={room.colorToken} active={active} />
      <Wall x={0} z={room.size.depth / 2} width={room.size.width} depth={0.12} height={shell.wallHeight} color={shell.wallColor} accent={room.colorToken} active={active} />
      <Wall x={-room.size.width / 2} z={0} width={0.12} depth={room.size.depth} height={shell.wallHeight} color={shell.wallColor} accent={room.colorToken} active={active} />
      <Wall x={room.size.width / 2} z={0} width={0.12} depth={room.size.depth} height={shell.wallHeight} color={shell.wallColor} accent={room.colorToken} active={active} />
      <mesh position={[0, shell.wallHeight + 0.09, 0]}>
        <boxGeometry args={[room.size.width + 0.12, 0.1, room.size.depth + 0.12]} />
        <meshStandardMaterial color="#07111f" emissive={room.colorToken} emissiveIntensity={shell.headerGlow} transparent opacity={shell.headerOpacity} />
      </mesh>
      <mesh position={[entrance.x, 0.08, entrance.z]} rotation={[-Math.PI / 2, 0, entrance.rotation]}>
        <planeGeometry args={[shell.entranceWidth, 0.32]} />
        <meshStandardMaterial color="#f5fbff" emissive={room.colorToken} emissiveIntensity={0.26} transparent opacity={0.86} />
      </mesh>
      <mesh position={[entrance.x, 0.32, entrance.z]} rotation={[0, entrance.wallRotation, 0]}>
        <boxGeometry args={[shell.entranceWidth, 0.14, 0.12]} />
        <meshStandardMaterial color={room.colorToken} emissive={room.colorToken} emissiveIntensity={0.18} />
      </mesh>
      {!reducedDetail && (
        <>
          <CornerPost x={-room.size.width / 2} z={-room.size.depth / 2} height={shell.wallHeight} color={room.colorToken} />
          <CornerPost x={room.size.width / 2} z={-room.size.depth / 2} height={shell.wallHeight} color={room.colorToken} />
          <CornerPost x={-room.size.width / 2} z={room.size.depth / 2} height={shell.wallHeight} color={room.colorToken} />
          <CornerPost x={room.size.width / 2} z={room.size.depth / 2} height={shell.wallHeight} color={room.colorToken} />
          <pointLight position={[0, 1.55, 0]} intensity={0.12} color={room.colorToken} />
        </>
      )}
      {(active || room.priority === "core") && <FacilitySignage label={room.signage} position={[0, shell.wallHeight + 0.54, 0]} color={room.colorToken} />}
    </group>
  );
}

function Wall({
  x,
  z,
  width,
  depth,
  height,
  color,
  accent,
  active
}: {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
  accent: string;
  active: boolean;
}) {
  return (
    <mesh position={[x, height / 2, z]}>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={color} emissive={accent} emissiveIntensity={active ? 0.14 : 0.045} roughness={0.68} />
    </mesh>
  );
}

function CornerPost({ x, z, height, color }: { x: number; z: number; height: number; color: string }) {
  return (
    <mesh position={[x, height / 2 + 0.05, z]}>
      <boxGeometry args={[0.18, height + 0.1, 0.18]} />
      <meshStandardMaterial color="#0b1728" emissive={color} emissiveIntensity={0.16} />
    </mesh>
  );
}

function shellStyle(room: FacilityRoomDefinition): {
  wallHeight: number;
  wallColor: string;
  floorOpacity: number;
  headerGlow: number;
  headerOpacity: number;
  entranceWidth: number;
} {
  if (room.roomId === "arena") {
    return { wallHeight: 0.72, wallColor: "#17314a", floorOpacity: 0.16, headerGlow: 0.1, headerOpacity: 0.42, entranceWidth: 1.65 };
  }
  if (room.floor === "suite") {
    return { wallHeight: 0.76, wallColor: "#1f2638", floorOpacity: 0.14, headerGlow: 0.08, headerOpacity: 0.34, entranceWidth: 0.82 };
  }
  if (room.priority === "utility") {
    return { wallHeight: 0.42, wallColor: "#102035", floorOpacity: 0.12, headerGlow: 0.04, headerOpacity: 0.26, entranceWidth: 0.74 };
  }
  return { wallHeight: 0.54, wallColor: "#102035", floorOpacity: 0.1, headerGlow: 0.05, headerOpacity: 0.3, entranceWidth: 0.72 };
}

function entranceMarker(room: FacilityRoomDefinition): { x: number; z: number; rotation: number; wallRotation: number } {
  if (room.entranceFacing === "north") return { x: 0, z: -room.size.depth / 2 - 0.08, rotation: 0, wallRotation: 0 };
  if (room.entranceFacing === "south") return { x: 0, z: room.size.depth / 2 + 0.08, rotation: Math.PI, wallRotation: 0 };
  if (room.entranceFacing === "east") return { x: room.size.width / 2 + 0.08, z: 0, rotation: Math.PI / 2, wallRotation: Math.PI / 2 };
  return { x: -room.size.width / 2 - 0.08, z: 0, rotation: -Math.PI / 2, wallRotation: Math.PI / 2 };
}
