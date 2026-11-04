import test from 'node:test';
import assert from 'node:assert/strict';
import { isWalkable, movePlayer } from '../src/game/world.ts';
import { CampNavigation, clearSegment } from '../src/game/navigation.ts';

test('both projecting cave cheeks reject body penetration on the apron and inside', () => {
  for (const x of [7,15]) for (let z=96;z<=110;z+=.25) assert.equal(isWalkable(x,z), false, `${x},${z}`);
  for (const side of [-1,1]) {
    const p={x:side<0?8:14,z:99};
    const end=movePlayer(p,side*3,0);
    assert.ok(end.x>7.39 && end.x<14.61);
  }
});
test('cave centre and both edges allow entry, turning, exit and NPC routes', () => {
  const nav=new CampNavigation();
  for (const x of [7.6,11,14.4]) {
    const outside={x,z:94}, inside={x,z:109};
    assert.ok(clearSegment(outside,inside));
    const end=movePlayer(outside,0,15);
    assert.ok(Math.hypot(end.x-inside.x,end.z-inside.z)<.01);
    assert.ok(clearSegment(inside,outside));
    assert.ok(nav.route(outside,inside));
  }
  assert.ok(clearSegment({x:7.6,z:104},{x:14.4,z:104}));
});
