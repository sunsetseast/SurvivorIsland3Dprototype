import * as T from "three";
import {
  ARRIVAL,
  offsetPath,
  COUNCIL,
  TOWERS,
  approachSurface,
  tribalHeight,
} from "./layout";
import type { MaterialKey } from "./surfaces";

type Vec = [number, number, number];
/** The same batching writer serves every authored component; no per-carving draw calls. */
export type MasonryWriter = {
  add: (
    g: T.BufferGeometry,
    key: MaterialKey,
    p: Vec,
    scale?: Vec,
    rotation?: Vec,
    block?: boolean,
    variation?: number,
  ) => void;
  box: (
    key: MaterialKey,
    p: Vec,
    size: Vec,
    rotation?: Vec,
    block?: boolean,
  ) => void;
  beam: (
    a: Vec,
    b: Vec,
    radius: number,
    key?: MaterialKey,
    block?: boolean,
    endRadius?: number,
  ) => void;
  curve: (
    points: Vec[],
    radius: number,
    key?: MaterialKey,
    block?: boolean,
  ) => void;
};

/** Recessed, cruciform cross-sections give the prang its vertical ribs and shadow pockets. */
export function prangGeometry(height: number, radius: number) {
  const outline = [
    [-1, -0.56],
    [-0.68, -0.56],
    [-0.68, -1],
    [0.68, -1],
    [0.68, -0.56],
    [1, -0.56],
    [1, 0.56],
    [0.68, 0.56],
    [0.68, 1],
    [-0.68, 1],
    [-0.68, 0.56],
    [-1, 0.56],
  ];
  const profile = [
    [0, 1],
    [0.05, 1],
    [0.07, 0.88],
    [0.1, 0.88],
    [0.12, 0.76],
    [0.31, 0.76],
    [0.33, 0.86],
    [0.36, 0.77],
    [0.4, 0.74],
    [0.42, 0.78],
    [0.46, 0.66],
    [0.48, 0.69],
    [0.53, 0.59],
    [0.55, 0.62],
    [0.6, 0.49],
    [0.62, 0.52],
    [0.67, 0.4],
    [0.69, 0.42],
    [0.74, 0.31],
    [0.76, 0.33],
    [0.81, 0.23],
    [0.83, 0.25],
    [0.88, 0.15],
    [0.9, 0.17],
    [0.95, 0.075],
    [1, 0.015],
  ];
  const positions: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  for (const [y, r] of profile)
    for (let i = 0; i <= outline.length; i++) {
      const [x, z] = outline[i % outline.length]!;
      const chip =
        y! > 0.4 && ((i % outline.length) + Math.round(y! * 100) * 3) % 19 === 0
          ? 0.9
          : 1;
      positions.push(
        x! * r! * radius * chip,
        y! * height,
        z! * r! * radius * chip,
      );
      uv.push((i / outline.length) * 5, y! * height * 0.35);
    }
  const stride = outline.length + 1;
  for (let k = 0; k < profile.length - 1; k++)
    for (let j = 0; j < outline.length; j++) {
      const a = k * stride + j,
        b = a + stride;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

function petalGeometry(w: number, h: number, depth: number) {
  const s = new T.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(-w * 0.7, h * 0.2, -w * 0.55, h * 0.65, 0, h);
  s.bezierCurveTo(w * 0.55, h * 0.65, w * 0.7, h * 0.2, 0, 0);
  return new T.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelSize: 0.025,
    bevelThickness: 0.02,
    bevelSegments: 1,
    curveSegments: 5,
  });
}

