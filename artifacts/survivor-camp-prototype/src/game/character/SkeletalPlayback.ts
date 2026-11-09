import { AnimationMixer, LoopOnce, type AnimationAction, type AnimationClip, type Object3D } from "three";
import type { LocomotionState } from "../locomotionPose";

export type CharacterAction = Exclude<LocomotionState, "cinematic"> | "talk" | "turn_right" | "sit";
export type ClipMap = Partial<Record<CharacterAction, string>> & { idle: string };
const singlePlay = new Set<CharacterAction>(["turn", "turn_right", "recover", "interact"]);
const gait = new Set<CharacterAction>(["walk", "run"]);

/** One mixer per actor. The controller owns translation and heading. */
export class SkeletalPlayback {
  private readonly mixer: AnimationMixer;
  private readonly actions = new Map<CharacterAction, AnimationAction>();
  private readonly blendWeights = new Map<AnimationAction, number>();
  private state: CharacterAction = "idle";
  private current?: AnimationAction;
  private blendElapsed = 0;

  constructor(
    private readonly root: Object3D,
    animations: AnimationClip[],
    clips: ClipMap,
  ) {
    const available = new Map(animations.map((clip) => [clip.name, clip]));
    for (const name of Object.values(clips)) {
      const clip = available.get(name);
      if (!clip || clip.duration <= 0) throw new Error(`Missing survivor clip ${name}`);
    }
    this.mixer = new AnimationMixer(root);
    for (const state of Object.keys(clips) as CharacterAction[]) {
      const action = this.mixer.clipAction(available.get(clips[state]!)!);
      if (singlePlay.has(state)) {
        action.setLoop(LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      this.actions.set(state, action);
    }
  }

  update(state: CharacterAction, rate: number, dt: number, blend = 0.16) {
    const next = this.actions.get(state) ?? this.actions.get("idle")!;
    if (this.current !== next) {
      this.blendWeights.clear();
      for (const action of this.actions.values()) {
        if (action.isScheduled()) this.blendWeights.set(action, action.getEffectiveWeight());
      }
      if (!next.isScheduled() || singlePlay.has(state)) {
        next.reset().play();
        if (this.current && gait.has(this.state) && gait.has(state))
          next.time = this.current.time / this.current.getClip().duration * next.getClip().duration;
      }
      this.blendElapsed = this.current ? 0 : blend;
      this.current = next;
      this.state = state;
    }
    this.blendElapsed += dt;
    const progress = Math.min(1, this.blendElapsed / blend);
    const weight = progress * progress * (3 - 2 * progress);
    next.setEffectiveWeight((this.blendWeights.get(next) ?? 0) * (1 - weight) + weight);
    for (const [action, initial] of this.blendWeights) {
      if (action !== next) {
        if (progress === 1) action.stop();
        else action.setEffectiveWeight(initial * (1 - weight));
      }
    }
    if (progress === 1) this.blendWeights.clear();
    if (!next.paused) next.setEffectiveTimeScale(rate);
    this.mixer.update(dt);
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.root);
  }
}
