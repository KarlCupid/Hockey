import { describe, expect, it } from "vitest";
import { createFranchise } from "../game/generators/generateLeague";
import { createDefaultFacilityBlueprint, FACILITY_ROOM_IDS } from "../game/facility/facilityBlueprint";
import {
  createFacilityDevToolsReport,
  createFacilitySummary,
  exportFacilityBlueprintJson,
  getCurrentDistrictLabel,
  getDistrictForRoom,
  getOperationsMapGoToRoomLabel,
  getOperationsMapPinLabel,
  getOperationsMapRooms,
  getRoomDistance,
  getRoomDefinition,
  getRoomMapBadgePosition,
  getSuggestedRoomRoute
} from "../game/facility/facilityNavigation";
import { validateFacilityBlueprint } from "../game/facility/facilityValidation";
import {
  getBreadcrumbForRoom,
  getCurrentDistrictFromPosition,
  getNearestLandmark,
  getRoomEntrancePrompt,
  getWayfindingLabel
} from "../game/facility/facilityWayfinding";
import { generateAssistantGmReport } from "../game/systems/assistantGm";
import { createFeedbackEntry } from "../game/systems/betaFeedback";
import { createBugReport } from "../game/systems/bugReport";
import { getGuideTopics } from "../game/systems/guide";
import { FIRST_HOUR_TUTORIAL_ROOM_ROUTE } from "../game/systems/tutorial";

const blueprint = createDefaultFacilityBlueprint();

