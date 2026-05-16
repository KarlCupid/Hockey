import type { RoomId } from "../types";
import type {
  FacilityBlueprint,
  FacilityDistrict,
  FacilityDistrictId,
  FacilityPropTheme,
  FacilityRoomDefinition
} from "./facilityTypes";

export const FACILITY_ROOM_IDS: RoomId[] = [
  "gm",
  "press",
  "ownerSuite",
  "agents",
  "playerMeetings",
  "roster",
  "coach",
  "locker",
  "medical",
  "arena",
  "standings",
  "saves",
  "contracts",
  "trades",
  "scouting",
  "development",
  "freeAgency",
  "staff",
  "draft",
  "settings",
  "devTools",
  "feedback"
];

const districtAdjacency: Record<FacilityDistrictId, FacilityDistrictId[]> = {
  entry: ["frontOffice", "hockeyOps", "arena", "media", "development", "customization", "utility", "teamWing"],
  frontOffice: ["entry", "hockeyOps", "utility"],
  hockeyOps: ["entry", "frontOffice", "development", "teamWing", "arena"],
  teamWing: ["hockeyOps", "arena", "media", "entry"],
  arena: ["teamWing", "media", "entry", "hockeyOps"],
  media: ["arena", "teamWing", "entry"],
  development: ["hockeyOps", "entry", "customization"],
  customization: ["entry", "development", "utility"],
  utility: ["entry", "frontOffice", "customization"]
};

export function getFacilityDistrictAdjacency(): Record<FacilityDistrictId, FacilityDistrictId[]> {
  return districtAdjacency;
}

const districts: FacilityDistrict[] = [
  {
    id: "entry",
    label: "Central Concourse",
    description: "The orientation spine for the whole building, with the map kiosk, trophy landmark, and save access close to spawn.",
    floor: "main",
    colorToken: "#61c9ff",
    bounds: { x: 0, z: -1.8, width: 8.2, depth: 7.2 },
    landmarkLabel: "Operations Map Kiosk",
    landmarkPosition: { x: 0, z: -0.8 },
    roomIds: ["saves", "standings"]
  },
  {
    id: "frontOffice",
    label: "Front Office Wing",
    description: "Decision rooms for ownership, cap planning, staff, agents, and the GM's daily command desk.",
    floor: "main",
    colorToken: "#f5c65b",
    bounds: { x: -11, z: -1, width: 8.5, depth: 7 },
    landmarkLabel: "Owner Overlook",
    landmarkPosition: { x: -13.2, z: -2.4 },
    roomIds: ["gm", "contracts", "staff", "agents", "ownerSuite"]
  },
  {
    id: "hockeyOps",
    label: "Hockey Ops Wing",
    description: "The coaching, roster, trade, and free-agency workrooms sit together so game-day and market decisions stay connected.",
    floor: "main",
    colorToken: "#8ee7d1",
    bounds: { x: 8.8, z: -1.05, width: 8, depth: 7.1 },
    landmarkLabel: "Tactical Junction",
    landmarkPosition: { x: 8.1, z: -1.2 },
    roomIds: ["roster", "coach", "trades", "freeAgency"]
  },
  {
    id: "teamWing",
    label: "Team Wing",
    description: "Player-facing spaces lead toward the arena tunnel: meetings first, then locker and medical rooms.",
    floor: "main",
    colorToken: "#c8e9ff",
    bounds: { x: 9.5, z: 5.45, width: 8.6, depth: 5.5 },
    landmarkLabel: "Team Tunnel",
    landmarkPosition: { x: 8.7, z: 4.9 },
    roomIds: ["playerMeetings", "locker", "medical"]
  },
  {
    id: "arena",
    label: "Arena Bowl",
    description: "The game-day destination at the end of the tunnel, visually larger than the office rooms.",
    floor: "arena",
    colorToken: "#dff6ff",
    bounds: { x: 0, z: 10.2, width: 9.5, depth: 5.6 },
    landmarkLabel: "Rink Gate",
    landmarkPosition: { x: 0, z: 8.6 },
    roomIds: ["arena"]
  },
  {
    id: "media",
    label: "Media Wing",
    description: "Public-facing pressure sits near the arena concourse instead of deep inside the team spaces.",
    floor: "arena",
    colorToken: "#d7e8ff",
    bounds: { x: -5.5, z: 6.7, width: 4.6, depth: 3.6 },
    landmarkLabel: "Backdrop Row",
    landmarkPosition: { x: -4.2, z: 6.2 },
    roomIds: ["press"]
  },
  {
    id: "development",
    label: "Development Wing",
    description: "Long-range roster building groups scouting, development, and draft execution near hockey ops but on its own branch.",
    floor: "main",
    colorToken: "#a9c6ff",
    bounds: { x: 5.8, z: -8.1, width: 8.8, depth: 6.6 },
    landmarkLabel: "Draft Board",
    landmarkPosition: { x: 4.8, z: -9.5 },
    roomIds: ["scouting", "development", "draft"]
  },
  {
    id: "customization",
    label: "Customization Lab",
    description: "Local data-pack and rule-review wayfinding points back to Save Desk while developer inspection tools sit off the daily hockey path.",
    floor: "main",
    colorToken: "#b58cff",
    bounds: { x: -5.8, z: 4.8, width: 5, depth: 4.6 },
    landmarkLabel: "Data Lab Terminal",
    landmarkPosition: { x: -5.8, z: 4.8 },
    roomIds: ["devTools"]
  },
  {
    id: "utility",
    label: "Utility Kiosks",
    description: "Settings and closed-beta feedback are easy to reach from spawn without interrupting the office wings.",
    floor: "main",
    colorToken: "#76e3a5",
    bounds: { x: 0, z: 2.5, width: 8.2, depth: 3.4 },
    landmarkLabel: "Support Kiosks",
    landmarkPosition: { x: 2.2, z: 1.5 },
    roomIds: ["settings", "feedback"]
  }
];

