import type { RoomBadge, RoomId } from "../types";
import type { FacilityBlueprint, FacilityDistrictId, FacilityPathNode, FacilityRoomDefinition } from "./facilityTypes";
import { validateFacilityBlueprint } from "./facilityValidation";

export type OperationsMapFilterId = "all" | "core" | FacilityDistrictId;

export const OPERATIONS_MAP_FILTERS: Array<{ id: OperationsMapFilterId; label: string }> = [
  { id: "all", label: "All" },
  { id: "core", label: "Core" },
  { id: "frontOffice", label: "Front Office" },
  { id: "hockeyOps", label: "Hockey Ops" },
  { id: "teamWing", label: "Team Wing" },
  { id: "arena", label: "Arena" },
  { id: "media", label: "Media" },
  { id: "development", label: "Development" },
  { id: "customization", label: "Customization" },
  { id: "utility", label: "Utility" }
];

export function getRoomDefinition(blueprint: FacilityBlueprint, roomId: RoomId): FacilityRoomDefinition {
  const room = blueprint.rooms.find((candidate) => candidate.roomId === roomId);
  if (!room) throw new Error(`Facility room not found: ${roomId}`);
  return room;
}

export function getDistrictForRoom(blueprint: FacilityBlueprint, roomId: RoomId) {
  const room = getRoomDefinition(blueprint, roomId);
  const district = blueprint.districts.find((candidate) => candidate.id === room.districtId);
  if (!district) throw new Error(`Facility district not found: ${room.districtId}`);
  return district;
}

export function getRoomsByDistrict(blueprint: FacilityBlueprint, districtId: FacilityDistrictId): FacilityRoomDefinition[] {
  return blueprint.rooms.filter((room) => room.districtId === districtId);
}

export function getNearestRoomFromPosition(
  blueprint: FacilityBlueprint,
  position: { x: number; z: number }
): FacilityRoomDefinition | undefined {
  return [...blueprint.rooms].sort((a, b) => pointDistance(position, a.position) - pointDistance(position, b.position))[0];
}

export function getRoomDistance(blueprint: FacilityBlueprint, a: RoomId, b: RoomId): number {
  const roomA = getRoomDefinition(blueprint, a);
  const roomB = getRoomDefinition(blueprint, b);
  return Number(pointDistance(roomA.position, roomB.position).toFixed(2));
}

export function getSuggestedRoomRoute(blueprint: FacilityBlueprint, fromRoomId: RoomId, toRoomId: RoomId): FacilityPathNode[] {
  const fromRoom = getRoomDefinition(blueprint, fromRoomId);
  const toRoom = getRoomDefinition(blueprint, toRoomId);
  const fromNode = getNearestPathNode(blueprint, fromRoom.position);
  const toNode = getNearestPathNode(blueprint, toRoom.position);
  if (!fromNode || !toNode) return [];
  const nodeIds = shortestNodePath(blueprint, fromNode.id, toNode.id);
  return nodeIds.map((nodeId) => blueprint.pathNodes.find((node) => node.id === nodeId)).filter(Boolean) as FacilityPathNode[];
}

export function getDistrictNavigationSummary(blueprint: FacilityBlueprint) {
  return blueprint.districts.map((district) => {
    const rooms = getRoomsByDistrict(blueprint, district.id);
    const connectedDistrictIds = new Set<FacilityDistrictId>();
    blueprint.pathNodes
      .filter((node) => node.districtId === district.id)
      .forEach((node) => {
        node.connectedNodeIds
          .map((connectedId) => blueprint.pathNodes.find((candidate) => candidate.id === connectedId)?.districtId)
          .filter(Boolean)
          .forEach((districtId) => {
            if (districtId !== district.id) connectedDistrictIds.add(districtId as FacilityDistrictId);
          });
      });
    return {
      districtId: district.id,
      label: district.label,
      roomCount: rooms.length,
      coreRoomIds: rooms.filter((room) => room.priority === "core").map((room) => room.roomId),
      landmarkLabel: district.landmarkLabel,
      connectedDistrictIds: [...connectedDistrictIds]
    };
  });
}

export function getRoomMapBadgePosition(blueprint: FacilityBlueprint, roomId: RoomId): { x: number; y: number } {
  const room = getRoomDefinition(blueprint, roomId);
  return { ...room.mapPosition };
}

