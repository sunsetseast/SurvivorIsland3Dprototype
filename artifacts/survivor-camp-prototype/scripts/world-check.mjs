import assert from 'node:assert/strict';
import * as w from '../src/game/world.ts';

const passed = [];
function check(name, fn) { fn(); passed.push(name); }
check('Spawn is unobstructed', () => assert(w.isWalkable(w.SPAWN.x, w.SPAWN.z)));
check('Shared organic shoreline contains the player', () => {
  for (let z = -48; z < 24; z += 3) {
    const edge = w.shorelineX(z);
    assert(!w.isWalkable(edge, z));
    const start = { x: edge + 2.2, z };
    if (w.isWalkable(start.x, start.z)) {
      const p = w.movePlayer(start, -20, 0);
      assert(p.x >= edge + 1 - 0.001);
    }
  }
});
check('Substeps prevent tunnelling into solid props and vegetation', () => {
  let tested = 0;
  for (const c of w.COLLIDERS) {
    const start = { x: c.x - c.hx - w.PLAYER_RADIUS - 0.15, z: c.z };
    if (!w.isWalkable(start.x, start.z)) continue;
    const p = w.movePlayer(start, c.hx * 2 + w.PLAYER_RADIUS * 2 + 0.3, 0);
    assert(p.x < c.x - c.hx - w.PLAYER_RADIUS + 0.001, c.kind);
    assert(w.isWalkable(p.x, p.z), c.kind);
    tested++;
  }
  assert(tested > 70);
  console.log(`Solid collision checks: ${tested}`);
});
check('Shelter ramp enters and exits the visible raised floor', () => {
  let p = { x: 12, z: -32.8 };
  for (let i = 0; i < 150; i++) p = w.movePlayer(p, 0, -0.08);
  assert(p.z < -43);
  assert.equal(w.groundHeight(p.x, p.z), w.SHELTER.deck.y);
  for (let i = 0; i < 150; i++) p = w.movePlayer(p, 0, 0.08);
  assert(p.z > -33);
});
check('Deck cannot be entered by walking through its raised side', () => {
  const p = w.movePlayer({ x: 5.8, z: -43.2 }, 3, 0);
  assert(p.x < w.SHELTER.deck.x0);
});
check('Landmark path centres remain connected', () => {
  for (let j = 1; j < w.WAYPOINTS.length; j++) {
    const a = w.WAYPOINTS[j - 1], b = w.WAYPOINTS[j];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    let p = { ...a };
    for (let i = 0; i < Math.ceil(len / 0.07); i++) {
      const d = Math.min(0.07, Math.hypot(b.x - p.x, b.z - p.z));
      p = w.movePlayer(p, (b.x - p.x) / (Math.hypot(b.x - p.x, b.z - p.z) || 1) * d,
        (b.z - p.z) / (Math.hypot(b.x - p.x, b.z - p.z) || 1) * d);
    }
    assert(Math.hypot(b.x - p.x, b.z - p.z) < 0.15, `Path segment ${j}: ${JSON.stringify(p)}`);
  }
});
console.log(JSON.stringify({ passed }, null, 2));
