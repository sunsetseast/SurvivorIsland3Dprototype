import test from 'node:test';
import assert from 'node:assert/strict';
import {allowSocialClick,suppressSocialCompatibilityClick} from '../src/game/socialActivation.ts';
test('touch suppression survives replacing Decline with Talk while preserving keyboard access',()=>{
  suppressSocialCompatibilityClick(1000);
  assert.equal(allowSocialClick(1,1001),false,'replacement Talk must reject the compatibility click');
  assert.equal(allowSocialClick(0,1001),true,'keyboard/assistive activation remains available');
  suppressSocialCompatibilityClick(1100); // a deliberate next pointer-up may activate normally
  assert.equal(allowSocialClick(1,1101),false,'its duplicate click is still suppressed');
  assert.equal(allowSocialClick(1,1601),true,'later mouse clicks remain available');
});
