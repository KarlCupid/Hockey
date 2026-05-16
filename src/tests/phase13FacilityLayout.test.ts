import { describe, expect, it } from "vitest";
import { createFranchise } from "../game/generators/generateLeague";
import { createDefaultFacilityBlueprint, FACILITY_ROOM_IDS } from "../game/facility/facilityBlueprint";
import {
  createFacilityDevToolsReport,
  createFacilitySummary,
  exportFacilityBlueprintJson,
  getCurrentDistrictLabel,
  getDistrictForRoom,
  getOperationsMapRooms,
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
    expect(getBreadcrumbForRoom(blueprint, "coach")).toEqual(["Central Concourse", "Hockey Ops Wing", "Coach's Office"]);
  });

  it("generates room entrance prompts", () => {
    expect(getRoomEntrancePrompt(getRoomDefinition(blueprint, "coach"))).toBe("Enter Coach's Office");
    expect(getRoomEntrancePrompt(getRoomDefinition(blueprint, "settings"))).toBe("Open Settings");
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
    expect(getOperationsMapRooms(blueprint, "frontOffice").map((room) => room.roomId)).toEqual(
      expect.arrayContaining(["gm", "contracts", "ownerSuite", "staff", "agents"])
    );
    expect(getOperationsMapRooms(blueprint, "hockeyOps").map((room) => room.roomId)).toEqual(
      expect.arrayContaining(["roster", "coach", "trades", "freeAgency"])
    );
  });

  it("filters core rooms", () => {
    expect(getOperationsMapRooms(blueprint, "core").map((room) => room.roomId)).toEqual(
      expect.arrayContaining(["gm", "roster", "coach", "arena", "saves"])
    );
  });

  it("returns room badge positions", () => {
    expect(getRoomMapBadgePosition(blueprint, "arena")).toEqual({ x: 50, y: 86 });
  });

  it("returns current district labels", () => {
    expect(getCurrentDistrictLabel(blueprint, "coach")).toBe("Hockey Ops Wing");
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
        expect(recommendation.navigationHint).toContain("Central Concourse");
      });
  });

  it("explains facility districts in the guide", () => {
    const topic = getGuideTopics().find((candidate) => candidate.id === "basics-facility-districts");
    expect(topic?.body).toContain("Central Concourse");
    expect(topic?.body).toContain("Development Wing");
  });

  it("includes current district in feedback and bug report context", () => {
    const franchise = createFranchise("harbor-city", { seed: "phase13-feedback" });
    const feedback = createFeedbackEntry({ headline: "Map helped me navigate", roomId: "coach" }, franchise);
    expect(feedback.districtLabel).toBe("Hockey Ops Wing");
    const bugReport = createBugReport(franchise, { lastRoom: "arena" });
    expect(bugReport.lastDistrictLabel).toBe("Arena Bowl");
  });

  it("serializes facility summary and blueprint export", () => {
    expect(createFacilitySummary(blueprint)).toContain("Phase 13 Facility Masterplan");
    expect(JSON.parse(exportFacilityBlueprintJson(blueprint)).rooms.length).toBe(FACILITY_ROOM_IDS.length);
    expect(createFacilityDevToolsReport(blueprint, FACILITY_ROOM_IDS)).toContain("Facility blueprint validation report");
  });
});
