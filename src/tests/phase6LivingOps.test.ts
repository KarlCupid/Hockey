import { describe, expect, it } from "vitest";
import { createFranchise } from "../game/generators/generateLeague";
import { SeededRng } from "../game/rng";
import type { DecisionEvent, FranchiseState, GameResult, Player, RosterMove, Team } from "../game/types";
import { createAgentCall, getAgentForPlayer } from "../game/systems/agentInteractions";
import { evaluateContractOffer } from "../game/systems/contractNegotiation";
import {
  dedupeDecisionEvents,
  expireDecisionEvents,
  generateContractDecisionEvents,
  generateDecisionEvents,
  generatePhaseDecisionEvents,
  generatePlayoffDecisionEvents,
  generatePostGameDecisionEvents,
  generateRosterDecisionEvents,
  mergeDecisionEvents,
  resolveDecisionEvent
} from "../game/systems/decisionEvents";
import { validateDynastyInvariants } from "../game/systems/dynastyInvariants";
import { runDynastyPlaytest } from "../game/systems/dynastyPlaytest";
import { createFreeAgentMarket } from "../game/systems/freeAgency";
import { applyPressConferenceOutcome, createPressConference } from "../game/systems/pressConferences";
import { applyOwnerMeetingOutcome, createOwnerMeeting } from "../game/systems/ownerMeetings";
import { applyPlayerMeetingOutcome, applyTeamMeetingOutcome, createPlayerMeeting, createTeamMeeting } from "../game/systems/playerMeetings";
import {
  generateAgentsForPlayers,
  generateInitialPlayerRelationships,
  getPlayerRelationship,
  getTeamDynamics,
  updatePlayerRelationship
} from "../game/systems/relationships";
import { scratchPlayer } from "../game/systems/rosterManagement";
import { getPlayerRosterStatus } from "../game/systems/rosterRules";
import { exportSaveToJson, importSaveFromJson, serializeFranchise } from "../game/systems/saves";
import { createStoryArcDecisionEvent, detectStoryArcTriggers, resolveStoryArc, updateStoryArcs } from "../game/systems/storyArcs";

describe("Phase 6 relationships, agents, and dynamics", () => {
  it("hydrates a new franchise with relationships, agents, and team dynamics", () => {
    const franchise = createFranchise("harbor-city", "phase6-new");
    const playerIds = franchise.league.teams.flatMap((team) => team.roster.map((player) => player.id));

    expect(franchise.schemaVersion).toBe(7);
    expect(Object.keys(franchise.playerRelationships).length).toBeGreaterThanOrEqual(playerIds.length);
    expect(franchise.agents.length).toBeGreaterThan(0);
    expect(Object.keys(franchise.teamDynamics)).toHaveLength(franchise.league.teams.length);
    franchise.agents.forEach((agent) => agent.clientPlayerIds.forEach((playerId) => expect(playerIds).toContain(playerId)));
  });

  it("generates valid relationship values and clamps updates to 0-100", () => {
    const franchise = createFranchise("harbor-city", "phase6-clamp");
    const player = selectedTeam(franchise).roster[0];
    const generated = generateInitialPlayerRelationships(franchise);
    const updated = updatePlayerRelationship(franchise, player.id, { trust: 140, roleSatisfaction: -20 });

    expect(generated[player.id].trust).toBeGreaterThanOrEqual(0);
    expect(generated[player.id].trust).toBeLessThanOrEqual(100);
    expect(updated.playerRelationships[player.id].trust).toBe(100);
    expect(updated.playerRelationships[player.id].roleSatisfaction).toBe(0);
  });

  it("agent profiles generate and reference valid players", () => {
    const franchise = createFranchise("harbor-city", "phase6-agents");
    const agents = generateAgentsForPlayers(franchise, new SeededRng("phase6-agents"));
    const playerIds = new Set(franchise.league.teams.flatMap((team) => team.roster.map((player) => player.id)));

    expect(agents.length).toBeGreaterThan(0);
    agents.forEach((agent) => agent.clientPlayerIds.forEach((playerId) => expect(playerIds.has(playerId)).toBe(true)));
  });
});