describe("Phase 13 facility blueprint", () => {
  it("validates the default facility blueprint", () => {
    const report = validateFacilityBlueprint(blueprint, FACILITY_ROOM_IDS);
    expect(report.valid).toBe(true);
    expect(report.errors).toEqual([]);
  });

  it("represents every RoomId exactly once", () => {
    const roomIds = blueprint.rooms.map((room) => room.roomId);
    expect([...roomIds].sort()).toEqual([...FACILITY_ROOM_IDS].sort());
  });

  it("has no duplicate room definitions", () => {
    const roomIds = blueprint.rooms.map((room) => room.roomId);
    expect(new Set(roomIds).size).toBe(roomIds.length);
    expect(validateFacilityBlueprint(blueprint, FACILITY_ROOM_IDS).duplicateRooms).toEqual([]);
  });

  it("gives every room a district", () => {
    blueprint.rooms.forEach((room) => {
      expect(getDistrictForRoom(blueprint, room.roomId).roomIds).toContain(room.roomId);
    });
  });

  it("gives every room a map position", () => {
    blueprint.rooms.forEach((room) => {
      expect(Number.isFinite(room.mapPosition.x)).toBe(true);
      expect(Number.isFinite(room.mapPosition.y)).toBe(true);
    });
  });

  it("gives every room a physical position", () => {
    blueprint.rooms.forEach((room) => {
      expect(Number.isFinite(room.position.x)).toBe(true);
      expect(Number.isFinite(room.position.z)).toBe(true);
    });
  });

  it("keeps every district populated", () => {
    blueprint.districts.forEach((district) => {
      expect(district.roomIds.length).toBeGreaterThan(0);
      expect(blueprint.rooms.some((room) => room.districtId === district.id)).toBe(true);
    });
  });

  it("keeps core rooms reachable", () => {
    expect(validateFacilityBlueprint(blueprint, FACILITY_ROOM_IDS).disconnectedRooms).toEqual([]);
  });

  it("keeps every room inside its planned district footprint", () => {
    expect(validateFacilityBlueprint(blueprint, FACILITY_ROOM_IDS).outOfDistrictRooms).toEqual([]);
  });

  it("keeps every district connected to the path network", () => {
    expect(validateFacilityBlueprint(blueprint, FACILITY_ROOM_IDS).disconnectedDistricts).toEqual([]);
  });

  it("keeps room entrances facing corridor or hub flow", () => {
    expect(validateFacilityBlueprint(blueprint, FACILITY_ROOM_IDS).misalignedEntrances).toEqual([]);
  });

  it("keeps Operations Map pins readable", () => {
    expect(validateFacilityBlueprint(blueprint, FACILITY_ROOM_IDS).collidingMapPins).toEqual([]);
  });

  it("keeps path graph and main corridor valid", () => {
    const report = validateFacilityBlueprint(blueprint, FACILITY_ROOM_IDS);
    expect(report.invalidPathConnections).toEqual([]);
    expect(report.mainCorridorIssues).toEqual([]);
  });

  it("uses the main corridor as a hockey spine from command atrium to arena", () => {
    const corridorDistricts = blueprint.mainCorridorNodes
      .map((nodeId) => blueprint.pathNodes.find((node) => node.id === nodeId)?.districtId)
      .filter(Boolean);
    expect(corridorDistricts.indexOf("entry")).toBeLessThan(corridorDistricts.indexOf("hockeyOps"));
    expect(corridorDistricts.indexOf("hockeyOps")).toBeLessThan(corridorDistricts.indexOf("teamWing"));
    expect(corridorDistricts.indexOf("teamWing")).toBeLessThan(corridorDistricts.indexOf("arena"));
  });

  it("implements the approved GM Computer facility hierarchy", () => {
    const district = (id: string) => blueprint.districts.find((candidate) => candidate.id === id)!;
    expect(district("entry").label).toBe("Command Atrium");
    expect(getRoomDefinition(blueprint, "gm").label).toBe("GM Computer");
    expect(getRoomDefinition(blueprint, "gm").districtId).toBe("entry");
    expect(district("frontOffice").bounds.x).toBeLessThan(district("entry").bounds.x);
    expect(district("hockeyOps").bounds.x).toBeGreaterThan(district("entry").bounds.x);
    expect(district("development").bounds.x).toBeLessThan(district("entry").bounds.x);
    expect(district("teamWing").bounds.z).toBeGreaterThan(district("hockeyOps").bounds.z);
    expect(district("arena").bounds.x).toBeGreaterThan(district("teamWing").bounds.x);
    expect(district("frontOffice").roomIds).toEqual(["ownerSuite", "agents"]);
    expect(district("hockeyOps").roomIds).toEqual(expect.arrayContaining(["roster", "coach", "contracts", "trades", "freeAgency", "staff"]));
    expect(getRoomDefinition(blueprint, "arena").size.width).toBeGreaterThan(getRoomDefinition(blueprint, "locker").size.width);
    expect(getRoomDistance(blueprint, "gm", "saves")).toBeLessThanOrEqual(5);
    expect(getRoomDistance(blueprint, "locker", "medical")).toBeLessThanOrEqual(3);
    expect(getRoomDistance(blueprint, "saves", "standings")).toBeLessThanOrEqual(4);
  });

  it("has a core first-hour route from GM to roster, coach, arena, and saves", () => {
    const routePairs = [
      ["gm", "roster"],
      ["roster", "coach"],
      ["coach", "arena"],
      ["arena", "saves"]
    ] as const;
    routePairs.forEach(([from, to]) => {
      expect(getSuggestedRoomRoute(blueprint, from, to).length).toBeGreaterThan(0);
    });
  });

  it("routes coach to the Arena Bowl through the team wing and tunnel", () => {
    const route = getSuggestedRoomRoute(blueprint, "coach", "arena");
    expect(route.map((node) => node.districtId)).toContain("teamWing");
    expect(route.map((node) => node.id)).toEqual(expect.arrayContaining(["arena-tunnel", "arena-gate"]));
  });

  it("keeps every room routable back to the Save Desk", () => {
    blueprint.rooms
      .filter((room) => room.roomId !== "saves")
      .forEach((room) => {
        expect(getSuggestedRoomRoute(blueprint, room.roomId, "saves").length).toBeGreaterThan(0);
      });
  });

  it("keeps related room IDs valid", () => {
    const report = validateFacilityBlueprint(blueprint, FACILITY_ROOM_IDS);
    expect(report.invalidRelatedRooms).toEqual([]);
    blueprint.rooms.forEach((room) => {
      room.relatedRoomIds.forEach((relatedRoomId) => expect(getRoomDefinition(blueprint, relatedRoomId)).toBeTruthy());
    });
  });

  it("avoids severe room overlap warnings", () => {
    expect(validateFacilityBlueprint(blueprint, FACILITY_ROOM_IDS).overlappingRooms).toEqual([]);
  });
});

