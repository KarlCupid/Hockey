import type { RoomId } from "../../game/types";

const ROOM_LABELS: Record<RoomId, string> = {
  gm: "GM Office",
  coach: "Coach's Office",
  locker: "Locker Room",
  medical: "Medical Room",
  arena: "Arena Bowl",
  standings: "Standings Hall",
  saves: "Save Desk",
  contracts: "Contract & Cap Office",
  trades: "Trade War Room",
  scouting: "Scouting Department",
  development: "Development Office",
  freeAgency: "Free Agency Office",
  staff: "Staff Office",
  draft: "Draft Stage",
  settings: "Settings",
  devTools: "Dev Tools"
};

export function roomLabel(room?: RoomId): string {
  return room ? ROOM_LABELS[room] : "";
}

export function RoomPrompt({ room }: { room?: RoomId }) {
  if (!room) {
    return <div className="room-prompt room-prompt--quiet">Walk to a glowing room marker.</div>;
  }

  return (
    <div className="room-prompt">
      <span className="room-prompt__key">E</span>
      <strong>{ROOM_LABELS[room]}</strong>
      <span>You are here. Press E or click the marker to enter.</span>
    </div>
  );
}
