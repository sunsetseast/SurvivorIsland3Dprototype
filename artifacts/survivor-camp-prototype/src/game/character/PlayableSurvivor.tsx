import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, MathUtils, type Object3D, SkinnedMesh, Vector3 } from "three";
import { acquireSurvivorAsset, disposeSkeletons } from "./modelAssets";
import { Survivor } from "../Survivor";
import { locomotionState, type LocomotionMotion } from "../locomotionPose";
import { SkeletalPlayback, type CharacterAction } from "./SkeletalPlayback";
import { tonsaiSurvivor, type SurvivorModel } from "./survivorModels";

export type PlayableMotion = LocomotionMotion & { talking?: boolean; seated?: boolean; seatHeight?: number; rigged?: boolean };
type Props = {
  motion: MutableRefObject<PlayableMotion>;
  height?: (x: number, z: number) => number;
  model?: SurvivorModel;
  supporting?: boolean;
  onLoadState?: (state: "ready" | "error") => void;
};

type Actor = {
  root: Group;
  playback: SkeletalPlayback;
  feet: [Object3D, Object3D];
  sample: Vector3;
  origin: Vector3;
};
export const skeletalMetrics = { updates: 0, totalMs: 0, maxMs: 0 };

export function PlayableSurvivor({ model = tonsaiSurvivor, ...props }: Props) {
  return <SkinnedActor key={model.url} model={model} {...props} />;
}

function SkinnedActor({ motion, height, model, supporting = false, onLoadState }: Props & { model: SurvivorModel }) {
  const [actor, setActor] = useState<Actor>();
  const pivot = useRef<Group>(null);
  const elapsedSincePose = useRef(0);
  const status = useRef(onLoadState);
  status.current = onLoadState;
  useEffect(() => {
    let active = true;
    let owned: Actor | undefined;
    const asset = acquireSurvivorAsset(model.url);
    asset.instantiate().then((instance) => {
      if (!active || !instance) return;
      const { scene, animations } = instance;
      try {
        const left = scene.getObjectByName(model.supportBones[0]);
        const right = scene.getObjectByName(model.supportBones[1]);
        if (!left || !right) throw new Error("Survivor GLB is missing its toe joints");
        scene.name = supporting ? `skinned-contestant-${model.survivorId}` : "skinned-survivor";
        scene.userData.survivorId = model.survivorId;
        scene.userData.riggedCast = model.survivorId !== undefined;
        scene.traverse((object) => {
          if (object instanceof SkinnedMesh) {
            // The bind-pose bounds cannot enclose every pose on the net.
            object.frustumCulled = false;
            object.castShadow = true;
          }
        });
        const playback = new SkeletalPlayback(scene, animations, model.clips);
        playback.update("idle", 1, 0);
        owned = { root: scene, playback, feet: [left, right], sample: new Vector3(), origin: new Vector3() };
        setActor(owned);
        status.current?.("ready");
      } catch (error) {
        disposeSkeletons(scene);
        throw error;
      }
    }).catch((error: unknown) => {
      if (active) {
        console.warn("Unable to load survivor GLB", model.survivorId, error);
        status.current?.("error");
      }
    });
    return () => {
      active = false;
      owned?.playback.dispose();
      if (owned) disposeSkeletons(owned.root);
      asset.release();
    };
  }, [model, supporting]);

  useEffect(() => {
    if (!actor) return;
    const current = motion.current;
    current.rigged = true;
    return () => { current.rigged = false; };
  }, [actor, motion]);

  useFrame(({ camera }, rawDt) => {
    if (!actor || !pivot.current) return;
    for (let node: Object3D | null = pivot.current; node; node = node.parent) {
      if (!node.visible) return;
    }
    let delta = Math.min(rawDt, 0.05);
    if (supporting) {
      const distance = pivot.current.getWorldPosition(actor.origin).distanceToSquared(camera.position);
      elapsedSincePose.current += delta;
      if (elapsedSincePose.current < (distance > 144 ? 1 / 15 : 1 / 27)) return;
      delta = elapsedSincePose.current;
      elapsedSincePose.current = 0;
    }
    const start = performance.now();
    const m = motion.current;
    const dt = delta;
    const state = locomotionState(m);
    let action: CharacterAction = state === "cinematic" ? "idle" : state;
    if (m.seated && model.clips.sit) action = "sit";
    if (action === "idle" && m.talking) action = "talk";
    if (action === "turn" && (m.turnDirection ?? 0) < 0) action = "turn_right";
    const referenceSpeed = model.referenceSpeeds[action];
    const rate = referenceSpeed
      ? MathUtils.clamp(m.speed / referenceSpeed, 0, 2.4)
      : 1;
    const blend = action === "crawl" || action === "climb" ? 0.21 : 0.16;
    actor.playback.update(action, rate, dt, blend);
    const body = pivot.current;
    body.userData.action = action;
    const pitch = action === "climb" ? -Math.atan(m.climbSlope ?? 0) : 0;
    body.rotation.x = MathUtils.damp(body.rotation.x, pitch, 10, dt);
    const roll = action === "balance" ? -(m.balance ?? 0) * 0.12 : 0;
    body.rotation.z = MathUtils.damp(body.rotation.z, roll, 9, dt);

    // Correct support height at the animated toe closest to the floor.
    // The terrain query is read-only and never changes the gameplay collider.
    let offset = action === "sit" ? (m.seatHeight ?? 0.535) - 0.535 : 0;
    if (height && (action === "walk" || action === "run" || action === "idle" || action === "turn" || action === "turn_right")) {
      body.parent?.getWorldPosition(actor.origin);
      const base = height(actor.origin.x, actor.origin.z);
      let lowest = Infinity;
      for (const toe of actor.feet) {
        toe.getWorldPosition(actor.sample);
        if (actor.sample.y < lowest) {
          lowest = actor.sample.y;
          offset = MathUtils.clamp(
            height(actor.sample.x, actor.sample.z) - base,
            -0.09, 0.12,
          );
        }
      }
    }
    body.position.y = MathUtils.damp(body.position.y, offset, 16, dt);
    const elapsed = performance.now() - start;
    skeletalMetrics.updates++;
    skeletalMetrics.totalMs += elapsed;
    skeletalMetrics.maxMs = Math.max(skeletalMetrics.maxMs, elapsed);
  });

  if (!actor) return model.survivorId === undefined ? <Survivor motion={motion} /> : null;
  return (
    <group ref={pivot} name="survivor-visual-offset">
      <primitive object={actor.root} dispose={null} />
    </group>
  );
}
