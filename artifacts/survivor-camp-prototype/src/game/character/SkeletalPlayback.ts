import { AnimationMixer, LoopOnce, type AnimationAction, type AnimationClip, type Object3D } from "three";
import type { LocomotionState } from "../locomotionPose";

export type CharacterAction = Exclude<LocomotionState, "cinematic">;
export type ClipMap = Partial<Record<CharacterAction, string>> & { idle: string };

const singlePlay = new Set<CharacterAction>(["turn", "recover"]);

/** One mixer per actor. The controller owns translation and heading. */
export class SkeletalPlayback {
  private readonly mixer: AnimationMixer;
  private readonly actions = new Map<CharacterAction, AnimationAction>();
  private current?: AnimationAction;
  private fadeTime = 0;

  constructor(
    private readonly root: Object3D,
    animations: AnimationClip[],
    clips: ClipMap,
  ) {
    this.mixer = new AnimationMixer(root);
    for (const state of Object.keys(clips) as CharacterAction[]) {
      const clip = animations.find((candidate) => candidate.name === clips[state]);
      if (!clip || clip.duration <= 0) throw new Error(`Missing survivor clip for ${state}`);
      const action = this.mixer.clipAction(clip);
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
      const previous = this.current;
      next.reset().setEffectiveWeight(1).play();
      if (previous) next.crossFadeFrom(previous, blend, false);
      this.current = next;
      this.fadeTime = previous ? blend : 0;
    }
    // A finished one-shot stays at its end pose until gameplay changes state.
    if (!next.paused) next.setEffectiveTimeScale(rate);
    this.mixer.update(dt);
    this.fadeTime -= dt;
    if (this.fadeTime <= 0) {
      for (const action of this.actions.values()) {
        if (action !== next && action.isScheduled()) action.stop();
      }
    }
  }

  dispose() {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.root);
  }
}
