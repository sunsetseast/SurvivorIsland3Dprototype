/** Deterministic offline GLB export. No runtime authoring or new dependency. */
import { createRequire } from "node:module";
const require = createRequire(
  new URL(
    "../../../artifacts/survivor-camp-prototype/package.json",
    import.meta.url,
  ),
);
const T = require("three") as typeof import("three");
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { buildLandmarks, scan } from "./model.mts";
const { mergeGeometries } = await import(
  require.resolve("three/examples/jsm/utils/BufferGeometryUtils.js")
);
import { baseHeight } from "../../../artifacts/survivor-camp-prototype/src/game/world.ts";
import {
  southernCliffGeometry,
  southernCliffSurface,
} from "../../../artifacts/survivor-camp-prototype/src/game/environment/limestone.ts";
const root = new URL("../../../", import.meta.url),
  out = new URL("artifacts/survivor-camp-prototype/src/assets/camp/", root);
const meshes = [...buildLandmarks("near"), ...buildLandmarks("far")];
for (const lod of ["near", "far"] as const) {
  const parts = [southernCliffGeometry(lod === "far")];
  // Grounded talus along cave shoulders/back, kept below the body corridor.
  for (let i = 0; i < 17; i++) {
    const x = i < 12 ? (i % 2 ? 7.12 : 14.9) : 7.9 + (i - 12) * 1.35,
      z = i < 12 ? 98 + Math.floor(i / 2) * 2.05 : 110.65,
      s = 0.16 + (i % 3) * 0.1,
      g = scan("tiny");
    g.rotateY(i * 2.399);
    g.scale(s, s, s);
    g.translate(x, baseHeight(x, z) - 0.06, z);
    const p = g.attributes.position!,
      colors = [];
    for (let j = 0; j < p.count; j++) colors.push(0.48, 0.46, 0.41);
    g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    parts.push(g);
  }
  // Four attached, partly submerged erosion toes; no debris in the beach path.
  for (const [i, d] of [0.31, 0.49, 0.72, 0.87].entries()) {
    const anchor = southernCliffSurface(-40, d, 0),
      g = scan("tiny"),
      s = 1.05 + (i % 3) * 0.21;
    g.rotateY(i * 2.399);
    g.scale(s, s, s);
    g.translate(anchor[0]! + 0.25, anchor[1]! - 1.0, anchor[2]!);
    const colors = [];
    for (let j = 0; j < g.attributes.position!.count; j++)
      colors.push(0.57, 0.54, 0.47);
    g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    parts.push(g);
  }
  const g = mergeGeometries(parts, false)!;
  g.computeBoundingBox();
  g.computeBoundingSphere();
  meshes.push({
    name: "southern-cliff-rock-" + lod,
    site: "southern-cliff",
    kind: "rock",
    lod,
    geometry: g,
  });
}
function exportKit(selected: typeof meshes, filename: string) {
  const j: any = {
    asset: {
      version: "2.0",
      generator: "SurvivorIsland offline cross-section/scanned-mesh authoring",
    },
    scene: 0,
    scenes: [{ nodes: [] }],
    nodes: [],
    meshes: [],
    buffers: [{ byteLength: 0 }],
    bufferViews: [],
    accessors: [],
    materials: [
      {
        name: "shared-bark",
        doubleSided: true,
        pbrMetallicRoughness: {
          baseColorFactor: [1, 1, 1, 1],
          metallicFactor: 0,
          roughnessFactor: 1,
        },
      },
      {
        name: "shared-limestone",
        doubleSided: true,
        pbrMetallicRoughness: {
          baseColorFactor: [1, 1, 1, 1],
          metallicFactor: 0,
          roughnessFactor: 1,
        },
      },
    ],
  };
  const parts: Buffer[] = [];
  let offset = 0;
  function accessor(a: T.BufferAttribute, type: string) {
    const buf = Buffer.from(
        a.array.buffer,
        a.array.byteOffset,
        a.array.byteLength,
      ),
      pad = Buffer.alloc((4 - (buf.length % 4)) % 4),
      view = j.bufferViews.length;
    j.bufferViews.push({
      buffer: 0,
      byteOffset: offset,
      byteLength: buf.length,
    });
    parts.push(buf, pad);
    offset += buf.length + pad.length;
    const ac: any = {
      bufferView: view,
      componentType:
        a.array instanceof Float32Array
          ? 5126
          : a.array instanceof Uint16Array
            ? 5123
            : 5125,
      count: a.count,
      type,
    };
    if (type === "VEC3") {
      const b = new T.Box3().setFromBufferAttribute(a);
      ac.min = b.min.toArray();
      ac.max = b.max.toArray();
    }
    j.accessors.push(ac);
    return j.accessors.length - 1;
  }
  const manifest: any = {
    method:
      "Original offline loft/section-authored wood; CC0 Poly Haven boulder derivative rock. No Blender sculpt or new photogrammetry claim.",
    meshes: [],
  };
  for (const { name, site, kind, lod, geometry: g } of selected) {
    const attributes: any = {};
    for (const [a, key, type] of [
      ["position", "POSITION", "VEC3"],
      ["normal", "NORMAL", "VEC3"],
      ["uv", "TEXCOORD_0", "VEC2"],
      ["color", "COLOR_0", "VEC3"],
    ])
      attributes[key!] = accessor(
        g.getAttribute(a!) as T.BufferAttribute,
        type!,
      );
    const indices = accessor(g.getIndex()!, "SCALAR"),
      id = j.meshes.length;
    j.meshes.push({
      name,
      primitives: [{ attributes, indices, material: kind === "wood" ? 0 : 1 }],
    });
    j.scenes[0].nodes.push(id);
    j.nodes.push({ name, mesh: id, extras: { site, kind, lod } });
    manifest.meshes.push({
      name,
      site,
      kind,
      lod,
      triangles: g.index!.count / 3,
      vertices: g.attributes.position!.count,
      bounds:
        g.boundingBox ??
        new T.Box3().setFromBufferAttribute(
          g.attributes.position as T.BufferAttribute,
        ),
    });
  }
  j.buffers[0].byteLength = offset;
  let json = Buffer.from(JSON.stringify(j));
  json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 32)]);
  const bin = Buffer.concat(parts),
    head = Buffer.alloc(20),
    bh = Buffer.alloc(8);
  head.writeUInt32LE(0x46546c67);
  head.writeUInt32LE(2, 4);
  head.writeUInt32LE(28 + json.length + bin.length, 8);
  head.writeUInt32LE(json.length, 12);
  head.writeUInt32LE(0x4e4f534a, 16);
  bh.writeUInt32LE(bin.length);
  bh.writeUInt32LE(0x004e4942, 4);
  const glb = Buffer.concat([head, json, bh, bin]);
  writeFileSync(new URL(filename, out), glb);
  manifest.bytes = glb.length;
  manifest.sha256 = createHash("sha256").update(glb).digest("hex");
  manifest.sourceSha256 = Object.fromEntries(
    [
      "tools/camp/refinement/model.mts",
      "tools/camp/refinement/build.mts",
      "artifacts/survivor-camp-prototype/src/game/environment/limestone.ts",
    ].map((p) => [
      p,
      createHash("sha256")
        .update(readFileSync(new URL(p, root)))
        .digest("hex"),
    ]),
  );
  writeFileSync(
    new URL(
      filename === "landmarks.glb"
        ? "landmark-manifest.json"
        : "landmark-low-manifest.json",
      out,
    ),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  console.log({
    bytes: glb.length,
    triangles: manifest.meshes.reduce(
      (s: number, m: any) => s + m.triangles,
      0,
    ),
    meshes: selected.length,
  });
}
exportKit(meshes, "landmarks.glb");
exportKit(
  meshes.filter((m) => m.lod === "far"),
  "landmarks-low.glb",
);
// Convex rock footprints replace the old broad rectangular gate colliders.
const { ROCK_LAYOUT } = await import("./model.mts");
const { NATURAL_LANDMARKS } =
  await import("../../../artifacts/survivor-camp-prototype/src/game/environment/geography.ts");

