import { InlandEnvironment } from "./InlandEnvironment";
import { trailDistance } from "./environmentLayout";
import { CoastalEnvironment } from "./CoastalEnvironment";
import { useEffect, useMemo } from "react";
import * as T from "three";
import { Player, type ExplorationWorld } from "../Player";
import { TropicalSky } from "../environment/TropicalSky";
import { ATMOSPHERES } from "../environment/atmosphere";
import { TrailMarker } from "../locations/TrailMarker";
import { validateSpawn } from "../locations/spawn";
import type { Pose } from "../locations/registry";
import { ARRIVAL, ZONES } from "./layout";
import { heightAt, moveOnTerrain, shoreX, walkable, zoneAt } from "./surface";
import { Joystick, RunButton, OrbitZone, TouchButton } from "../Hud";
import { clearInput } from "../state";

const WORLD: ExplorationWorld = { locationId: "challenge_main", spawn: ARRIVAL, yaw: ARRIVAL.yaw, height: heightAt, move: moveOnTerrain, location: zoneAt };
function Ground({ low }: { low: boolean }) {
  const geometry = useMemo(() => {
    const g = new T.PlaneGeometry(240, 260, low ? 64 : 96, low ? 70 : 104);
    g.rotateX(-Math.PI / 2);
    const p = g.getAttribute("position"), colors: number[] = [];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), d = x - shoreX(z);
      p.setY(i, heightAt(x, z));
      const t = T.MathUtils.smoothstep(d, 58, 95);
      const c = new T.Color(d < 9 ? "#b4ad81" : "#e4cc96").lerp(new T.Color("#697347"), t);
      const clearing = Math.max(...["jungle", "individual"].map(id => { const q=ZONES[id as "jungle"|"individual"].center;return 1-T.MathUtils.smoothstep(Math.hypot(x-q.x,z-q.z),18,25); }));
      c.lerp(new T.Color("#a99a6b"),clearing*0.85*t);
      c.lerp(new T.Color("#b7a67a"),(1-T.MathUtils.smoothstep(trailDistance(x,z),1.6,3.6))*t);
      c.multiplyScalar(0.96 + 0.05 * Math.sin(x * 1.3 + z * 1.9));
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [low]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh name="challenge-ground-ready" geometry={geometry} receiveShadow><meshStandardMaterial vertexColors roughness={1} /></mesh>;
}
export function ChallengeScene({ low, arrival }: { low: boolean; arrival?: Pose }) {
  const spawn = useMemo(() => validateSpawn(arrival ?? ARRIVAL, { height: heightAt, walkable }), [arrival]);
  return <>
    <color attach="background" args={["#8fc3d7"]} />
    <fog attach="fog" args={["#adcbd0", 170, 700]} />
    <TropicalSky atmosphere={ATMOSPHERES.midday} />
    <hemisphereLight args={["#c7e3ed", "#77775b", 1.35]} />
    <directionalLight position={[-80, 110, -65]} intensity={2.8} color="#fff0d5" />
    <group name="challenge-beach-world">
      <Ground low={low} />
      <CoastalEnvironment low={low} />
      <InlandEnvironment low={low} />
      <TrailMarker connectionId="challenge_to_camp" height={heightAt} />
      <Player environment={WORLD} arrival={spawn} />
    </group>
  </>;
}
export function ChallengeHud({ low, setLow, onMenu }: { low: boolean; setLow: (v: boolean) => void; onMenu: () => void }) {
  useEffect(() => () => clearInput(), []);
  return <div className="island-hud">
    <OrbitZone allowLookUp />
    <div className="island-toolbar">
      <TouchButton data-testid="challenge-menu" onActivate={onMenu}>Menu</TouchButton>
      <TouchButton data-testid="challenge-quality" onActivate={() => setLow(!low)}>{low ? "Quality: Low" : "Quality: High"}</TouchButton>
    </div>
    <div style={{ pointerEvents: "auto" }}><Joystick /><RunButton /></div>
  </div>;
}
