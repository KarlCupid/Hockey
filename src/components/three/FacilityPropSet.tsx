import type { FacilityRoomDefinition } from "../../game/facility/facilityTypes";

export function FacilityPropSet({ room, reducedDetail }: { room: FacilityRoomDefinition; reducedDetail: boolean }) {
  return (
    <group position={[room.position.x, 0, room.position.z]}>
      {renderTheme(room, reducedDetail)}
    </group>
  );
}

function renderTheme(room: FacilityRoomDefinition, reducedDetail: boolean) {
  switch (room.propTheme) {
    case "gmOffice":
      return <OfficeDesk color="#1c334f" accent={room.colorToken} extra={!reducedDetail} />;
    case "contracts":
      return <OfficeDesk color="#3a3420" accent="#f5c65b" extra={!reducedDetail} bars />;
    case "staff":
      return <OfficeDesk color="#1f3a2f" accent="#76e3a5" extra={!reducedDetail} chairs />;
    case "agents":
      return <OfficeDesk color="#2b2140" accent="#b58cff" extra={!reducedDetail} ring />;
    case "ownerSuite":
      return <OwnerSuite accent={room.colorToken} reducedDetail={reducedDetail} />;
    case "coach":
      return <CoachBoard accent={room.colorToken} reducedDetail={reducedDetail} />;
    case "roster":
      return <RosterBoards accent={room.colorToken} reducedDetail={reducedDetail} />;
    case "trades":
      return <WarRoom accent={room.colorToken} reducedDetail={reducedDetail} />;
    case "freeAgency":
      return <MarketDesk accent={room.colorToken} reducedDetail={reducedDetail} />;
    case "locker":
      return <LockerProps accent={room.colorToken} reducedDetail={reducedDetail} />;
    case "medical":
      return <MedicalProps accent={room.colorToken} />;
    case "playerMeetings":
      return <MeetingTable accent={room.colorToken} reducedDetail={reducedDetail} />;
    case "arena":
      return <ArenaProps room={room} reducedDetail={reducedDetail} />;
    case "press":
      return <PressProps accent={room.colorToken} reducedDetail={reducedDetail} />;
    case "scouting":
      return <ScoutingProps accent={room.colorToken} reducedDetail={reducedDetail} />;
    case "development":
      return <DevelopmentProps accent={room.colorToken} reducedDetail={reducedDetail} />;
    case "draft":
      return <DraftProps accent={room.colorToken} reducedDetail={reducedDetail} />;
    case "standings":
      return <TrophyProps reducedDetail={reducedDetail} />;
    case "save":
      return <Kiosk accent={room.colorToken} panels={reducedDetail ? 1 : 3} />;
    case "settings":
      return <SettingsProps accent={room.colorToken} />;
    case "feedback":
      return <FeedbackProps accent={room.colorToken} />;
    case "dataPack":
      return <DataPackProps accent={room.colorToken} reducedDetail={reducedDetail} />;
    case "devTools":
      return <DevToolsProps accent={room.colorToken} reducedDetail={reducedDetail} />;
  }
}

function OfficeDesk({ color, accent, extra, bars, chairs, ring }: { color: string; accent: string; extra: boolean; bars?: boolean; chairs?: boolean; ring?: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.34, 0]}>
        <boxGeometry args={[1.55, 0.58, 0.72]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.42, 0.86, -0.18]} rotation={[-0.08, 0, 0]}>
        <boxGeometry args={[0.76, 0.5, 0.06]} />
        <meshStandardMaterial color="#dff8ff" emissive={accent} emissiveIntensity={0.22} />
      </mesh>
      {bars && [-0.28, 0, 0.28].map((x, index) => <Bar key={x} x={x} height={0.22 + index * 0.13} color={index === 1 ? "#ff7e8a" : "#76e3a5"} />)}
      {chairs && [-0.52, 0.52].map((x) => <RoundSeat key={x} x={x} z={0.52} color="#304d46" />)}
      {ring && (
        <mesh position={[-0.52, 0.78, 0.28]} rotation={[0, 0, -0.25]}>
          <torusGeometry args={[0.16, 0.04, 10, 18]} />
          <meshStandardMaterial color="#c8e9ff" emissive={accent} emissiveIntensity={0.16} />
        </mesh>
      )}
      {extra && <pointLight position={[0.42, 1.1, -0.2]} intensity={0.14} color={accent} />}
    </group>
  );
}

