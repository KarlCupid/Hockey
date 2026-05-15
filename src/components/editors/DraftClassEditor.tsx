import { useMemo } from "react";
import type { CustomDraftClassPack, Position, Prospect } from "../../game/types";
import { generateDraftClass } from "../../game/generators/generateDraftClass";
import { validateDraftClass } from "../../game/systems/dataPackValidation";

export function createDraftClassPack(seed = "custom-draft", seasonYear = 2026, count = 72): CustomDraftClassPack {
  return {
    id: `draft-class-${seed}`,
    seasonYear,
    name: `${seasonYear} Fictional Custom Draft`,
    prospects: generateDraftClass(seed, count)
  };
}

export function validateDraftClassPack(pack: CustomDraftClassPack, teamCount = 12, rounds = 4): string[] {
  const errors = validateDraftClass(pack.prospects);
  const needed = teamCount * rounds;
  if (pack.prospects.length < needed) errors.push(`Draft class needs at least ${needed} prospects for ${rounds} rounds.`);
  return errors;
}

export function repairDuplicatePublicRanks(prospects: Prospect[]): Prospect[] {
  return [...prospects]
    .sort((a, b) => a.publicRank - b.publicRank)
    .map((prospect, index) => ({
      ...prospect,
      publicRank: index + 1,
      projectedRound: Math.max(1, Math.ceil((index + 1) / 18))
    }));
}

export function autoBalanceDraftClass(pack: CustomDraftClassPack, teamCount = 12, rounds = 4): CustomDraftClassPack {
  const needed = teamCount * rounds;
  const prospects = repairDuplicatePublicRanks(
    pack.prospects.length >= needed ? pack.prospects : [...pack.prospects, ...generateDraftClass(`${pack.id}-fill`, needed - pack.prospects.length)]
  ).map((prospect, index) => ({
    ...prospect,
    actualOverall: Math.max(45, Math.min(82, prospect.actualOverall + (index < 12 ? 2 : 0))),
    actualPotential: Math.max(prospect.actualOverall, Math.min(96, prospect.actualPotential))
  }));
  return { ...pack, prospects };
}

export function DraftClassEditor({
  pack,
  teamCount = 12,
  rounds = 4,
  onChange
}: {
  pack: CustomDraftClassPack;
  teamCount?: number;
  rounds?: number;
  onChange: (pack: CustomDraftClassPack) => void;
}) {
  const validation = useMemo(() => validateDraftClassPack(pack, teamCount, rounds), [pack, teamCount, rounds]);
  const updateProspect = (prospectId: string, patch: Partial<Prospect>) => {
    onChange({
      ...pack,
      prospects: pack.prospects.map((prospect) => (prospect.id === prospectId ? { ...prospect, ...patch } : prospect))
    });
  };
  return (
    <section className="editor-panel">
      <div className="button-row">
        <button type="button" onClick={() => onChange(createDraftClassPack(`${pack.id}-random`, pack.seasonYear, Math.max(72, teamCount * rounds * 2)))}>Randomize class</button>
        <button type="button" onClick={() => onChange(autoBalanceDraftClass(pack, teamCount, rounds))}>Auto-balance class</button>
      </div>
      <p className="muted">Minimum {teamCount * rounds} prospects for {teamCount} teams and {rounds} rounds. Recommended {teamCount * rounds * 2}.</p>
      <div className="validation-pill-list">
        {validation.length ? validation.slice(0, 5).map((message) => <span key={message} className="validation-pill validation-pill--warning">{message}</span>) : <span className="validation-pill validation-pill--ok">Draft class validates</span>}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Rank</th><th>Name</th><th>Pos</th><th>Round</th><th>OVR</th><th>POT</th><th>Risk</th></tr>
          </thead>
          <tbody>
            {pack.prospects.slice(0, 48).map((prospect) => (
              <tr key={prospect.id}>
                <td><input type="number" value={prospect.publicRank} min={1} onChange={(event) => updateProspect(prospect.id, { publicRank: Number(event.target.value) })} /></td>
                <td>{prospect.displayName}</td>
                <td>
                  <select value={prospect.position} onChange={(event) => updateProspect(prospect.id, { position: event.target.value as Position })}>
                    {["LW", "C", "RW", "LD", "RD", "G"].map((position) => <option key={position}>{position}</option>)}
                  </select>
                </td>
                <td><input type="number" value={prospect.projectedRound} min={1} max={7} onChange={(event) => updateProspect(prospect.id, { projectedRound: Number(event.target.value) })} /></td>
                <td><input type="number" value={prospect.actualOverall} min={40} max={99} onChange={(event) => updateProspect(prospect.id, { actualOverall: Number(event.target.value) })} /></td>
                <td><input type="number" value={prospect.actualPotential} min={40} max={99} onChange={(event) => updateProspect(prospect.id, { actualPotential: Number(event.target.value) })} /></td>
                <td>{prospect.risk}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
