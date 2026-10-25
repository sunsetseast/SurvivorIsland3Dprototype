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
export function solveLeg(y: number, z: number) {
  const upper = 0.43,
    lower = 0.405;
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