function room(
  roomId: RoomId,
  label: string,
  shortLabel: string,
  districtId: FacilityDistrictId,
  x: number,
  z: number,
  mapX: number,
  mapY: number,
  options: {
    width?: number;
    depth?: number;
    entranceFacing?: FacilityRoomDefinition["entranceFacing"];
    icon: string;
    colorToken: string;
    priority: FacilityRoomDefinition["priority"];
    relatedRoomIds: RoomId[];
    tutorialWeight?: number;
    description: string;
    signage: string;
    propTheme: FacilityPropTheme;
    reducedDetailSafe?: boolean;
    floor?: FacilityRoomDefinition["floor"];
  }
): FacilityRoomDefinition {
  return {
    roomId,
    label,
    shortLabel,
    districtId,
    floor: options.floor ?? "main",
    position: { x, z },
    size: { width: options.width ?? 2.6, depth: options.depth ?? 2 },
    entranceFacing: options.entranceFacing ?? "south",
    mapPosition: { x: mapX, y: mapY },
    icon: options.icon,
    colorToken: options.colorToken,
    priority: options.priority,
    relatedRoomIds: options.relatedRoomIds,
    tutorialWeight: options.tutorialWeight ?? 0.5,
    description: options.description,
    signage: options.signage,
    propTheme: options.propTheme,
    reducedDetailSafe: options.reducedDetailSafe ?? true
  };
}

