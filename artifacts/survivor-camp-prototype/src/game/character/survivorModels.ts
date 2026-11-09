import survivorUrl from "../../assets/characters/tonsai-survivor.glb?url";
import type { CharacterAction, ClipMap } from "./SkeletalPlayback";

export type SurvivorModel = {
  url: string;
  clips: ClipMap;
  referenceSpeeds: Partial<Record<CharacterAction, number>>;
  supportBones: [string, string];
};

/** Presentation for the existing participant 0. The season owns identity and stats. */
export const tonsaiSurvivor: SurvivorModel = {
  url: survivorUrl,
  clips: {
    idle: "idle", walk: "walk", run: "run", turn: "turn", turn_right: "turn_right",
    crouch: "crouch", crawl: "crawl", climb: "climb", balance: "balance",
    recover: "recover", interact: "interact", talk: "talk",
  },
  referenceSpeeds: { walk: 1.39, run: 3.65, crawl: 0.51, balance: 0.62, climb: 0.62 },
  supportBones: ["LeftToeBase", "RightToeBase"],
};
