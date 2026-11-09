import { heightAt } from "../surface";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { Contestant, type StagedPerson } from "../../Contestants";
import { PlayableSurvivor } from "../../character/PlayableSurvivor";
import { createCharacterMaterial } from "../../characterSurface";
import { runnerVisual, challengeGait, runnerPresentations } from "./visual";
import type { CoastalEngine, Runner } from "./engine";
import type { LocomotionMotion } from "../../locomotionPose";
import { angleDelta } from "../../cameraController";
import { turnHeading } from "../../locomotion";
const flat = () => 0;
function Actor({
  r,
  engine,
  material,
}: {
  r: Runner;
  engine: CoastalEngine;
  material: T.Material;
}) {
  const group = useRef<T.Group>(null),
    last = useRef({ x: r.x, z: r.z }),
    face = useRef(0),
    recovery = useRef({ until: 0, x: r.x, z: r.z, y: 0 });
  const presentation = useMemo(() => {
    const p = { x: r.x, y: 0, z: r.z, facing: 0 };
    runnerPresentations.set(r, p);
    return p;
  }, [r]);
  const motion = useRef<LocomotionMotion>({
    speed: 0,
    running: false,
    distance: 0,
  });
  const npc = useMemo<StagedPerson>(
    () => ({
      id: r.id,
      x: 0,
      y: 0,
      z: 0,
      facing: 0,
      animation: "idle",
      speed: 0,
      distance: 0,
      locomotion: motion.current,
    }),
    [r.id],
  );
  useFrame((_, rawDt) => {
    if (!group.current) return;
    const dt = Math.min(0.05, rawDt),
      v = runnerVisual(r, engine.state.heat),
      dx = v.x - last.current.x,
      dz = v.z - last.current.z,
      distance = Math.hypot(dx, dz),
      active = r.heat === engine.state.heat;
    const travel = distance < 0.6 ? distance : 0,
      speed = dt > 0 ? Math.min(6.5, travel / dt) : 0;
    last.current.x = v.x;
    last.current.z = v.z;
    const onObstacle = r.stage === "crawl" || r.stage === "beam" || r.stage === "net";
    const turn = travel > 0.0001 ? angleDelta(Math.atan2(dx, dz), face.current) : 0;
    if (onObstacle) face.current = turnHeading(face.current, 0, 1, dt);
    else if (travel > 0.0001) face.current = turnHeading(face.current, dx, dz, dt);
    const recovering = active && engine.elapsed < r.recoverUntil;
    if (recovering && recovery.current.until !== r.recoverUntil) {
      recovery.current = {
        until: r.recoverUntil,
        x: group.current.position.x,
        z: group.current.position.z,
        y: group.current.position.y,
      };
    }
    let x = v.x,
      y = v.y,
      z = v.z;
    if (recovering) {
      const t = 1 - (r.recoverUntil - engine.elapsed) / 2,
        k = Math.min(1, Math.max(0, (t - 0.12) / 0.55)),
        smooth = k * k * (3 - 2 * k),
        from = recovery.current;
      x = from.x + (v.x - from.x) * smooth;
      z = from.z + (v.z - from.z) * smooth;
      y = v.y + Math.max(0, from.y - v.y) * (1 - Math.min(1, t / 0.18));
    }
    const visualTravel = Math.hypot(
      x - group.current.position.x,
      z - group.current.position.z,
    );
    const recoveryTime = recovering
      ? 1 - (r.recoverUntil - engine.elapsed) / 2
      : 0;
    if (recovering && recoveryTime > 0.18 && recoveryTime < 0.67)
      face.current = turnHeading(
        face.current,
        x - group.current.position.x,
        z - group.current.position.z,
        dt,
      );
    Object.assign(presentation, { x, y, z, facing: face.current });
    group.current.position.set(x, y, z);
    group.current.rotation.set(0, face.current, 0);
    const m = motion.current;
    m.speed = speed;
    m.running = speed > 3.6;
    m.distance += travel;
    m.posture = 1;
    m.balance = r.balance;
    const crest = Math.max(0, Math.min(1, (r.z + 5.3) / 0.6));
    m.climbZ = r.z;
    m.supportOffset = heightAt(r.x, -5) - heightAt(r.x, r.z) - r.lift;
    m.climbSlope = 0.95 * (1 - 2 * crest * crest * (3 - 2 * crest));
    m.state = !active ? "idle" : challengeGait(r.stage, speed);
    m.running = m.state === "run";
    if (r.id === 0 && active) {
      if (r.stage === "crawl" && engine.elapsed - r.stageStarted < 0.23)
        m.state = "crouch";
      if (!onObstacle && m.running && Math.abs(turn) > 0.8 && speed < 3.2)
        m.state = "turn";
      m.turnDirection = turn;
    }
    if (recovering) {
      m.state = "recover";
      m.recovery = Math.max(0, 1 - (r.recoverUntil - engine.elapsed) / 0.7);
      m.speed = 0;
      m.running = false;
      if (recoveryTime > 0.18 && recoveryTime < 0.67 && visualTravel > 0.001) {
        m.state = "run";
        m.running = true;
        m.speed = visualTravel / Math.max(0.001, dt);
        m.distance += visualTravel;
      }
    }
    group.current.userData.locomotion = m;
    npc.speed = m.speed;
    npc.distance = m.distance;
    npc.animation =
      r.stage === "puzzle" ? "work" : speed > 0.05 ? "walk" : "idle";
  }, -0.15);
  return (
    <group ref={group} name={`coastal-runner-${r.id}`}>
      <group name="proportional-articulated-body">
        {r.id === 0 ? (
          <PlayableSurvivor motion={motion} />
        ) : (
          <Contestant
            npc={npc}
            terrain={flat}
            time={() => engine.state.clock}
            material={material}
          />
        )}
      </group>
    </group>
  );
}
export function CoastalRoster({ engine }: { engine: CoastalEngine }) {
  const material = useMemo(createCharacterMaterial, []);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <group name="coastal-competing-roster">
      {engine.state.runners.map((r) => (
        <Actor key={r.id} r={r} engine={engine} material={material} />
      ))}
    </group>
  );
}
