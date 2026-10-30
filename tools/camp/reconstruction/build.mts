/** Original editable botanical/shelter mesh authoring; no hand-sculpting claim.
 * Metres, Y-up. Run node --import tsx ../../tools/camp/reconstruction/build.mts in app. */
import { createRequire } from "node:module";
import { writeFileSync, readFileSync, renameSync } from "node:fs";
import { createHash } from "node:crypto";
const require = createRequire(
  new URL(
    "../../../artifacts/survivor-camp-prototype/package.json",
    import.meta.url,
  ),
);
const T = require("three") as typeof import("three");
const { mergeGeometries, mergeVertices } = await import(
  require.resolve("three/examples/jsm/utils/BufferGeometryUtils.js")
);
import {
  baseHeight,
  SHELTER,
  rng,
} from "../../../artifacts/survivor-camp-prototype/src/game/world.ts";
const root = new URL("../../../", import.meta.url),
  out = new URL("artifacts/survivor-camp-prototype/src/assets/camp/", root);
type Part = {
  name: string;
  material: number;
  geometry: import("three").BufferGeometry;
};
const parts: Part[] = [];
const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
function painted(g: import("three").BufferGeometry, color: string) {
  const p = g.attributes.position!,
    a = [];
  const c = new T.Color(color);
  for (let i = 0; i < p.count; i++) {
    const k = 0.88 + 0.12 * Math.sin(p.getY(i) * 3 + p.getX(i));
    a.push(c.r * k, c.g * k, c.b * k);
  }
  g.setAttribute("color", new T.Float32BufferAttribute(a, 3));
  return g;
}
function join(gs: import("three").BufferGeometry[]) {
  gs = gs.map((g) => {
    g = g.index ? g.toNonIndexed() : g;
    g.deleteAttribute("uv");
    return g;
  });
  const g = mergeVertices(mergeGeometries(gs, false)!, 0.0001);
  g.computeVertexNormals();
  return g;
}
function pole(
  a: number[],
  b: number[],
  r: number,
  color: string,
  taper = 0.78,
  segments = 7,
) {
  const A = V(...(a as [number, number, number])),
    B = V(...(b as [number, number, number])),
    d = B.clone().sub(A);
  let g = new T.CylinderGeometry(r * taper, r, d.length(), segments, 2);
  g.applyMatrix4(
    new T.Matrix4().compose(
      A.add(B).multiplyScalar(0.5),
      new T.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()),
      V(1, 1, 1),
    ),
  );
  return painted(g, color);
}
function tube(points: number[][], r: number, color: string, steps = 14) {
  const curve = new T.CatmullRomCurve3(
    points.map((p) => V(...(p as [number, number, number]))),
  );
  const g = new T.TubeGeometry(curve, steps, r, 6, false),
    p = g.attributes.position!;
  for (let i = 0; i < p.count; i++) {
    const t = Math.floor(i / 7) / steps,
      C = curve.getPoint(t),
      k = 1 - t * 0.77;
    p.setXYZ(
      i,
      C.x + (p.getX(i) - C.x) * k,
      C.y + (p.getY(i) - C.y) * k,
      C.z + (p.getZ(i) - C.z) * k,
    );
  }
  g.computeVertexNormals();
  return painted(g, color);
}
function leaves(
  seed: number,
  centres: number[][],
  count: number,
  card = false,
  segments = 6,
  sprayScale = 1,
) {
  const random = rng(seed),
    pos: number[] = [],
    uv: number[] = [],
    colors: number[] = [],
    idx: number[] = [];
  const add = (
    p: import("three").Vector3,
    c: import("three").Color,
    u: number,
    v: number,
  ) => {
    pos.push(p.x, p.y, p.z);
    colors.push(c.r, c.g, c.b);
    uv.push(u, v);
  };
  for (let i = 0; i < count; i++) {
    const C = centres[i % centres.length]!,
      a = random() * Math.PI * 2,
      r = Math.sqrt(random()) * C[3]!,
      h = (random() - 0.5) * C[3]!,
      P = V(C[0]! + Math.cos(a) * r, C[1]! + h, C[2]! + Math.sin(a) * r),
      len = card ? (1.6 + random() * 1.3) * sprayScale : 0.65 + random() * 0.65,
      width = card ? len * 0.78 : len * 0.39,
      D = V(
        Math.cos(a),
        card ? 1.15 - random() * 2.05 : 0.15 - random() * 0.65,
        Math.sin(a),
      ).normalize(),
      S = V(-Math.sin(a), 0, Math.cos(a)),
      c = card
        ? new T.Color("#d0d7c0").multiplyScalar(0.85 + random() * 0.3)
        : new T.Color("#c9d3b2").multiplyScalar(0.82 + random() * 0.22),
      o = pos.length / 3;
    // Folded textured sprays for upper canopy; true cupped lanceolate leaves below eye height.
    if (card) {
      const A = P.clone().addScaledVector(S, -width / 2),
        B = P.clone().addScaledVector(S, width / 2),
        M = P.clone()
          .addScaledVector(D, len * 0.53)
          .add(V(0, 0.13, 0)),
        L = M.clone().addScaledVector(S, -width * 0.55),
        R = M.clone().addScaledVector(S, width * 0.55),
        tip = P.clone().addScaledVector(D, len);
      [A, B, L, R, tip].forEach((p, k) =>
        add(p, c, [0, 1, 0, 1, 0.5][k]!, [0, 0, 0.5, 0.5, 1][k]!),
      );
      idx.push(o, o + 2, o + 1, o + 1, o + 2, o + 3, o + 2, o + 4, o + 3);
    } else {
      // Six-section cupped elliptical leaf with a midrib, rather than a triangle spear.

      for (let k = 0; k <= segments; k++) {
        const t = k / segments,
          w = Math.pow(Math.sin(t * Math.PI), 0.83) * width * 0.5;
        const mid = P.clone()
          .addScaledVector(D, len * t)
          .add(V(0, Math.sin(t * Math.PI) * 0.09 - t * t * 0.06, 0));
        add(
          mid
            .clone()
            .addScaledVector(S, -w)
            .add(V(0, -w * 0.14, 0)),
          c,
          0.018,
          0.49 + t * 0.49,
        );
        add(mid, c.clone().multiplyScalar(1.1), 0.082, 0.49 + t * 0.49);
        add(
          mid
            .clone()
            .addScaledVector(S, w)
            .add(V(0, -w * 0.14, 0)),
          c.clone().multiplyScalar(0.92),
          0.15,
          0.49 + t * 0.49,
        );
        if (k) {
          const q = o + (k - 1) * 3;
          idx.push(
            q,
            q + 3,
            q + 1,
            q + 1,
            q + 3,
            q + 4,
            q + 1,
            q + 4,
            q + 2,
            q + 2,
            q + 4,
            q + 5,
          );
        }
      }
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
// Three intentionally different crown architectures, connected to tapered scaffold branches.
const crownSets = [
  [
    [-3, 11, -2, 2.7],
    [2.4, 12, 1, 3.3],
    [0, 14, 0, 2.8],
    [4, 10, -2, 2.4],
    [-1, 10, 3.5, 2.8],
  ],
  [
    [-3.5, 9, 0, 3.1],
    [1, 10, 3, 2.6],
    [4, 11, -1, 2.7],
    [0, 13, -1.4, 2.5],
  ],
  [
    [-2, 13, -3, 2.8],
    [2, 15, 1, 3],
    [4.3, 12, 2, 2.2],
    [-3, 11, 2, 3.1],
    [0.2, 16, 0, 2],
  ],
];
for (let variant = 0; variant < 3; variant++)
  for (const lod of ["near", "far"]) {
    const cs = crownSets[variant]!,
      random = rng(91 + variant),
      wood = [];
    wood.push(
      tube(
        [
          [0, 0, 0],
          [0.2, 2, 0],
          [-0.12, 5, 0.2],
          [0.45, 7.5, -0.2],
          [0.6, 10, 0],
        ],
        0.36,
        "#766b4f",
        lod === "near" ? 18 : 9,
      ),
    );
    for (let i = 0; i < cs.length; i++) {
      const [x, y, z] = cs[i]!;
      wood.push(
        tube(
          [
            [0.15, 5.4 + i * 0.5, 0.1],
            [x! * 0.38, 8.3 + i * 0.25, z! * 0.3],
            [x!, y! - 0.5, z!],
          ],
          0.17,
          "#847353",
          lod === "near" ? 10 : 5,
        ),
      );
    }
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05 + variant * 0.7;
      wood.push(
        tube(
          [
            [Math.cos(a) * 1.5, -0.1, Math.sin(a) * 1.5],
            [Math.cos(a) * 0.7, 0.4, Math.sin(a) * 0.7],
            [0, 1.7, 0],
          ],
          0.18,
          "#797255",
          6,
        ),
      );
    }
    parts.push({
      name: `forest-${variant}-wood-${lod}`,
      material: 0,
      geometry: join(wood),
    });
    parts.push({
      name: `forest-${variant}-crown-${lod}`,
      material: 1,
      geometry: leaves(200 + variant, cs, lod === "near" ? 300 : 180, true),
    });
  }
// At eye height use real leaf surfaces, no opaque planes or green screens.
for (let v = 0; v < 3; v++)
  for (const lod of ["near", "far"]) {
    const gs = [],
      cs: number[][] = [];
    if (v === 1) {
      // Juvenile broadleaf: a bent trunk and five connected leafy boughs occupy
      // the missing 1–6 m zone. Lower boughs close lateral sightlines without
      // adding any physical obstacle to off-trail exploration.
      cs.push([-1.3, 2.8, -.5, 1.2], [1.2, 3.9, .9, 1.3],
        [.1, 5, -.5, 1.2], [1.5, 2, -1, 1], [-.8, 1.4, 1, 1]);
      gs.push(tube([[0,0,0],[.1,1.4,.1],[-.14,3,.15],[.1,4.9,-.5]], .13, '#817760', lod==='near'?12:6));
      cs.forEach(([x,y,z],i)=>gs.push(tube([[.04,.7+i*.4,.06],[x!*.5,y!*.7,z!*.4],[x!,y!,z!]], .055, '#817760', lod==='near'?7:4)));
    } else for (let k = 0; k < 5; k++) {
      const a = k * 2.399 + v;
      const x = Math.cos(a) * 0.75,
        z = Math.sin(a) * 0.75,
        h = 1.2 + (k % 3) * 0.3;
      gs.push(pole([x * 0.4, 0, z * 0.4], [x, h, z], .025, '#626b38', 0.5, 5));
      for(const t of [0.23,0.48,0.74,1])
        cs.push([x*(.4+.6*t), h*t, z*(.4+.6*t), .66]);
    }
    parts.push({
      name: `understory-${v}-wood-${lod}`,
      material: 0,
      geometry: join(gs),
    });
    parts.push({
      name: `understory-${v}-leaves-${lod}`,
      material: v === 1 ? 1 : 2,
      geometry: v === 1 ? leaves(701, cs, lod === "near" ? 140 : 85, true, 6, .48) : leaves(700 + v, cs, lod === "near" ? 84 : 56, false, lod === "near" ? 5 : 2),
    });
  }
// Handmade communal lean-to, with an open rain-sheltering front and low windward edge.
// Deck and ramp stay on the pre-existing navigation surface. No cabin walls/railings/lantern.
const wood = [],
  lash = [],
  thatch = [],
  deck = [],
  D = SHELTER.deck;
const bamboo = (a: number[], b: number[], r = 0.075) => {
  wood.push(pole(a, b, r, "#a38f5b", 0.88, 8));
  const A = V(...(a as [number, number, number])),
    B = V(...(b as [number, number, number])),
    dir = B.clone().sub(A),
    len = dir.length();
  for (let d = 0.45; d < len; d += 0.68) {
    const P = A.clone().addScaledVector(dir, d / len);
    wood.push(
      pole(
        P.clone()
          .addScaledVector(dir, -0.014 / len)
          .toArray(),
        P.clone()
          .addScaledVector(dir, 0.014 / len)
          .toArray(),
        r * 1.08,
        "#6f7041",
        1,
        8,
      ),
    );
  }
};
function binding(x: number, y: number, z: number, r = 0.17) {
  for (let i = 0; i < 4; i++) {
    const g = new T.TorusGeometry(r, 0.018, 4, 10);
    g.rotateX(Math.PI / 2);
    g.translate(x, y + i * 0.034, z);
    lash.push(painted(g, "#78664a"));
  }
}
for (const x of [7.3, 16.7])
  for (const z of [-47.7, -44, -40.3]) {
    const top = 3.72 + (z + 48.6) * 0.195 - 0.08;
    bamboo([x, baseHeight(x, z) - 0.15, z], [x, top + 0.18, z], 0.12);
    binding(x, D.y - 0.14, z);
    binding(x, top, z);
  }
for (const z of [-47.7, -44, -40.3])
  bamboo([12, baseHeight(12, z) - 0.1, z], [12, 1.63, z], 0.12);
for (const [a, b] of [
  [7.3, 10.0],
  [16.7, 14.0],
])
  bamboo([a!, 3.45, -40.3], [b!, 5.24, -40.3], 0.065);
for (const z of [-47.7, -44, -40.3])
  bamboo([6.9, 1.63, z], [17.1, 1.63, z], 0.11);
for (let i = 0; i < 49; i++) {
  const x = D.x0 + 0.1 + i * (9.8 / 48),
    r = 0.085 + (i % 5) * 0.004;
  deck.push(
    pole(
      [x, 1.69 + (i % 3) * 0.009, -48],
      [x + 0.024 * Math.sin(i), 1.7 + (i % 4) * 0.008, -40],
      r,
      ["#aa9567", "#9b885b", "#b4a176"][i % 3]!,
      1,
      8,
    ),
  );
}
for (const x of [7.3, 16.7]) {
  bamboo([x, 3.68, -48.3], [x, 5.38, -39.7], 0.09);
  bamboo([x, 1.55, -47.7], [x, 3.9, -44], 0.055);
  bamboo([x, 1.55, -40.3], [x, 3.5, -44], 0.055);
}
for (const z of [-48, -46, -44, -42, -40]) {
  const y = 3.72 + (z + 48.6) * 0.195 - 0.1;
  bamboo([6.6, y, z], [17.4, y, z], 0.065);
}
for (let x = 6.5; x <= 17.6; x += 0.8)
  bamboo([x, 3.62, -48.6], [x + 0.07, 5.43, -39.3], 0.04);
// Thick imperfect woven palm base, with a scalloped ragged drip edge.
const roofY = (x: number, z: number) =>
  3.72 + (z + 48.6) * 0.195 + 0.035 * Math.sin(x * 3.1 + z * 0.8);
const roof = new T.PlaneGeometry(12, 10.8, 40, 32);
roof.rotateX(-Math.PI / 2);
roof.translate(12, 0, -44.0);
const rp = roof.attributes.position!;
for (let i = 0; i < rp.count; i++) {
  const x = rp.getX(i),
    z = rp.getZ(i);
  rp.setXYZ(
    i,
    x,
    roofY(x, z),
    z + (Math.abs(z + 44) > 5 ? 0.16 * Math.sin(x * 7.3) : 0),
  );
}
roof.computeVertexNormals();
thatch.push(painted(roof, "#8a8154"));
const random = rng(180);
for (let row = 0; row < 10; row++)
  for (let i = 0; i < 24; i++) {
    const x = 6.15 + i * 0.5 + (row % 2) * 0.18,
      z = -49.5 + row * 1.07,
      L = 1.35 + random() * 0.55;
    // Collected fronds point down slope. Twenty split leaflets remain attached to
    // one rachis, overlap the course below, and droop at the low eave.
    for (let k = 0; k < 11; k++)
      for (const side of [-1, 1]) {
        const t = k / 11,
          zz = z + t * L,
          w = (0.24 + 0.06 * random()) * (1 - t * 0.48),
          P = V(x, roofY(x, zz) + 0.1, zz),
          A = P.clone().add(V(side * w, -0.04, 0.18)),
          B = P.clone().add(V(side * w * 0.82, -0.045, 0.32)),
          C = P.clone().add(V(0, 0.01, 0.13));
        const g = new T.BufferGeometry();
        g.setAttribute(
          "position",
          new T.Float32BufferAttribute(
            [
              ...P.toArray(),
              ...A.toArray(),
              ...B.toArray(),
              ...P.toArray(),
              ...B.toArray(),
              ...C.toArray(),
            ],
            3,
          ),
        );
        g.computeVertexNormals();
        thatch.push(
          painted(
            g,
            ["#93865b", "#9f9063", "#a59668", "#817c50", "#97895c"][
              Math.floor(random() * 5)
            ]!,
          ),
        );
      }
  }
for (let z = -33.15; z > -40; z -= 0.26)
  bamboo(
    [
      10.05,
      baseHeight(12, -33) +
        ((D.y - baseHeight(12, -33)) * (-33 - z)) / 7 -
        0.08,
      z,
    ],
    [
      13.95,
      baseHeight(12, -33) +
        ((D.y - baseHeight(12, -33)) * (-33 - z)) / 7 -
        0.08,
      z,
    ],
    0.07,
  );
for (const x of [10.2, 13.8])
  bamboo([x, baseHeight(x, -33) - 0.08, -33], [x, D.y - 0.12, -40], 0.095);
for (const [name, gs, mat] of [
  ["shelter-timber", wood, 0],
  ["shelter-lashings", lash, 3],
  ["shelter-thatch", thatch, 3],
  ["shelter-deck", deck, 0],
] as const)
  parts.push({ name, geometry: join([...gs]), material: mat });
// Retain the previously colliding supply crate on the southeast deck corner.
// Its visible slatted volume prevents a pre-existing collider becoming an invisible wall.
const supplies = [];
for (const side of [-1, 1])
  for (let k = 0; k < 4; k++) {
    supplies.push(
      painted(
        new T.BoxGeometry(1.12, 0.16, 0.045).translate(
          16,
          1.92 + k * 0.18,
          -41 + side * 0.44,
        ),
        "#8c784f",
      ),
    );
    supplies.push(
      painted(
        new T.BoxGeometry(0.045, 0.16, 0.88).translate(
          16 + side * 0.54,
          1.92 + k * 0.18,
          -41,
        ),
        "#9a865b",
      ),
    );
  }
for (let i = 0; i < 5; i++)
  supplies.push(
    painted(
      new T.BoxGeometry(0.18, 0.055, 0.9).translate(
        15.57 + i * 0.215,
        2.57,
        -41,
      ),
      "#9a865b",
    ),
  );
parts.push({ name: "shelter-supplies", geometry: join(supplies), material: 0 });
// Export one self-contained binary kit; foliage atlas is existing project-owned bitmap.
const canopyFile = readFileSync(
  new URL(
    "artifacts/survivor-camp-prototype/src/assets/camp/canopy-spray.png",
    root,
  ),
);
if (canopyFile.subarray(-8, -4).toString() !== "IEND")
  throw Error("Incomplete canopy PNG; finish texture baking before exporting");
function exportKit(parts: Part[], filename: string) {
  const j: any = {
    asset: {
      version: "2.0",
      generator:
        "Original control-point botanical and handmade shelter mesh authoring",
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
        name: "warm-weathered-bamboo",
        doubleSided: true,
        pbrMetallicRoughness: {
          baseColorFactor: [1, 1, 1, 1],
          roughnessFactor: 0.96,
          metallicFactor: 0,
        },
      },
      {
        name: "folded-canopy-sprays",
        doubleSided: true,
        alphaMode: "MASK",
        alphaCutoff: 0.4,
        pbrMetallicRoughness: {
          baseColorTexture: { index: 0 },
          roughnessFactor: 0.92,
          metallicFactor: 0,
        },
      },
      {
        name: "living-broadleaf",
        doubleSided: true,
        pbrMetallicRoughness: { roughnessFactor: 0.91, metallicFactor: 0 },
      },
      {
        name: "dry-palm-and-fibre",
        doubleSided: true,
        pbrMetallicRoughness: { roughnessFactor: 1, metallicFactor: 0 },
      },
    ],
    textures: [{ source: 0 }],
    images: [],
    samplers: [],
  };
  const bins: Buffer[] = [];
  let off = 0;
  function bufferView(b: Buffer) {
    const id = j.bufferViews.length,
      pad = Buffer.alloc((4 - (b.length % 4)) % 4);
    j.bufferViews.push({ buffer: 0, byteOffset: off, byteLength: b.length });
    bins.push(b, pad);
    off += b.length + pad.length;
    return id;
  }
  function accessor(a: import("three").BufferAttribute, type: string) {
    const ac: any = {
      bufferView: bufferView(
        Buffer.from(a.array.buffer, a.array.byteOffset, a.array.byteLength),
      ),
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
  for (const p of parts) {
    const g = p.geometry,
      attributes: any = {};
    if (!g.hasAttribute("uv")) {
      const a = g.attributes.position!,
        uv = [];
      for (let k = 0; k < a.count; k++)
        uv.push((a.getX(k) + a.getZ(k) * 0.71) * 0.25, a.getY(k) * 0.29);
      g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    }
    for (const [n, key, type] of [
      ["position", "POSITION", "VEC3"],
      ["normal", "NORMAL", "VEC3"],
      ["color", "COLOR_0", "VEC3"],
      ["uv", "TEXCOORD_0", "VEC2"],
    ])
      if (g.hasAttribute(n!))
        attributes[key!] = accessor(
          g.getAttribute(n!) as import("three").BufferAttribute,
          type!,
        );
    const id = j.meshes.length;
    j.meshes.push({
      name: p.name,
      primitives: [
        {
          attributes,
          indices: accessor(g.index!, "SCALAR"),
          material: p.material,
        },
      ],
    });
    j.nodes.push({ name: p.name, mesh: id });
    j.scenes[0].nodes.push(id);
  }
  j.images.push({
    bufferView: bufferView(canopyFile),
    mimeType: "image/png",
  });
  j.buffers[0].byteLength = off;
  let js = Buffer.from(JSON.stringify(j));
  js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 32)]);
  const bin = Buffer.concat(bins),
    head = Buffer.alloc(20),
    bh = Buffer.alloc(8);
  head.writeUInt32LE(0x46546c67);
  head.writeUInt32LE(2, 4);
  head.writeUInt32LE(28 + js.length + bin.length, 8);
  head.writeUInt32LE(js.length, 12);
  head.writeUInt32LE(0x4e4f534a, 16);
  bh.writeUInt32LE(bin.length);
  bh.writeUInt32LE(0x004e4942, 4);
  const glb = Buffer.concat([head, js, bh, bin]);
  const temporary=new URL(filename+".tmp",out);
  writeFileSync(temporary,glb);
  renameSync(temporary,new URL(filename,out));
  writeFileSync(
    new URL(filename.replace(".glb", "-manifest.json"), out),
    JSON.stringify(
      {
        method:
          "Original offline control-point geometry, folded leaf meshes, textured canopy sprays; no Blender or hand-sculpting claim",
        bytes: glb.length,
        sha256: createHash("sha256").update(glb).digest("hex"),
        sourcesSha256:Object.fromEntries([
          'tools/camp/reconstruction/build.mts','tools/camp/reconstruction/textures.py',
          'artifacts/survivor-camp-prototype/src/assets/camp/coastal-tree.glb',
          'artifacts/survivor-camp-prototype/src/assets/camp/canopy-spray.png',
        ].map(file=>[file,createHash('sha256').update(readFileSync(new URL(file,root))).digest('hex')])),
        meshes: parts.map((p) => ({
          name: p.name,
          vertices: p.geometry.attributes.position!.count,
          triangles: p.geometry.index!.count / 3,
        })),
      },
      null,
      2,
    ) + "\n",
  );
  console.log("Reconstruction kit", glb.length, parts.length);
}
exportKit(parts, "reconstruction.glb");
const { MeshoptSimplifier } = await import(
  require.resolve("three/examples/jsm/libs/meshopt_simplifier.module.js")
);
await MeshoptSimplifier.ready;
const lowParts = parts
  .filter((p) => !p.name.endsWith("-near"))
  .map((p) => {
    if (!p.name.startsWith("shelter-")) return p;
    // Thin rope loops disappear entirely under the shelter-wide simplification
    // tolerance. Retain this small detail mesh on mobile: exposed bamboo joints
    // must still read as tied together in close inspection.
    if (p.name === "shelter-lashings") return p;
    const g = p.geometry.clone(),
      sourceIndex = g.index!.array;
    const target =
      Math.floor(
        (sourceIndex.length * 0.48) /
          3,
      ) * 3;
    const idx = MeshoptSimplifier.simplify(
      sourceIndex,
      g.attributes.position!.array,
      3,
      target,
      0.025,
    )[0];
    const [remap, count] = MeshoptSimplifier.compactMesh(idx),
      reduced = new T.BufferGeometry();
    for (const [name, a] of Object.entries(g.attributes)) {
      const arr = new Float32Array(count * a.itemSize);
      for (let i = 0; i < remap.length; i++)
        if (remap[i] !== 0xffffffff)
          for (let k = 0; k < a.itemSize; k++)
            arr[remap[i]! * a.itemSize + k] = a.getComponent(i, k);
      reduced.setAttribute(name, new T.BufferAttribute(arr, a.itemSize));
    }
    reduced.setIndex(new T.BufferAttribute(idx, 1));
    reduced.computeVertexNormals();
    return { ...p, geometry: reduced };
  });
exportKit(lowParts, "reconstruction-low.glb");
