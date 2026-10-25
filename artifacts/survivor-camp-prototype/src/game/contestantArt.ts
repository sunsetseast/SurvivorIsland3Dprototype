import * as THREE from "three";
import { M, V, limb, merge, mk, type Geo } from "./geo";

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
  [-1]: { height: 1.04, width: 1.05, skin: '#c28d6c', highlight: '#dba47c', hair: '#362a24', shirt: '#587f9c', shorts: '#a29171', headWidth: .98, jaw: 1.08, nose: 1.04, hairStyle: 'short' },
  11: {
    height: 0.93,
    width: 1.18,
    skin: "#b67a50",
    highlight: "#c99365",
    hair: "#201d1c",
    shirt: "#ba433c",
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
    shirt: "#427f87",
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
    shirt: "#c5b68a",
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
    shirt: "#a83332",
    shorts: "#c0a57b",
    headWidth: 1,
    jaw: 1.02,
    nose: 1.05,
    hairStyle: "cap",
    beard: true,
  },
};

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
      points.push(Math.sin(t) * rx, y, Math.cos(t) * rz);
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
  const c = LOOKS[id]!,
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
    if (!female)
      torso.push(
        oval(s * shoulder * 0.87, 0.49, 0, 0.105, 0.085, 0.14, c.shirt),
      );
  }
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
  const skull = new THREE.SphereGeometry(0.195, 20, 16);
  const pos = skull.attributes.position!;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i),
      y = pos.getY(i),
      z = pos.getZ(i);
    x *=
      c.headWidth *
      (y < -0.03 ? c.jaw + ((1 - c.jaw) * (y + 0.195)) / 0.165 : 1);
    y = y * 1.19 + 0.23;
    if (z > 0) z *= 0.86;
    pos.setXYZ(i, x, y, z);
  }
  skull.computeVertexNormals();
  head.push(mk(skull, null, hi, 0.015));
  // Sculpted cheeks, jaw, brow, eyelids, iris and projected nose. No billboard face.
  for (const s of [-1, 1]) {
    head.push(
      oval(
        s * 0.103 * c.headWidth,
        0.19,
        0.118,
        0.056 * c.headWidth,
        0.052,
        0.027,
        hi,
      ),
    );
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
      oval(s * 0.072 * c.headWidth, 0.277, 0.151, 0.049, 0.027, 0.017, skin),
    );
    head.push(
      oval(
        s * 0.072 * c.headWidth,
        0.278,
        0.161,
        0.033,
        0.014,
        0.011,
        "#eee1ca",
      ),
    );
    head.push(
      oval(
        s * 0.072 * c.headWidth,
        0.278,
        0.171,
        0.013,
        0.014,
        0.005,
        "#493729",
        10,
      ),
    );
    head.push(
      oval(
        s * 0.072 * c.headWidth,
        0.279,
        0.175,
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
        0.178,
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
  head.push(oval(0, 0.119, 0.131, 0.066, 0.04, 0.03, hi));
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
    oval(0, 0.145, 0.158, 0.038, 0.009, 0.008, female ? "#ba7f6c" : "#b27b60"),
  );
  if (c.beard) {
    const beard = id === 18 ? "#49382b" : "#795c46";
    head.push(
      oval(
        0,
        0.112,
        0.142,
        0.074 * c.headWidth,
        id === 18 ? 0.045 : 0.026,
        0.028,
        beard,
      ),
    );
    for (const s of [-1, 1]) {
      head.push(
        oval(s * 0.102 * c.headWidth, 0.153, 0.119, 0.035, 0.055, 0.03, beard),
      );
      head.push(
        limb(
          V(s * 0.05, 0.173, 0.158),
          V(s * 0.018, 0.179, 0.166),
          0.008,
          0.007,
          hair,
          undefined,
          5,
        ),
      );
    }
  }
  if (id === -1) {
    for (const side of [-1, 1]) {
      torso.push(box(side * .09, .49, .139, .12, .16, .025, '#7394aa'));
      torso.push(box(side * .115, .29, .147, .12, .1, .018, '#496c88'));
      torso.push(box(side * .115, .345, .153, .13, .025, .02, '#91a6b1'));
    }
    for (let y = .16; y < .51; y += .08) torso.push(oval(0,y,.155,.012,.012,.007,'#d9cdb3',6));
  }
  const hairParts: Geo[] = [];
  if (female) {
    hairParts.push(
      mk(
        new THREE.SphereGeometry(
          0.208,
          18,
          12,
          0,
          Math.PI * 2,
          0,
          Math.PI * 0.45,
        ),
        M(0, 0.235, -0.025, -0.18, 0, 0, c.headWidth, 1.16, 1.02),
        hair,
        0.04,
      ),
    );
    for (const s of [-1, 1])
      for (let j = 0; j < 4; j++) {
        const xx = s * (0.16 + Math.sin(j * 1.5) * 0.022) * c.headWidth;
        const length = id === 13 ? 0.55 : 0.3;
        hairParts.push(
          limb(
            V(xx, 0.34 - j * 0.022, -0.035 - j * 0.035),
            V(xx + s * 0.015, 0.34 - length, -0.07 - j * 0.035),
            0.047,
            id === 13 ? 0.025 : 0.043,
            hair,
            undefined,
            7,
          ),
        );
        hairParts.push(
          limb(
            V(xx * 0.98, 0.31 - j * 0.015, -0.005 - j * 0.036),
            V(xx, 0.34 - length * 0.9, -0.03 - j * 0.036),
            0.008,
            0.005,
            id === 13 ? "#63432c" : "#39312c",
            undefined,
            5,
          ),
        );
      }
    // Back hair stays behind the shoulders; attached to head, subtly sways with turns.
    hairParts.push(
      oval(
        0,
        id === 13 ? 0.06 : 0.17,
        -0.15,
        0.19 * c.headWidth,
        id === 13 ? 0.29 : 0.19,
        0.083,
        hair,
      ),
    );
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
    oval(0, -0.025, 0, 0.074 * w, 0.083, 0.071 * w, skin),
    limb(V(0, -0.02, 0), V(0, -0.285, 0), 0.072 * w, 0.048 * w, skin, hi, 10),
  ];
  if (!female)
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
    limb(V(0, 0, 0), V(0, -0.255, 0), 0.05 * w, 0.034 * w, skin, hi, 10),
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
    limb(V(0, -0.24, 0), V(0, -0.43, 0), 0.084 * w, 0.061 * w, skin, hi, 10),
  ];
  const shin = [
    oval(0, 0, 0, 0.064 * w, 0.062, 0.061, hi),
    limb(V(0, -0.01, 0), V(0, -0.395, 0), 0.063 * w, 0.038 * w, skin, hi, 10),
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
    torso: merge(torso),
    pelvis: merge(pelvis),
    head: merge(head),
    armU: merge(armU),
    forearm: merge(forearm),
    thigh: merge(thigh),
    shin: merge(shin),
    foot: merge(foot),
    shoulder,
    look: c,
  };
}
