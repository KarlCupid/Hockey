import { describe, expect, it } from "vitest";
import { createFranchise } from "../game/generators/generateLeague";
import { SeededRng } from "../game/rng";
import { NARRATIVE_TEMPLATES } from "../game/content/narrativeTemplates";
import { getMasterActionQueue, getRoomBadges, getUrgentActionCount } from "../game/systems/actionQueue";
import {
  dismissAssistantGmReport,
  generateAssistantGmReport,
  generateContractRecommendations,
  generateDevelopmentRecommendations,
  generateRosterRecommendations,
  generateStoryRecommendations
} from "../game/systems/assistantGm";
import { createDifficultyTuning } from "../game/systems/difficulty";
import { createContractDemand } from "../game/systems/contractNegotiation";
import { mergeDecisionEvents, resolveDecisionEvent } from "../game/systems/decisionEvents";
import { runDynastyPlaytest } from "../game/systems/dynastyPlaytest";
import { createGmProfile, getGmTraits } from "../game/systems/gmProfile";
import {
  applyMediaPressureDrift,
  applyNaturalSentimentDecay,
  applyTeamChemistryDrift,
  getEventCadenceTuning,
  shouldGenerateDecisionEvent
} from "../game/systems/livingOpsTuning";
import {
  createDecisionEventFromTemplate,
  getTemplateContextFromFranchise,
  renderTemplate,
  selectNarrativeTemplate,
  validateNarrativeTemplates
} from "../game/systems/narrativeTemplateEngine";
import { createPlayerMeeting } from "../game/systems/playerMeetings";
import { createPressConference } from "../game/systems/pressConferences";
import { getPlayerRelationship } from "../game/systems/relationships";
import { exportSaveToJson, importSaveFromJson } from "../game/systems/saves";
import type { DecisionEvent, FranchiseState, GMBackground, NarrativeTemplate, Player, Team } from "../game/types";

describe("Phase 7 difficulty and game modes", () => {
  it("creates valid tuning for every difficulty and makes hardcore stricter than relaxed", () => {
    const relaxed = createDifficultyTuning("relaxed", "standardDynasty", "normal");
    const standard = createDifficultyTuning("standard", "standardDynasty", "normal");
    const demanding = createDifficultyTuning("demanding", "standardDynasty", "normal");
    const hardcore = createDifficultyTuning("hardcore", "standardDynasty", "normal");

    expect([relaxed, standard, demanding, hardcore].every((tuning) => Number.isFinite(tuning.storyEventMultiplier))).toBe(true);
    expect(hardcore.tradeAiStrictness).toBeGreaterThan(relaxed.tradeAiStrictness);
    expect(hardcore.contractDemandMultiplier).toBeGreaterThan(relaxed.contractDemandMultiplier);
    expect(hardcore.ownerPatienceMultiplier).toBeGreaterThan(relaxed.ownerPatienceMultiplier);
  });

  it("sandbox lowers owner and media pressure", () => {
    const standard = createDifficultyTuning("standard", "standardDynasty", "normal");
    const sandbox = createDifficultyTuning("standard", "sandbox", "normal");

    expect(sandbox.ownerPatienceMultiplier).toBeLessThan(standard.ownerPatienceMultiplier);
    expect(sandbox.mediaPressureMultiplier).toBeLessThan(standard.mediaPressureMultiplier);
  });

  it("rebuild challenge generates development, draft, or cap goals", () => {
    const franchise = createFranchise("harbor-city", { seed: "phase7-rebuild-goals", gameMode: "rebuildChallenge" });
    const goalTypes = franchise.ownerState.seasonGoals.map((goal) => goal.type);

    expect(goalTypes).toContain("developProspect");
    expect(goalTypes.some((type) => type === "buildThroughDraft" || type === "stayUnderCap")).toBe(true);
  });

  it("contender challenge generates performance goals", () => {
    const franchise = createFranchise("harbor-city", { seed: "phase7-contender-goals", gameMode: "contenderChallenge" });
    const goalTypes = franchise.ownerState.seasonGoals.map((goal) => goal.type);

    expect(goalTypes).toContain("makePlayoffs");
    expect(goalTypes).toContain("winRound");
  });

  it("start presets produce valid franchise state", () => {
    const franchise = createFranchise("harbor-city", { seed: "phase7-preset", startPreset: "capCrunched", difficulty: "demanding" });

    expect(franchise.schemaVersion).toBe(7);
    expect(franchise.gmProfile.difficulty).toBe("demanding");
    expect(franchise.league.teams.find((team) => team.id === franchise.selectedTeamId)?.capCeiling).toBeLessThan(96_000_000);
  });
});

