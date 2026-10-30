import * as T from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { baseHeight, noise2, smoothstep } from "../world";
import { CAVE, cliffFaceZ, cliffTopHeight } from "./geography";
/** Shared indexed erosion surface. Continuous flutes replace flat triangle panels.
 * An irregular mouth joins a real, asymmetric vaulted interior; no tunnel prop. */
export function southernCliffGeometry(low = false) {
  const pos: number[] = [],
    uv: number[] = [],
    idx: number[] = [];
  const tri = (a: number[], b: number[], c: number[]) => {
    const n = pos.length / 3;
    for (const p of [a, b, c]) {
      pos.push(...p);
      uv.push((p[0]! + p[2]! * 0.41) * 0.095, p[1]! * 0.1 + p[2]! * 0.035);
    }
    idx.push(n, n + 1, n + 2);
  };
  const floor = baseHeight(11, 104),
    step = low ? 2 : 1;
  const roof = (x: number) =>
    3.0 +
    2.5 * Math.pow(Math.max(0, Math.sin(((x - 7) / 8) * Math.PI)), 0.65) +
    0.33 * Math.sin(x * 3.1);
  // The lower undercut/cave envelope remains the established physical surface.
  // Above it, individually composed shoulders retreat into a broad headland.
  const face = (x: number, h: number) => {
    const high=smoothstep(9,28,h),inward=smoothstep(13,64,h);
    const shoulder=-Math.sign(x)*Math.pow(Math.abs(x)/42,1.8)*inward*14;
    const blocks=4.2*(noise2(x*.085+3,h*.08)-.5)+2.3*(noise2(x*.24+8,h*.19)-.5);
    const shelves=2.4*Math.exp(-(((h-24-x*.12)/4)**2))-1.8*Math.exp(-(((h-39+x*.15)/5)**2));
    return [x+shoulder,
      baseHeight(x,98)+h,
      cliffFaceZ(x,h)*(1-high)+high*(102+blocks+shelves+inward*5+2.5*Math.sin(x*.045+h*.10))+
      Math.min(1,Math.max(0,(h-2)/6))*(.55*(noise2(x*.45,h*.31)-.5))];
  };
  const columns = [
    ...new Set([
      ...Array.from({ length: Math.ceil(82 / step) + 1 }, (_, i) =>
        Math.min(42, -40 + i * step),
      ),
      7,
      15,
    ]),
  ].sort((a, b) => a - b);
  for (let i = 0; i < columns.length - 1; i++) {
    const x = columns[i]!,
      xx = columns[i + 1]!,
      cave = x >= 7 && xx <= 15,
      lo = cave ? roof(x) : 0,
      loo = cave ? roof(xx) : 0,
      top = cliffTopHeight(x),
      topp = cliffTopHeight(xx),
      rows = Math.ceil(Math.max(top - lo, topp - loo) / step);
    for (let k = 0; k < rows; k++) {
      const t = k / rows,
        u = (k + 1) / rows,
        a = face(x, lo + (top - lo) * t),
        b = face(xx, loo + (topp - loo) * t),
        c = face(xx, loo + (topp - loo) * u),
        d = face(x, lo + (top - lo) * u);
      tri(a, c, b);
      tri(a, d, c);
    }
  }
  for (const x of [-40, 42])
    for (let y = 0; y < cliffTopHeight(x); y += 3) {
      const a = face(x, y),
        b = face(x, Math.min(y + 3, cliffTopHeight(x))),
        c = [b[0]!, b[1]!, 127],
        d = [a[0]!, a[1]!, 127];
      tri(a, b, c);
      tri(a, c, d);
    }
  // Authored crown slopes away from the seaward rim; broken broad shoulders.
  for(let x=-40;x<42;x+=step)for(let j=0;j<10;j++){
    const crown=(xx:number,t:number)=>{
      const p=face(xx,cliffTopHeight(xx));
      return [p[0]!+(noise2(xx*.12,t*4)-.5)*2*t,p[1]!*(1-.22*t)+Math.sin(t*Math.PI)*3,p[2]!+(127-p[2]!)*t];
    };
    const a=crown(x,j/10),b=crown(x+step,j/10),c=crown(x+step,(j+1)/10),d=crown(x,(j+1)/10);
    tri(a,b,c);tri(a,c,d);
  }
  // Noncircular vault controls; all 7.4..14.6 m body positions stay clear below 2.3 m.
  const section = [
    [7, 0],
    [6.96, 1.5],
    [7.03, 2.7],
    [7.6, 3.35],
    [8.15, 4.7],
    [9.65, 5.1],
    [10.2, 5.85],
    [11.2, 5.5],
    [11.9, 4.8],
    [13.2, 5.05],
    [14.15, 4.2],
    [14.95, 2.7],
    [15.04, 1.5],
    [15, 0],
  ];
  const point = (z: number, k: number) => {
    const [x, y] = section[k]!;
    const w = Math.sin(((z - 96) / (111 - 96)) * Math.PI);
    return [
      x! + (y! > 2.3 ? 0.24 * Math.sin(z * 0.91 + k) * w : 0),
      floor + y! + (y! > 2.3 ? 0.42 * Math.sin(z * 1.23 + k * 0.7) * w : 0),
      z,
    ];
  };
  for (let z = 96; z < 111; z += low ? 1.5 : 0.75) {
    const zz = Math.min(111, z + (low ? 1.5 : 0.75));
    for (let k = 0; k < section.length - 1; k++) {
      const a = point(z, k),
        b = point(zz, k),
        c = point(zz, k + 1),
        d = point(z, k + 1);
      tri(a, b, c);
      tri(a, c, d);
    }
  }
  // Fractured back face with shallow recesses; corridor stops before z=110.6.
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 5; j++) {
      const p = (a: number, b: number) => [
        7 + a,
        floor + b * 1.15,
        111 +
          0.2 * (1 + Math.sin(a * 2 + b)) +
          0.15 * Math.sin(a * 0.8 + b * 2),
      ];
      const a = p(i, j),
        b = p(i + 1, j),
        c = p(i + 1, j + 1),
        d = p(i, j + 1);
      tri(a, b, c);
      tri(a, c, d);
    }
  let g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g = mergeVertices(g, 0.0005);
  g.computeVertexNormals();
  const p = g.attributes.position!,
    n = g.attributes.normal!,
    colors: number[] = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i),
      interior = x > 6.8 && x < 15.2 && z > 98 && y < floor + 6.2;
    const c = new T.Color("#d9d4c8").multiplyScalar(
      0.84 + 0.16 * noise2(x * 0.17, y * 0.10 + z * .04),
    );
    const stain = Math.max(0, noise2(x * 0.19 + 8, y * 0.12 + z * .04) - 0.48);
    c.lerp(new T.Color("#9c7858"), stain * 1.15);
    const damp =
      Math.max(0, 1 - (y - floor) / 2.3) *
      Math.max(0, n.getZ(i)) *
      (noise2(x, z) > 0.5 ? 0.13 : 0);
    c.lerp(new T.Color("#55634a"), damp);
    if (interior)
      c.multiplyScalar(0.53 + 0.32 * Math.max(0, 1 - (z - 98) / 11));
    colors.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  g.computeBoundingSphere();
  return g;
}
