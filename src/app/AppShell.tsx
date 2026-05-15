import { lazy, Suspense, useEffect } from "react";
import { useState } from "react";
import { getContrastClass, getUiScaleClass, shortcutRoomForKey } from "../game/systems/accessibility";
import { getRecommendedDisplayMode } from "../game/systems/displayModes";
import { AudioController } from "../components/hud/AudioController";
import { ContextualHint } from "../components/hud/ContextualHint";
import { ErrorBoundary } from "../components/hud/ErrorBoundary";
import { HelpOverlay } from "../components/hud/HelpOverlay";
import { LoadingPanel } from "../components/hud/LoadingPanel";
import { ModalShell } from "../components/hud/ModalShell";
import { FirstDayChecklist } from "../components/hud/FirstDayChecklist";
import { OperationsMap } from "../components/hud/OperationsMap";
import { RoomPrompt, roomLabel } from "../components/hud/RoomPrompt";
import { TutorialOverlay } from "../components/hud/TutorialOverlay";
import { TopBar } from "../components/hud/TopBar";
import type { RoomId } from "../game/types";
import { useFranchiseStore } from "../store/franchiseStore";
import { useSettingsStore } from "../store/settingsStore";
import { useUiStore } from "../store/uiStore";

const FacilityScene = lazy(() => import("../components/three/FacilityScene").then((module) => ({ default: module.FacilityScene })));
const AgentDeskPanel = lazy(() => import("../components/rooms/AgentDeskPanel").then((module) => ({ default: module.AgentDeskPanel })));
const ArenaPanel = lazy(() => import("../components/rooms/ArenaPanel").then((module) => ({ default: module.ArenaPanel })));
const CoachOfficePanel = lazy(() => import("../components/rooms/CoachOfficePanel").then((module) => ({ default: module.CoachOfficePanel })));
const ContractCapOfficePanel = lazy(() => import("../components/rooms/ContractCapOfficePanel").then((module) => ({ default: module.ContractCapOfficePanel })));
const DevelopmentOfficePanel = lazy(() => import("../components/rooms/DevelopmentOfficePanel").then((module) => ({ default: module.DevelopmentOfficePanel })));
const FreeAgencyOfficePanel = lazy(() => import("../components/rooms/FreeAgencyOfficePanel").then((module) => ({ default: module.FreeAgencyOfficePanel })));
const GMOfficePanel = lazy(() => import("../components/rooms/GMOfficePanel").then((module) => ({ default: module.GMOfficePanel })));
const LockerRoomPanel = lazy(() => import("../components/rooms/LockerRoomPanel").then((module) => ({ default: module.LockerRoomPanel })));
const MedicalRoomPanel = lazy(() => import("../components/rooms/MedicalRoomPanel").then((module) => ({ default: module.MedicalRoomPanel })));
const OwnerSuitePanel = lazy(() => import("../components/rooms/OwnerSuitePanel").then((module) => ({ default: module.OwnerSuitePanel })));
const PlayerMeetingPanel = lazy(() => import("../components/rooms/PlayerMeetingPanel").then((module) => ({ default: module.PlayerMeetingPanel })));
const PressRoomPanel = lazy(() => import("../components/rooms/PressRoomPanel").then((module) => ({ default: module.PressRoomPanel })));
const RosterOfficePanel = lazy(() => import("../components/rooms/RosterOfficePanel").then((module) => ({ default: module.RosterOfficePanel })));
const SaveLoadPanel = lazy(() => import("../components/rooms/SaveLoadPanel").then((module) => ({ default: module.SaveLoadPanel })));
const ScoutingDepartmentPanel = lazy(() => import("../components/rooms/ScoutingDepartmentPanel").then((module) => ({ default: module.ScoutingDepartmentPanel })));
const StaffOfficePanel = lazy(() => import("../components/rooms/StaffOfficePanel").then((module) => ({ default: module.StaffOfficePanel })));
const StandingsPanel = lazy(() => import("../components/rooms/StandingsPanel").then((module) => ({ default: module.StandingsPanel })));
const TradeWarRoomPanel = lazy(() => import("../components/rooms/TradeWarRoomPanel").then((module) => ({ default: module.TradeWarRoomPanel })));
const SettingsPanel = lazy(() => import("../components/rooms/SettingsPanel").then((module) => ({ default: module.SettingsPanel })));
const DevToolsPanel = lazy(() => import("../components/rooms/DevToolsPanel").then((module) => ({ default: module.DevToolsPanel })));

