import type { ScenarioDefinition } from "../types";

export const SCENARIO_TEMPLATES: ScenarioDefinition[] = [
  scenario("standard-start", "Standard Start", "Open a clean fictional season with balanced pressure.", "standardStart", []),
  scenario("rebuild-on-the-clock", "Rebuild on the Clock", "Ownership is patient, but the room needs a youth plan fast.", "rebuild", [
    modifier("rebuild-morale", "Young room optimism", "morale", 4),
    modifier("rebuild-owner", "Owner patience note", "ownerTrust", 6),
    modifier("rebuild-story", "Youth plan question", "story", 1)
  ]),
  scenario("cap-crunch", "Cap Crunch", "The selected club starts with a tight ceiling and louder contract pressure.", "capCrunch", [
    modifier("cap-cut", "Lower opening cap ceiling", "capAdjustment", -5_000_000),
    modifier("cap-contracts", "Veteran contract pressure", "contracts", 1),
    modifier("cap-story", "Cap desk pressure", "story", 1)
  ]),
  scenario("prospect-pipeline", "Prospect Pipeline", "The fan base wants the future to arrive sooner.", "draftHeavy", [
    modifier("pipeline-prospects", "Prospect pool spotlight", "prospects", 3),
    modifier("pipeline-fans", "Future-focused fan patience", "fanSentiment", 5),
    modifier("pipeline-story", "Development spotlight", "story", 1)
  ]),
  scenario("veteran-last-dance", "Veteran Last Dance", "A veteran-heavy room has one more serious push in it.", "contender", [
    modifier("veteran-morale", "Veteran belief", "morale", 5),
    modifier("veteran-contracts", "Expiring veteran pressure", "contracts", 2),
    modifier("veteran-owner", "Win-now owner pressure", "ownerTrust", -4)
  ]),
  scenario("goalie-crisis", "Goalie Crisis", "The crease starts unsettled and the staff has to manage risk.", "injuryCrisis", [
    modifier("goalie-injury", "Goalie availability problem", "injury", 1, { position: "G", games: 4 }),
    modifier("goalie-morale", "Room concern", "morale", -3),
    modifier("goalie-story", "Crease controversy", "story", 1)
  ]),
  scenario("playoff-push", "Playoff Push", "The club opens under clear pressure to bank points immediately.", "playoffPush", [
    modifier("push-fans", "Fan urgency", "fanSentiment", -4),
    modifier("push-owner", "Owner urgency", "ownerTrust", -6),
    modifier("push-story", "Early standings heat", "story", 1)
  ]),
  scenario("owner-pressure-cooker", "Owner Pressure Cooker", "The owner expects fast answers and a visible plan.", "deadlinePressure", [
    modifier("owner-pressure", "Owner trust squeeze", "ownerTrust", -14),
    modifier("owner-morale", "Room tension", "morale", -4),
    modifier("owner-story", "Owner meeting seed", "story", 1)
  ]),
  scenario("injury-storm", "Injury Storm", "The trainer's room starts too busy for comfort.", "injuryCrisis", [
    modifier("injury-wave", "Opening injury wave", "injury", 4, { games: 3 }),
    modifier("injury-fans", "Fan anxiety", "fanSentiment", -5),
    modifier("injury-story", "Health concern", "story", 1)
  ]),
  scenario("draft-capital-empire", "Draft Capital Empire", "The selected club starts with a future-assets identity.", "draftHeavy", [
    modifier("draft-picks", "Extra draft-capital note", "draftPicks", 2),
    modifier("draft-prospects", "Prospect depth note", "prospects", 2),
    modifier("draft-story", "Scouting spotlight", "story", 1)
  ]),
  scenario("rivalry-revenge", "Rivalry Revenge", "A fictional rivalry has the building louder than usual.", "deadlinePressure", [
    modifier("rivalry-fans", "Rivalry heat", "fanSentiment", 3),
    modifier("rivalry-morale", "Room edge", "morale", 3),
    modifier("rivalry-story", "Rivalry story seed", "story", 1)
  ]),
  scenario("chaos-room", "Chaos Room", "Cap pressure, injury noise, and public scrutiny all arrive together.", "chaos", [
    modifier("chaos-cap", "Chaotic cap squeeze", "capAdjustment", -3_500_000),
    modifier("chaos-injury", "Opening injury noise", "injury", 2, { games: 2 }),
    modifier("chaos-owner", "Owner trust wobble", "ownerTrust", -8),
    modifier("chaos-story", "Public chaos seed", "story", 1)
  ])
];

function scenario(
  id: string,
  name: string,
  description: string,
  scenarioType: ScenarioDefinition["scenarioType"],
  modifiers: ScenarioDefinition["modifiers"]
): ScenarioDefinition {
  return {
    id,
    name,
    description,
    scenarioType,
    startPhase: "regularSeason",
    startingDayIndex: 0,
    setupNotes: [
      "All teams, players, and story beats are fictional.",
      "Scenario effects are simplified and local-only.",
      "Existing dynasty systems still drive the season after setup."
    ],
    modifiers
  };
}

function modifier(
  id: string,
  label: string,
  type: ScenarioDefinition["modifiers"][number]["type"],
  value: number,
  payload?: unknown
): ScenarioDefinition["modifiers"][number] {
  return { id, label, type, value, payload };
}
