import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { rng } from "../world";
import {
  ARRIVAL,
  corridorClear,
  COUNCIL,
  drainageBed,
  approachSurface,
  occupiedSeats,
  councilPracticals,
  councilSolids,
  EXIT_PATH,
  PATHS,
  PATH_FILLS,
  STRUCTURES,
  TREES,
  TRIBAL,
  trailDistance,
  tribalHeight,
} from "./layout";
import { pavedAt, pavementTiles } from "./paving";
import { reclaimedStone } from "./assetPlacements";
import { buildThaiArchitecture } from "./thaiArchitecture";
import { sanctuaryMaterials, type MaterialKey } from "./surfaces";

type Vec = [number, number, number];
export type FlameSource = { x: number; y: number; z: number; size: number };

/** Static geometry is merged by surface and camera-blocking role (not hundreds of React meshes). */
export function buildSanctuary(attendeeCount = 5, authored = false) {
  const seats = occupiedSeats(attendeeCount);
  const PRACTICALS = councilPracticals(attendeeCount), SOLIDS = councilSolids(attendeeCount);
  const { materials, dispose } = sanctuaryMaterials(),
    group = new T.Group(),
    random = rng(11739);
  group.name = "council-environment";
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
      const warm = PATH_FILLS.reduce(
        (sum, f) =>
          sum +
          f.strength *
            Math.max(
              0,
              1 -
                Math.hypot(positions.getX(i) - f.x, positions.getZ(i) - f.z) /
                  f.radius,
            ),
        0,
      );
      const x = positions.getX(i), z = positions.getZ(i);
      const stain = .82 + .13 * Math.sin(x * .7 + Math.sin(z * .43)) * Math.sin(z * .56);
      const damp = Math.max(0, 1 - positions.getY(i) / 1.7) * .14;
      color.setRGB((n + warm) * stain * (1-damp), (n + warm * .52) * stain, (n + warm * .18) * stain * .92);
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
      : positions.getX(0) < -28 && positions.getZ(0) > 10
        ? "pavilion"
        : positions.getX(0) < -24 && positions.getZ(0) < -19
          ? "approach"
          : "council";
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
    if (["stone", "trim", "dark", "brick", "plaster"].includes(key)) {
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
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i),
      z = gp.getZ(i),
      a = approachSurface(x, z);
    const bed = drainageBed(x, z);
    gp.setY(
      i,
      bed.weight > 0
        ? bed.height - 0.025
        : tribalHeight(x, z) -
            (a.distance < 1.5 ? 0.3 : pavedAt(x, z) && !reclaimedStone(x,z).missing ? 0.12 : 0.025),
    );
  }
  ground.computeVertexNormals();
  const guv = ground.getAttribute("uv");
  for (let i = 0; i < guv.count; i++)
    guv.setXY(i, guv.getX(i) * 14, guv.getY(i) * 14);
  add(ground, "ground", [0, 0, 0], [1, 1, 1], [0, 0, 0], false);
  // One continuous tessellation replaces disconnected stepping stones. Each top vertex
  // samples tribalHeight, including host apron, voting floor and the side exit.
  for (const tile of pavementTiles())
    add(
      tile.geometry,
      tile.moss ? "moss" : "stone",
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
      false,
      0.24,
    );

  buildThaiArchitecture({ add, box, beam, curve }, authored);

  // Side retaining wall anchors the eastern silhouette.
  for (let i = 0; i < 6; i++) {
    box("stone", [14.8, 1.4, -17 + i * 1.7], [1.8, 2.8, 1.6]);
    box("trim", [14.8, 2.85, -17 + i * 1.7], [2, 0.2, 1.7]);
  }
  // Carved arrival gateway: actual opening matches shared collision metadata.
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
  for (const p of PRACTICALS.filter((p) => !p.id.startsWith("personal-")))
    torch(p.x, p.z, p.height);

  // Only attending contestants receive geometry; no hidden maximum-layout furniture.
  group.userData.contestantSeats = seats.map(s => ({...s, position:[...s.position]}));
  group.userData.stoolCount = seats.length;
  for (const [i, s] of seats.entries()) {
    const [x, , z] = s.position,
      h = s.position[1],
      radius = 0.31 + (i % 4) * 0.009;
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
        [x + Math.cos(a) * 0.36, 0.03, z + Math.sin(a) * 0.36],
        [x + Math.cos(a) * 0.3, 0.22, z + Math.sin(a) * 0.3],
        0.06,
        "bark",
        false,
        0.035,
      );
    }
  }

  // Ash basin, separate rough stones, split blackened timber and emissive coals.
  add(
    new T.CylinderGeometry(1.6, 1.7, 0.13, 36),
    "ash",
    [0, 0.07, 0],
    [1, 1, 1],
    [0, 0, 0],
    false,
  );
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    rock(
      [Math.sin(a) * 1.65, 0.29, Math.cos(a) * 1.65],
      [0.31, 0.25, 0.3],
      i % 3 ? "dark" : "stone",
    );
  }
  for (let i = 0; i < 9; i++) {
    const a = i * 2.1;
    beam(
      [Math.cos(a) * 1.05, 0.2, Math.sin(a) * 1.05],
      [-Math.cos(a) * 0.95, 0.45 + i * 0.045, -Math.sin(a) * 0.95],
      0.16,
      "ash",
    );
  }
  for (let i = 0; i < 50; i++) {
    const a = random() * 7,
      r = random() * 1.3;
    rock(
      [Math.sin(a) * r, 0.18 + random() * 0.18, Math.cos(a) * r],
      [0.07 + random() * 0.12, 0.045, 0.09],
      "ember",
      false,
    );
  }
  flames.push({ x: 0, y: 0.4, z: 0, size: 1.15 });

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
          course < 3 ? "stone" : "wood",
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
  // Survivor ceremony dressing: personal torch stations form an intimate crescent.
  // Kept behind the reserved seating to avoid obstructing the walkable council floor.
  for (const p of PRACTICALS.filter((p) => p.id.startsWith("personal-"))) {
    const h = tribalHeight(p.x, p.z);
    beam([p.x, h, p.z], [p.x, h + p.height, p.z], 0.085, "wood", false);
    add(
      new T.CylinderGeometry(0.2, 0.11, 0.35, 8),
      "dark",
      [p.x, h + p.height, p.z],
      [1, 1, 1],
      [0, 0, 0],
      false,
    );
    flames.push({ x: p.x, y: h + p.height + 0.12, z: p.z, size: 0.28 });
  }
  // Distinctive Survivor snuffing ritual: a contestant presents their torch
  // at a dedicated low stone receiver beside the host, not in the walkway.
  const snuff = COUNCIL.snuff;
  box("stone", [snuff.x, snuff.y + 0.28, snuff.z], [0.8, 0.56, 0.8]);
  add(new T.CylinderGeometry(0.17, 0.24, 0.24, 10), "ash", [
    snuff.x,
    snuff.y + 0.68,
    snuff.z,
  ]);
  ring([snuff.x, snuff.y + 0.82, snuff.z], 0.23, 0.04, "trim", [
    Math.PI / 2,
    0,
    0,
  ]);
  // Terrace is now part of the same graded masonry pavement as the courtyard.
  // An embedded brick edge, below the tread, anchors it without an abrupt raised slab.
  for (let i = 0; i < 10; i++) {
    const x = 3.3 + i * 0.64,
      z = 6.45;
    box(
      "brick",
      [x, tribalHeight(x, z) - 0.09, z],
      [0.61, 0.16, 0.25],
      [0, 0, 0],
      false,
    );
  }
  const u = COUNCIL.urn,
    sy = COUNCIL.snuff.y;
  add(new T.CylinderGeometry(0.36, 0.45, 0.7, 8), "stone", [
    u.x,
    u.y + 0.35,
    u.z,
  ]);
  add(new T.CylinderGeometry(0.33, 0.24, 0.5, 16), "wood", [
    u.x,
    u.y + 0.95,
    u.z,
  ]);
  add(
    new T.LatheGeometry(
      [
        new T.Vector2(0, 0),
        new T.Vector2(0.36, 0),
        new T.Vector2(0.25, 0.12),
        new T.Vector2(0.07, 0.18),
      ],
      16,
    ),
    "wood",
    [u.x, u.y + 1.2, u.z],
  );
  for (const side of [-1, 1])
    curve(
      [
        [u.x + side * 0.29, u.y + 0.96, u.z],
        [u.x + side * 0.46, u.y + 1.08, u.z],
        [u.x + side * 0.29, u.y + 1.17, u.z],
      ],
      0.035,
      "gold",
      false,
    );
  const sf = COUNCIL.snuff;
  beam(
    [sf.x - 0.48, sy + 0.42, sf.z + 0.55],
    [sf.x + 0.48, sy + 0.42, sf.z + 0.55],
    0.03,
    "gold",
    false,
  );
  add(
    new T.ConeGeometry(0.2, 0.28, 12),
    "dark",
    [sf.x + 0.43, sy + 0.3, sf.z + 0.55],
    [1, 1, 1],
    [Math.PI, 0, 0],
    false,
  );
  // Broken portal frames the new route; its two piers share movement/camera footprints.
  for (const s of STRUCTURES.filter((s) => s.id.startsWith("exit-gate-"))) {
    const h = tribalHeight(s.x, s.z);
    for (let course = 0; course < 7; course++)
      box(
        course % 3 ? "brick" : "trim",
        [s.x, h + 0.28 + course * 0.57, s.z],
        [1.3, 0.54, 1.3],
      );
  }
  beam([19.68, 4.5, 4.7], [22.32, 4.5, 0.3], 0.28, "stone");

  // Buttress jungle trees, sweeping roots, layered palm/fern leaves and draped vines.
  const leaf = (
    p: Vec,
    len: number,
    yaw: number,
    bend: number,
    width: number,
    segments = 7,
  ) => {
    const vertices: number[] = [],
      uvs: number[] = [],
      indices: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments,
        w = Math.sin(t * Math.PI) * width,
        y = Math.sin(t * Math.PI) * len * 0.24 - t * t * bend;
      vertices.push(-w, y, t * len, w, y, t * len);
      uvs.push(0, t, 1, t);
      if (i < segments) {
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
      !corridorClear(x, z, 2.1) ||
      (x < -29 && x > -39 && z > 12 && z < 23) ||
      (x < -12 && x > -25 && z > -10 && z < 5)
    )
      continue;
    const y = tribalHeight(x, z);
    if (i % 5 === 0)
      rock([x, y + 0.3, z], [0.7, 0.55, 0.8], i % 2 ? "dark" : "moss", false);
    if (i % 3 === 0) {
      for (let k = 0; k < 5; k++) {
        const a = k * 1.257 + i,
          len = 0.9 + random() * 0.6;
        for (let j = 1; j <= 4; j++) {
          const f = j / 5,
            p: Vec = [
              x + Math.sin(a) * len * f,
              y + Math.sin(f * Math.PI) * 0.6,
              z + Math.cos(a) * len * f,
            ];
          for (const side of [-1, 1])
            leaf(p, (1 - f) * 0.45, a + side * 1.15, 0.12, 0.075, 2);
        }
      }
    } else
      for (let k = 0; k < (i % 2 ? 5 : 8); k++)
        leaf(
          [x, y, z],
          0.9 + random(),
          k * 1.047 + i,
          i % 2 ? 0.6 : 0.3,
          i % 2 ? 0.28 : 0.15,
        );
  }
  // Flat fallen leaves never become colliders; batched with rough bark, no alpha overdraw.
  for (let i=0; i<460; i++) {
    const x=-40+random()*80, z=-37+random()*64;
    if (Math.hypot(x,z)<2 || (pavedAt(x,z) && !reclaimedStone(x,z).missing)) continue;
    const g=new T.CircleGeometry(.1+random()*.1,5);
    add(g, i%4 ? "bark" : "moss", [x,tribalHeight(x,z)-.013,z], [1,.4+random()*.4,1], [-Math.PI/2,0,random()*6.28],false,.35);
  }
  // Moss pads and fractured stonework connect architecture to the forest floor.
  for (let i = 0; i < 65; i++) {
    const side = i % 2 ? 1 : -1,
      x = side * (12 + random() * 7),
      z = -20 + random() * 4;
    if (!corridorClear(x, z, 1.2)) continue;
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
  for (const [id, geometries] of buckets) {
    const [key, blocking] = id.split(":") as [MaterialKey, string];
    const merged = mergeGeometries(geometries, false)!;
    geometries.forEach((g) => g.dispose());
    merged.computeBoundingSphere();
    const mesh = new T.Mesh(merged, materials[key]);
    mesh.name = `sanctuary-${id}`;
    mesh.castShadow = [
      "stone",
      "dark",
      "wood",
      "bark",
      "ash",
      "brick",
      "roof",
    ].includes(key);
    mesh.receiveShadow = key !== "leaf" && key !== "ember";
    mesh.userData.cameraBlocker = false;
    group.add(mesh);
  }
  // Low-poly obstruction proxies share the movement envelope; ornate carvings do not
  // turn five camera rays into hundreds of thousands of triangle tests every frame.
  const proxyMaterial = new T.MeshBasicMaterial();
  for (const solid of SOLIDS) {
    const h =
      solid.height ??
      (solid.id.startsWith("approach-rail-")
        ? 0.9
        : solid.id.startsWith("tower-")
          ? 22
          : solid.id.startsWith("tree-")
            ? 12
            : solid.id.startsWith("stump-")
              ? 0.65
              : solid.id.startsWith("jury-")
                ? 2.5
                : solid.id.includes("backdrop")
                  ? 2.2
                  : solid.id.includes("gate")
                    ? 6
                    : solid.id.includes("booth") || solid.id.includes("privacy")
                      ? 3.9
                      : 2);
    const proxy = new T.Mesh(
      new T.BoxGeometry(solid.hx * 2, h, solid.hz * 2),
      proxyMaterial,
    );
    const base = solid.id.startsWith("approach-")
      ? tribalHeight(solid.x, solid.z)
      : 0;
    proxy.position.set(solid.x, base + h / 2, solid.z);
    proxy.rotation.y = solid.yaw || 0;
    proxy.visible = false;
    proxy.userData.cameraBlocker = true;
    proxy.name = `camera-${solid.id}`;
    group.add(proxy);
  }
  const roof = new T.Mesh(new T.BoxGeometry(8.4, 0.35, 8.5), proxyMaterial);
  roof.position.set(-34, 4.35, 18);
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
