import { useMemo } from "react";
import type { CustomPlayerDefinition, Position, RoleExpectation, TeamRosterStrategy } from "../../game/types";
import { SeededRng } from "../../game/rng";
import { generateDisplayName, generateNationality } from "../../game/generators/generateNames";
import { validatePlayerDefinitions } from "../../game/systems/dataPackValidation";
import { PlayerEditor, EDITOR_ARCHETYPES, EDITOR_ROLES } from "./PlayerEditor";

const DEPTH_TEMPLATE: Position[] = [
  "LW",
  "LW",
  "LW",
  "LW",
  "C",
  "C",
  "C",
  "C",
  "RW",
  "RW",
  "RW",
  "RW",
  "LW",
  "RW",
  "LD",
  "LD",
  "LD",
  "LD",
  "RD",
  "RD",
  "RD",
  "RD",
  "G",
  "G"
];

export function createDefaultCustomPlayer(teamId: string, index = 0, position: Position = DEPTH_TEMPLATE[index % DEPTH_TEMPLATE.length]): CustomPlayerDefinition {
  const rng = new SeededRng(`${teamId}-editor-player-${index}`);
  const name = generateDisplayName(rng);
  const overall = position === "G" ? (index % 2 === 0 ? 76 : 66) : index < 6 ? 78 : index < 14 ? 70 : 64;
  return {
    id: `${teamId}-custom-player-${index + 1}`,
    ...name,
    age: rng.int(19, 34),
    position,
    handedness: rng.chance(0.6) ? "L" : "R",
    nationality: generateNationality(rng),
    archetype: EDITOR_ARCHETYPES[index % EDITOR_ARCHETYPES.length],
    personality: index % 4 === 0 ? "Leader" : index % 3 === 0 ? "Competitive" : "Professional",
    overall,
    potential: Math.min(95, overall + rng.int(0, 9)),
    roleExpectation: inferEditorRole(position, overall),
    rosterStatus: "active",
    morale: 62,
    form: 55,
    fatigue: 24
  };
}

export function validateCustomPlayerDefinition(player: CustomPlayerDefinition): string[] {
  return validatePlayerDefinitions([player]);
}

export function ensureUniqueCustomPlayerIds(players: CustomPlayerDefinition[], teamId = "team"): CustomPlayerDefinition[] {
  const seen = new Set<string>();
  return players.map((player, index) => {
    const base = player.id || `${teamId}-custom-player-${index + 1}`;
    let id = base;
    let suffix = 2;
    while (seen.has(id)) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }
    seen.add(id);
    return { ...player, id };
  });
}

export function autoGenerateCustomRoster(teamId: string, seed = teamId, strategy: TeamRosterStrategy = "balanced"): CustomPlayerDefinition[] {
  const rng = new SeededRng(seed);
  return DEPTH_TEMPLATE.map((position, index) => {
    const player = createDefaultCustomPlayer(teamId, index, position);
    const contenderBoost = strategy === "contender" && index < 10 ? 4 : 0;
    const youthBoost = strategy === "youngCore" || strategy === "rebuild" ? 4 : 0;
    const goalieBoost = strategy === "goalieFirst" && position === "G" ? 6 : 0;
    const defenseBoost = strategy === "defenseFirst" && (position === "LD" || position === "RD") ? 4 : 0;
    const offenseBoost = strategy === "highOffense" && ["LW", "C", "RW"].includes(position) ? 3 : 0;
    const overall = Math.max(40, Math.min(99, player.overall + contenderBoost + goalieBoost + defenseBoost + offenseBoost + (strategy === "random" ? rng.int(-4, 5) : 0)));
    const age = Math.max(17, Math.min(45, player.age + (strategy === "veteranHeavy" ? 4 : youthBoost ? -3 : 0)));
    return {
      ...player,
      age,
      overall,
      potential: Math.max(overall, Math.min(99, player.potential + youthBoost))
    };
  });
}

export function autoBalanceCustomRoster(players: CustomPlayerDefinition[], teamId = "team"): CustomPlayerDefinition[] {
  const byPosition = new Map<Position, CustomPlayerDefinition[]>();
  players.forEach((player) => byPosition.set(player.position, [...(byPosition.get(player.position) ?? []), player]));
  const balanced = [...players];
  DEPTH_TEMPLATE.forEach((position, index) => {
    if ((byPosition.get(position) ?? []).length === 0) balanced.push(createDefaultCustomPlayer(teamId, players.length + index, position));
  });
  return ensureUniqueCustomPlayerIds(balanced, teamId).slice(0, 30);
}

export function validateRosterDepth(players: CustomPlayerDefinition[]): string[] {
  const errors = validatePlayerDefinitions(players);
  const forwards = players.filter((player) => ["LW", "C", "RW"].includes(player.position)).length;
  const defense = players.filter((player) => player.position === "LD" || player.position === "RD").length;
  const goalies = players.filter((player) => player.position === "G").length;
  if (forwards < 12) errors.push("Roster needs at least 12 forwards for a safe custom start.");
  if (defense < 6) errors.push("Roster needs at least 6 defense for a safe custom start.");
  if (goalies < 2) errors.push("Roster needs at least 2 goalies for a safe custom start.");
  return errors;
}

export function RosterEditor({
  teamId,
  players,
  onChange
}: {
  teamId: string;
  players: CustomPlayerDefinition[];
  onChange: (players: CustomPlayerDefinition[]) => void;
}) {
  const validation = useMemo(() => validateRosterDepth(players), [players]);
  return (
    <section className="editor-panel">
      <div className="button-row">
        <button type="button" onClick={() => onChange([...players, createDefaultCustomPlayer(teamId, players.length)])}>Add player</button>
        <button type="button" onClick={() => onChange(autoGenerateCustomRoster(teamId))}>Generate roster</button>
        <button type="button" onClick={() => onChange(autoBalanceCustomRoster(players, teamId))}>Auto-balance</button>
      </div>
      <div className="validation-pill-list">
        {validation.length ? validation.slice(0, 5).map((message) => <span key={message} className="validation-pill validation-pill--warning">{message}</span>) : <span className="validation-pill validation-pill--ok">Roster validates</span>}
      </div>
      <div className="asset-list asset-list--compact">
        {players.map((player, index) => (
          <PlayerEditor
            key={player.id}
            player={player}
            onChange={(next) => onChange(players.map((candidate) => (candidate.id === player.id ? next : candidate)))}
            onDelete={() => onChange(players.filter((_candidate, candidateIndex) => candidateIndex !== index))}
          />
        ))}
      </div>
    </section>
  );
}

function inferEditorRole(position: Position, overall: number): RoleExpectation {
  if (position === "G") return overall >= 75 ? "Starter" : "Backup";
  if (position === "LD" || position === "RD") return overall >= 80 ? "Top Pair" : overall >= 72 ? "Second Pair" : "Third Pair";
  if (overall >= 86) return "Franchise Driver";
  if (overall >= 80) return "Top Line";
  if (overall >= 72) return "Top Six";
  return "Middle Six";
}
