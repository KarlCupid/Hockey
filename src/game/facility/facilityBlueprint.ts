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
  entry: { x: 0, z: 1, width: 9.4, depth: 8.6 },
  frontOffice: { x: -7.7, z: -2.7, width: 6.9, depth: 7.8 },
  hockeyOps: { x: 2.8, z: -1.4, width: 8.2, depth: 10.6 },
  teamWing: { x: 5.2, z: 5.8, width: 7.2, depth: 4.8 },
  arena: { x: 12.4, z: 6, width: 9.8, depth: 10.8 },
  media: { x: 10.5, z: -1.7, width: 6.2, depth: 4.4 },
  development: { x: -8.2, z: 3, width: 5.8, depth: 9 },
  customization: { x: -4.5, z: 5.5, width: 3.6, depth: 2.7 },
  utility: { x: -4.5, z: 1.2, width: 3.6, depth: 6.3 }
} satisfies Record<FacilityDistrictId, FacilityDistrict["bounds"]>;

const HUBS = {
  spawn: point(0, 0),
  gmComputer: point(0, 0.8),
  trophyHall: point(-3.35, -0.7),
  frontOfficeGate: point(-4.2, -1.2),
  frontOfficeHub: point(-7.3, -2.5),
  ownerContracts: point(-8.4, -4.7),
  agentsStaff: point(-7.6, -0.9),
  hockeyOpsGate: point(2.8, -0.8),
  hockeyOpsHub: point(2.4, -4.5),
  rosterCoach: point(2.1, -5.5),
  tradeMarket: point(4, 0.6),
  developmentGate: point(-5.2, 1.6),
  pipelineHub: point(-8.1, 3),
  scoutingDevelopment: point(-8.1, 1.6),
  draftStage: point(-8.1, 5.2),
  teamGate: point(3.1, 3.4),
  teamHub: point(5.4, 5.8),
  playerMeetings: point(3.9, 4.9),
  lockerMedical: point(5.8, 6.8),
  arenaTunnel: point(8.4, 5.8),
  arenaGate: point(9.7, 5.8),
  arenaBowl: point(12.4, 7.5),
  mediaGate: point(9.3, 0.5),
  pressRow: point(10.5, -1.5),
  customizationGate: point(-3.35, 4.4),
  devTools: point(-3.35, 5.4),
  utilityKiosk: point(-3.35, 1.4),
  supportKiosks: point(-3.35, 2.9)
} satisfies Record<string, FacilityPoint>;

const ROOM_SIZES = {
  command: { width: 3.2, depth: 2.3 },
  office: { width: 2.8, depth: 2.1 },
  compactOffice: { width: 2.6, depth: 2 },
  kiosk: { width: 2.2, depth: 1.6 },
  appTile: { width: 2.2, depth: 1.25 },
  meeting: { width: 2.8, depth: 1.9 },
  locker: { width: 3.2, depth: 2.2 },
  arena: { width: 8.6, depth: 8.6 }
};

const ROOM_POSITIONS = {
  gm: point(0, 0.85),
  contracts: point(4.9, -1.2),
  trades: point(4.9, 0.25),
  freeAgency: point(4.9, 1.7),
  ownerSuite: point(-8.5, -5.1),
  staff: point(4.9, 3.15),
  agents: point(-8.8, -1.3),
  roster: point(0.65, -5.45),
  coach: point(3.7, -5.45),
  playerMeetings: point(3.2, 4.7),
  locker: point(4.35, 6.85),
  medical: point(7.15, 6.85),
  arena: point(12.4, 6.4),
  press: point(10.5, -2.5),
  scouting: point(-8.15, 0.35),
  development: point(-8.15, 3),
  draft: point(-8.15, 5.55),
  saves: point(-4.55, 0.1),
  standings: point(-4.55, -1.45),
  settings: point(-4.55, 1.65),
  feedback: point(-4.55, 3.2),
  devTools: point(-4.55, 5.45)
} satisfies Record<RoomId, FacilityPoint>;

