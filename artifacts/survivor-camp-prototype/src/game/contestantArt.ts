import * as THREE from "three";
import { M, V, limb as baseLimb, merge, mk as baseMk, type Geo } from "./geo";

export type CharacterLook = {
  height: number;
  width: number;
  skin: string;
  highlight: string;
  hair: string;
  shirt: string;
  shorts: string;
  headWidth: number;
  jaw: number;
  nose: number;
  hairStyle: "bob" | "long" | "cap" | "hat" | "short";
  beard?: boolean;
  female?: boolean;
};
export const LOOKS: Record<number, CharacterLook> = {
  [-1]: {
    height: 1.04,
    width: 1.05,
    skin: "#ba896d",
    highlight: "#d2a285",
    hair: "#362a24",
    shirt: "#416f92",
    shorts: "#a29171",
    headWidth: 0.98,
    jaw: 1.08,
    nose: 1.04,
    hairStyle: "short",
  },
  11: {
    height: 0.93,
    width: 1.18,
    skin: "#aa7455",
    highlight: "#c38f6e",
    hair: "#201d1c",
    shirt: "#a74e46",
    shorts: "#243e45",
    headWidth: 1.08,
    jaw: 0.94,
    nose: 1.2,
    hairStyle: "bob",
    female: true,
  },
  13: {
    height: 1,
    width: 0.89,
    skin: "#d09b76",
    highlight: "#e1b18d",
    hair: "#38251c",
    shirt: "#4a8184",
    shorts: "#5b375e",
    headWidth: 0.9,
    jaw: 0.78,
    nose: 0.8,
    hairStyle: "long",
    female: true,
  },
  18: {
    height: 0.94,
    width: 1.28,
    skin: "#be865d",
    highlight: "#d7a27a",
    hair: "#382a20",
    shirt: "#aa9874",
    shorts: "#374a63",
    headWidth: 1.08,
    jaw: 1.12,
    nose: 1.25,
    hairStyle: "hat",
    beard: true,
  },
  4: {
    height: 1.055,
    width: 1.08,
    skin: "#c58c65",
    highlight: "#dba47d",
    hair: "#352b23",
    shirt: "#9c4842",
    shorts: "#c0a57b",
    headWidth: 1,
    jaw: 1.02,
    nose: 1.05,
    hairStyle: "cap",
    beard: true,
  },
};

/** Opaque, texture-free surface masks: x = roughness, y = cloth grain strength. */
function surface(g: Geo, color: string) {
  const looks = Object.values(LOOKS);
  const cloth = looks.some((c) => c.shirt === color || c.shorts === color);
  const hair =
    looks.some((c) => c.hair === color) ||
    color === "#60422e" ||
    color === "#40352c";
  const values = new Float32Array(g.getAttribute("position").count * 2);
  for (let i = 0; i < values.length; i += 2) {
    values[i] = cloth ? 0.96 : hair ? 0.84 : 0.72;
    values[i + 1] = cloth ? 0.025 : hair ? 0.012 : 0.004;
  }
  g.setAttribute("heroSurface", new THREE.BufferAttribute(values, 2));
  return g;
}
const mk: typeof baseMk = (...args) => surface(baseMk(...args), args[2]);
const limb: typeof baseLimb = (...args) => surface(baseLimb(...args), args[4]);