function OwnerSuite({ accent, reducedDetail }: { accent: string; reducedDetail: boolean }) {
  return (
    <group>
      <OfficeDesk color="#3d3417" accent={accent} extra={!reducedDetail} bars />
      <mesh position={[-0.55, 0.9, 0.3]}>
        <sphereGeometry args={[0.16, 20, 20]} />
        <meshStandardMaterial color={accent} metalness={0.45} roughness={0.28} />
      </mesh>
    </group>
  );
}

function CoachBoard({ accent, reducedDetail }: { accent: string; reducedDetail: boolean }) {
  return (
    <group>
      <Board accent={accent} width={1.8} />
      {[0, 1, 2, 3].map((index) => (
        <mesh key={index} position={[-0.48 + index * 0.32, 1.08, -0.37]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color={index % 2 ? "#d9475f" : "#1e7dd7"} />
        </mesh>
      ))}
      {!reducedDetail && <RoundSeat x={-0.65} z={0.45} color="#244f54" />}
    </group>
  );
}

function RosterBoards({ accent, reducedDetail }: { accent: string; reducedDetail: boolean }) {
  return (
    <group>
      <OfficeDesk color="#1f3a34" accent={accent} extra={!reducedDetail} />
      <Board accent={accent} width={1.55} />
      {[-0.42, 0, 0.42].map((x, index) => <Bar key={x} x={x} height={0.36 + index * 0.1} color={index === 1 ? "#f5c65b" : "#61c9ff"} />)}
    </group>
  );
}

function WarRoom({ accent, reducedDetail }: { accent: string; reducedDetail: boolean }) {
  return (
    <group>
      <OfficeDesk color="#3b2a22" accent={accent} extra={!reducedDetail} />
      <Board accent={accent} width={1.95} dark />
      {!reducedDetail && [-0.5, 0.5].map((x) => <RoundSeat key={x} x={x} z={0.52} color="#293d4f" />)}
    </group>
  );
}

function MarketDesk({ accent, reducedDetail }: { accent: string; reducedDetail: boolean }) {
  return (
    <group>
      <OfficeDesk color="#253158" accent={accent} extra={!reducedDetail} />
      {[-0.36, 0, 0.36].map((x, index) => (
        <mesh key={x} position={[x, 1.02, -0.35]}>
          <circleGeometry args={[0.11, 18]} />
          <meshStandardMaterial color={index === 1 ? "#ff7e8a" : "#61d6a8"} />
        </mesh>
      ))}
    </group>
  );
}

function LockerProps({ accent, reducedDetail }: { accent: string; reducedDetail: boolean }) {
  const count = reducedDetail ? 3 : 6;
  return (
    <group>
      {Array.from({ length: count }, (_, index) => (
        <mesh key={index} position={[index * 0.38 - (count - 1) * 0.19, 0.58, -0.28]}>
          <boxGeometry args={[0.32, 1.16, 0.28]} />
          <meshStandardMaterial color={index % 2 ? "#163b5c" : "#1e4d72"} emissive={accent} emissiveIntensity={0.04} />
        </mesh>
      ))}
      <mesh position={[0, 0.25, 0.42]}>
        <boxGeometry args={[1.6, 0.18, 0.42]} />
        <meshStandardMaterial color="#263548" />
      </mesh>
    </group>
  );
}

function MedicalProps({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[0, 0.46, 0]}>
        <boxGeometry args={[1.7, 0.22, 0.72]} />
        <meshStandardMaterial color="#dcecff" />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[1.4, 0.36, 0.5]} />
        <meshStandardMaterial color="#28445c" emissive={accent} emissiveIntensity={0.05} />
      </mesh>
      <mesh position={[0.72, 0.92, -0.18]}>
        <boxGeometry args={[0.08, 0.5, 0.08]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.24} />
      </mesh>
      <mesh position={[0.72, 0.92, -0.18]}>
        <boxGeometry args={[0.36, 0.08, 0.08]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.24} />
      </mesh>
    </group>
  );
}

function MeetingTable({ accent, reducedDetail }: { accent: string; reducedDetail: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.34, 0]}>
        <boxGeometry args={[1.65, 0.16, 0.9]} />
        <meshStandardMaterial color="#183b3e" />
      </mesh>
      {(reducedDetail ? [-0.55, 0.55] : [-0.62, -0.2, 0.2, 0.62]).map((x) => <RoundSeat key={x} x={x} z={0.62} color="#244f54" />)}
      <Board accent={accent} width={1.65} />
    </group>
  );
}

