import { sampleFoot } from "./characterMotion";
import { CameraEnvelope } from "./cameraEnvelope";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import {
  groundHeight as islandHeight,
  locationAt,
  movePlayer,
  SPAWN,
  type Point,
} from "./world";
import { Survivor } from "./Survivor";
import { dbg, input, clearInput } from "./state";
import { camp } from "./CampRuntime";
import { worldTravel } from "./locations/travel";
import type { LocationId, Pose } from "./locations/registry";
import { distance as physicalDistance } from "./navigation";

import { recenterYaw, votingZone, ease } from "./cameraController";
import { createDrive, drive, cancelDrive, turnHeading } from "./locomotion";
import { VOTING } from "./tribal/votingAnchors";

/** Locomotion and camera are independent from the art/rig and simulation. */
export type ExplorationWorld = {
  locationId?: LocationId;
  facing?: number;
  camp?: boolean;
  voting?: { suppressed: () => boolean; release: () => void };
  standFrom?: Point & { facing: number };
  controlsLocked?: () => boolean;
  cameraLocked?: () => boolean;
  spawn: Point;
  resetSpawn?: Point;
  yaw: number;
  height: (x: number, z: number) => number;
  move: (p: Point, dx: number, dz: number) => Point;
  location: (x: number, z: number) => string;
};
const islandWorld: ExplorationWorld = {
  camp: true,
  locationId: "camp_tribe_a",
  spawn: SPAWN,
  yaw: -0.48,
  height: islandHeight,
  move: movePlayer,
  location: locationAt,
};
export function Player({
  environment = islandWorld,
  arrival,
}: {
  environment?: ExplorationWorld;
  arrival?: Pose;
}) {
  const isCamp = environment.camp === true;
  const spawn = arrival ?? environment.spawn;
  const yaw = arrival?.yaw ?? environment.yaw;
  const groundHeight = environment.height;
  const root = useRef<THREE.Group>(null);
  const heading = useRef<THREE.Group>(null);
  const motion = useRef({
    speed: 0,
    running: false,
    distance: 0,
    talking: false,
    seated: !!environment.standFrom,
    footL: 0,
    footR: 0,
  });
  const driveState = useRef(createDrive(yaw));
  const state = useRef({
    pos: { ...(environment.standFrom || spawn) },
    face:
      environment.standFrom?.facing ??
      arrival?.facing ??
      environment.facing ??
      Math.PI,
    entryTime: 0,
    initialized: false,
    firstFrame: true,
    fpsTime: 0,
    fpsFrames: 0,
    locked: false,
    voting: false,
    blend: 0,
  });
  const [, getKeys] = useKeyboardControls();
  const envelope = useMemo(() => new CameraEnvelope(), []);
  const tools = useMemo(
    () => ({
      target: new THREE.Vector3(),
      look: new THREE.Vector3(),
      smoothLook: new THREE.Vector3(),
      desired: new THREE.Vector3(),
      probe: new THREE.Vector3(),
      camera: new THREE.Vector3(),
    }),
    [],
  );

  useEffect(() => {
    const cancel = () => cancelDrive(driveState.current);
    window.addEventListener("survivor-input-clear", cancel);
    return () => window.removeEventListener("survivor-input-clear", cancel);
  }, []);
  useEffect(
    () => () => {
      clearInput();
      dbg.votingBlend = 0;
      envelope.clear();
    },
    [],
  );

  useFrame(({ camera, scene }, rawDt) => {
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
    const s = state.current;
    if (s.firstFrame) {
      input.yaw = yaw;
      s.firstFrame = false;
    }
    if (dbg.teleportRequested) {
      s.pos = { ...dbg.teleportRequested };
      s.entryTime = 1;
      dbg.teleportRequested = null;
      cancelDrive(driveState.current);
      s.voting = false;
      s.blend = 0;
      s.initialized = false;
    }
    if (dbg.resetRequested) {
      dbg.resetRequested = false;
      clearInput();
      s.voting = false;
      s.blend = 0;
      s.entryTime = 1;
      s.pos = { ...(environment.resetSpawn || environment.spawn) };
      cancelDrive(driveState.current);
      s.initialized = false;
      input.yaw = yaw;
      input.pitch = 0.34;
      motion.current.distance = 0;
    }
    const standing = !!environment.standFrom && s.entryTime < 0.85;
    if (standing) {
      s.entryTime = Math.min(0.85, s.entryTime + dt);
      const k = s.entryTime / 0.85,
        t = k * k * (3 - 2 * k),
        from = environment.standFrom!;
      s.pos = {
        x: from.x + (environment.spawn.x - from.x) * t,
        z: from.z + (environment.spawn.z - from.z) * t,
      };
    }
    motion.current.seated = standing && s.entryTime < 0.05;
    const keys = getKeys();
    let ix = input.joyX + Number(!!keys.right) - Number(!!keys.left);
    let iy = input.joyY + Number(!!keys.forward) - Number(!!keys.back);
    const locked =
      worldTravel.blocked ||
      input.mapOpen ||
      standing ||
      !!environment.controlsLocked?.() ||
      (isCamp && !!camp.conversation);
    if (locked && !s.locked) clearInput();
    s.locked = locked;
    if (locked) {
      ix = 0;
      iy = 0;
    }
    if (locked) cancelDrive(driveState.current);
    const wantsRun = !!(input.run || keys.run);
    const d = drive(
      driveState.current,
      ix,
      iy,
      input.yaw,
      wantsRun,
      dt,
      undefined,
      input.joyEpoch,
    );
    let traveled = 0;
    if (d.speed > 0.01) {
      const next = environment.move(s.pos, d.dx, d.dz);
      if (!isCamp || !camp.npcs.some((n) => physicalDistance(next, n) < 0.78)) {
        traveled = Math.hypot(next.x - s.pos.x, next.z - s.pos.z);
        if (traveled > 0.0001)
          s.face = turnHeading(s.face, next.x - s.pos.x, next.z - s.pos.z, dt);
        s.pos = next;
      }
    }
    // Actual displacement, not requested input, controls gait and animation.
    const actualSpeed = traveled / dt;
    motion.current.speed = THREE.MathUtils.damp(
      motion.current.speed,
      actualSpeed,
      20,
      dt,
    );
    motion.current.running = wantsRun && actualSpeed > 3.6;
    motion.current.distance += traveled;
    const y = groundHeight(s.pos.x, s.pos.z);
    const footOffset = (opposite: boolean) => {
      const z = sampleFoot(motion.current.distance, 0.96, opposite).z * 0.96;
      return Math.max(
        -0.18,
        Math.min(
          0.18,
          (groundHeight(
            s.pos.x + Math.sin(s.face) * z,
            s.pos.z + Math.cos(s.face) * z,
          ) -
            y) /
            0.96,
        ),
      );
    };
    motion.current.footL = footOffset(false);
    motion.current.footR = footOffset(true);
    if (isCamp && !worldTravel.blocked)
      camp.step(dt, { ...s.pos, y, moving: actualSpeed > 0.12 });
    motion.current.talking = isCamp && !!camp.conversation;
    if (isCamp && camp.conversation) {
      const npc = camp.npc(camp.conversation.actorId)!;
      const face = Math.atan2(npc.x - s.pos.x, npc.z - s.pos.z);
      s.face +=
        Math.atan2(Math.sin(face - s.face), Math.cos(face - s.face)) *
        (1 - Math.exp(-dt * 8));
    }
    input.lookGrace = Math.max(0, input.lookGrace - dt);
    input.yaw = recenterYaw(
      input.yaw,
      s.face,
      input.looking,
      input.lookGrace,
      dt,
    );
    if(!input.looking&&input.lookGrace<=0)input.pitch+=(.34-input.pitch)*ease(dt,3);
    const voting = environment.voting;
    if (voting) {
      if (
        Math.hypot(s.pos.x - VOTING.writing.x, s.pos.z - VOTING.writing.z) > 1.7
      )
        voting.release();
      s.voting =
        !voting.suppressed() &&
        votingZone(s.pos.x, s.pos.z, s.face, s.voting, VOTING.writing);
    }
    s.blend += ((s.voting ? 1 : 0) - s.blend) * ease(dt, 5.5);
    if (s.blend < 0.001) s.blend = 0;
    if (s.blend > 0.999) s.blend = 1;
    const sy = Math.sin(input.yaw),
      cy = Math.cos(input.yaw);
    root.current?.position.set(s.pos.x, y, s.pos.z);
    if (root.current) root.current.userData.locomotion = motion.current;
    if (heading.current) heading.current.rotation.y = s.face;

    Object.assign(dbg, {
      controlsLocked: locked,
      moving: actualSpeed > 0.08,
      running: motion.current.running,
      speed: actualSpeed,
    });
    if (environment.cameraLocked?.()) return;
    const cameraStart = performance.now();
    const t = tools;
    t.target.set(s.pos.x, y + 1.5, s.pos.z);
    const distance = 6.2,
      pitch = input.pitch;
    t.desired.set(
      t.target.x + sy * Math.cos(pitch) * distance,
      t.target.y + Math.sin(pitch) * distance,
      t.target.z + cy * Math.cos(pitch) * distance,
    );
    if (isCamp && camp.conversation) {
      const npc = camp.npc(camp.conversation.actorId)!;
      // A gently blended two-shot. The SAME wall/terrain envelope below remains
      // authoritative, including when a conversation begins on the shelter deck.
      t.target.set(
        (s.pos.x + npc.x) / 2,
        (y + npc.y) / 2 + 1.25,
        (s.pos.z + npc.z) / 2,
      );
      const dx = npc.x - s.pos.x,
        dz = npc.z - s.pos.z,
        len = Math.hypot(dx, dz) || 1;
      const side =
        Math.cos(input.yaw) * dx - Math.sin(input.yaw) * dz >= 0 ? 1 : -1;
      t.desired.set(
        t.target.x + (dz / len) * 4.5 * side - (dx / len) * 0.5,
        t.target.y + 1.25,
        t.target.z - (dx / len) * 4.5 * side - (dz / len) * 0.5,
      );
    }
    t.look.copy(t.target);
    t.look.y += 0.35;
    if (isCamp && camp.conversation) t.look.y -= 1.25;
    if (s.blend > 0) {
      t.desired.lerp(
        t.probe.set(VOTING.camera.x, VOTING.camera.y, VOTING.camera.z),
        s.blend,
      );
      t.look.lerp(
        t.probe.set(s.pos.x, y + (VOTING.look.y - VOTING.writing.y), s.pos.z),
        s.blend,
      );
    }
    if (!s.initialized) {
      t.camera.copy(standing ? camera.position : t.desired);
      t.smoothLook.copy(t.look);
      s.initialized = true;
    }
    t.camera.lerp(t.desired, 1 - Math.exp(-dt * 9));
    const safeDistance = envelope.resolve(
      scene,
      t.target,
      t.camera,
      groundHeight,
      dt,
    );
    camera.position.copy(t.camera);
    t.smoothLook.lerp(t.look, ease(dt, 9));
    camera.lookAt(t.smoothLook);
    // Portrait uses the live viewport aspect, including visualViewport/keyboard resize.
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const c = camera as THREE.PerspectiveCamera;
      const fov = 55 + (58 - 55) * s.blend;
      if (Math.abs(c.fov - fov) > 0.01) {
        c.fov = fov;
        c.updateProjectionMatrix();
      }
    }
    // Keep smoothing state on the safe side of a wall; recover outward gently.
    t.camera.copy(camera.position);
    s.fpsTime += rawDt;
    s.fpsFrames++;
    if (s.fpsTime >= 0.5) {
      dbg.fps = Math.round(s.fpsFrames / s.fpsTime);
      s.fpsTime = 0;
      s.fpsFrames = 0;
    }
    if (environment.locationId)
      worldTravel.recordPose(environment.locationId, {
        ...s.pos,
        facing: s.face,
        yaw: input.yaw,
      });
    Object.assign(dbg, {
      face: s.face,
      cameraOwner:
        s.blend > 0 && s.blend < 1
          ? "voting-transition"
          : s.voting
            ? "voting-portrait"
            : isCamp && camp.conversation
              ? "dialogue"
              : input.looking || input.lookGrace > 0
                ? "manual-look"
                : "follow",
      votingBlend: s.blend,
      cameraCpuMs: performance.now() - cameraStart,
      x: s.pos.x,
      y,
      z: s.pos.z,
      cx: camera.position.x,
      cy: camera.position.y,
      cz: camera.position.z,
      location: environment.location(s.pos.x, s.pos.z),
      moving: actualSpeed > 0.08,
      running: motion.current.running,
      speed: actualSpeed,
      cameraDistance: safeDistance,
      cameraBlocked: safeDistance < distance - 0.6,
      controlsLocked: locked,
    });
  });

  return (
    <group ref={root} name="exploration-player">
      <group ref={heading}>
        <Survivor motion={motion} />
      </group>
    </group>
  );
}