export function AppShell() {
  const activeRoom = useUiStore((state) => state.activeRoom);
  const nearbyRoom = useUiStore((state) => state.nearbyRoom);
  const setActiveRoom = useUiStore((state) => state.setActiveRoom);
  const toggleOperationsMap = useUiStore((state) => state.toggleOperationsMap);
  const settings = useSettingsStore((state) => state.settings);
  const helpOpen = useSettingsStore((state) => state.helpOpen);
  const setHelpOpen = useSettingsStore((state) => state.setHelpOpen);
  const toggleHelp = useSettingsStore((state) => state.toggleHelp);
  const completeTutorialStep = useFranchiseStore((state) => state.completeTutorialStep);
  const recordTelemetryEvent = useFranchiseStore((state) => state.recordTelemetryEvent);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === "undefined" ? 1440 : window.innerWidth,
    height: typeof window === "undefined" ? 900 : window.innerHeight
  }));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTextInput(event.target)) return;
      if (event.key === "Escape") {
        if (helpOpen) setHelpOpen(false);
        else setActiveRoom(undefined);
      }
      if (event.key.toLowerCase() === "m") toggleOperationsMap();
      if (event.key.toLowerCase() === "h") toggleHelp();
      const shortcutRoom = settings.keyboardHints ? shortcutRoomForKey(event.key) : undefined;
      if (shortcutRoom) setActiveRoom(shortcutRoom);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [helpOpen, setActiveRoom, setHelpOpen, settings.keyboardHints, toggleHelp, toggleOperationsMap]);

  useEffect(() => {
    if (!activeRoom) return;
    recordTelemetryEvent("roomOpened", `Opened ${activeRoom}`, { roomId: activeRoom });
    completeTutorialStep(tutorialStepForRoom(activeRoom));
  }, [activeRoom, completeTutorialStep, recordTelemetryEvent]);

  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const displayMode = getRecommendedDisplayMode(viewport.width, viewport.height);

  return (
    <main
      className={`app-shell ${getUiScaleClass(settings)} ${getContrastClass(settings)} app-shell--density-${settings.tableDensity} ${settings.reduceFlashes ? "app-shell--reduce-flashes" : ""}`}
    >
      <a className="skip-link" href="#active-room-panel">Skip to active panel</a>
      <AudioController />
      {!displayMode.supported && <div className="desktop-recommended-banner">{displayMode.message}</div>}
      <ErrorBoundary fallback={<LoadingPanel label="3D facility recovered. Open a room from the map." />}>
        <Suspense fallback={<LoadingPanel label="Loading 3D operations hub..." />}>
          <FacilityScene />
        </Suspense>
      </ErrorBoundary>
      <TopBar />
      <OperationsMap />
      <FirstDayChecklist />
      <TutorialOverlay />
      <ContextualHint roomId={activeRoom ?? nearbyRoom} />
      <HelpOverlay />
      <RoomPrompt room={nearbyRoom} />
      {settings.keyboardHints && <div className="control-hint">WASD move | mouse orbit | E enter | G GM | R roster | C coach | A arena | S saves | M map | H help | Esc close</div>}
      {activeRoom && (
        <ModalShell title={roomLabel(activeRoom)} subtitle={subtitleFor(activeRoom)} onClose={() => setActiveRoom(undefined)}>
          <ErrorBoundary>
            <Suspense fallback={<LoadingPanel />}>{panelFor(activeRoom)}</Suspense>
          </ErrorBoundary>
        </ModalShell>
      )}
    </main>
  );
}

function tutorialStepForRoom(room: RoomId): string {
  const map: Partial<Record<RoomId, string>> = {
    gm: "open-gm-office",
    roster: "open-roster-office",
    coach: "open-coach-office",
    arena: "open-arena",
    saves: "open-save-desk",
    standings: "open-standings"
  };
  return map[room] ?? "move-facility";
}

function isTextInput(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
}

function panelFor(room: RoomId) {
  switch (room) {
    case "gm":
      return <GMOfficePanel />;
    case "press":
      return <PressRoomPanel />;
    case "ownerSuite":
      return <OwnerSuitePanel />;
    case "agents":
      return <AgentDeskPanel />;
    case "playerMeetings":
      return <PlayerMeetingPanel />;
    case "roster":
      return <RosterOfficePanel />;
    case "coach":
      return <CoachOfficePanel />;
    case "locker":
      return <LockerRoomPanel />;
    case "medical":
      return <MedicalRoomPanel />;
    case "arena":
      return <ArenaPanel />;
    case "standings":
      return <StandingsPanel />;
    case "saves":
      return <SaveLoadPanel />;
    case "contracts":
      return <ContractCapOfficePanel />;
    case "trades":
      return <TradeWarRoomPanel />;
    case "scouting":
      return <ScoutingDepartmentPanel />;
    case "development":
      return <DevelopmentOfficePanel />;
    case "freeAgency":
      return <FreeAgencyOfficePanel />;
    case "staff":
      return <StaffOfficePanel />;
    case "draft":
      return <ScoutingDepartmentPanel />;
    case "settings":
      return <SettingsPanel />;
    case "devTools":
      return import.meta.env.DEV ? <DevToolsPanel /> : <GMOfficePanel />;
  }
}

function subtitleFor(room: RoomId): string {
  const subtitles: Record<RoomId, string> = {
    gm: "Inbox, calendar, owner pressure, and save desk.",
    press: "Press conferences, media pressure, fan pulse, and public answers.",
    ownerSuite: "Owner trust, job security, goals, and private meetings.",
    agents: "Agent relationships, public pressure, clients, and negotiation tone.",
    playerMeetings: "Player conversations, team meetings, trust, roles, and chemistry.",
    roster: "Active roster, scratches, affiliate depth, injured reserve, and roster moves.",
    coach: "Line combinations, goalie decisions, and tactical identity.",
    locker: "Roster pulse, player cards, morale, form, fatigue, and stats.",
    medical: "Injuries, day-to-day notes, and workload warnings.",
    arena: "Preview the matchup and choose a simulation mode.",
    standings: "League table, recent results, and season context.",
    saves: "Manual local saves, autosave, load, and delete.",
    contracts: "Salary cap, contracts, expiry pressure, and pick inventory.",
    trades: "Build trade packages with players, picks, needs, cap math, and AI evaluation.",
    scouting: "Draft board, scouting assignments, prospect certainty, and watchlist.",
    development: "Development plans, progress notes, workload risk, and player growth.",
    freeAgency: "Open-market signings, rumors, cap fit, and advance controls.",
    staff: "Hire and replace staff whose ratings slightly shape hockey operations.",
    draft: "Draft stage, owned picks, available prospects, and pipeline rights.",
    settings: "Accessibility, presentation, controls, and guide reset.",
    devTools: "Development-only invariant, playtest, and balance reports."
  };
  return subtitles[room];
}