describe("Phase 13 wayfinding", () => {
  it("resolves a position to a district", () => {
    expect(getCurrentDistrictFromPosition(blueprint, { x: -8.2, z: -2.7 })?.id).toBe("frontOffice");
  });

  it("generates room breadcrumbs", () => {
    expect(getBreadcrumbForRoom(blueprint, "coach")).toEqual(["Command Atrium", "Hockey Ops Suite", "Coach's Office"]);
  });

  it("generates room entrance prompts", () => {
    expect(getRoomEntrancePrompt(getRoomDefinition(blueprint, "coach"))).toBe("Enter Coach's Office");
    expect(getRoomEntrancePrompt(getRoomDefinition(blueprint, "settings"))).toBe("Open Settings App Kiosk");
  });

  it("keeps nearest landmark lookup safe", () => {
    expect(getNearestLandmark(blueprint, { x: 0, z: 0 })?.label).toContain("Operations");
  });

  it("keeps unknown positions safe", () => {
    expect(getCurrentDistrictFromPosition(blueprint, { x: 999, z: 999 })?.label).toBeTruthy();
    expect(getWayfindingLabel(blueprint, { x: 999, z: 999 })).toContain("->");
  });
});

describe("Phase 13 Operations Map helpers", () => {
  it("filters district rooms", () => {
    expect(getOperationsMapRooms(blueprint, "frontOffice").map((room) => room.roomId)).toEqual(expect.arrayContaining(["ownerSuite", "agents"]));
    expect(getOperationsMapRooms(blueprint, "hockeyOps").map((room) => room.roomId)).toEqual(
      expect.arrayContaining(["roster", "coach", "contracts", "trades", "freeAgency", "staff"])
    );
  });

  it("filters core rooms", () => {
    expect(getOperationsMapRooms(blueprint, "core").map((room) => room.roomId)).toEqual(
      expect.arrayContaining(["gm", "roster", "coach", "arena", "saves"])
    );
  });

  it("returns room badge positions", () => {
    const arenaPin = getRoomMapBadgePosition(blueprint, "arena");
    expect(arenaPin.x).toBeGreaterThan(80);
    expect(arenaPin.x).toBeLessThan(90);
    expect(arenaPin.y).toBeGreaterThan(70);
    expect(arenaPin.y).toBeLessThan(80);
  });

  it("returns current district labels", () => {
    expect(getCurrentDistrictLabel(blueprint, "coach")).toBe("Hockey Ops Suite");
  });

  it("labels map controls with destination-specific accessible names", () => {
    const gm = getRoomDefinition(blueprint, "gm");
    const badges = [{ id: "news", label: "News", tone: "info" as const, count: 4 }];
    expect(getOperationsMapPinLabel(blueprint, gm, badges)).toBe("Select GM Computer. Command Atrium. Status: News 4");
    expect(getOperationsMapGoToRoomLabel(blueprint, gm, badges)).toBe("Go to GM Computer. Command Atrium. Status: News 4");
  });

  it("keeps Custom League Lab discoverable without adding a facility room", () => {
    const customization = blueprint.districts.find((district) => district.id === "customization");
    expect(customization?.roomIds).toEqual(["devTools"]);
    expect(blueprint.notes.join(" ")).toContain("Custom League Lab");
    expect(getRoomDefinition(blueprint, "saves").description).toContain("data-pack library");
  });
});