/** Four-sided door surround: brick reveals, stone jambs, pointed carved lintel. */
function door(
  w: MasonryWriter,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  yaw = 0,
) {
  const { box, add } = w,
    c = Math.cos(yaw),
    s = Math.sin(yaw);
  const p = (u: number, v: number, d = 0): Vec => [
    x + u * c + d * s,
    y + v,
    z - u * s + d * c,
  ];
  for (const side of [-1, 1]) {
    box(
      "brick",
      p(side * (width * 0.5 + 0.24), height * 0.46),
      [0.48, height * 0.92, 0.58],
      [0, yaw, 0],
    );
    box(
      "trim",
      p(side * (width * 0.5 + 0.06), height * 0.45, 0.12),
      [0.13, height * 0.9, 0.24],
      [0, yaw, 0],
    );
    for (let j = 0; j < 4; j++)
      add(
        petalGeometry(0.14, 0.27, 0.05),
        "plaster",
        p(side * (width * 0.5 + 0.25), 0.2 + j * height * 0.18, 0.33),
        [1, 1, 1],
        [0, yaw, 0],
        false,
      );
  }
  box("trim", p(0, height * 0.92), [width + 0.75, 0.24, 0.72], [0, yaw, 0]);
  add(
    petalGeometry(width * 0.68, height * 0.37, 0.18),
    "plaster",
    p(0, height * 0.94, 0.2),
    [1, 1, 1],
    [0, yaw, 0],
  );
}

function tower(w: MasonryWriter, t: (typeof TOWERS)[number]) {
  const { add, box, curve } = w,
    { x, z, height: h, radius: r } = t,
    y = tribalHeight(x, z);
  for (let i = 0; i < 3; i++) {
    const wide = r * (2.55 - i * 0.19);
    box(
      i === 1 ? "trim" : "brick",
      [x, y + 0.19 + i * 0.3, z],
      [wide, 0.36, wide],
    );
  }
  if (t.kind === "prang") {
    add(
      prangGeometry(h - 1, r),
      "brick",
      [x, y + 0.85, z],
      [1, 1, 1],
      [0, 0, 0],
      false,
    );
    for (const side of [-1, 1]) {
      const patch = new T.Shape();
      patch.moveTo(0, 0);
      patch.lineTo(0.6, 0.1);
      patch.lineTo(0.48, 0.72);
      patch.lineTo(0.65, 1.2);
      patch.lineTo(0.38, 1.1);
      patch.lineTo(0.41, 2);
      patch.lineTo(0.08, 1.85);
      patch.lineTo(-0.12, 1.15);
      patch.closePath();
      add(
        new T.ExtrudeGeometry(patch, { depth: 0.05, bevelEnabled: false }),
        "plaster",
        [x + side * r * 0.54, y + h * 0.14, z + r * 0.765],
        [r * 0.48, h * 0.075, 1],
        [0, 0, side * 0.02],
        false,
      );
    }
    // Recessed false doors on all four faces; no sacred imagery is used as set dressing.
    for (let side = 0; side < 4; side++) {
      const a = (side * Math.PI) / 2;
      const dx = Math.sin(a),
        dz = Math.cos(a),
        px = x + dx * r * 0.765,
        pz = z + dz * r * 0.765;
      box(
        "dark",
        [px, y + h * 0.21, pz],
        [r * 0.62, h * 0.15, 0.09],
        [0, a, 0],
        false,
      );
      door(w, px, y + h * 0.13, pz, r * 0.58, h * 0.18, a);
      // Stucco remains hug the masonry; intentional gaps expose brick underneath.
      for (let j = 0; j < 6; j++) {
        const u = (j - 2.5) * r * 0.27;
        if (j === side || j === (side + 3) % 6) continue;
        box(
          "plaster",
          [px + Math.cos(a) * u, y + h * 0.32, pz - Math.sin(a) * u],
          [r * 0.25, 0.18, 0.17],
          [0, a, 0],
          false,
        );
      }
      for (let tier = 0; tier < 6; tier++) {
        const f = tier / 6,
          rad = r * (0.72 - f * 0.52),
          yy = y + h * (0.42 + f * 0.43);
        for (let rib = -1; rib <= 1; rib++)
          add(
            petalGeometry(0.17 * (1 - f * 0.5), 0.48 * (1 - f * 0.4), 0.12),
            "plaster",
            [
              x + dx * rad + Math.cos(a) * rib * rad * 0.65,
              yy,
              z + dz * rad - Math.sin(a) * rib * rad * 0.65,
            ],
            [1, 1, 1],
            [0, a, 0],
            false,
          );
      }
    }
  } else {
    // Bell-shaped chedi, square harmika and annulated spire: distinct from a prang.
    const profile = [
      [0, 0.92],
      [0.04, 1],
      [0.08, 0.93],
      [0.1, 0.76],
      [0.16, 0.7],
      [0.2, 0.83],
      [0.23, 0.88],
      [0.3, 0.79],
      [0.38, 0.59],
      [0.45, 0.39],
      [0.49, 0.29],
      [0.51, 0.3],
    ];
    add(
      new T.LatheGeometry(
        profile.map(([a, b]) => new T.Vector2(b! * r, a! * h)),
        32,
      ),
      "plaster",
      [x, y + 0.9, z],
      [1, 1, 1],
      [0, 0, 0],
      false,
    );
    box("brick", [x, y + 0.9 + h * 0.53, z], [r * 0.6, h * 0.07, r * 0.6]);
    const spire: T.Vector2[] = [];
    for (let i = 0; i < 12; i++) {
      const a = i / 12,
        rr = r * (0.27 * (1 - a) + 0.015);
      spire.push(
        new T.Vector2(rr, h * (0.57 + a * 0.4)),
        new T.Vector2(rr * 0.78, h * (0.585 + a * 0.4)),
      );
    }
    spire.push(new T.Vector2(0.015, h));
    add(
      new T.LatheGeometry(spire, 20),
      "trim",
      [x, y + 0.9, z],
      [1, 1, 1],
      [0, 0, 0],
      false,
    );
  }
  // Surviving buttresses, broken brick edge and a restrained vine rooted in a crack.
  for (const side of [-1, 1]) {
    box(
      "brick",
      [x + side * r * 0.86, y + h * 0.13, z + r * 0.45],
      [r * 0.35, h * 0.18, r * 0.8],
    );
    for (let i = 0; i < 4; i++)
      box(
        "brick",
        [x + side * r * 0.72 + i * 0.15, y + 0.1 + i * 0.06, z + r * 1.2],
        [0.45, 0.22, 0.3],
        [0.06, i * 0.7, 0.1],
        false,
      );
  }
  curve(
    [
      [x + r * 0.7, y + h * 0.36, z + r * 0.8],
      [x + r * 0.65, y + h * 0.22, z + r * 0.85],
      [x + r * 0.85, y + h * 0.1, z + r * 0.95],
    ],
    0.055,
    "moss",
    false,
  );
}