describe("Phase 7 GM profile", () => {
  const backgrounds: GMBackground[] = [
    "Former Coach",
    "Cap Strategist",
    "Scout at Heart",
    "Player Relationship Builder",
    "Analytics Executive",
    "Old-School Hockey Ops",
    "Owner Favorite",
    "Media Savvy"
  ];

  it("every GM background has at least one trait and serializes", () => {
    backgrounds.forEach((background) => expect(getGmTraits(background).length).toBeGreaterThan(0));
    const profile = createGmProfile({ displayName: "Dana Vale", background: "Analytics Executive" });
    expect(JSON.parse(JSON.stringify(profile)).background).toBe("Analytics Executive");
  });

  it("Media Savvy improves press outcome", () => {
    const baseline = withMediaPressure(createFranchise("harbor-city", { seed: "phase7-press", gmBackground: "Former Coach" }), 55);
    const savvy = withMediaPressure(createFranchise("harbor-city", { seed: "phase7-press", gmBackground: "Media Savvy" }), 55);
    const baselineResolved = resolveFirstOption(mergeDecisionEvents(baseline, [createPressConference(baseline, { topic: "Test podium" })]));
    const savvyResolved = resolveFirstOption(mergeDecisionEvents(savvy, [createPressConference(savvy, { topic: "Test podium" })]));

    expect(savvyResolved.mediaState.pressure).toBeLessThan(baselineResolved.mediaState.pressure);
  });

  it("Player Relationship Builder improves player meeting outcome", () => {
    const baseline = createFranchise("harbor-city", { seed: "phase7-player-meeting", gmBackground: "Former Coach" });
    const builder = createFranchise("harbor-city", { seed: "phase7-player-meeting", gmBackground: "Player Relationship Builder" });
    const playerId = selectedTeam(baseline).roster[0].id;
    const baselineResolved = resolveFirstOption(mergeDecisionEvents(baseline, [createPlayerMeeting(baseline, playerId)]));
    const builderResolved = resolveFirstOption(mergeDecisionEvents(builder, [createPlayerMeeting(builder, playerId)]));

    expect(getPlayerRelationship(builderResolved, playerId).trust).toBeGreaterThanOrEqual(getPlayerRelationship(baselineResolved, playerId).trust);
  });

  it("Cap Strategist improves contract demand", () => {
    const baseline = createFranchise("harbor-city", { seed: "phase7-contract", gmBackground: "Former Coach" });
    const capStrategist = createFranchise("harbor-city", { seed: "phase7-contract", gmBackground: "Cap Strategist" });
    const player = topPlayer(selectedTeam(baseline));
    const baselineDemand = createContractDemand(player, selectedTeam(baseline), baseline);
    const strategistDemand = createContractDemand(player, selectedTeam(capStrategist), capStrategist);

    expect(strategistDemand.demandSalary).toBeLessThanOrEqual(baselineDemand.demandSalary);
  });
});

