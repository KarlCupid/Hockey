import { createPortraitDescriptor } from "../../game/assets/portraitRegistry";
import { getTeamBranding } from "../../game/assets/teamBranding";
import type { Player } from "../../game/types";

export function PlayerPortrait({ player, teamId = player.teamId, compact = false }: { player: Player; teamId?: string; compact?: boolean }) {
  const brand = getTeamBranding(teamId);
  const portrait = createPortraitDescriptor(player);
  return (
    <div
      className={`player-portrait player-portrait--${portrait.role} player-portrait--${portrait.ageBand} ${compact ? "player-portrait--compact" : ""}`}
      data-portrait-key={portrait.key}
      style={{ "--portrait-primary": brand.primaryColor, "--portrait-secondary": brand.secondaryColor, "--portrait-accent": brand.accentColor } as React.CSSProperties}
      aria-label={`${player.displayName} fictional portrait`}
    >
      <span className={`player-portrait__head player-portrait__head--${portrait.faceShape}`} />
      <span className={`player-portrait__hair player-portrait__hair--${portrait.hair}`} />
      <span className={`player-portrait__expression player-portrait__expression--${portrait.expression}`} />
      <b>{player.position}</b>
    </div>
  );
}