/** Curved pitched roof with flared eaves; a pavilion is not a stack of conical pagodas. */
function roof(
  w: MasonryWriter,
  x: number,
  z: number,
  y: number,
  width: number,
  length: number,
  rise: number,
) {
  const { add, beam, curve } = w;
  for (const side of [-1, 1]) {
    const positions: number[] = [],
      uv: number[] = [],
      index: number[] = [];
    const height = (t: number) => y + rise * (1 - t) ** 1.6 + 0.25 * t ** 8;
    for (let i = 0; i <= 12; i++)
      for (const end of [-1, 1]) {
        const t = i / 12;
        positions.push(
          x + (side * t * width) / 2,
          height(t),
          z + (end * length) / 2,
        );
        uv.push(t * 4, (end + 1) * 2);
      }
    for (let i = 0; i < 12; i++) {
      const a = i * 2;
      index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    g.setIndex(index);
    g.computeVertexNormals();
    add(g, "roof", [0, 0, 0], [1, 1, 1], [0, 0, 0], true);
    for (const end of [-1, 1]) {
      const points: Vec[] = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        points.push([
          x + (side * t * width) / 2,
          height(t) + 0.07,
          z + (end * length) / 2,
        ]);
      }
      curve(points, 0.075, "trim", false);
      // Slender upturned bargeboard terminals, integrated with the eave line.
      const ex = x + (side * width) / 2,
        ez = z + (end * length) / 2;
      curve(
        [
          [ex, y + 0.25, ez],
          [ex + side * 0.22, y + 0.5, ez],
          [ex + side * 0.25, y + 0.85, ez],
        ],
        0.065,
        "trim",
        false,
      );
    }
    for (let j = 1; j < 12; j++) {
      const zz = z - length / 2 + (j * length) / 12;
      const points: Vec[] = [];
      for (let i = 0; i <= 7; i++) {
        const t = i / 7;
        points.push([x + (side * t * width) / 2, height(t) + 0.018, zz]);
      }
      curve(points, 0.022, "dark", false);
    }
  }
  beam(
    [x, y + rise, z - length / 2 - 0.15],
    [x, y + rise, z + length / 2 + 0.15],
    0.09,
    "trim",
    false,
  );
  for (const end of [-1, 1])
    curve(
      [
        [x, y + rise, z + (end * length) / 2],
        [x, y + rise + 0.5, z + end * (length / 2 + 0.1)],
        [x, y + rise + 0.95, z + end * (length / 2 + 0.45)],
      ],
      0.07,
      "trim",
      false,
    );
}

