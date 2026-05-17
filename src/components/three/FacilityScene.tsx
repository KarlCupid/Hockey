import { Canvas } from "@react-three/fiber";
import { Grid } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { getTeamBranding } from "../../game/assets/teamBranding";
import { createDefaultFacilityBlueprint } from "../../game/facility/facilityBlueprint";
import type { FacilityBlueprint } from "../../game/facility/facilityTypes";
import { useFranchiseStore } from "../../store/franchiseStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useUiStore } from "../../store/uiStore";
import { FacilityCorridor } from "./FacilityCorridor";
import { FacilityDistrict } from "./FacilityDistrict";
import { FacilityLandmark } from "./FacilityLandmark";
import { FacilityPropSet } from "./FacilityPropSet";
import { FacilityRoomShell } from "./FacilityRoomShell";
import { RoomZone, type RoomZoneConfig } from "./RoomZone";
import { ThirdPersonController } from "./ThirdPersonController";

export function shouldRenderFacilityAtmosphere(reducedDetail: boolean): boolean {
  return !reducedDetail;
}

export function FacilityScene() {
  const nearbyRoom = useUiStore((state) => state.nearbyRoom);
  const setNearbyRoom = useUiStore((state) => state.setNearbyRoom);
  const setActiveRoom = useUiStore((state) => state.setActiveRoom);
  const setFacilityPosition = useUiStore((state) => state.setFacilityPosition);
  const franchise = useFranchiseStore((state) => state.franchise);
  const reduced3DDetail = useSettingsStore((state) => state.settings.reduced3DDetail);
  const selectedTeamId = franchise?.selectedTeamId ?? "harbor-city";
  const blueprint = useMemo(() => createDefaultFacilityBlueprint(), []);
  const zones = useMemo(() => createRoomZones(blueprint), [blueprint]);
  const worldBounds = useMemo(() => getWorldBounds(blueprint), [blueprint]);

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
        <fog attach="fog" args={["#07111f", 14, 42]} />
        <ambientLight intensity={0.42} />
        <directionalLight position={[5, 12, 6]} intensity={1.35} castShadow />
        <pointLight position={[0, 3, 0]} intensity={1.1} color="#60c9ff" />
        <FacilityGeometry blueprint={blueprint} selectedTeamId={selectedTeamId} nearbyRoom={nearbyRoom} reducedDetail={reduced3DDetail} />
        <Grid args={[42, 34]} cellSize={1} sectionSize={4} cellColor="#17304d" sectionColor="#6ecbff" fadeDistance={36} fadeStrength={1.3} />
        {zones.map((zone) => (
          <RoomZone key={zone.id} zone={zone} active={nearbyRoom === zone.id} onOpen={setActiveRoom} />
        ))}
        <ThirdPersonController
          zones={zones}
          onNearbyChange={setNearbyRoom}
          onPositionChange={setFacilityPosition}
          spawnPoint={blueprint.spawnPoint}
          worldBounds={worldBounds}
        />
      </Canvas>
    </div>
  );
}

function FacilityGeometry({
  blueprint,
  selectedTeamId,
  nearbyRoom,
  reducedDetail
}: {
  blueprint: FacilityBlueprint;
  selectedTeamId: string;
  nearbyRoom?: string;
  reducedDetail: boolean;
}) {
  const bounds = getWorldBounds(blueprint);
  const floorWidth = bounds.maxX - bounds.minX + 1.2;
  const floorDepth = bounds.maxZ - bounds.minZ + 1.2;
  const floorX = (bounds.minX + bounds.maxX) / 2;
  const floorZ = (bounds.minZ + bounds.maxZ) / 2;

  return (
    <group>
      <mesh receiveShadow position={[floorX, -0.04, floorZ]}>
        <boxGeometry args={[floorWidth, 0.08, floorDepth]} />
        <meshStandardMaterial color="#0b1728" roughness={0.72} />
      </mesh>
      {blueprint.districts.map((district) => (
        <FacilityDistrict key={district.id} district={district} reducedDetail={reducedDetail} />
      ))}
      <FacilityCorridor blueprint={blueprint} reducedDetail={reducedDetail} />
      {blueprint.rooms.map((room) => (
        <FacilityRoomShell key={room.roomId} room={room} active={nearbyRoom === room.roomId} reducedDetail={reducedDetail} />
      ))}
      {blueprint.rooms.map((room) => (
        <FacilityPropSet key={`${room.roomId}-props`} room={room} reducedDetail={reducedDetail || !room.reducedDetailSafe} />
      ))}
      {!reducedDetail &&
        blueprint.landmarks.map((landmark) => (
          <FacilityLandmark key={landmark.id} landmark={landmark} blueprint={blueprint} reducedDetail={reducedDetail} />
        ))}
      <TeamBrandingWall teamId={selectedTeamId} blueprint={blueprint} />
      {shouldRenderFacilityAtmosphere(reducedDetail) && <AtmosphereLights blueprint={blueprint} selectedTeamId={selectedTeamId} />}
    </group>
  );
}

