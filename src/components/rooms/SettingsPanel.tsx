import { useSettingsStore } from "../../store/settingsStore";
import { useFranchiseStore } from "../../store/franchiseStore";
import { useUiStore } from "../../store/uiStore";
import { getDifficultyDescription, getDifficultyLabel, getGameModeLabel, getStoryFrequencyDescription } from "../../game/systems/difficulty";
import { getAccessibilitySettingsSummary } from "../../game/systems/accessibility";
import { getLowSpecSettingsPreset } from "../../game/systems/displayModes";
import { summarizeRuntimePerformanceSettings } from "../../game/systems/performanceBudget";
import { getInstallGuideText } from "../../game/systems/pwa";
import { summarizeRuntimeHealth } from "../../game/systems/runtimeHealth";
import { getCompatibilitySummary, getVersionSummary } from "../../game/systems/version";
import type { GameDifficulty, StoryFrequency } from "../../game/types";
import { useRuntimeHealthStore } from "../../store/runtimeHealthStore";
import { Button } from "../ui/Button";
import { SectionHeader } from "../ui/SectionHeader";

export function SettingsPanel() {
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const resetGuides = useSettingsStore((state) => state.resetGuides);
  const setHelpOpen = useSettingsStore((state) => state.setHelpOpen);
  const resetChecklist = useUiStore((state) => state.resetChecklist);
  const franchise = useFranchiseStore((state) => state.franchise);
  const runtimeHealth = useRuntimeHealthStore((state) => state.runtimeHealth);
  const clearRuntimeEvents = useRuntimeHealthStore((state) => state.clearRuntimeEvents);
  const resetLivingOpsState = useFranchiseStore((state) => state.resetLivingOpsState);
  const updateDifficultySettings = useFranchiseStore((state) => state.updateDifficultySettings);
  const resetTutorial = useFranchiseStore((state) => state.resetTutorial);

  const resetAllGuides = () => {
    resetGuides();
    resetChecklist();
  };
  const version = getVersionSummary();
  const compatibility = getCompatibilitySummary();
  const performanceSummary = summarizeRuntimePerformanceSettings(settings);

  return (
    <div className="room-stack">
      <section className="panel-section">
        <SectionHeader title="Settings" eyebrow="Presentation and accessibility" actions={<Button onClick={() => setHelpOpen(true)}>Open Help</Button>} />
        <div className="settings-grid">
          <Toggle label="Reduce motion" checked={settings.reduceMotion} onChange={(value) => updateSettings({ reduceMotion: value })} />
          <Toggle label="Reduce flashes" checked={settings.reduceFlashes} onChange={(value) => updateSettings({ reduceFlashes: value })} />
          <Toggle label="Reduced 3D detail" checked={settings.reduced3DDetail} onChange={(value) => updateSettings({ reduced3DDetail: value })} />
          <Toggle label="High contrast mode" checked={settings.highContrastMode} onChange={(value) => updateSettings({ highContrastMode: value })} />
          <Toggle label="Larger text" checked={settings.largerText} onChange={(value) => updateSettings({ largerText: value })} />
          <Toggle label="Show keyboard hints and room shortcuts" checked={settings.keyboardHints} onChange={(value) => updateSettings({ keyboardHints: value })} />
          <Toggle label="Show tooltips" checked={settings.showTooltips} onChange={(value) => updateSettings({ showTooltips: value })} />
          <Toggle label="Auto-save after games" checked={settings.autoSave} onChange={(value) => updateSettings({ autoSave: value })} />
          <Toggle label="Auto-repair AI rosters during sim" checked={settings.autoRepairAiRosters} onChange={(value) => updateSettings({ autoRepairAiRosters: value })} />
          <Toggle label="Offer user roster auto-fix at season start" checked={settings.autoFixUserRosterOnSeasonStart} onChange={(value) => updateSettings({ autoFixUserRosterOnSeasonStart: value })} />
          <Toggle label="Enable story events" checked={settings.storyEventsEnabled} onChange={(value) => updateSettings({ storyEventsEnabled: value })} />
          <Toggle label="Enable Assistant GM reports" checked={settings.assistantGmReportsEnabled} onChange={(value) => updateSettings({ assistantGmReportsEnabled: value })} />
          <Toggle label="Enable room badges" checked={settings.showRoomBadges} onChange={(value) => updateSettings({ showRoomBadges: value, roomBadgesEnabled: value })} />
          <Toggle label="Local telemetry for diagnostics" checked={settings.telemetryEnabledLocalOnly} onChange={(value) => updateSettings({ telemetryEnabledLocalOnly: value })} />
          <Toggle label="Enable consequence previews" checked={settings.consequencePreviewsEnabled} onChange={(value) => updateSettings({ consequencePreviewsEnabled: value, hideConsequencePreviews: !value })} />
          <Toggle label="Event cadence debug display" checked={settings.eventCadenceDebugDisplay} onChange={(value) => updateSettings({ eventCadenceDebugDisplay: value })} />
          <Toggle label="Show beta playtest checklist" checked={settings.showPlaytestChecklist} onChange={(value) => updateSettings({ showPlaytestChecklist: value })} />
          <Toggle label="Auto-resolve low severity events" checked={settings.autoResolveLowSeverityEvents} onChange={(value) => updateSettings({ autoResolveLowSeverityEvents: value })} />
          <Toggle label="Hide consequence previews" checked={settings.hideConsequencePreviews} onChange={(value) => updateSettings({ hideConsequencePreviews: value })} />
          <Toggle label="Confirm phase advances" checked={settings.confirmPhaseAdvances} onChange={(value) => updateSettings({ confirmPhaseAdvances: value })} />
          <Toggle label="Generated audio" checked={settings.audioEnabled} onChange={(value) => updateSettings({ audioEnabled: value })} />
          <label className="select-field">
            <span>Tutorial mode</span>
            <select value={settings.tutorialMode} onChange={(event) => updateSettings({ tutorialMode: event.target.value as typeof settings.tutorialMode })}>
              <option value="firstFranchise">First franchise</option>
              <option value="guided">Guided</option>
              <option value="off">Off</option>
            </select>
          </label>
          <Range label="Master volume" value={settings.masterVolume} onChange={(value) => updateSettings({ masterVolume: value })} />
          <Range label="UI volume" value={settings.uiVolume} onChange={(value) => updateSettings({ uiVolume: value })} />
          <Range label="Ambience volume" value={settings.ambienceVolume} onChange={(value) => updateSettings({ ambienceVolume: value })} />
          <Range label="Broadcast volume" value={settings.broadcastVolume} onChange={(value) => updateSettings({ broadcastVolume: value })} />
          <label className="select-field">
            <span>Broadcast speed default</span>
            <select value={settings.broadcastSpeedDefault} onChange={(event) => updateSettings({ broadcastSpeedDefault: event.target.value as typeof settings.broadcastSpeedDefault })}>
              <option value="slow">Slow</option>
              <option value="normal">Normal</option>
              <option value="fast">Fast</option>
            </select>
          </label>
          <label className="select-field">
            <span>Assistant GM help level</span>
            <select value={settings.assistantGmHelpLevel} onChange={(event) => updateSettings({ assistantGmHelpLevel: event.target.value as typeof settings.assistantGmHelpLevel })}>
              <option value="Minimal">Minimal</option>
              <option value="Normal">Normal</option>
              <option value="Detailed">Detailed</option>
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
        <div className="settings-subpanel">
          <h3>Version And Install</h3>
          <p className="muted">{version.releaseLabel}</p>
          <p className="muted">{getInstallGuideText()}</p>
          <ul className="compact-list">
            <li>{compatibility.storage}</li>
            <li>{compatibility.offline}</li>
            <li>{compatibility.desktopBrowsers.join(", ")}</li>
          </ul>
        </div>
        <div className="settings-subpanel">
          <h3>Performance Preset</h3>
          <ul className="compact-list">
            {performanceSummary.notes.map((item) => <li key={item}>{item}</li>)}
            {performanceSummary.activePerformanceFlags.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <Button
            onClick={() => {
              const preset = getLowSpecSettingsPreset();
              updateSettings(preset);
            }}
          >
            Apply low-spec preset
          </Button>
        </div>
        <div className="settings-subpanel">
          <h3>Runtime Health</h3>
          <p className="muted">{summarizeRuntimeHealth(runtimeHealth)}</p>
          <Button onClick={clearRuntimeEvents}>Clear local runtime log</Button>
        </div>
        <div className="settings-subpanel">
          <h3>Accessibility Summary</h3>
          <ul className="compact-list">
            {getAccessibilitySettingsSummary(settings).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        {franchise && (
          <section className="settings-subpanel">
            <h3>Franchise Difficulty</h3>
            <p className="muted">
              {getGameModeLabel(franchise.gmProfile.gameMode)} | {getDifficultyLabel(franchise.gmProfile.difficulty)} | {franchise.gmProfile.storyFrequency} stories
            </p>
            <div className="settings-grid">
              <label className="select-field">
                <span>Difficulty</span>
                <select
                  value={franchise.gmProfile.difficulty}
                  onChange={(event) => {
                    const next = event.target.value as GameDifficulty;
                    if (window.confirm(`Change franchise difficulty to ${getDifficultyLabel(next)}? ${getDifficultyDescription(next)}`)) {
                      updateDifficultySettings({ difficulty: next });
                    }
                  }}
                >
                  <option value="relaxed">Relaxed</option>
                  <option value="standard">Standard</option>
                  <option value="demanding">Demanding</option>
                  <option value="hardcore">Hardcore</option>
                </select>
              </label>
              <label className="select-field">
                <span>Story frequency</span>
                <select
                  value={franchise.gmProfile.storyFrequency}
                  onChange={(event) => updateDifficultySettings({ storyFrequency: event.target.value as StoryFrequency })}
                >
                  <option value="quiet">Quiet</option>
                  <option value="normal">Normal</option>
                  <option value="dramatic">Dramatic</option>
                </select>
              </label>
            </div>
            <p className="muted">{getDifficultyDescription(franchise.gmProfile.difficulty)}</p>
            <p className="muted">{getStoryFrequencyDescription(franchise.gmProfile.storyFrequency)}</p>
          </section>
        )}
        <div className="button-row">
          <Button tone="primary" onClick={resetAllGuides}>Reset guides</Button>
          <Button onClick={resetTutorial}>Reset tutorial</Button>
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

function Range({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="select-field">
      <span>{label}: {Math.round(value * 100)}%</span>
      <input type="range" min={0} max={1} step={0.05} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}
