import type { FacilityBlueprint, FacilityPathNode } from "../../game/facility/facilityTypes";

type CorridorKind = "main" | "tunnel" | "branch";

export function FacilityCorridor({ blueprint, reducedDetail }: { blueprint: FacilityBlueprint; reducedDetail: boolean }) {
  const segments = getSegments(blueprint);
  const thresholdNodes = blueprint.pathNodes.filter((node) => isThresholdNode(blueprint, node));
  return (
    <group>
      {segments.map((segment) => (
        <CorridorSegment key={`${segment.from.id}-${segment.to.id}`} from={segment.from} to={segment.to} kind={segment.kind} reducedDetail={reducedDetail} />
      ))}
      {thresholdNodes.map((node) => (
        <ThresholdGate key={node.id} node={node} blueprint={blueprint} reducedDetail={reducedDetail} />
      ))}
      {!reducedDetail &&
        blueprint.pathNodes
          .filter((node) => node.isLandmark)
          .map((node) => (
            <mesh key={node.id} position={[node.position.x, 0.04, node.position.z]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.46, 0.56, 32]} />
              <meshStandardMaterial color="#dff6ff" emissive="#61c9ff" emissiveIntensity={0.24} transparent opacity={0.74} />
            </mesh>
          ))}
    </group>
  );
}

function CorridorSegment({
  from,
  to,
  kind,
  reducedDetail
}: {
  from: FacilityPathNode;
  to: FacilityPathNode;
  kind: CorridorKind;
  reducedDetail: boolean;
}) {
  const dx = to.position.x - from.position.x;
  const dz = to.position.z - from.position.z;
  const length = Math.hypot(dx, dz);
  const angle = Math.atan2(dx, dz);
  const width = kind === "tunnel" ? 1.95 : kind === "main" ? 1.62 : 1.05;
  const color = kind === "tunnel" ? "#1e3e59" : kind === "main" ? "#163451" : "#10263d";
  const emissive = kind === "tunnel" ? "#dff6ff" : kind === "main" ? "#61c9ff" : "#1f6b8a";
  return (
    <group position={[(from.position.x + to.position.x) / 2, 0.012, (from.position.z + to.position.z) / 2]} rotation={[0, angle, 0]}>
      <mesh>
        <boxGeometry args={[width, 0.05, length]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={kind === "branch" ? 0.045 : 0.1} roughness={0.78} />
      </mesh>
      {kind !== "branch" && (
        <>
          <mesh position={[-width / 2 + 0.12, 0.045, 0]}>
            <boxGeometry args={[0.06, 0.035, length]} />
            <meshStandardMaterial color={emissive} emissive={emissive} emissiveIntensity={0.28} transparent opacity={0.62} />
          </mesh>
          <mesh position={[width / 2 - 0.12, 0.045, 0]}>
            <boxGeometry args={[0.06, 0.035, length]} />
            <meshStandardMaterial color={emissive} emissive={emissive} emissiveIntensity={0.28} transparent opacity={0.62} />
          </mesh>
        </>
      )}
      {kind === "tunnel" && !reducedDetail && (
        <mesh position={[0, 0.54, 0]}>
          <boxGeometry args={[width + 0.3, 0.16, length]} />
          <meshStandardMaterial color="#07111f" emissive="#dff6ff" emissiveIntensity={0.08} transparent opacity={0.52} />
        </mesh>
      )}
    </group>
  );
}

function ThresholdGate({
  node,
  blueprint,
  reducedDetail
}: {
  node: FacilityPathNode;
  blueprint: FacilityBlueprint;
  reducedDetail: boolean;
}) {
  const district = blueprint.districts.find((candidate) => candidate.id === node.districtId);
  const color = district?.colorToken ?? "#61c9ff";
  const angle = getGateAngle(blueprint, node);
  return (
    <group position={[node.position.x, 0, node.position.z]} rotation={[0, angle, 0]}>
      <mesh position={[-0.78, 0.55, 0]}>
        <boxGeometry args={[0.16, 1.1, 0.18]} />
        <meshStandardMaterial color="#0b1728" emissive={color} emissiveIntensity={0.22} />
      </mesh>
      <mesh position={[0.78, 0.55, 0]}>
        <boxGeometry args={[0.16, 1.1, 0.18]} />
        <meshStandardMaterial color="#0b1728" emissive={color} emissiveIntensity={0.22} />
      </mesh>
      <mesh position={[0, 1.12, 0]}>
        <boxGeometry args={[1.72, 0.16, 0.18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={reducedDetail ? 0.14 : 0.32} transparent opacity={0.84} />
      </mesh>
      {!reducedDetail && (
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.72, 0.82, 36]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.28} transparent opacity={0.54} />
        </mesh>
      )}
    </group>
  );
}

function getSegments(blueprint: FacilityBlueprint): Array<{ from: FacilityPathNode; to: FacilityPathNode; kind: CorridorKind }> {
  const byId = new Map(blueprint.pathNodes.map((node) => [node.id, node]));
  const seen = new Set<string>();
  const segments: Array<{ from: FacilityPathNode; to: FacilityPathNode; kind: CorridorKind }> = [];
  blueprint.pathNodes.forEach((node) => {
    node.connectedNodeIds.forEach((connectedId) => {
      const connected = byId.get(connectedId);
      if (!connected) return;
      const key = [node.id, connected.id].sort().join(":");
      if (seen.has(key)) return;
      seen.add(key);
      segments.push({ from: node, to: connected, kind: segmentKind(blueprint, node, connected) });
    });
  });
  return segments;
}

function segmentKind(blueprint: FacilityBlueprint, from: FacilityPathNode, to: FacilityPathNode): CorridorKind {
  const arenaTunnelIds = new Set(["team-hub", "arena-tunnel", "arena-gate", "arena-bowl-hub"]);
  if (arenaTunnelIds.has(from.id) && arenaTunnelIds.has(to.id)) return "tunnel";
  return isConsecutiveMainCorridorSegment(blueprint, from.id, to.id) ? "main" : "branch";
}

function isConsecutiveMainCorridorSegment(blueprint: FacilityBlueprint, a: string, b: string): boolean {
  return blueprint.mainCorridorNodes.some((nodeId, index) => {
    const next = blueprint.mainCorridorNodes[index + 1];
    return (nodeId === a && next === b) || (nodeId === b && next === a);
  });
}

function isThresholdNode(blueprint: FacilityBlueprint, node: FacilityPathNode): boolean {
  if (node.id === "spawn-concourse") return false;
  const crossesDistrict = node.connectedNodeIds.some((connectedId) => {
    const connected = blueprint.pathNodes.find((candidate) => candidate.id === connectedId);
    return connected?.districtId && connected.districtId !== node.districtId;
  });
  return crossesDistrict || node.id.includes("gate");
}

function getGateAngle(blueprint: FacilityBlueprint, node: FacilityPathNode): number {
  const connected =
    node.connectedNodeIds
      .map((connectedId) => blueprint.pathNodes.find((candidate) => candidate.id === connectedId))
      .find((candidate) => candidate?.districtId !== node.districtId) ??
    node.connectedNodeIds.map((connectedId) => blueprint.pathNodes.find((candidate) => candidate.id === connectedId)).find(Boolean);
  if (!connected) return 0;
  return Math.atan2(connected.position.x - node.position.x, connected.position.z - node.position.z);
}
