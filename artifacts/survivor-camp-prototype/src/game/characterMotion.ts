/** A displacement-driven stance foot stays planted as the body passes over it.
 * All lengths are rig-local metres. Turning is handled by the body controller. */
export function sampleFoot(distance: number, scale: number, opposite = false) {
  const stride = 1.2;
  const phase =
    (((distance / (stride * scale) + (opposite ? 0.5 : 0)) % 1) + 1) % 1;
  const stance = phase < 0.5,
    swing = (phase - 0.5) * 2;
  return {
    z: stance ? 0.3 - phase * stride : -0.3 + swing * 0.6,
    lift: stance ? 0 : Math.sin(swing * Math.PI) * 0.1,
    stance,
  };
}

/** Two-link sagittal IK, with a flat ankle and a bounded unreachable target. */
export function solveLeg(y: number, z: number, upper = 0.43, lower = 0.405) {
  const d = Math.max(0.1, Math.min(upper + lower - 0.001, Math.hypot(y, z)));
  const acos = (n: number) => Math.acos(Math.max(-1, Math.min(1, n)));
  const knee = acos(
    (d * d - upper * upper - lower * lower) / (2 * upper * lower),
  );
  const hip =
    -Math.atan2(z, -y) -
    acos((upper * upper + d * d - lower * lower) / (2 * upper * d));
  return { hip, knee, ankle: -hip - knee };
}

/** Small intentional differences, in rig metres/radians. No per-frame random jitter. */
export const POSTURES: Record<
  number,
  { lean: number; tilt: number; breath: number; tempo: number; arm: number }
> = {
  11: { lean: 0.045, tilt: 0.008, breath: 0.006, tempo: 1.19, arm: 0.035 }, // grounded listener
  13: { lean: 0.015, tilt: -0.012, breath: 0.008, tempo: 1.41, arm: 0.06 }, // relaxed athlete
  18: { lean: 0.095, tilt: 0.012, breath: 0.009, tempo: 1.63, arm: 0.105 }, // compact forward intent
  4: { lean: 0.03, tilt: -0.006, breath: 0.007, tempo: 1.31, arm: 0.085 }, // broad confident stance
  [-1]: { lean: 0.012, tilt: 0, breath: 0.005, tempo: 1.13, arm: 0.04 }, // composed host
};
export function samplePresence(id: number, time: number, seated: number) {
  const p = POSTURES[id] ?? POSTURES[4]!;
  const phase = time * p.tempo + id * 0.73;
  return {
    lean: p.lean * (0.55 + seated * 0.45),
    tilt: p.tilt + Math.sin(phase * 0.41) * 0.004,
    breath: Math.sin(phase) * p.breath,
    arm: p.arm,
    glance:
      Math.sin(phase * 0.32) * Math.max(0, Math.sin(phase * 0.13)) * 0.075,
    nod: Math.sin(phase * 0.67) * Math.max(0, Math.sin(phase * 0.19)) * 0.012,
  };
}
/** Shortest-arc damping prevents a heading snap on path corners and seat turns. */
export function turnToward(current: number, target: number, dt: number) {
  return (
    current +
    Math.atan2(Math.sin(target - current), Math.cos(target - current)) *
      (1 - Math.exp(-Math.max(0, dt) * 8))
  );
}

/** Seat top is in world metres; ankle target leaves the sole on the ground. */
export function solveSeatedLeg(
  height: number,
  seatHeight: number,
  upper = 0.43,
  lower = 0.405,
  pivot = 0.01,
  sole = 0.052,
) {
  const hipHeight = seatHeight / height + 0.11;
  const leg = solveLeg(sole - hipHeight + pivot, 0.4, upper, lower);
  return { ...leg, hipHeight };
}
