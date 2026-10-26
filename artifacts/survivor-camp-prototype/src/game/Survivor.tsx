import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { M, V, limb, merge, mk, type Geo } from "./geo";

type Motion = {
  speed: number;
  running: boolean;
  distance: number;
  talking?: boolean;
  seated?: boolean;
};
const SKIN = "#c98d62",
  SKIN_L = "#dba074",
  HAIR = "#2e1d12",
  TOP = "#d9573b",
  SHORTS = "#2f8a8a",
  ROPE = "#d6c08a",
  LEATHER = "#8a5a35",
  WRAP = "#f0e0b8";
const TBlend = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const sph = (
  r: number,
  m: THREE.Matrix4,
  hex: string,
  j = 0.04,
  top?: string,
  y0 = -1,
  y1 = 1,
) => mk(new THREE.SphereGeometry(r, 12, 9), m, hex, j, top, y0, y1);

function useParts() {
  return useMemo(() => {
    const pelvis: Geo[] = [
      mk(
        new THREE.CylinderGeometry(0.19, 0.2, 0.2, 12),
        M(0, 0.02, 0, 0, 0, 0, 1.12, 1, 0.8),
        SHORTS,
        0.05,
      ),
      mk(
        new THREE.TorusGeometry(0.2, 0.025, 5, 14),
        M(0, 0.1, 0, Math.PI / 2, 0, 0, 1.12, 0.8, 1),
        ROPE,
        0.05,
      ),
      mk(
        new THREE.BoxGeometry(0.2, 0.2, 0.1),
        M(0.24, -0.04, 0.02, 0, 0, 0.1),
        "#7a5230",
        0.06,
      ),
      mk(
        new THREE.BoxGeometry(0.2, 0.05, 0.11),
        M(0.24, 0.06, 0.02, 0, 0, 0.1),
        "#5a3b1c",
        0.06,
      ),
    ];
    const torso: Geo[] = [
      mk(
        new THREE.CylinderGeometry(0.2, 0.17, 0.62, 14),
        M(0, 0.3, 0, 0, 0, 0, 1.2, 1, 0.78),
        TOP,
        0.05,
        "#e8704a",
        0.1,
        0.6,
      ),
      sph(0.205, M(0, 0.56, 0, 0, 0, 0, 1.25, 0.6, 0.8), TOP, 0.04),
      mk(
        new THREE.BoxGeometry(0.07, 0.26, 0.045),
        M(0.13, 0.62, 0.0, 0, 0, 0.1),
        TOP,
        0.04,
      ),
      mk(
        new THREE.BoxGeometry(0.07, 0.26, 0.045),
        M(-0.13, 0.62, 0.0, 0, 0, -0.1),
        TOP,
        0.04,
      ),
      sph(0.07, M(0, 0.62, 0.0), SKIN, 0.03),
      limb(
        V(-0.22, 0.58, 0.08),
        V(0.2, 0.06, -0.1),
        0.02,
        0.02,
        "#6b4423",
        undefined,
        5,
      ),
      mk(
        new THREE.CylinderGeometry(0.2, 0.2, 0.05, 12),
        M(0, 0.02, 0, 0, 0, 0, 1.2, 1, 0.8),
        "#f0d8a0",
        0.05,
      ),
    ];
    const head: Geo[] = [
      mk(
        new THREE.CylinderGeometry(0.055, 0.065, 0.14, 8),
        M(0, 0.02, 0),
        SKIN,
        0.03,
      ),
      sph(
        0.19,
        M(0, 0.22, 0.01, 0, 0, 0, 0.9, 1.06, 0.98),
        SKIN_L,
        0.03,
        SKIN,
        0,
        0.4,
      ),
      sph(0.045, M(0, 0.2, 0.19, 0, 0, 0, 0.8, 1, 1.1), SKIN_L, 0.02),
      sph(0.035, M(0.17, 0.21, 0.0, 0, 0, 0, 0.5, 1, 0.9), SKIN, 0.02),
      sph(0.035, M(-0.17, 0.21, 0.0, 0, 0, 0, 0.5, 1, 0.9), SKIN, 0.02),
      sph(0.018, M(0.07, 0.25, 0.165,0,0,0,1,.6,.5), "#d8c9ad", 0.01),
      sph(.009,M(.07,.25,.175,0,0,0,1,1,.4),"#34261d",.01),
      sph(0.018, M(-0.07, 0.25, 0.165,0,0,0,1,.6,.5), "#d8c9ad", 0.01),
      sph(.009,M(-.07,.25,.175,0,0,0,1,1,.4),"#34261d",.01),
      mk(
        new THREE.BoxGeometry(0.07, 0.014, 0.02),
        M(0.07, 0.29, 0.17, 0, 0, 0.1),
        HAIR,
        0.02,
      ),
      mk(
        new THREE.BoxGeometry(0.07, 0.014, 0.02),
        M(-0.07, 0.29, 0.17, 0, 0, -0.1),
        HAIR,
        0.02,
      ),
      mk(
        new THREE.BoxGeometry(0.07, 0.012, 0.02),
        M(0, 0.12, 0.18),
        "#a85a4a",
        0.04,
      ),
      // hair cap, swept back
      mk(
        new THREE.SphereGeometry(
          0.205,
          14,
          10,
          0,
          Math.PI * 2,
          0,
          Math.PI * 0.58,
        ),
        M(0, 0.235, -0.025, -0.25, 0, 0, 0.92, 1.05, 1.02),
        HAIR,
        0.1,
      ),
      mk(
        new THREE.BoxGeometry(0.34, 0.07, 0.07),
        M(0, 0.33, 0.145, 0.1, 0, 0),
        HAIR,
        0.1,
      ),
      // bandana
      mk(
        new THREE.TorusGeometry(0.185, 0.026, 6, 16),
        M(0, 0.3, 0, Math.PI / 2 - 0.12, 0, 0, 0.92, 1.0, 1.0),
        "#e9ae3c",
        0.04,
      ),
      mk(
        new THREE.BoxGeometry(0.06, 0.12, 0.02),
        M(0.07, 0.24, -0.2, 0.2, 0, 0.3),
        "#e9ae3c",
        0.04,
      ),
    ];
    const tail: Geo[] = [
      sph(0.06, M(0, 0, 0), HAIR, 0.08),
      limb(
        V(0, 0, 0),
        V(0, -0.22, -0.08),
        0.055,
        0.03,
        HAIR,
        undefined,
        6,
        0.1,
      ),
      mk(
        new THREE.TorusGeometry(0.055, 0.012, 4, 8),
        M(0, -0.04, -0.01, Math.PI / 2, 0, 0),
        "#e9ae3c",
        0.03,
      ),
    ];
    const upper = (hex: string): Geo[] => [
      sph(0.07, M(0, 0, 0), hex, 0.03),
      limb(V(0, 0, 0), V(0, -0.3, 0), 0.062, 0.05, hex, undefined, 8, 0.03),
    ];
    const armU = [
      ...upper(SKIN),
      mk(
        new THREE.CylinderGeometry(0.068, 0.07, 0.1, 10),
        M(0, -0.04, 0),
        TOP,
        0.04,
      ),
    ];
    const forearm: Geo[] = [
      sph(0.05, M(0, 0, 0), SKIN, 0.03),
      limb(V(0, 0, 0), V(0, -0.27, 0), 0.05, 0.038, SKIN, undefined, 8, 0.03),
      mk(
        new THREE.CylinderGeometry(0.043, 0.043, 0.06, 8),
        M(0, -0.22, 0),
        WRAP,
        0.05,
      ),
      sph(0.045, M(0, -0.32, 0.01, 0, 0, 0, 0.9, 1.25, 0.6), SKIN_L, 0.03),
      sph(0.02, M(0.04, -0.3, 0.03), SKIN_L, 0.02),
    ];
    const thigh: Geo[] = [
      sph(0.1, M(0, 0, 0), SHORTS, 0.03),
      limb(
        V(0, 0, 0),
        V(0, -0.3, 0),
        0.105,
        0.095,
        SHORTS,
        undefined,
        10,
        0.04,
      ),
      mk(
        new THREE.CylinderGeometry(0.1, 0.1, 0.03, 10),
        M(0, -0.3, 0),
        "#1f6a6a",
        0.04,
      ),
      limb(
        V(0, -0.3, 0),
        V(0, -0.47, 0),
        0.085,
        0.075,
        SKIN,
        undefined,
        8,
        0.03,
      ),
    ];
    const shin: Geo[] = [
      sph(0.075, M(0, 0, 0), SKIN, 0.03),
      limb(V(0, 0, 0), V(0, -0.4, 0), 0.07, 0.048, SKIN, undefined, 8, 0.03),
      mk(
        new THREE.CylinderGeometry(0.052, 0.052, 0.07, 8),
        M(0, -0.38, 0),
        WRAP,
        0.05,
      ),
    ];
    const foot: Geo[] = [
      sph(0.05, M(0, 0, 0.0), SKIN, 0.03),
      mk(
        new THREE.BoxGeometry(0.1, 0.035, 0.27),
        M(0, -0.055, 0.08),
        LEATHER,
        0.06,
      ),
      sph(0.055, M(0, -0.025, 0.1, 0, 0, 0, 1, 0.55, 2.0), SKIN_L, 0.03),
      mk(
        new THREE.BoxGeometry(0.11, 0.015, 0.03),
        M(0, -0.012, 0.08, 0, 0, 0),
        "#5a3b1c",
        0.05,
      ),
      mk(
        new THREE.BoxGeometry(0.11, 0.015, 0.03),
        M(0, -0.012, 0.0, 0, 0, 0),
        "#5a3b1c",
        0.05,
      ),
    ];
    return {
      pelvis: merge(pelvis),
      torso: merge(torso),
      head: merge(head),
      tail: merge(tail),
      armU: merge(armU),
      forearm: merge(forearm),
      thigh: merge(thigh),
      shin: merge(shin),
      foot: merge(foot),
    };
  }, []);
}

