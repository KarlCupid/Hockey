import type { RoomId } from "../types";
import type {
  FacilityBlueprint,
  FacilityDistrict,
  FacilityDistrictId,
  FacilityFloor,
  FacilityMapPoint,
  FacilityPathNode,
  FacilityPoint,
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
  entry: ["frontOffice", "hockeyOps", "customization", "utility"],
  frontOffice: ["entry", "hockeyOps", "customization", "utility"],
  hockeyOps: ["entry", "frontOffice", "development", "teamWing", "arena"],
  teamWing: ["hockeyOps", "arena", "media"],
  arena: ["hockeyOps", "teamWing", "media"],
  media: ["teamWing", "arena", "customization"],
  development: ["hockeyOps"],
  customization: ["entry", "frontOffice", "media", "utility"],
  utility: ["entry", "frontOffice", "customization"]
};

export function getFacilityDistrictAdjacency(): Record<FacilityDistrictId, FacilityDistrictId[]> {
  return districtAdjacency;
}

const DISTRICT_BOUNDS = {
  entry: { x: 0, z: -0.4, width: 8.8, depth: 7.8 },
  frontOffice: { x: -10.1, z: -0.2, width: 9.6, depth: 8.2 },
  hockeyOps: { x: 8.6, z: 0.2, width: 8.4, depth: 7.8 },
  teamWing: { x: 8.8, z: 6.1, width: 9, depth: 5.8 },
  arena: { x: 0, z: 11.6, width: 12.8, depth: 7.2 },
  media: { x: -6.9, z: 6.8, width: 5, depth: 4.2 },
  development: { x: 8.4, z: -7.5, width: 10, depth: 6.8 },
  customization: { x: -5.3, z: 4.6, width: 4.4, depth: 3.7 },
  utility: { x: -2, z: 2.8, width: 4.8, depth: 3.6 }
} satisfies Record<FacilityDistrictId, FacilityDistrict["bounds"]>;

const HUBS = {
  spawn: point(0, 0),
  trophyHall: point(0, -3),
  frontOfficeGate: point(-4.4, 0),
  frontOfficeHub: point(-8.6, 0),
  ownerContracts: point(-11.4, -1.5),
  agentsStaff: point(-9.4, 1.9),
  hockeyOpsGate: point(4.2, 0),
  hockeyOpsHub: point(8.4, 0),
  rosterCoach: point(8.4, -1.8),
  tradeMarket: point(8.4, 2),
  developmentGate: point(6.3, -3.8),
  pipelineHub: point(8.6, -6),
  scoutingDevelopment: point(7.2, -7.2),
  draftStage: point(10.8, -8),
  teamGate: point(6.2, 3.6),
  teamHub: point(8.7, 5.8),
  playerMeetings: point(6.7, 4.8),
  lockerMedical: point(10, 7),
  arenaTunnel: point(5.1, 8.1),
  arenaGate: point(0, 8.8),
  arenaBowl: point(0, 11.2),
  mediaGate: point(-4.2, 7.3),
  pressRow: point(-6.4, 6.8),
  customizationGate: point(-4, 3.4),
  devTools: point(-3.8, 4.6),
  utilityKiosk: point(-2.1, 2.1),
  supportKiosks: point(-2, 2.9)
} satisfies Record<string, FacilityPoint>;

const ROOM_SIZES = {
  office: { width: 2.8, depth: 2.1 },
  compactOffice: { width: 2.6, depth: 2 },
  kiosk: { width: 2.2, depth: 1.6 },
  meeting: { width: 2.8, depth: 1.9 },
  locker: { width: 3.2, depth: 2.2 },
  arena: { width: 9.6, depth: 5.3 }
};

