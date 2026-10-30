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
import { GroundDetail } from "./GroundDetail";
import { Shelter } from "../Shelter";
import { FOREST_PLANTS } from "./forest";
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
export function Batch({
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
      if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
      culling.sphere.copy(mesh.geometry.boundingSphere!).applyMatrix4(matrix);
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
      name="habitat-instance-batch"
      ref={ref}
      args={[mesh.geometry, mesh.material, Math.max(1, items.length)]}
      dispose={null}
      castShadow={cast}
      receiveShadow
      userData={{
        cameraBlocker: blocker,
        visualFoliage: /understory.*leaves|forest.*crown/.test(
          mesh.geometry.name,
        ),
      }}
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
  const forestBark = useMemo(() => {
    const source = meshPart(kit.tree, "coastal-branches-near")?.material;
    if (!source) return undefined;
    const m = (
      Array.isArray(source) ? source[0] : source
    ).clone() as T.MeshStandardMaterial;
    m.vertexColors = false;
    m.color.setRGB(1.4, 1.38, 1.22);
    m.roughness = 1;
    return m;
  }, [kit.tree]);
  useEffect(() => () => forestBark?.dispose(), [forestBark]);
  const forestLeaf = useMemo(() => {
    const source = meshPart(kit.tree, "coastal-leaves-near")?.material;
    if (!source) return undefined;
    const m = (
      Array.isArray(source) ? source[0] : source
    ).clone() as T.MeshStandardMaterial;
    m.vertexColors = true;
    m.color.setRGB(1.1, 1.2, 1.04);
    m.roughness = 0.96;
    m.normalScale.set(0.22, 0.22);
    m.emissive.set("#556b42");
    m.emissiveIntensity = 0.22;
    m.emissiveMap = m.map;
    m.alphaHash = true;
    m.alphaTest = 0.3;
    m.transparent = false;
    m.onBeforeCompile = (s) => {
      s.fragmentShader = s.fragmentShader.replace(
        "#include <alphahash_fragment>",
        "diffuseColor.a*=smoothstep(1.0,3.0,length(vViewPosition));\n#include <alphahash_fragment>",
      );
    };
    m.customProgramCacheKey = () => "cupped-leaves-camera-dither-v1";
    return m;
  }, [kit.tree]);
  useEffect(() => () => forestLeaf?.dispose(), [forestLeaf]);
  const midstoryLeaf = useMemo(() => {
    const source = meshPart(kit.forest, "understory-1-leaves-far")?.material;
    if (!source) return undefined;
    const m = (
      Array.isArray(source) ? source[0] : source
    ).clone() as T.MeshStandardMaterial;
    m.alphaHash = true;
    m.alphaTest = 0.3;
    m.emissive.set("#708354");
    m.emissiveIntensity = 0.24;
    m.emissiveMap = m.map;
    m.onBeforeCompile = (s) => {
      s.fragmentShader = s.fragmentShader.replace(
        "#include <alphahash_fragment>",
        "diffuseColor.a*=smoothstep(1.5,3.0,length(vViewPosition));\n#include <alphahash_fragment>",
      );
    };
    m.customProgramCacheKey = () => "midstory-camera-dither-v1";
    return m;
  }, [kit.forest]);
  useEffect(() => () => midstoryLeaf?.dispose(), [midstoryLeaf]);
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
    const cliffMesh = meshPart(kit.landmarks, "southern-cliff-rock-far");
    if (cliffMesh) {
      const surface = new T.Mesh(cliffMesh.geometry, cliffMesh.material);
      surface.updateMatrixWorld(true);
      for (const x of [-29, -13, 5, 23, 34]) {
        ray.set(new T.Vector3(x, 110, 112), new T.Vector3(0, -1, 0));
        const hit = ray.intersectObject(surface, false)[0];
        if (hit)
          out.push({
            x,
            z: 112,
            y: hit.point.y - 0.1,
            scale: 1.5,
            rotation: x * 0.4,
          });
      }
    }
    return out;
  }, [kit.rock, kit.landmarks, low]);
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
      {kit.forest && (
        <>
          <Shelter asset={kit.forest} />
          <GroundDetail />
          {[0, 1, 2].flatMap((v) =>
            ["near", "far"].flatMap((level) =>
              ["wood", "crown"].map((part) => {
                if (low && level === "near") return null;
                const m = meshPart(kit.forest, `forest-${v}-${part}-${level}`);
                if (v === 0 && part === "wood") return null;
                return (
                  m && (
                    <Batch
                      key={`tree-${v}-${part}-${level}`}
                      mesh={
                        part === "wood" && forestBark
                          ? { geometry: m.geometry, material: forestBark }
                          : m
                      }
                      items={plants.trees
                        .filter((_, i) => i % 3 === v)
                        .map((p) => ({ ...p, scale: p.scale / 3.2 }))}
                      low={low}
                      near={low ? 190 : 28}
                      far={level === "far" && !low}
                      cast={part === "wood" || (!low && level === "near")}
                      blocker={part === "wood"}
                    />
                  )
                );
              }),
            ),
          )}
          {/* Preserve the high quality gnarled CC0 coastal trunk in the coastal fig mix. */}
          {["near", "far"].flatMap((level) =>
            ["trunk", "branches"].map((part) => {
              if (level === "far" && part === "branches") return null;
              const m = meshPart(kit.tree, `coastal-${part}-${level}`);
              return (
                m && (
                  <Batch
                    key={`scanned-fig-${part}-${level}`}
                    mesh={m}
                    items={plants.trees.filter((_, i) => i % 3 === 0)}
                    low={low}
                    near={low ? 18 : 28}
                    far={level === "far"}
                    cast
                    blocker
                  />
                )
              );
            }),
          )}
          {["wood", "leaves"].map((part) => {
            const m = meshPart(kit.botanical, `palm-0-far-${part}`);
            return (
              m && (
                <Batch
                  key={`juvenile-palm-${part}`}
                  mesh={
                    part === "leaves"
                      ? { geometry: m.geometry, material: palmMaterial }
                      : m
                  }
                  items={FOREST_PLANTS.filter(
                    (p) => p.variant === 2 && p.zone === "coastal",
                  ).map((p) => ({ ...p, scale: p.scale * 0.22 }))}
                  low={low}
                  near={low ? 55 : 75}
                />
              )
            );
          })}
          {[0, 1, 2].flatMap((v) =>
            ["near", "far"].flatMap((level) =>
              ["wood", "leaves"].map((part) => {
                if (low && level === "near") return null;
                const m = meshPart(
                  kit.forest,
                  `understory-${v}-${part}-${level}`,
                );
                return (
                  m && (
                    <Batch
                      key={`under-${v}-${part}-${level}`}
                      blocker={part === "wood" && v === 1}
                      mesh={
                        part === "wood" && v === 1 && forestBark
                          ? { geometry: m.geometry, material: forestBark }
                          : part === "leaves" && v === 1 && midstoryLeaf
                            ? { geometry: m.geometry, material: midstoryLeaf }
                            : part === "leaves" && forestLeaf
                              ? { geometry: m.geometry, material: forestLeaf }
                              : m
                      }
                      items={FOREST_PLANTS.filter(
                        (p) =>
                          p.variant === v && !(v === 2 && p.zone === "coastal"),
                      )}
                      low={low}
                      near={low ? 190 : 22}
                      far={level === "far" && !low}
                      cast={!low && level === "near" && part === "leaves"}
                    />
                  )
                );
              }),
            ),
          )}
          {/* Signature figs keep their original physical trunks, with full asymmetric crowns. */}
          {[0, 1, 2].map((v) => {
            const m = meshPart(kit.forest, `forest-${v}-crown-far`);
            return (
              m && (
                <Batch
                  key={`landmark-crown-${v}`}
                  mesh={m}
                  items={NATURAL_LANDMARKS.filter((l) =>
                    ["buttress", "roots", "strangler", "leaning"].includes(
                      l.kind,
                    ),
                  ).flatMap((l, i) => {
                    if (i % 3 !== v) return [];
                    const giant = l.kind === "buttress";
                    return [
                      {
                        x: l.x + (l.kind === "leaning" ? 4.3 : 0),
                        z: l.z,
                        y: baseHeight(l.x, l.z) + (giant ? 8 : 0),
                        scale: giant ? 1.75 : 1.18,
                        rotation: i * 2.399,
                      },
                    ];
                  })}
                  low={low}
                  near={190}
                  burial={0}
                />
              )
            );
          })}
          {/* Small rooted shrubs crown only real rock ledges. */}
          {meshPart(kit.forest, "understory-0-leaves-far") && (
            <Batch
              mesh={meshPart(kit.forest, "understory-0-leaves-far")!}
              items={ledges.map((p) => ({ ...p, scale: p.scale * 0.65 }))}
              low={low}
              near={190}
            />
          )}
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
      {kit.settled && (!kit.tree || !kit.botanical) && <Flora />}
    </group>
  );
}
