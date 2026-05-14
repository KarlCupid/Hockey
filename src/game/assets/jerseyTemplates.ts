import { getTeamBranding } from "./teamBranding";

export type JerseyKind = "home" | "away" | "alt";

export interface JerseyTemplate {
  teamId: string;
  kind: JerseyKind;
  baseColor: string;
  shoulderColor: string;
  stripeColor: string;
  trimColor: string;
  pattern: "single" | "double" | "sash" | "cuff";
}

export function getJerseyTemplates(teamId: string): Record<JerseyKind, JerseyTemplate> {
  const brand = getTeamBranding(teamId);
  return {
    home: {
      teamId,
      kind: "home",
      baseColor: brand.primaryColor,
      shoulderColor: brand.secondaryColor,
      stripeColor: brand.accentColor,
      trimColor: "#f5fbff",
      pattern: "double"
    },
    away: {
      teamId,
      kind: "away",
      baseColor: "#f5fbff",
      shoulderColor: brand.primaryColor,
      stripeColor: brand.secondaryColor,
      trimColor: brand.accentColor,
      pattern: "single"
    },
    alt: {
      teamId,
      kind: "alt",
      baseColor: brand.secondaryColor,
      shoulderColor: brand.primaryColor,
      stripeColor: brand.accentColor,
      trimColor: "#f5fbff",
      pattern: "sash"
    }
  };
}
