import type { CustomPlayerDefinition, Handedness, PlayerArchetype, Position, RoleExpectation } from "../../game/types";

export const EDITOR_POSITIONS: Position[] = ["LW", "C", "RW", "LD", "RD", "G"];
export const EDITOR_ARCHETYPES: PlayerArchetype[] = [
  "Sniper",
  "Playmaker",
  "Two-Way Forward",
  "Power Forward",
  "Grinder",
  "Offensive Defenseman",
  "Defensive Defenseman",
  "Puck-Moving Defenseman",
  "Reflex Goalie",
  "Positional Goalie",
  "Hybrid Goalie"
];
export const EDITOR_ROLES: RoleExpectation[] = [
  "Franchise Driver",
  "Top Line",
  "Top Six",
  "Middle Six",
  "Checking Line",
  "Top Pair",
  "Second Pair",
  "Third Pair",
  "Starter",
  "Backup",
  "Depth"
];

export function PlayerEditor({
  player,
  onChange,
  onDelete
}: {
  player: CustomPlayerDefinition;
  onChange: (player: CustomPlayerDefinition) => void;
  onDelete?: () => void;
}) {
  const patch = (partial: Partial<CustomPlayerDefinition>) => {
    const next = { ...player, ...partial };
    next.displayName = `${next.firstName} ${next.lastName}`.trim();
    onChange(next);
  };
  return (
    <article className="player-editor-row">
      <input aria-label="First name" value={player.firstName} onChange={(event) => patch({ firstName: event.target.value })} maxLength={32} />
      <input aria-label="Last name" value={player.lastName} onChange={(event) => patch({ lastName: event.target.value })} maxLength={32} />
      <select value={player.position} onChange={(event) => patch({ position: event.target.value as Position })}>
        {EDITOR_POSITIONS.map((position) => <option key={position}>{position}</option>)}
      </select>
      <select value={player.handedness} onChange={(event) => patch({ handedness: event.target.value as Handedness })}>
        <option>L</option>
        <option>R</option>
      </select>
      <input aria-label="Age" type="number" value={player.age} min={17} max={45} onChange={(event) => patch({ age: Number(event.target.value) })} />
      <input aria-label="Overall" type="number" value={player.overall} min={40} max={99} onChange={(event) => patch({ overall: Number(event.target.value) })} />
      <input aria-label="Potential" type="number" value={player.potential} min={40} max={99} onChange={(event) => patch({ potential: Number(event.target.value) })} />
      <select value={player.roleExpectation} onChange={(event) => patch({ roleExpectation: event.target.value as RoleExpectation })}>
        {EDITOR_ROLES.map((role) => <option key={role}>{role}</option>)}
      </select>
      {onDelete && <button type="button" onClick={onDelete}>Delete</button>}
    </article>
  );
}
