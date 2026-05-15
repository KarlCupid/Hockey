import type { FranchiseState, GMBackground, GMProfile, GMTrait, GMAvatarStyle, GameDifficulty, GameMode, StoryFrequency } from "../types";

export interface CreateGmProfileInput {
  displayName?: string;
  background?: GMBackground;
  avatarStyle?: GMAvatarStyle;
  difficulty?: GameDifficulty;
  gameMode?: GameMode;
  storyFrequency?: StoryFrequency;
  createdAt?: string;
}

export interface GmTraitModifierContext {
  type?: "press" | "owner" | "player" | "agent" | "contract" | "scouting" | "development" | "trade" | "story";
}

export type GmTraitModifiers = GMTrait["effects"];

const BACKGROUND_DESCRIPTIONS: Record<GMBackground, string> = {
  "Former Coach": "Reads the room well and earns a little more from team meetings and player trust.",
  "Cap Strategist": "Finds contract leverage and cap paths before the pressure reaches the owner suite.",
  "Scout at Heart": "Gets a cleaner read on draft boards, prospect reports, and hidden development value.",
  "Player Relationship Builder": "Turns honest player conversations into more durable trust.",
  "Analytics Executive": "Sees trade value, development trend lines, and risk flags with better clarity.",
  "Old-School Hockey Ops": "Carries owner-friendly credibility and a steady hand in tense rooms.",
  "Owner Favorite": "Starts with a stronger trust buffer when the season gets noisy.",
  "Media Savvy": "Handles press pressure with cleaner language and fewer headline fires."
};

const TRAITS_BY_BACKGROUND: Record<GMBackground, GMTrait[]> = {
  "Former Coach": [
    {
      id: "former-coach-room-read",
      label: "Room Read",
      description: "Team meetings and role conversations land a little cleaner.",
      effects: { playerTrustModifier: 3, developmentModifier: 1 }
    }
  ],
  "Cap Strategist": [
    {
      id: "cap-strategist-leverage",
      label: "Cap Leverage",
      description: "Contract talks and cap plans carry a small negotiation edge.",
      effects: { negotiationModifier: 3, tradeEvaluationModifier: 1 }
    }
  ],
  "Scout at Heart": [
    {
      id: "scout-at-heart-live-looks",
      label: "Live Looks",
      description: "Scouting certainty and prospect reads improve slightly.",
      effects: { scoutingModifier: 4, developmentModifier: 1 }
    }
  ],
  "Player Relationship Builder": [
    {
      id: "relationship-builder-open-door",
      label: "Open Door",
      description: "Player meetings produce stronger trust and role-satisfaction gains.",
      effects: { playerTrustModifier: 5, storyFrequencyModifier: -0.04 }
    }
  ],
  "Analytics Executive": [
    {
      id: "analytics-executive-signal",
      label: "Signal Finder",
      description: "Trade, development, and Assistant GM reads are a little sharper.",
      effects: { tradeEvaluationModifier: 3, developmentModifier: 2, scoutingModifier: 1 }
    }
  ],
  "Old-School Hockey Ops": [
    {
      id: "old-school-credibility",
      label: "Bench Credibility",
      description: "Owners and veteran rooms trust a firm hockey-ops voice.",
      effects: { ownerTrustModifier: 3, playerTrustModifier: 1 }
    }
  ],
  "Owner Favorite": [
    {
      id: "owner-favorite-buffer",
      label: "Trust Buffer",
      description: "Owner patience starts higher and pressure swings cut a little less deeply.",
      effects: { ownerTrustModifier: 6, mediaPressureModifier: -1 }
    }
  ],
  "Media Savvy": [
    {
      id: "media-savvy-clean-quote",
      label: "Clean Quote",
      description: "Press answers reduce media pressure more effectively.",
      effects: { mediaPressureModifier: -5, storyFrequencyModifier: -0.03 }
    }
  ]
};

export function getGmTraits(background: GMBackground = "Former Coach"): GMTrait[] {
  return [...(TRAITS_BY_BACKGROUND[background] ?? TRAITS_BY_BACKGROUND["Former Coach"])];
}

export function createDefaultGmProfile(): GMProfile {
  return createGmProfile({});
}

export function createGmProfile(input: CreateGmProfileInput = {}): GMProfile {
  const background = input.background ?? "Former Coach";
  const createdAt = input.createdAt ?? new Date().toISOString();
  return {
    id: `gm-${background.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${createdAt.slice(0, 10)}`,
    displayName: input.displayName?.trim() || "Alex Mercer",
    background,
    difficulty: input.difficulty ?? "standard",
    gameMode: input.gameMode ?? "standardDynasty",
    storyFrequency: input.storyFrequency ?? "normal",
    avatarStyle: input.avatarStyle ?? "classicSuit",
    traits: getGmTraits(background),
    createdAt
  };
}

export function applyGmTraitModifiers(franchise: FranchiseState, _context: GmTraitModifierContext = {}): GmTraitModifiers {
  const effects: GmTraitModifiers = {};
  for (const trait of franchise.gmProfile?.traits ?? []) {
    for (const [key, value] of Object.entries(trait.effects) as Array<[keyof GmTraitModifiers, number | undefined]>) {
      if (typeof value !== "number") continue;
      effects[key] = (effects[key] ?? 0) + value;
    }
  }
  return effects;
}

export function getGmBackgroundDescription(background: GMBackground): string {
  return BACKGROUND_DESCRIPTIONS[background] ?? BACKGROUND_DESCRIPTIONS["Former Coach"];
}

export function getGmProfileSummary(profile: GMProfile): string {
  return `${profile.displayName}, ${profile.background}. ${getGmBackgroundDescription(profile.background)}`;
}
