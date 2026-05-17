import type { RoomId } from "../types";
import { getFacilityDistrictAdjacency } from "./facilityBlueprint";
import type {
  FacilityBlueprint,
  FacilityDistrict,
  FacilityDistrictId,
  FacilityPathNode,
  FacilityPoint,
  FacilityRoomDefinition,
  FacilityValidationReport
} from "./facilityTypes";

const CORE_REACH_DISTANCE = 4.5;
const ROOM_DISTRICT_TOLERANCE = 0.75;
const ENTRANCE_CORRIDOR_DISTANCE = 2.3;
const MAP_PIN_COLLISION_DISTANCE = 5.2;

export function validateFacilityBlueprint(blueprint: FacilityBlueprint, allRoomIds: RoomId[]): FacilityValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingRooms = allRoomIds.filter((roomId) => !blueprint.rooms.some((room) => room.roomId === roomId));
  const duplicateRooms = findDuplicateRooms(blueprint.rooms);
  const unmappedRooms = blueprint.rooms.filter((room) => !isFiniteMapPosition(room)).map((room) => room.roomId);
  const invalidRelatedRooms = blueprint.rooms.flatMap((room) =>
    room.relatedRoomIds
      .filter((relatedRoomId) => !blueprint.rooms.some((candidate) => candidate.roomId === relatedRoomId))
      .map((relatedRoomId) => ({ roomId: room.roomId, relatedRoomId }))
  );
  const overlappingRooms = findSevereOverlaps(blueprint.rooms);
  const disconnectedRooms = findDisconnectedRooms(blueprint);
  const disconnectedDistricts = findDisconnectedDistricts(blueprint);
  const outOfDistrictRooms = findOutOfDistrictRooms(blueprint);
  const misalignedEntrances = findMisalignedEntrances(blueprint);
  const collidingMapPins = findCollidingMapPins(blueprint.rooms);
  const invalidPathConnections = findInvalidPathConnections(blueprint);
  const mainCorridorIssues = validateMainCorridor(blueprint);

  for (const roomId of missingRooms) errors.push(`Missing facility room definition for ${roomId}.`);
  for (const roomId of duplicateRooms) errors.push(`Duplicate facility room definition for ${roomId}.`);
  for (const roomId of unmappedRooms) errors.push(`Room ${roomId} has an invalid map position.`);
  for (const item of invalidRelatedRooms) errors.push(`Room ${item.roomId} references unknown related room ${item.relatedRoomId}.`);
  for (const item of overlappingRooms) errors.push(`Rooms ${item.roomIds.join(" and ")} overlap too much.`);
  for (const roomId of disconnectedRooms) errors.push(`Core room ${roomId} is not reachable from the path network.`);
  for (const districtId of disconnectedDistricts) errors.push(`District ${districtId} has no reachable path-node connection.`);
  for (const roomId of outOfDistrictRooms) errors.push(`Room ${roomId} sits outside its district bounds.`);
  for (const roomId of misalignedEntrances) errors.push(`Room ${roomId} entrance does not face a corridor or district hub.`);
  for (const item of collidingMapPins) errors.push(`Operations Map pins ${item.roomIds.join(" and ")} collide too closely.`);
  for (const issue of invalidPathConnections) errors.push(issue);
  for (const issue of mainCorridorIssues) errors.push(issue);

  const districtIds = new Set(blueprint.districts.map((district) => district.id));
  for (const room of blueprint.rooms) {
    if (!districtIds.has(room.districtId)) errors.push(`Room ${room.roomId} belongs to an unknown district ${room.districtId}.`);
    if (!Number.isFinite(room.position.x) || !Number.isFinite(room.position.z)) errors.push(`Room ${room.roomId} has an invalid physical position.`);
    if (room.size.width <= 0 || room.size.depth <= 0) errors.push(`Room ${room.roomId} has an invalid size.`);
  }

  for (const district of blueprint.districts) {
    const actualRoomIds = blueprint.rooms.filter((room) => room.districtId === district.id).map((room) => room.roomId);
    if (!actualRoomIds.length) errors.push(`District ${district.id} has no room definitions.`);
    const listedOnly = district.roomIds.filter((roomId) => !actualRoomIds.includes(roomId));
    const missingFromList = actualRoomIds.filter((roomId) => !district.roomIds.includes(roomId));
    if (listedOnly.length) warnings.push(`District ${district.label} lists rooms not assigned to it: ${listedOnly.join(", ")}.`);
    if (missingFromList.length) warnings.push(`District ${district.label} is missing roomIds: ${missingFromList.join(", ")}.`);
  }

  for (const room of blueprint.rooms) {
    for (const relatedRoomId of room.relatedRoomIds) {
      const related = blueprint.rooms.find((candidate) => candidate.roomId === relatedRoomId);
      if (!related) continue;
      if (!areRelatedRoomsReasonable(room, related)) {
        warnings.push(`${room.label} is related to ${related.label}, but the rooms are far apart without adjacent district flow.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    missingRooms,
    duplicateRooms,
    overlappingRooms,
    disconnectedRooms,
    disconnectedDistricts,
    outOfDistrictRooms,
    misalignedEntrances,
    collidingMapPins,
    invalidPathConnections,
    mainCorridorIssues,
    unmappedRooms,
    invalidRelatedRooms
  };
}

function findDuplicateRooms(rooms: FacilityRoomDefinition[]): RoomId[] {
  const seen = new Set<RoomId>();
  const duplicates = new Set<RoomId>();
  for (const room of rooms) {
    if (seen.has(room.roomId)) duplicates.add(room.roomId);
    seen.add(room.roomId);
  }
  return [...duplicates];
}

function isFiniteMapPosition(room: FacilityRoomDefinition): boolean {
  return Number.isFinite(room.mapPosition.x) && Number.isFinite(room.mapPosition.y) && room.mapPosition.x >= 0 && room.mapPosition.x <= 100 && room.mapPosition.y >= 0 && room.mapPosition.y <= 100;
}

function findSevereOverlaps(rooms: FacilityRoomDefinition[]): FacilityValidationReport["overlappingRooms"] {
  const overlaps: FacilityValidationReport["overlappingRooms"] = [];
  for (let aIndex = 0; aIndex < rooms.length; aIndex += 1) {
    for (let bIndex = aIndex + 1; bIndex < rooms.length; bIndex += 1) {
      const a = rooms[aIndex];
      const b = rooms[bIndex];
      const overlapWidth = Math.max(0, Math.min(right(a), right(b)) - Math.max(left(a), left(b)));
      const overlapDepth = Math.max(0, Math.min(bottom(a), bottom(b)) - Math.max(top(a), top(b)));
      const overlapArea = overlapWidth * overlapDepth;
      if (overlapArea <= 0) continue;
      const smallerArea = Math.min(a.size.width * a.size.depth, b.size.width * b.size.depth);
      const ratio = smallerArea > 0 ? overlapArea / smallerArea : 1;
      if (ratio >= 0.18) overlaps.push({ roomIds: [a.roomId, b.roomId], overlapRatio: Number(ratio.toFixed(3)) });
    }
  }
  return overlaps;
}

function findDisconnectedRooms(blueprint: FacilityBlueprint): RoomId[] {
  const connectedNodeIds = reachableNodeIds(blueprint);
  return blueprint.rooms
    .filter((room) => room.priority === "core")
    .filter((room) => {
      const nearest = nearestPathNode(blueprint, room.position);
      return !nearest || !connectedNodeIds.has(nearest.id) || distance(room.position, nearest.position) > CORE_REACH_DISTANCE;
    })
    .map((room) => room.roomId);
}

function findDisconnectedDistricts(blueprint: FacilityBlueprint): FacilityDistrictId[] {
  const connectedNodeIds = reachableNodeIds(blueprint);
  return blueprint.districts
    .filter((district) => {
      const districtNodes = blueprint.pathNodes.filter((node) => node.districtId === district.id);
      return !districtNodes.length || !districtNodes.some((node) => connectedNodeIds.has(node.id) && hasKnownConnection(blueprint, node));
    })
    .map((district) => district.id);
}

function findOutOfDistrictRooms(blueprint: FacilityBlueprint): RoomId[] {
  const districtsById = new Map(blueprint.districts.map((district) => [district.id, district]));
  return blueprint.rooms
    .filter((room) => {
      const district = districtsById.get(room.districtId);
      return !district || !roomInsideDistrict(room, district, ROOM_DISTRICT_TOLERANCE);
    })
    .map((room) => room.roomId);
}

function findMisalignedEntrances(blueprint: FacilityBlueprint): RoomId[] {
  const segments = pathSegments(blueprint);
  return blueprint.rooms.filter((room) => !entranceFacesPathNetwork(room, segments)).map((room) => room.roomId);
}

function findCollidingMapPins(rooms: FacilityRoomDefinition[]): FacilityValidationReport["collidingMapPins"] {
  const collisions: FacilityValidationReport["collidingMapPins"] = [];
  for (let aIndex = 0; aIndex < rooms.length; aIndex += 1) {
    for (let bIndex = aIndex + 1; bIndex < rooms.length; bIndex += 1) {
      const a = rooms[aIndex];
      const b = rooms[bIndex];
      const pinDistance = Math.hypot(a.mapPosition.x - b.mapPosition.x, a.mapPosition.y - b.mapPosition.y);
      if (pinDistance < MAP_PIN_COLLISION_DISTANCE) {
        collisions.push({ roomIds: [a.roomId, b.roomId], distance: Number(pinDistance.toFixed(2)) });
      }
    }
  }
  return collisions;
}

function findInvalidPathConnections(blueprint: FacilityBlueprint): string[] {
  const issues: string[] = [];
  const byId = new Map(blueprint.pathNodes.map((node) => [node.id, node]));
  for (const node of blueprint.pathNodes) {
    for (const connectedId of node.connectedNodeIds) {
      const connected = byId.get(connectedId);
      if (!connected) {
        issues.push(`Path node ${node.id} connects to unknown node ${connectedId}.`);
        continue;
      }
      if (!connected.connectedNodeIds.includes(node.id)) {
        issues.push(`Path node ${node.id} connection to ${connectedId} is not reciprocal.`);
      }
    }
  }
  return issues;
}

function validateMainCorridor(blueprint: FacilityBlueprint): string[] {
  const issues: string[] = [];
  const nodes = blueprint.mainCorridorNodes.map((nodeId) => blueprint.pathNodes.find((candidate) => candidate.id === nodeId));
  if (nodes.some((node) => !node)) issues.push("Main corridor references an unknown path node.");
  const knownNodes = nodes.filter(Boolean) as FacilityPathNode[];
  const repeated = knownNodes.filter((node, index) => knownNodes.findIndex((candidate) => candidate.id === node.id) !== index);
  if (repeated.length) issues.push(`Main corridor repeats path nodes: ${repeated.map((node) => node.id).join(", ")}.`);
  if (knownNodes[0]?.id !== "spawn-concourse") issues.push("Main corridor must start at the Central Concourse spawn node.");
  const requiredDistricts: FacilityDistrictId[] = ["entry", "hockeyOps", "teamWing", "arena"];
  for (const districtId of requiredDistricts) {
    if (!knownNodes.some((node) => node.districtId === districtId)) issues.push(`Main corridor must include ${districtId}.`);
  }
  for (let index = 0; index < knownNodes.length - 1; index += 1) {
    const current = knownNodes[index];
    const next = knownNodes[index + 1];
    if (!current.connectedNodeIds.includes(next.id)) issues.push(`Main corridor segment ${current.id} -> ${next.id} is not connected.`);
  }
  const first = knownNodes[0];
  const last = knownNodes[knownNodes.length - 1];
  if (first && last && last.position.z <= first.position.z + 6) {
    issues.push("Main corridor must visibly progress from the concourse toward the arena bowl.");
  }
  return issues;
}

function reachableNodeIds(blueprint: FacilityBlueprint): Set<string> {
  const start = blueprint.pathNodes.find((node) => node.id === "spawn-concourse") ?? nearestPathNode(blueprint, blueprint.spawnPoint);
  const reachable = new Set<string>();
  const queue = start ? [start.id] : [];
  while (queue.length) {
    const id = queue.shift()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    const node = blueprint.pathNodes.find((candidate) => candidate.id === id);
    node?.connectedNodeIds.forEach((connectedId) => {
      if (!reachable.has(connectedId)) queue.push(connectedId);
    });
  }
  return reachable;
}

function nearestPathNode(blueprint: FacilityBlueprint, position: FacilityPoint): FacilityPathNode | undefined {
  return [...blueprint.pathNodes].sort((a, b) => distance(position, a.position) - distance(position, b.position))[0];
}

function areRelatedRoomsReasonable(a: FacilityRoomDefinition, b: FacilityRoomDefinition): boolean {
  if (a.districtId === b.districtId) return true;
  const adjacent = getFacilityDistrictAdjacency()[a.districtId] ?? [];
  if (adjacent.includes(b.districtId)) return true;
  return districtPathDistance(a.districtId, b.districtId) <= 3 || distance(a.position, b.position) <= 9;
}

function districtPathDistance(from: FacilityDistrictId, to: FacilityDistrictId): number {
  if (from === to) return 0;
  const adjacency = getFacilityDistrictAdjacency();
  const queue: Array<{ districtId: FacilityDistrictId; steps: number }> = [{ districtId: from, steps: 0 }];
  const visited = new Set<FacilityDistrictId>();
  while (queue.length) {
    const { districtId, steps } = queue.shift()!;
    if (districtId === to) return steps;
    if (visited.has(districtId)) continue;
    visited.add(districtId);
    for (const next of adjacency[districtId] ?? []) {
      if (!visited.has(next)) queue.push({ districtId: next, steps: steps + 1 });
    }
  }
  return Number.POSITIVE_INFINITY;
}

function hasKnownConnection(blueprint: FacilityBlueprint, node: FacilityPathNode): boolean {
  return node.connectedNodeIds.some((connectedId) => blueprint.pathNodes.some((candidate) => candidate.id === connectedId));
}

function roomInsideDistrict(room: FacilityRoomDefinition, district: FacilityDistrict, tolerance: number): boolean {
  return (
    left(room) >= district.bounds.x - district.bounds.width / 2 - tolerance &&
    right(room) <= district.bounds.x + district.bounds.width / 2 + tolerance &&
    top(room) >= district.bounds.z - district.bounds.depth / 2 - tolerance &&
    bottom(room) <= district.bounds.z + district.bounds.depth / 2 + tolerance
  );
}

function entranceFacesPathNetwork(room: FacilityRoomDefinition, segments: Array<[FacilityPathNode, FacilityPathNode]>): boolean {
  const entrance = entrancePoint(room);
  const forward = facingVector(room);
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestPoint: FacilityPoint | undefined;
  for (const [from, to] of segments) {
    const point = closestPointOnSegment(entrance, from.position, to.position);
    const pointDistance = distance(entrance, point);
    if (pointDistance < bestDistance) {
      bestDistance = pointDistance;
      bestPoint = point;
    }
  }
  if (!bestPoint || bestDistance > ENTRANCE_CORRIDOR_DISTANCE) return false;
  const towardPath = { x: bestPoint.x - room.position.x, z: bestPoint.z - room.position.z };
  return towardPath.x * forward.x + towardPath.z * forward.z > 0.15;
}

function pathSegments(blueprint: FacilityBlueprint): Array<[FacilityPathNode, FacilityPathNode]> {
  const byId = new Map(blueprint.pathNodes.map((node) => [node.id, node]));
  const seen = new Set<string>();
  const segments: Array<[FacilityPathNode, FacilityPathNode]> = [];
  blueprint.pathNodes.forEach((node) => {
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

function closestPointOnSegment(point: FacilityPoint, from: FacilityPoint, to: FacilityPoint): FacilityPoint {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared === 0) return { ...from };
  const t = Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.z - from.z) * dz) / lengthSquared));
  return { x: from.x + dx * t, z: from.z + dz * t };
}

function entrancePoint(room: FacilityRoomDefinition): FacilityPoint {
  if (room.entranceFacing === "north") return { x: room.position.x, z: room.position.z - room.size.depth / 2 - 0.08 };
  if (room.entranceFacing === "south") return { x: room.position.x, z: room.position.z + room.size.depth / 2 + 0.08 };
  if (room.entranceFacing === "east") return { x: room.position.x + room.size.width / 2 + 0.08, z: room.position.z };
  return { x: room.position.x - room.size.width / 2 - 0.08, z: room.position.z };
}

function facingVector(room: FacilityRoomDefinition): FacilityPoint {
  if (room.entranceFacing === "north") return { x: 0, z: -1 };
  if (room.entranceFacing === "south") return { x: 0, z: 1 };
  if (room.entranceFacing === "east") return { x: 1, z: 0 };
  return { x: -1, z: 0 };
}

function left(room: FacilityRoomDefinition): number {
  return room.position.x - room.size.width / 2;
}

function right(room: FacilityRoomDefinition): number {
  return room.position.x + room.size.width / 2;
}

function top(room: FacilityRoomDefinition): number {
  return room.position.z - room.size.depth / 2;
}

function bottom(room: FacilityRoomDefinition): number {
  return room.position.z + room.size.depth / 2;
}

function distance(a: FacilityPoint, b: FacilityPoint): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