describe("Phase 6 decision events", () => {
  it("post-game losing streak can generate media, owner, or player events", () => {
    const franchise = withSelectedTeam(createFranchise("harbor-city", "phase6-postgame"), (team) => ({
      ...team,
      record: { ...team.record, losses: 3, streak: "L3" }
    }));
    const result = fakeResult(franchise, 1, 5);
    const events = generatePostGameDecisionEvents(franchise, result, new SeededRng("phase6-postgame"));

    expect(events.some((event) => ["pressConference", "ownerMeeting", "teamMeeting"].includes(event.type))).toBe(true);
    expect(events.every((event) => event.options.every((option) => option.preview.length > 0))).toBe(true);
  });

  it("resolving an event applies morale, trust, fan, owner, media, and outcome changes", () => {
    const franchise = createFranchise("harbor-city", "phase6-resolve");
    const player = selectedTeam(franchise).roster[0];
    const event = createPlayerMeeting(franchise, player.id);
    const withEvent = mergeDecisionEvents(franchise, [event]);
    const beforeTrust = getPlayerRelationship(withEvent, player.id).trust;
    const beforeMorale = selectedTeam(withEvent).roster.find((candidate) => candidate.id === player.id)!.morale;
    const resolved = resolveDecisionEvent(withEvent, event.id, "supportive", new SeededRng("phase6-resolve"));

    expect(resolved.decisionEvents.find((candidate) => candidate.id === event.id)?.status).toBe("resolved");
    expect(getPlayerRelationship(resolved, player.id).trust).toBeGreaterThanOrEqual(beforeTrust);
    expect(selectedTeam(resolved).roster.find((candidate) => candidate.id === player.id)!.morale).toBeGreaterThanOrEqual(beforeMorale);
    expect(resolved.decisionEvents.find((candidate) => candidate.id === event.id)?.outcome?.summary).toBeTruthy();
  });

  it("dedupe, caps, and expiry keep event volume controlled", () => {
    const franchise = createFranchise("harbor-city", "phase6-caps");
    const event = createPressConference(franchise, { topic: "duplicate" });
    const duplicate = { ...event, id: `${event.id}-copy` };
    const many = Array.from({ length: 12 }, (_, index) => ({ ...event, id: `${event.id}-${index}`, repeatKey: `cap-${index}`, severity: index < 5 ? "high" : "medium" }) as DecisionEvent);
    const merged = mergeDecisionEvents(franchise, many);
    const expired = expireDecisionEvents(mergeDecisionEvents(franchise, [event]), "2099-01-01");

    expect(dedupeDecisionEvents([event, duplicate])).toHaveLength(1);
    expect(merged.decisionEvents.filter((candidate) => candidate.status === "active")).toHaveLength(8);
    expect(merged.decisionEvents.filter((candidate) => candidate.status === "active" && candidate.severity === "high")).toHaveLength(3);
    expect(expired.decisionEvents[0].status).toBe("expired");
  });
});

describe("Phase 6 story arcs", () => {
  it("detects goalie controversy, star role demand, rookie breakout, and updates arcs", () => {
    let franchise = createFranchise("harbor-city", "phase6-arcs");
    const team = selectedTeam(franchise);
    const starterId = team.lines.goalies.starter!;
    const backupId = team.lines.goalies.backup!;
    const star = [...team.roster].sort((a, b) => b.overall - a.overall)[0];
    const rookie = team.roster.find((player) => player.age <= 22) ?? team.roster[1];
    franchise = withSelectedTeam(franchise, (candidate) => ({
      ...candidate,
      roster: candidate.roster.map((player) =>
        player.id === starterId
          ? { ...player, form: 30 }
          : player.id === backupId
            ? { ...player, form: 82 }
            : player.id === rookie.id
              ? { ...player, age: 21, form: 82 }
              : player
      )
    }));
    franchise = updatePlayerRelationship(franchise, star.id, { roleSatisfaction: 20 });
    const triggers = detectStoryArcTriggers(franchise, new SeededRng("phase6-arcs"));
    const updated = updateStoryArcs(franchise, new SeededRng("phase6-arcs"));
    const decision = createStoryArcDecisionEvent(updated, updated.storyArcs[0], new SeededRng("phase6-arc-decision"));
    const resolved = resolveStoryArc(updated, updated.storyArcs[0].id, "Handled in meetings.");

    expect(triggers.some((arc) => arc.type === "goalieControversy")).toBe(true);
    expect(triggers.some((arc) => arc.type === "starRoleDemand")).toBe(true);
    expect(triggers.some((arc) => arc.type === "rookieBreakout")).toBe(true);
    expect(updated.storyArcs.length).toBeGreaterThan(0);
    expect(decision?.relatedStoryArcId).toBe(updated.storyArcs[0].id);
    expect(resolved.storyArcs[0].status).toBe("resolved");
  });
});

