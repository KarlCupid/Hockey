import { lazy, Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { TeamBrandCard } from "../components/branding/TeamBrandCard";
import { DataPackLibrary } from "../components/editors/DataPackLibrary";
import { LoadingPanel } from "../components/hud/LoadingPanel";
import { FICTIONAL_TEAMS } from "../game/constants";
import { getDifficultyDescription, getGameModeDescription, getStoryFrequencyDescription } from "../game/systems/difficulty";
import { getGmBackgroundDescription, getGmTraits } from "../game/systems/gmProfile";
import { getPhaseLabel } from "../game/systems/phaseGuidance";
import type { FranchiseStartPreset, GameDifficulty, GameMode, GMAvatarStyle, GMBackground, StoryFrequency } from "../game/types";
import { useFranchiseStore } from "../store/franchiseStore";

const AppShell = lazy(() => import("./AppShell").then((module) => ({ default: module.AppShell })));

export function App() {
  const franchise = useFranchiseStore((state) => state.franchise);
  const saves = useFranchiseStore((state) => state.saves);
  const loadError = useFranchiseStore((state) => state.loadError);
  const refreshSaves = useFranchiseStore((state) => state.refreshSaves);
  const loadFromSlot = useFranchiseStore((state) => state.loadFromSlot);
  const deleteSlot = useFranchiseStore((state) => state.deleteSlot);
  const startNewFranchise = useFranchiseStore((state) => state.startNewFranchise);
  const startFranchiseFromDataPack = useFranchiseStore((state) => state.startFranchiseFromDataPack);
  const [selectingTeam, setSelectingTeam] = useState(false);
  const [customLabOpen, setCustomLabOpen] = useState(false);
  const [setupStep, setSetupStep] = useState(1);
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>();
  const [gmName, setGmName] = useState("Alex Mercer");
  const [gmBackground, setGmBackground] = useState<GMBackground>("Former Coach");
  const [avatarStyle, setAvatarStyle] = useState<GMAvatarStyle>("classicSuit");
  const [gameMode, setGameMode] = useState<GameMode>("standardDynasty");
  const [difficulty, setDifficulty] = useState<GameDifficulty>("standard");
  const [storyFrequency, setStoryFrequency] = useState<StoryFrequency>("normal");
  const [startPreset, setStartPreset] = useState<FranchiseStartPreset>("balanced");

  useEffect(() => {
    void refreshSaves();
  }, [refreshSaves]);

  if (franchise) {
    return (
      <Suspense fallback={<LoadingPanel label="Opening facility..." />}>
        <AppShell />
      </Suspense>
    );
  }

  if (selectingTeam) {
    const startSetup = () => {
      if (!selectedTeamId) return;
      startNewFranchise(selectedTeamId, {
        gmName,
        gmBackground,
        avatarStyle,
        gameMode,
        difficulty,
        storyFrequency,
        startPreset
      });
    };
    return (
      <main className="start-screen start-screen--teams">
        <div className="start-screen__intro">
          <span className="brand-mark">FI</span>
          <h1>New Franchise Setup</h1>
          <p>Shape the market, the GM, and the pressure before the doors open.</p>
          <div className="setup-steps" aria-label="Setup progress">
            {["Team", "GM", "Mode", "Difficulty", "Preset"].map((label, index) => (
              <button
                key={label}
                type="button"
                className={setupStep === index + 1 ? "is-active" : selectedTeamId || index === 0 ? "" : "is-disabled"}
                onClick={() => (index === 0 || selectedTeamId) && setSetupStep(index + 1)}
              >
                {index + 1}. {label}
              </button>
            ))}
          </div>
        </div>
        {setupStep === 1 && (
          <section className="team-select-grid">
            {FICTIONAL_TEAMS.map(([id, city, nickname, _abbreviation, _primaryColor, _secondaryColor, marketSize, personality]) => (
              <TeamBrandCard
                key={id}
                teamId={id}
                name={`${city} ${nickname}`}
                meta={`${marketSize} market | ${personality}`}
                onSelect={() => {
                  setSelectedTeamId(id);
                  setSetupStep(2);
                }}
              />
            ))}
          </section>
        )}
        {setupStep === 2 && (
          <SetupPanel title="GM Profile" onBack={() => setSetupStep(1)} onNext={() => setSetupStep(3)}>
            <label className="field-label">
              GM Name
              <input value={gmName} onChange={(event) => setGmName(event.target.value)} maxLength={32} />
            </label>
            <div className="setup-option-grid">
              {GM_BACKGROUNDS.map((background) => (
                <button key={background} type="button" className={gmBackground === background ? "is-selected" : ""} onClick={() => setGmBackground(background)}>
                  <strong>{background}</strong>
                  <span>{getGmBackgroundDescription(background)}</span>
                  <small>{getGmTraits(background).map((trait) => trait.label).join(", ")}</small>
                </button>
              ))}
            </div>
            <div className="segmented-control">
              {AVATAR_STYLES.map((style) => (
                <button key={style} type="button" className={avatarStyle === style ? "is-selected" : ""} onClick={() => setAvatarStyle(style)}>
                  {AVATAR_LABELS[style]}
                </button>
              ))}
            </div>
          </SetupPanel>
        )}
        {setupStep === 3 && (
          <SetupPanel title="Game Mode" onBack={() => setSetupStep(2)} onNext={() => setSetupStep(4)}>
            <div className="setup-option-grid">
              {GAME_MODES.map((mode) => (
                <button key={mode} type="button" className={gameMode === mode ? "is-selected" : ""} onClick={() => setGameMode(mode)}>
                  <strong>{GAME_MODE_LABELS[mode]}</strong>
                  <span>{getGameModeDescription(mode)}</span>
                </button>
              ))}
            </div>
          </SetupPanel>
        )}
        {setupStep === 4 && (
          <SetupPanel title="Difficulty & Story Frequency" onBack={() => setSetupStep(3)} onNext={() => setSetupStep(5)}>
            <div className="setup-option-grid">
              {DIFFICULTIES.map((level) => (
                <button key={level} type="button" className={difficulty === level ? "is-selected" : ""} onClick={() => setDifficulty(level)}>
                  <strong>{DIFFICULTY_LABELS[level]}</strong>
                  <span>{getDifficultyDescription(level)}</span>
                </button>
              ))}
            </div>
            <div className="setup-option-grid setup-option-grid--compact">
              {STORY_FREQUENCIES.map((frequency) => (
                <button key={frequency} type="button" className={storyFrequency === frequency ? "is-selected" : ""} onClick={() => setStoryFrequency(frequency)}>
                  <strong>{STORY_LABELS[frequency]}</strong>
                  <span>{getStoryFrequencyDescription(frequency)}</span>
                </button>
              ))}
            </div>
          </SetupPanel>
        )}
        {setupStep === 5 && (
          <SetupPanel title="Opening Preset" onBack={() => setSetupStep(4)} onNext={startSetup} nextLabel="Start Franchise">
            <div className="setup-option-grid">
              {START_PRESETS.map((preset) => (
                <button key={preset.id} type="button" className={startPreset === preset.id ? "is-selected" : ""} onClick={() => setStartPreset(preset.id)}>
                  <strong>{preset.label}</strong>
                  <span>{preset.description}</span>
                </button>
              ))}
            </div>
          </SetupPanel>
        )}
      </main>
    );
  }

  if (customLabOpen) {
    return (
      <main className="start-screen start-screen--teams">
        <div className="start-screen__intro">
          <span className="brand-mark">FI</span>
          <h1>Custom League Lab</h1>
          <p>Build local fictional leagues, scenarios, teams, rosters, draft classes, and data packs.</p>
          <div className="button-row">
            <button type="button" onClick={() => setCustomLabOpen(false)}>Back</button>
          </div>
        </div>
        <DataPackLibrary onStartPack={(pack, selectedTeamId) => startFranchiseFromDataPack(pack, selectedTeamId, { gmName, gmBackground, avatarStyle, gameMode, difficulty, storyFrequency, startPreset })} />
      </main>
    );
  }

  const autosave = saves.find((save) => save.slotId === "autosave");
  const confirmDelete = (slotId: string) => {
    if (window.confirm("Delete this local save? This cannot be undone.")) void deleteSlot(slotId);
  };
  return (
    <main className="start-screen">
      <div className="start-screen__intro">
        <span className="brand-mark">FI</span>
        <h1>Franchise Ice</h1>
        <p>Walk the facility. Own the lineup board. Carry the press conference after the final horn.</p>
        <div className="button-row">
          <button type="button" onClick={() => setSelectingTeam(true)}>New Franchise</button>
          <button type="button" disabled={!autosave} onClick={() => autosave && void loadFromSlot("autosave")}>Continue</button>
          <button type="button" onClick={() => setCustomLabOpen(true)}>Custom League Lab</button>
        </div>
      </div>
      <section className="load-card">
        <h2>Load Franchise</h2>
        {loadError && <p className="error-text">{loadError}</p>}
        {saves.length ? (
          saves.map((save) => (
            <article className="save-row" key={save.slotId}>
              <div>
                <strong>{save.label}</strong>
                <span>
                  {save.teamName} | {save.record} | {getPhaseLabel(save.seasonPhase)} | {save.currentDate} | {new Date(save.lastSaved).toLocaleString()}
                </span>
              </div>
              <div className="button-row">
                <button type="button" onClick={() => void loadFromSlot(save.slotId)}>Load</button>
                <button type="button" onClick={() => confirmDelete(save.slotId)}>Delete</button>
              </div>
            </article>
          ))
        ) : (
          <p className="empty-state">No local saves yet.</p>
        )}
      </section>
    </main>
  );
}

const GM_BACKGROUNDS: GMBackground[] = [
  "Former Coach",
  "Cap Strategist",
  "Scout at Heart",
  "Player Relationship Builder",
  "Analytics Executive",
  "Old-School Hockey Ops",
  "Owner Favorite",
  "Media Savvy"
];

const AVATAR_STYLES: GMAvatarStyle[] = ["classicSuit", "teamPolo", "rinkJacket", "analyticsDesk"];
const AVATAR_LABELS: Record<GMAvatarStyle, string> = {
  classicSuit: "Classic suit",
  teamPolo: "Team polo",
  rinkJacket: "Rink jacket",
  analyticsDesk: "Analytics desk"
};

const GAME_MODES: GameMode[] = ["standardDynasty", "sandbox", "pressureCooker", "rebuildChallenge", "contenderChallenge"];
const GAME_MODE_LABELS: Record<GameMode, string> = {
  standardDynasty: "Standard Dynasty",
  sandbox: "Sandbox",
  pressureCooker: "Pressure Cooker",
  rebuildChallenge: "Rebuild Challenge",
  contenderChallenge: "Contender Challenge"
};

const DIFFICULTIES: GameDifficulty[] = ["relaxed", "standard", "demanding", "hardcore"];
const DIFFICULTY_LABELS: Record<GameDifficulty, string> = {
  relaxed: "Relaxed",
  standard: "Standard",
  demanding: "Demanding",
  hardcore: "Hardcore"
};

const STORY_FREQUENCIES: StoryFrequency[] = ["quiet", "normal", "dramatic"];
const STORY_LABELS: Record<StoryFrequency, string> = {
  quiet: "Quiet",
  normal: "Normal",
  dramatic: "Dramatic"
};

const START_PRESETS: Array<{ id: FranchiseStartPreset; label: string; description: string }> = [
  { id: "balanced", label: "Balanced start", description: "No special pressure or roster shape." },
  { id: "injuryLight", label: "Injury-light start", description: "Lower opening fatigue and fewer early health risks." },
  { id: "prospectHeavy", label: "Prospect-heavy start", description: "Slightly brighter young-player and draft-board reads." },
  { id: "capCrunched", label: "Cap-crunched start", description: "Tighter cap room and a little more owner/media pressure." },
  { id: "rebuild", label: "Rebuild start", description: "More patience for youth, with lower immediate fan warmth." },
  { id: "contender", label: "Contender start", description: "Higher expectations and a stronger win-now room." }
];

function SetupPanel({
  title,
  children,
  onBack,
  onNext,
  nextLabel = "Next"
}: {
  title: string;
  children: ReactNode;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
}) {
  return (
    <section className="setup-panel">
      <h2>{title}</h2>
      {children}
      <div className="button-row">
        <button type="button" onClick={onBack}>Back</button>
        <button type="button" onClick={onNext}>{nextLabel}</button>
      </div>
    </section>
  );
}
