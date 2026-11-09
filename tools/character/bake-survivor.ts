/**
 * Offline source recipe. Copy into Ara 3D Gen's scripts directory at
 * 70d806e8c7355e6700359060168999e8ec2d510b, run its setup-assets, then
 * node --import tsx scripts/bake-survivor.ts /tmp/survivor-source.glb
 * gltf-transform optimize /tmp/survivor-source.glb tonsai-survivor.glb \
 *   --compress meshopt --texture-compress webp --texture-size 512 \
 *   --simplify-ratio 0.72 --simplify-error 0.002 --simplify-lock-border true \
 *   --join false --instance false --palette false
 */
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { nodeLibrary } from "./node-assets";
import { buildHuman, textureFiles } from "../src/core/human";
import { DEFAULT_PARAMS, type HumanParams } from "../src/core/params";
import { Animator } from "../src/core/anim/evaluate";
import { clipById, type Ch, type Clip, type Sample } from "../src/core/anim/clips";
import { fingers, side } from "../src/core/anim/clips/helpers";
import { exportGLB } from "../src/export/glb";
import { garmentById } from "../src/core/garments";
import { cm, REGION } from "../src/core/garments/body";
import { cloth, isTrunk, isUpper, mat, points, shellPart, type GarmentDef } from "../src/core/garments/kit";
import { ellipsoid, frameOf, merge, solidBand, v3 } from "../src/core/garments/ring";

type Appearance = {
  body: [number, number, number, number, number];
  blend: [number, number, number];
  skinTint: string;
  hair: string;
  hairTint: string;
  facialHair?: HumanParams["facialHair"];
  face: Record<string, number>;
  eyes?: string;
  earrings?: HumanParams["earrings"];
  top: [string, string];
  bottom: [string, string];
  wrap?: ["head" | "neck" | "cap", string, string];
  bun?: boolean;
  hat?: string;
};

