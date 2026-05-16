import type { RoomId } from "../types";

export type FacilityDistrictId =
  | "entry"
  | "frontOffice"
  | "hockeyOps"
  | "teamWing"
  | "arena"
  | "media"
  | "development"
  | "customization"
  | "utility";

export type FacilityFloor = "main" | "arena" | "suite";
export type FacilityFacing = "north" | "south" | "east" | "west";
export type FacilityRoomPriority = "core" | "support" | "advanced" | "utility";

export type FacilityPropTheme =
  | "gmOffice"
  | "contracts"
  | "staff"
  | "agents"
  | "ownerSuite"
  | "coach"
  | "roster"
  | "trades"
  | "freeAgency"
  | "locker"
  | "medical"
  | "playerMeetings"
  | "arena"
  | "press"
  | "scouting"
  | "development"
  | "draft"
  | "standings"
  | "save"
  | "settings"
  | "feedback"
  | "dataPack"
  | "devTools";

export interface FacilityPoint {
  x: number;
  z: number;
}

export interface FacilityMapPoint {
  x: number;
  y: number;
}

export interface FacilitySize {
  width: number;
  depth: number;
}

export interface FacilityRoomDefinition {
  roomId: RoomId;
  label: string;
  shortLabel: string;
  districtId: FacilityDistrictId;
  floor: FacilityFloor;
  position: FacilityPoint;
  size: FacilitySize;
  entranceFacing: FacilityFacing;
  mapPosition: FacilityMapPoint;
  icon: string;
  colorToken: string;
  priority: FacilityRoomPriority;
  relatedRoomIds: RoomId[];
  tutorialWeight: number;
  description: string;
  signage: string;
  propTheme: FacilityPropTheme;
  reducedDetailSafe: boolean;
}

export interface FacilityBounds {
  x: number;
  z: number;
  width: number;
  depth: number;
}

export interface FacilityDistrict {
  id: FacilityDistrictId;
  label: string;
  description: string;
  floor: FacilityFloor;
  colorToken: string;
  bounds: FacilityBounds;
  landmarkLabel: string;
  landmarkPosition: FacilityPoint;
  roomIds: RoomId[];
}

export interface FacilityPathNode {
  id: string;
  label: string;
  position: FacilityPoint;
  connectedNodeIds: string[];
  districtId?: FacilityDistrictId;
  isLandmark?: boolean;
}

export interface FacilityBlueprint {
  id: string;
  label: string;
  version: number;
  floors: FacilityFloor[];
  districts: FacilityDistrict[];
  rooms: FacilityRoomDefinition[];
  pathNodes: FacilityPathNode[];
  spawnPoint: { x: number; z: number; facing: FacilityFacing };
  mainCorridorNodes: string[];
  landmarks: Array<{ id: string; label: string; position: FacilityPoint; districtId: FacilityDistrictId }>;
  notes: string[];
}

export interface FacilityValidationReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missingRooms: RoomId[];
  duplicateRooms: RoomId[];
  overlappingRooms: Array<{ roomIds: [RoomId, RoomId]; overlapRatio: number }>;
  disconnectedRooms: RoomId[];
  unmappedRooms: RoomId[];
  invalidRelatedRooms: Array<{ roomId: RoomId; relatedRoomId: RoomId }>;
}