function Part({ g, mat }: { g: Geo; mat: THREE.Material }) {
  return <mesh geometry={g} material={mat} castShadow />;
}

export function Survivor({
  motion,
}: {
  motion: React.MutableRefObject<Motion>;
}) {
  const p = useParts();
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92 }),
    [],
  );
  useEffect(
    () => () => {
      Object.values(p).forEach((g) => g.dispose());
      mat.dispose();
    },
    [p, mat],
  );
  const hips = useRef<THREE.Group>(null),
    spine = useRef<THREE.Group>(null),
    head = useRef<THREE.Group>(null),
    tail = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null),
    armR = useRef<THREE.Group>(null),
    elL = useRef<THREE.Group>(null),
    elR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null),
    legR = useRef<THREE.Group>(null),
    knL = useRef<THREE.Group>(null),
    knR = useRef<THREE.Group>(null);
  const ankL = useRef<THREE.Group>(null),
    ankR = useRef<THREE.Group>(null);
  const st = useRef({
    phase: 0,
    last: 0,
    init: false,
    move: 0,
    run: 0,
    sit: motion.current.seated ? 1 : 0,
  });

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05),
      m = motion.current,
      s = st.current,
      t = clock.elapsedTime;
    if (!s.init) {
      s.last = m.distance;
      s.init = true;
    }
    let dd = Math.abs(m.distance - s.last);
    s.last = m.distance;
    if (dd > 2) dd = 0;
    const runK = clamp((m.running ? 1 : 0) * clamp(m.speed / 4.5, 0, 1), 0, 1);
    s.run += (runK - s.run) * (1 - Math.exp(-dt * 8));
    s.move += (clamp(m.speed / 0.9, 0, 1) - s.move) * (1 - Math.exp(-dt * 12));
    s.phase += dd * ((Math.PI * 2) / (2.5 + s.run * 1.2));
    const ph = s.phase,
      A = (0.5 + 0.38 * s.run) * s.move,
      mv = s.move,
      rn = s.run;
    const sinL = Math.sin(ph),
      sinR = Math.sin(ph + Math.PI),
      cosL = Math.cos(ph),
      cosR = Math.cos(ph + Math.PI);
    const kn = (c: number) =>
      (Math.max(0, c) * (0.9 + rn * 0.9) + 0.06 + rn * 0.15) * mv;
    const set = (
      g: React.RefObject<THREE.Group | null>,
      x: number,
      y = 0,
      z = 0,
    ) => {
      if (g.current) g.current.rotation.set(x, y, z);
    };
    set(legL, -sinL * A * 0.95);
    set(legR, -sinR * A * 0.95);
    set(knL, kn(cosL) * A * 1.4);
    set(knR, kn(cosR) * A * 1.4);
    set(ankL, sinL * A * 0.35 - kn(cosL) * 0.15);
    set(ankR, sinR * A * 0.35 - kn(cosR) * 0.15);
    const idle = Math.sin(t * 1.3) * 0.02;
    const gesture = m.talking
      ? Math.max(0, Math.sin(t * 1.2)) * Math.max(0, Math.sin(t * 0.5)) * 0.2
      : 0;
    set(
      armL,
      sinL * A * 0.9 + idle * (1 - mv) - gesture,
      0,
      0.07 + idle + gesture * 0.4,
    );
    set(armR, sinR * A * 0.9 - idle * (1 - mv), 0, -0.07 - idle);
    const bend = -(0.22 + 0.9 * rn) * (0.45 + 0.55 * mv) - 0.05;
    set(elL, bend - Math.max(0, sinL) * 0.12 * mv - gesture * 2);
    set(elR, bend - Math.max(0, sinR) * 0.12 * mv);
    if (hips.current) {
      hips.current.position.set(
        Math.sin(ph) * 0.02 * A,
        0.98 + Math.cos(ph * 2) * 0.03 * A * (1 + rn) - mv * 0.02,
        0,
      );
      hips.current.rotation.set(
        0,
        Math.sin(ph) * 0.14 * A,
        Math.sin(ph) * 0.04 * A,
      );
    }
    s.sit += ((m.seated ? 1 : 0) - s.sit) * (1 - Math.exp(-dt * 9));
    if (s.sit > 0.001) {
      const sit = (g: React.RefObject<THREE.Group | null>, angle: number) => {
        if (g.current)
          g.current.rotation.x = TBlend(g.current.rotation.x, angle, s.sit);
      };
      sit(legL, -1.45);
      sit(legR, -1.45);
      sit(knL, 1.52);
      sit(knR, 1.52);
      sit(ankL, -0.07);
      sit(ankR, -0.07);
      sit(elL, -0.7);
      sit(elR, -0.7);
      if (hips.current) {
        const p = hips.current.position;
        p.set(
          TBlend(p.x, 0, s.sit),
          TBlend(p.y, 0.62, s.sit),
          TBlend(p.z, -0.32, s.sit),
        );
      }
    }
    const lean = 0.03 + rn * 0.22 * mv + mv * 0.04;
    if (spine.current) {
      spine.current.rotation.set(
        lean + Math.sin(t * 1.6) * 0.008,
        -Math.sin(ph) * 0.2 * A,
        -Math.sin(ph) * 0.04 * A,
      );
      spine.current.scale.y = 1 + Math.sin(t * 1.6) * 0.006;
    }
    if (head.current)
      head.current.rotation.set(
        -lean * 0.7 + Math.sin(t * 0.7) * 0.02,
        Math.sin(ph) * 0.1 * A + Math.sin(t * 0.5) * 0.05 * (1 - mv),
        0,
      );
    if (tail.current)
      tail.current.rotation.set(
        0.35 + Math.sin(ph * 2) * 0.22 * A * (1 + rn) + rn * 0.4 * mv,
        0,
        Math.sin(ph) * 0.18 * A,
      );
  });

  return (
    <group scale={0.96}>
      <group ref={hips} position={[0, 0.98, 0]}>
        <Part g={p.pelvis} mat={mat} />
        <group ref={spine} position={[0, 0.06, 0]}>
          <Part g={p.torso} mat={mat} />
          <group ref={head} position={[0, 0.65, 0]} scale={[.84,.85,.87]}>
            <Part g={p.head} mat={mat} />
            <group ref={tail} position={[0, 0.3, -0.17]}>
              <Part g={p.tail} mat={mat} />
            </group>
          </group>
          <group ref={armL} position={[0.26, 0.54, 0]}>
            <Part g={p.armU} mat={mat} />
            <group ref={elL} position={[0, -0.3, 0]}>
              <Part g={p.forearm} mat={mat} />
            </group>
          </group>
          <group ref={armR} position={[-0.26, 0.54, 0]}>
            <Part g={p.armU} mat={mat} />
            <group ref={elR} position={[0, -0.3, 0]}>
              <Part g={p.forearm} mat={mat} />
            </group>
          </group>
        </group>
        <group ref={legL} position={[0.1, -0.02, 0]}>
          <Part g={p.thigh} mat={mat} />
          <group ref={knL} position={[0, -0.47, 0]}>
            <Part g={p.shin} mat={mat} />
            <group ref={ankL} position={[0, -0.41, 0]}>
              <Part g={p.foot} mat={mat} />
            </group>
          </group>
        </group>
        <group ref={legR} position={[-0.1, -0.02, 0]}>
          <Part g={p.thigh} mat={mat} />
          <group ref={knR} position={[0, -0.47, 0]}>
            <Part g={p.shin} mat={mat} />
            <group ref={ankR} position={[0, -0.41, 0]}>
              <Part g={p.foot} mat={mat} />
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