const ROOM_POSITIONS = {
  gm: offset(HUBS.frontOfficeHub, 1.7, -1.5),
  contracts: offset(HUBS.frontOfficeHub, -2.2, -2.5),
  ownerSuite: offset(HUBS.frontOfficeHub, -4.6, -2.5),
  staff: offset(HUBS.frontOfficeHub, 1.7, 1.8),
  agents: offset(HUBS.frontOfficeHub, -2.2, 1.8),
  roster: offset(HUBS.hockeyOpsHub, -1.7, -1.6),
  coach: offset(HUBS.hockeyOpsHub, 1.8, -1.6),
  trades: offset(HUBS.hockeyOpsHub, -1.7, 1.8),
  freeAgency: offset(HUBS.hockeyOpsHub, 1.8, 1.8),
  playerMeetings: point(6.4, 4.6),
  locker: point(8.6, 7.1),
  medical: point(11.7, 7.1),
  arena: point(0, 11.3),
  press: point(-6.9, 6.8),
  scouting: offset(HUBS.pipelineHub, -2.9, -1.2),
  development: offset(HUBS.pipelineHub, 0.1, -1.2),
  draft: offset(HUBS.pipelineHub, 2.2, -3.2),
  saves: offset(HUBS.spawn, 0, 0.85),
  standings: point(0, -3.15),
  settings: offset(HUBS.supportKiosks, -1.1, -0.1),
  feedback: offset(HUBS.supportKiosks, 1, -0.1),
  devTools: point(-5.3, 4.6)
} satisfies Record<RoomId, FacilityPoint>;

const DISTRICT_META: Record<
  FacilityDistrictId,
  Pick<FacilityDistrict, "label" | "description" | "floor" | "colorToken" | "landmarkLabel" | "landmarkPosition" | "roomIds">
> = {
  entry: {
    label: "Central Concourse",
    description: "The orientation hub for the whole building: spawn, Save Desk, trophy landmark, and the first view of the hockey spine.",
    floor: "main",
    colorToken: "#61c9ff",
    landmarkLabel: "Operations Map Kiosk",
    landmarkPosition: point(0, -0.75),
    roomIds: ["saves", "standings"]
  },
  frontOffice: {
    label: "Front Office Wing",
    description: "A west-side decision wing for GM work, cap planning, ownership, staff, and agent pressure around a shared office hub.",
    floor: "main",
    colorToken: "#f5c65b",
    landmarkLabel: "Owner Overlook",
    landmarkPosition: point(-12.9, -2.2),
    roomIds: ["gm", "contracts", "staff", "agents", "ownerSuite"]
  },
  hockeyOps: {
    label: "Hockey Ops Wing",
    description: "The east-side hockey spine groups roster, coaching, trade, and free-agency work before the corridor turns toward the team wing.",
    floor: "main",
    colorToken: "#8ee7d1",
    landmarkLabel: "Tactical Junction",
    landmarkPosition: HUBS.hockeyOpsHub,
    roomIds: ["roster", "coach", "trades", "freeAgency"]
  },
  teamWing: {
    label: "Team Wing",
    description: "Player-facing spaces form the lead-in to the arena tunnel: meetings first, then locker and medical support beside the route.",
    floor: "arena",
    colorToken: "#c8e9ff",
    landmarkLabel: "Team Tunnel",
    landmarkPosition: HUBS.teamHub,
    roomIds: ["playerMeetings", "locker", "medical"]
  },
  arena: {
    label: "Arena Bowl",
    description: "The large game-day destination beyond the tunnel, with the rink footprint intentionally larger than the office rooms.",
    floor: "arena",
    colorToken: "#dff6ff",
    landmarkLabel: "Rink Gate",
    landmarkPosition: HUBS.arenaGate,
    roomIds: ["arena"]
  },
  media: {
    label: "Media Wing",
    description: "Public-facing pressure sits beside the arena concourse, close to the rink but outside the private team corridor.",
    floor: "arena",
    colorToken: "#d7e8ff",
    landmarkLabel: "Backdrop Row",
    landmarkPosition: HUBS.pressRow,
    roomIds: ["press"]
  },
  development: {
    label: "Development Wing",
    description: "A separate pipeline branch north of Hockey Ops for scouting, development plans, and draft execution.",
    floor: "main",
    colorToken: "#a9c6ff",
    landmarkLabel: "Draft Board",
    landmarkPosition: HUBS.draftStage,
    roomIds: ["scouting", "development", "draft"]
  },
  customization: {
    label: "Customization Lab",
    description: "A short side branch for local data-pack and developer inspection tools, connected to spawn without cutting across the hockey route.",
    floor: "main",
    colorToken: "#b58cff",
    landmarkLabel: "Data Lab Terminal",
    landmarkPosition: ROOM_POSITIONS.devTools,
    roomIds: ["devTools"]
  },
  utility: {
    label: "Utility Kiosks",
    description: "Settings and closed-beta feedback stay close to spawn in a side alcove, quick to reach but off the main arena path.",
    floor: "main",
    colorToken: "#76e3a5",
    landmarkLabel: "Support Kiosks",
    landmarkPosition: HUBS.supportKiosks,
    roomIds: ["settings", "feedback"]
  }
};