const rooms: FacilityRoomDefinition[] = [
  room("gm", "GM Office", "GM", "frontOffice", -8.2, -2.7, 22, 36, {
    icon: "GM",
    colorToken: "#61c9ff",
    priority: "core",
    relatedRoomIds: ["contracts", "roster", "ownerSuite", "saves"],
    tutorialWeight: 1,
    description: "Command office for inbox, Assistant GM reports, ownership pressure, and phase guidance.",
    signage: "GM OFFICE",
    propTheme: "gmOffice"
  }),
  room("contracts", "Contract & Cap Office", "Cap", "frontOffice", -11.5, -2.7, 12, 36, {
    icon: "$",
    colorToken: "#f5c65b",
    priority: "support",
    relatedRoomIds: ["gm", "agents", "trades", "freeAgency"],
    tutorialWeight: 0.7,
    description: "Cap, contracts, expiries, promises, and pick inventory live beside the GM and agent desks.",
    signage: "CAP OFFICE",
    propTheme: "contracts"
  }),
  room("ownerSuite", "Owner Suite", "Owner", "frontOffice", -14.5, -2.7, 6, 30, {
    width: 2.4,
    depth: 2.2,
    floor: "suite",
    icon: "O",
    colorToken: "#f8d070",
    priority: "support",
    relatedRoomIds: ["gm", "staff", "standings"],
    tutorialWeight: 0.4,
    description: "A slightly removed suite for trust, goals, job security, and private ownership pressure.",
    signage: "OWNER SUITE",
    propTheme: "ownerSuite"
  }),
  room("staff", "Staff Office", "Staff", "frontOffice", -8.2, 0.6, 22, 48, {
    icon: "ST",
    colorToken: "#76e3a5",
    priority: "support",
    relatedRoomIds: ["gm", "coach", "scouting", "development"],
    tutorialWeight: 0.5,
    description: "Staff hiring stays near the GM but points toward scouting, development, and coaching.",
    signage: "STAFF OFFICE",
    propTheme: "staff",
    entranceFacing: "east"
  }),
  room("agents", "Agent Desk", "Agents", "frontOffice", -11.5, 0.6, 12, 48, {
    icon: "AG",
    colorToken: "#b58cff",
    priority: "support",
    relatedRoomIds: ["contracts", "playerMeetings", "gm"],
    tutorialWeight: 0.4,
    description: "Agent calls sit beside contracts so money, role, and relationship pressure feel connected.",
    signage: "AGENT DESK",
    propTheme: "agents",
    entranceFacing: "east"
  }),
  room("roster", "Roster Office", "Roster", "hockeyOps", 6.4, -2.7, 62, 36, {
    icon: "RO",
    colorToken: "#76e3a5",
    priority: "core",
    relatedRoomIds: ["coach", "locker", "trades", "gm"],
    tutorialWeight: 1,
    description: "Active roster, scratches, affiliate depth, injured reserve, and roster repair.",
    signage: "ROSTER OFFICE",
    propTheme: "roster"
  }),
  room("coach", "Coach's Office", "Coach", "hockeyOps", 9.8, -2.7, 74, 36, {
    icon: "C",
    colorToken: "#8ee7d1",
    priority: "core",
    relatedRoomIds: ["roster", "playerMeetings", "arena", "development"],
    tutorialWeight: 1,
    description: "Lines, goalie decisions, and tactics sit between roster work and the team wing.",
    signage: "COACH OFFICE",
    propTheme: "coach"
  }),
  room("trades", "Trade War Room", "Trades", "hockeyOps", 6.4, 0.7, 62, 48, {
    icon: "TR",
    colorToken: "#ff9f6e",
    priority: "advanced",
    relatedRoomIds: ["contracts", "roster", "freeAgency", "scouting"],
    tutorialWeight: 0.55,
    description: "Trade package work connects roster needs, cap math, and market options.",
    signage: "TRADE WAR ROOM",
    propTheme: "trades",
    entranceFacing: "north"
  }),
  room("freeAgency", "Free Agency Office", "Market", "hockeyOps", 9.8, 0.7, 74, 48, {
    icon: "FA",
    colorToken: "#d7e8ff",
    priority: "advanced",
    relatedRoomIds: ["contracts", "trades", "roster", "staff"],
    tutorialWeight: 0.5,
    description: "Open-market signings sit beside trade and cap planning.",
    signage: "FREE AGENCY",
    propTheme: "freeAgency",
    entranceFacing: "north"
  }),
  room("playerMeetings", "Player Meeting Room", "Meet", "teamWing", 6.7, 3.7, 68, 60, {
    width: 2.7,
    depth: 1.9,
    icon: "PM",
    colorToken: "#8ee7d1",
    priority: "support",
    relatedRoomIds: ["coach", "locker", "agents"],
    tutorialWeight: 0.45,
    description: "Conversation space between the coach/front-office corridor and player areas.",
    signage: "PLAYER MEETINGS",
    propTheme: "playerMeetings",
    entranceFacing: "west"
  }),
  room("locker", "Locker Room", "Locker", "teamWing", 8.6, 6.3, 76, 68, {
    width: 2.8,
    depth: 2,
    icon: "LR",
    colorToken: "#c8e9ff",
    priority: "support",
    relatedRoomIds: ["medical", "playerMeetings", "arena", "roster"],
    tutorialWeight: 0.7,
    description: "Player pulse, morale, form, fatigue, and relationships live near the arena tunnel.",
    signage: "LOCKER ROOM",
    propTheme: "locker",
    floor: "arena"
  }),
  room("medical", "Medical Room", "Medical", "teamWing", 12, 6.3, 86, 68, {
    width: 2.4,
    depth: 2,
    icon: "+",
    colorToken: "#ff7e8a",
    priority: "support",
    relatedRoomIds: ["locker", "coach", "arena"],
    tutorialWeight: 0.45,
    description: "Injury and fatigue review is directly adjacent to the locker room.",
    signage: "MEDICAL",
    propTheme: "medical",
    floor: "arena"
  }),
  room("arena", "Arena Bowl", "Arena", "arena", 0, 10.5, 50, 86, {
    width: 7,
    depth: 4,
    icon: "AR",
    colorToken: "#ffffff",
    priority: "core",
    relatedRoomIds: ["coach", "locker", "press", "standings"],
    tutorialWeight: 1,
    description: "Game-day simulation and broadcast presentation at the end of the arena tunnel.",
    signage: "ARENA BOWL",
    propTheme: "arena",
    floor: "arena",
    entranceFacing: "north"
  }),
  room("press", "Press Room", "Press", "media", -5.5, 6.6, 35, 70, {
    width: 3.1,
    depth: 2.1,
    icon: "PR",
    colorToken: "#d7e8ff",
    priority: "support",
    relatedRoomIds: ["arena", "gm", "ownerSuite"],
    tutorialWeight: 0.4,
    description: "Media answers belong near the public concourse and arena, away from the private team wing.",
    signage: "PRESS ROOM",
    propTheme: "press",
    floor: "arena",
    entranceFacing: "east"
  }),
  room("scouting", "Scouting Department", "Scout", "development", 3.3, -7, 56, 20, {
    width: 2.5,
    depth: 2.2,
    icon: "SC",
    colorToken: "#a9c6ff",
    priority: "advanced",
    relatedRoomIds: ["development", "draft", "roster", "trades"],
    tutorialWeight: 0.55,
    description: "Draft board and scouting assignments branch off hockey ops for long-range roster building.",
    signage: "SCOUTING",
    propTheme: "scouting"
  }),
  room("development", "Development Office", "Dev", "development", 6.4, -7, 68, 20, {
    width: 2.5,
    depth: 2.2,
    icon: "DV",
    colorToken: "#76e3a5",
    priority: "advanced",
    relatedRoomIds: ["scouting", "draft", "coach", "locker"],
    tutorialWeight: 0.55,
    description: "Development plans sit next to scouting so prospects and current players share a pipeline story.",
    signage: "DEVELOPMENT",
    propTheme: "development"
  }),
  room("draft", "Draft Stage", "Draft", "development", 4.8, -10, 62, 10, {
    width: 2.9,
    depth: 2.2,
    icon: "DF",
    colorToken: "#f5c65b",
    priority: "advanced",
    relatedRoomIds: ["scouting", "development", "gm"],
    tutorialWeight: 0.45,
    description: "A boardroom podium for draft execution and prospect selection pressure.",
    signage: "DRAFT STAGE",
    propTheme: "draft",
    entranceFacing: "south"
  }),
  room("saves", "Save Desk", "Save", "entry", 0, 0, 50, 52, {
    width: 2.2,
    depth: 1.8,
    icon: "SV",
    colorToken: "#b58cff",
    priority: "core",
    relatedRoomIds: ["gm", "settings", "feedback", "devTools"],
    tutorialWeight: 1,
    description: "Local saves, snapshots, diagnostics, bug reports, and the in-franchise data-pack library are anchored at spawn.",
    signage: "SAVE DESK",
    propTheme: "save"
  }),
  room("standings", "Standings/Trophy Hall", "Trophy", "entry", 0, -4.2, 50, 38, {
    width: 3.2,
    depth: 2,
    icon: "TH",
    colorToken: "#f5c65b",
    priority: "core",
    relatedRoomIds: ["gm", "arena", "ownerSuite"],
    tutorialWeight: 0.75,
    description: "A concourse landmark for standings, achievements, milestones, and history.",
    signage: "TROPHY HALL",
    propTheme: "standings"
  }),
  room("settings", "Settings", "Settings", "utility", -3.4, 2.2, 42, 58, {
    width: 2.2,
    depth: 1.8,
    icon: "SET",
    colorToken: "#61c9ff",
    priority: "utility",
    relatedRoomIds: ["saves", "feedback", "devTools"],
    tutorialWeight: 0.35,
    description: "Accessibility, presentation, controls, and low-spec settings are a short walk from spawn.",
    signage: "SETTINGS",
    propTheme: "settings",
    entranceFacing: "north"
  }),
  room("feedback", "Feedback Desk", "Feedback", "utility", 3.4, 2.2, 58, 58, {
    width: 2.2,
    depth: 1.8,
    icon: "FB",
    colorToken: "#8ee7d1",
    priority: "utility",
    relatedRoomIds: ["saves", "settings", "devTools"],
    tutorialWeight: 0.35,
    description: "Closed-beta notes and export-only feedback live beside the support kiosks.",
    signage: "FEEDBACK",
    propTheme: "feedback",
    entranceFacing: "north"
  }),
  room("devTools", "Dev Tools", "Tools", "customization", -5.8, 4.8, 36, 62, {
    width: 2.8,
    depth: 2,
    icon: "DT",
    colorToken: "#b58cff",
    priority: "utility",
    relatedRoomIds: ["saves", "settings", "feedback", "scouting"],
    tutorialWeight: 0.2,
    description: "Developer-only QA, validation, layout export, and future data-lab review tools. Player-facing Custom League Lab remains a title-screen setup flow.",
    signage: "DEV TOOLS",
    propTheme: "devTools",
    entranceFacing: "east"
  })
];

