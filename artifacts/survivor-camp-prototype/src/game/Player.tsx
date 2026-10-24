import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { groundHeight, locationAt, movePlayer, SPAWN } from './world';
import { Survivor } from './Survivor';
import { dbg, input } from './state';

/** Locomotion and camera are independent from the art/rig and simulation. */
export function Player() {
  const root = useRef<THREE.Group>(null);
  const heading = useRef<THREE.Group>(null);
  const motion = useRef({ speed: 0, running: false, distance: 0 });
  const state = useRef({
    pos: { ...SPAWN }, face: Math.PI, velocity: 0, initialized: false,
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
    if (dbg.resetRequested) {
      dbg.resetRequested = false;
      s.pos = { ...SPAWN }; s.velocity = 0; s.initialized = false;
      input.joyX = input.joyY = 0; input.run = false;
      input.yaw = -0.48; input.pitch = 0.34;
      motion.current.distance = 0;
    }
    const keys = getKeys();
    let ix = input.joyX + Number(!!keys.right) - Number(!!keys.left);
    let iy = input.joyY + Number(!!keys.forward) - Number(!!keys.back);
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
      const next = movePlayer(s.pos, wx / len * s.velocity * dt, wz / len * s.velocity * dt);
      traveled = Math.hypot(next.x - s.pos.x, next.z - s.pos.z);
      s.pos = next;
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
    camera.lookAt(t.probe);
    // Keep smoothing state on the safe side of a wall; recover outward gently.
    t.camera.copy(camera.position);
    s.fpsTime += rawDt; s.fpsFrames++;
    if (s.fpsTime >= 0.5) {
      dbg.fps = Math.round(s.fpsFrames / s.fpsTime); s.fpsTime = 0; s.fpsFrames = 0;
    }
    Object.assign(dbg, {
      x: s.pos.x, y, z: s.pos.z, cx: camera.position.x, cy: camera.position.y, cz: camera.position.z,
      location: locationAt(s.pos.x, s.pos.z), moving: actualSpeed > 0.08,
      running: motion.current.running, speed: actualSpeed,
      cameraDistance: safeDistance, cameraBlocked: safeDistance < distance - 0.6,
    });
  });

  return <group ref={root}><group ref={heading}><Survivor motion={motion} /></group></group>;
}
