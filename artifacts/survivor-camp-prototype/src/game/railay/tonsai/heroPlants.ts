import { random } from "../vegetation";
import { heightAt, slopeAt } from "../terrain";
import { COAST, edgeDistance, trailDistance } from "../geography";
import { cliffFootDistance } from "./domain";
import type { Specimen, Botanical } from "./tropical";
/** One connected beach/forest ecotone. Existing roads, beaches and routes stay clear. */
export function heroUnderstory(low: boolean): Specimen[] {
  const r = random(271449),
    out: Specimen[] = [];
  for (let cluster = 0; cluster < 90; cluster++) {
    const cx = -755 + r() * 305,
      cz = -855 - r() * 180;
    for (let j = 0; j < 14; j++) {
      const x = cx + (r() - 0.5) * 17,
        z = cz + (r() - 0.5) * 17,
        h = heightAt(x, z),
        pick = r();
      if (
        h < 2.8 ||
        h > 9 ||
        slopeAt(x, z) > 0.62 ||
        trailDistance(x, z) < 5 ||
        edgeDistance(x, z, COAST) < 32 ||
        cliffFootDistance(x, z) < 7
      )
        continue;
      const kind: Botanical =
        j === 0
          ? pick < 0.3
            ? "ficus"
            : "canopy"
          : pick < 0.22
            ? "pandanus"
            : pick < 0.46
              ? "aroid"
              : pick < 0.88
                ? "fern"
                : "litter";
      out.push({
        x,
        y: h,
        z,
        kind,
        scale: kind === "fern" ? 1.8 + r() * 1.8 : 0.65 + r() * 0.7,
        turn: r() * Math.PI * 2,
        tint: r(),
        variant: Math.floor(r() * 2),
      });
    }
  }
  return low
    ? out.filter(
        (p, i) => i % 2 === 0 || p.kind === "canopy" || p.kind === "ficus",
      )
    : out;
}
