import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import type { GameEvent, GameResult, Team } from "../../game/types";
import { GameResultPanel } from "../rooms/ArenaPanel";

export function ArenaVisualization({
  result,
  homeTeam,
  awayTeam,
  onFinish
}: {
  result: GameResult;
  homeTeam: Team;
  awayTeam: Team;
  onFinish: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [speed, setSpeed] = useState(900);
  const current = result.eventTimeline[Math.min(index, result.eventTimeline.length - 1)];
  const done = index >= result.eventTimeline.length;

  useEffect(() => {
    if (done) return;
    const timer = window.setTimeout(() => setIndex((value) => value + 1), speed);
    return () => window.clearTimeout(timer);
  }, [index, speed, done]);

  return (
    <div className="broadcast-shell">
      <div className="broadcast-canvas">
        <Canvas camera={{ position: [0, 7.5, 7.5], fov: 48 }}>
          <color attach="background" args={["#06101d"]} />
          <ambientLight intensity={0.6} />
          <pointLight position={[0, 6, 4]} intensity={1.5} color="#bfefff" />
          <BroadcastRink event={current} homeTeam={homeTeam} awayTeam={awayTeam} tick={index} />
        </Canvas>
      </div>
      <div className="broadcast-overlay">
        <div className="broadcast-score">
          <strong>{awayTeam.abbreviation} {result.finalScore.away}</strong>
          <span>{current ? `P${current.period} ${current.time}` : "Final"}</span>
          <strong>{homeTeam.abbreviation} {result.finalScore.home}</strong>
        </div>
        <div className="button-row">
          <button type="button" onClick={() => setSpeed(900)}>Normal</button>
          <button type="button" onClick={() => setSpeed(260)}>Fast</button>
          <button type="button" onClick={() => setIndex(result.eventTimeline.length)}>Skip to Final</button>
        </div>
        <div className="event-feed event-feed--broadcast">
          {result.eventTimeline.slice(Math.max(0, index - 7), index + 1).map((event) => (
            <p key={event.id}>
              <strong>P{event.period} {event.time}</strong> {event.description}
            </p>
          ))}
        </div>
        {done && (
          <div className="broadcast-final">
            <GameResultPanel result={result} />
            <button type="button" onClick={onFinish}>Apply Result & Return</button>
          </div>
        )}
      </div>
    </div>
  );
}

function BroadcastRink({ event, homeTeam, awayTeam, tick }: { event?: GameEvent; homeTeam: Team; awayTeam: Team; tick: number }) {
  const puck = useMemo(() => new THREE.Vector3(0, 0.08, 0), []);
  const eventTeamId = event && "teamId" in event ? event.teamId : homeTeam.id;
  const teamColor = eventTeamId === homeTeam.id ? homeTeam.primaryColor : awayTeam.primaryColor;
  useFrame(({ clock }) => {
    puck.x = Math.sin(clock.elapsedTime * 2 + tick) * 2.2;
    puck.z = Math.cos(clock.elapsedTime * 1.3 + tick) * 0.95;
  });
  const flashScale = event?.type === "goal" || event?.type === "powerPlayGoal" ? 1.7 : event?.type === "penalty" ? 1.25 : 1;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9, 4.7]} />
        <meshStandardMaterial color="#dff8ff" roughness={0.22} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.7, 0.74, 64]} />
        <meshStandardMaterial color="#d74960" />
      </mesh>
      {[-3.8, 3.8].map((x) => (
        <mesh key={x} position={[x, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.52, 32]} />
          <meshStandardMaterial color={x < 0 ? awayTeam.primaryColor : homeTeam.primaryColor} transparent opacity={0.38} />
        </mesh>
      ))}
      <mesh position={[puck.x, 0.16, puck.z]} scale={flashScale}>
        <sphereGeometry args={[0.16, 20, 20]} />
        <meshStandardMaterial color={event?.type === "penalty" ? "#ffcc66" : teamColor} emissive={teamColor} emissiveIntensity={1.2} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} position={[(i % 6) * 1.5 - 3.75, 0.1, i < 6 ? -1.9 : 1.9]}>
          <boxGeometry args={[0.16, 0.2, 0.16]} />
          <meshStandardMaterial color={i < 6 ? awayTeam.secondaryColor : homeTeam.secondaryColor} />
        </mesh>
      ))}
    </group>
  );
}
