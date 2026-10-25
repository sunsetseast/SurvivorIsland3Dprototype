import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { groundHeight as islandHeight, locationAt, movePlayer, SPAWN, type Point } from './world';
import { Survivor } from './Survivor';
import { dbg, input } from './state';
import { camp } from './CampRuntime';
import { distance as physicalDistance } from './navigation';

/** Locomotion and camera are independent from the art/rig and simulation. */
export type ExplorationWorld = {
  spawn: Point; resetSpawn?: Point; yaw: number; height: (x: number, z: number) => number;
  move: (p: Point, dx: number, dz: number) => Point; location: (x: number, z: number) => string;
};
const islandWorld: ExplorationWorld = { spawn: SPAWN, yaw: -.48, height: islandHeight, move: movePlayer, location: locationAt };
export function Player({ environment = islandWorld }: { environment?: ExplorationWorld }) {
  const isCamp = environment === islandWorld;
  const groundHeight = environment.height;
  const root = useRef<THREE.Group>(null);
  const heading = useRef<THREE.Group>(null);
  const motion = useRef({ speed: 0, running: false, distance: 0, talking: false });
  const state = useRef({
    pos: { ...environment.spawn }, face: Math.PI, velocity: 0, initialized: false,
    fpsTime: 0, fpsFrames: 0, obstacleTime: 10,
    obstacles: [] as THREE.Object3D[],
  });
  const [, getKeys] = useKeyboardControls();
  const tools = useMemo(() => ({
    target: new THREE.Vector3(), desired: new THREE.Vector3(),
    direction: new THREE.Vector3(), camera: new THREE.Vector3(),
    probe: new THREE.Vector3(), offset: new THREE.Vector3(),
    ray: new THREE.Raycaster(), hits: [] as THREE.Intersection[],
  }), []);

  useFrame(({ camera, scene }, rawDt) => {
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
    const s = state.current;
    if (dbg.teleportRequested) {
      s.pos = { ...dbg.teleportRequested }; dbg.teleportRequested = null; s.velocity = 0; s.initialized = false;
    }
    if (!s.initialized && s.fpsFrames === 0) input.yaw = environment.yaw;
    if (dbg.resetRequested) {
      dbg.resetRequested = false;
      s.pos = { ...(environment.resetSpawn || environment.spawn) }; s.velocity = 0; s.initialized = false;
      input.joyX = input.joyY = 0; input.run = false;
      input.yaw = environment.yaw; input.pitch = 0.34;
      motion.current.distance = 0;
    }
    const keys = getKeys();
    let ix = input.joyX + Number(!!keys.right) - Number(!!keys.left);
    let iy = input.joyY + Number(!!keys.forward) - Number(!!keys.back);
    if (isCamp && camp.conversation) { ix = 0; iy = 0; input.joyX = input.joyY = 0; input.run = false; }
    const magnitude = Math.hypot(ix, iy);
    if (magnitude > 1) { ix /= magnitude; iy /= magnitude; }
    const pressure = magnitude < 0.12 ? 0 : Math.min(1, magnitude);
    const wantsRun = (input.run || keys.run) && pressure > 0;
    const targetSpeed = pressure * (wantsRun ? 6.4 : 3.25);
    s.velocity = THREE.MathUtils.damp(s.velocity, targetSpeed, pressure ? 12 : 18, dt);
    const sy = Math.sin(input.yaw), cy = Math.cos(input.yaw);
    const wx = -sy * iy + cy * ix, wz = -cy * iy - sy * ix;
    let traveled = 0;
    if (pressure > 0 && s.velocity > 0.02) {
      const len = Math.hypot(wx, wz) || 1;
      const next = environment.move(s.pos, wx / len * s.velocity * dt, wz / len * s.velocity * dt);
      if (!isCamp || !camp.npcs.some(n => physicalDistance(next, n) < .78)) {
        traveled = Math.hypot(next.x - s.pos.x, next.z - s.pos.z);
        s.pos = next;
      }
      if (traveled > 0.0001) {
        const angle = Math.atan2(wx, wz);
        s.face += Math.atan2(Math.sin(angle - s.face), Math.cos(angle - s.face)) * (1 - Math.exp(-dt * 15));
      }
    }
    // Actual displacement, not requested input, controls gait and animation.
    const actualSpeed = traveled / dt;
    motion.current.speed = THREE.MathUtils.damp(motion.current.speed, actualSpeed, 20, dt);
    motion.current.running = wantsRun && actualSpeed > 3.6;
    motion.current.distance += traveled;
    const y = groundHeight(s.pos.x, s.pos.z);
    if (isCamp) camp.step(dt, { ...s.pos, y, moving: actualSpeed > .12 });
    motion.current.talking = isCamp && !!camp.conversation;
    if (isCamp && camp.conversation) {
      const npc = camp.npc(camp.conversation.actorId)!;
      const face = Math.atan2(npc.x - s.pos.x, npc.z - s.pos.z);
      s.face += Math.atan2(Math.sin(face - s.face), Math.cos(face - s.face)) * (1 - Math.exp(-dt * 8));
    }
    root.current?.position.set(s.pos.x, y, s.pos.z);
    if (heading.current) heading.current.rotation.y = s.face;

    s.obstacleTime += dt;
    if (s.obstacleTime > 1) {
      s.obstacles = [];
      scene.traverse(object => {
        if (object.userData.cameraBlocker && (object as THREE.Mesh).isMesh) s.obstacles.push(object);
      });
      s.obstacleTime = 0;
    }
    const t = tools;
    t.target.set(s.pos.x, y + 1.5, s.pos.z);
    const distance = 7.4, pitch = input.pitch;
    t.desired.set(
      t.target.x + sy * Math.cos(pitch) * distance,
      t.target.y + Math.sin(pitch) * distance,
      t.target.z + cy * Math.cos(pitch) * distance,
    );
    if (isCamp && camp.conversation) {
      const npc = camp.npc(camp.conversation.actorId)!;
      // A gently blended two-shot. The SAME wall/terrain envelope below remains
      // authoritative, including when a conversation begins on the shelter deck.
      t.target.set((s.pos.x + npc.x) / 2, (y + npc.y) / 2 + 1.25, (s.pos.z + npc.z) / 2);
      const dx = npc.x - s.pos.x, dz = npc.z - s.pos.z, len = Math.hypot(dx, dz) || 1;
      const side = Math.cos(input.yaw) * dx - Math.sin(input.yaw) * dz >= 0 ? 1 : -1;
      t.desired.set(t.target.x + dz / len * 4.5 * side - dx / len * .5,
        t.target.y + 1.25, t.target.z - dx / len * 4.5 * side - dz / len * .5);
    }
    if (!s.initialized) { t.camera.copy(t.desired); s.initialized = true; }
    t.camera.lerp(t.desired, 1 - Math.exp(-dt * 9));
    t.direction.subVectors(t.camera, t.target);
    let safeDistance = t.direction.length();
    t.direction.normalize();
    // Five parallel rays provide a collision envelope around the lens.
    for (const [lateral, vertical] of [[-0.24, 0], [0, 0], [0.24, 0], [0, 0.24], [0, -0.24]]) {
      t.offset.set(cy * lateral!, vertical!, -sy * lateral!);
      t.probe.copy(t.target).add(t.offset);
      t.ray.set(t.probe, t.direction);
      t.ray.far = safeDistance + 0.3;
      t.hits.length = 0;
      t.ray.intersectObjects(s.obstacles, false, t.hits);
      if (t.hits.length) safeDistance = Math.min(safeDistance, Math.max(0.7, t.hits[0]!.distance - 0.4));
    }
    // Sample the whole boom against hills, not just its far endpoint.
    for (let d = 0.8; d <= safeDistance; d += 0.25) {
      t.probe.copy(t.target).addScaledVector(t.direction, d);
      if (t.probe.y < groundHeight(t.probe.x, t.probe.z) + 0.3) {
        safeDistance = Math.max(0.7, d - 0.3); break;
      }
    }
    camera.position.copy(t.target).addScaledVector(t.direction, safeDistance);
    camera.position.y = Math.max(camera.position.y, groundHeight(camera.position.x, camera.position.z) + 0.3);
    t.probe.copy(t.target); t.probe.y += 0.35;
    // Compose faces in the upper half, above the landscape dialogue deck.
    if (isCamp && camp.conversation) t.probe.y -= 1.25;
    camera.lookAt(t.probe);
    // Keep smoothing state on the safe side of a wall; recover outward gently.
    t.camera.copy(camera.position);
    s.fpsTime += rawDt; s.fpsFrames++;
    if (s.fpsTime >= 0.5) {
      dbg.fps = Math.round(s.fpsFrames / s.fpsTime); s.fpsTime = 0; s.fpsFrames = 0;
    }
    Object.assign(dbg, {
      x: s.pos.x, y, z: s.pos.z, cx: camera.position.x, cy: camera.position.y, cz: camera.position.z,
      location: environment.location(s.pos.x, s.pos.z), moving: actualSpeed > 0.08,
      running: motion.current.running, speed: actualSpeed,
      cameraDistance: safeDistance, cameraBlocked: safeDistance < distance - 0.6,
    });
  });

  return <group ref={root}><group ref={heading}><Survivor motion={motion} /></group></group>;
}
