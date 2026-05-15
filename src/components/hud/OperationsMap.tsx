import type { RoomId } from "../../game/types";
import { getRoomBadges } from "../../game/systems/actionQueue";
import { useFranchiseStore } from "../../store/franchiseStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useUiStore } from "../../store/uiStore";
import { roomLabel } from "./RoomPrompt";

const ROOMS: Array<{ id: RoomId; x: number; y: number; note: string }> = [
  { id: "gm", x: 19, y: 20, note: "Inbox and ownership" },
  { id: "press", x: 31, y: 12, note: "Media answers" },
  { id: "ownerSuite", x: 12, y: 12, note: "Owner trust" },
  { id: "agents", x: 38, y: 34, note: "Agent calls" },
  { id: "playerMeetings", x: 74, y: 12, note: "Player meetings" },
  { id: "roster", x: 18, y: 34, note: "Roster ecosystem" },
  { id: "contracts", x: 36, y: 22, note: "Cap and contracts" },
  { id: "freeAgency", x: 27, y: 34, note: "Open market" },
  { id: "coach", x: 50, y: 14, note: "Lines and tactics" },
  { id: "trades", x: 64, y: 22, note: "Players and picks" },
  { id: "staff", x: 73, y: 34, note: "Hockey ops staff" },
  { id: "locker", x: 81, y: 20, note: "Roster pulse" },
  { id: "medical", x: 18, y: 76, note: "Injuries and fatigue" },
  { id: "development", x: 35, y: 72, note: "Growth plans" },
  { id: "arena", x: 50, y: 84, note: "Sim and broadcast" },
  { id: "draft", x: 50, y: 68, note: "Draft stage" },
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
  const franchise = useFranchiseStore((state) => state.franchise);
  const roomBadgesEnabled = useSettingsStore((state) => state.settings.showRoomBadges);
  const badges = franchise && roomBadgesEnabled ? getRoomBadges(franchise) : undefined;

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
        {ROOMS.map((room) => {
          const roomBadges = badges?.[room.id] ?? [];
          return (
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
            {roomBadges.length > 0 && <span className={`ops-map__badge ops-map__badge--${roomBadges[0].tone}`}>{roomBadges[0].count ?? roomBadges.length}</span>}
          </button>
          );
        })}
      </div>
      <div className="ops-map__directory">
        {ROOMS.map((room) => {
          const roomBadges = badges?.[room.id] ?? [];
          return (
          <button key={room.id} type="button" onClick={() => setActiveRoom(room.id)}>
            <strong>{roomLabel(room.id)}</strong>
            <span>{room.note}</span>
            {roomBadges.length > 0 && (
              <small className="ops-map__directory-badges">
                {roomBadges.slice(0, 2).map((badge) => (
                  <b key={badge.id}>{badge.label}{badge.count ? ` ${badge.count}` : ""}</b>
                ))}
              </small>
            )}
          </button>
          );
        })}
      </div>
    </aside>
  );
}