describe("Phase 13 tutorial, Assistant GM, and docs helpers", () => {
  it("uses existing room IDs in the first-hour tutorial route", () => {
    expect(FIRST_HOUR_TUTORIAL_ROOM_ROUTE).toEqual(["gm", "roster", "coach", "arena", "saves"]);
    FIRST_HOUR_TUTORIAL_ROOM_ROUTE.forEach((roomId) => expect(FACILITY_ROOM_IDS).toContain(roomId));
  });

  it("adds district labels to Assistant GM recommendation targets", () => {
    const report = generateAssistantGmReport(createFranchise("harbor-city", { seed: "phase13-agm" }));
    report.recommendations
      .filter((recommendation) => recommendation.targetRoomId)
      .forEach((recommendation) => {
        expect(recommendation.targetDistrictLabel).toBeTruthy();
        expect(recommendation.navigationHint).toContain("Command Atrium");
      });
  });

  it("explains facility districts in the guide", () => {
    const topic = getGuideTopics().find((candidate) => candidate.id === "basics-facility-districts");
    expect(topic?.body).toContain("Command Atrium");
    expect(topic?.body).toContain("Development Pipeline");
  });

  it("includes current district in feedback and bug report context", () => {
    const franchise = createFranchise("harbor-city", { seed: "phase13-feedback" });
    const feedback = createFeedbackEntry({ headline: "Map helped me navigate", roomId: "coach" }, franchise);
    expect(feedback.districtLabel).toBe("Hockey Ops Suite");
    const bugReport = createBugReport(franchise, { lastRoom: "arena" });
    expect(bugReport.lastDistrictLabel).toBe("Arena Bowl");
  });

  it("serializes facility summary and blueprint export", () => {
    expect(createFacilitySummary(blueprint)).toContain("Phase 13 Facility Masterplan");
    expect(JSON.parse(exportFacilityBlueprintJson(blueprint)).rooms.length).toBe(FACILITY_ROOM_IDS.length);
    expect(createFacilityDevToolsReport(blueprint, FACILITY_ROOM_IDS)).toContain("Facility blueprint validation report");
  });

  it("documents the image-guided layout export workflow", async () => {
    // @ts-expect-error Node built-ins are available in Vitest, but app typecheck intentionally omits Node types.
    const fs = await import("node:fs");
    const cwd = (globalThis as unknown as { process: { cwd: () => string } }).process.cwd();
    const readArtifact = (artifactPath: string) => fs.readFileSync(`${cwd}/${artifactPath}`, "utf8") as string;
    const requiredArtifacts = [
      "docs/facility-layout/README.md",
      "docs/facility-layout/IMAGE_PROMPTS.md",
      "docs/facility-layout/LAYOUT_SPEC_TEMPLATE.md",
      "docs/facility-layout/CODEX_IMPLEMENTATION_PROMPT.md",
      "docs/facility-layout/approved-facility-layout-spec.md",
      "docs/facility-layout/current-facility-layout.svg",
      "scripts/export-facility-layout.mjs"
    ];
    requiredArtifacts.forEach((artifactPath) => {
      expect(fs.existsSync(`${cwd}/${artifactPath}`)).toBe(true);
    });

    const packageJson = JSON.parse(readArtifact("package.json")) as { scripts: Record<string, string> };
    expect(packageJson.scripts["export:facility-layout"]).toBe("node scripts/export-facility-layout.mjs");
    expect(readArtifact("FACILITY_BLUEPRINT.md")).toContain("Image-Guided Layout Workflow");
    expect(readArtifact("docs/facility-layout/README.md")).toContain("Concept images, prompt outputs");
    expect(readArtifact("docs/facility-layout/IMAGE_PROMPTS.md")).toContain("Final Implementation-Spec Extraction From Approved Image");
    expect(readArtifact("docs/facility-layout/LAYOUT_SPEC_TEMPLATE.md")).toContain("JSON-Like Implementation Data");
    expect(readArtifact("docs/facility-layout/CODEX_IMPLEMENTATION_PROMPT.md")).toContain("Do not create duplicate layout data outside the blueprint");
    expect(readArtifact("docs/facility-layout/approved-facility-layout-spec.md")).toContain("Current status: Approved implementation spec");
    expect(readArtifact("scripts/export-facility-layout.mjs")).toContain("createDefaultFacilityBlueprint");
    expect(readArtifact("docs/facility-layout/current-facility-layout.svg")).toContain("Franchise Ice Facility Layout Export");
  });
});