/** Swept, tapered locks with an elliptical cross-section; no transparent hair cards. */
function lock(
  points: [number, number, number][],
  width: number,
  color: string,
) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => V(...p)));
  const positions: number[] = [],
    indices: number[] = [],
    frames = curve.computeFrenetFrames(10, false);
  for (let i = 0; i <= 10; i++) {
    const t = i / 10,
      p = curve.getPointAt(t);
    const radius = width * (0.28 + 0.72 * Math.sin(Math.PI * (0.15 + t * 0.8)));
    for (let j = 0; j <= 6; j++) {
      const a = (j / 6) * Math.PI * 2;
      const v = p
        .clone()
        .addScaledVector(frames.normals[i]!, Math.cos(a) * radius)
        .addScaledVector(frames.binormals[i]!, Math.sin(a) * radius * 0.5);
      positions.push(v.x, v.y, v.z);
      if (i < 10 && j < 6) {
        const k = i * 7 + j;
        indices.push(k, k + 1, k + 7, k + 1, k + 8, k + 7);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return mk(g, null, color, 0.008);
}
function weather(g: Geo, id: number) {
  const p = g.getAttribute("position"),
    colors = g.getAttribute("color"),
    mask = g.getAttribute("heroSurface");
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const cloth = mask.getY(i) > 0.02;
    const fold = Math.sin(y * 72 + Math.sin(x * 19) * 1.4) * 0.025;
    const dirt = cloth
      ? Math.max(0, Math.sin(x * 29 + y * 13 + id) * Math.cos(z * 21 - y * 8)) *
        0.16
      : 0.015;
    const fade = cloth ? 0.025 * Math.sin(x * 11 + y * 8) : 0;
    colors.setXYZ(
      i,
      colors.getX(i) * (1 - dirt + fold + fade),
      colors.getY(i) * (1 - dirt * 0.9 + fold + fade),
      colors.getZ(i) * (1 - dirt * 0.8 + fold + fade),
    );
  }
  return g;
}

const oval = (
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  color: string,
  detail = 12,
) =>
  mk(
    new THREE.SphereGeometry(1, detail, Math.round(detail * 0.75)),
    M(x, y, z, 0, 0, 0, sx, sy, sz),
    color,
    0.015,
  );
const box = (
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  color: string,
) => mk(new THREE.BoxGeometry(sx, sy, sz), M(x, y, z), color, 0.025);

/** Authored organic cross-sections; avoids the stacked-cylinder mannequin silhouette. */
function loft(rings: [number, number, number][], color: string) {
  const points: number[] = [],
    indices: number[] = [],
    sides = 16;
  for (const [y, rx, rz] of rings)
    for (let j = 0; j <= sides; j++) {
      const t = (j / sides) * Math.PI * 2;
      const crease =
        1 +
        0.018 * Math.sin(t * 7 + y * 38) +
        0.012 * Math.sin(t * 11 - y * 24);
      points.push(Math.sin(t) * rx * crease, y, Math.cos(t) * rz * crease);
    }
  for (let k = 0; k < rings.length - 1; k++)
    for (let j = 0; j < sides; j++) {
      const a = k * (sides + 1) + j,
        b = a + sides + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return mk(g, null, color, 0.025);
}

export function buildContestant(id: number) {
  const c = LOOKS[id] ?? LOOKS[[11, 13, 18, 4][Math.abs(id) % 4]!]!,
    w = c.width,
    skin = c.skin,
    hi = c.highlight,
    hair = c.hair;
  const female = !!c.female,
    shoulder = (female ? 0.225 : 0.25) * w;
  const torso = [
    loft(
      [
        [0, 0.17 * w, 0.115 * w],
        [0.12, 0.18 * w, 0.13 * w],
        [0.29, (female ? 0.175 : 0.21) * w, 0.14 * w],
        [0.43, 0.225 * w, 0.145 * w],
        [0.52, shoulder, 0.125 * w],
        [0.56, 0.17 * w, 0.11 * w],
        [0.59, 0.075, 0.065],
      ],
      c.shirt,
    ),
  ];
  // Neckline, tailored seams and tied tribe buff belong to each mesh, no labels/textures.
  torso.push(oval(0, 0.565, 0.022, 0.09, 0.045, 0.065, skin));
  for (const s of [-1, 1]) {
    torso.push(
      limb(
        V(s * 0.15 * w, 0.525, 0.116 * w),
        V(s * 0.12 * w, 0.06, 0.125 * w),
        0.006,
        0.006,
        new THREE.Color(c.shirt).multiplyScalar(0.8).getStyle(),
        undefined,
        5,
      ),
    );
    if (!female || id === 11)
      torso.push(
        oval(s * shoulder * 0.87, 0.49, 0, 0.085, 0.065, 0.105, c.shirt),
      );
  }
  if (id !== -1) {
    torso.push(
      mk(
        new THREE.TorusGeometry(0.093, 0.022, 5, 16),
        M(0, 0.585, 0, Math.PI / 2, 0, 0, 1, 1, 0.6),
        "#cf9246",
        0.03,
      ),
    );
    torso.push(
      limb(
        V(0.035, 0.57, 0.08),
        V(0.075, 0.48, 0.13),
        0.028,
        0.012,
        "#cf9246",
        undefined,
        5,
      ),
    );
  }
  const faded = new THREE.Color(c.shirt)
    .lerp(new THREE.Color("#c5b494"), 0.22)
    .getStyle();
  for (let j = 0; j < (id === -1 ? 0 : 3); j++) {
    const y = 0.055 + j * 0.043;
    torso.push(
      lock(
        [
          [-0.16 * w, y, 0.09 * w],
          [-0.11 * w, y + 0.012, 0.113 * w],
          [-0.055 * w, y + 0.016, 0.131 * w],
        ],
        0.0025,
        faded,
      ),
    );
  }
  for (const side of [-1, 1]) {
    if (id === -1) {
      const shape = new THREE.BufferGeometry();
      const v = [
        side * 0.025,
        0.57,
        0.08,
        side * 0.12,
        0.535,
        0.12,
        side * 0.06,
        0.47,
        0.157,
      ];
      if (side > 0) {
        const a = v.splice(0, 3);
        v.splice(3, 0, ...a);
      }
      shape.setAttribute("position", new THREE.Float32BufferAttribute(v, 3));
      shape.computeVertexNormals();
      torso.push(mk(shape, null, c.shirt, 0.005));
    }
    // Worn binding at the armhole / rolled sleeve.
    torso.push(
      limb(
        V(side * shoulder * 0.78, 0.515, 0.07),
        V(side * shoulder, 0.467, 0.06),
        0.009,
        0.008,
        faded,
        undefined,
        6,
      ),
    );
  }
  const pelvis = [
    loft(
      [
        [-0.11, 0.2 * w, 0.135 * w],
        [0, 0.2 * w, 0.14 * w],
        [0.04, 0.18 * w, 0.135 * w],
      ],
      c.shorts,
    ),
    box(0, 0.025, 0.142 * w, 0.3 * w, 0.022, 0.012, "#8e7357"),
  ];
  const head: Geo[] = [
    limb(V(0, -0.02, 0), V(0, 0.1, 0), 0.064, 0.07, skin, undefined, 10),
  ];
  const skull = new THREE.SphereGeometry(0.195, 28, 22);
  const pos = skull.attributes.position!;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i),
      y = pos.getY(i),
      z = pos.getZ(i);
    x *=
      c.headWidth *
      (y < -0.03 ? c.jaw + ((1 - c.jaw) * (y + 0.195)) / 0.165 : 1);
    y = y * 1.19 + 0.23;
    if (z > 0) {
      z *= 0.86;
      // Cheek plane and brow ridge, sculpted into the base mesh.
      const cheek = Math.exp(
        -((Math.abs(x) - 0.095) ** 2 / 0.002 + (y - 0.21) ** 2 / 0.003),
      );
      z += cheek * 0.009;
    }
    pos.setXYZ(i, x, y, z);
  }
  skull.computeVertexNormals();
  const face = mk(skull, null, hi, 0.005);
  const fp = face.getAttribute("position"),
    fc = face.getAttribute("color");
  const flush = new THREE.Color(skin),
    beardColor = new THREE.Color(id === 18 ? "#534336" : "#806954");
  for (let i = 0; i < fp.count; i++) {
    const x = fp.getX(i),
      y = fp.getY(i),
      z = fp.getZ(i);
    const tone = new THREE.Color().fromBufferAttribute(fc, i);
    const warmth =
      Math.exp(
        -((Math.abs(x) - 0.11) ** 2 / 0.002 + (y - 0.215) ** 2 / 0.002),
      ) * 0.23;
    tone.lerp(flush, warmth);
    if (c.beard && z > 0 && y < 0.2) {
      const beard =
        Math.min(1, Math.max(0, (0.205 - y) / 0.065)) *
        (id === 18 ? 0.9 : 0.46);
      tone.lerp(beardColor, beard);
    }
    fc.setXYZ(i, tone.r, tone.g, tone.b);
  }
  head.push(face);
  // Sculpted cheeks, jaw, brow, eyelids, iris and projected nose. No billboard face.
  for (const s of [-1, 1]) {
    head.push(
      oval(s * 0.185 * c.headWidth, 0.237, -0.006, 0.027, 0.05, 0.025, skin),
    );
    head.push(
      oval(
        s * 0.192 * c.headWidth,
        0.235,
        0.012,
        0.01,
        0.026,
        0.009,
        "#a26a50",
        8,
      ),
    );
    head.push(
      oval(s * 0.072 * c.headWidth, 0.277, 0.15, 0.044, 0.021, 0.014, skin),
    );
    head.push(
      oval(s * 0.072 * c.headWidth, 0.278, 0.16, 0.029, 0.01, 0.007, "#eee1ca"),
    );
    head.push(
      oval(
        s * 0.072 * c.headWidth,
        0.278,
        0.167,
        0.011,
        0.011,
        0.004,
        "#493729",
        10,
      ),
    );
    head.push(
      oval(
        s * 0.072 * c.headWidth,
        0.279,
        0.171,
        0.007,
        0.01,
        0.003,
        "#1e1d19",
        8,
      ),
    );
    head.push(
      oval(
        s * 0.068 * c.headWidth,
        0.284,
        0.174,
        0.0035,
        0.0035,
        0.002,
        "#fff0cf",
        6,
      ),
    );
    head.push(
      limb(
        V(s * 0.043, 0.313, 0.157),
        V(s * 0.107, 0.307 + (id === 18 ? 0.006 : 0), 0.143),
        0.01,
        0.007,
        hair,
        undefined,
        6,
      ),
    );
  }
  head.push(oval(0, 0.242, 0.17, 0.025 * c.nose, 0.052, 0.025, hi));
  head.push(oval(0, 0.216, 0.192, 0.034 * c.nose, 0.024, 0.036, hi));
  for (const s of [-1, 1])
    head.push(
      oval(s * 0.026 * c.nose, 0.204, 0.187, 0.013, 0.007, 0.01, "#94634f", 8),
    );
  head.push(oval(0, 0.119, 0.131, 0.058, 0.028, 0.02, hi));
  head.push(
    limb(
      V(-0.049, 0.156, 0.155),
      V(0.049, 0.156, 0.155),
      0.007,
      0.006,
      female ? "#995e52" : "#885547",
      undefined,
      8,
    ),
  );
  head.push(
    oval(0, 0.145, 0.158, 0.038, 0.006, 0.005, female ? "#ba7f6c" : "#b27b60"),
  );
  if (c.beard) {
    for (const side of [-1, 1])
      head.push(
        lock(
          [
            [side * 0.049, 0.174, 0.161],
            [side * 0.028, 0.18, 0.174],
            [side * 0.012, 0.176, 0.178],
          ],
          id === 18 ? 0.008 : 0.004,
          id === 18 ? "#534336" : "#806954",
        ),
      );
  }
  if (id === -1) {
    for (const side of [-1, 1]) {
      torso.push(box(side * 0.115, 0.29, 0.147, 0.12, 0.1, 0.018, "#496c88"));
      torso.push(box(side * 0.115, 0.345, 0.153, 0.13, 0.025, 0.02, "#577e94"));
    }
    for (let y = 0.16; y < 0.51; y += 0.08)
      torso.push(oval(0, y, 0.155, 0.012, 0.012, 0.007, "#d9cdb3", 6));
  }
  const hairParts: Geo[] = [];
  if (female) {
    const cap = new THREE.SphereGeometry(
      0.204,
      24,
      14,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.57,
    );
    const cp = cap.getAttribute("position");
    for (let i = 0; i < cp.count; i++) {
      const x = cp.getX(i),
        y = cp.getY(i),
        z = cp.getZ(i);
      // Lift the front hairline clear of the brow; leave fuller temples/back.
      cp.setXYZ(
        i,
        x * c.headWidth,
        y * 1.15 +
          0.238 +
          Math.max(0, 0.13 - y) * 0.94 * Math.max(0, z / 0.204),
        z - 0.02,
      );
    }
    cap.computeVertexNormals();
    hairParts.push(mk(cap, null, hair, 0.008));
    for (const side of [-1, 1])
      for (let j = 0; j < 7; j++) {
        const back = j / 6,
          length = id === 13 ? 0.53 : 0.3,
          xx = side * (0.153 + 0.022 * Math.sin(j * 1.1)) * c.headWidth;
        const z = 0.012 - back * 0.19;
        hairParts.push(
          lock(
            [
              [side * 0.075, 0.44, -0.02 - back * 0.08],
              [xx, 0.34, z],
              [xx + side * 0.015, 0.17, z - 0.01],
              [
                xx + side * (id === 13 ? 0.025 : -0.02),
                0.34 - length,
                z - 0.035,
              ],
            ],
            0.037,
            j % 3 === 0 ? (id === 13 ? "#60422e" : "#40352c") : hair,
          ),
        );
      }
    for (let j = 0; j < 7; j++) {
      const x = (j - 3) * 0.046 * c.headWidth,
        len = id === 13 ? 0.49 : 0.29;
      hairParts.push(
        lock(
          [
            [x * 0.6, 0.41, -0.12],
            [x, 0.29, -0.197],
            [x, 0.08, -0.213],
            [x * 0.92, 0.34 - len, -0.188],
          ],
          0.041,
          j % 3 === 0 ? "#40352c" : hair,
        ),
      );
    }
    // Asymmetric side part: grouped curved forms rather than a helmet fringe.
    for (let j = 0; j < 5; j++)
      hairParts.push(
        lock(
          [
            [-0.09 + j * 0.016, 0.44, 0.004],
            [0.015 + j * 0.019, 0.445, 0.08],
            [0.13 + j * 0.01, 0.365, 0.13],
            [0.177, 0.265, 0.033 - j * 0.014],
          ],
          0.018,
          j % 2 ? hair : id === 13 ? "#60422e" : "#40352c",
        ),
      );
  } else {
    if (id === -1) {
      const cap = new THREE.SphereGeometry(
        0.202,
        22,
        14,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.55,
      );
      const cp = cap.getAttribute("position");
      for (let i = 0; i < cp.count; i++) {
        const x = cp.getX(i),
          y = cp.getY(i),
          z = cp.getZ(i);
        cp.setXYZ(
          i,
          x * c.headWidth,
          0.25 + y * 1.14 + Math.max(0, 0.1 - y) * 0.9 * Math.max(0, z / 0.202),
          z - 0.015,
        );
      }
      cap.computeVertexNormals();
      hairParts.push(mk(cap, null, hair, 0.005));
    } else {
      hairParts.push(
        mk(
          new THREE.SphereGeometry(
            0.202,
            16,
            10,
            0,
            Math.PI * 2,
            0,
            Math.PI * 0.44,
          ),
          M(0, 0.25, -0.015, 0, 0, 0, c.headWidth, 1.14, 1),
          id === 18 ? skin : hair,
          0.025,
        ),
      );
    }
    if (id === -1) {
      for (let j = 0; j < 11; j++) {
        const x = (j - 5) * 0.032;
        hairParts.push(
          lock(
            [
              [x, 0.37, 0.17],
              [x - 0.02, 0.496 - Math.abs(x) * 0.4, 0.1],
              [x + 0.02, 0.49 - Math.abs(x) * 0.4, -0.03],
              [x + 0.04, 0.37, -0.17],
            ],
            0.024,
            j % 3 === 0 ? "#49362a" : hair,
          ),
        );
      }
      for (const side of [-1, 1])
        hairParts.push(
          lock(
            [
              [side * 0.17, 0.35, -0.04],
              [side * 0.188, 0.29, -0.045],
              [side * 0.177, 0.21, -0.055],
            ],
            0.025,
            "#40352c",
          ),
        );
    }
    if (id === 4) {
      hairParts.push(
        mk(
          new THREE.SphereGeometry(
            0.216,
            18,
            10,
            0,
            Math.PI * 2,
            0,
            Math.PI / 2,
          ),
          M(0, 0.337, -0.02, -0.14, 0, 0, 1.03, 0.7, 1.03),
          "#25334d",
          0.025,
        ),
      );
      hairParts.push(oval(0, 0.331, 0.17, 0.177, 0.018, 0.17, "#25334d"));
      for (const side of [-1, 1])
        hairParts.push(
          lock(
            [
              [0, 0.484, -0.015],
              [side * 0.12, 0.448, 0.04],
              [side * 0.19, 0.37, 0.065],
            ],
            0.0028,
            "#667084",
          ),
        );
      // Original stitched monogram, rendered as geometry rather than a texture/logo asset.
      hairParts.push(
        limb(
          V(-0.024, 0.37, 0.185),
          V(-0.024, 0.423, 0.157),
          0.0045,
          0.0045,
          "#e3b8a2",
          undefined,
          5,
        ),
      );
      for (const yy of [0.382, 0.407])
        hairParts.push(
          mk(
            new THREE.TorusGeometry(0.013, 0.004, 4, 10, Math.PI),
            M(-0.024, yy, 0.179, 0, 0, -Math.PI / 2),
            "#e3b8a2",
            0.01,
          ),
        );
    } else if (id === 18) {
      hairParts.push(oval(0, 0.379, -0.015, 0.29, 0.019, 0.25, "#6f5737"));
      hairParts.push(
        loft(
          [
            [0.38, 0.205, 0.176],
            [0.48, 0.185, 0.155],
            [0.53, 0.16, 0.14],
            [0.535, 0.03, 0.1],
          ],
          "#8a704b",
        ),
      );
      hairParts.push(
        mk(
          new THREE.TorusGeometry(0.194, 0.019, 5, 18),
          M(0, 0.405, 0, Math.PI / 2, 0, 0, 1, 0.85, 1),
          "#42372d",
          0.03,
        ),
      );
    }
  }
  head.push(...hairParts);
  const armU = [
    oval(0, -0.025, 0, 0.071 * w, 0.07, 0.068 * w, skin),
    loft(
      [
        [-0.285, 0.048 * w, 0.047 * w],
        [-0.2, 0.058 * w, 0.057 * w],
        [-0.1, 0.072 * w, 0.069 * w],
        [-0.02, 0.072 * w, 0.068 * w],
      ],
      skin,
    ),
  ];
  if (!female || id === 11)
    armU.push(
      loft(
        [
          [-0.11, 0.078 * w, 0.078 * w],
          [0, 0.084 * w, 0.079 * w],
        ],
        c.shirt,
      ),
    );
  const forearm = [
    oval(0, 0, 0, 0.049 * w, 0.05, 0.05 * w, skin),
    loft(
      [
        [-0.255, 0.034 * w, 0.032 * w],
        [-0.18, 0.04 * w, 0.037 * w],
        [-0.075, 0.052 * w, 0.046 * w],
        [0, 0.049 * w, 0.047 * w],
      ],
      skin,
    ),
  ];
  const hand = [oval(0, -0.29, 0.008, 0.043 * w, 0.056, 0.025, hi)];
  // Four fingers and an opposing thumb, shaped as short tapered joints.
  for (let j = 0; j < 4; j++) {
    const x = (j - 1.5) * 0.017 * w,
      len = [0.046, 0.055, 0.051, 0.04][j]!;
    hand.push(
      limb(
        V(x, -0.315, 0.014),
        V(x, -0.315 - len, 0.03),
        0.0095,
        0.007,
        hi,
        undefined,
        6,
      ),
    );
  }
  hand.push(
    limb(
      V(-0.035 * w, -0.275, 0.006),
      V(-0.067 * w, -0.318, 0.035),
      0.014,
      0.009,
      skin,
      hi,
      6,
    ),
  );
  forearm.push(
    ...hand,
    mk(
      new THREE.TorusGeometry(0.039 * w, 0.009, 4, 10),
      M(0, -0.245, 0, Math.PI / 2),
      "#c59b51",
      0.02,
    ),
  );
  const thigh = [
    limb(
      V(0, 0, 0),
      V(0, -0.25, 0),
      0.106 * w,
      0.086 * w,
      c.shorts,
      undefined,
      12,
    ),
    limb(
      V(0, -0.24, 0),
      V(0, -0.43, 0),
      0.084 * w,
      0.061 * w,
      id === 13 ? c.shorts : skin,
      id === 13 ? c.shorts : hi,
      12,
    ),
  ];
  if (id === 4 || id === -1)
    thigh.push(box(0.045, -0.135, 0.087 * w, 0.105, 0.11, 0.025, c.shorts));
  const shin = [
    oval(0, 0, 0, 0.064 * w, 0.062, 0.061, id === 13 ? c.shorts : hi),
    limb(
      V(0, -0.01, 0),
      V(0, -0.18, 0),
      0.063 * w,
      0.058 * w,
      id === 13 ? c.shorts : skin,
      undefined,
      12,
    ),
    limb(
      V(0, -0.18, 0),
      V(0, -0.395, 0),
      0.058 * w,
      0.038 * w,
      id === 13 ? c.shorts : skin,
      id === 13 ? c.shorts : hi,
      12,
    ),
  ];
  const foot = [
    oval(0, -0.005, 0.045, 0.06 * w, 0.04, 0.125, skin),
    oval(0, -0.034, 0.043, 0.066 * w, 0.018, 0.139, "#66513d"),
    box(0, 0.009, 0.051, 0.12 * w, 0.015, 0.035, "#3e342b"),
  ];
  for (let j = 0; j < 5; j++)
    foot.push(
      oval(
        (j - 2) * 0.022 * w,
        -0.005,
        0.143 + (j === 0 ? 0.012 : -0.003 * j),
        0.012 * w,
        0.018,
        0.027 - j * 0.002,
        hi,
        8,
      ),
    );
  return {
    torso: weather(merge(torso), id),
    pelvis: weather(merge(pelvis), id),
    head: weather(merge(head), id),
    armU: weather(merge(armU), id),
    forearm: weather(merge(forearm), id),
    thigh: weather(merge(thigh), id),
    shin: weather(merge(shin), id),
    foot: weather(merge(foot), id),
    shoulder,
    look: c,
  };
}
