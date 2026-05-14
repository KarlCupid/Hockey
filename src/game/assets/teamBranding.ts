import { FICTIONAL_TEAMS } from "../constants";

export type LogoShape = "blade" | "storm" | "wolf" | "wing" | "ore" | "column" | "peak" | "shield" | "crown" | "fin" | "comet" | "coil";

export interface TeamBranding {
  teamId: string;
  logoShape: LogoShape;
  crestInitials: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  jerseyHome: string;
  jerseyAway: string;
  jerseyAlt: string;
  arenaMood: string;
  brandPersonality: string;
  chant: string;
  rivalryFlavor: string;
  broadcastLowerThirdStyle: "glass" | "steel" | "neon" | "classic";
  iceMarkingStyle: "slashes" | "rings" | "chevrons" | "stars";
}

export const TEAM_BRANDING: Record<string, TeamBranding> = {
  "harbor-city": brand("harbor-city", "blade", "#5ec8ff", "#0f2d4a", "#f5fbff", "Harbor blue with silver shoulder cuts", "White with harbor-blue sleeves", "Deep navy practice alternate", "cold harbor lights", "fast, sharp, impatient", "Blades up", "Cascadia storms make every harbor night louder", "glass", "slashes"),
  cascadia: brand("cascadia", "storm", "#61d6a8", "#123b3f", "#d9fff2", "Storm green with dark rain bands", "White with green sleeve wash", "Blackout storm-cell alternate", "rain-on-glass pressure", "relentless, restless, loud", "Bring the storm", "Harbor City's speed tests the storm wall", "neon", "rings"),
  northstar: brand("northstar", "wolf", "#a9c6ff", "#17233f", "#f5c65b", "Pale star blue with midnight yoke", "White with star-blue cuffs", "Midnight heritage alternate", "winter structure", "proud, calm, defensive", "North line holds", "Prairie patience can frustrate the pack", "classic", "stars"),
  prairie: brand("prairie", "wing", "#f4c95d", "#3d3417", "#fff3c2", "Gold with dark wing stripes", "White with prairie-gold hem", "Harvest gold alternate", "wide-open underdog warmth", "patient, homegrown, stubborn", "Rise and circle", "Northstar structure turns every point into a grind", "classic", "chevrons"),
  "iron-valley": brand("iron-valley", "ore", "#d87646", "#2d2522", "#f5c65b", "Copper with charcoal workwear bands", "White with copper cuffs", "Charcoal mine-shift alternate", "heavy rafters and metal glow", "physical, direct, blue-collar", "Down in the valley", "Metro star power hates the heavy shift", "steel", "slashes"),
  metro: brand("metro", "column", "#c178ff", "#231630", "#f5fbff", "Violet with bright city columns", "White with violet sash", "Night-market purple alternate", "spotlight pressure", "star-driven, glossy, demanding", "Titan line", "Iron Valley turns glamour into board battles", "neon", "chevrons"),
  summit: brand("summit", "peak", "#7ee0f5", "#233244", "#ffffff", "Ice blue with mountain peak striping", "White with alpine blue shoulders", "Slate trail alternate", "thin-air speed", "clever, quick, developmental", "Climb together", "Atlantic discipline tests the climb", "glass", "rings"),
  atlantic: brand("atlantic", "shield", "#67b7ff", "#102a38", "#d7e8ff", "Guardian blue with shield panels", "White with ocean-blue chest stripe", "Deep sea alternate", "steady veteran poise", "disciplined, veteran, composed", "Guard the line", "Summit youth tries to skate through the wall", "steel", "slashes"),
  lakeside: brand("lakeside", "crown", "#d7e8ff", "#253158", "#f5c65b", "Lake white with royal blue frame", "White with pale crest panels", "Royal dusk alternate", "polished and patient", "technical, composed, ambitious", "Royal waters", "Bayview flash makes the lake boil", "classic", "stars"),
  bayview: brand("bayview", "fin", "#4de3c1", "#0a3c44", "#f5fbff", "Teal with sharp fin striping", "White with teal speed marks", "Night-teal alternate", "bright, loud, dangerous", "flashy, sharp, fan-fueled", "Cut the bay", "Lakeside patience slows the flash", "neon", "slashes"),
  capital: brand("capital", "comet", "#ff7a8a", "#2e1722", "#f5c65b", "Comet rose with dark orbit bands", "White with comet-tail sleeve", "Dark orbit alternate", "press-box urgency", "high-tempo, high-pressure", "Tail fire", "Desert counterpunches when Capital overreaches", "neon", "stars"),
  desert: brand("desert", "coil", "#f2b84b", "#352310", "#fff0c2", "Sun gold with dark coil striping", "White with gold desert cuffs", "Dusk-gold alternate", "dry heat and opportunism", "scrappy, opportunistic, stubborn", "Strike first", "Capital speed leaves counter lanes", "steel", "chevrons")
};

export function getTeamBranding(teamId: string): TeamBranding {
  return TEAM_BRANDING[teamId] ?? fallbackBrand(teamId);
}

export function getAllTeamBranding(): TeamBranding[] {
  return FICTIONAL_TEAMS.map(([id]) => getTeamBranding(id));
}

export function hasCompleteFictionalBranding(): boolean {
  return FICTIONAL_TEAMS.every(([id]) => Boolean(TEAM_BRANDING[id])) && !Object.values(TEAM_BRANDING).some((brandItem) => /NHL|Maple Leafs|Canadiens|Rangers/i.test(JSON.stringify(brandItem)));
}

function brand(
  teamId: string,
  logoShape: LogoShape,
  primaryColor: string,
  secondaryColor: string,
  accentColor: string,
  jerseyHome: string,
  jerseyAway: string,
  jerseyAlt: string,
  arenaMood: string,
  brandPersonality: string,
  chant: string,
  rivalryFlavor: string,
  broadcastLowerThirdStyle: TeamBranding["broadcastLowerThirdStyle"],
  iceMarkingStyle: TeamBranding["iceMarkingStyle"]
): TeamBranding {
  const team = FICTIONAL_TEAMS.find(([id]) => id === teamId);
  return {
    teamId,
    logoShape,
    crestInitials: team?.[3] ?? teamId.slice(0, 3).toUpperCase(),
    primaryColor,
    secondaryColor,
    accentColor,
    jerseyHome,
    jerseyAway,
    jerseyAlt,
    arenaMood,
    brandPersonality,
    chant,
    rivalryFlavor,
    broadcastLowerThirdStyle,
    iceMarkingStyle
  };
}

function fallbackBrand(teamId: string): TeamBranding {
  return brand(teamId, "shield", "#61c9ff", "#102033", "#f5fbff", "Home concept", "Away concept", "Alternate concept", "prototype", "fictional", "Let's go", "Rivalry TBD", "glass", "rings");
}