function ArenaProps({ room, reducedDetail }: { room: FacilityRoomDefinition; reducedDetail: boolean }) {
  const rinkWidth = Math.max(5.4, room.size.width - 1.45);
  const rinkDepth = Math.max(2.8, room.size.depth - 1.25);
  return (
    <group>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[rinkWidth, rinkDepth]} />
        <meshStandardMaterial color="#dff6ff" roughness={0.25} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.48, 0.52, 48]} />
        <meshStandardMaterial color="#d9475f" />
      </mesh>
      <mesh position={[0, 0.09, -rinkDepth / 2 + 0.58]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[rinkWidth - 0.7, 0.04]} />
        <meshStandardMaterial color="#1e7dd7" />
      </mesh>
      <mesh position={[0, 0.09, rinkDepth / 2 - 0.58]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[rinkWidth - 0.7, 0.04]} />
        <meshStandardMaterial color="#d9475f" />
      </mesh>
      {!reducedDetail && (
        <>
          {[-rinkWidth / 2 + 0.7, rinkWidth / 2 - 0.7].map((x) => <GoalLight key={x} x={x} />)}
          {[-room.size.depth / 2 + 0.35, room.size.depth / 2 - 0.35].map((z) => (
            <mesh key={z} position={[0, 0.46, z]}>
              <boxGeometry args={[room.size.width - 0.55, 0.54, 0.22]} />
              <meshStandardMaterial color="#20324c" emissive="#61c9ff" emissiveIntensity={0.08} transparent opacity={0.72} />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}

function PressProps({ accent, reducedDetail }: { accent: string; reducedDetail: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.48, 0.22]}>
        <boxGeometry args={[1.3, 0.95, 0.55]} />
        <meshStandardMaterial color="#253158" />
      </mesh>
      <Board accent={accent} width={2.05} />
      {[-0.28, 0, 0.28].map((x) => (
        <mesh key={x} position={[x, 0.95, 0.58]} rotation={[0.35, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.42, 10]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
      ))}
      {!reducedDetail && [-0.95, 0.95].map((x) => <pointLight key={x} position={[x, 1.7, 0.75]} intensity={0.28} color="#ffffff" />)}
    </group>
  );
}

function ScoutingProps({ accent, reducedDetail }: { accent: string; reducedDetail: boolean }) {
  return (
    <group>
      <Board accent={accent} width={1.9} />
      {[-0.55, 0, 0.55].map((x, index) => (
        <mesh key={x} position={[x, 1.08, -0.34]}>
          <sphereGeometry args={[0.07 + index * 0.015, 12, 12]} />
          <meshStandardMaterial color={index === 1 ? "#ff7e8a" : "#61c9ff"} />
        </mesh>
      ))}
      {!reducedDetail && [-0.6, 0, 0.6].map((x) => <mesh key={x} position={[x, 0.36, 0.45]}><boxGeometry args={[0.32, 0.5, 0.06]} /><meshStandardMaterial color="#273a58" emissive={accent} emissiveIntensity={0.08} /></mesh>)}
    </group>
  );
}

function DevelopmentProps({ accent, reducedDetail }: { accent: string; reducedDetail: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.2, 0.35]}>
        <boxGeometry args={[1.7, 0.12, 0.7]} />
        <meshStandardMaterial color="#203a2f" />
      </mesh>
      <Board accent={accent} width={1.65} />
      {[0.24, 0.46, 0.7].slice(0, reducedDetail ? 2 : 3).map((height, index) => <Bar key={height} x={-0.45 + index * 0.45} height={height} color={accent} />)}
    </group>
  );
}

function DraftProps({ accent, reducedDetail }: { accent: string; reducedDetail: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.16, 0.12]}>
        <boxGeometry args={[2.25, 0.32, 0.85]} />
        <meshStandardMaterial color="#3d3417" />
      </mesh>
      <Board accent={accent} width={2.15} />
      <mesh position={[0, 0.58, 0.44]}>
        <cylinderGeometry args={[0.18, 0.24, 0.76, 18]} />
        <meshStandardMaterial color="#2b2140" />
      </mesh>
      {!reducedDetail && [-0.68, -0.22, 0.22, 0.68].map((x, index) => <Bar key={x} x={x} height={0.36 + index * 0.04} color={index % 2 ? "#61c9ff" : accent} />)}
    </group>
  );
}