function registerWardrobe() {
  garmentById.set("boardshorts", {
    id: "boardshorts", label: "Board shorts", slot: "bottom", patterns: ["solid"], color: "#5f6864", color2: "#ddd0ad",
    build: (g, style) => shellPart(g, {
      covers: (v) => (isTrunk(v) && v.t < 0.24) || (v.region === REGION.upperleg && v.t < 0.77),
      offset: (v) => cm(0.8 + (v.region === REGION.upperleg ? 1.4 * v.t : 0)), tile: 0.25,
    }, cloth(g, "Board shorts", style)),
  });
  garmentById.set("island_training_top", {
    id: "island_training_top", label: "Training tank", slot: "top", patterns: ["solid"], color: "#a8443d", color2: "#a8443d",
    build: (g, style) => {
      const shoulder = g.body.L.shoulderX;
      return shellPart(g, {
        covers: (v) => (isUpper(v) || (v.region === REGION.upperarm && v.t < 0.14 && v.tt > 0.72)) &&
          v.tt >= 0.13 && (v.tt < 0.79 || (v.ax > 0.31 * shoulder && v.ax < 1.06 * shoulder)),
        offset: cm(0.8), tile: 0.24, relax: 4,
      }, cloth(g, "Training tank", style));
    },
  });
  garmentById.set("island_halter", {
    id: "island_halter", label: "Island halter", slot: "top", patterns: ["solid"], color: "#92713d", color2: "#e0ba6c",
    build: (g, style) => shellPart(g, {
      covers: (v) => isUpper(v) && v.tt >= 0.27 && (v.tt < 0.72 ||
        (v.tt > 0.74 && v.ax < g.body.L.shoulderX * (1.62 - v.tt * 1.3) && Math.cos(v.tth) > -0.15)),
      offset: cm(0.64), tile: 0.2, relax: 3,
    }, cloth(g, "Island halter", style)),
  });

  for (const kind of ["head", "neck", "cap"] as const) {
    const id = `island_wrap_${kind}`;
    const wrap: GarmentDef = {
      id, label: "Island cloth wrap", slot: "acc", patterns: ["striped"], color: "#744770", color2: "#d4b05e",
      build(g, style) {
        const { chinY, crownY, headZ, neckY } = g.body.L;
        const isNeck = kind === "neck";
        const outline = points(g.body, (v) => isNeck ? v.region === REGION.neck || v.region === REGION.torso : v.region === REGION.head);
        const y = isNeck ? neckY - cm(3.8) : chinY + (kind === "cap" ? 0.78 : 0.72) * (crownY - chinY);
        const mesh = solidBand(outline, { origin: [0, y, headZ], normal: v3.norm([0, 1, isNeck ? 0.11 : -0.18]) },
          cm(kind === "cap" ? 6.4 : isNeck ? 5.6 : 4.0), cm(0.20), cm(isNeck ? 0.8 : 0.72),
          { samples: 28, steps: 3, slab: cm(1.25), uRepeats: 3 });
        if (!mesh) throw new Error(`Could not fit ${id}`);
        return [{ mesh, material: cloth(g, "Island cloth wrap", style) }];
      },
    };
    garmentById.set(id, wrap);
  }
  garmentById.set("island_bun", {
    id: "island_bun", label: "Braided bun", slot: "acc", patterns: ["solid"], color: "#231a16", color2: "#30221d",
    build(g, style) {
      const { crownY, headZ } = g.body.L;
      const material = mat("Braided bun", null, { color: style.color, roughness: 0.87 });
      const curls = Array.from({ length: 7 }, (_, i) => {
        const angle = i * Math.PI * 2 / 7;
        const frame = frameOf([Math.cos(angle) * cm(2.4), crownY + cm(1.7), headZ - cm(4.5) + Math.sin(angle) * cm(2.4)], [0, 0, 1], [0, 1, 0]);
        return ellipsoid(frame, [cm(2.8), cm(3.2), cm(2.8)], [0, 0], 9, 6);
      });
      return [{ mesh: merge(curls)!, material }];
    },
  });
}

function parameters(source: { id: number; name: string; gender: string }, look: Appearance): Partial<HumanParams> {
  const [age, muscle, weight, height, proportions] = look.body;
  const [african, asian, caucasian] = look.blend;
  const [top, shirt] = look.top;
  const [bottom, trousers] = look.bottom;
  const wrap = look.wrap ? `island_wrap_${look.wrap[0]}` : undefined;
  const garmentStyles: HumanParams["garmentStyles"] = {
    [top]: { pattern: "solid", color: shirt },
    [bottom]: { color: trousers },
  };
  if (wrap && look.wrap) garmentStyles[wrap] = { pattern: "striped", color: look.wrap[1], color2: look.wrap[2] };
  if (look.bun) garmentStyles.island_bun = { color: look.hairTint };
  if (look.hat) garmentStyles.baseball_cap = { pattern: "jersey", color: look.hat, color2: look.hat };
  for (const garment of [top, bottom]) {
    if (!garmentById.has(garment)) throw new Error(`Unknown cast garment ${garment}`);
  }
  return {
    name: source.name, seed: source.id, gender: source.gender === "male" ? 1 : 0,
    age, muscle, weight, height, proportions, african, asian, caucasian,
    skinTint: look.skinTint, eyes: look.eyes ?? "blackbrown",
    hair: look.hair, hairTint: look.hairTint, hairColor: look.hairTint,
    facialHair: look.facialHair ?? "none", beardColor: look.hairTint,
    earrings: look.earrings ?? "none", modifiers: look.face, top, bottom,
    shoes: source.id === 1 || source.id === 2 || source.id === 13 ? "sandals" : "shoes03",
    hat: look.hat ? "baseball_cap" : "none",
    accessories: [...(wrap ? [wrap] : []), ...(look.bun ? ["island_bun"] : [])],
    garmentStyles,
  };
}


