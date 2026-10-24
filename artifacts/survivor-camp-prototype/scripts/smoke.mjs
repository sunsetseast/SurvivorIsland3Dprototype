// Uses an externally started local Chromium with CDP; no test package required.
// node scripts/smoke.mjs (Chromium --remote-debugging-port=9222)
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const pages = await (await fetch('http://127.0.0.1:9222/json')).json();
const ws = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
let id = 0;
const pending = new Map();
const errors = [];
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(m.error) : p.resolve(m.result); }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
});
const call = (method, params = {}) => new Promise((resolve, reject) => {
  pending.set(++id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async expression => {
  const r = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
await call('Runtime.enable');
await call('Page.enable');
await call('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 1.5, mobile: true });
await call('Page.navigate', { url: 'http://127.0.0.1:80/' });
for (let i = 0; i < 100; i++) {
  if (await evaluate('Boolean(window.__CAMP_DEBUG__?.location)')) break;
  await wait(200);
}
const read = () => evaluate('JSON.parse(JSON.stringify(window.__CAMP_DEBUG__))');
const spawn = await read();
assert(spawn?.position && spawn.location, 'Game frame and spawn initialized');
assert(Math.abs(spawn.position.x + 6) < .1 && Math.abs(spawn.position.z + 24) < .1);
const down = (key, code) => call('Input.dispatchKeyEvent', { type: 'keyDown', key, code });
const up = (key, code) => call('Input.dispatchKeyEvent', { type: 'keyUp', key, code });
await down('w', 'KeyW'); await wait(1200); const walked = await read(); await up('w', 'KeyW');
assert(Math.hypot(walked.position.x - spawn.position.x, walked.position.z - spawn.position.z) > 1, 'Keyboard movement');
assert(Math.hypot(walked.camera.x - spawn.camera.x, walked.camera.z - spawn.camera.z) > .5, 'Follow camera');
await evaluate('window.__CAMP_DEBUG__.reset()'); await wait(600);
await down('Shift', 'ShiftLeft'); await down('s', 'KeyS'); await wait(1000);
assert((await read()).running, 'Keyboard run');
await up('s', 'KeyS'); await up('Shift', 'ShiftLeft');
const touch = (type, touchPoints) => call('Input.dispatchTouchEvent', { type, touchPoints });
await call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
const p1 = { x: 70, y: 285, id: 1 };
await touch('touchStart', [p1]);
await touch('touchMove', [{ ...p1, y: 245 }]); await wait(700);
const beforeOrbit = await read();
await touch('touchStart', [{ ...p1, y: 245 }, { x: 790, y: 335, id: 2 }]);
await wait(200); assert((await read()).running, 'Concurrent joystick and touch run');
await touch('touchStart', [{ ...p1, y: 245 }, { x: 790, y: 335, id: 2 }, { x: 550, y: 190, id: 3 }]);
await touch('touchMove', [{ ...p1, y: 245 }, { x: 790, y: 335, id: 2 }, { x: 650, y: 220, id: 3 }]);
await wait(400);
assert(Math.abs((await read()).camera.yaw - beforeOrbit.camera.yaw) > .3, 'Touch camera rotation');
await touch('touchEnd', []); await wait(300);
assert(!(await read()).running, 'Touch run releases');
await evaluate('document.querySelector(\'[data-testid="button-reset"]\').click()'); await wait(700);
assert(Math.hypot((await read()).position.x + 6, (await read()).position.z + 24) < .1, 'Reset');
assert(await evaluate('document.elementFromPoint(550,190)?.dataset.testid === "orbit-zone"'), 'Camera touch surface hit-test');
// Import the same pure movement model used in the actual game.
const model = await evaluate(`(async()=>{
 const w=await import('/src/game/world.ts');
 const a=[]; const check=(ok,name)=>{if(!ok)throw Error(name);a.push(name)};
 check(w.isWalkable(w.SPAWN.x,w.SPAWN.z),'spawn walkable');
 let p={x:12,z:-32.8};for(let i=0;i<150;i++)p=w.movePlayer(p,0,-.08);
 check(p.z < -43 && w.groundHeight(p.x,p.z)===1.8,'shelter ramp reachable');
 for(let i=0;i<150;i++)p=w.movePlayer(p,0,.08);
 check(p.z > -33,'shelter ramp exit');
 p=w.movePlayer({x:-50,z:-27},-20,0);check(p.x>=w.BOUNDS.minX+w.PLAYER_RADIUS,'ocean edge containment');
 p=w.movePlayer({x:-9,z:-26},0,-10);check(p.z > -29.4,'fire collision prevents tunnelling');
 // Flood fill at 0.75 metre resolution validates traversable connectivity.
 const step=.75, start=w.SPAWN, queue=[start],seen=new Set();
 const key=(p)=>Math.round((p.x-start.x)/step)+','+Math.round((p.z-start.z)/step);
 seen.add(key(start));let cursor=0;const targets={beach:false,shelter:false,well:false};
 while(cursor<queue.length&&cursor<22000){
  const p=queue[cursor++];
  for(const [name,t] of Object.entries(w.LANDMARKS))if(name in targets&&Math.hypot(p.x-t.x,p.z-t.z)<3)targets[name]=true;
  for(const [dx,dz] of [[step,0],[-step,0],[0,step],[0,-step]]){
   const n=w.movePlayer(p,dx,dz);
   if(Math.abs(n.x-p.x-dx)>.01||Math.abs(n.z-p.z-dz)>.01)continue;
   const k=key(n);if(!seen.has(k)){seen.add(k);queue.push(n);}
  }
 }
 check(Object.values(targets).every(Boolean),'camp connects to beach shelter and well');
 return {passed:a,visited:seen.size,targets};
})()`);
console.log(JSON.stringify({ spawn, movement: walked.position, model, errors }, null, 2));
assert.equal(errors.length, 0, 'No runtime exceptions');
const shot = await call('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
await writeFile('/tmp/camp-verified-landscape.jpg', Buffer.from(shot.data, 'base64'));
await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await wait(500);
assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'), 'No portrait horizontal overflow');
assert(await evaluate('getComputedStyle(document.querySelector(".rotate-hint")).display!=="none"'), 'Portrait rotate hint');
console.log('PASS: spawn, movement, run, camera, multitouch, reset, collision, connectivity, portrait/landscape');
ws.close();
