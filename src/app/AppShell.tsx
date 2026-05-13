import { useEffect } from "react";
import { ModalShell } from "../components/hud/ModalShell";
import { RoomPrompt, roomLabel } from "../components/hud/RoomPrompt";
import { TopBar } from "../components/hud/TopBar";
import { ArenaPanel } from "../components/rooms/ArenaPanel";
import { CoachOfficePanel } from "../components/rooms/CoachOfficePanel";
import { GMOfficePanel } from "../components/rooms/GMOfficePanel";
import { LockerRoomPanel } from "../components/rooms/LockerRoomPanel";
import { MedicalRoomPanel } from "../components/rooms/MedicalRoomPanel";
import { SaveLoadPanel } from "../components/rooms/SaveLoadPanel";
import { StandingsPanel } from "../components/rooms/StandingsPanel";
import { FacilityScene } from "../components/three/FacilityScene";
import type { RoomId } from "../game/types";
import { useUiStore } from "../store/uiStore";

export function AppShell() {
  const activeRoom = useUiStore((state) => state.activeRoom);
  const nearbyRoom = useUiStore((state) => state.nearbyRoom);
  const setActiveRoom = useUiStore((state) => state.setActiveRoom);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveRoom(undefined);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setActiveRoom]);

  return (
    <main className="app-shell">
      <FacilityScene />
      <TopBar />
      <RoomPrompt room={nearbyRoom} />
      <div className="control-hint">WASD move | mouse orbit | E enter | Esc close</div>
      {activeRoom && (
        <ModalShell title={roomLabel(activeRoom)} subtitle={subtitleFor(activeRoom)} onClose={() => setActiveRoom(undefined)}>
          {panelFor(activeRoom)}
        </ModalShell>
      )}
    </main>
  );
}

function panelFor(room: RoomId) {
  switch (room) {
    case "gm":
      return <GMOfficePanel />;
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
  }
}

function subtitleFor(room: RoomId): string {
  const subtitles: Record<RoomId, string> = {
    gm: "Inbox, calendar, owner pressure, and save desk.",
    coach: "Line combinations, goalie decisions, and tactical identity.",
    locker: "Roster pulse, player cards, morale, form, fatigue, and stats.",
    medical: "Injuries, day-to-day notes, and workload warnings.",
    arena: "Preview the matchup and choose a simulation mode.",
    standings: "League table, recent results, and season context.",
    saves: "Manual local saves, autosave, load, and delete."
  };
  return subtitles[room];
}
