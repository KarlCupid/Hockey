import type { RoomId } from "../../game/types";
import { useUiStore } from "../../store/uiStore";
import { roomLabel } from "./RoomPrompt";

const ROOMS: Array<{ id: RoomId; x: number; y: number; note: string }> = [
  { id: "gm", x: 19, y: 20, note: "Inbox and ownership" },
  { id: "contracts", x: 36, y: 22, note: "Cap and contracts" },
  { id: "coach", x: 50, y: 14, note: "Lines and tactics" },
  { id: "trades", x: 64, y: 22, note: "Players and picks" },
  { id: "locker", x: 81, y: 20, note: "Roster pulse" },
  { id: "medical", x: 18, y: 76, note: "Injuries and fatigue" },
  { id: "development", x: 35, y: 72, note: "Growth plans" },
  { id: "arena", x: 50, y: 84, note: "Sim and broadcast" },
  { id: "scouting", x: 65, y: 72, note: "Draft board" },
  { id: "standings", x: 82, y: 76, note: "League table" },
  { id: "saves", x: 50, y: 50, note: "Local saves" }
];

export function OperationsMap() {
  const open = useUiStore((state) => state.operationsMapOpen);
  const nearbyRoom = useUiStore((state) => state.nearbyRoom);
  const activeRoom = useUiStore((state) => state.activeRoom);
  const setActiveRoom = useUiStore((state) => state.setActiveRoom);
  const setOpen = useUiStore((state) => state.setOperationsMapOpen);

  if (!open) {
    return (
      <button className="ops-map-toggle" type="button" onClick={() => setOpen(true)}>
        Map
      </button>
    );
  }

  return (
    <aside className="ops-map">
      <header>
        <div>
          <small>Operations Map</small>
          <strong>{activeRoom ? `In ${roomLabel(activeRoom)}` : nearbyRoom ? `Near ${roomLabel(nearbyRoom)}` : "Facility Hub"}</strong>
        </div>
        <button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="Close operations map">
          X
        </button>
      </header>
      <div className="ops-map__rink" aria-hidden="true">
        <span className="ops-map__you" style={{ left: `${nearbyRoom ? ROOMS.find((room) => room.id === nearbyRoom)?.x ?? 50 : 50}%`, top: `${nearbyRoom ? ROOMS.find((room) => room.id === nearbyRoom)?.y ?? 50 : 50}%` }}>
          You
        </span>
        {ROOMS.map((room) => (
          <button
            className={room.id === nearbyRoom ? "ops-map__pin is-nearby" : "ops-map__pin"}
            key={room.id}
            type="button"
            style={{ left: `${room.x}%`, top: `${room.y}%` }}
            onClick={() => {
              setActiveRoom(room.id);
              setOpen(false);
            }}
          >
            {roomLabel(room.id)}
          </button>
        ))}
      </div>
      <div className="ops-map__directory">
        {ROOMS.map((room) => (
          <button key={room.id} type="button" onClick={() => setActiveRoom(room.id)}>
            <strong>{roomLabel(room.id)}</strong>
            <span>{room.note}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