function TrophyProps({ reducedDetail }: { reducedDetail: boolean }) {
  return (
    <group>
      {(reducedDetail ? [0] : [-0.55, 0, 0.55]).map((x) => (
        <mesh key={x} position={[x, 0.66, 0]}>
          <cylinderGeometry args={[0.14, 0.2, 0.64, 18]} />
          <meshStandardMaterial color="#f5c65b" metalness={0.6} roughness={0.25} emissive="#8a5d1f" emissiveIntensity={0.12} />
        </mesh>
      ))}
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[1.95, 1.22, 0.16]} />
        <meshStandardMaterial color="#bfefff" transparent opacity={0.22} />
      </mesh>
    </group>
  );
}

function Kiosk({ accent, panels }: { accent: string; panels: number }) {
  return (
    <group>
      <mesh position={[0, 0.38, 0]}>
        <boxGeometry args={[1.55, 0.76, 0.68]} />
        <meshStandardMaterial color="#2b2140" />
      </mesh>
      {Array.from({ length: panels }, (_, index) => (
        <mesh key={index} position={[(index - (panels - 1) / 2) * 0.38, 0.9, -0.12]} rotation={[-0.08, 0, 0]}>
          <boxGeometry args={[0.34, 0.55, 0.06]} />
          <meshStandardMaterial color="#dffff8" emissive={accent} emissiveIntensity={0.24} />
        </mesh>
      ))}
    </group>
  );
}

function SettingsProps({ accent }: { accent: string }) {
  return (
    <group>
      <Kiosk accent={accent} panels={2} />
      {[0, 1, 2].map((index) => (
        <mesh key={index} position={[-0.44 + index * 0.44, 0.27, 0.43]}>
          <cylinderGeometry args={[0.08, 0.08, 0.08, 18]} />
          <meshStandardMaterial color={index === 1 ? "#f5c65b" : accent} emissive={accent} emissiveIntensity={0.1} />
        </mesh>
      ))}
    </group>
  );
}

function FeedbackProps({ accent }: { accent: string }) {
  return (
    <group>
      <Kiosk accent={accent} panels={1} />
      {[-0.28, 0, 0.28].map((x, index) => <Bar key={x} x={x} height={0.28 + index * 0.08} color={index === 1 ? "#f5c65b" : accent} />)}
    </group>
  );
}

function DataPackProps({ accent, reducedDetail }: { accent: string; reducedDetail: boolean }) {
  return (
    <group>
      <Kiosk accent={accent} panels={reducedDetail ? 1 : 3} />
      {!reducedDetail && [-0.55, 0, 0.55].map((x) => <mesh key={x} position={[x, 0.2, 0.54]}><boxGeometry args={[0.26, 0.12, 0.34]} /><meshStandardMaterial color="#1d2c4d" emissive={accent} emissiveIntensity={0.12} /></mesh>)}
    </group>
  );
}

function DevToolsProps({ accent, reducedDetail }: { accent: string; reducedDetail: boolean }) {
  return (
    <group>
      <DataPackProps accent={accent} reducedDetail={reducedDetail} />
      <Board accent={accent} width={1.9} dark />
    </group>
  );
}

function Board({ accent, width, dark }: { accent: string; width: number; dark?: boolean }) {
  return (
    <mesh position={[0, 1.02, -0.42]}>
      <boxGeometry args={[width, 0.9, 0.07]} />
      <meshStandardMaterial color={dark ? "#263548" : "#e9fff5"} emissive={accent} emissiveIntensity={0.13} />
    </mesh>
  );
}

function Bar({ x, height, color }: { x: number; height: number; color: string }) {
  return (
    <mesh position={[x, 0.45 + height / 2, -0.32]}>
      <boxGeometry args={[0.14, height, 0.06]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.08} />
    </mesh>
  );
}

function RoundSeat({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <mesh position={[x, 0.28, z]}>
      <cylinderGeometry args={[0.18, 0.18, 0.16, 16]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function GoalLight({ x }: { x: number }) {
  return (
    <group position={[x, 0.32, -1.18]}>
      <mesh>
        <boxGeometry args={[0.42, 0.28, 0.12]} />
        <meshStandardMaterial color="#d9475f" emissive="#d9475f" emissiveIntensity={0.32} />
      </mesh>
      <pointLight position={[0, 0.35, 0]} intensity={0.22} color="#d9475f" />
    </group>
  );
}
