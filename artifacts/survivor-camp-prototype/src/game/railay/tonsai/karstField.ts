import { inside, edgeDistance } from "../geography";
import { TONSAI_KARSTS } from "./domain";
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const n = (x: number, y: number, z: number, s: number) =>
  Math.sin(x * 0.039 + z * 0.021 + s) * Math.cos(z * 0.043 - y * 0.052) +
  0.47 * Math.sin(x * 0.103 - y * 0.091 + Math.sin(z * 0.072) * 1.7) +
  0.23 * Math.cos(z * 0.231 + x * 0.173 + y * 0.137);
/** Exact analytic field used by tools/tonsai/sculpt.py, before 2.4m sampling
 * and decimation. Keeps low-height collision aligned with the sculpted foot,
 * including overhanging projections on higher beach/forest ground. */
export function karstDistance(x: number, y: number, z: number) {
  let result = Infinity;
  for (const k of TONSAI_KARSTS) {
    let sd = edgeDistance(x, z, k.outline);
    const interior=inside(x,z,k.outline);
    if (!interior && sd > 30) continue;
    if (interior) sd = -sd;
    const s = k.seed,
      top =
        5 +
        k.height *
          (0.78 +
            0.085 * Math.sin(x * 0.013 + s) * Math.cos(z * 0.011) +
            0.055 * Math.sin(x * 0.031 + z * 0.022 + s));
    const fade = clamp((y - 3) / 13) * clamp((top - y) / 18);
    const erosion =
      3.1 * n(x, y, z, s) +
      ((1.8 * 2) / Math.PI) *
        Math.asin(Math.sin(x * 0.081 + z * 0.067 + y * 0.05 + s));
    const bedding =
      ((0.65 * 2) / Math.PI) *
        Math.asin(Math.sin(y * 0.09 + x * 0.017 + z * 0.022)) +
      0.4 * Math.sin(y * 0.39 + x * 0.04);
    const lobe =
      13 *
      Math.max(0, Math.sin(x * 0.024 + z * 0.031 + s)) ** 2 *
      Math.exp(-(((y - 38) / 24) ** 2));
    const niche =
      17 *
      Math.max(0, Math.sin(x * 0.058 - z * 0.033 + s)) ** 4 *
      Math.exp(-(((y - 15) / 10) ** 2));
    const slot =
      Math.max(
        0,
        1 - Math.abs(Math.sin(x * 0.018 + z * 0.032 + y * 0.006 + s)) * 13,
      ) *
      4.5 *
      fade;
    const fracture =
      Math.max(
        0,
        1 - Math.abs(Math.sin(y * 0.047 + x * 0.013 + z * 0.021 + s)) * 16,
      ) *
      3.5 *
      fade;
    const side =
      sd -
      fade * (erosion + bedding + lobe - niche) +
      Math.exp(-(((y - 4) / 5) ** 2)) * 1.3 +
      slot +
      fracture;
    result = Math.min(
      result,
      Math.max(side, y - top + n(x * 0.4, y * 0.3, z * 0.4, s) * 1.1, -y - 4),
    );
  }
  return result;
}