const districts: FacilityDistrict[] = (Object.keys(DISTRICT_META) as FacilityDistrictId[]).map((id) => ({
  id,
  ...DISTRICT_META[id],
  bounds: { ...DISTRICT_BOUNDS[id] },
  landmarkPosition: { ...DISTRICT_META[id].landmarkPosition },
  roomIds: [...DISTRICT_META[id].roomIds]
}));

function room(
  roomId: RoomId,
  label: string,
  shortLabel: string,
  districtId: FacilityDistrictId,
  position: FacilityPoint,
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
    floor?: FacilityFloor;
    mapPosition?: FacilityMapPoint;
  }
): FacilityRoomDefinition {
  return {
    roomId,
    label,
    shortLabel,
    districtId,
    floor: options.floor ?? "main",
    position,
    size: { width: options.width ?? ROOM_SIZES.office.width, depth: options.depth ?? ROOM_SIZES.office.depth },
    entranceFacing: options.entranceFacing ?? "south",
    mapPosition: options.mapPosition ?? mapPoint(position),
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
  room("gm", "GM Office", "GM", "frontOffice", ROOM_POSITIONS.gm, {
    width: ROOM_SIZES.office.width,
    depth: ROOM_SIZES.office.depth,
    icon: "GM",
    colorToken: "#61c9ff",
    priority: "core",
    relatedRoomIds: ["contracts", "roster", "ownerSuite", "saves"],
    tutorialWeight: 1,
    description: "Command office for inbox, Assistant GM reports, ownership pressure, and phase guidance.",
    signage: "GM OFFICE",
    propTheme: "gmOffice"
  }),
  room("contracts", "Contract & Cap Office", "Cap", "frontOffice", ROOM_POSITIONS.contracts, {
    width: ROOM_SIZES.compactOffice.width,
    depth: ROOM_SIZES.compactOffice.depth,
    icon: "$",
    colorToken: "#f5c65b",
    priority: "support",
    relatedRoomIds: ["gm", "agents", "trades", "freeAgency"],
    tutorialWeight: 0.7,
    description: "Cap, contracts, expiries, promises, and pick inventory live beside the GM and agent desks.",
    signage: "CAP OFFICE",
    propTheme: "contracts"
  }),
  room("ownerSuite", "Owner Suite", "Owner", "frontOffice", ROOM_POSITIONS.ownerSuite, {
    width: ROOM_SIZES.compactOffice.width,
    depth: 2.3,
    floor: "suite",
    icon: "O",
    colorToken: "#f8d070",
    priority: "support",
    relatedRoomIds: ["gm", "staff", "standings"],
    tutorialWeight: 0.4,
    description: "A slightly removed suite for trust, goals, job security, and private ownership pressure.",
    signage: "OWNER SUITE",
    propTheme: "ownerSuite",
    entranceFacing: "east"
  }),
  room("staff", "Staff Office", "Staff", "frontOffice", ROOM_POSITIONS.staff, {
    width: ROOM_SIZES.compactOffice.width,
    depth: ROOM_SIZES.compactOffice.depth,
    icon: "ST",
    colorToken: "#76e3a5",
    priority: "support",
    relatedRoomIds: ["gm", "coach", "scouting", "development"],
    tutorialWeight: 0.5,
    description: "Staff hiring stays near the GM but points toward scouting, development, and coaching.",
    signage: "STAFF OFFICE",
    propTheme: "staff",
    entranceFacing: "north"
  }),
  room("agents", "Agent Desk", "Agents", "frontOffice", ROOM_POSITIONS.agents, {
    width: ROOM_SIZES.compactOffice.width,
    depth: ROOM_SIZES.compactOffice.depth,
    icon: "AG",
    colorToken: "#b58cff",
    priority: "support",
    relatedRoomIds: ["contracts", "playerMeetings", "gm"],
    tutorialWeight: 0.4,
    description: "Agent calls sit beside contracts so money, role, and relationship pressure feel connected.",
    signage: "AGENT DESK",
    propTheme: "agents",
    entranceFacing: "north"
  }),
  room("roster", "Roster Office", "Roster", "hockeyOps", ROOM_POSITIONS.roster, {
    width: ROOM_SIZES.office.width,
    depth: ROOM_SIZES.office.depth,
    icon: "RO",
    colorToken: "#76e3a5",
    priority: "core",
    relatedRoomIds: ["coach", "locker", "trades", "gm"],
    tutorialWeight: 1,
    description: "Active roster, scratches, affiliate depth, injured reserve, and roster repair.",
    signage: "ROSTER OFFICE",
    propTheme: "roster"
  }),
  room("coach", "Coach's Office", "Coach", "hockeyOps", ROOM_POSITIONS.coach, {
    width: ROOM_SIZES.office.width,
    depth: ROOM_SIZES.office.depth,
    icon: "C",
    colorToken: "#8ee7d1",
    priority: "core",
    relatedRoomIds: ["roster", "playerMeetings", "arena", "development"],
    tutorialWeight: 1,
    description: "Lines, goalie decisions, and tactics sit between roster work and the team wing.",
    signage: "COACH OFFICE",
    propTheme: "coach"
  }),
  room("trades", "Trade War Room", "Trades", "hockeyOps", ROOM_POSITIONS.trades, {
    width: ROOM_SIZES.office.width,
    depth: ROOM_SIZES.office.depth,
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
  room("freeAgency", "Free Agency Office", "Market", "hockeyOps", ROOM_POSITIONS.freeAgency, {
    width: ROOM_SIZES.office.width,
    depth: ROOM_SIZES.office.depth,
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
  room("playerMeetings", "Player Meeting Room", "Meet", "teamWing", ROOM_POSITIONS.playerMeetings, {
    width: ROOM_SIZES.meeting.width,
    depth: ROOM_SIZES.meeting.depth,
    icon: "PM",
    colorToken: "#8ee7d1",
    priority: "support",
    relatedRoomIds: ["coach", "locker", "agents"],
    tutorialWeight: 0.45,
    description: "Conversation space between the coach/front-office corridor and player areas.",
    signage: "PLAYER MEETINGS",
    propTheme: "playerMeetings",
    entranceFacing: "east"
  }),
  room("locker", "Locker Room", "Locker", "teamWing", ROOM_POSITIONS.locker, {
    width: ROOM_SIZES.locker.width,
    depth: ROOM_SIZES.locker.depth,
    icon: "LR",
    colorToken: "#c8e9ff",
    priority: "support",
    relatedRoomIds: ["medical", "playerMeetings", "arena", "roster"],
    tutorialWeight: 0.7,
    description: "Player pulse, morale, form, fatigue, and relationships live near the arena tunnel.",
    signage: "LOCKER ROOM",
    propTheme: "locker",
    floor: "arena",
    entranceFacing: "north"
  }),
  room("medical", "Medical Room", "Medical", "teamWing", ROOM_POSITIONS.medical, {
    width: 2.5,
    depth: ROOM_SIZES.compactOffice.depth,
    icon: "+",
    colorToken: "#ff7e8a",
    priority: "support",
    relatedRoomIds: ["locker", "coach", "arena"],
    tutorialWeight: 0.45,
    description: "Injury and fatigue review is directly adjacent to the locker room.",
    signage: "MEDICAL",
    propTheme: "medical",
    floor: "arena",
    entranceFacing: "west"
  }),
  room("arena", "Arena Bowl", "Arena", "arena", ROOM_POSITIONS.arena, {
    width: ROOM_SIZES.arena.width,
    depth: ROOM_SIZES.arena.depth,
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
  room("press", "Press Room", "Press", "media", ROOM_POSITIONS.press, {
    width: 3.2,
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
  room("scouting", "Scouting Department", "Scout", "development", ROOM_POSITIONS.scouting, {
    width: ROOM_SIZES.compactOffice.width,
    depth: 2.2,
    icon: "SC",
    colorToken: "#a9c6ff",
    priority: "advanced",
    relatedRoomIds: ["development", "draft", "roster", "trades"],
    tutorialWeight: 0.55,
    description: "Draft board and scouting assignments branch off hockey ops for long-range roster building.",
    signage: "SCOUTING",
    propTheme: "scouting",
    entranceFacing: "east"
  }),
  room("development", "Development Office", "Dev", "development", ROOM_POSITIONS.development, {
    width: ROOM_SIZES.compactOffice.width,
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
  room("draft", "Draft Stage", "Draft", "development", ROOM_POSITIONS.draft, {
    width: 3.1,
    depth: 2.3,
    icon: "DF",
    colorToken: "#f5c65b",
    priority: "advanced",
    relatedRoomIds: ["scouting", "development", "gm"],
    tutorialWeight: 0.45,
    description: "A boardroom podium for draft execution and prospect selection pressure.",
    signage: "DRAFT STAGE",
    propTheme: "draft"
  }),
  room("saves", "Save Desk", "Save", "entry", ROOM_POSITIONS.saves, {
    width: 2.4,
    depth: 1.8,
    icon: "SV",
    colorToken: "#b58cff",
    priority: "core",
    relatedRoomIds: ["gm", "settings", "feedback", "devTools"],
    tutorialWeight: 1,
    description: "Local saves, snapshots, diagnostics, bug reports, and the in-franchise data-pack library are anchored at spawn.",
    signage: "SAVE DESK",
    propTheme: "save",
    entranceFacing: "north"
  }),
  room("standings", "Standings/Trophy Hall", "Trophy", "entry", ROOM_POSITIONS.standings, {
    width: 3.4,
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
  room("settings", "Settings", "Settings", "utility", ROOM_POSITIONS.settings, {
    width: ROOM_SIZES.kiosk.width,
    depth: ROOM_SIZES.kiosk.depth,
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
  room("feedback", "Feedback Desk", "Feedback", "utility", ROOM_POSITIONS.feedback, {
    width: ROOM_SIZES.kiosk.width,
    depth: ROOM_SIZES.kiosk.depth,
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
  room("devTools", "Dev Tools", "Tools", "customization", ROOM_POSITIONS.devTools, {
    width: 2.8,
    depth: ROOM_SIZES.compactOffice.depth,
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

const pathNodes: FacilityPathNode[] = [
  node("spawn-concourse", "Central Concourse", HUBS.spawn, ["trophy-hall-cross", "front-office-gate", "hockey-ops-gate", "utility-kiosk"], "entry", true),
  node("trophy-hall-cross", "Trophy Hall Cross", HUBS.trophyHall, ["spawn-concourse"], "entry"),
  node("front-office-gate", "Front Office Threshold", HUBS.frontOfficeGate, ["spawn-concourse", "front-office-hub", "customization-gate"], "frontOffice"),
  node("front-office-hub", "Front Office Hub", HUBS.frontOfficeHub, ["front-office-gate", "owner-contracts", "agents-staff"], "frontOffice", true),
  node("owner-contracts", "Owner And Contracts", HUBS.ownerContracts, ["front-office-hub"], "frontOffice"),
  node("agents-staff", "Agents And Staff", HUBS.agentsStaff, ["front-office-hub"], "frontOffice"),
  node("hockey-ops-gate", "Hockey Ops Threshold", HUBS.hockeyOpsGate, ["spawn-concourse", "hockey-ops-hub", "development-gate", "team-gate"], "hockeyOps"),
  node("hockey-ops-hub", "Hockey Ops Hub", HUBS.hockeyOpsHub, ["hockey-ops-gate", "roster-coach", "trade-market-cross", "team-gate", "development-gate"], "hockeyOps", true),
  node("roster-coach", "Roster And Coach", HUBS.rosterCoach, ["hockey-ops-hub"], "hockeyOps"),
  node("trade-market-cross", "Trade And Market Cross", HUBS.tradeMarket, ["hockey-ops-hub"], "hockeyOps"),
  node("development-gate", "Development Threshold", HUBS.developmentGate, ["hockey-ops-gate", "hockey-ops-hub", "pipeline-hub"], "development"),
  node("pipeline-hub", "Development Pipeline Hub", HUBS.pipelineHub, ["development-gate", "scouting-development", "draft-stage"], "development", true),
  node("scouting-development", "Scouting And Development", HUBS.scoutingDevelopment, ["pipeline-hub"], "development"),
  node("draft-stage", "Draft Stage", HUBS.draftStage, ["pipeline-hub"], "development"),
  node("team-gate", "Team Wing Threshold", HUBS.teamGate, ["hockey-ops-gate", "hockey-ops-hub", "team-hub"], "teamWing"),
  node("team-hub", "Team Wing Hub", HUBS.teamHub, ["team-gate", "player-meetings", "locker-medical", "arena-tunnel"], "teamWing", true),
  node("player-meetings", "Player Meeting Door", HUBS.playerMeetings, ["team-hub"], "teamWing"),
  node("locker-medical", "Locker And Medical", HUBS.lockerMedical, ["team-hub"], "teamWing"),
  node("arena-tunnel", "Arena Tunnel", HUBS.arenaTunnel, ["team-hub", "arena-gate", "media-gate"], "arena", true),
  node("arena-gate", "Rink Gate", HUBS.arenaGate, ["arena-tunnel", "arena-bowl-hub", "media-gate"], "arena"),
  node("arena-bowl-hub", "Arena Bowl", HUBS.arenaBowl, ["arena-gate"], "arena", true),
  node("media-gate", "Media Threshold", HUBS.mediaGate, ["arena-tunnel", "arena-gate", "press-row", "customization-gate"], "media"),
  node("press-row", "Press Backdrop Row", HUBS.pressRow, ["media-gate"], "media", true),
  node("customization-gate", "Customization Threshold", HUBS.customizationGate, ["front-office-gate", "media-gate", "utility-kiosk", "dev-tools-door"], "customization"),
  node("dev-tools-door", "Data Lab Door", HUBS.devTools, ["customization-gate"], "customization"),
  node("utility-kiosk", "Utility Kiosks", HUBS.utilityKiosk, ["spawn-concourse", "customization-gate", "support-kiosks"], "utility", true),
  node("support-kiosks", "Settings And Feedback", HUBS.supportKiosks, ["utility-kiosk"], "utility")
];

const defaultBlueprint: FacilityBlueprint = {
  id: "phase13-facility-masterplan",
  label: "Phase 13 Facility Masterplan",
  version: 13,
  floors: ["main", "arena", "suite"],
  districts,
  rooms,
  pathNodes,
  spawnPoint: { x: HUBS.spawn.x, z: HUBS.spawn.z, facing: "north" },
  mainCorridorNodes: [
    "spawn-concourse",
    "hockey-ops-gate",
    "hockey-ops-hub",
    "team-gate",
    "team-hub",
    "arena-tunnel",
    "arena-gate",
    "arena-bowl-hub"
  ],
  landmarks: [
    { id: "map-kiosk", label: "Operations Map Kiosk", position: point(0, -0.75), districtId: "entry" },
    { id: "trophy-wall", label: "Trophy Wall", position: point(0, -4.05), districtId: "entry" },
    { id: "owner-overlook", label: "Owner Overlook", position: DISTRICT_META.frontOffice.landmarkPosition, districtId: "frontOffice" },
    { id: "tactical-junction", label: "Tactical Junction", position: HUBS.hockeyOpsHub, districtId: "hockeyOps" },
    { id: "draft-board", label: "Draft Board", position: HUBS.draftStage, districtId: "development" },
    { id: "team-tunnel", label: "Team Tunnel", position: HUBS.teamHub, districtId: "teamWing" },
    { id: "rink-gate", label: "Rink Gate", position: HUBS.arenaGate, districtId: "arena" },
    { id: "press-backdrop", label: "Press Backdrop Row", position: HUBS.pressRow, districtId: "media" },
    { id: "data-lab-terminal", label: "Data Lab Terminal", position: ROOM_POSITIONS.devTools, districtId: "customization" },
    { id: "support-kiosks", label: "Support Kiosks", position: HUBS.supportKiosks, districtId: "utility" }
  ],
  notes: [
    "Add new rooms here first.",
    "District bounds, hubs, room offsets, map pins, path nodes, 3D markers, and wayfinding all read from this typed blueprint.",
    "The layout is a stylized hockey operations complex: a central concourse, west front-office wing, east hockey-ops spine, team tunnel, arena bowl, public media edge, and separate development pipeline.",
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
    pathNodes: defaultBlueprint.pathNodes.map((pathNode) => ({ ...pathNode, position: { ...pathNode.position }, connectedNodeIds: [...pathNode.connectedNodeIds] })),
    spawnPoint: { ...defaultBlueprint.spawnPoint },
    mainCorridorNodes: [...defaultBlueprint.mainCorridorNodes],
    landmarks: defaultBlueprint.landmarks.map((landmark) => ({ ...landmark, position: { ...landmark.position } })),
    notes: [...defaultBlueprint.notes]
  };
}

export const DEFAULT_FACILITY_BLUEPRINT = createDefaultFacilityBlueprint();

function point(x: number, z: number): FacilityPoint {
  return { x, z };
}

function offset(origin: FacilityPoint, x: number, z: number): FacilityPoint {
  return { x: origin.x + x, z: origin.z + z };
}

function node(
  id: string,
  label: string,
  position: FacilityPoint,
  connectedNodeIds: string[],
  districtId: FacilityDistrictId,
  isLandmark = false
): FacilityPathNode {
  return { id, label, position, connectedNodeIds, districtId, isLandmark };
}

function mapPoint(position: FacilityPoint): FacilityMapPoint {
  const bounds = getFacilityWorldBounds();
  return {
    x: percent((position.x - bounds.minX) / (bounds.maxX - bounds.minX)),
    y: percent((position.z - bounds.minZ) / (bounds.maxZ - bounds.minZ))
  };
}

function getFacilityWorldBounds(): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const districtBounds = Object.values(DISTRICT_BOUNDS);
  return {
    minX: Math.min(...districtBounds.map((bounds) => bounds.x - bounds.width / 2)),
    maxX: Math.max(...districtBounds.map((bounds) => bounds.x + bounds.width / 2)),
    minZ: Math.min(...districtBounds.map((bounds) => bounds.z - bounds.depth / 2)),
    maxZ: Math.max(...districtBounds.map((bounds) => bounds.z + bounds.depth / 2))
  };
}

function percent(value: number): number {
  return Number((Math.max(0, Math.min(1, value)) * 100).toFixed(1));
}