const DISTRICT_META: Record<
  FacilityDistrictId,
  Pick<FacilityDistrict, "label" | "description" | "floor" | "colorToken" | "landmarkLabel" | "landmarkPosition" | "roomIds">
> = {
  entry: {
    label: "Command Atrium",
    description: "The playable hub: spawn, GM Computer, quick-look utilities, and the first sightline into every operational wing.",
    floor: "main",
    colorToken: "#61c9ff",
    landmarkLabel: "GM Computer",
    landmarkPosition: HUBS.gmComputer,
    roomIds: ["gm"]
  },
  frontOffice: {
    label: "Private Office Wing",
    description: "A west-side private suite for ownership pressure, agent calls, and staff conversations beside the GM Computer hub.",
    floor: "main",
    colorToken: "#f5c65b",
    landmarkLabel: "Owner Overlook",
    landmarkPosition: ROOM_POSITIONS.ownerSuite,
    roomIds: ["ownerSuite", "agents"]
  },
  hockeyOps: {
    label: "Hockey Ops Suite",
    description: "The upper planning suite combines physical roster and coach rooms with GM Computer app bays for cap, trade, and market work.",
    floor: "main",
    colorToken: "#8ee7d1",
    landmarkLabel: "Planning Wall",
    landmarkPosition: HUBS.hockeyOpsHub,
    roomIds: ["roster", "coach", "contracts", "trades", "freeAgency", "staff"]
  },
  teamWing: {
    label: "Team Corridor",
    description: "Player-facing spaces form the arena lead-in: meetings first, then locker and medical support beside the team route.",
    floor: "arena",
    colorToken: "#c8e9ff",
    landmarkLabel: "Team Tunnel",
    landmarkPosition: HUBS.teamHub,
    roomIds: ["playerMeetings", "locker", "medical"]
  },
  arena: {
    label: "Arena Bowl",
    description: "The oversized game-day destination beside the operations center, larger than every office, app bay, or support room.",
    floor: "arena",
    colorToken: "#dff6ff",
    landmarkLabel: "Rink Gate",
    landmarkPosition: HUBS.arenaGate,
    roomIds: ["arena"]
  },
  media: {
    label: "Media Bridge",
    description: "Public-facing pressure sits above the arena concourse, close to the rink but outside private team spaces.",
    floor: "arena",
    colorToken: "#d7e8ff",
    landmarkLabel: "Backdrop Row",
    landmarkPosition: HUBS.pressRow,
    roomIds: ["press"]
  },
  development: {
    label: "Development Pipeline",
    description: "A west-side vertical pipeline for scouting, development plans, and draft execution, connected back to the GM Computer.",
    floor: "main",
    colorToken: "#a9c6ff",
    landmarkLabel: "Draft Board",
    landmarkPosition: HUBS.draftStage,
    roomIds: ["scouting", "development", "draft"]
  },
  customization: {
    label: "Data Lab",
    description: "A small local-only side room for developer inspection, validation, and future data-pack review tools.",
    floor: "main",
    colorToken: "#b58cff",
    landmarkLabel: "Data Lab Terminal",
    landmarkPosition: ROOM_POSITIONS.devTools,
    roomIds: ["devTools"]
  },
  utility: {
    label: "Local Utility Stack",
    description: "Save, standings, settings, and feedback live as quick app kiosks beside the GM Computer, close to spawn and off the main route.",
    floor: "main",
    colorToken: "#76e3a5",
    landmarkLabel: "Local App Stack",
    landmarkPosition: HUBS.supportKiosks,
    roomIds: ["standings", "saves", "settings", "feedback"]
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
  room("gm", "GM Computer", "GM", "entry", ROOM_POSITIONS.gm, {
    width: ROOM_SIZES.command.width,
    depth: ROOM_SIZES.command.depth,
    icon: "GM",
    colorToken: "#61c9ff",
    priority: "core",
    relatedRoomIds: ["contracts", "roster", "ownerSuite", "saves"],
    tutorialWeight: 1,
    description: "Central command computer for inbox, Assistant GM reports, owner pressure, phase guidance, and room handoffs.",
    signage: "GM COMPUTER",
    propTheme: "gmOffice",
    entranceFacing: "north"
  }),
  room("contracts", "Contracts App Bay", "Cap", "hockeyOps", ROOM_POSITIONS.contracts, {
    width: ROOM_SIZES.appTile.width,
    depth: ROOM_SIZES.appTile.depth,
    icon: "$",
    colorToken: "#f5c65b",
    priority: "support",
    relatedRoomIds: ["gm", "agents", "trades", "freeAgency"],
    tutorialWeight: 0.7,
    description: "GM Computer app bay for cap, contracts, expiries, promises, and pick inventory.",
    signage: "CONTRACTS APP",
    propTheme: "contracts",
    entranceFacing: "west"
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
    entranceFacing: "south"
  }),
  room("staff", "Staff App Bay", "Staff", "hockeyOps", ROOM_POSITIONS.staff, {
    width: ROOM_SIZES.appTile.width,
    depth: ROOM_SIZES.appTile.depth,
    icon: "ST",
    colorToken: "#76e3a5",
    priority: "support",
    relatedRoomIds: ["gm", "coach", "scouting", "development"],
    tutorialWeight: 0.5,
    description: "GM Computer app bay for staff hiring, department ratings, and operational support.",
    signage: "STAFF APP",
    propTheme: "staff",
    entranceFacing: "west"
  }),
  room("agents", "Agent Call Booth", "Agents", "frontOffice", ROOM_POSITIONS.agents, {
    width: ROOM_SIZES.compactOffice.width,
    depth: ROOM_SIZES.compactOffice.depth,
    icon: "AG",
    colorToken: "#b58cff",
    priority: "support",
    relatedRoomIds: ["contracts", "playerMeetings", "gm"],
    tutorialWeight: 0.4,
    description: "A private call booth beside the command atrium for agent pressure, client asks, and negotiation tone.",
    signage: "AGENT BOOTH",
    propTheme: "agents",
    entranceFacing: "east"
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
    propTheme: "roster",
    entranceFacing: "east"
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
    propTheme: "coach",
    entranceFacing: "west"
  }),
  room("trades", "Trade Board App Bay", "Trades", "hockeyOps", ROOM_POSITIONS.trades, {
    width: ROOM_SIZES.appTile.width,
    depth: ROOM_SIZES.appTile.depth,
    icon: "TR",
    colorToken: "#ff9f6e",
    priority: "advanced",
    relatedRoomIds: ["contracts", "roster", "freeAgency", "scouting"],
    tutorialWeight: 0.55,
    description: "GM Computer app bay for trade packages, team needs, market fit, and cap math.",
    signage: "TRADE APP",
    propTheme: "trades",
    entranceFacing: "west"
  }),
  room("freeAgency", "Free Agency App Bay", "Market", "hockeyOps", ROOM_POSITIONS.freeAgency, {
    width: ROOM_SIZES.appTile.width,
    depth: ROOM_SIZES.appTile.depth,
    icon: "FA",
    colorToken: "#d7e8ff",
    priority: "advanced",
    relatedRoomIds: ["contracts", "trades", "roster", "staff"],
    tutorialWeight: 0.5,
    description: "GM Computer app bay for offers, rumors, market days, and open-market signings.",
    signage: "MARKET APP",
    propTheme: "freeAgency",
    entranceFacing: "west"
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
    entranceFacing: "east"
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
    entranceFacing: "west"
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
    entranceFacing: "south"
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
  room("draft", "Draft Board", "Draft", "development", ROOM_POSITIONS.draft, {
    width: 3.1,
    depth: 2.3,
    icon: "DF",
    colorToken: "#f5c65b",
    priority: "advanced",
    relatedRoomIds: ["scouting", "development", "gm"],
    tutorialWeight: 0.45,
    description: "A pipeline board for draft execution, owned picks, and prospect selection pressure.",
    signage: "DRAFT BOARD",
    propTheme: "draft",
    entranceFacing: "north"
  }),
  room("saves", "Save App Kiosk", "Save", "utility", ROOM_POSITIONS.saves, {
    width: ROOM_SIZES.appTile.width,
    depth: ROOM_SIZES.appTile.depth,
    icon: "SV",
    colorToken: "#b58cff",
    priority: "core",
    relatedRoomIds: ["gm", "settings", "feedback", "devTools"],
    tutorialWeight: 1,
    description: "Local-save app kiosk for snapshots, diagnostics, bug reports, and in-franchise data-pack library access.",
    signage: "SAVE APP",
    propTheme: "save",
    entranceFacing: "east"
  }),
  room("standings", "Standings App Kiosk", "Trophy", "utility", ROOM_POSITIONS.standings, {
    width: ROOM_SIZES.appTile.width,
    depth: ROOM_SIZES.appTile.depth,
    icon: "TH",
    colorToken: "#f5c65b",
    priority: "core",
    relatedRoomIds: ["gm", "arena", "ownerSuite"],
    tutorialWeight: 0.75,
    description: "Quick standings, achievements, milestones, and history app beside the GM Computer.",
    signage: "STANDINGS APP",
    propTheme: "standings",
    entranceFacing: "east"
  }),
  room("settings", "Settings App Kiosk", "Settings", "utility", ROOM_POSITIONS.settings, {
    width: ROOM_SIZES.appTile.width,
    depth: ROOM_SIZES.appTile.depth,
    icon: "SET",
    colorToken: "#61c9ff",
    priority: "utility",
    relatedRoomIds: ["saves", "feedback", "devTools"],
    tutorialWeight: 0.35,
    description: "Accessibility, presentation, controls, and low-spec settings app beside the GM Computer.",
    signage: "SETTINGS APP",
    propTheme: "settings",
    entranceFacing: "east"
  }),
  room("feedback", "Feedback App Kiosk", "Feedback", "utility", ROOM_POSITIONS.feedback, {
    width: ROOM_SIZES.appTile.width,
    depth: ROOM_SIZES.appTile.depth,
    icon: "FB",
    colorToken: "#8ee7d1",
    priority: "utility",
    relatedRoomIds: ["saves", "settings", "devTools"],
    tutorialWeight: 0.35,
    description: "Closed-beta notes and export-only feedback app beside the GM Computer.",
    signage: "FEEDBACK APP",
    propTheme: "feedback",
    entranceFacing: "east"
  }),
  room("devTools", "Dev Tools Lab", "Tools", "customization", ROOM_POSITIONS.devTools, {
    width: 2.6,
    depth: ROOM_SIZES.compactOffice.depth,
    icon: "DT",
    colorToken: "#b58cff",
    priority: "utility",
    relatedRoomIds: ["saves", "settings", "feedback", "scouting"],
    tutorialWeight: 0.2,
    description: "Developer-only QA, validation, layout export, and future data-lab review tools off the local utility stack.",
    signage: "DATA LAB",
    propTheme: "devTools",
    entranceFacing: "east"
  })
];

const pathNodes: FacilityPathNode[] = [
  node("spawn-concourse", "Command Atrium", HUBS.spawn, ["trophy-hall-cross", "front-office-gate", "hockey-ops-gate", "utility-kiosk"], "entry", true),
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
    { id: "trophy-wall", label: "Trophy Wall", position: HUBS.trophyHall, districtId: "entry" },
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
    "The layout follows the approved GM Computer concept: a command atrium at spawn, local app kiosks on the west side, private owner/agent rooms beyond them, Hockey Ops app bays to the east, a west development pipeline, and a clear team corridor into the large Arena Bowl.",
    "Custom League Lab is currently surfaced through the start screen; Save App Kiosk hosts the in-franchise data-pack library, and the Data Lab district reserves a physical branch for future room expansion."
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
