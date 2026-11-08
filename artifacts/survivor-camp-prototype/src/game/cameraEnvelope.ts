import type { Piece } from "./challenge/equipment";
import * as T from "three";
/** Cached marked meshes only; bounded local candidates, no scene-wide per-frame rays. */
export class CameraEnvelope {
  private age = 10;
  private blockers: { mesh: T.Mesh; center: T.Vector3; radius: number }[] = [];
  private local: T.Object3D[] = [];
  private boxes: T.Box3[] = [];
  private localBoxes: T.Box3[] = [];
  private segments: {
    a: T.Vector3;
    b: T.Vector3;
    r: number;
    bounds: T.Box3;
  }[] = [];
  private localSegments: typeof this.segments = [];
  private segmentPoint = new T.Vector3();
  private hitPoint = new T.Vector3();
  private ray = new T.Raycaster();
  private direction = new T.Vector3();
  private probe = new T.Vector3();
  private offset = new T.Vector3();
  private hits: T.Intersection[] = [];
  resolve(
    scene: T.Scene,
    target: T.Vector3,
    desired: T.Vector3,
    height: (x: number, z: number) => number,
    dt: number,
  ) {
    this.age += dt;
    if (this.age > 1) {
      this.age = 0;
      this.blockers.length = 0;
      this.boxes.length = 0;
      this.segments.length = 0;
      scene.updateMatrixWorld();
      scene.traverse((o) => {
        const proxies = o.userData.cameraCylinders as
          | { x: number; y: number; z: number; r: number; h: number }[]
          | undefined;
        if (proxies)
          for (const p of proxies)
            this.boxes.push(
              new T.Box3(
                new T.Vector3(p.x - p.r, p.y, p.z - p.r),
                new T.Vector3(p.x + p.r, p.y + p.h, p.z + p.r),
              ),
            );
        const pieces = o.userData.cameraPieces as Piece[] | undefined;
        if (pieces) {
          for (const p of pieces) {
            if (p.kind === "beam") {
              const a = new T.Vector3(...p.a).applyMatrix4(o.matrixWorld),
                b = new T.Vector3(...p.b).applyMatrix4(o.matrixWorld),
                r = p.radius * o.matrixWorld.getMaxScaleOnAxis() + 0.08;
              this.segments.push({
                a,
                b,
                r,
                bounds: new T.Box3().setFromPoints([a, b]).expandByScalar(r),
              });
            } else {
              const size = p.kind === "box" ? p.size : p.size.map((n) => n * 2),
                box = new T.Box3(
                  new T.Vector3(-size[0]! / 2, -size[1]! / 2, -size[2]! / 2),
                  new T.Vector3(size[0]! / 2, size[1]! / 2, size[2]! / 2),
                );
              const matrix = new T.Matrix4().makeRotationY(
                p.kind === "box" ? (p.turn ?? 0) : 0,
              );
              matrix.setPosition(...p.at);
              matrix.premultiply(o.matrixWorld);
              this.boxes.push(box.applyMatrix4(matrix).expandByScalar(0.08));
            }
          }
          return;
        }
        const m = o as T.Mesh;
        if (!m.isMesh || !o.userData.cameraBlocker) return;
        if ((m as T.InstancedMesh).isInstancedMesh) {
          const instances = m as T.InstancedMesh,
            transform = new T.Matrix4();
          if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
          for (let i = 0; i < instances.count; i++) {
            instances.getMatrixAt(i, transform);
            transform.premultiply(m.matrixWorld);
            this.boxes.push(
              m.geometry
                .boundingBox!.clone()
                .applyMatrix4(transform)
                .expandByScalar(0.12),
            );
          }
          return;
        }
        if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
        const sphere = m.geometry.boundingSphere!;
        this.blockers.push({
          mesh: m,
          center: sphere.center.clone().applyMatrix4(m.matrixWorld),
          radius: sphere.radius * m.matrixWorld.getMaxScaleOnAxis(),
        });
      });
    }
    this.direction.subVectors(desired, target);
    let safe = this.direction.length();
    this.direction.normalize();
    this.local.length = 0;
    this.localBoxes.length = 0;
    this.localSegments.length = 0;
    for (const s of this.segments)
      if (s.bounds.distanceToPoint(target) < safe + 0.5)
        this.localSegments.push(s);
    for (const b of this.boxes)
      if (b.distanceToPoint(target) < safe + 0.5) this.localBoxes.push(b);
    for (const b of this.blockers)
      if (b.center.distanceToSquared(target) < (safe + b.radius + 0.5) ** 2)
        this.local.push(b.mesh);
    for (let i = 0; i < 5; i++) {
      const side = i === 1 ? -0.22 : i === 2 ? 0.22 : 0,
        up = i === 3 ? 0.22 : i === 4 ? -0.22 : 0;
      this.offset.set(this.direction.z * side, up, -this.direction.x * side);
      this.probe.copy(target).add(this.offset);
      this.ray.set(this.probe, this.direction);
      this.ray.far = safe + 0.35;
      this.hits.length = 0;
      this.ray.intersectObjects(this.local, false, this.hits);
      for (const s of this.localSegments) {
        const d2 = this.ray.ray.distanceSqToSegment(
          s.a,
          s.b,
          this.hitPoint,
          this.segmentPoint,
        );
        if (d2 <= s.r * s.r) {
          const entry =
            this.hitPoint.distanceTo(this.probe) -
            Math.sqrt(Math.max(0, s.r * s.r - d2));
          safe = Math.min(safe, Math.max(0.65, entry - 0.22));
        }
      }
      for (const b of this.localBoxes)
        if (this.ray.ray.intersectBox(b, this.hitPoint))
          safe = Math.min(
            safe,
            Math.max(0.65, this.hitPoint.distanceTo(this.probe) - 0.3),
          );
      if (this.hits.length)
        safe = Math.min(safe, Math.max(0.65, this.hits[0]!.distance - 0.35));
    }
    for (let d = 0.65; d <= safe; d += 0.25) {
      this.probe.copy(target).addScaledVector(this.direction, d);
      if (this.probe.y < height(this.probe.x, this.probe.z) + 0.3) {
        safe = Math.max(0.65, d - 0.3);
        break;
      }
    }
    desired.copy(target).addScaledVector(this.direction, safe);
    desired.y = Math.max(desired.y, height(desired.x, desired.z) + 0.3);
    return safe;
  }
  clear() {
    this.blockers.length =
      this.local.length =
      this.boxes.length =
      this.localBoxes.length =
        0;
    this.segments.length = this.localSegments.length = 0;
    this.age = 10;
  }
}