describe("Phase 7 narrative templates", () => {
  it("validates the template library and minimum category counts", () => {
    expect(validateNarrativeTemplates(NARRATIVE_TEMPLATES)).toEqual([]);
    const counts = categoryCounts(NARRATIVE_TEMPLATES);

    expect(counts.press).toBeGreaterThanOrEqual(18);
    expect(counts.owner).toBeGreaterThanOrEqual(12);
    expect(counts.agent).toBeGreaterThanOrEqual(12);
    expect(counts.player).toBeGreaterThanOrEqual(18);
    expect(counts.team).toBeGreaterThanOrEqual(10);
    expect((counts.media ?? 0) + (counts.fan ?? 0)).toBeGreaterThanOrEqual(12);
    expect(counts.rivalry).toBeGreaterThanOrEqual(8);
    expect(counts.playoff).toBeGreaterThanOrEqual(10);
    expect(counts.draft).toBeGreaterThanOrEqual(8);
    expect(counts.freeAgency).toBeGreaterThanOrEqual(6);
    expect(counts.trade).toBeGreaterThanOrEqual(6);
    expect((counts.development ?? 0) + (counts.affiliate ?? 0)).toBeGreaterThanOrEqual(8);
  });

  it("renders placeholders and avoids prohibited real hockey terms", () => {
    const rendered = renderTemplate("{team} discusses {player} before {opponent}", {
      team: "Harbor City Blades",
      player: "Fictional Player",
      opponent: "Cascadia Storm"
    });
    const fullText = NARRATIVE_TEMPLATES.map((template) => `${template.headlineTemplate} ${template.bodyTemplate}`).join(" ");

    expect(rendered).toBe("Harbor City Blades discusses Fictional Player before Cascadia Storm");
    expect(rendered).not.toMatch(/\{[a-zA-Z]/);
    expect(fullText).not.toMatch(/\b(NHL|Maple Leafs|Canadiens|Bruins|Rangers|Blackhawks|Red Wings|Penguins|Oilers|Canucks)\b/i);
  });

  it("selects templates deterministically by seed", () => {
    const context = { category: "press" as const, tags: ["press"], team: "Harbor City Blades" };
    const first = selectNarrativeTemplate(NARRATIVE_TEMPLATES, context, new SeededRng("phase7-template"));
    const second = selectNarrativeTemplate(NARRATIVE_TEMPLATES, context, new SeededRng("phase7-template"));

    expect(first.id).toBe(second.id);
  });
});

describe("Phase 7 living ops cadence", () => {
  it("story frequency controls deterministic event chance", () => {
    const quiet = createFranchise("harbor-city", { seed: "phase7-quiet", storyFrequency: "quiet" });
    const normal = createFranchise("harbor-city", { seed: "phase7-normal", storyFrequency: "normal" });
    const dramatic = createFranchise("harbor-city", { seed: "phase7-dramatic", storyFrequency: "dramatic" });

    expect(sampleEventChecks(quiet)).toBeLessThan(sampleEventChecks(normal));
    expect(sampleEventChecks(dramatic)).toBeGreaterThan(sampleEventChecks(normal));
    expect(getEventCadenceTuning(dramatic).maxActiveEvents).toBeLessThanOrEqual(9);
  });

  it("media pressure, owner trust, and chemistry drift in bounded ways", () => {
    let franchise = withSelectedTeam(createFranchise("harbor-city", "phase7-drift"), (team) => ({
      ...team,
      record: { ...team.record, wins: 5, losses: 17, overtimeLosses: 0, streak: "L5" }
    }));
    franchise = {
      ...franchise,
      ownerState: {
        ...franchise.ownerState,
        seasonGoals: franchise.ownerState.seasonGoals.map((goal) => ({ ...goal, status: "failed" as const }))
      },
      teamDynamics: {
        ...franchise.teamDynamics,
        [franchise.selectedTeamId]: {
          ...franchise.teamDynamics[franchise.selectedTeamId],
          ownerTrust: 100,
          chemistry: 100,
          mediaPressure: 0,
          unresolvedIssues: ["trade", "role"]
        }
      },
      rosterMoveHistory: [
        {
          id: "move-a",
          date: franchise.league.currentDate,
          teamId: franchise.selectedTeamId,
          playerId: selectedTeam(franchise).roster[0].id,
          fromStatus: "active",
          toStatus: "affiliate",
          type: "sendDown",
          reason: "test churn",
          capImpact: 0,
          userInitiated: true
        }
      ]
    };
    const drifted = applyTeamChemistryDrift(applyMediaPressureDrift(applyNaturalSentimentDecay(franchise)));
    const dynamics = drifted.teamDynamics[drifted.selectedTeamId];

    expect(drifted.mediaState.pressure).toBeGreaterThan(0);
    expect(dynamics.ownerTrust).toBeLessThan(100);
    expect(dynamics.chemistry).toBeLessThan(100);
    expect([dynamics.ownerTrust, dynamics.chemistry, dynamics.mediaPressure, dynamics.fanSentiment, drifted.mediaState.pressure].every((value) => value >= 0 && value <= 100)).toBe(true);
  });

  it("event caps still hold", () => {
    const franchise = createFranchise("harbor-city", "phase7-event-caps");
    const context = getTemplateContextFromFranchise(franchise, { category: "press", tags: ["press"] });
    const events = NARRATIVE_TEMPLATES.slice(0, 20).map((template, index) =>
      createDecisionEventFromTemplate(template, context, new SeededRng(`cap-${index}`))
    );
    const merged = mergeDecisionEvents(franchise, events);

    expect(merged.decisionEvents.filter((event) => event.status === "active").length).toBeLessThanOrEqual(8);
  });
});

describe("Phase 7 Assistant GM and action queue", () => {
  it("invalid roster creates urgent recommendations and blocking queue items", () => {
    const franchise = makeInvalidRoster(createFranchise("harbor-city", "phase7-invalid-roster"));

    expect(generateRosterRecommendations(franchise).some((item) => item.priority === "urgent" && item.targetRoomId === "roster")).toBe(true);
    expect(getMasterActionQueue(franchise).some((item) => item.blocking && item.roomId === "roster")).toBe(true);
  });

  it("expiring star creates a contract recommendation", () => {
    const franchise = withTopPlayer(createFranchise("harbor-city", "phase7-expiring"), (player) => ({
      ...player,
      overall: 88,
      contract: { ...player.contract, yearsRemaining: 1 }
    }));

    expect(generateContractRecommendations(franchise).some((item) => item.category === "contract" && item.targetRoomId === "contracts")).toBe(true);
  });

  it("pending decision event creates a story recommendation and urgent queue item", () => {
    const franchise = addHighDecision(createFranchise("harbor-city", "phase7-story-rec"));

    expect(generateStoryRecommendations(franchise).some((item) => item.category === "story" && item.targetRoomId)).toBe(true);
    expect(getMasterActionQueue(franchise).some((item) => item.priority === "urgent" && item.category === "story")).toBe(true);
  });

  it("prospect promotion creates roster or development recommendations with room IDs", () => {
    const franchise = withSelectedTeam(createFranchise("harbor-city", "phase7-prospect-promo"), (team) => ({
      ...team,
      roster: team.roster.map((player, index) =>
        index === 0 ? { ...player, age: 21, overall: 78, potential: 86, fatigue: 20, rosterStatus: "affiliate" as const } : player
      )
    }));
    const recs = [...generateRosterRecommendations(franchise), ...generateDevelopmentRecommendations(franchise)];

    expect(recs.some((item) => item.category === "roster" || item.category === "development")).toBe(true);
    expect(recs.every((item) => item.targetRoomId)).toBe(true);
  });

  it("dismissed reports stay dismissed and room badges are generated", () => {
    const franchise = addHighDecision(createFranchise("harbor-city", "phase7-dismiss"));
    const report = generateAssistantGmReport(franchise, { type: "weekly" });
    const dismissed = dismissAssistantGmReport({ ...franchise, assistantGmReports: [report] }, report.id);
    const badges = getRoomBadges(franchise);

    expect(dismissed.assistantGmReports[0].dismissed).toBe(true);
    expect(Object.values(badges).flat().length).toBeGreaterThan(0);
  });

  it("pending draft pick creates a blocking queue item and stable new saves have no urgent blockers", () => {
    const stable = createFranchise("harbor-city", "phase7-stable-queue");
    const draft = {
      ...stable,
      seasonPhase: "draft" as const,
      offseasonState: {
        year: stable.league.seasonYear,
        retiredPlayerIds: [],
        retiredPlayerNames: [],
        reSigningCompleted: false,
        trainingCampCompleted: false,
        phaseLog: [],
        draftState: {
          year: stable.league.seasonYear,
          round: 1,
          pickNumber: 1,
          draftOrder: [stable.selectedTeamId],
          selections: [],
          userPickPending: true,
          completed: false
        }
      }
    };

    expect(getUrgentActionCount(stable)).toBe(0);
    expect(getMasterActionQueue(draft).some((item) => item.blocking && item.roomId === "scouting")).toBe(true);
  });
});

describe("Phase 7 save migration and playtest reports", () => {
  it("hydrates schema 5 saves to schema 7 and repairs missing or invalid GM fields", () => {
    const legacy = createFranchise("harbor-city", "phase7-legacy") as unknown as Partial<FranchiseState> & Record<string, unknown>;
    legacy.schemaVersion = 5;
    delete legacy.gmProfile;
    delete legacy.difficultyTuning;
    delete legacy.assistantGmReports;
    delete legacy.narrativeTemplateVersion;
    const restored = importSaveFromJson(JSON.stringify(legacy));

    expect(restored.schemaVersion).toBe(7);
    expect(restored.gmProfile.difficulty).toBe("standard");
    expect(restored.assistantGmReports.length).toBeGreaterThan(0);

    const invalid = { ...restored, gmProfile: { ...restored.gmProfile, difficulty: "impossible" } };
    expect(importSaveFromJson(JSON.stringify(invalid)).gmProfile.difficulty).toBe("standard");
  });

  it("exports/imports Phase 7 state and serializes after a multi-season playtest", () => {
    const franchise = createFranchise("harbor-city", {
      seed: "phase7-roundtrip",
      gmName: "Morgan Vale",
      gmBackground: "Scout at Heart",
      difficulty: "demanding",
      storyFrequency: "dramatic",
      startPreset: "prospectHeavy"
    });
    const roundtrip = importSaveFromJson(exportSaveToJson(franchise));
    const report = runDynastyPlaytest("phase7-serialize-playtest", 1, "harbor-city", { storyFrequency: "normal" });

    expect(roundtrip.gmProfile.displayName).toBe("Morgan Vale");
    expect(JSON.parse(exportSaveToJson(report.finalFranchise)).schemaVersion).toBe(7);
  });

  it("five-season standard/normal playtest has zero fatal invariant errors and Assistant GM recommendations", () => {
    const report = runDynastyPlaytest("phase7-standard-normal", 5, "harbor-city", { difficulty: "standard", storyFrequency: "normal" });

    expect(report.errors).toEqual([]);
    expect(report.livingOps.assistantGmRecommendationsGenerated).toBeGreaterThan(0);
    expect(finiteLivingOps(report)).toBe(true);
  });

  it("hardcore dramatic produces more pressure or events than relaxed quiet", () => {
    const relaxed = runDynastyPlaytest("phase7-relaxed-quiet", 3, "harbor-city", { difficulty: "relaxed", storyFrequency: "quiet" });
    const hardcore = runDynastyPlaytest("phase7-hardcore-dramatic", 3, "harbor-city", { difficulty: "hardcore", storyFrequency: "dramatic" });
    const relaxedPressure = average(relaxed.livingOps.mediaPressureTrend.map((item) => item.value));
    const hardcorePressure = average(hardcore.livingOps.mediaPressureTrend.map((item) => item.value));

    expect(hardcore.livingOps.eventsGenerated).toBeGreaterThanOrEqual(relaxed.livingOps.eventsGenerated);
    expect(hardcorePressure).toBeGreaterThanOrEqual(relaxedPressure);
    expect(relaxed.errors).toEqual([]);
    expect(hardcore.errors).toEqual([]);
  });

  it("existing Phase 6 living-ops invariants still pass", () => {
    const report = runDynastyPlaytest("phase6-five-season", 5);

    expect(report.errors).toEqual([]);
    expect(report.livingOps.eventsGenerated).toBeGreaterThan(0);
  });
});

function selectedTeam(franchise: FranchiseState): Team {
  return franchise.league.teams.find((team) => team.id === franchise.selectedTeamId)!;
}

function topPlayer(team: Team): Player {
  return [...team.roster].sort((a, b) => b.overall - a.overall)[0];
}

function withSelectedTeam(franchise: FranchiseState, update: (team: Team) => Team): FranchiseState {
  return {
    ...franchise,
    league: {
      ...franchise.league,
      teams: franchise.league.teams.map((team) => (team.id === franchise.selectedTeamId ? update(team) : team))
    }
  };
}

function withTopPlayer(franchise: FranchiseState, update: (player: Player) => Player): FranchiseState {
  const playerId = topPlayer(selectedTeam(franchise)).id;
  return withSelectedTeam(franchise, (team) => ({
    ...team,
    roster: team.roster.map((player) => (player.id === playerId ? update(player) : player))
  }));
}

function withMediaPressure(franchise: FranchiseState, pressure: number): FranchiseState {
  return {
    ...franchise,
    mediaState: { ...franchise.mediaState, pressure },
    teamDynamics: {
      ...franchise.teamDynamics,
      [franchise.selectedTeamId]: { ...franchise.teamDynamics[franchise.selectedTeamId], mediaPressure: pressure }
    }
  };
}

function resolveFirstOption(franchise: FranchiseState): FranchiseState {
  const event = franchise.decisionEvents.find((candidate) => candidate.status === "active")!;
  return resolveDecisionEvent(franchise, event.id, event.options[0].id, new SeededRng(`resolve-${event.id}`));
}

function sampleEventChecks(franchise: FranchiseState): number {
  const rng = new SeededRng("phase7-cadence-sample");
  let count = 0;
  for (let index = 0; index < 100; index += 1) {
    if (shouldGenerateDecisionEvent(franchise, `trigger-${index}`, rng)) count += 1;
  }
  return count;
}

function categoryCounts(templates: NarrativeTemplate[]) {
  return templates.reduce<Record<string, number>>((counts, template) => {
    counts[template.category] = (counts[template.category] ?? 0) + 1;
    return counts;
  }, {});
}

function makeInvalidRoster(franchise: FranchiseState): FranchiseState {
  return withSelectedTeam(franchise, (team) => ({
    ...team,
    roster: team.roster.map((player) => (player.position === "G" ? { ...player, injuryStatus: "out" as const, injuryGamesRemaining: 3 } : player))
  }));
}

function addHighDecision(franchise: FranchiseState): FranchiseState {
  const event: DecisionEvent = {
    id: "phase7-high-decision",
    type: "pressConference",
    status: "active",
    severity: "high",
    createdDate: franchise.league.currentDate,
    teamId: franchise.selectedTeamId,
    headline: "High pressure question",
    body: "The room needs an answer.",
    sourceLabel: "Press Room",
    locationRoom: "press",
    options: [{ id: "answer", label: "Answer", tone: "transparent", description: "Answer it.", preview: "Media -4" }],
    tags: ["press"]
  };
  return mergeDecisionEvents(franchise, [event]);
}

function finiteLivingOps(report: ReturnType<typeof runDynastyPlaytest>) {
  const values = [
    report.livingOps.eventsGenerated,
    report.livingOps.highSeverityEvents,
    report.livingOps.assistantGmRecommendationsGenerated,
    report.livingOps.urgentActionsGenerated,
    report.livingOps.contractAcceptanceRate,
    report.livingOps.ownerGoalCompletionRate,
    ...report.livingOps.ownerTrustTrend.map((item) => item.value),
    ...report.livingOps.teamChemistryTrend.map((item) => item.value),
    ...report.livingOps.mediaPressureTrend.map((item) => item.value),
    ...report.livingOps.fanSentimentTrend.map((item) => item.value),
    ...report.livingOps.capPressureTrend.map((item) => item.value)
  ];
  return values.every((value) => Number.isFinite(value) && !Number.isNaN(value));
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}
