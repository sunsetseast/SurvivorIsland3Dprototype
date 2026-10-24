import assert from 'node:assert/strict';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { connectBrowser, wait } from './cdp.mjs';

// Captures are excluded from source control and publishing.
const output = 'generated-artifacts/camp-overhaul';
await mkdir(output, { recursive: true });
for (const name of ['spawn', 'shelter', 'beach', 'jungle', 'well']) {
  await copyFile(`/tmp/camp-before-${name}.jpg`, `${output}/before-${name}.jpg`).catch(() => {});
}
const { call, evaluate: ev, errors, close } = await connectBrowser();
await call('Runtime.enable'); await call('Page.enable');
await call('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 1, mobile: true });
await call('Page.navigate', { url: 'http://127.0.0.1:80/' });
for (let i = 0; i < 150; i++) {
  if (await ev('!!window.__CAMP_DEBUG__?.location')) break;
  await wait(200);
}
assert(await ev('!!window.__CAMP_DEBUG__?.location'), 'Game initialized');
const screenshot = async name => {
  const shot = await call('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
  await writeFile(`${output}/after-${name}.jpg`, Buffer.from(shot.data, 'base64'));
};
await screenshot('spawn');
// Set up accelerated browser frames. The real useFrame locomotion, collision,
// animation and follow camera execute; expensive GPU draws occur at each stop.
// This is not a device FPS measurement or teleport-based route validation.
console.log(await ev(`(async()=>{
 const f=await import('/node_modules/.vite/deps/@react-three_fiber.js');
 const w=await import('/src/game/world.ts');
 const io=await import('/src/game/state.ts');
 const store=f._roots.get(document.querySelector('canvas')).store;
 store.getState().setFrameloop('never');
 const s=store.getState();
 const gl=s.gl, render=gl.render.bind(gl);
 window.__walk={f,w,io,s,render,time:s.clock.elapsedTime};
 gl.render=()=>{};
 return {spawn:w.SPAWN,landmarks:w.LANDMARKS,colliders:w.COLLIDERS.length};
})()`));
const advance = frames => ev(`(()=>{
 const a=window.__walk;
 for(let i=0;i<${frames};i++){a.time+=1/30;a.f.advance(a.time,false,a.s);}
 return JSON.parse(JSON.stringify(window.__CAMP_DEBUG__));
})()`);
const key = (type, key, code) => call('Input.dispatchKeyEvent', { type, key, code });
await key('keyDown', 'w', 'KeyW');
const keyboardWalk = await advance(30);
assert(keyboardWalk.moving && keyboardWalk.speed > 2.8, 'Keyboard walk');
await key('keyDown', 'Shift', 'ShiftLeft');
const keyboardRun = await advance(30);
assert(keyboardRun.running && keyboardRun.speed > 5.5, 'Keyboard run');
await ev(`window.dispatchEvent(new Event('blur'))`);
assert(!(await advance(12)).moving, 'Blur clears held keyboard controls');
await key('keyUp', 'w', 'KeyW'); await key('keyUp', 'Shift', 'ShiftLeft');
await ev('window.__CAMP_DEBUG__.reset()'); await advance(12);
const reports = [];
for (const name of ['shelter', 'beach', 'jungle', 'well']) {
  const report = await ev(`(async()=>{
 const a=window.__walk,{w,io,s,f}=a;
 const start={x:io.dbg.x,z:io.dbg.z};
 const target=${JSON.stringify(name)}==='jungle' ? {x:9,z:15}
  : ${JSON.stringify(name)}==='well' ? {x:w.LANDMARKS.well.x+3,z:w.LANDMARKS.well.z+2}
  : w.LANDMARKS[${JSON.stringify(name)}];
 const step=.6, q=[{i:0,j:0,parent:-1}], seen=new Set(['0,0']);
 let cursor=0,found=-1;
 while(cursor<q.length&&cursor<45000){
  const n=q[cursor],p={x:start.x+n.i*step,z:start.z+n.j*step};
  if(Math.hypot(p.x-target.x,p.z-target.z)<.7){found=cursor;break;}
  for(const [di,dj]of [[1,0],[-1,0],[0,1],[0,-1]]){
   const key=(n.i+di)+','+(n.j+dj);if(seen.has(key))continue;
   const np=w.movePlayer(p,di*step,dj*step);
   if(Math.abs(np.x-p.x-di*step)>.001||Math.abs(np.z-p.z-dj*step)>.001)continue;
   seen.add(key);q.push({i:n.i+di,j:n.j+dj,parent:cursor});
  }cursor++;
 }
 if(found<0)throw Error('No connected route to '+${JSON.stringify(name)});
 const route=[];for(let k=found;k>0;k=q[k].parent)route.unshift({x:start.x+q[k].i*step,z:start.z+q[k].j*step});
 let frames=0,blocked=0,maxHeightError=0;
 for(const target of route){
  let attempts=0;
  while(Math.hypot(io.dbg.x-target.x,io.dbg.z-target.z)>.12&&attempts++<80){
   const dx=target.x-io.dbg.x,dz=target.z-io.dbg.z;
   io.input.yaw=Math.atan2(-dx,-dz);io.input.joyX=0;
   io.input.joyY=Math.min(1,Math.hypot(dx,dz)/.4);io.input.run=true;
   a.time+=1/30;f.advance(a.time,false,s);frames++;
   if(!w.isWalkable(io.dbg.x,io.dbg.z))throw Error('Entered collider');
   maxHeightError=Math.max(maxHeightError,Math.abs(io.dbg.y-w.groundHeight(io.dbg.x,io.dbg.z)));
   if(io.dbg.cameraBlocked)blocked++;
  }
  if(attempts>=80)throw Error('Movement stuck on '+JSON.stringify(target));
 }
 io.input.joyY=io.input.joyX=0;io.input.run=false;
 io.input.pitch=.31;
 io.input.yaw=${JSON.stringify(name)}==='shelter' ? .4 : ${JSON.stringify(name)}==='beach' ? 1.25 : ${JSON.stringify(name)}==='well' ? .8 : -.5;
 for(let i=0;i<45;i++){a.time+=1/30;f.advance(a.time,false,s);}
 s.gl.render=a.render;s.gl.shadowMap.needsUpdate=true;s.gl.render(s.scene,s.camera);
 const stats={calls:s.gl.info.render.calls,triangles:s.gl.info.render.triangles};
 const three=await import('/node_modules/.vite/deps/three.js');
 const ray=new three.Raycaster(),origin=new three.Vector3(io.dbg.x,io.dbg.y+1.5,io.dbg.z);
 const direction=s.camera.position.clone().sub(origin),boom=direction.length(),solids=[];
 s.scene.traverse(o=>{if(o.isMesh&&o.userData.cameraBlocker)solids.push(o)});
 ray.set(origin,direction.normalize());ray.far=boom;
 const hit=ray.intersectObjects(solids,false)[0];
 if(hit&&hit.distance<boom-.25)throw Error('Camera boom crosses solid geometry at '+${JSON.stringify(name)});
 s.gl.render=()=>{};
 return {name:${JSON.stringify(name)},routeSteps:route.length,frames,blockedCameraFrames:blocked,
   maxHeightError,position:{x:io.dbg.x,y:io.dbg.y,z:io.dbg.z},cameraDistance:io.dbg.cameraDistance,cameraSolidCheck:'passed',stats};
})()`);
  reports.push(report); console.log(report);
  await screenshot(name);
}
await ev(`(()=>{const a=window.__walk;a.s.gl.render=a.render;a.s.setFrameloop('always');a.io.dbg.resetRequested=true;})()`);
await wait(1000);
// Actual event delivery, not input-module injection, for landscape touch checks.
await call('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
const rect = testid => ev(`(()=>{const r=document.querySelector('[data-testid="${testid}"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
const joy = await rect('joystick'), run = await rect('button-run');
const t1 = { x: joy.x, y: joy.y - 33, id: 1 }, t2 = { ...run, id: 2 }, t3 = { x: 560, y: 190, id: 3 };
await call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [t1] });
await wait(500);
assert(await ev('window.__CAMP_DEBUG__.moving'), 'Touch joystick moves avatar');
await call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [t1, t2] });
await wait(700);
assert(await ev('window.__CAMP_DEBUG__.running'), 'Joystick and run work concurrently');
const yaw = await ev('window.__CAMP_DEBUG__.camera.yaw');
await call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [t1, t2, t3] });
await call('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [t1, t2, { ...t3, x: 620, y: 205 }] });
await wait(300);
assert(Math.abs(await ev('window.__CAMP_DEBUG__.camera.yaw') - yaw) > .2, 'Three-finger camera drag');
await call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await wait(500);
assert(!(await ev('window.__CAMP_DEBUG__.moving')), 'Touch release stops movement');
await ev(`document.querySelector('[data-testid="button-reset"]').click()`);
await wait(700);
assert(await ev(`(async()=>{const w=await import('/src/game/world.ts');const p=window.__CAMP_DEBUG__.position;return Math.hypot(p.x-w.SPAWN.x,p.z-w.SPAWN.z)<.05})()`), 'Reset');
await screenshot('final-spawn');
await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await wait(300);
assert(await ev('document.documentElement.scrollWidth<=innerWidth'), 'Portrait overflow');
assert(await ev('getComputedStyle(document.querySelector(".rotate-hint")).display!=="none"'), 'Portrait landscape hint');
await screenshot('portrait');
await call('Emulation.setDeviceMetricsOverride', { width: 667, height: 375, deviceScaleFactor: 1, mobile: true });
await wait(300);
assert(await ev(`['joystick','button-run','button-reset'].every(id=>{
 const r=document.querySelector('[data-testid="'+id+'"]').getBoundingClientRect();
 return r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;
})`), 'Small landscape touch targets stay on screen');
await screenshot('small-landscape');
assert.equal(errors.length, 0, JSON.stringify(errors));
await writeFile(`${output}/walkthrough.json`, JSON.stringify({ reports, errors, touch: 'passed', method: 'Actual browser useFrame movement with accelerated frames; separate real touch events; no device FPS claim' }, null, 2));
console.log('PASS: connected gameplay walkthrough, terrain/collisions, camera response, multitouch, reset, portrait/landscape.');
close();