describe("Phase 6 meeting and pressure systems", () => {
  it("press, owner, player, agent, and team outcomes change the right state", () => {
    let franchise = createFranchise("harbor-city", "phase6-meetings");
    const player = selectedTeam(franchise).roster[0];
    const agent = getAgentForPlayer(franchise, player.id)!;

    const press = createPressConference(franchise, { topic: "pressure" });
    const mediaBefore = franchise.mediaState.pressure;
    franchise = applyPressConferenceOutcome(franchise, press, press.options[0]);
    expect(franchise.mediaState.pressure).toBeLessThanOrEqual(mediaBefore);

    const owner = createOwnerMeeting(franchise);
    const ownerBefore = franchise.ownerState.jobSecurity;
    franchise = applyOwnerMeetingOutcome(franchise, owner, owner.options[0]);
    expect(franchise.ownerState.jobSecurity).toBeGreaterThanOrEqual(ownerBefore);

    const playerMeeting = createPlayerMeeting(franchise, player.id);
    const trustBefore = getPlayerRelationship(franchise, player.id).trust;
    franchise = applyPlayerMeetingOutcome(franchise, playerMeeting, playerMeeting.options[0]);
    expect(getPlayerRelationship(franchise, player.id).trust).toBeGreaterThanOrEqual(trustBefore);

    const agentCall = createAgentCall(franchise, agent.id, player.id);
    const agentBefore = franchise.agents.find((candidate) => candidate.id === agent.id)!.relationship;
    franchise = resolveDecisionEvent(mergeDecisionEvents(franchise, [agentCall]), agentCall.id, "transparent");
    expect(franchise.agents.find((candidate) => candidate.id === agent.id)!.relationship).toBeGreaterThanOrEqual(agentBefore);

    const teamMeeting = createTeamMeeting(franchise);
    const chemistryBefore = getTeamDynamics(franchise, franchise.selectedTeamId).chemistry;
    franchise = applyTeamMeetingOutcome(franchise, teamMeeting, teamMeeting.options[0]);
    expect(getTeamDynamics(franchise, franchise.selectedTeamId).chemistry).toBeGreaterThanOrEqual(chemistryBefore);
  });
});

describe("Phase 6 integrations and save migration", () => {
  it("roster, contract, trade, playoff, draft, and free-agency hooks create relevant events", () => {
    let franchise = createFranchise("harbor-city", "phase6-integrations");
    const team = selectedTeam(franchise);
    const scratchTarget = team.roster.find((player) => getPlayerRosterStatus(player) === "active" && player.position !== "G")!;
    const moved = scratchPlayer(franchise, team.id, scratchTarget.id);
    const rosterEvents = generateRosterDecisionEvents(moved, moved.rosterMoveHistory[0] as RosterMove);

    const player = selectedTeam(franchise).roster[0];
    const weakOffer = {
      id: "weak-offer",
      playerId: player.id,
      teamId: team.id,
      salary: 775_000,
      capHit: 775_000,
      years: 1,
      rolePromise: player.roleExpectation,
      offerType: "extension" as const,
      status: "draft" as const
    };
    expect(evaluateContractOffer(player, weakOffer, team, franchise).accepted).toBe(false);
    expect(generateContractDecisionEvents(franchise, player).some((event) => event.type === "agentCall")).toBe(true);

    expect(generateDecisionEvents(franchise, { kind: "tradeRumor", playerId: player.id }).some((event) => event.type === "tradeRumor")).toBe(true);
    expect(generatePlayoffDecisionEvents({ ...franchise, seasonPhase: "playoffs" }).some((event) => event.type === "playoffPressure")).toBe(true);
    expect(generatePhaseDecisionEvents(franchise, "draftLottery", "draft").some((event) => event.type === "draftReaction")).toBe(true);
    franchise = { ...franchise, freeAgencyState: createFreeAgentMarket(franchise, new SeededRng("phase6-fa")) };
    expect(generateDecisionEvents(franchise, { kind: "freeAgencyMiss" }).some((event) => event.type === "freeAgencyRumor")).toBe(true);
    expect(rosterEvents.some((event) => event.type === "playerMeeting")).toBe(true);
  });

  it("hydrates schema 4 saves to schema 5, repairs missing state, removes bad references, and roundtrips", () => {
    const legacy = JSON.parse(serializeFranchise(createFranchise("harbor-city", "phase6-migration"))) as FranchiseState;
    legacy.schemaVersion = 4;
    delete (legacy as Partial<FranchiseState>).decisionEvents;
    delete (legacy as Partial<FranchiseState>).storyArcs;
    delete (legacy as Partial<FranchiseState>).playerRelationships;
    delete (legacy as Partial<FranchiseState>).agents;
    delete (legacy as Partial<FranchiseState>).teamDynamics;
    delete (legacy as Partial<FranchiseState>).mediaState;
    const badEvent = createPressConference(createFranchise("harbor-city", "phase6-bad-ref"));
    legacy.decisionEvents = [{ ...badEvent, playerIds: ["missing-player"] }];

    const restored = importSaveFromJson(JSON.stringify(legacy));
    const roundtrip = importSaveFromJson(exportSaveToJson(restored));

    expect(restored.schemaVersion).toBe(7);
    expect(Object.keys(restored.playerRelationships).length).toBeGreaterThan(0);
    expect(restored.decisionEvents.some((event) => event.playerIds?.includes("missing-player"))).toBe(false);
    expect(roundtrip.schemaVersion).toBe(7);
  });
});