export function getOperationsMapRooms(
  blueprint: FacilityBlueprint,
  filter: OperationsMapFilterId = "all",
  query = ""
): FacilityRoomDefinition[] {
  const normalized = query.trim().toLowerCase();
  return blueprint.rooms
    .filter((room) => (filter === "all" ? true : filter === "core" ? room.priority === "core" : room.districtId === filter))
    .filter((room) =>
      normalized
        ? [room.label, room.shortLabel, room.description, room.signage, getDistrictForRoom(blueprint, room.roomId).label].join(" ").toLowerCase().includes(normalized)
        : true
    )
    .sort((a, b) => a.mapPosition.y - b.mapPosition.y || a.mapPosition.x - b.mapPosition.x);
}

export function getOperationsMapPinLabel(blueprint: FacilityBlueprint, room: FacilityRoomDefinition, badges: RoomBadge[] = [], isCurrentRoom = false): string {
  const district = getDistrictForRoom(blueprint, room.roomId);
  return compactLabel([
    `${isCurrentRoom ? "Current room, " : "Select "}${room.label}`,
    district.label,
    formatRoomBadgeLabel(badges)
  ]);
}

export function getOperationsMapGoToRoomLabel(blueprint: FacilityBlueprint, room: FacilityRoomDefinition, badges: RoomBadge[] = []): string {
  const district = getDistrictForRoom(blueprint, room.roomId);
  return compactLabel([
    `Go to ${room.label}`,
    district.label,
    formatRoomBadgeLabel(badges)
  ]);
}

export function getCurrentDistrictLabel(blueprint: FacilityBlueprint, roomId?: RoomId): string {
  return roomId ? getDistrictForRoom(blueprint, roomId).label : "Central Concourse";
}

export function createFacilitySummary(blueprint: FacilityBlueprint): string {
  const districtSummary = getDistrictNavigationSummary(blueprint)
    .map((district) => `${district.label}: ${district.roomCount} room${district.roomCount === 1 ? "" : "s"} (${district.landmarkLabel})`)
    .join("; ");
  return `${blueprint.label} v${blueprint.version} | rooms=${blueprint.rooms.length} | districts=${blueprint.districts.length} | ${districtSummary}`;
}

export function exportFacilityBlueprintJson(blueprint: FacilityBlueprint): string {
  return JSON.stringify(blueprint, null, 2);
}

export function createFacilityDevToolsReport(blueprint: FacilityBlueprint, allRoomIds: RoomId[]): string {
  const report = validateFacilityBlueprint(blueprint, allRoomIds);
  return [
    "Facility blueprint validation report",
    `valid=${report.valid}`,
    `rooms=${blueprint.rooms.length}`,
    `districts=${blueprint.districts.length}`,
    `missing=${report.missingRooms.join(", ") || "none"}`,
    `duplicates=${report.duplicateRooms.join(", ") || "none"}`,
    `overlaps=${report.overlappingRooms.map((item) => item.roomIds.join("+")).join(", ") || "none"}`,
    `disconnected=${report.disconnectedRooms.join(", ") || "none"}`,
    `warnings=${report.warnings.length}`,
    `errors=${report.errors.length}`
  ].join("\n");
}

export function getNearestPathNode(blueprint: FacilityBlueprint, position: { x: number; z: number }): FacilityPathNode | undefined {
  return [...blueprint.pathNodes].sort((a, b) => pointDistance(position, a.position) - pointDistance(position, b.position))[0];
}

function shortestNodePath(blueprint: FacilityBlueprint, fromNodeId: string, toNodeId: string): string[] {
  if (fromNodeId === toNodeId) return [fromNodeId];
  const queue: string[][] = [[fromNodeId]];
  const visited = new Set<string>();
  while (queue.length) {
    const path = queue.shift()!;
    const current = path[path.length - 1];
    if (visited.has(current)) continue;
    visited.add(current);
    const node = blueprint.pathNodes.find((candidate) => candidate.id === current);
    for (const connectedNodeId of node?.connectedNodeIds ?? []) {
      const nextPath = [...path, connectedNodeId];
      if (connectedNodeId === toNodeId) return nextPath;
      queue.push(nextPath);
    }
  }
  return [];
}

function pointDistance(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function formatRoomBadgeLabel(badges: RoomBadge[]): string {
  if (!badges.length) return "";
  const labels = badges.slice(0, 2).map((badge) => `${badge.label}${badge.count ? ` ${badge.count}` : ""}`);
  return `Status: ${labels.join(", ")}`;
}

function compactLabel(parts: string[]): string {
  return parts.filter(Boolean).join(". ");
}
