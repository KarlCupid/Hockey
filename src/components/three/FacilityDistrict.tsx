import type { FacilityDistrict as FacilityDistrictDefinition } from "../../game/facility/facilityTypes";
import { FacilitySignage } from "./FacilitySignage";

export function FacilityDistrict({ district, reducedDetail }: { district: FacilityDistrictDefinition; reducedDetail: boolean }) {
  const { x, z, width, depth } = district.bounds;
  return (
    <group>
      <mesh receiveShadow position={[x, -0.015, z]}>
        <boxGeometry args={[width, 0.035, depth]} />
        <meshStandardMaterial color={district.colorToken} transparent opacity={0.12} roughness={0.8} />
      </mesh>
      <DistrictCurb x={x} z={z - depth / 2} width={width} depth={0.12} color={district.colorToken} />
      <DistrictCurb x={x} z={z + depth / 2} width={width} depth={0.12} color={district.colorToken} />
      <DistrictCurb x={x - width / 2} z={z} width={0.12} depth={depth} color={district.colorToken} />
      <DistrictCurb x={x + width / 2} z={z} width={0.12} depth={depth} color={district.colorToken} />
      <mesh position={[district.landmarkPosition.x, 0.005, district.landmarkPosition.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.9, 36]} />
        <meshStandardMaterial color={district.colorToken} emissive={district.colorToken} emissiveIntensity={0.08} transparent opacity={0.2} />
      </mesh>
      {!reducedDetail && (
        <>
          <DistrictCurb x={x} z={z} width={Math.max(1.6, width * 0.38)} depth={0.08} color={district.colorToken} />
          <DistrictCurb x={x} z={z} width={0.08} depth={Math.max(1.6, depth * 0.38)} color={district.colorToken} />
        </>
      )}
      {!reducedDetail && (
        <pointLight position={[district.landmarkPosition.x, 2.4, district.landmarkPosition.z]} intensity={0.18} color={district.colorToken} />
      )}
      <FacilitySignage
        label={district.label.toUpperCase()}
        position={[district.landmarkPosition.x, 1.9, district.landmarkPosition.z]}
        color={district.colorToken}
        tone="district"
      />
    </group>
  );
}

function DistrictCurb({ x, z, width, depth, color }: { x: number; z: number; width: number; depth: number; color: string }) {
  return (
    <mesh position={[x, 0.07, z]}>
      <boxGeometry args={[width, 0.14, depth]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.08} transparent opacity={0.44} />
    </mesh>
  );
}
