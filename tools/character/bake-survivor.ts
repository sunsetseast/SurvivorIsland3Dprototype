/**
 * Offline source recipe. Copy into Ara 3D Gen's scripts directory at
 * 70d806e8c7355e6700359060168999e8ec2d510b, run its setup-assets, then
 * node --import tsx scripts/bake-survivor.ts /tmp/survivor-source.glb
 * gltf-transform optimize /tmp/survivor-source.glb tonsai-survivor.glb \
 *   --compress meshopt --texture-compress webp --texture-size 512 \
 *   --simplify-ratio 0.72 --simplify-error 0.002 --simplify-lock-border true \
 *   --join false --instance false --palette false
 */
import { writeFileSync } from "node:fs";
import sharp from "sharp";
import { nodeLibrary } from "./node-assets";
import { buildHuman, textureFiles } from "../src/core/human";
import { DEFAULT_PARAMS } from "../src/core/params";
import { Animator } from "../src/core/anim/evaluate";
import { clipById, type Ch, type Clip, type Sample } from "../src/core/anim/clips";
import { fingers, side } from "../src/core/anim/clips/helpers";
import { exportGLB } from "../src/export/glb";

const destination = process.argv[2];
if (!destination) throw new Error("Provide an output GLB path");

const library = await nodeLibrary();
const character = await buildHuman(library, {
  ...DEFAULT_PARAMS,
  name: "Tonsai Survivor",
  gender: 0, age: 0.54, muscle: 0.61, weight: 0.44, height: 0.63,
  proportions: 0.78, african: 0.25, asian: 0.35, caucasian: 0.4,
  skinTint: "#f4e0cc", eyes: "blackbrown",
  hair: "ponytail01", hairTint: "#514035",
  outfit: "none", top: "tank_top", bottom: "cargo_shorts",
  shoes: "shoes03", accessories: ["utility_belt"], underwear: false,
  garmentStyles: {
    tank_top: { pattern: "solid", color: "#bf5039" },
    cargo_shorts: { pattern: "khaki", color: "#3b7773" },
  },
  faceShapes: false, speechShapes: false, faceBones: false, tongue: false,
  detail: "low",
});

const animator = new Animator(character.rig!, character.face);
const idle = clipById.get("idle")!;
const tau = 2 * Math.PI;
const clamp = (t: number) => Math.max(0, Math.min(1, t));
const smooth = (t: number) => { const k = clamp(t); return k * k * (3 - 2 * k); };
type Vec = [number, number, number];

/** Plant through the backward part of a stride, then lift and reach. */
function contact(phase: number, advance: number, lift: number) {
  const p = phase % 1;
  return p < 0.62
    ? { z: advance * (0.5 - p / 0.62), y: 0 }
    : { z: advance * (smooth((p - 0.62) / 0.38) - 0.5),
        y: lift * Math.sin(Math.PI * (p - 0.62) / 0.38) };
}

function quadruped(id: string, climb: boolean): Clip {
  const duration = climb ? 1.24 : 1.18;
  return {
    id, name: id, category: "Climbing", duration, loop: true,
    sample(t): Sample {
      const p = t / duration;
      const arms = (s: number, phase: number) => {
        const a = contact(phase, climb ? 0.42 : 0.37, 0.09);
        return {
          space: "floor" as const,
          pos: [s * 0.235, 0.075 + a.y, 0.51 + a.z] as Vec,
          pole: [s * 0.8, 0.1, -1] as Vec,
          dir: [0, 0, 1] as Vec,
          palm: [0, -1, 0] as Vec,
        };
      };
      const legs = (s: number, phase: number) => {
        const a = contact(phase, climb ? 0.38 : 0.30, 0.095);
        return {
          pos: [s * 0.14, 0.10 + a.y, -0.37 + a.z] as Vec,
          pole: [s * 0.25, -1, 0.5] as Vec,
        };
      };
      const sway = Math.sin(p * tau);
      const bones: Record<string, Ch> = {
        Hips: [climb ? 26 : 18, 3 * sway, 2 * sway],
        Spine: [22, -2 * sway, -sway], Spine1: [18, 0, 0], Spine2: [15, 0, 0],
        Neck: [-27, 0, 0], Head: [-30, 0, 0],
      };
      side(bones, "Foot", [25, 0, 0], [25, 0, 0]);
      fingers(bones, climb ? 20 : 4);
      return {
        bones, root: { drop: climb ? 0.64 : 0.72, x: 0.022 * sway },
        ik: { Left: arms(1, p), Right: arms(-1, p + 0.5) },
        feet: { Left: legs(1, p + 0.5), Right: legs(-1, p) },
      };
    },
  };
}

