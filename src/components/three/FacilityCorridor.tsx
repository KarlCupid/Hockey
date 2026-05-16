import type { FacilityBlueprint, FacilityPathNode } from "../../game/facility/facilityTypes";

export function FacilityCorridor({ blueprint, reducedDetail }: { blueprint: FacilityBlueprint; reducedDetail: boolean }) {
  const segments = getSegments(blueprint.pathNodes);
  return (
    <group>
      {segments.map(([a, b]) => (
        <CorridorSegment key={`${a.id}-${b.id}`} from={a} to={b} main={blueprint.mainCorridorNodes.includes(a.id) && blueprint.mainCorridorNodes.includes(b.id)} />
      ))}
      {!reducedDetail &&
        blueprint.pathNodes
          .filter((node) => node.isLandmark)
          .map((node) => (
            <mesh key={node.id} position={[node.position.x, 0.035, node.position.z]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.45, 0.52, 32]} />
              <meshStandardMaterial color="#dff6ff" emissive="#61c9ff" emissiveIntensity={0.22} transparent opacity={0.72} />
            </mesh>
          ))}
    </group>
  );
}

function CorridorSegment({ from, to, main }: { from: FacilityPathNode; to: FacilityPathNode; main: boolean }) {
  const dx = to.position.x - from.position.x;
  const dz = to.position.z - from.position.z;
  const length = Math.hypot(dx, dz);
  const angle = Math.atan2(dx, dz);
  return (
    <mesh position={[(from.position.x + to.position.x) / 2, 0.01, (from.position.z + to.position.z) / 2]} rotation={[0, angle, 0]}>
      <boxGeometry args={[main ? 1.55 : 1.18, 0.045, length]} />
      <meshStandardMaterial color={main ? "#163451" : "#10263d"} emissive={main ? "#61c9ff" : "#1f6b8a"} emissiveIntensity={main ? 0.08 : 0.04} roughness={0.78} />
    </mesh>
  );
}

function getSegments(pathNodes: FacilityPathNode[]): Array<[FacilityPathNode, FacilityPathNode]> {
  const byId = new Map(pathNodes.map((node) => [node.id, node]));
  const seen = new Set<string>();
  const segments: Array<[FacilityPathNode, FacilityPathNode]> = [];
  pathNodes.forEach((node) => {
    node.connectedNodeIds.forEach((connectedId) => {
      const connected = byId.get(connectedId);
      if (!connected) return;
      const key = [node.id, connected.id].sort().join(":");
      if (seen.has(key)) return;
      seen.add(key);
      segments.push([node, connected]);
    });
  });
  return segments;
}
