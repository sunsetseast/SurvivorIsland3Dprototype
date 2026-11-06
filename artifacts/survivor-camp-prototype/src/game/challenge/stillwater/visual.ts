import type { Competitor } from "./engine";
/** Exact simulation-to-art mapping, shared by tests and instanced animation. */
export function stationVisual(c: Competitor | undefined, elapsed: number) {
  const fall=c?.eliminatedAt===null||c?.eliminatedAt===undefined?0:Math.min(1,(elapsed-c.eliminatedAt)*2);
  return { tilt:(c?.balance??0)*.22+(c?.velocity??0)*.035, lean:(c?.balance??0)*.15, count:c?c.placed:4, wobble:(c?.velocity??0)*.12, lift:c?.lastPlacement==="success"?(c.placementFlash/.65)*.1:0, fall, stability:c?.stability??1 };
}
