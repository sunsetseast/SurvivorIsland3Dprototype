import survivorUrl from "../../assets/characters/tonsai-survivor.glb?url";
import { cast } from "./cast";
import type { CharacterAction, ClipMap } from "./SkeletalPlayback";

export type SurvivorModel = {
  url: string;
  survivorId?: number;
  clips: ClipMap;
  referenceSpeeds: Partial<Record<CharacterAction, number>>;
  supportBones: [string, string];
};

/** Saved prototype rehearsals can still use the PR #29 presentation. */
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


const urls = import.meta.glob<string>("../../assets/characters/cast/*.glb", {
  eager: true, query: "?url", import: "default",
});
const models = new Map<number, SurvivorModel>();
for (const { source, model } of cast) {
  if (!model) continue;
  const url = urls[`../../assets/characters/cast/${model}`];
  if (url) models.set(source.id, {
    ...tonsaiSurvivor, survivorId: source.id, url,
    clips: { ...tonsaiSurvivor.clips, sit: "sit" },
  });
}
// Vite serves these files only in development. The normal picker, actor loader
// and save ID are shared with the production cast.
if (import.meta.env.DEV && typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("cast-preview") === "benchmarks") {
  for (const id of [10, 17]) {
    const model = models.get(id);
    if (model) {
      models.set(id, {
        ...model,
        url: `${import.meta.env.BASE_URL}src/assets/characters/benchmarks/survivor-${id}.glb`,
      });
    }
  }
}
export const castModel = (id: number | null | undefined) => id == null ? undefined : models.get(id);
