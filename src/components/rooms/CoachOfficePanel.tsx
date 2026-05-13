import { computeLineChemistry, validateLineup } from "../../game/systems/lineupValidation";
import { describeTactic, TACTIC_LABELS, type TacticKey } from "../../game/systems/tactics";
import type { Player, Position } from "../../game/types";
import { selectedTeam, useFranchiseStore } from "../../store/franchiseStore";

export function CoachOfficePanel() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const autoFillLineup = useFranchiseStore((state) => state.autoFillLineup);
  const setLineupSlot = useFranchiseStore((state) => state.setLineupSlot);
  const setTactic = useFranchiseStore((state) => state.setTactic);
  if (!franchise) return null;
  const team = selectedTeam(franchise);
  const validation = validateLineup(team);
  const assigned = new Set([
    ...team.lines.forwardLines.flatMap((line) => [line.lw, line.c, line.rw]),
    ...team.lines.defensePairs.flatMap((pair) => [pair.ld, pair.rd]),
    team.lines.goalies.starter,
    team.lines.goalies.backup
  ]);

  return (
    <div className="room-stack">
      <section className="command-strip">
        <div>
          <small>Lineup Status</small>
          <strong>{validation.valid ? "Playable" : "Needs attention"}</strong>
        </div>
        <div>
          <small>Warnings</small>
          <strong>{validation.warnings.length}</strong>
        </div>
        <button type="button" onClick={autoFillLineup}>
          Auto Fill Best Lineup
        </button>
      </section>

      <div className="room-grid room-grid--two">
        <section className="panel-section">
          <h3>Forward Lines</h3>
          {team.lines.forwardLines.map((line, index) => (
            <div className="line-editor" key={`f-${index}`}>
              <header>
                <strong>Line {index + 1}</strong>
                <span>Chemistry {computeLineChemistry(team, [line.lw, line.c, line.rw], 4)}</span>
              </header>
              <PlayerSelect label="LW" position="LW" value={line.lw} players={team.roster} assigned={assigned} onChange={(id) => setLineupSlot(`forwardLines.${index}.lw`, id)} />
              <PlayerSelect label="C" position="C" value={line.c} players={team.roster} assigned={assigned} onChange={(id) => setLineupSlot(`forwardLines.${index}.c`, id)} />
              <PlayerSelect label="RW" position="RW" value={line.rw} players={team.roster} assigned={assigned} onChange={(id) => setLineupSlot(`forwardLines.${index}.rw`, id)} />
            </div>
          ))}
          <h3>Defense Pairs</h3>
          {team.lines.defensePairs.map((pair, index) => (
            <div className="line-editor line-editor--pair" key={`d-${index}`}>
              <header>
                <strong>Pair {index + 1}</strong>
                <span>Chemistry {computeLineChemistry(team, [pair.ld, pair.rd], 3)}</span>
              </header>
              <PlayerSelect label="LD" position="LD" value={pair.ld} players={team.roster} assigned={assigned} onChange={(id) => setLineupSlot(`defensePairs.${index}.ld`, id)} />
              <PlayerSelect label="RD" position="RD" value={pair.rd} players={team.roster} assigned={assigned} onChange={(id) => setLineupSlot(`defensePairs.${index}.rd`, id)} />
            </div>
          ))}
          <h3>Goalies</h3>
          <div className="line-editor line-editor--pair">
            <PlayerSelect label="Starter" position="G" value={team.lines.goalies.starter} players={team.roster} assigned={assigned} onChange={(id) => setLineupSlot("goalies.0.starter", id)} />
            <PlayerSelect label="Backup" position="G" value={team.lines.goalies.backup} players={team.roster} assigned={assigned} onChange={(id) => setLineupSlot("goalies.0.backup", id)} />
          </div>
        </section>

        <section className="panel-section">
          <h3>Tactics</h3>
          {(Object.keys(team.tactics) as TacticKey[]).map((key) => (
            <label className="slider-row" key={key}>
              <span>
                <strong>{TACTIC_LABELS[key]}</strong>
                <small>{describeTactic(key, team.tactics[key])}</small>
              </span>
              <input type="range" min="0" max="100" value={team.tactics[key]} onChange={(event) => setTactic(key, Number(event.target.value))} />
              <b>{team.tactics[key]}</b>
            </label>
          ))}
          <h3>Validation</h3>
          {validation.errors.length === 0 && validation.warnings.length === 0 && <p className="empty-state">Lines are valid. The staff can live with this board.</p>}
          {[...validation.errors, ...validation.warnings].map((message) => (
            <p className={validation.errors.includes(message) ? "error-text" : "warning-text"} key={message}>
              {message}
            </p>
          ))}
        </section>
      </div>
    </div>
  );
}

function PlayerSelect({
  label,
  position,
  value,
  players,
  assigned,
  onChange
}: {
  label: string;
  position: Position;
  value?: string;
  players: Player[];
  assigned: Set<string | undefined>;
  onChange: (id: string) => void;
}) {
  const options = players.filter((player) => player.position === position || (["LW", "RW"].includes(position) && ["LW", "RW"].includes(player.position)));
  return (
    <label className="select-field">
      <span>{label}</span>
      <select value={value ?? ""} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select player</option>
        {options.map((player) => (
          <option key={player.id} value={player.id} disabled={(assigned.has(player.id) && player.id !== value) || player.injuryStatus !== "healthy"}>
            {player.displayName} | {player.position} | {player.overall} OVR {player.injuryStatus !== "healthy" ? "| injured" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