const hull = (pts: number[][]) => {
  pts.sort((a, b) => a[0]! - b[0]! || a[1]! - b[1]!);
  const cross = (o: number[], a: number[], b: number[]) =>
    (a[0]! - o[0]!) * (b[1]! - o[1]!) - (a[1]! - o[1]!) * (b[0]! - o[0]!);
  const lower: number[][] = [],
    upper: number[][] = [];
  for (const p of pts) {
    while (lower.length > 1 && cross(lower.at(-2)!, lower.at(-1)!, p) <= 0)
      lower.pop();
    lower.push(p);
  }
  for (const p of pts.toReversed()) {
    while (upper.length > 1 && cross(upper.at(-2)!, upper.at(-1)!, p) <= 0)
      upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
};
const collisions = [];
for (const [site, specs] of Object.entries(ROCK_LAYOUT)) {
  const l = NATURAL_LANDMARKS.find((l) => l.id === site)!;
  for (const [dx, , dz, s, a] of specs) {
    const g = scan("near");
    g.rotateY(a!);
    g.scale(s!, s!, s!);
    g.translate(l.x + dx!, 0, l.z + dz!);
    const p = g.attributes.position!,
      points = [];
    for (let i = 0; i < p.count; i++) points.push([p.getX(i), p.getZ(i)]);
    const polygon = hull(points),
      x0 = Math.min(...polygon.map((p) => p[0]!)),
      x1 = Math.max(...polygon.map((p) => p[0]!)),
      z0 = Math.min(...polygon.map((p) => p[1]!)),
      z1 = Math.max(...polygon.map((p) => p[1]!));
    collisions.push({
      x: (x0 + x1) / 2,
      z: (z0 + z1) / 2,
      hx: (x1 - x0) / 2,
      hz: (z1 - z0) / 2,
      kind: "landmark:" + site,
      polygon,
    });
  }
}
writeFileSync(
  new URL(
    "artifacts/survivor-camp-prototype/src/game/environment/rockCollision.json",
    root,
  ),
  JSON.stringify(collisions) + "\n",
);