const defaultBlueprint: FacilityBlueprint = {
  id: "phase13-facility-masterplan",
  label: "Phase 13 Facility Masterplan",
  version: 13,
  floors: ["main", "arena", "suite"],
  districts,
  rooms,
  pathNodes: [
    { id: "spawn-concourse", label: "Central Concourse", position: { x: 0, z: 0 }, connectedNodeIds: ["trophy-cross", "front-office-gate", "hockey-ops-gate", "utility-kiosk", "arena-gate"], districtId: "entry", isLandmark: true },
    { id: "trophy-cross", label: "Trophy Hall Cross", position: { x: 0, z: -3.4 }, connectedNodeIds: ["spawn-concourse", "development-gate"], districtId: "entry" },
    { id: "front-office-gate", label: "Front Office Gate", position: { x: -5.2, z: -1.2 }, connectedNodeIds: ["spawn-concourse", "front-office-hub", "customization-gate"], districtId: "frontOffice" },
    { id: "front-office-hub", label: "Front Office Wing", position: { x: -10, z: -1.2 }, connectedNodeIds: ["front-office-gate", "owner-lift", "agent-contracts"], districtId: "frontOffice", isLandmark: true },
    { id: "owner-lift", label: "Owner Suite Lift", position: { x: -13.2, z: -2.4 }, connectedNodeIds: ["front-office-hub"], districtId: "frontOffice" },
    { id: "agent-contracts", label: "Contracts And Agents", position: { x: -11.5, z: 0.6 }, connectedNodeIds: ["front-office-hub"], districtId: "frontOffice" },
    { id: "hockey-ops-gate", label: "Hockey Ops Gate", position: { x: 4.7, z: -1.2 }, connectedNodeIds: ["spawn-concourse", "hockey-ops-hub", "team-gate", "development-gate"], districtId: "hockeyOps" },
    { id: "hockey-ops-hub", label: "Hockey Ops Wing", position: { x: 8.1, z: -1.2 }, connectedNodeIds: ["hockey-ops-gate", "trade-market-cross"], districtId: "hockeyOps", isLandmark: true },
    { id: "trade-market-cross", label: "Trade And Market Cross", position: { x: 8.1, z: 1.4 }, connectedNodeIds: ["hockey-ops-hub", "team-gate"], districtId: "hockeyOps" },
    { id: "development-gate", label: "Development Gate", position: { x: 3.6, z: -4.6 }, connectedNodeIds: ["trophy-cross", "hockey-ops-gate", "development-hub"], districtId: "development" },
    { id: "development-hub", label: "Development Wing", position: { x: 4.8, z: -7.8 }, connectedNodeIds: ["development-gate", "draft-table"], districtId: "development", isLandmark: true },
    { id: "draft-table", label: "Draft Table", position: { x: 4.8, z: -9.5 }, connectedNodeIds: ["development-hub"], districtId: "development" },
    { id: "team-gate", label: "Team Wing Gate", position: { x: 5.1, z: 3.4 }, connectedNodeIds: ["hockey-ops-gate", "trade-market-cross", "team-hub", "arena-tunnel"], districtId: "teamWing" },
    { id: "team-hub", label: "Team Wing", position: { x: 8.7, z: 4.9 }, connectedNodeIds: ["team-gate", "arena-tunnel"], districtId: "teamWing", isLandmark: true },
    { id: "arena-tunnel", label: "Arena Tunnel", position: { x: 4.2, z: 7.4 }, connectedNodeIds: ["team-gate", "team-hub", "arena-gate", "media-gate"], districtId: "arena", isLandmark: true },
    { id: "arena-gate", label: "Arena Gate", position: { x: 0, z: 8.6 }, connectedNodeIds: ["spawn-concourse", "arena-tunnel", "media-gate"], districtId: "arena" },
    { id: "media-gate", label: "Media Gate", position: { x: -3.8, z: 6 }, connectedNodeIds: ["arena-gate", "arena-tunnel", "customization-gate"], districtId: "media" },
    { id: "customization-gate", label: "Customization Lab", position: { x: -4.2, z: 3.4 }, connectedNodeIds: ["front-office-gate", "media-gate", "utility-kiosk"], districtId: "customization" },
    { id: "utility-kiosk", label: "Support Kiosks", position: { x: 2.2, z: 1.5 }, connectedNodeIds: ["spawn-concourse", "customization-gate"], districtId: "utility", isLandmark: true }
  ],
  spawnPoint: { x: 0, z: 0, facing: "north" },
  mainCorridorNodes: ["front-office-gate", "spawn-concourse", "hockey-ops-gate", "team-gate", "arena-tunnel", "arena-gate"],
  landmarks: [
    { id: "map-kiosk", label: "Operations Map Kiosk", position: { x: 0, z: -0.8 }, districtId: "entry" },
    { id: "trophy-wall", label: "Trophy Wall", position: { x: 0, z: -4.8 }, districtId: "entry" },
    { id: "owner-overlook", label: "Owner Overlook", position: { x: -13.2, z: -2.4 }, districtId: "frontOffice" },
    { id: "tactical-junction", label: "Tactical Junction", position: { x: 8.1, z: -1.2 }, districtId: "hockeyOps" },
    { id: "draft-board", label: "Draft Board", position: { x: 4.8, z: -9.5 }, districtId: "development" },
    { id: "team-tunnel", label: "Team Tunnel", position: { x: 8.7, z: 4.9 }, districtId: "teamWing" },
    { id: "rink-gate", label: "Rink Gate", position: { x: 0, z: 8.6 }, districtId: "arena" },
    { id: "press-backdrop", label: "Press Backdrop Row", position: { x: -4.2, z: 6.2 }, districtId: "media" },
    { id: "data-lab-terminal", label: "Data Lab Terminal", position: { x: -5.8, z: 4.8 }, districtId: "customization" },
    { id: "support-kiosks", label: "Support Kiosks", position: { x: 2.2, z: 1.5 }, districtId: "utility" }
  ],
  notes: [
    "Add new rooms here first.",
    "Room placement, Operations Map badges, 3D markers, and wayfinding all read from this typed blueprint.",
    "The layout is a stylized hockey operations complex, not a realistic architectural simulation.",
    "Custom League Lab is currently surfaced through the start screen; Save Desk hosts the in-franchise data-pack library, and the customization district reserves a physical lab branch for future room expansion."
  ]
};

export function createDefaultFacilityBlueprint(): FacilityBlueprint {
  return {
    ...defaultBlueprint,
    districts: defaultBlueprint.districts.map((district) => ({ ...district, bounds: { ...district.bounds }, landmarkPosition: { ...district.landmarkPosition }, roomIds: [...district.roomIds] })),
    rooms: defaultBlueprint.rooms.map((roomDefinition) => ({
      ...roomDefinition,
      position: { ...roomDefinition.position },
      size: { ...roomDefinition.size },
      mapPosition: { ...roomDefinition.mapPosition },
      relatedRoomIds: [...roomDefinition.relatedRoomIds]
    })),
    pathNodes: defaultBlueprint.pathNodes.map((node) => ({ ...node, position: { ...node.position }, connectedNodeIds: [...node.connectedNodeIds] })),
    spawnPoint: { ...defaultBlueprint.spawnPoint },
    mainCorridorNodes: [...defaultBlueprint.mainCorridorNodes],
    landmarks: defaultBlueprint.landmarks.map((landmark) => ({ ...landmark, position: { ...landmark.position } })),
    notes: [...defaultBlueprint.notes]
  };
}

export const DEFAULT_FACILITY_BLUEPRINT = createDefaultFacilityBlueprint();