const balance: Clip = {
  id: "balance", name: "balance", duration: 1.24, loop: true, category: "Locomotion",
  sample(t) {
    const p = t / this.duration, sway = Math.sin(p * tau);
    const foot = (s: number, phase: number) => {
      const a = contact(phase, 0.48, 0.11);
      return { pos: [s * 0.072, 0.09 + a.y, a.z] as Vec, pole: [s * 0.15, 0.05, 1] as Vec };
    };
    const bones: Record<string, Ch> = {
      Hips: [2, 2 * sway, 3 * sway], Spine: [3, -2 * sway, -2 * sway],
      Head: [8, 0, -2 * sway],
    };
    side(bones, "Arm", [8, 0, 77 + sway * 6], [8, 0, 77 - sway * 6]);
    side(bones, "ForeArm", [18, 0, 0], [15, 0, 0]);
    fingers(bones, 10);
    return {
      bones, root: { y: -0.055, x: 0.018 * sway },
      feet: { Left: foot(1, p), Right: foot(-1, p + 0.5) },
    };
  },
};

const recover: Clip = {
  ...idle, id: "recover", name: "recover", duration: 0.65, loop: false,
  sample(t) {
    const crouched = clipById.get("crouch")!.sample(0);
    return { ...idle.sample(0), blend: { sample: crouched, w: 1 - smooth(t / 0.65), ground: true } };
  },
};

const recipes: Record<string, Clip> = {
  idle, walk: clipById.get("walk")!, run: clipById.get("run")!,
  turn: clipById.get("turn_left_45")!,
  turn_right: clipById.get("turn_right_45")!,
  crouch: clipById.get("crouch")!, crawl: quadruped("crawl", false),
  climb: quadruped("climb", true), balance, recover,
  interact: clipById.get("use_press")!, talk: clipById.get("talk")!,
};

const clips = Object.entries(recipes).map(([name, clip]) => ({
  name, loop: clip.loop, ...animator.bake(clip, 24, { rootMotion: false }),
}));
// Keep the sealed lips from the source but skip the concealed tooth mesh.
character.mesh.groups = character.mesh.groups.filter(
  (group) => character.mesh.materials[group.material].name !== "Teeth",
);
for (const material of character.mesh.materials) {
  // The fabric colors and weave stay in the diffuse maps. Mobile does not need
  // a separate normal and roughness texture for every piece of clothing.
  delete material.normal;
  delete material.roughnessMap;
  if (material.diffuse?.endsWith(".png") && material.alpha === "opaque") {
    const name = material.diffuse.replace(/\.png$/, ".jpg");
    library.registerTexture(name, await sharp(await library.texture(material.diffuse))
      .resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 84 }).toBuffer());
    material.diffuse = name;
  }
}
const textures = new Map<string, Uint8Array>();
const names = [...textureFiles(character.mesh)];
for (const filename of names) {
  const src = await library.texture(filename);
  textures.set(filename, await sharp(src).resize({
    width: 512, height: 512, fit: "inside", withoutEnlargement: true,
  }).toFormat(filename.endsWith(".png") ? "png" : "jpeg", { quality: 83 }).toBuffer());
}
writeFileSync(destination, exportGLB(character.mesh, "Tonsai_Survivor", textures, character.rig!, clips));
console.log(JSON.stringify({
  bones: character.rig!.bones.length, height: character.height,
  speed: { walk: recipes.walk.travel, run: recipes.run.travel },
  materials: character.mesh.materials.map((material) => material.name),
  clips: clips.map(({name, times}) => [name, times.at(-1)]),
}));
