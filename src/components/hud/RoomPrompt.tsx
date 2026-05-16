import { DEFAULT_FACILITY_BLUEPRINT } from "../../game/facility/facilityBlueprint";
import { getRoomDefinition } from "../../game/facility/facilityNavigation";
import { getBreadcrumbForRoom, getNearestRoomLabel, getRoomEntrancePrompt, getWayfindingLabel } from "../../game/facility/facilityWayfinding";
import type { RoomId } from "../../game/types";
import { useUiStore } from "../../store/uiStore";

export function roomLabel(room?: RoomId): string {
  return room ? getRoomDefinition(DEFAULT_FACILITY_BLUEPRINT, room).label : "";
}

export function RoomPrompt({ room }: { room?: RoomId }) {
  const facilityPosition = useUiStore((state) => state.facilityPosition);
  const roomDefinition = room ? getRoomDefinition(DEFAULT_FACILITY_BLUEPRINT, room) : undefined;

  if (!roomDefinition) {
    return (
      <div className="room-prompt room-prompt--quiet">
        <strong>{getWayfindingLabel(DEFAULT_FACILITY_BLUEPRINT, facilityPosition)}</strong>
        <span>Nearest room: {getNearestRoomLabel(DEFAULT_FACILITY_BLUEPRINT, facilityPosition)}.</span>
      </div>
    );
  }

  return (
    <div className="room-prompt">
      <span className="room-prompt__key">E</span>
      <div className="room-prompt__body">
        <strong>{getRoomEntrancePrompt(roomDefinition)}</strong>
        <span>{getBreadcrumbForRoom(DEFAULT_FACILITY_BLUEPRINT, roomDefinition.roomId).join(" -> ")}</span>
      </div>
    </div>
  );
}