function createRoomZones(blueprint: FacilityBlueprint): RoomZoneConfig[] {
  return blueprint.rooms.map((room) => ({
    id: room.roomId,
    label: room.signage,
    position: [room.position.x, 0, room.position.z],
    color: room.colorToken,
    radius: Math.max(0.95, Math.min(1.45, Math.max(room.size.width, room.size.depth) * 0.38))
  }));
}

function getWorldBounds(blueprint: FacilityBlueprint): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const districtBounds = blueprint.districts.flatMap((district) => [
    { x: district.bounds.x - district.bounds.width / 2, z: district.bounds.z - district.bounds.depth / 2 },
    { x: district.bounds.x + district.bounds.width / 2, z: district.bounds.z + district.bounds.depth / 2 }
  ]);
  const roomBounds = blueprint.rooms.flatMap((room) => [
    { x: room.position.x - room.size.width / 2, z: room.position.z - room.size.depth / 2 },
    { x: room.position.x + room.size.width / 2, z: room.position.z + room.size.depth / 2 }
  ]);
  const points = [...districtBounds, ...roomBounds, blueprint.spawnPoint];
  return {
    minX: Math.min(...points.map((point) => point.x)) - 1.2,
    maxX: Math.max(...points.map((point) => point.x)) + 1.2,
    minZ: Math.min(...points.map((point) => point.z)) - 1.2,
    maxZ: Math.max(...points.map((point) => point.z)) + 1.2
  };
}

function TeamBrandingWall({ teamId, blueprint }: { teamId: string; blueprint: FacilityBlueprint }) {
  const brand = getTeamBranding(teamId);
  const trophyWall = blueprint.landmarks.find((landmark) => landmark.id === "trophy-wall");
  const position = trophyWall?.position ?? { x: 0, z: -4.4 };
  return (
    <group position={[position.x, 0, position.z - 0.28]}>
      <mesh position={[0, 1.25, 0]}>
        <boxGeometry args={[3.4, 1.35, 0.08]} />
        <meshStandardMaterial color={brand.secondaryColor} emissive={brand.primaryColor} emissiveIntensity={0.1} />
      </mesh>
      <mesh position={[0, 1.26, 0.08]}>
        <circleGeometry args={[0.48, 32]} />
        <meshStandardMaterial color={brand.primaryColor} emissive={brand.primaryColor} emissiveIntensity={0.3} />
      </mesh>
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} position={[x, 1.26, 0.1]}>
          <boxGeometry args={[0.38, 0.85, 0.04]} />
          <meshStandardMaterial color={brand.accentColor} />
        </mesh>
      ))}
    </group>
  );
}

function AtmosphereLights({ blueprint, selectedTeamId }: { blueprint: FacilityBlueprint; selectedTeamId: string }) {
  const brand = getTeamBranding(selectedTeamId);
  const accent = brand.accentColor ?? "#f5c65b";
  return (
    <group>
      {blueprint.districts.map((district, index) => (
        <pointLight
          key={district.id}
          position={[district.landmarkPosition.x, 2.5, district.landmarkPosition.z]}
          intensity={0.22 + (index % 3) * 0.03}
          color={index % 2 ? accent : district.colorToken}
        />
      ))}
      {blueprint.mainCorridorNodes.map((nodeId, index) => {
        const node = blueprint.pathNodes.find((candidate) => candidate.id === nodeId);
        if (!node) return null;
        return (
          <mesh key={node.id} position={[node.position.x, 0.045, node.position.z]}>
            <boxGeometry args={[0.56, 0.05, 0.18]} />
            <meshStandardMaterial color={index % 2 ? accent : brand.primaryColor} emissive={brand.primaryColor} emissiveIntensity={0.18} />
          </mesh>
        );
      })}
    </group>
  );
}