describe("Phase 6 five-season story stress", () => {
  it("runs five seasons with bounded events, story arcs, relationships, and roster invariants", () => {
    const report = runDynastyPlaytest("phase6-five-season", 5);
    const final = report.finalFranchise;

    expect(report.errors).toEqual([]);
    expect(report.livingOps.eventsGenerated).toBeGreaterThan(0);
    expect(final.decisionEvents.filter((event) => event.status === "active").length).toBeLessThanOrEqual(8);
    expect(final.storyArcs.length).toBeLessThanOrEqual(24);
    Object.values(final.playerRelationships).forEach((relationship) => {
      expect(relationship.trust).toBeGreaterThanOrEqual(0);
      expect(relationship.trust).toBeLessThanOrEqual(100);
      expect(relationship.roleSatisfaction).toBeGreaterThanOrEqual(0);
      expect(relationship.roleSatisfaction).toBeLessThanOrEqual(100);
    });
    expect(validateDynastyInvariants(final).valid).toBe(true);
  });
});

function selectedTeam(franchise: FranchiseState): Team {
  return franchise.league.teams.find((team) => team.id === franchise.selectedTeamId)!;
}

function withSelectedTeam(franchise: FranchiseState, updater: (team: Team) => Team): FranchiseState {
  return {
    ...franchise,
    league: {
      ...franchise.league,
      teams: franchise.league.teams.map((team) => (team.id === franchise.selectedTeamId ? updater(team) : team))
    }
  };
}

function fakeResult(franchise: FranchiseState, goalsFor: number, goalsAgainst: number): GameResult {
  const team = selectedTeam(franchise);
  const game = franchise.league.schedule.find((candidate) => candidate.homeTeamId === team.id || candidate.awayTeamId === team.id)!;
  const homeUser = game.homeTeamId === team.id;
  return {
    id: `fake-${game.id}`,
    gameId: game.id,
    seed: "fake",
    homeTeamId: game.homeTeamId,
    awayTeamId: game.awayTeamId,
    finalScore: { home: homeUser ? goalsFor : goalsAgainst, away: homeUser ? goalsAgainst : goalsFor, overtime: false },
    periodScores: [],
    shots: { home: 30, away: 30 },
    goals: [],
    penalties: [],
    powerPlayAttempts: { home: 2, away: 2 },
    powerPlayGoals: { home: 0, away: 1 },
    goalieStats: team.roster
      .filter((player) => player.position === "G")
      .slice(0, 2)
      .map((player, index) => ({ goalieId: player.id, teamId: team.id, shotsAgainst: 30, saves: index === 0 ? 25 : 30, goalsAgainst: index === 0 ? 5 : 0, win: false, shutout: false })),
    threeStars: [],
    injuries: [],
    eventTimeline: [],
    momentumSummary: "The night got away from the bench.",
    boxScore: {
      home: { teamId: game.homeTeamId, goals: homeUser ? goalsFor : goalsAgainst, shots: 30, powerPlayGoals: 0, powerPlayAttempts: 2, penaltyMinutes: 4 },
      away: { teamId: game.awayTeamId, goals: homeUser ? goalsAgainst : goalsFor, shots: 30, powerPlayGoals: 1, powerPlayAttempts: 2, penaltyMinutes: 4 },
      scoringSummary: [],
      penaltySummary: []
    },
    coachNotes: [],
    playerStatUpdates: [],
    moraleChanges: [],
    fatigueChanges: [],
    newsEvents: []
  };
}