const destination = process.argv[2];
if (!destination) throw new Error("Provide an output GLB path, or an output directory followed by cast manifest and appearance file");
const library = await nodeLibrary();
const showcase: Partial<HumanParams> = {
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
};
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

async function bake(file: string, name: string, params: Partial<HumanParams>, seated: boolean) {
  const character = await buildHuman(library, {
    ...DEFAULT_PARAMS, outfit: "none", underwear: false, faceShapes: false, speechShapes: false, faceBones: false, tongue: false, detail: "low",
    ...params,
  });
  const animator = new Animator(character.rig!, character.face);
  const animations = seated ? { ...recipes, sit: clipById.get("sit_idle")! } : recipes;
  const clips = Object.entries(animations).map(([name, clip]) => ({
    name, loop: clip.loop, ...animator.bake(clip, 24, { rootMotion: false }),
  }));
  // Keep the sealed lips from the source but skip the concealed tooth mesh.
  character.mesh.groups = character.mesh.groups.filter(
    (group) => character.mesh.materials[group.material].name !== "Teeth",
  );
  for (const material of character.mesh.materials) {
    // The fabric colors and weave stay in the diffuse maps. Mobile does not need
    // a separate normal and roughness texture for every piece of clothing.
    delete material.normalMap;
    delete material.roughnessMap;
    if (material.name === "Hair" && material.map && params.hairTint &&
        Number.parseInt(params.hairTint.slice(1, 3), 16) >= 150) {
      const name = material.map.replace(/\.png$/, "-light.png");
      if (!library.hasTexture(name)) {
        const { data, info } = await sharp(await library.texture(material.map))
          .resize({ width: 384, height: 384, fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        for (let i = 0; i < data.length; i += 4) {
          const luminance = (data[i] * 0.22 + data[i + 1] * 0.70 + data[i + 2] * 0.08) / 255;
          data[i] = data[i + 1] = data[i + 2] = 166 + 89 * Math.sqrt(luminance);
        }
        library.registerTexture(name, await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer());
      }
      material.map = name;
    }
    if (material.map?.endsWith(".png") && material.alpha === "opaque") {
      const name = material.map.replace(/\.png$/, ".jpg");
      library.registerTexture(name, await sharp(await library.texture(material.map))
        .resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 84 }).toBuffer());
      material.map = name;
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
  writeFileSync(file, exportGLB(character.mesh, name, textures, character.rig!, clips));
  console.log(JSON.stringify({
    bones: character.rig!.bones.length, height: character.height,
    speed: { walk: recipes.walk.travel, run: recipes.run.travel },
    materials: character.mesh.materials.map((material) => material.name),
    clips: clips.map(({name, times}) => [name, times.at(-1)]),
  }));
}

if (process.argv[3]) {
  const manifest = JSON.parse(readFileSync(process.argv[3], "utf8"));
  const looks = JSON.parse(readFileSync(process.argv[4], "utf8")).people as Record<string, Appearance>;
  const ids = new Set(process.argv.slice(5).map(Number));
  const foundationFile = process.env.SURVIVOR_BLENDER_FOUNDATIONS;
  const foundations = foundationFile
    ? JSON.parse(readFileSync(foundationFile, "utf8")).people as Record<string, { foundation?: Partial<HumanParams> }>
    : undefined;
  registerWardrobe();
  for (const { source } of manifest.survivors) {
    if (ids.size && !ids.has(source.id)) continue;
    const look = looks[source.id];
    if (!look) throw new Error(`Missing appearance for survivor ${source.id}`);
    const foundation = foundations?.[source.id]?.foundation;
    if (foundations && !foundation) throw new Error(`Missing Blender foundation for survivor ${source.id}`);
    await bake(`${destination}/survivor-${source.id}.glb`, `Survivor_${source.id}`, { ...parameters(source, look), ...foundation }, true);
  }
} else {
  await bake(destination, "Tonsai_Survivor", showcase, false);
}
