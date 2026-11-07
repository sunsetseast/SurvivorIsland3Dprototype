import assert from 'node:assert/strict';
/** Keep the zero-growth ceiling and exact asset accounting; only measured 1×1 fallback removal is permitted. */
export function assertImageStorage(before,after){
 const a=before.fallbackTextureBytesEstimate,b=after.fallbackTextureBytesEstimate;
 assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&a>=0&&b>=0,'recapture paired measured fallback storage');
 assert.ok(b<=a,'no additional fallback storage');
 // Estimates include 4/3 mip weighting; permit only sub-microbyte floating-point summation error.
 assert.ok(Math.abs((after.textureBytesEstimate-b)-(before.textureBytesEstimate-a))<1e-6,'no unaccounted non-fallback image storage');
 assert.ok(after.textureBytesEstimate<=before.textureBytesEstimate+1e-6,'no additional image storage');
 return a-b;
}
