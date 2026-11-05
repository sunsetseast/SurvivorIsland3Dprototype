/** Normal production builds cannot enable rehearsal by adding a URL parameter.
 * CI/test builds must explicitly opt in. This is local rehearsal, not account authentication or event admission. */
export function challengeRehearsalEnabled() {
  return typeof location !== "undefined" &&
    new URLSearchParams(location.search).get("devTravel") === "1" &&
    (import.meta.env?.DEV === true || import.meta.env?.VITE_CHALLENGE_REHEARSAL === "1");
}
