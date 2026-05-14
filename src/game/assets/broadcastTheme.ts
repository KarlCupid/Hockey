import { getTeamBranding } from "./teamBranding";
import type { Team } from "../types";

export interface BroadcastTheme {
  homeAccent: string;
  awayAccent: string;
  lowerThirdClass: string;
  scorebugGradient: string;
  goalFlashColor: string;
}

export function createBroadcastTheme(homeTeam: Team, awayTeam: Team): BroadcastTheme {
  const home = getTeamBranding(homeTeam.id);
  const away = getTeamBranding(awayTeam.id);
  return {
    homeAccent: home.primaryColor,
    awayAccent: away.primaryColor,
    lowerThirdClass: `broadcast-${home.broadcastLowerThirdStyle}`,
    scorebugGradient: `linear-gradient(90deg, ${away.secondaryColor}, ${home.secondaryColor})`,
    goalFlashColor: home.accentColor
  };
}
