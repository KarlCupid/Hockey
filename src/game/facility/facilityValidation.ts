import type { RoomId } from "../types";
import { getFacilityDistrictAdjacency } from "./facilityBlueprint";
import type { FacilityBlueprint, FacilityRoomDefinition, FacilityValidationReport } from "./facilityTypes";

const CORE_REACH_DISTANCE = 4.5;

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

  for (const roomId of missingRooms) errors.push(`Missing facility room definition for ${roomId}.`);
  for (const roomId of duplicateRooms) errors.push(`Duplicate facility room definition for ${roomId}.`);
  for (const roomId of unmappedRooms) errors.push(`Room ${roomId} has an invalid map position.`);
  for (const item of invalidRelatedRooms) errors.push(`Room ${item.roomId} references unknown related room ${item.relatedRoomId}.`);
  for (const item of overlappingRooms) errors.push(`Rooms ${item.roomIds.join(" and ")} overlap too much.`);
  for (const roomId of disconnectedRooms) errors.push(`Core room ${roomId} is not reachable from the path network.`);

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
      if (!areRelatedRoomsReasonable(blueprint, room, related)) {
        warnings.push(`${room.label} is related to ${related.label}, but the rooms are far apart without adjacent districts.`);
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
      const nearest = nearestPathNode(blueprint, room);
      return !nearest || !connectedNodeIds.has(nearest.id) || distance(room.position, nearest.position) > CORE_REACH_DISTANCE;
    })
    .map((room) => room.roomId);
}

function reachableNodeIds(blueprint: FacilityBlueprint): Set<string> {
  const start = blueprint.pathNodes.find((node) => node.id === blueprint.mainCorridorNodes[0]) ?? blueprint.pathNodes[0];
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

function nearestPathNode(blueprint: FacilityBlueprint, room: FacilityRoomDefinition) {
  return [...blueprint.pathNodes].sort((a, b) => distance(room.position, a.position) - distance(room.position, b.position))[0];
}

function areRelatedRoomsReasonable(blueprint: FacilityBlueprint, a: FacilityRoomDefinition, b: FacilityRoomDefinition): boolean {
  if (a.districtId === b.districtId) return true;
  const adjacent = getFacilityDistrictAdjacency()[a.districtId] ?? [];
  if (adjacent.includes(b.districtId)) return true;
  return distance(a.position, b.position) <= 9;
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

function distance(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
