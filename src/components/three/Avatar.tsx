import type { Vector3Tuple } from "three";

export function Avatar({ position }: { position: Vector3Tuple }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.55, 0]}>
        <capsuleGeometry args={[0.28, 0.75, 8, 16]} />
        <meshStandardMaterial color="#dcecff" roughness={0.52} metalness={0.08} />
      </mesh>
      <mesh position={[0, 1.18, 0]}>
        <sphereGeometry args={[0.2, 20, 20]} />
        <meshStandardMaterial color="#9fc6e8" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.18, -0.18]}>
        <boxGeometry args={[0.52, 0.12, 0.18]} />
        <meshStandardMaterial color="#0b1324" />
      </mesh>
    </group>
  );
}
