import { Canvas } from "@react-three/fiber";
import { Environment, Grid } from "@react-three/drei";
import { useEffect } from "react";
import type { RoomId } from "../../game/types";
import { useUiStore } from "../../store/uiStore";
import { RoomZone, type RoomZoneConfig } from "./RoomZone";
import { ThirdPersonController } from "./ThirdPersonController";

const ZONES: RoomZoneConfig[] = [
  { id: "gm", label: "GM OFFICE", position: [-6.8, 0, -5.2], color: "#6ecbff" },
  { id: "coach", label: "COACH OFFICE", position: [0, 0, -6.5], color: "#8ee7d1" },
  { id: "locker", label: "LOCKER ROOM", position: [6.8, 0, -5.2], color: "#c8e9ff" },
  { id: "medical", label: "MEDICAL", position: [-7.2, 0, 4.2], color: "#ff7e8a" },
  { id: "arena", label: "ARENA BOWL", position: [0, 0, 6.2], color: "#ffffff" },
  { id: "standings", label: "TROPHY HALL", position: [7.2, 0, 4.2], color: "#f5c65b" },
  { id: "saves", label: "SAVE DESK", position: [0, 0, 0], color: "#b58cff" }
];

export function FacilityScene() {
  const nearbyRoom = useUiStore((state) => state.nearbyRoom);
  const setNearbyRoom = useUiStore((state) => state.setNearbyRoom);
  const setActiveRoom = useUiStore((state) => state.setActiveRoom);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "e" && nearbyRoom) setActiveRoom(nearbyRoom);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nearbyRoom, setActiveRoom]);

  return (
    <div className="facility-canvas">
      <Canvas shadows camera={{ position: [0, 6, 8], fov: 48 }}>
        <color attach="background" args={["#07111f"]} />
        <fog attach="fog" args={["#07111f", 12, 32]} />
        <ambientLight intensity={0.42} />
        <directionalLight position={[4, 10, 5]} intensity={1.4} castShadow />
        <pointLight position={[0, 3, 0]} intensity={1.2} color="#60c9ff" />
        <Environment preset="city" />
        <FacilityGeometry />
        <Grid args={[24, 18]} cellSize={1} sectionSize={4} cellColor="#17304d" sectionColor="#6ecbff" fadeDistance={22} fadeStrength={1.2} />
        {ZONES.map((zone) => (
          <RoomZone key={zone.id} zone={zone} active={nearbyRoom === zone.id} onOpen={setActiveRoom} />
        ))}
        <ThirdPersonController zones={ZONES} onNearbyChange={setNearbyRoom} />
      </Canvas>
    </div>
  );
}

function FacilityGeometry() {
  return (
    <group>
      <mesh receiveShadow position={[0, -0.02, 0]}>
        <boxGeometry args={[24, 0.08, 20]} />
        <meshStandardMaterial color="#0b1728" roughness={0.72} />
      </mesh>
      <mesh position={[0, 1.2, -9.8]}>
        <boxGeometry args={[24, 2.4, 0.25]} />
        <meshStandardMaterial color="#101d31" />
      </mesh>
      <mesh position={[0, 1.2, 9.8]}>
        <boxGeometry args={[24, 2.4, 0.25]} />
        <meshStandardMaterial color="#101d31" />
      </mesh>
      <mesh position={[-11.8, 1.2, 0]}>
        <boxGeometry args={[0.25, 2.4, 20]} />
        <meshStandardMaterial color="#101d31" />
      </mesh>
      <mesh position={[11.8, 1.2, 0]}>
        <boxGeometry args={[0.25, 2.4, 20]} />
        <meshStandardMaterial color="#101d31" />
      </mesh>
      <Desk position={[-6.8, 0, -6.6]} color="#1c334f" />
      <WarRoomBoard position={[-8.6, 0, -5.0]} color="#6ecbff" />
      <Desk position={[0, 0, -7.6]} color="#183b3e" />
      <CoachBoard />
      <Lockers />
      <MedicalTable />
      <MiniRink />
      <ArenaTunnel />
      <TrophyCases />
      <SaveDesk />
    </group>
  );
}

function Desk({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[2.3, 0.7, 0.9]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.82, -0.2]}>
        <boxGeometry args={[0.9, 0.45, 0.08]} />
        <meshStandardMaterial color="#bfefff" emissive="#3bb4ff" emissiveIntensity={0.18} />
      </mesh>
    </group>
  );
}

