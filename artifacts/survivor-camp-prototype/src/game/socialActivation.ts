/** A touch can replace its own button before the browser's compatibility click.
 * Keep suppression outside the component so the replacement cannot receive it.
 * Deliberate pointer-up activations and keyboard/assistive clicks remain valid. */
let suppressUntil = -Infinity;
export function suppressSocialCompatibilityClick(now = performance.now()) {
  suppressUntil = now + 500;
}
export function allowSocialClick(detail: number, now = performance.now()) {
  return detail === 0 || now > suppressUntil;
}
