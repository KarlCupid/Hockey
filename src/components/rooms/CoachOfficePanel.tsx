import { computeLineChemistry, validateLineup } from "../../game/systems/lineupValidation";
import { createDefensePairReport, createForwardLineReport } from "../../game/systems/lineIdentity";
import {
  createTacticSummaryCard,
  describeTactic,
  TACTIC_LABELS,
  TACTIC_PRESETS,
  tacticPresetValues,
  type TacticKey,
  type TacticPresetKey
} from "../../game/systems/tactics";
import type { Player, Position } from "../../game/types";
import { selectedTeam, useFranchiseStore } from "../../store/franchiseStore";
import { useUiStore } from "../../store/uiStore";

export function CoachOfficePanel() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const autoFillLineup = useFranchiseStore((state) => state.autoFillLineup);
  const setLineupSlot = useFranchiseStore((state) => state.setLineupSlot);
  const setTactic = useFranchiseStore((state) => state.setTactic);
  const setTactics = useFranchiseStore((state) => state.setTactics);
  const markChecklistItem = useUiStore((state) => state.markChecklistItem);
  if (!franchise) return null;
  const team = selectedTeam(franchise);
  const validation = validateLineup(team);
  const tacticSummary = createTacticSummaryCard(team.tactics);
  const assigned = new Set([
    ...team.lines.forwardLines.flatMap((line) => [line.lw, line.c, line.rw]),
    ...team.lines.defensePairs.flatMap((pair) => [pair.ld, pair.rd]),
    team.lines.goalies.starter,
    team.lines.goalies.backup
  ]);
  const applyAutoFill = () => {
    autoFillLineup();
    markChecklistItem("editLineup");
  };
  const applyLineupChange = (path: string, id: string) => {
    setLineupSlot(path, id);
    markChecklistItem("editLineup");
  };
  const applyTacticChange = (key: TacticKey, value: number) => {
    setTactic(key, value);
    markChecklistItem("adjustTactic");
  };
  const applyPreset = (key: TacticPresetKey) => {
    setTactics(tacticPresetValues(key));
    markChecklistItem("adjustTactic");
  };

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
        <button type="button" onClick={applyAutoFill}>
          Auto Fill Best Lineup
        </button>
      </section>

      <div className="room-grid room-grid--two">
        <section className="panel-section">
          <h3>Forward Lines</h3>
          {team.lines.forwardLines.map((line, index) => (
            <div className="line-editor" key={`f-${index}`}>
              <header>
                <div>
                  <strong>Line {index + 1}</strong>
                  <small>{createForwardLineReport(team, line, index).label}</small>
                </div>
                <span>Chemistry {computeLineChemistry(team, [line.lw, line.c, line.rw], 4)}</span>
              </header>
              <PlayerSelect label="LW" position="LW" value={line.lw} players={team.roster} assigned={assigned} onChange={(id) => applyLineupChange(`forwardLines.${index}.lw`, id)} />
              <PlayerSelect label="C" position="C" value={line.c} players={team.roster} assigned={assigned} onChange={(id) => applyLineupChange(`forwardLines.${index}.c`, id)} />
              <PlayerSelect label="RW" position="RW" value={line.rw} players={team.roster} assigned={assigned} onChange={(id) => applyLineupChange(`forwardLines.${index}.rw`, id)} />
              <ul className="line-notes">
                {createForwardLineReport(team, line, index).notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ))}
          <h3>Defense Pairs</h3>
          {team.lines.defensePairs.map((pair, index) => (
            <div className="line-editor line-editor--pair" key={`d-${index}`}>
              <header>
                <div>
                  <strong>Pair {index + 1}</strong>
                  <small>{createDefensePairReport(team, pair).label}</small>
                </div>
                <span>Chemistry {computeLineChemistry(team, [pair.ld, pair.rd], 3)}</span>
              </header>
              <PlayerSelect label="LD" position="LD" value={pair.ld} players={team.roster} assigned={assigned} onChange={(id) => applyLineupChange(`defensePairs.${index}.ld`, id)} />
              <PlayerSelect label="RD" position="RD" value={pair.rd} players={team.roster} assigned={assigned} onChange={(id) => applyLineupChange(`defensePairs.${index}.rd`, id)} />
              <ul className="line-notes">
                {createDefensePairReport(team, pair).notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ))}
          <h3>Goalies</h3>
          <div className="line-editor line-editor--pair">
            <PlayerSelect label="Starter" position="G" value={team.lines.goalies.starter} players={team.roster} assigned={assigned} onChange={(id) => applyLineupChange("goalies.0.starter", id)} />
            <PlayerSelect label="Backup" position="G" value={team.lines.goalies.backup} players={team.roster} assigned={assigned} onChange={(id) => applyLineupChange("goalies.0.backup", id)} />
          </div>
        </section>

        <section className="panel-section">
          <h3>Tactics</h3>
          <div className="tactic-summary-card">
            <small>Current team identity</small>
            <strong>{tacticSummary.identity}</strong>
            <p><b>Main upside:</b> {tacticSummary.upside}</p>
            <p><b>Main risk:</b> {tacticSummary.risk}</p>
            <p><b>Best suited for:</b> {tacticSummary.bestSuitedFor}</p>
          </div>
          <div className="preset-grid">
            {(Object.keys(TACTIC_PRESETS) as TacticPresetKey[]).map((key) => (
              <button key={key} type="button" onClick={() => applyPreset(key)}>
                {TACTIC_PRESETS[key].label}
              </button>
            ))}
          </div>
          {(Object.keys(team.tactics) as TacticKey[]).map((key) => (
            <label className="slider-row" key={key}>
              <span>
                <strong>{TACTIC_LABELS[key]}</strong>
                <small>{describeTactic(key, team.tactics[key])}</small>
              </span>
              <input type="range" min="0" max="100" value={team.tactics[key]} onChange={(event) => applyTacticChange(key, Number(event.target.value))} />
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
