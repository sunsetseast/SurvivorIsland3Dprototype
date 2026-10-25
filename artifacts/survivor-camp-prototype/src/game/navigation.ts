import {
  BOUNDS,
  groundHeight,
  isWalkable,
  movePlayer,
  pathDistance,
  type Point,
} from "./world.ts";

export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.z - b.z);
export type Avoid = Point & { radius: number };
function avoidsSegment(a: Point, b: Point, avoid: Avoid[]) {
  const dx = b.x - a.x,
    dz = b.z - a.z,
    len2 = dx * dx + dz * dz || 1;
  return avoid.every((q) => {
    const t = Math.max(
      0,
      Math.min(1, ((q.x - a.x) * dx + (q.z - a.z) * dz) / len2),
    );
    return Math.hypot(q.x - a.x - dx * t, q.z - a.z - dz * t) >= q.radius;
  });
}
/** Edges are validated against the SAME substeps/height rule as the player. */
export function clearSegment(a: Point, b: Point, avoid: Avoid[] = []): boolean {
  if (!avoidsSegment(a, b, avoid)) return false;
  const len = distance(a, b),
    n = Math.max(1, Math.ceil(len / 0.18));
  let prev = a;
  for (let i = 1; i <= n; i++) {
    const p = {
      x: a.x + ((b.x - a.x) * i) / n,
      z: a.z + ((b.z - a.z) * i) / n,
    };
    if (!isWalkable(p.x, p.z) || avoid.some((q) => distance(p, q) < q.radius))
      return false;
    const step = movePlayer(prev, p.x - prev.x, p.z - prev.z);
    if (
      distance(step, p) > 0.001 ||
      Math.abs(groundHeight(p.x, p.z) - groundHeight(prev.x, prev.z)) > 0.18
    )
      return false;
    prev = p;
  }
  return true;
}

type Node = Point & { id: number; edges: number[]; trail: number };
/** Rebuilt from world geometry once. A* is not tied to a fixed route itinerary. */
export class CampNavigation {
  readonly nodes: Node[] = [];
  private grid = new Map<string, number>();
  private cache = new Map<string, Point[]>();
  constructor(readonly step = 1) {
    for (let x = Math.ceil(BOUNDS.minX + 1); x < BOUNDS.maxX; x += step) {
      for (let z = Math.ceil(BOUNDS.minZ + 1); z < BOUNDS.maxZ; z += step) {
        if (!isWalkable(x, z)) continue;
        const id = this.nodes.length;
        this.nodes.push({ id, x, z, edges: [], trail: pathDistance(x, z, 5) });
        this.grid.set(`${x},${z}`, id);
      }
    }
    for (const a of this.nodes)
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [-1, 1],
        [1, -1],
        [-1, -1],
      ]) {
        const id = this.grid.get(`${a.x + dx! * step},${a.z + dz! * step}`);
        if (id !== undefined && clearSegment(a, this.nodes[id]!))
          a.edges.push(id);
      }
  }
  private nearest(p: Point, avoid: Avoid[]) {
    return this.nodes
      .filter(
        (n) =>
          distance(n, p) < 2.1 * this.step &&
          !avoid.some((q) => distance(n, q) < q.radius),
      )
      .sort((a, b) => distance(a, p) - distance(b, p))
      .find((n) => clearSegment(p, n, avoid));
  }
  route(start: Point, goal: Point, avoid: Avoid[] = []): Point[] | null {
    if (!isWalkable(start.x, start.z) || !isWalkable(goal.x, goal.z))
      return null;
    const key = [start.x, start.z, goal.x, goal.z].join(":");
    if (!avoid.length && this.cache.has(key))
      return this.cache.get(key)!.map((p) => ({ ...p }));
    const from = this.nearest(start, avoid),
      to = this.nearest(goal, avoid);
    if (!from || !to) return null;
    // Binary heap: a route search never scans the entire frontier per iteration.
    const heap: { id: number; f: number }[] = [];
    const push = (id: number, f: number) => {
      let i = heap.length;
      heap.push({ id, f });
      while (i) {
        const p = (i - 1) >> 1;
        if (heap[p]!.f <= f) break;
        heap[i] = heap[p]!;
        i = p;
      }
      heap[i] = { id, f };
    };
    const pop = () => {
      const first = heap[0]!,
        last = heap.pop()!;
      if (heap.length) {
        let i = 0;
        while (i * 2 + 1 < heap.length) {
          let c = i * 2 + 1;
          if (c + 1 < heap.length && heap[c + 1]!.f < heap[c]!.f) c++;
          if (heap[c]!.f >= last.f) break;
          heap[i] = heap[c]!;
          i = c;
        }
        heap[i] = last;
      }
      return first;
    };
    const costs = new Map<number, number>([[from.id, 0]]),
      parent = new Map<number, number>(),
      closed = new Set<number>();
    push(from.id, distance(from, to));
    let found = false;
    while (heap.length) {
      const { id } = pop();
      if (closed.has(id)) continue;
      if (id === to.id) {
        found = true;
        break;
      }
      closed.add(id);
      const a = this.nodes[id]!;
      for (const next of a.edges) {
        const b = this.nodes[next]!;
        // Static edges were already validated at construction. Rechecking terrain
        // and every prop for each dynamic avoidance search causes avoidable spikes.
        if (closed.has(next) || (avoid.length && !avoidsSegment(a, b, avoid)))
          continue;
        const g =
          costs.get(id)! + distance(a, b) * (1 + Math.min(4, b.trail) * 0.45);
        if (g >= (costs.get(next) ?? Infinity)) continue;
        costs.set(next, g);
        parent.set(next, id);
        push(next, g + distance(b, to));
      }
    }
    if (!found) return null;
    const path: Point[] = [{ ...goal }];
    for (
      let id: number | undefined = to.id;
      id !== undefined;
      id = parent.get(id)
    ) {
      const n = this.nodes[id]!;
      path.unshift({ x: n.x, z: n.z });
    }
    // Short line-of-sight smoothing respects collision AND avoids cutting whole
    // jungle corners. Keeping a 3m lookahead preserves the visible trail shape.
    const out: Point[] = [];
    let current = start;
    for (let i = 0; i < path.length;) {
      let j = i;
      while (
        j + 1 < path.length &&
        distance(current, path[j + 1]!) <= 3 &&
        clearSegment(current, path[j + 1]!, avoid)
      )
        j++;
      out.push(path[j]!);
      current = path[j]!;
      i = j + 1;
    }
    if (!avoid.length) {
      if (this.cache.size >= 160) this.cache.clear();
      this.cache.set(key, out);
    }
    return out.map((p) => ({ ...p }));
  }
  /** Dynamic targets use an accessible ring, never a destination inside a person. */
  standNear(
    target: Point,
    from: Point,
    radius = 1.65,
    avoid: Avoid[] = [],
  ): Point | null {
    const angle = Math.atan2(from.x - target.x, from.z - target.z);
    for (const delta of [0, 0.65, -0.65, 1.3, -1.3, Math.PI]) {
      const p = {
        x: target.x + Math.sin(angle + delta) * radius,
        z: target.z + Math.cos(angle + delta) * radius,
      };
      if (
        clearSegment(p, target) &&
        !avoid.some((q) => distance(p, q) < q.radius) &&
        this.route(from, p, avoid)
      )
        return p;
    }
    return null;
  }
}
