import type { RoomId } from "../types";
import type { FacilityBlueprint, FacilityDistrict, FacilityRoomDefinition } from "./facilityTypes";
import { getDistrictForRoom, getNearestRoomFromPosition, getRoomDefinition } from "./facilityNavigation";

export function getCurrentDistrictFromPosition(
  blueprint: FacilityBlueprint,
  position: { x: number; z: number }
): FacilityDistrict | undefined {
  return (
    blueprint.districts.find((district) => positionInBounds(position, district.bounds)) ??
    [...blueprint.districts].sort((a, b) => pointDistance(position, a.landmarkPosition) - pointDistance(position, b.landmarkPosition))[0]
  );
}

export function getNearestLandmark(blueprint: FacilityBlueprint, position: { x: number; z: number }) {
  return [...blueprint.landmarks].sort((a, b) => pointDistance(position, a.position) - pointDistance(position, b.position))[0];
}

export function getWayfindingLabel(
  blueprint: FacilityBlueprint,
  position: { x: number; z: number },
  nearbyRoom?: FacilityRoomDefinition
): string {
  if (nearbyRoom) {
    const district = getDistrictForRoom(blueprint, nearbyRoom.roomId);
    return `${district.label} -> ${getRoomEntrancePrompt(nearbyRoom)}`;
  }
  const district = getCurrentDistrictFromPosition(blueprint, position);
  const landmark = getNearestLandmark(blueprint, position);
  if (district && landmark) return `${district.label} -> ${landmark.label}`;
  if (district) return district.label;
  return "Facility Hub";
}

export function getBreadcrumbForRoom(blueprint: FacilityBlueprint, roomId: RoomId): string[] {
  const room = getRoomDefinition(blueprint, roomId);
  const district = getDistrictForRoom(blueprint, roomId);
  return ["Central Concourse", district.label, room.label];
}

export function getRoomEntrancePrompt(room: FacilityRoomDefinition): string {
  const action = room.priority === "utility" || room.districtId === "utility" || room.districtId === "customization" ? "Open" : "Enter";
  return `${action} ${room.label}`;
}

export function getNearestRoomLabel(blueprint: FacilityBlueprint, position: { x: number; z: number }): string {
  return getNearestRoomFromPosition(blueprint, position)?.label ?? "Facility Hub";
}

function positionInBounds(position: { x: number; z: number }, bounds: { x: number; z: number; width: number; depth: number }): boolean {
  return (
    position.x >= bounds.x - bounds.width / 2 &&
    position.x <= bounds.x + bounds.width / 2 &&
    position.z >= bounds.z - bounds.depth / 2 &&
    position.z <= bounds.z + bounds.depth / 2
  );
}

function pointDistance(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
