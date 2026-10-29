import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import {
  BROADLEAF,
  PALMS,
  FERNS,
  SHRUBS,
  ROCKS,
  baseHeight,
  pathDistance,
  isWalkable,
  groundHeight,
  type Veg,
} from "../world";
import { NaturalLandmarks } from "./Landmarks";
import { NATURAL_LANDMARKS, SPRING, cliffTopHeight } from "./geography";
import { makeShrub } from "../flora";
import { Flora } from "../Flora";
import { useEnvironmentKit, meshPart } from "./assets";
import { BACKDROP_TREES, CLIFF_MASSES } from "./composition";

type Placement = {
  x: number;
  z: number;
  y?: number;
  scale: number;
  rotation: number;
  tilt?: number;
};
/** One draw per material/LOD. Distance compaction is done four times/sec;
 * no per-frame React updates, no foliage alpha blending or sorting. */
function Batch({
  mesh,
  items,
  low,
  near = 32,
  far = false,
  cast = false,
  blocker = false,
  tint = "#ffffff",
  burial = 0.08,
}: {
  mesh: Pick<T.Mesh, "geometry" | "material">;
  items: Placement[];
  low: boolean;
  near?: number;
  far?: boolean;
  cast?: boolean;
  blocker?: boolean;
  tint?: string;
  burial?: number;
}) {
  const ref = useRef<T.InstancedMesh>(null),
    tick = useRef(1);
  const culling = useMemo(
    () => ({
      frustum: new T.Frustum(),
      matrix: new T.Matrix4(),
      sphere: new T.Sphere(),
    }),
    [],
  );
  const data = useMemo(() => {
    const o = new T.Object3D();
    return items.map((p) => {
      o.position.set(p.x, p.y ?? groundHeight(p.x, p.z) - burial, p.z);
      o.rotation.set(p.tilt ?? 0, p.rotation, 0);
      o.scale.setScalar(p.scale);
      o.updateMatrix();
      return { p, m: o.matrix.clone() };
    });
  }, [items, burial]);
  const color = useMemo(() => new T.Color(tint), [tint]);
  useLayoutEffect(() => {
    if (ref.current) {
      ref.current.count = 0;
      ref.current.boundingSphere = new T.Sphere(new T.Vector3(0, 20, 0), 300);
    }
  }, [data]);
  useFrame(({ camera }, dt) => {
    tick.current += dt;
    if (tick.current < 0.25) return;
    tick.current = 0;
    const m = ref.current;
    if (!m) return;
    let n = 0;
    camera.updateMatrixWorld();
    culling.frustum.setFromProjectionMatrix(
      culling.matrix.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse,
      ),
    );
    for (const { p, m: matrix } of data) {
      const d = Math.hypot(camera.position.x - p.x, camera.position.z - p.z);
      culling.sphere.center.set(
        p.x,
        (p.y ?? groundHeight(p.x, p.z)) + p.scale * 2,
        p.z,
      );
      culling.sphere.radius = Math.max(2, p.scale * 5);
      if (
        (far ? d >= near : d < near) &&
        d < (low ? 110 : 150) &&
        culling.frustum.intersectsSphere(culling.sphere)
      ) {
        m.setMatrixAt(n, matrix);
        m.setColorAt(n, color);
        n++;
      }
    }
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  useEffect(() => {
    // React clears refs before passive unmount cleanup. Retain this instance
    // so its GPU instance buffers are released even with dispose={null}.
    const instance = ref.current;
    return () => instance?.dispose();
  }, [mesh.geometry, mesh.material, items.length]);
  return (
    <instancedMesh
      ref={ref}
      args={[mesh.geometry, mesh.material, Math.max(1, items.length)]}
      dispose={null}
      castShadow={cast}
      receiveShadow
      userData={{ cameraBlocker: blocker }}
    />
  );
}
const veg = (ps: Veg[], factor = 1): Placement[] =>
  ps.map((p) => ({ ...p, scale: p.scale * factor }));

export function Environment({ low }: { low: boolean }) {
  const kit = useEnvironmentKit(low);
  const palmMaterial = useMemo(
    () =>
      new T.MeshStandardMaterial({
        vertexColors: true,
        side: T.DoubleSide,
        roughness: 0.9,
        color: "#accb8c",
      }),
    [],
  );
  useEffect(
    () => () => {
      palmMaterial.dispose();
    },
    [palmMaterial],
  );
  const plants = useMemo(
    () => ({
      trees: [
        ...veg(BROADLEAF, 3.2),
        ...BACKDROP_TREES.map((p) => ({ ...p, y: baseHeight(p.x, p.z) - 0.2 })),
      ],
      palms: veg(PALMS, 0.81),
      ferns: veg(FERNS, 3.2),
      shrubs: veg(
        SHRUBS.filter((p) => p.variant !== 99),
        0.48,
      ),
      boundary: veg(
        SHRUBS.filter((p) => p.variant === 99),
        1.25,
      ),
      stones: veg(ROCKS, 0.85),
      springRim: Array.from({ length: 11 }, (_, i) => {
        const a = (i * 6.283) / 11;
        return {
          x: SPRING.x + Math.cos(a) * 1.65,
          z: SPRING.z + Math.sin(a) * 1.35,
          scale: 0.25 + (i % 3) * 0.055,
          rotation: i * 2.399,
        };
      }),
      // Ankle-height scattered fragments use the scan without blocking a trail.
      litterStones: SHRUBS.filter(
        (p, i) =>
          i % 5 === 0 &&
          p.variant !== 99 &&
          pathDistance(p.x, p.z) > 2.7 &&
          isWalkable(p.x, p.z),
      ).map((p, i) => ({
        ...p,
        scale: 0.12 + (i % 4) * 0.035,
        rotation: i * 2.399,
      })),
    }),
    [],
  );
  const boundaryMesh = useMemo(
    () => ({
      geometry: makeShrub(),
      material: new T.MeshLambertMaterial({
        vertexColors: true,
        color: "#71844d",
        side: T.DoubleSide,
      }),
    }),
    [],
  );
  useEffect(
    () => () => {
      boundaryMesh.geometry.dispose();
      boundaryMesh.material.dispose();
    },
    [boundaryMesh],
  );
  const ledges = useMemo(() => {
    const rock = meshPart(kit.rock, low ? "limestone-far" : "limestone-near");
    if (!rock) return [];
    const out: Placement[] = [],
      ray = new T.Raycaster();
    CLIFF_MASSES.slice(0, 10).forEach((p, i) => {
      const surface = new T.Mesh(rock.geometry, rock.material);
      surface.position.set(p.x, p.y, p.z);
      surface.rotation.set(p.tilt, p.turn, 0);
      surface.scale.setScalar(p.s);
      surface.updateMatrixWorld(true);
      // Art-directed crown/ledge sites, grounded against the actual scan.
      // A successful ray is required: no approximate floating root heights.
      for (const [dx, dz] of [
        [-0.23, 0.05],
        [0.12, -0.08],
        [0, 0.25],
      ]) {
        const x = p.x + dx! * p.s,
          z = p.z + dz! * p.s;
        ray.set(new T.Vector3(x, p.y + p.s * 3.2, z), new T.Vector3(0, -1, 0));
        const hit = ray.intersectObject(surface, false)[0];
        if (hit)
          out.push({
            x,
            z,
            y: hit.point.y - 0.15,
            scale: 1.2 + (i % 3) * 0.2,
            rotation: i * 2.399,
          });
      }
    });
    for (const x of [-29, -13, 5, 23, 34])
      out.push({
        x,
        z: 112,
        y: baseHeight(x, 98) + cliffTopHeight(x) - 0.1,
        scale: 1.5,
        rotation: x * 0.4,
      });
    return out;
  }, [kit.rock, low]);
  const rock = meshPart(kit.rock, low ? "limestone-far" : "limestone-near");
  const rubble = useMemo(() => {
    const m = meshPart(kit.rock, "limestone-far");
    if (!m) return null;
    // Cliff orientation is upright; talus keeps the scan's broad natural base.
    const geometry = m.geometry.clone().rotateX(-Math.PI / 2);
    geometry.computeBoundingBox();
    const b = geometry.boundingBox!;
    geometry.translate(
      -(b.min.x + b.max.x) * 0.5,
      -b.min.y,
      -(b.min.z + b.max.z) * 0.5,
    );
    return { geometry, material: m.material };
  }, [kit.rock]);
  useEffect(
    () => () => {
      rubble?.geometry.dispose();
    },
    [rubble],
  );
  return (
    <group
      name={
        kit.settled
          ? kit.failures.length
            ? "camp-assets-degraded"
            : "camp-assets-ready"
          : "camp-assets-loading"
      }
      userData={{ failures: kit.failures }}
    >
      <NaturalLandmarks
        low={low}
        landmarks={kit.landmarks}
        rockMaterial={rock?.material}
        barkMaterial={meshPart(kit.tree, "coastal-trunk-near")?.material}
      />
      {rock && (
        <>
          {CLIFF_MASSES.map((p, i) => (
            <mesh
              key={i}
              name={`tonsai-headland-${i}`}
              geometry={rock.geometry}
              material={rock.material}
              position={[p.x, p.y, p.z]}
              rotation={[p.tilt, p.turn, 0]}
              scale={p.s}
              castShadow={i < 10}
              receiveShadow
              userData={{ cameraBlocker: true }}
              dispose={null}
            />
          ))}
          {rubble && (
            <Batch
              mesh={rubble}
              items={plants.springRim}
              low={low}
              near={low ? 38 : 50}
              burial={0.05}
              tint="#b6b5a4"
            />
          )}
          {rubble && (
            <Batch
              mesh={rubble}
              items={plants.litterStones}
              low={low}
              near={low ? 22 : 35}
              burial={0.06}
              tint="#b8af93"
            />
          )}
          {rubble && (
            <Batch
              mesh={rubble}
              items={plants.stones}
              low={low}
              near={110}
              blocker
              tint="#d9d7bb"
              burial={0.24}
            />
          )}
        </>
      )}
      {kit.tree && (
        <>
          {["trunk", "branches", "leaves"].map((part) =>
            ["near", "far"].map((level) => {
              if (part === "branches" && level === "far") return null;
              const m = meshPart(kit.tree, `coastal-${part}-${level}`);
              return (
                m && (
                  <Batch
                    key={part + level}
                    mesh={m}
                    items={plants.trees}
                    low={low}
                    near={low ? 24 : 36}
                    far={level === "far"}
                    cast={
                      part === "trunk" ||
                      (!low && level === "near" && part === "leaves")
                    }
                    blocker={part === "trunk"}
                  />
                )
              );
            }),
          )}
          {["trunk", "branches", "leaves"].map((part) => {
            const m = meshPart(kit.tree, `coastal-${part}-far`);
            return (
              m && (
                <Batch
                  key={part}
                  mesh={m}
                  items={
                    part === "leaves"
                      ? [
                          ...ledges,
                          ...NATURAL_LANDMARKS.filter((l) =>
                            [
                              "buttress",
                              "roots",
                              "strangler",
                              "leaning",
                            ].includes(l.kind),
                          ).flatMap((l, i) => {
                            const giant = l.kind === "buttress",
                              lean = l.kind === "leaning" ? 4.3 : 0;
                            return (
                              giant
                                ? [
                                    [0, 0, 0, 3.1],
                                    [-5, 1, -3, 1.6],
                                    [4, 2, 4, 1.8],
                                    [1, 3, -5, 1.5],
                                  ]
                                : [
                                    [lean, 0, 0, 2.1],
                                    [lean - 3, 1, 2, 1.2],
                                    [lean + 3, 2, -1, 1.1],
                                  ]
                            ).map(([dx, dy, dz, scale], j) => ({
                              x: l.x + dx!,
                              z: l.z + dz!,
                              y: baseHeight(l.x, l.z) + (giant ? 21 : 10) + dy!,
                              scale: scale!,
                              rotation: i * 1.73 + j * 2.399,
                            }));
                          }),
                        ]
                      : ledges
                  }
                  low={low}
                  near={190}
                />
              )
            );
          })}
        </>
      )}
      {kit.botanical &&
        [0, 1, 2].map((v) =>
          ["near", "far"].map((level) => (
            <group key={v + level}>
              {["wood", "leaves"].map((part) => {
                const m = meshPart(kit.botanical, `palm-${v}-${level}-${part}`);
                return (
                  m && (
                    <Batch
                      key={part}
                      mesh={
                        part === "leaves"
                          ? { geometry: m.geometry, material: palmMaterial }
                          : m
                      }
                      items={plants.palms.filter(
                        (_, i) => PALMS[i]!.variant === v,
                      )}
                      low={low}
                      near={low ? 26 : 42}
                      far={level === "far"}
                      cast={part === "wood" || (!low && level === "near")}
                      blocker={part === "wood"}
                    />
                  )
                );
              })}
            </group>
          )),
        )}
      <Batch
        mesh={boundaryMesh}
        items={plants.boundary}
        low={low}
        near={low ? 65 : 95}
      />
      {kit.fern &&
        ["a", "b", "c", "d"].map((v, i) => {
          const fern = meshPart(kit.fern, `fern_02_${v}`);
          return (
            fern && (
              <Batch
                key={v}
                mesh={fern}
                items={plants.ferns.filter((_, j) => j % 4 === i)}
                low={low}
                near={low ? 36 : 55}
              />
            )
          );
        })}
      {kit.tree &&
        ["trunk", "leaves"].map((part) => {
          const m = meshPart(kit.tree, `coastal-${part}-far`);
          return (
            m && (
              <Batch
                key={part}
                mesh={m}
                items={plants.shrubs}
                low={low}
                near={low ? 45 : 68}
              />
            )
          );
        })}
      {kit.settled && (!kit.tree || !kit.botanical) && <Flora />}
    </group>
  );
}
