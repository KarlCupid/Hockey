import { useMemo, useState } from "react";
import type { RoomId } from "../../game/types";
import { createDefaultFacilityBlueprint } from "../../game/facility/facilityBlueprint";
import {
  getDistrictForRoom,
  getOperationsMapGoToRoomLabel,
  getOperationsMapPinLabel,
  getNearestRoomFromPosition,
  getOperationsMapRooms,
  getRoomMapBadgePosition,
  getSuggestedRoomRoute,
  OPERATIONS_MAP_FILTERS,
  type OperationsMapFilterId
} from "../../game/facility/facilityNavigation";
import { getBreadcrumbForRoom, getCurrentDistrictFromPosition } from "../../game/facility/facilityWayfinding";
import { getRoomBadges } from "../../game/systems/actionQueue";
import { useFranchiseStore } from "../../store/franchiseStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useUiStore } from "../../store/uiStore";
import { roomLabel } from "./RoomPrompt";

export function OperationsMap() {
  const open = useUiStore((state) => state.operationsMapOpen);
  const nearbyRoom = useUiStore((state) => state.nearbyRoom);
  const activeRoom = useUiStore((state) => state.activeRoom);
  const facilityPosition = useUiStore((state) => state.facilityPosition);
  const setActiveRoom = useUiStore((state) => state.setActiveRoom);
  const setOpen = useUiStore((state) => state.setOperationsMapOpen);
  const franchise = useFranchiseStore((state) => state.franchise);
  const roomBadgesEnabled = useSettingsStore((state) => state.settings.showRoomBadges);
  const [filter, setFilter] = useState<OperationsMapFilterId>("all");
  const [query, setQuery] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<RoomId | undefined>();
  const blueprint = useMemo(() => createDefaultFacilityBlueprint(), []);
  const rooms = useMemo(() => getOperationsMapRooms(blueprint, filter, query), [blueprint, filter, query]);
  const badges = franchise && roomBadgesEnabled ? getRoomBadges(franchise) : undefined;
  const currentRoom = activeRoom ?? nearbyRoom;
  const nearestRoom = getNearestRoomFromPosition(blueprint, facilityPosition);
  const currentDistrict = currentRoom ? getDistrictForRoom(blueprint, currentRoom) : getCurrentDistrictFromPosition(blueprint, facilityPosition);
  const targetRoom = selectedRoom ?? currentRoom ?? nearestRoom?.roomId;
  const routeFrom = currentRoom ?? nearestRoom?.roomId ?? "saves";
  const routeNodes = targetRoom && routeFrom !== targetRoom ? getSuggestedRoomRoute(blueprint, routeFrom, targetRoom) : [];
  const youPosition = currentRoom ? getRoomMapBadgePosition(blueprint, currentRoom) : mapWorldToFloorplan(blueprint, facilityPosition);

  if (!open) {
    return (
      <button className="ops-map-toggle" type="button" onClick={() => setOpen(true)}>
        Map
      </button>
    );
  }

  return (
    <aside className="ops-map ops-map--v2">
      <header>
        <div>
          <small>Operations Map</small>
          <strong>{currentRoom ? `In ${roomLabel(currentRoom)}` : currentDistrict ? currentDistrict.label : "Facility Hub"}</strong>
          <span>{currentDistrict?.landmarkLabel ?? "Central Concourse"}</span>
        </div>
        <button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="Close operations map">
          X
        </button>
      </header>

      <div className="ops-map__filters" role="group" aria-label="Facility map filters">
        {OPERATIONS_MAP_FILTERS.map((item) => (
          <button key={item.id} type="button" className={filter === item.id ? "is-active" : ""} onClick={() => setFilter(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <label className="ops-map__search">
        <span>Search rooms</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Coach, cap, arena..." />
      </label>

      <div className="ops-map__floorplan" aria-label="District floorplan">
        {blueprint.districts.map((district) => (
          <div
            key={district.id}
            className={`ops-map__district ops-map__district--${district.id}`}
            style={{
              left: `${districtToMapRect(blueprint, district).left}%`,
              top: `${districtToMapRect(blueprint, district).top}%`,
              width: `${districtToMapRect(blueprint, district).width}%`,
              height: `${districtToMapRect(blueprint, district).height}%`,
              borderColor: district.colorToken
            }}
          >
            <span>{district.label}</span>
          </div>
        ))}
        {getMapPathSegments(blueprint).map((segment) => (
          <span
            key={segment.id}
            className={segment.main ? "ops-map__path ops-map__path--main" : "ops-map__path"}
            style={{
              left: `${segment.left}%`,
              top: `${segment.top}%`,
              width: `${segment.length}%`,
              transform: `translateY(-50%) rotate(${segment.angle}deg)`
            }}
          />
        ))}
        <span className="ops-map__you" style={{ left: `${youPosition.x}%`, top: `${youPosition.y}%` }}>
          You
        </span>
        {rooms.map((room) => {
          const roomBadges = badges?.[room.roomId] ?? [];
          const isCurrentRoom = room.roomId === currentRoom;
          return (
            <button
              className={isCurrentRoom ? "ops-map__pin is-nearby" : selectedRoom === room.roomId ? "ops-map__pin is-selected" : "ops-map__pin"}
              key={room.roomId}
              type="button"
              aria-label={getOperationsMapPinLabel(blueprint, room, roomBadges, isCurrentRoom)}
              title={getOperationsMapPinLabel(blueprint, room, roomBadges, isCurrentRoom)}
              style={{ left: `${room.mapPosition.x}%`, top: `${room.mapPosition.y}%`, borderColor: room.colorToken }}
              onClick={() => setSelectedRoom(room.roomId)}
              onDoubleClick={() => {
                setActiveRoom(room.roomId);
                setOpen(false);
              }}
            >
              {room.shortLabel}
              {roomBadges.length > 0 && (
                <span className={`ops-map__badge ops-map__badge--${roomBadges[0].tone}`} aria-hidden="true">
                  {roomBadges[0].count ?? roomBadges.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <section className="ops-map__route">
        <small>Current district</small>
        <strong>{currentDistrict?.label ?? "Facility Hub"}</strong>
        <span>
          {targetRoom
            ? getBreadcrumbForRoom(blueprint, targetRoom).join(" -> ")
            : "Central Concourse -> choose a room"}
        </span>
        <span>{routeNodes.length ? `Walk there: ${routeNodes.map((node) => node.label).join(" -> ")}` : "Walk there: already nearby or choose a destination."}</span>
      </section>

      <div className="ops-map__directory ops-map__directory--districts">
        {blueprint.districts.map((district) => {
          const districtRooms = rooms.filter((room) => room.districtId === district.id);
          if (!districtRooms.length) return null;
          return (
            <section key={district.id}>
              <h4>{district.label}</h4>
              {district.id === "customization" && (
                <small className="ops-map__district-note">
                  Custom League Lab starts from the title screen; use Save Desk for the local data-pack library inside a franchise.
                </small>
              )}
              {districtRooms.map((room) => {
                const roomBadges = badges?.[room.roomId] ?? [];
                return (
                  <article
                    key={room.roomId}
                    className={selectedRoom === room.roomId ? "is-active" : ""}
                  >
                    <button type="button" aria-label={`Select ${room.label} in ${district.label}`} onClick={() => setSelectedRoom(room.roomId)}>
                      <strong>{room.label}</strong>
                    </button>
                    <span>{room.description}</span>
                    <small>{room.signage} | {district.landmarkLabel}</small>
                    {roomBadges.length > 0 && (
                      <small className="ops-map__directory-badges">
                        {roomBadges.slice(0, 2).map((badge) => (
                          <b key={badge.id}>{badge.label}{badge.count ? ` ${badge.count}` : ""}</b>
                        ))}
                      </small>
                    )}
                    <button
                      type="button"
                      className="ops-map__go"
                      aria-label={getOperationsMapGoToRoomLabel(blueprint, room, roomBadges)}
                      title={getOperationsMapGoToRoomLabel(blueprint, room, roomBadges)}
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveRoom(room.roomId);
                        setOpen(false);
                      }}
                    >
                      Go to room
                    </button>
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
    </aside>
  );
}

function mapWorldToFloorplan(blueprint: ReturnType<typeof createDefaultFacilityBlueprint>, position: { x: number; z: number }): { x: number; y: number } {
  const minX = Math.min(...blueprint.districts.map((district) => district.bounds.x - district.bounds.width / 2));
  const maxX = Math.max(...blueprint.districts.map((district) => district.bounds.x + district.bounds.width / 2));
  const minZ = Math.min(...blueprint.districts.map((district) => district.bounds.z - district.bounds.depth / 2));
  const maxZ = Math.max(...blueprint.districts.map((district) => district.bounds.z + district.bounds.depth / 2));
  return {
    x: clamp(((position.x - minX) / (maxX - minX)) * 100),
    y: clamp(((position.z - minZ) / (maxZ - minZ)) * 100)
  };
}

function districtToMapRect(blueprint: ReturnType<typeof createDefaultFacilityBlueprint>, district: ReturnType<typeof createDefaultFacilityBlueprint>["districts"][number]) {
  const topLeft = mapWorldToFloorplan(blueprint, { x: district.bounds.x - district.bounds.width / 2, z: district.bounds.z - district.bounds.depth / 2 });
  const bottomRight = mapWorldToFloorplan(blueprint, { x: district.bounds.x + district.bounds.width / 2, z: district.bounds.z + district.bounds.depth / 2 });
  return {
    left: topLeft.x,
    top: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y
  };
}

function getMapPathSegments(blueprint: ReturnType<typeof createDefaultFacilityBlueprint>) {
  const byId = new Map(blueprint.pathNodes.map((node) => [node.id, node]));
  const seen = new Set<string>();
  return blueprint.pathNodes.flatMap((node) =>
    node.connectedNodeIds.flatMap((connectedId) => {
      const connected = byId.get(connectedId);
      if (!connected) return [];
      const key = [node.id, connected.id].sort().join(":");
      if (seen.has(key)) return [];
      seen.add(key);
      const from = mapWorldToFloorplan(blueprint, node.position);
      const to = mapWorldToFloorplan(blueprint, connected.position);
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      return [
        {
          id: key,
          left: from.x,
          top: from.y,
          length: Math.hypot(dx, dy),
          angle: (Math.atan2(dy, dx) * 180) / Math.PI,
          main: isMainPathSegment(blueprint, node.id, connected.id)
        }
      ];
    })
  );
}

function isMainPathSegment(blueprint: ReturnType<typeof createDefaultFacilityBlueprint>, a: string, b: string): boolean {
  return blueprint.mainCorridorNodes.some((nodeId, index) => {
    const next = blueprint.mainCorridorNodes[index + 1];
    return (nodeId === a && next === b) || (nodeId === b && next === a);
  });
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}
