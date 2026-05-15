import { useSettingsStore } from "../../store/settingsStore";
import { useFranchiseStore } from "../../store/franchiseStore";
import { useUiStore } from "../../store/uiStore";
import { Button } from "../ui/Button";
import { SectionHeader } from "../ui/SectionHeader";

export function SettingsPanel() {
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const resetGuides = useSettingsStore((state) => state.resetGuides);
  const setHelpOpen = useSettingsStore((state) => state.setHelpOpen);
  const resetChecklist = useUiStore((state) => state.resetChecklist);
  const resetLivingOpsState = useFranchiseStore((state) => state.resetLivingOpsState);

  const resetAllGuides = () => {
    resetGuides();
    resetChecklist();
  };

  return (
    <div className="room-stack">
      <section className="panel-section">
        <SectionHeader title="Settings" eyebrow="Presentation and accessibility" actions={<Button onClick={() => setHelpOpen(true)}>Open Help</Button>} />
        <div className="settings-grid">
          <Toggle label="Reduce motion" checked={settings.reduceMotion} onChange={(value) => updateSettings({ reduceMotion: value })} />
          <Toggle label="Reduced 3D detail" checked={settings.reduced3DDetail} onChange={(value) => updateSettings({ reduced3DDetail: value })} />
          <Toggle label="Disable broadcast flashes" checked={settings.reduceMotion} onChange={(value) => updateSettings({ reduceMotion: value })} />
          <Toggle label="Auto-save after games" checked={settings.autoSave} onChange={(value) => updateSettings({ autoSave: value })} />
          <Toggle label="Auto-repair AI rosters during sim" checked={settings.autoRepairAiRosters} onChange={(value) => updateSettings({ autoRepairAiRosters: value })} />
          <Toggle label="Offer user roster auto-fix at season start" checked={settings.autoFixUserRosterOnSeasonStart} onChange={(value) => updateSettings({ autoFixUserRosterOnSeasonStart: value })} />
          <Toggle label="Enable story events" checked={settings.storyEventsEnabled} onChange={(value) => updateSettings({ storyEventsEnabled: value })} />
          <Toggle label="Auto-resolve low severity events" checked={settings.autoResolveLowSeverityEvents} onChange={(value) => updateSettings({ autoResolveLowSeverityEvents: value })} />
          <Toggle label="Hide consequence previews" checked={settings.hideConsequencePreviews} onChange={(value) => updateSettings({ hideConsequencePreviews: value })} />
          <Toggle label="Confirm phase advances" checked={settings.confirmPhaseAdvances} onChange={(value) => updateSettings({ confirmPhaseAdvances: value })} />
          <Toggle label="Sound placeholder" checked={settings.soundPlaceholder} onChange={(value) => updateSettings({ soundPlaceholder: value })} />
          <label className="select-field">
            <span>Broadcast speed default</span>
            <select value={settings.broadcastSpeedDefault} onChange={(event) => updateSettings({ broadcastSpeedDefault: event.target.value as typeof settings.broadcastSpeedDefault })}>
              <option value="slow">Slow</option>
              <option value="normal">Normal</option>
              <option value="fast">Fast</option>
            </select>
          </label>
          <label className="select-field">
            <span>Decision event frequency</span>
            <select value={settings.decisionEventFrequency} onChange={(event) => updateSettings({ decisionEventFrequency: event.target.value as typeof settings.decisionEventFrequency })}>
              <option value="Low">Low</option>
              <option value="Normal">Normal</option>
              <option value="High">High</option>
            </select>
          </label>
          <label className="select-field">
            <span>Press conference frequency</span>
            <select value={settings.pressConferenceFrequency} onChange={(event) => updateSettings({ pressConferenceFrequency: event.target.value as typeof settings.pressConferenceFrequency })}>
              <option value="Key games only">Key games only</option>
              <option value="Normal">Normal</option>
              <option value="Frequent">Frequent</option>
            </select>
          </label>
          <label className="select-field">
            <span>UI scale</span>
            <select value={settings.uiScale} onChange={(event) => updateSettings({ uiScale: event.target.value as typeof settings.uiScale })}>
              <option value="compact">Compact</option>
              <option value="normal">Normal</option>
              <option value="spacious">Spacious</option>
            </select>
          </label>
          <label className="select-field">
            <span>Table density</span>
            <select value={settings.tableDensity} onChange={(event) => updateSettings({ tableDensity: event.target.value as typeof settings.tableDensity })}>
              <option value="compact">Compact</option>
              <option value="normal">Normal</option>
            </select>
          </label>
        </div>
        <div className="button-row">
          <Button tone="primary" onClick={resetAllGuides}>Reset guides</Button>
          <Button onClick={() => setHelpOpen(true)}>Controls and systems help</Button>
          <Button tone="danger" onClick={resetLivingOpsState}>Reset story and relationship state</Button>
        </div>
      </section>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="checkbox-row settings-toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}
