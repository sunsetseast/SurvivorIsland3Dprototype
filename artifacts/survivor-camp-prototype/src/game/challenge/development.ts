/** Normal production builds cannot enable rehearsal by adding a URL parameter.
 * CI/test builds must explicitly opt in. This is local rehearsal, not account authentication or event admission. */
export function challengeRehearsalEnabled() {
  return typeof location !== "undefined" &&
    new URLSearchParams(location.search).get("devTravel") === "1" &&
    (import.meta.env?.DEV === true || import.meta.env?.VITE_CHALLENGE_REHEARSAL === "1");
}

/** The touch testing hub is available automatically in Vite dev, never in a built production app. */
export function developmentTestingAllowed(env: { DEV?: boolean }) { return env.DEV === true; }
export function challengeTestingEnabled() { return developmentTestingAllowed(import.meta.env ?? {}); }