function WarRoomBoard({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[1.7, 1.1, 0.08]} />
        <meshStandardMaterial color="#dff6ff" emissive={color} emissiveIntensity={0.12} />
      </mesh>
      {[-0.45, 0, 0.45].map((x) => (
        <mesh key={x} position={[x, 1.1, 0.06]}>
          <boxGeometry args={[0.26, 0.62, 0.04]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
}

function CoachBoard() {
  return (
    <group position={[1.9, 0, -7.3]}>
      <mesh position={[0, 1.05, 0]}>
        <boxGeometry args={[1.9, 1.0, 0.08]} />
        <meshStandardMaterial color="#eefcff" emissive="#8ee7d1" emissiveIntensity={0.15} />
      </mesh>
      {[0, 1, 2, 3].map((index) => (
        <mesh key={index} position={[-0.52 + index * 0.34, 1.12, 0.07]}>
          <sphereGeometry args={[0.055, 12, 12]} />
          <meshStandardMaterial color={index % 2 ? "#d9475f" : "#1e7dd7"} />
        </mesh>
      ))}
    </group>
  );
}

function Lockers() {
  return (
    <group position={[7.4, 0, -7.2]}>
      {Array.from({ length: 5 }, (_, index) => (
        <mesh key={index} position={[index * 0.52 - 1.05, 0.7, 0]}>
          <boxGeometry args={[0.46, 1.4, 0.32]} />
          <meshStandardMaterial color={index % 2 ? "#163b5c" : "#1e4d72"} />
        </mesh>
      ))}
    </group>
  );
}

function MedicalTable() {
  return (
    <group position={[-7.4, 0, 5.9]}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[2.1, 0.24, 0.9]} />
        <meshStandardMaterial color="#dcecff" />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[1.8, 0.42, 0.62]} />
        <meshStandardMaterial color="#28445c" />
      </mesh>
    </group>
  );
}

function MiniRink() {
  return (
    <group position={[0, 0.02, 7.6]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5.2, 2.7]} />
        <meshStandardMaterial color="#dff6ff" roughness={0.25} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.45, 0.48, 48]} />
        <meshStandardMaterial color="#d9475f" />
      </mesh>
    </group>
  );
}

function ArenaTunnel() {
  return (
    <group position={[0, 0, 4.6]}>
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[3.4, 1.4, 0.18]} />
        <meshStandardMaterial color="#182a3d" emissive="#61c9ff" emissiveIntensity={0.08} />
      </mesh>
      {[-1.5, 1.5].map((x) => (
        <mesh key={x} position={[x, 0.78, 0.32]}>
          <boxGeometry args={[0.18, 1.3, 1.2]} />
          <meshStandardMaterial color="#dff6ff" />
        </mesh>
      ))}
      <mesh position={[0, 0.16, 0.66]}>
        <boxGeometry args={[3.2, 0.08, 1.2]} />
        <meshStandardMaterial color="#eefcff" emissive="#ffffff" emissiveIntensity={0.22} />
      </mesh>
    </group>
  );
}

function TrophyCases() {
  return (
    <group position={[7.3, 0, 5.8]}>
      {[-0.7, 0, 0.7].map((x) => (
        <mesh key={x} position={[x, 0.72, 0]}>
          <cylinderGeometry args={[0.16, 0.22, 0.7, 18]} />
          <meshStandardMaterial color="#f5c65b" metalness={0.65} roughness={0.25} emissive="#8a5d1f" emissiveIntensity={0.15} />
        </mesh>
      ))}
      <mesh position={[0, 0.65, 0]}>
        <boxGeometry args={[2.4, 1.4, 0.18]} />
        <meshStandardMaterial color="#bfefff" transparent opacity={0.24} />
      </mesh>
    </group>
  );
}

function SaveDesk() {
  return (
    <group position={[0, 0, 1.2]}>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[1.8, 0.84, 0.7]} />
        <meshStandardMaterial color="#2b2140" />
      </mesh>
      <mesh position={[0, 0.92, 0]}>
        <boxGeometry args={[1.1, 0.08, 0.42]} />
        <meshStandardMaterial color="#b58cff" emissive="#b58cff" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}
