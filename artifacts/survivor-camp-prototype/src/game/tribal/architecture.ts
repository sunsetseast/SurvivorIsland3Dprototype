import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { rng } from "../world";
import {
  ARRIVAL,
  EXIT_PATH,
  PATHS,
  SOLIDS,
  STRUCTURES,
  TREES,
  TRIBAL,
  trailDistance,
  tribalHeight,
} from "./layout";
import { sanctuaryMaterials, type MaterialKey } from "./surfaces";

type Vec = [number, number, number];
export type FlameSource = { x: number; y: number; z: number; size: number };

/** Static geometry is merged by surface and camera-blocking role (not hundreds of React meshes). */
export function buildSanctuary() {
  const { materials, dispose } = sanctuaryMaterials(),
    group = new T.Group(),
    random = rng(11739);
  const buckets = new Map<string, T.BufferGeometry[]>(),
    flames: FlameSource[] = [];
  const color = new T.Color(),
    transform = new T.Matrix4(),
    quat = new T.Quaternion();
  function add(
    geo: T.BufferGeometry,
    key: MaterialKey,
    p: Vec,
    scale: Vec = [1, 1, 1],
    rotation: Vec = [0, 0, 0],
    block = true,
    variation = 0.13,
  ) {
    if (geo.index) {
      const original = geo;
      geo = geo.toNonIndexed();
      original.dispose();
    }
    quat.setFromEuler(new T.Euler(...rotation));
    transform.compose(new T.Vector3(...p), quat, new T.Vector3(...scale));
    geo.applyMatrix4(transform);
    const positions = geo.getAttribute("position"),
      colors = new Float32Array(positions.count * 3);
    const shade = 1 - random() * variation;
    for (let i = 0; i < positions.count; i++) {
      const n = shade * (0.94 + random() * 0.12);
      color.setRGB(n, n, n);
      color.toArray(colors, i * 3);
    }
    geo.setAttribute("color", new T.BufferAttribute(colors, 3));
    // Normalise attributes so all pieces can share one merged buffer.
    if (!geo.getAttribute("uv"))
      geo.setAttribute(
        "uv",
        new T.BufferAttribute(new Float32Array(positions.count * 2), 2),
      );
    const spatial = key === "leaf" || key === "bark" || key === "moss";
    const cell = spatial
      ? `${Math.floor(positions.getX(0) / 16)},${Math.floor(positions.getZ(0) / 16)}`
      : "all";
    const id = `${key}:${Number(block)}:${cell}`;
    if (!buckets.has(id)) buckets.set(id, []);
    buckets.get(id)!.push(geo);
  }
  function box(
    key: MaterialKey,
    p: Vec,
    size: Vec,
    rot: Vec = [0, 0, 0],
    block = true,
  ) {
    let g: T.BufferGeometry;
    if (key === "stone" || key === "trim" || key === "dark") {
      const shape = new T.Shape();
      shape.moveTo(-0.46, -0.5);
      shape.lineTo(0.45, -0.5);
      shape.lineTo(0.5, -0.45);
      shape.lineTo(0.5, 0.45);
      shape.lineTo(0.44, 0.5);
      shape.lineTo(-0.45, 0.5);
      shape.lineTo(-0.5, 0.44);
      shape.lineTo(-0.5, -0.44);
      shape.closePath();
      g = new T.ExtrudeGeometry(shape, {
        depth: 0.92,
        bevelEnabled: true,
        bevelSize: 0.025,
        bevelThickness: 0.04,
        bevelSegments: 1,
        steps: 1,
      });
      g.translate(0, 0, -0.46);
    } else g = new T.BoxGeometry(1, 1, 1);
    add(g, key, p, size, rot, block);
  }
  function rock(p: Vec, scale: Vec, key: MaterialKey = "stone", block = true) {
    const g = new T.IcosahedronGeometry(1, 1),
      a = g.getAttribute("position");
    for (let i = 0; i < a.count; i++) {
      const f =
        0.88 + 0.12 * Math.sin(a.getX(i) * 13 + a.getY(i) * 17 + a.getZ(i) * 7);
      a.setXYZ(i, a.getX(i) * f, a.getY(i) * f, a.getZ(i) * f);
    }
    g.computeVertexNormals();
    add(g, key, p, scale, [random(), random() * 7, random()], block);
  }
  function beam(
    a: Vec,
    b: Vec,
    radius: number,
    key: MaterialKey = "wood",
    block = true,
    endRadius = radius,
  ) {
    const av = new T.Vector3(...a),
      bv = new T.Vector3(...b),
      d = bv.clone().sub(av),
      q = new T.Quaternion().setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        d.clone().normalize(),
      );
    const e = new T.Euler().setFromQuaternion(q);
    add(
      new T.CylinderGeometry(endRadius, radius, d.length(), 9),
      key,
      av.add(bv).multiplyScalar(0.5).toArray() as Vec,
      [1, 1, 1],
      [e.x, e.y, e.z],
      block,
    );
  }
  function curve(
    points: Vec[],
    radius: number,
    key: MaterialKey = "bark",
    block = false,
  ) {
    const c = new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p)));
    add(
      new T.TubeGeometry(
        c,
        key === "leaf" ? 8 : Math.max(8, points.length * 3),
        radius,
        key === "leaf" ? 3 : 5,
        false,
      ),
      key,
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
      block,
    );
  }
  function ring(
    p: Vec,
    radius: number,
    tube: number,
    key: MaterialKey,
    rot: Vec = [0, 0, 0],
    arc = Math.PI * 1.78,
  ) {
    add(new T.TorusGeometry(radius, tube, 6, 40, arc), key, p, [1, 1, 1], rot);
  }
  function carving(x: number, y: number, z: number, s: number, yaw = 0) {
    // Original split-ring / branching root mark, repeated at every architectural scale.
    ring([x, y, z], s, s * 0.11, "trim", [0, yaw, 0.24]);
    const c = Math.cos(yaw),
      n = Math.sin(yaw);
    for (let i = -1; i <= 1; i++)
      beam(
        [x + c * i * s * 0.2, y - s * 0.65, z - n * i * s * 0.2],
        [x + c * i * s * 0.55, y - s * 1.35, z - n * i * s * 0.55],
        s * 0.07,
        "gold",
      );
  }
  function column(x: number, z: number, h: number, radius = 0.85) {
    for (let j = 0; j < 3; j++)
      box(
        "dark",
        [x, 0.15 + j * 0.23, z],
        [radius * (2.9 - j * 0.3), 0.26, radius * (2.9 - j * 0.3)],
      );
    add(new T.CylinderGeometry(radius * 0.78, radius, h - 0.8, 8, 5), "stone", [
      x,
      h / 2 + 0.2,
      z,
    ]);
    for (const y of [1.1, h - 1.2, h - 0.7])
      add(
        new T.CylinderGeometry(radius * 1.14, radius * 1.14, 0.19, 8),
        "trim",
        [x, y, z],
      );
    box("trim", [x, h, z], [radius * 2.6, 0.4, radius * 2.6]);
    for (let k = 0; k < 3; k++)
      carving(x, 2.2 + k * 1.3, z + radius * 0.9, 0.32);
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2;
      curve(
        [
          [x + Math.cos(a) * radius, 0.1, z + Math.sin(a) * radius],
          [x + Math.cos(a) * radius * 1.4, 0.2, z + Math.sin(a) * radius * 1.5],
          [x + Math.cos(a) * 2.1, 0.02, z + Math.sin(a) * 2],
        ],
        0.12,
      );
    }
  }
  function torch(
    x: number,
    z: number,
    height = 2.7,
    ground = tribalHeight(x, z),
  ) {
    beam([x, ground, z], [x, ground + height, z], 0.095, "wood");
    for (let j = 0; j < 3; j++)
      ring([x, ground + height - 0.35 + j * 0.11, z], 0.17, 0.04, "gold", [
        Math.PI / 2,
        0,
        0,
      ]);
    add(new T.CylinderGeometry(0.24, 0.11, 0.42, 9), "ash", [
      x,
      ground + height,
      z,
    ]);
    flames.push({ x, y: ground + height + 0.12, z, size: 0.48 });
  }

  // Ground follows exactly the controller's walkable surface, including gallery, booth and host grades.
  const ground = new T.PlaneGeometry(110, 110, 126, 126);
  ground.rotateX(-Math.PI / 2);
  const gp = ground.getAttribute("position");
  for (let i = 0; i < gp.count; i++)
    gp.setY(i, tribalHeight(gp.getX(i), gp.getZ(i)) - 0.025);
  ground.computeVertexNormals();
  const guv = ground.getAttribute("uv");
  for (let i = 0; i < guv.count; i++)
    guv.setXY(i, guv.getX(i) * 14, guv.getY(i) * 14);
  add(ground, "ground", [0, 0, 0], [1, 1, 1], [0, 0, 0], false);
  // Broken radial flagstones, intentionally NOT a square-grid texture.
  for (let r = 3.15; r < 16.5; r += 1.65) {
    const count = Math.floor(r * 3.2);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + r * 0.17,
        x = Math.sin(a) * r,
        z = Math.cos(a) * r;
      if (
        (x < -12 && z < 3) ||
        (z < -8 && Math.abs(x) < 11) ||
        (x > 7 && z > 1)
      )
        continue;
      add(
        new T.CylinderGeometry(0.92, 0.94, 0.07, 5),
        random() > 0.2 ? "stone" : "dark",
        [x, 0.012, z],
        [1, 1, 0.72],
        [0, a, 0],
        false,
        0.35,
      );
    }
  }
  for (const path of PATHS)
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1]!,
        b = path[i]!,
        length = Math.hypot(a.x - b.x, a.z - b.z),
        n = Math.ceil(length / 1.1);
      for (let j = 0; j < n; j++)
        for (const side of [-1, 1]) {
          const t = j / n,
            x = a.x + (b.x - a.x) * t + side * 0.48,
            z = a.z + (b.z - a.z) * t;
          add(
            new T.CylinderGeometry(0.58, 0.63, 0.06, 5),
            "dark",
            [x, tribalHeight(x, z) + 0.015, z],
            [1, 1, 0.84],
            [0, random() * 7, 0],
            false,
          );
        }
    }

  // Monumental terraced sanctuary rear. Large silhouettes, then carved relief, then weathering.
  for (let level = 0; level < 5; level++) {
    box(
      level % 2 ? "dark" : "stone",
      [0, 0.26 + level * 0.48, -21 - level * 0.45],
      [29 - level * 2.2, 0.5, 5.2],
    );
    box(
      "trim",
      [0, 0.52 + level * 0.48, -18.45 - level * 0.45],
      [29.2 - level * 2.2, 0.12, 0.32],
    );
  }
  for (const x of [-12, -7.6, 7.6, 12])
    column(x, -18.4, Math.abs(x) > 10 ? 6.3 : 8.3, 0.85);
  // Three stone ribs frame an enormous open split halo. The sky remains visible through it.
  for (const [x, y, radius] of [
    [0, 7.2, 4.7],
    [-7.7, 5, 2.4],
    [7.7, 5, 2.4],
  ]) {
    ring([x!, y!, -19], radius!, 0.5, "stone", [0, 0, -0.19]);
    ring([x!, y!, -18.45], radius! - 0.48, 0.09, "gold", [0, 0, -0.19]);
    for (let i = 0; i < 13; i++) {
      const a = (i / 12) * Math.PI * 1.78 - 0.19;
      box(
        "trim",
        [x! + Math.cos(a) * radius!, y! + Math.sin(a) * radius!, -18.9],
        [0.4, 0.72, 1.15],
        [0, 0, a - Math.PI / 2],
      );
    }
  }
  box("wood", [0, 5.1, -18.9], [23, 0.5, 1]);
  box("trim", [0, 4.6, -18.45], [22, 0.2, 0.4]);
  carving(0, 6.9, -18.35, 1.8);
  for (let i = -5; i <= 5; i++) if (i) carving(i * 1.9, 1.7, -17.43, 0.48);
  for (let i = 0; i < 15; i++) {
    const x = -13.5 + i * 1.9,
      h = 2.7 + Math.sin(i * 2) * 0.35;
    for (let j = 0; j < 4; j++) {
      const hh = h / 4;
      box(
        "stone",
        [x + (j % 2 ? -0.035 : 0.035), hh * (j + 0.5), -18.2],
        [1.78, hh - 0.025, 1.4],
        [0, 0, (random() - 0.5) * 0.012],
      );
    }
    box("trim", [x, h + 0.02, -18.2], [1.92, 0.16, 1.52]);
    if (i % 2)
      box("moss", [x, h + 0.04, -18.2], [1.72, 0.06, 1.35], [0, 0.04, 0]);
  }
  // Side retaining wall anchors the eastern silhouette.
  for (let i = 0; i < 6; i++) {
    box("stone", [14.8, 1.4, -17 + i * 1.7], [1.8, 2.8, 1.6]);
    box("trim", [14.8, 2.85, -17 + i * 1.7], [2, 0.2, 1.7]);
  }
  // Carved arrival gateway: actual opening matches shared collision metadata.
  column(-19.2, -14.5, 6.4);
  column(-14.8, -17.5, 6.4);
  const gateYaw = Math.atan2(3, 4.4);
  box("stone", [-17, 6.75, -16], [7.2, 1, 1.7], [0, gateYaw, 0]);
  box("wood", [-17, 7.4, -16], [8.2, 0.35, 1.9], [0, gateYaw, 0.025]);
  carving(-17, 6.7, -15.15, 0.5, gateYaw);
  for (let i = 0; i < 6; i++) {
    const x = -20 + i * 1.15;
    curve(
      [
        [x, 7.6, -16],
        [x - 0.3, 6.2, -15.7],
        [x + 0.2, 4.6 - random() * 2, -15.8],
      ],
      0.035,
      "moss",
    );
  }
  torch(-20.8, -16.9);
  torch(-15.1, -14.3);
  for (const [i, p] of ARRIVAL.entries())
    if (i % 2 === 0 && i < 6) torch(p.x - 1.7, p.z, 2.35);

  // Twelve irregular hand-shaped stumps, radial growth rings, buttress roots and bark splinters.
  for (const [i, s] of TRIBAL.seats.entries()) {
    const [x, , z] = s.position,
      h = 0.55 + (i % 3) * 0.045,
      radius = 0.48 + (i % 4) * 0.018;
    const g = new T.CylinderGeometry(
        radius * 0.97,
        radius * 1.16,
        h,
        15,
        4,
        true,
      ),
      a = g.getAttribute("position");
    for (let j = 0; j < a.count; j++) {
      const angle = Math.atan2(a.getZ(j), a.getX(j)),
        f =
          1 +
          0.085 * Math.sin(angle * 7 + i) +
          0.045 * Math.sin(angle * 3 + i * 2);
      a.setXYZ(
        j,
        a.getX(j) * f,
        a.getY(j) + 0.024 * Math.sin(angle * 5 + i),
        a.getZ(j) * f,
      );
    }
    g.computeVertexNormals();
    add(g, "bark", [x, h / 2, z]);
    const cap = new T.CircleGeometry(radius * 0.97, 28),
      uv = cap.getAttribute("uv");
    for (let j = 0; j < uv.count; j++) uv.setXY(j, uv.getX(j), uv.getY(j));
    add(
      cap,
      "cut",
      [x, h + 0.007, z],
      [1, 1, 1],
      [-Math.PI / 2, 0, 0.12 * i],
      false,
    );
    for (let j = 0; j < 8; j++) {
      const a = (j * Math.PI) / 4 + i;
      beam(
        [x + Math.cos(a) * radius, 0.07, z + Math.sin(a) * radius],
        [
          x + Math.cos(a) * radius * 0.95,
          h * 0.88,
          z + Math.sin(a) * radius * 0.95,
        ],
        0.03,
        "bark",
      );
    }
    for (let j = 0; j < 3; j++) {
      const a = j * 2.1 + i;
      beam(
        [x + Math.cos(a) * 0.65, 0.03, z + Math.sin(a) * 0.65],
        [x + Math.cos(a) * 0.4, 0.22, z + Math.sin(a) * 0.4],
        0.06,
        "bark",
        false,
        0.035,
      );
    }
    if (i < 6) torch(x, z - 5.3, 2.5);
  }

  // Ash basin, separate rough stones, split blackened timber and emissive coals.
  add(
    new T.CylinderGeometry(2.22, 2.35, 0.13, 36),
    "ash",
    [0, 0.07, 0],
    [1, 1, 1],
    [0, 0, 0],
    false,
  );
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    rock(
      [Math.sin(a) * 2.3, 0.29, Math.cos(a) * 2.3],
      [0.42, 0.32, 0.36],
      i % 3 ? "dark" : "stone",
    );
  }
  for (let i = 0; i < 9; i++) {
    const a = i * 2.1;
    beam(
      [Math.cos(a) * 1.5, 0.2, Math.sin(a) * 1.5],
      [-Math.cos(a) * 1.2, 0.45 + i * 0.045, -Math.sin(a) * 1.2],
      0.16,
      "ash",
    );
  }
  for (let i = 0; i < 50; i++) {
    const a = random() * 7,
      r = random() * 1.7;
    rock(
      [Math.sin(a) * r, 0.18 + random() * 0.18, Math.cos(a) * r],
      [0.07 + random() * 0.12, 0.045, 0.09],
      "ember",
      false,
    );
  }
  flames.push({ x: 0, y: 0.4, z: 0, size: 1.65 });

  // Left-center gallery; open aisles, landings and rear entrance. Three rustic tiers face +X.
  for (let i = 0; i < 3; i++) {
    const x = -17 - i * 2.2,
      y = 0.75 + i * 0.42;
    for (let j = 0; j < 5; j++)
      box(
        "wood",
        [x + (j - 2) * 0.4, y - 0.08, -3.1],
        [0.37, 0.13, 7.2],
        [0, 0, 0.003 * j],
        false,
      );
    box("wood", [x, y + 0.44, -3.2], [0.64, 0.18, 7.2]);
    for (const z of [-6.25, -0.2]) {
      beam([x, 0, z], [x, y + 0.4, z], 0.16);
      beam([x - 1, 0.1, z], [x + 0.6, y - 0.2, z], 0.11);
    }
    // Visible worn stone risers at the front; graded access lanes at both ends.
    for (let j = 0; j < 3; j++)
      box(
        "stone",
        [x + 1.1 + j * 0.26, y - j * 0.14 - 0.2, -3.2],
        [0.28, 0.16, 6.6],
        [0, 0, 0],
        false,
      );
  }
  for (const z of [-7.1, 1]) {
    beam([-23, 2.5, z], [-15.8, 1.75, z], 0.1);
    for (let x = -23; x < -15; x += 2.2)
      beam([x, tribalHeight(x, z), z], [x, tribalHeight(x, z) + 1.1, z], 0.12);
  }
  // Rear railing leaves a 2m-wide dedicated opening at z=-4.
  beam([-23.1, 2.6, -7], [-23.1, 2.6, -5.2], 0.11);
  beam([-23.1, 2.6, -2.8], [-23.1, 2.6, 1], 0.11);
  column(-23.5, -8.5, 5.3, 0.6);
  column(-23.5, 2.5, 5.3, 0.6);
  beam([-23.5, 5.4, -8.5], [-23.5, 5.4, 2.5], 0.26);
  torch(-15.4, -7.5, 2.8);
  torch(-23.5, 2.5, 2.6, 1.6);

  // Voting chamber. The high back and return walls occlude Council -> parchment sightlines.
  for (const id of [
    "booth-back",
    "booth-west",
    "booth-east-front",
    "booth-privacy-return",
    "privacy-wall",
    "privacy-wall-west",
  ]) {
    const s = STRUCTURES.find((s) => s.id === id)!;
    for (let course = 0; course < 6; course++) {
      const alongX = s.hx > s.hz,
        length = (alongX ? s.hx : s.hz) * 2;
      const count = Math.max(
        1,
        Math.round(length / (1.3 + (course % 2) * 0.3)),
      );
      for (let j = 0; j < count; j++) {
        const offset = -length / 2 + (length / count) * (j + 0.5);
        box(
          "stone",
          [
            s.x + (alongX ? offset : 0),
            0.32 + course * 0.63,
            s.z + (alongX ? 0 : offset),
          ],
          [
            alongX ? length / count - 0.025 : s.hx * 2,
            0.6,
            alongX ? s.hz * 2 : length / count - 0.025,
          ],
          [0, (random() - 0.5) * 0.009, 0],
        );
      }
    }
    box("trim", [s.x, 3.85, s.z], [s.hx * 2 + 0.12, 0.18, s.hz * 2 + 0.12]);
    for (let y = 0.7; y < 3.6; y += 1.1)
      box("dark", [s.x, y, s.z + s.hz + 0.015], [s.hx * 1.95, 0.035, 0.025]);
  }
  for (const x of [-37, -31])
    for (const z of [15, 21]) {
      beam([x, 0.35, z], [x, 4.1, z], 0.19);
      carving(x, 2.6, z + 0.19, 0.32);
    }
  for (let i = 0; i < 15; i++)
    box(
      "wood",
      [-37.4 + i * 0.49, 4.3 + Math.sin((i / 14) * Math.PI) * 0.85, 18],
      [0.52, 0.17, 7.7],
      [0, 0, i < 7 ? 0.19 : -0.19],
      true,
    );
  for (const z of [14.5, 21.5]) {
    beam([-38, 4.2, z], [-34, 5.3, z], 0.17);
    beam([-34, 5.3, z], [-30, 4.2, z], 0.17);
  }
  box("wood", [-34, 1.35, 16], [3.1, 0.27, 1.1]);
  for (const x of [-35.2, -32.8]) beam([x, 0.35, 16], [x, 1.25, 16], 0.17);
  carving(-34, 1.34, 16.57, 0.1);
  box(
    "parchment",
    [-34.1, 1.494, 16.15],
    [0.75, 0.012, 0.5],
    [0, 0.1, 0],
    false,
  );
  beam([-33.4, 1.52, 16.2], [-33.25, 1.52, 15.88], 0.022, "ash", false);
  add(
    new T.CylinderGeometry(0.12, 0.09, 0.13, 10),
    "dark",
    [-33.1, 1.55, 15.8],
  );
  carving(-34, 2.65, 15.02, 0.68);
  torch(-36.5, 16.1, 2.05, 0.35);
  torch(-28, 12.2, 2.7);
  torch(-22, 6.1, 2.5);

  // Host terrace: low worn plinth, individual chair joinery, urn and a hand-held snuffer.
  for (let i = 0; i < 5; i++)
    box("stone", [8.2 + i * 1.45, 0.14, 5], [1.4, 0.25, 4.2], [0, 0, 0], false);
  const hx = 11.5,
    hz = 4.8,
    hy = 0.5;
  // Standing ceremonial dais: deliberately no host chair or seat-back.
  // Jeff remains at the existing presentation anchor beside the carved podium.
  for (let level = 0; level < 4; level++) {
    add(new T.CylinderGeometry(0.76 - level * 0.045, 0.84 - level * 0.045, 0.22, 12),
      level % 2 ? "trim" : "stone", [hx, hy + 0.17 + level * 0.22, hz]);
  }
  add(new T.CylinderGeometry(0.79, 0.72, 0.18, 12), "gold", [hx, hy + 1.14, hz]);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    const x = hx + Math.sin(a) * 0.7, z = hz + Math.cos(a) * 0.7;
    box(i % 2 ? "gold" : "trim", [x, hy + 0.58, z], [0.17, 0.46, 0.17], [0, a, 0], false);
  }
  // Keep the host dais visually open: no flanking columns or pillars.
  add(new T.CylinderGeometry(0.6, 0.72, 1.05, 8), "stone", [9.1, 1.03, 4.2]);
  add(new T.CylinderGeometry(0.43, 0.29, 0.63, 12), "wood", [9.1, 1.87, 4.2]);
  add(new T.ConeGeometry(0.49, 0.27, 12), "gold", [9.1, 2.31, 4.2]);
  carving(9.1, 1.88, 4.64, 0.19);
  beam([12.8, 1.05, 6.9], [13.6, 1.05, 6.9], 0.035, "gold");
  add(
    new T.ConeGeometry(0.24, 0.34, 10),
    "gold",
    [13.55, 0.91, 6.9],
    [1, 1, 1],
    [Math.PI, 0, 0],
  );
  box("stone", [13.1, 0.7, 6.9], [1.3, 0.35, 0.7]);
  column(18.1, 13, 4.7, 0.65);
  column(21.9, 9, 4.7, 0.65);
  beam([18.1, 4.9, 13], [21.9, 4.9, 9], 0.35, "wood");
  torch(15.7, 4, 3);
  torch(11, 9, 2.5);
  for (const [i, p] of EXIT_PATH.entries())
    if (i > 1 && i < 5) torch(p.x + 1.7, p.z - 1.5, 2.4);

  // Ayutthaya / Sukhothai-inspired original ruin language: ringed chedis,
  // lotus-like tiering, respectful elephant guardian silhouettes and naga balustrades.
  // These are physical 3D assets, not background billboards.
  function chedi(x: number, z: number, height: number, radius: number, background = false) {
    const base = tribalHeight(x, z);
    for (let i = 0; i < 3; i++)
      add(new T.CylinderGeometry(radius * (1.05 - i * .12), radius * (1.24 - i * .12), .38, 12),
        i % 2 ? "trim" : "dark", [x, base + .2 + i * .38, z], [1,1,1], [0,0,0], !background);
    add(new T.CylinderGeometry(radius * .62, radius * .9, height * .32, 12), "stone",
      [x, base + 1.1 + height * .16, z], [1,1,1], [0,0,0], !background);
    for (let j = 0; j < 3; j++) {
      const y = base + 1.3 + height * (.32 + j * .13);
      add(new T.CylinderGeometry(radius * (.65-j*.12), radius * (.85-j*.13), .21, 12), "trim", [x,y,z], [1,1,1], [0,0,0], !background);
    }
    add(new T.ConeGeometry(radius * .56, height * .39, 12), "stone",
      [x, base + height * .76, z], [1,1,1], [0,0,0], !background);
    add(new T.ConeGeometry(radius * .12, height * .17, 10), "gold",
      [x, base + height * 1.045, z], [1,1,1], [0,0,0], false);
  }
  function elephant(x: number, z: number, size: number, yaw = 0) {
    const y = tribalHeight(x,z);
    const toWorld = (u: number,v: number,w: number): Vec => [x+(u*Math.cos(yaw)+w*Math.sin(yaw))*size,y+v*size,z+(w*Math.cos(yaw)-u*Math.sin(yaw))*size];
    box("dark",toWorld(0,.18,0),[2.8*size,.36*size,2.5*size]);
    add(new T.SphereGeometry(.68,12,9),"stone",toWorld(0,1.5,0),[1.45*size,.84*size,.92*size]);
    for(const u of [-.7,.7]) for(const w of [-.48,.48])
      add(new T.CylinderGeometry(.24,.3,1.18,9),"stone",toWorld(u,.75,w),[size,size,size]);
    add(new T.SphereGeometry(.57,12,9),"stone",toWorld(0,1.6,-.88),[1.12*size,1.1*size,1.05*size]);
    for(const side of [-1,1]) {
      add(new T.SphereGeometry(.4,10,8),"trim",toWorld(side*.58,1.65,-.88),[.31*size,.8*size,.8*size]);
      beam(toWorld(side*.3,1.25,-1.32),toWorld(side*.36,.85,-1.55),.075*size,"gold",false,.015*size);
    }
    curve([toWorld(0,1.35,-1.33),toWorld(0,.8,-1.8),toWorld(0,.35,-1.65)],.19*size,"stone",false);
  }
  // Hero chedis stay behind the seating and off player routes. The foreground
  // can retain its existing tree density and collision proxies.
  // Monumental visible skyline behind the contestant backdrop, not hidden below it.
  // Three tall chedis rise well above the existing 8m wall and carved halo.
  chedi(0,-26,25,4.3,true);
  chedi(-13,-27,19,3.15,true);
  chedi(14,-27,20,3.25,true);
  for(const p of [[-14,-24],[15,-24]] as const) elephant(p[0],p[1],.76);
  // Pagoda canopy over the secluded voting chamber, retaining the dogleg entrance.
  // The original chamber walls and writing table remain walkable and private.
  for(let i=0;i<3;i++) {
    const y=5.1+i*1.18;
    add(new T.ConeGeometry(5.55-i*.9,1.65,8), i===1?"dark":"trim",[-34,y,18], [1,1,1],[0,Math.PI/8,0],false);
    add(new T.CylinderGeometry(4.3-i*.78,4.7-i*.8,.17,8),"gold",[-34,y-.61,18],[1,1,1],[0,Math.PI/8,0],false);
  }
  add(new T.ConeGeometry(.65,2.7,10),"gold",[-34,9.1,18],[1,1,1],[0,0,0],false);
  for(const x of [-37,-31])for(const z of [15,21])
    add(new T.CylinderGeometry(.16,.22,1.25,8),"trim",[x,4.5,z]);
  // Continuous stone marker paving and regularly spaced torches for voting.
  for(let i=1;i<7;i++) {
    const a=PATHS[1]![i-1]!, b=PATHS[1]![i]!;
    const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),count=Math.max(1,Math.ceil(len/.85));
    const nx=-dz/len,nz=dx/len;
    for(let j=0;j<count;j++) {
      const t=(j+.5)/count,x=a.x+dx*t,z=a.z+dz*t;
      box(j%4===0?"trim":"stone",[x,tribalHeight(x,z)+.055,z],
        [Math.min(1.38,len/count+.06),.095,1.25],[0,Math.atan2(-dz,dx),0],false);
    }
    for(const side of [-1,1]) {
      const x=(a.x+b.x)/2+nx*1.9*side,z=(a.z+b.z)/2+nz*1.9*side;
      if(trailDistance(x,z)>1.3) torch(x,z,2.55);
    }
  }
  // Raised ceremonial jury silhouette and illuminated architectural framing.
  for(const z of [-8.1,2.05]) {
    column(-23.8,z,5.7,.47);
    torch(-24.7,z,3.3);
  }
  for(let j=0;j<9;j++) box(j%2?"trim":"gold",[-19.3,5.6,-7.5+j*1.12],[.55,.28,.54], [0,0,0],false);
  beam([-23.8,5.6,-8.1],[-23.8,5.6,2.05],.19,"gold",false);
  // Naga ceremonial approach at the upper-left entry, with readable step rhythm.
  // Keep collision geometry outside the 1.8m walking corridor.
  const climbA=ARRIVAL[2]!,climbB=ARRIVAL[4]!;
  const ddx=climbB.x-climbA.x,ddz=climbB.z-climbA.z,ll=Math.hypot(ddx,ddz);
  const nx=-ddz/ll,nz=ddx/ll;
  for(let i=0;i<14;i++) {
    const t=(i+.5)/14,x=climbA.x+ddx*t,z=climbA.z+ddz*t;
    box(i%3?"stone":"trim",[x,tribalHeight(x,z)+.055,z],[ll/14+.07,.1,2.35],[0,Math.atan2(-ddz,ddx),0],false);
  }
  for(const side of [-1,1]) {
    const pts: Vec[]=[];
    for(let i=0;i<=12;i++) {
      const t=i/12,x=climbA.x+ddx*t+nx*side*1.9,z=climbA.z+ddz*t+nz*side*1.9;
      pts.push([x,tribalHeight(x,z)+.55+Math.sin(t*Math.PI)*.22,z]);
    }
    curve(pts,.21,"trim",false);
    for(let i=0;i<=12;i+=2) beam([pts[i]![0],tribalHeight(pts[i]![0],pts[i]![2]),pts[i]![2]],pts[i]!, .13,"stone",false);
    const head=pts[12]!;
    add(new T.SphereGeometry(.48,12,9),"gold",[head[0],head[1]+.25,head[2]],[1,1.5,1], [0,0,0],false);
    for(let k=0;k<3;k++) add(new T.ConeGeometry(.16,.55,6),"trim",
      [head[0]+nx*side*(k-1)*.27,head[1]+.77,head[2]+nz*side*(k-1)*.27], [1,1,1],[0,0,0],false);
  }
  // A low stone bridge crosses a shallow ruined channel without blocking the approach.
  const bridgeA=ARRIVAL[4]!,bridgeB=ARRIVAL[5]!;
  const bx=(bridgeA.x+bridgeB.x)/2,bz=(bridgeA.z+bridgeB.z)/2;
  box("trim",[bx,tribalHeight(bx,bz)+.04,bz],[5.9,.16,3.05],[0,Math.atan2(-(bridgeB.z-bridgeA.z),bridgeB.x-bridgeA.x),0],false);
  for(const side of [-1,1]) {
    const t=(side+1)/2;
    rock([bx+side*2.1,tribalHeight(bx,bz)-.27,bz+side*.4],[1,.43,1.3],"dark",false);
    if(t) torch(bx-2.2,bz+2.2,2.7);
  }

  // Buttress jungle trees, sweeping roots, layered palm/fern leaves and draped vines.
  const leaf = (
    p: Vec,
    len: number,
    yaw: number,
    bend: number,
    width: number,
  ) => {
    const vertices: number[] = [],
      uvs: number[] = [],
      indices: number[] = [];
    for (let i = 0; i <= 7; i++) {
      const t = i / 7,
        w = Math.sin(t * Math.PI) * width,
        y = Math.sin(t * Math.PI) * len * 0.24 - t * t * bend;
      vertices.push(-w, y, t * len, w, y, t * len);
      uvs.push(0, t, 1, t);
      if (i < 7) {
        const a = i * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
    g.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    add(g, "leaf", p, [1, 1, 1], [0, yaw, 0], false, 0.6);
  };
  for (const t of TREES) {
    const y = tribalHeight(t.x, t.z),
      h = 8 + t.size * 3.2,
      lean = Math.sin(t.seed) * 0.8;
    beam(
      [t.x, y, t.z],
      [t.x + lean, y + h, t.z],
      0.48 * t.size,
      "bark",
      true,
      0.23 * t.size,
    );
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 + t.seed;
      curve(
        [
          [t.x, y + 1.4, t.z],
          [t.x + Math.sin(a) * 0.8, y + 0.3, t.z + Math.cos(a) * 0.8],
          [t.x + Math.sin(a) * 2.5, y + 0.02, t.z + Math.cos(a) * 2.5],
        ],
        0.18 * t.size,
      );
    }
    if (t.seed % 3 === 0) {
      for (let k = 0; k < 9; k++) {
        const a = k * 0.7 + t.seed,
          length = 3.7 + t.size;
        const spine: Vec[] = [];
        for (let j = 0; j <= 7; j++) {
          const f = j / 7;
          spine.push([
            t.x + lean + Math.sin(a) * length * f,
            y + h + Math.sin(f * Math.PI) * 0.8 - f * f * 2.1,
            t.z + Math.cos(a) * length * f,
          ]);
        }
        curve(spine, 0.035, "leaf");
        for (let j = 1; j <= 7; j++) {
          const f = j / 8,
            width = Math.sin(f * Math.PI) * 1.1;
          const p: Vec = [
            t.x + lean + Math.sin(a) * length * f,
            y + h + Math.sin(f * Math.PI) * 0.8 - f * f * 2.1,
            t.z + Math.cos(a) * length * f,
          ];
          leaf(p, width, a + 1, 0.32, 0.1);
          leaf(p, width, a - 1, 0.32, 0.1);
        }
      }
    } else {
      for (let k = 0; k < 4; k++) {
        const a = k * 1.57 + t.seed,
          cx = t.x + Math.sin(a) * 2.2,
          cz = t.z + Math.cos(a) * 2.2,
          cy = y + h - (k % 2) * 1.2;
        beam([t.x, y + h - 3.5, t.z], [cx, cy, cz], 0.15, "bark", true, 0.065);
        for (let j = 0; j < 11; j++)
          leaf(
            [
              cx + Math.sin(j * 2.4) * 0.8,
              cy - (j % 3) * 0.25,
              cz + Math.cos(j * 2.4) * 0.8,
            ],
            1.7 + t.size * 0.5,
            j * 2.4 + a,
            0.7,
            0.44,
          );
      }
    }
    if (t.seed % 3 === 0)
      curve(
        [
          [t.x + lean, h, t.z],
          [t.x + 1, h * 0.6, t.z + 0.7],
          [t.x + 0.3, 2, t.z + 1.2],
        ],
        0.045,
        "moss",
      );
  }
  for (let i = 0; i < 500; i++) {
    const x = random() * 100 - 53,
      z = random() * 94 - 49;
    if (
      Math.hypot(x, z) < 18 ||
      trailDistance(x, z) < 2.15 ||
      (x < -29 && x > -39 && z > 12 && z < 23) ||
      (x < -12 && x > -25 && z > -10 && z < 5)
    )
      continue;
    const y = tribalHeight(x, z);
    if (i % 5 === 0)
      rock([x, y + 0.3, z], [0.7, 0.55, 0.8], i % 2 ? "dark" : "moss", false);
    for (let k = 0; k < 6; k++)
      leaf([x, y, z], 1 + random(), k * 1.047 + i, 0.4, 0.22);
  }
  // Moss pads and fractured stonework connect architecture to the forest floor.
  for (let i = 0; i < 65; i++) {
    const side = i % 2 ? 1 : -1,
      x = side * (12 + random() * 7),
      z = -20 + random() * 4;
    if (trailDistance(x, z) < 2.1) continue;
    rock(
      [x, tribalHeight(x, z) + 0.2, z],
      [0.35 + random() * 0.55, 0.2 + random() * 0.35, 0.35 + random() * 0.45],
      i % 3 ? "stone" : "moss",
      false,
    );
    if (i % 3 === 0)
      for (let j = 0; j < 4; j++)
        leaf([x, tribalHeight(x, z) + 0.25, z], 0.7, j * 1.5, 0.2, 0.12);
  }
  // Two enormous roots embrace the rear sanctuary; vines hang clear of all routes.
  for (const side of [-1, 1]) {
    curve(
      [
        [side * 17, 0, -25],
        [side * 15, 5, -22],
        [side * 11, 9.5, -21],
        [side * 5, 11.8, -21],
      ],
      0.5,
    );
    for (let i = 0; i < 9; i++) {
      const x = side * (2 + i * 1.6),
        h = 8 + Math.sin(i) * 2;
      curve(
        [
          [x, h, -20],
          [x - 0.4, h - 2, -18.2],
          [x + 0.5, 2 + random() * 3, -18],
        ],
        0.035 + random() * 0.025,
        "moss",
      );
      for (let j = 0; j < 3; j++)
        leaf([x, h - 1.3 * j, -18], 0.55, random() * 7, 0.2, 0.13);
    }
  }
  for (const [id, geometries] of buckets) {
    const [key, blocking] = id.split(":") as [MaterialKey, string];
    const merged = mergeGeometries(geometries, false)!;
    geometries.forEach((g) => g.dispose());
    merged.computeBoundingSphere();
    const mesh = new T.Mesh(merged, materials[key]);
    mesh.name = `sanctuary-${id}`;
    mesh.castShadow = ["stone", "dark", "wood", "bark", "ash"].includes(key);
    mesh.receiveShadow = key !== "leaf" && key !== "ember";
    mesh.userData.cameraBlocker = false;
    group.add(mesh);
  }
  // Low-poly obstruction proxies share the movement envelope; ornate carvings do not
  // turn five camera rays into hundreds of thousands of triangle tests every frame.
  const proxyMaterial = new T.MeshBasicMaterial();
  for (const solid of SOLIDS) {
    const h = solid.id.startsWith("tree-")
      ? 12
      : solid.id.startsWith("stump-")
        ? 0.65
        : solid.id.startsWith("jury-")
          ? 2.5
          : solid.id.includes("backdrop")
            ? 5
            : solid.id.includes("gate")
              ? 6
              : solid.id.includes("booth") || solid.id.includes("privacy")
                ? 3.9
                : 2;
    const proxy = new T.Mesh(
      new T.BoxGeometry(solid.hx * 2, h, solid.hz * 2),
      proxyMaterial,
    );
    proxy.position.set(solid.x, h / 2, solid.z);
    proxy.rotation.y = solid.yaw || 0;
    proxy.visible = false;
    proxy.userData.cameraBlocker = true;
    proxy.name = `camera-${solid.id}`;
    group.add(proxy);
  }
  const roof = new T.Mesh(new T.BoxGeometry(8, 0.5, 8), proxyMaterial);
  roof.position.set(-34, 4.6, 18);
  roof.visible = false;
  roof.userData.cameraBlocker = true;
  group.add(roof);
  return {
    group,
    flames,
    dispose: () => {
      group.traverse((o) => {
        if ((o as T.Mesh).isMesh) (o as T.Mesh).geometry.dispose();
      });
      proxyMaterial.dispose();
      dispose();
    },
  };
}
