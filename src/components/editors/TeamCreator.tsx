import { useMemo } from "react";
import type { CustomTeamDefinition } from "../../game/types";
import { createCustomTeamDefinition } from "../../game/systems/dataPacks";
import { detectRealWorldContent, validateTeamDefinitions } from "../../game/systems/dataPackValidation";
import { FICTIONAL_CITY_POOL } from "../../game/content/fictionalCities";
import { FICTIONAL_TEAM_NICKNAMES } from "../../game/content/teamNamePools";
import { ColorPickerField } from "./ColorPickerField";
import { CrestShapePicker } from "./CrestShapePicker";
import { JerseyPatternPicker } from "./JerseyPatternPicker";
import { TeamPreviewCard } from "./TeamPreviewCard";

export function createDefaultEditorTeam(index = 0): CustomTeamDefinition {
  const city = FICTIONAL_CITY_POOL[index % FICTIONAL_CITY_POOL.length];
  const nickname = FICTIONAL_TEAM_NICKNAMES[index % FICTIONAL_TEAM_NICKNAMES.length];
  return createCustomTeamDefinition({
    id: `${city}-${nickname}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
    city,
    nickname,
    abbreviation: `${city[0] ?? "F"}${nickname.slice(0, 2)}`.toUpperCase(),
    primaryColor: index % 2 === 0 ? "#61c9ff" : "#f4c95d",
    secondaryColor: index % 2 === 0 ? "#102033" : "#26331f",
    marketSize: index % 3 === 0 ? "Large" : index % 3 === 1 ? "Medium" : "Small",
    index
  });
}

export function validateEditorTeam(team: CustomTeamDefinition): string[] {
  return [...validateTeamDefinitions([team]), ...detectRealWorldContent(JSON.stringify(team)).map((term) => `Restricted term flagged: ${term}`)];
}

export function hasSafeGeneratedBranding(team: CustomTeamDefinition): boolean {
  return detectRealWorldContent(`${team.fullName} ${team.branding.crestInitials} ${team.branding.chant} ${team.branding.homeJersey}`).length === 0;
}

export function TeamCreator({
  team,
  onChange
}: {
  team: CustomTeamDefinition;
  onChange: (team: CustomTeamDefinition) => void;
}) {
  const validation = useMemo(() => validateEditorTeam(team), [team]);
  const patch = (partial: Partial<CustomTeamDefinition>) => {
    const next = { ...team, ...partial };
    next.fullName = `${next.city} ${next.nickname}`.trim();
    next.id = next.id || next.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    next.branding = {
      ...next.branding,
      crestInitials: next.abbreviation.slice(0, 4).toUpperCase()
    };
    onChange(next);
  };
  return (
    <section className="editor-panel">
      <TeamPreviewCard team={team} />
      <div className="editor-grid">
        <label className="field-label">
          City
          <input value={team.city} onChange={(event) => patch({ city: event.target.value })} maxLength={40} />
        </label>
        <label className="field-label">
          Nickname
          <input value={team.nickname} onChange={(event) => patch({ nickname: event.target.value })} maxLength={32} />
        </label>
        <label className="field-label">
          Abbreviation
          <input value={team.abbreviation} onChange={(event) => patch({ abbreviation: event.target.value.toUpperCase().slice(0, 4) })} maxLength={4} />
        </label>
        <label className="field-label">
          Arena
          <input value={team.arenaName} onChange={(event) => patch({ arenaName: event.target.value })} maxLength={60} />
        </label>
        <label className="field-label">
          Affiliate
          <input value={team.affiliateName} onChange={(event) => patch({ affiliateName: event.target.value })} maxLength={60} />
        </label>
        <label className="field-label">
          Market
          <select value={team.marketSize} onChange={(event) => patch({ marketSize: event.target.value as CustomTeamDefinition["marketSize"] })}>
            <option>Small</option>
            <option>Medium</option>
            <option>Large</option>
          </select>
        </label>
        <ColorPickerField label="Primary" value={team.primaryColor} onChange={(primaryColor) => patch({ primaryColor })} />
        <ColorPickerField label="Secondary" value={team.secondaryColor} onChange={(secondaryColor) => patch({ secondaryColor })} />
        <ColorPickerField label="Accent" value={team.accentColor} onChange={(accentColor) => patch({ accentColor })} />
      </div>
      <h4>Crest</h4>
      <CrestShapePicker value={team.branding.crestShape} onChange={(crestShape) => patch({ branding: { ...team.branding, crestShape } })} />
      <h4>Jersey Pattern</h4>
      <JerseyPatternPicker value={team.branding.jerseyPattern} onChange={(jerseyPattern) => patch({ branding: { ...team.branding, jerseyPattern } })} />
      <div className="validation-pill-list">
        {validation.length ? validation.slice(0, 5).map((message) => <span key={message} className="validation-pill validation-pill--warning">{message}</span>) : <span className="validation-pill validation-pill--ok">Team validates</span>}
      </div>
    </section>
  );
}