function elephant(w: MasonryWriter, x: number, z: number, yaw: number) {
  const { add, box, curve } = w,
    y = tribalHeight(x, z),
    c = Math.cos(yaw),
    s = Math.sin(yaw);
  const p = (u: number, v: number, d: number): Vec => [
    x + u * c + d * s,
    y + v,
    z - u * s + d * c,
  ];
  box("brick", p(0, 0.22, 0), [2.7, 0.44, 3.7], [0, yaw, 0]);
  box("trim", p(0, 0.48, 0), [2.85, 0.14, 3.85], [0, yaw, 0]);
  const oval = (
    u: number,
    v: number,
    d: number,
    scale: Vec,
    key: MaterialKey = "stone",
  ) =>
    add(
      new T.SphereGeometry(1, 24, 16),
      key,
      p(u, v, d),
      scale,
      [0, yaw, 0],
      false,
    );
  oval(0, 1.92, 0.2, [0.83, 1.07, 1.35]);
  // Massive shoulder and sloping back of an Asian elephant, carved from one stone volume.
  oval(0, 2.28, -0.45, [0.73, 0.84, 0.75]);
  for (const side of [-1, 1])
    for (const end of [-1, 1]) {
      oval(side * 0.57, 1.12, 0.2 + end * 0.75, [0.28, 0.65, 0.32]);
      oval(side * 0.57, 0.66, 0.12 + end * 0.75, [0.31, 0.16, 0.36], "trim");
      for (let i = -1; i <= 1; i++)
        oval(
          side * 0.57 + i * 0.09,
          0.69,
          0.12 + end * 0.75 - 0.3,
          [0.035, 0.06, 0.025],
          "plaster",
        );
    }
  oval(0, 2.35, -0.92, [0.53, 0.69, 0.63]);
  oval(0, 2.72, -0.95, [0.39, 0.34, 0.4]);
  for (const side of [-1, 1]) {
    // Broad, scalloped fan ears with carved inner folds, rather than small spheres.
    const ear = new T.Shape();
    ear.moveTo(0, 0);
    ear.bezierCurveTo(side * 0.68, 0.22, side * 0.74, -0.1, side * 0.57, -0.72);
    ear.bezierCurveTo(side * 0.3, -1.05, side * 0.15, -0.45, 0, 0);
    add(
      new T.ExtrudeGeometry(ear, {
        depth: 0.16,
        bevelEnabled: true,
        bevelSize: 0.06,
        bevelThickness: 0.06,
        bevelSegments: 2,
        curveSegments: 7,
      }),
      "stone",
      p(side * 0.4, 2.68, -0.74),
      [1, 1, 1],
      [0, yaw, side * 0.08],
      false,
    );
    curve(
      [
        p(side * 0.58, 2.65, -0.83),
        p(side * 0.98, 2.4, -0.85),
        p(side * 0.92, 1.99, -0.83),
      ],
      0.025,
      "dark",
      false,
    );
    oval(side * 0.42, 2.4, -1.42, [0.037, 0.025, 0.018], "dark");
    curve(
      [
        p(side * 0.29, 1.95, -1.42),
        p(side * 0.4, 1.65, -1.75),
        p(side * 0.43, 1.72, side < 0 ? -1.94 : -2.05),
      ],
      0.06,
      "plaster",
      false,
    );
  }
  const path = new T.CatmullRomCurve3([
    new T.Vector3(...p(0, 2.23, -1.48)),
    new T.Vector3(...p(0, 1.6, -1.75)),
    new T.Vector3(...p(0, 0.92, -1.95)),
    new T.Vector3(...p(0, 0.95, -2.25)),
    new T.Vector3(...p(0, 1.22, -2.32)),
  ]);
  const g = new T.TubeGeometry(path, 24, 1, 12, false),
    a = g.getAttribute("position");
  for (let i = 0; i < a.count; i++) {
    const t = Math.floor(i / 13) / 24,
      center = path.getPointAt(t),
      v = new T.Vector3(a.getX(i), a.getY(i), a.getZ(i));
    v.sub(center)
      .multiplyScalar(0.23 - t * 0.12)
      .add(center);
    a.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  add(g, "stone", [0, 0, 0], [1, 1, 1], [0, 0, 0], false);
  for (let j = 0; j < 8; j++) {
    const t = 0.15 + j * 0.07,
      center = path.getPointAt(t);
    // Shallow trunk folds avoid metal-looking ornamental rings.
    curve(
      [
        [center.x - 0.12, center.y + 0.025, center.z - 0.14],
        [center.x, center.y, center.z - 0.19],
        [center.x + 0.12, center.y + 0.025, center.z - 0.14],
      ],
      0.012,
      "dark",
      false,
    );
  }
  curve(
    [p(0, 2.18, 1.35), p(0.12, 1.55, 1.6), p(0.25, 1.1, 1.55)],
    0.055,
    "stone",
    false,
  );
}

function approach(w: MasonryWriter) {
  const { add, box, beam, curve } = w;
  // Stair treads, landings, bridge deck and descent use the same exact heights as the controller.
  for (let i = 1; i < 6; i++) {
    const a = ARRIVAL[i]!,
      b = ARRIVAL[i + 1]!,
      dx = b.x - a.x,
      dz = b.z - a.z,
      len = Math.hypot(dx, dz),
      yaw = Math.atan2(-dz, dx);
    const count = i === 2 || i === 3 ? 6 : Math.ceil(len / 0.5),
      nx = -dz / len,
      nz = dx / len;
    for (let j = 0; j < count; j++) {
      const t = (j + 0.5) / count,
        x = a.x + dx * t,
        z = a.z + dz * t,
        h = approachSurface(x, z).height;
      box(
        i === 4 ? "trim" : "stone",
        [x, h - 0.13, z],
        [len / count + 0.025, 0.26, 2.8],
        [0, yaw, 0],
        false,
      );
    }
    for (const side of [-1, 1]) {
      if (i === 5 && side === 1) continue; // Open landing branches to the existing jury approach.
      const edgeA = offsetPath(ARRIVAL, i, side * 1.65),
        edgeB = offsetPath(ARRIVAL, i + 1, side * 1.65);
      const pts: Vec[] = [];
      for (let j = 0; j <= 18; j++) {
        const t = j / 18,
          x = a.x + dx * t,
          z = a.z + dz * t;
        pts.push([
          edgeA.x + (edgeB.x - edgeA.x) * t,
          approachSurface(x, z).height + 0.64,
          edgeA.z + (edgeB.z - edgeA.z) * t,
        ]);
      }
      curve(pts, i === 2 || i === 3 ? 0.18 : 0.11, "stone", false);
      for (let j = 0; j <= 6; j++) {
        const t = j / 6,
          x = edgeA.x + (edgeB.x - edgeA.x) * t,
          z = edgeA.z + (edgeB.z - edgeA.z) * t,
          h = approachSurface(a.x + dx * t, a.z + dz * t).height;
        beam([x, h - 0.2, z], [x, h + 0.6, z], 0.11, "brick", false);
      }
      if (i === 2 || i === 3) {
        // Continuous scalation along both serpent bodies.
        for (let j = 0; j < 24; j++) {
          const t = (j + 0.5) / 24,
            x = edgeA.x + (edgeB.x - edgeA.x) * t,
            z = edgeA.z + (edgeB.z - edgeA.z) * t;
          add(
            petalGeometry(0.12, 0.16, 0.035),
            "trim",
            [x, approachSurface(a.x + dx * t, a.z + dz * t).height + 0.73, z],
            [1, 1, 1],
            [-0.3, yaw, Math.PI / 2],
            false,
          );
        }
      }
      if (i === 3) {
        const x = edgeB.x,
          z = edgeB.z,
          h = approachSurface(b.x - 0.01 * dx, b.z - 0.01 * dz).height;
        const p = (u: number, v: number, d: number): Vec => [
          x + (dx / len) * d + nx * u,
          h + v,
          z + (dz / len) * d + nz * u,
        ];
        curve(
          [
            p(0, 0.65, -0.6),
            p(0, 0.95, -0.2),
            p(0, 1.35, 0.05),
            p(0, 1.55, 0.42),
          ],
          0.22,
          "stone",
          false,
        );
        box(
          "stone",
          p(0, 1.45, 0.64),
          [0.35, 0.19, 0.65],
          [0, Math.atan2(dx, dz), 0],
          false,
        );
        box(
          "dark",
          p(0, 1.32, 0.65),
          [0.25, 0.06, 0.45],
          [0, Math.atan2(dx, dz), 0],
          false,
        );
        for (const s of [-1, 1])
          add(
            new T.SphereGeometry(0.055, 8, 6),
            "dark",
            p(s * 0.21, 1.6, 0.3),
            [1, 1, 1],
            [0, 0, 0],
            false,
          );
        for (let j = -2; j <= 2; j++)
          curve(
            [
              p(j * 0.11, 1.5, 0.15),
              p(j * 0.2, 1.95, 0),
              p(j * 0.12, 2.2, -0.25),
            ],
            0.07,
            "trim",
            false,
          );
      }
    }
    if (i === 4) {
      const x = (a.x + b.x) / 2,
        z = (a.z + b.z) / 2;
      // Recessed stone drainage bed below the deck and two masonry abutments.
      box("dark", [x, -0.12, z], [2, 0.18, 9], [0, yaw, 0], false);
      for (const end of [-1, 1])
        box(
          "brick",
          [
            x + (dx / len) * end * len * 0.42,
            0.08,
            z + (dz / len) * end * len * 0.42,
          ],
          [0.65, 0.85, 3.2],
          [0, yaw, 0],
          false,
        );
    }
  }
}

export function buildThaiArchitecture(w: MasonryWriter, authored = false) {
  const { box, add, beam } = w;
  for (const t of TOWERS) tower(w, t);
  if (!authored) {
    elephant(w, -10.3, -16.3, Math.PI + 0.35);
    elephant(w, 12, -15.5, Math.PI - 0.35);
  }
  // Carved gateway replaces the old timber-capped generic columns.
  const gateYaw = Math.atan2(3, 4.4);
  door(w, -17, 0, -16, 4.84, 6.15, gateYaw);
  const pediment = new T.Shape();
  pediment.moveTo(-3.25, 0);
  pediment.lineTo(-2.7, 0.38);
  pediment.lineTo(-1.7, 0.7);
  pediment.lineTo(-0.5, 1.65);
  pediment.lineTo(0, 1.3);
  pediment.lineTo(0.42, 1.55);
  pediment.lineTo(1.8, 0.6);
  pediment.lineTo(3.1, 0.08);
  pediment.closePath();
  add(
    new T.ExtrudeGeometry(pediment, {
      depth: 0.75,
      bevelEnabled: true,
      bevelSize: 0.045,
      bevelThickness: 0.045,
      bevelSegments: 1,
    }),
    "brick",
    [-17, 6.15, -16],
    [1, 1, 1],
    [0, gateYaw, 0],
  );
  // Low ruined cloister: the skyline remains open above seated contestants.
  for (let i = 0; i < 17; i++) {
    const x = -13.2 + i * 1.65,
      h = 0.75 + (i % 4) * 0.16;
    box("brick", [x, h / 2, -18.6], [1.6, h, 1.2]);
    box("plaster", [x, h + 0.03, -18.6], [1.7, 0.12, 1.35]);
    if (i % 4 === 0) box("brick", [x, 1.5, -18.8], [0.7, 1.4, 1.4]);
  }
  // Voting pavilion: one roof assembly supported by perimeter posts, no legacy canopy.
  for (const x of [-37, -31])
    for (const z of [15, 21]) {
      box("trim", [x, 0.54, z], [0.64, 0.3, 0.64]);
      box("wood", [x, 2.37, z], [0.28, 3.4, 0.28]);
      box("trim", [x, 3.89, z], [0.61, 0.26, 0.61]);
      for (const side of [-1, 1])
        beam([x, 3.55, z], [x + side * 0.65, 4.02, z], 0.085, "wood", false);
    }
  for (const x of [-37, -31]) box("wood", [x, 4.05, 18], [0.34, 0.3, 6.65]);
  for (const z of [15, 21]) box("wood", [-34, 4.05, z], [6.5, 0.3, 0.34]);
  if (!authored) {
    roof(w, -34, 18, 4.15, 8.4, 8.5, 2);
    roof(w, -34, 17.8, 5.85, 5.4, 6.7, 1.4);
  }
  door(w, -34, 0.35, 21.18, 2.7, 3.1, 0);
  // Enclosed gables terminate the roof at the same perimeter as the room. Interior
  // rafters support the layered roof; the centred south/front doorway is the public opening.
  for (const end of [-1, 1]) {
    const gable = new T.Shape();
    gable.moveTo(-3.25, 0);
    gable.lineTo(0, 1.9);
    gable.lineTo(3.25, 0);
    gable.closePath();
    add(
      new T.ExtrudeGeometry(gable, { depth: 0.18, bevelEnabled: false }),
      "wood",
      [-34, 4.12, 18 + end * 3.05],
      [1, 1, 1],
      [0, 0, 0],
      false,
    );
  }
  for (let j = 0; j < 5; j++) {
    const zz = 15.3 + j * 1.35;
    beam([-37.15, 4.2, zz], [-34, 6.1, zz], 0.075, "wood", false);
    beam([-34, 6.1, zz], [-30.85, 4.2, zz], 0.075, "wood", false);
  }
  // Attached brick foundation courses visually join the return walls to the paved floor.
  box("brick", [-37.25, 0.22, 18], [0.88, 0.4, 6.8], [0, 0, 0], false);
  box("brick", [-30.75, 0.22, 18], [0.88, 0.4, 6.8], [0, 0, 0], false);
  box("brick", [-30.75, 0.22, 15.6], [0.88, 0.4, 2.2], [0, 0, 0], false);

  // Reachable, functional stone podium with floral relief; host stands behind it.
  const { x, z, y, yaw } = COUNCIL.podium;
  box("brick", [x, y + 0.12, z], [1.75, 0.24, 1.04], [0, yaw, 0]);
  box("stone", [x, y + 0.58, z], [1.32, 0.76, 0.65], [0, yaw, 0]);
  box("trim", [x, y + 1.03, z], [1.8, 0.18, 1.05], [0, yaw, 0]);
  const c = Math.cos(yaw),
    s = Math.sin(yaw);
  for (let j = -2; j <= 2; j++)
    add(
      petalGeometry(0.22, 0.5, 0.05),
      "plaster",
      [x + j * 0.23 * c + 0.34 * s, y + 0.34, z - j * 0.23 * s + 0.34 * c],
      [1, 1, 1],
      [0, yaw, 0],
      false,
    );
  approach(w);
}
