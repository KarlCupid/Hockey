import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { RoomId } from "../../game/types";
import { Avatar } from "./Avatar";
import type { RoomZoneConfig } from "./RoomZone";

export function ThirdPersonController({
  zones,
  onNearbyChange
}: {
  zones: RoomZoneConfig[];
  onNearbyChange: (room?: RoomId) => void;
}) {
  const keys = useRef(new Set<string>());
  const position = useRef(new THREE.Vector3(0, 0, 0));
  const avatarRef = useRef<THREE.Group>(null);
  const lastNearby = useRef<RoomId | undefined>();
  const camera = useThree((state) => state.camera);
  const controls = useRef<React.ElementRef<typeof OrbitControls>>(null);
  const cameraOffset = useMemo(() => new THREE.Vector3(0, 5.4, 7.2), []);

  useEffect(() => {
    camera.position.copy(position.current).add(cameraOffset);
    const down = (event: KeyboardEvent) => keys.current.add(event.key.toLowerCase());
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [camera, cameraOffset]);

  useFrame((state, delta) => {
    const before = position.current.clone();
    const forward = new THREE.Vector3();
    state.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const move = new THREE.Vector3();
    if (keys.current.has("w")) move.add(forward);
    if (keys.current.has("s")) move.sub(forward);
    if (keys.current.has("a")) move.add(right);
    if (keys.current.has("d")) move.sub(right);
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(delta * 4.2);
      position.current.add(move);
      position.current.x = THREE.MathUtils.clamp(position.current.x, -10.5, 10.5);
      position.current.z = THREE.MathUtils.clamp(position.current.z, -8.5, 8.5);
    }
    const deltaPosition = position.current.clone().sub(before);
    avatarRef.current?.position.copy(position.current);
    state.camera.position.add(deltaPosition);
    controls.current?.target.copy(position.current).add(new THREE.Vector3(0, 0.85, 0));
    controls.current?.update();

    const nearby = zones.find((zone) => position.current.distanceTo(new THREE.Vector3(zone.position[0], 0, zone.position[2])) < 2.0)?.id;
    if (nearby !== lastNearby.current) {
      lastNearby.current = nearby;
      onNearbyChange(nearby);
    }
  });

  return (
    <>
      <OrbitControls ref={controls} enablePan={false} minDistance={4.2} maxDistance={9} maxPolarAngle={Math.PI / 2.15} />
      <group ref={avatarRef} position={[position.current.x, position.current.y, position.current.z]}>
        <Avatar position={[0, 0, 0]} />
      </group>
    </>
  );
}
