import type { FacilityBlueprint } from "../../game/facility/facilityTypes";

export function FacilityLandmark({ landmark, blueprint, reducedDetail }: { landmark: FacilityBlueprint["landmarks"][number]; blueprint: FacilityBlueprint; reducedDetail: boolean }) {
  const district = blueprint.districts.find((candidate) => candidate.id === landmark.districtId);
  const color = district?.colorToken ?? "#61c9ff";
  return (
    <group position={[landmark.position.x, 0, landmark.position.z]}>
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.26, 0.36, 0.84, 18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.14} roughness={0.42} />
      </mesh>
      {!reducedDetail && (
        <mesh position={[0, 0.92, 0]}>
          <sphereGeometry args={[0.18, 18, 18]} />
          <meshStandardMaterial color="#f5fbff" emissive={color} emissiveIntensity={0.22} />
        </mesh>
      )}
    </group>
  );
}
