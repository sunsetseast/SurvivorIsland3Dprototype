import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { camp, type NpcState } from "./CampRuntime";
import { buildContestant } from "./contestantArt";
import type { Geo } from "./geo";
import { groundHeight } from "./world";
import {
  sampleFoot,
  solveLeg,
  solveSeatedLeg,
  samplePresence,
  turnToward,
} from "./characterMotion";

import { createCharacterMaterial } from "./characterSurface";
const material = createCharacterMaterial();
export const characterAnimationMetrics = { updates: 0, totalMs: 0, maxMs: 0 };
const mesh = (g: Geo, name?: string) => (
  <mesh name={name} geometry={g} material={material} castShadow />
);

export type StagedPerson = Pick<
  NpcState,
  "id" | "x" | "y" | "z" | "animation" | "speed" | "distance" | "facing"
> & { seatHeight?: number };
export function Contestant({
  npc,
  terrain = groundHeight,
  time,
}: {
  npc: StagedPerson;
  terrain?: typeof groundHeight;
  time?: () => number;
}) {
  const p = useMemo(() => buildContestant(npc.id), [npc.id]);
  useEffect(
    () => () => {
      for (const key of [
        "torso",
        "pelvis",
        "head",
        "armU",
        "forearm",
        "thigh",
        "shin",
        "foot",
      ] as const)
        p[key].dispose();
    },
    [p],
  );
  const root = useRef<THREE.Group>(null),
    hips = useRef<THREE.Group>(null),
    spine = useRef<THREE.Group>(null),
    head = useRef<THREE.Group>(null);
  const upperL = useRef<THREE.Group>(null),
    upperR = useRef<THREE.Group>(null),
    elbowL = useRef<THREE.Group>(null),
    elbowR = useRef<THREE.Group>(null);
  const thighL = useRef<THREE.Group>(null),
    thighR = useRef<THREE.Group>(null),
    kneeL = useRef<THREE.Group>(null),
    kneeR = useRef<THREE.Group>(null),
    ankleL = useRef<THREE.Group>(null),
    ankleR = useRef<THREE.Group>(null);
  const smooth = useRef({
    move: 0,
    sit: npc.animation === "sit" ? 1 : 0,
    talk: 0,
    work: 0,
    facing: npc.facing,
  });
  useFrame((_, rawDt) => {
    const animationStart = performance.now();
    const dt = Math.min(rawDt, 0.05),
      t = (time ? time() : camp.now) + npc.id * 0.73,
      s = smooth.current;
    const damp = (a: number, b: number) =>
      a + (b - a) * (1 - Math.exp(-dt * 9));
    s.move = damp(s.move, Math.min(1, npc.speed / 0.9));
    s.sit = damp(s.sit, npc.animation === "sit" ? 1 : 0);
    s.talk = damp(s.talk, npc.animation === "talk" ? 1 : 0);
    s.work = damp(s.work, npc.animation === "work" ? 1 : 0);
    root.current?.position.set(npc.x, npc.y, npc.z);
    s.facing = turnToward(s.facing, npc.facing, dt);
    if (root.current) root.current.rotation.y = s.facing;
    const presence = samplePresence(npc.id, t, s.sit);
    const seatedLeg = solveSeatedLeg(p.look.height, npc.seatHeight ?? 0.535);
    const ph = (npc.distance / (1.2 * p.look.height)) * Math.PI * 2,
      gait = 0.35 * s.move,
      idle = Math.sin(t * 1.55 + npc.id) * 0.012;
    const set = (
      ref: React.RefObject<THREE.Group | null>,
      x: number,
      y = 0,
      z = 0,
    ) => ref.current?.rotation.set(x, y, z);
    for (const [leg, knee, ankle, opposite] of [
      [thighL, kneeL, ankleL, false],
      [thighR, kneeR, ankleR, true],
    ] as const) {
      const foot = sampleFoot(npc.distance, p.look.height, opposite);
      const z = foot.z * s.move;
      const terrainOffset =
        (terrain(
          npc.x + Math.sin(npc.facing) * z * p.look.height,
          npc.z + Math.cos(npc.facing) * z * p.look.height,
        ) -
          npc.y) /
        p.look.height;
      const ik = solveLeg(
        -0.83 + 0.072 * s.move + foot.lift * s.move + terrainOffset,
        z,
      );
      set(leg, ik.hip * (1 - s.sit) + seatedLeg.hip * s.sit);
      set(knee, ik.knee * (1 - s.sit) + seatedLeg.knee * s.sit);
      set(ankle, ik.ankle * (1 - s.sit) + seatedLeg.ankle * s.sit);
    }
    // Alternating speech beats with relaxed listening pauses, not constant waving.
    const beat =
      Math.max(0, Math.sin(t * 1.4 + npc.id)) *
      Math.max(0, Math.sin(t * 0.55 + npc.id));
    const gesture = s.talk * beat;
    set(
      upperL,
      Math.sin(ph) * gait * 0.8 - gesture * 0.28 - s.work * 0.35 - s.sit * 0.27,
      0,
      presence.arm + gesture * 0.16 + idle * (1 - s.move),
    );
    set(
      upperR,
      -Math.sin(ph) * gait * 0.8 -
        gesture * 0.12 -
        s.work * 0.45 -
        s.sit * 0.24,
      0,
      -presence.arm - gesture * 0.08 - idle * (1 - s.move),
    );
    set(
      elbowL,
      -0.12 -
        gesture * 0.78 -
        s.sit * 0.5 -
        s.work * (0.5 + Math.sin(t * 1.2) * 0.12),
    );
    set(elbowR, -0.14 - gesture * 0.4 - s.sit * 0.5 - s.work * 0.55);
    if (hips.current) {
      hips.current.position.set(
        0,
        0.92 * (1 - s.sit) +
          seatedLeg.hipHeight * s.sit -
          0.072 * s.move +
          Math.cos(ph * 2) * 0.008 * s.move,
        -0.22 * s.sit,
      );
      hips.current.rotation.y = Math.sin(ph) * 0.02 * s.move;
    }
    set(
      spine,
      presence.lean + s.move * 0.035 + s.work * 0.1 + s.sit * idle,
      Math.sin(ph) * -0.04 * s.move,
      presence.tilt + idle * 0.4,
    );
    if (spine.current)
      spine.current.scale.set(
        1 + presence.breath * 0.2,
        1 + presence.breath,
        1 + presence.breath * 0.4,
      );
    set(
      head,
      -presence.lean * 0.65 + presence.nod + s.talk * Math.sin(t * 2.1) * 0.025,
      presence.glance * (1 - s.move) * (1 - s.talk),
    );
    const cost = performance.now() - animationStart;
    characterAnimationMetrics.updates++;
    characterAnimationMetrics.totalMs += cost;
    characterAnimationMetrics.maxMs = Math.max(
      characterAnimationMetrics.maxMs,
      cost,
    );
  });
  const arm = (side: number, upper: typeof upperL, elbow: typeof elbowL) => (
    <group ref={upper} position={[side * p.shoulder, 0.5, 0]}>
      {mesh(p.armU)}
      <group ref={elbow} position={[0, -0.285, 0]}>
        <group scale={[side, 1, 1]}>{mesh(p.forearm)}</group>
      </group>
    </group>
  );
  const leg = (
    side: number,
    thigh: typeof thighL,
    knee: typeof kneeL,
    ankle: typeof ankleL,
  ) => (
    <group ref={thigh} position={[side * 0.105 * p.look.width, -0.01, 0]}>
      {mesh(p.thigh)}
      <group ref={knee} position={[0, -0.43, 0]}>
        {mesh(p.shin)}
        <group ref={ankle} position={[0, -0.405, 0]}>
          {mesh(p.foot, `hero-foot-${side}`)}
        </group>
      </group>
    </group>
  );
  return (
    <group
      ref={root}
      name={`contestant-${npc.id}`}
      userData={{ contestantId: npc.id, visualVersion: 2, hero: true }}
    >
      <group scale={p.look.height}>
        <group ref={hips} position={[0, 0.92, 0]}>
          {mesh(p.pelvis)}
          <group ref={spine} position={[0, 0.045, 0]}>
            {mesh(p.torso)}
            <group
              ref={head}
              position={[0, 0.61, 0]}
              scale={[0.83, 0.82, 0.86]}
            >
              {mesh(p.head)}
            </group>
            {arm(1, upperL, elbowL)}
            {arm(-1, upperR, elbowR)}
          </group>
          {leg(1, thighL, kneeL, ankleL)}
          {leg(-1, thighR, kneeR, ankleR)}
        </group>
      </group>
    </group>
  );
}

export function Contestants() {
  return (
    <>
      {camp.npcs.map((n) => (
        <Contestant key={n.id} npc={n} />
      ))}
    </>
  );
}
