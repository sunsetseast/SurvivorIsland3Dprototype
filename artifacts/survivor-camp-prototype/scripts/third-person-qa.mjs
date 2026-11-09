/** Trusted touch + actual WebGL testing. Local emulation is not physical iPhone/Replit verification. */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createServer,preview} from 'vite';
import {captureCharacter} from './character-evidence.mjs';
const out=process.env.CHARACTER_EVIDENCE ?? '../../docs/third-person-foundation/evidence';await mkdir(out,{recursive:true});
const devPort=Number(process.env.THIRD_PERSON_DEV_PORT ?? 5220), prodPort=Number(process.env.THIRD_PERSON_PROD_PORT ?? 5221);
process.env.PORT=String(devPort);process.env.BASE_PATH='/';
const server=await createServer({configFile:'vite.config.ts',server:{host:'127.0.0.1',hmr:false,watch:null}});await server.listen();
const production=await preview({configFile:'vite.config.ts',preview:{host:'127.0.0.1',port:prodPort,strictPort:true}});
const browser=await chromium.launch({executablePath:process.env.CAMP_CHROMIUM,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--single-process','--no-zygote']});
const context=await browser.newContext({viewport:{width:932,height:430},hasTouch:true,isMobile:true,deviceScaleFactor:1});
const page=await context.newPage();page.setDefaultTimeout(90000);
const report={method:'Real Chromium software WebGL; emulated mobile landscape 932x430 DPR1; trusted touchscreen/CDP events, manual 60Hz player simulation and 100ms spectator advancement. No actual Replit access or physical iPhone certification.',browser:browser.version(),checks:[],screenshots:[],samples:[],character:[],errors:[],requests:[]};
const check=(name,detail)=>{report.checks.push({name,detail});console.log('PASS',name);};
page.on('pageerror',e=>{report.errors.push(e.stack);console.error('PAGE',e.stack);});page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL/.test(m.text()))report.errors.push(m.text());});
page.on('request',r=>{if(/ChallengeScene/.test(r.url()))report.requests.push(r.url());});
await page.addInitScript(()=>{
 const listeners=new Set(),ids=new WeakMap();let seq=0;const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
 const tracked=(target,type)=>(target===window||target===document)&&/^(pointer|key|blur|visibilitychange|survivor-)/.test(type);
 const key=(target,type,listener,o)=>{if(!ids.has(listener))ids.set(listener,++seq);return `${target===window?'w':'d'}:${type}:${ids.get(listener)}:${typeof o==='boolean'?o:!!o?.capture}`;};
 EventTarget.prototype.addEventListener=function(t,l,o){if(l&&tracked(this,t))listeners.add(key(this,t,l,o));return add.call(this,t,l,o);};
 EventTarget.prototype.removeEventListener=function(t,l,o){if(l&&tracked(this,t))listeners.delete(key(this,t,l,o));return remove.call(this,t,l,o);};
 window.hubListeners=()=>listeners.size;
});
async function modules(){await page.evaluate(async()=>{const io=await import('/src/game/state.ts'),t=await import('/src/game/locations/travel.ts'),c=await import('/src/game/CampRuntime.ts'),s=await import('/src/game/challenge/stillwater/session.ts');window.hubQA={io,travel:t.worldTravel,camp:c.camp,sw:s.stillwater,co:(await import('/src/game/challenge/coastal/session.ts')).coastal};});}
async function init(){await page.evaluate(()=>{const q=window.hubQA,s=window.__WORLD_RENDER__.state;s.setFrameloop('never');s.clock.stop();s.clock.autoStart=false;Object.assign(q,{s,render:s.gl.render.bind(s.gl),clock:s.clock.elapsedTime});});}
async function advance(frames=1,render=false,step=1/60){await page.evaluate(({frames,render,step})=>{const q=window.hubQA;q.s.gl.render=()=>{};try{for(let i=0;i<frames;i++){q.clock=Math.max(q.clock,q.s.clock.elapsedTime)+step;q.s.advance(q.clock,false);}}finally{q.s.gl.render=q.render;}if(render)q.render(q.s.scene,q.s.camera);},{frames,render,step});}
async function ready(id){await page.waitForFunction(id=>window.__WORLD_RENDER__?.scene.getObjectByName('location-'+id),id);await init();for(let i=0;i<240;i++){await advance(3);if(await page.evaluate(()=>window.hubQA.travel.getSnapshot().phase==='ready'))break;await page.waitForTimeout(60);}assert.equal(await page.evaluate(()=>window.hubQA.travel.getSnapshot().phase),'ready');await advance(8,true);}
async function capture(name){if(await page.evaluate(()=>!!window.__WORLD_RENDER__))await advance(10,true);await page.screenshot({path:`${out}/${name}.jpg`,type:'jpeg',quality:86});report.screenshots.push(name+'.jpg');}
async function character(name,angle,root='exploration-player'){
 if(!process.env.CHARACTER_EVIDENCE)return;
 report.character.push({name,...await captureCharacter(page,out,name,angle,root)});
}
async function sequence(name,angle,root){
 for(let i=0;i<4;i++){await advance(5);await character(name+'-'+i,angle,root);}
}
async function state(){return await page.evaluate(()=>structuredClone(window.hubQA.co.engine?.state));}
async function hub(){await page.getByTestId('challenge-testing').tap();await page.getByTestId('challenge-testing-hub').waitFor();}
async function play(double=false){const b=await page.getByTestId('hub-individual-balance').boundingBox();await page.getByTestId('hub-individual-balance').tap();assert.ok(await page.getByTestId('world-transition').isVisible());if(double)await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);await ready('challenge_main');await page.waitForFunction(()=>window.hubQA.co.engine?.state.phase==='introduction');}
async function start(){await page.getByTestId('stillwater-rules').tap();await page.getByTestId('stillwater-ready').tap();await advance(181,true);assert.equal((await state()).phase,'active');}
async function rememberOwner(){await page.evaluate(()=>window.hubOldOwner=window.__WORLD_RENDER__);}
async function hubReleased(label){await page.getByTestId('challenge-testing-hub').waitFor();await page.waitForTimeout(750);const s=await page.evaluate(label=>{const old=window.hubOldOwner,stats=old?.stats();const value={label,listeners:window.hubListeners(),canvases:document.querySelectorAll('canvas').length,activeScenes:old?.lifecycle.active,ownership:stats?.trackedResources,geometries:stats?.geometries,textures:stats?.textures,contextLost:old?.gl.getContext().isContextLost()};delete window.hubOldOwner;window.hubQA.s=null;window.hubQA.render=null;return value;},label);report.samples.push(s);assert.equal(await page.evaluate(()=>!!window.__WORLD_RENDER__),false);assert.equal(await page.evaluate(()=>window.hubQA.sw.engine),null);assert.equal(s.canvases,0);assert.equal(s.activeScenes,0);assert.equal(s.ownership,0);assert.equal(s.geometries,0);assert.equal(s.contextLost,true,JSON.stringify(s));return s;}
async function leftToHub(label='hub-return'){await rememberOwner();await page.getByTestId('stillwater-hub').tap();return hubReleased(label);}
async function sample(label){await page.waitForLoadState('networkidle');await page.waitForFunction(()=>!!window.__WORLD_RENDER__.scene.getObjectByName('challenge-botany-ready'));await advance(90,true);const s=await page.evaluate(label=>({label,sceneGeometryCount:(()=>{const set=new Set();window.__WORLD_RENDER__.scene.traverse(o=>{if(o.geometry)set.add(o.geometry);});return set.size;})(),...window.__CHALLENGE__.stats(),listeners:window.hubListeners(),ownership:window.__WORLD_RENDER__.stats().trackedResources,activeScenes:window.__WORLD_RENDER__.lifecycle.active,peakActive:window.__WORLD_RENDER__.lifecycle.peakActive,contextLost:window.__WORLD_RENDER__.gl.getContext().isContextLost()}),label);assert.equal(s.contextLost,false);assert.equal(s.activeScenes,1);assert.equal(s.peakActive,1);report.samples.push(s);return s;}
async function snapshotOriginal(){await page.evaluate(()=>{const q=window.hubQA;window.hubOriginal={session:q.travel.session,sessionJSON:JSON.stringify(q.travel.session),instance:q.travel.session.instance,participant:q.travel.session.participant,pose:{...q.travel.session.poses.camp_tribe_a},npcs:q.camp.npcs,provider:q.camp.provider,memory:q.camp.provider.memory,now:q.camp.now,npcJSON:JSON.stringify(q.camp.npcs),memoryJSON:JSON.stringify(q.camp.provider.memory),groupsJSON:JSON.stringify(q.camp.groups)};});}
async function unchanged(){const s=await page.evaluate(()=>{const q=window.hubQA,o=window.hubOriginal;return {session:JSON.stringify(o.session)===o.sessionJSON,npcs:q.camp.npcs===o.npcs&&JSON.stringify(q.camp.npcs)===o.npcJSON,provider:q.camp.provider===o.provider,memory:q.camp.provider.memory===o.memory&&JSON.stringify(q.camp.provider.memory)===o.memoryJSON,groups:JSON.stringify(q.camp.groups)===o.groupsJSON,clock:q.camp.now===o.now};});assert.ok(Object.values(s).every(Boolean),JSON.stringify(s));return s;}
const cdp=await context.newCDPSession(page);let contact=null,driveYaw=Math.PI;
const point=(id,x,y)=>({id,x,y,radiusX:6,radiusY:6,force:1});
async function release(){if(contact){await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});contact=null;}}
async function drive(x=0,f=1){const b=await page.getByTestId('joystick').boundingBox();assert.ok(b,'joystick must be owned by race stage');if(!contact){driveYaw=await page.evaluate(()=>window.hubQA.io.input.yaw);contact=point(31,b.x+b.width/2,b.y+b.height/2);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[contact]});}const frame=await page.evaluate(()=>{const d=window.__CHALLENGE__?.drive,i=window.hubQA.io.input;return {basis:d?.held&&d.epoch===i.joyEpoch?d.basis:i.yaw,beam:window.hubQA.co.engine?.player.stage==='beam'};});const beam=frame.beam;driveYaw=frame.basis;const wx=x,wz=f;x=beam?-wx:Math.cos(driveYaw)*wx-Math.sin(driveYaw)*wz;f=beam?wz:-Math.sin(driveYaw)*wx-Math.cos(driveYaw)*wz;const l=Math.max(1,Math.hypot(x,f)),max=b.width/2-18+4;contact=point(31,b.x+b.width/2+x/l*max,b.y+b.height/2-f/l*max);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[contact]});}
async function tap(id){await release();await page.getByTestId(id).tap();}
async function openRace(){await page.getByTestId('hub-beach-obstacle').tap();await ready('challenge_main');await page.getByTestId('coastal-rules').waitFor();}
async function raceStart(){await tap('coastal-rules');await tap('coastal-ready');await advance(181,true);assert.equal((await state()).phase,'racing');}
async function runCourse({fall=false,delay=0,captures=false}={}){
 let fell=false,side=0,delayed=false,lastStage='',crawlFrames=0,beamShot=false,netShots=0;for(let n=0;n<900;n++){
  const s=await state(),r=s.runners[0];if(r.stage!==lastStage||n%50===0){console.log('Course',n,r.stage,r.x,r.z,r.balance,r.mistakes);if(captures&&r.stage==='to-beam')await capture('crawl-exit');lastStage=r.stage;}if(r.stage==='puzzle'){await release();return s;}
  if(captures&&r.stage==='crawl'&&r.z>-36.8&&crawlFrames<4){await drive(0,1);if(crawlFrames===0&&process.env.CHARACTER_EVIDENCE)await sequence('crawl',1.35,'coastal-runner-0');await advance(12);if(crawlFrames===1)await crawlLook();await inspectCrawl('crawl-'+crawlFrames++);continue;}
  if(captures&&r.stage==='beam'&&!beamShot&&r.z>-23&&r.recoverUntil< s.clock-s.heatStart){await capture('beam-supported');await character('balance',.75,'coastal-runner-0');beamShot=true;}
  if(r.stage==='net'){await release();await tap(side===0?'coastal-left':'coastal-right');side=1-side;await advance(25);if(captures&&netShots<2&&r.progress>(netShots===0?.3:.65)){await capture('net-'+netShots++);await inspectNet();if(netShots===1&&process.env.CHARACTER_EVIDENCE)await sequence('climb',1.5,'coastal-runner-0');}continue;}
  if(r.stage==='beam'){if(fall&&!fell){await drive(1,1);await advance(200);await release();assert.ok((await state()).runners[0].mistakes>0);fell=true;}else{await drive(-r.balance*2.5,1);await advance(12);}continue;}
  if((r.stage==='sprint'&&r.z>=-38)||(r.stage==='to-beam'&&r.z>=-25.6)||(r.stage==='to-net'&&r.z>=-8.8)){if(Math.abs(r.x+27)>.25){await drive(Math.sign(-27-r.x),0);await advance(3);continue;}await tap('coastal-action');if(captures)await capture('02-'+(await state()).runners[0].stage);continue;}
  if(r.stage==='collection'&&r.z>=15.7){await release();if(delay&&!delayed){await advance(delay*60);delayed=true;}const i=r.bundles.findIndex(v=>!v),goal=-27+[-1.1,-.3,.5][i];if(Math.abs(r.x-goal)>.18){await drive(Math.sign(goal-r.x),0);await advance(3);}else await tap('coastal-action');continue;}
  assert.ok(!['dnf','finished'].includes(r.stage),JSON.stringify(r));await drive(0,1);await advance(24);
 }
 throw Error('Course traversal exceeded bounded inputs');
}
async function drag(piece,slot,{cancel=false,multi=false}={}){
 const a=await page.getByTestId('mosaic-piece-'+piece).boundingBox(),b=await page.getByTestId('mosaic-slot-'+slot).boundingBox();let p=point(41,a.x+a.width/2,a.y+a.height/2),q=multi?point(42,a.x+3,a.y+3):null;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});if(q)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p,q]});
 p={...p,x:b.x+b.width/2,y:b.y+b.height/2};await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:q?[p,q]:[p]});await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});
}
async function toHub(){await page.evaluate(()=>window.hubOldOwner=window.__WORLD_RENDER__);await tap('coastal-hub');return hubReleased('coastal-hub-return');}
async function multiLook(){
 if(!contact)await drive(0,1);
 const before=await page.evaluate(()=>({...window.hubQA.io.dbg,yaw:window.hubQA.io.input.yaw,basis:window.__CHALLENGE__?.drive.basis})),p=point(71,800,210);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[contact,p]});p.x=660;p.y=150;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[contact,p]});await advance(18,true);await capture('free-look-'+(await state()?'race':'camp'));
 const after=await page.evaluate(()=>({...window.hubQA.io.dbg,yaw:window.hubQA.io.input.yaw,joy:window.hubQA.io.input.joyY,basis:window.__CHALLENGE__?.drive.basis}));
 assert.ok(Math.abs(after.yaw-before.yaw)>.4);if(before.basis!==undefined)assert.equal(after.basis,before.basis,"held movement cannot be redirected by orbit");assert.ok(after.joy>0);assert.ok(after.z!==before.z||after.x!==before.x);p.y=425;await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[contact,p]});await page.waitForFunction(()=>Math.abs(window.hubQA.io.input.pitch-1.15)<.001);p.y=5;await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[contact,p]});await page.waitForFunction(()=>Math.abs(window.hubQA.io.input.pitch-(window.hubQA.co.ownsControls?-.25:.12))<.001);check('Trusted orbit respects both pitch limits');await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[contact]});
 check('Trusted simultaneous joystick and right-thumb orbit without input theft',{before,after});
}
async function crawlLook(){
 const p=point(72,800,210);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[contact,p]});p.x=580;await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[contact,p]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[contact]});await advance(16,true);
}
async function inspectCrawl(name){
 const sample=await page.evaluate(async()=>{
  const w=window.__WORLD_RENDER__,body=w.scene.getObjectByName('coastal-runner-0');w.scene.updateMatrixWorld(true);
  let bounds;body.traverse(o=>{if(!bounds&&o.isMesh){o.geometry.computeBoundingBox();bounds=o.geometry.boundingBox.clone();}});const box=bounds.setFromObject(body,!!body.getObjectByName('skinned-survivor')),joints={};body.traverse(o=>{if(o.isBone||o.name.startsWith('joint-'))joints[o.name]={rotation:o.rotation.toArray(),scale:o.scale.toArray()};});
  return {z:window.hubQA.co.engine.player.z,height:box.max.y-body.position.y,scale:body.scale.toArray(),joints};
 });assert.ok(sample.height<1.05,JSON.stringify(sample));assert.deepEqual(sample.scale,[1,1,1]);report.checks.push({name:'Rendered crawl aperture '+name,detail:sample});await capture(name);
}
async function inspectNet(){const sample=await page.evaluate(async()=>{const root=window.__WORLD_RENDER__.scene.getObjectByName('coastal-runner-0'),r=window.hubQA.co.engine.player,elbow=root.getObjectByName('joint-elL'),hand=root.position.clone();const wrist=root.getObjectByName('LeftHand');if(wrist)wrist.getWorldPosition(hand);else elbow.localToWorld(hand.set(0,-.32,.01));const base=window.__CHALLENGE__.surface.height(r.x,-5),surface=base+.1+2.95*(1-Math.abs(2*Math.max(0,Math.min(1,(hand.z+8.1)/6.2))-1));return {z:r.z,hand:hand.toArray(),surface,error:Math.abs(hand.y-surface)};});report.checks.push({name:'Actual net hand contact',detail:sample});assert.ok(sample.error<.45,JSON.stringify(sample));}
async function cpuSample(quality){
 const metrics=await page.evaluate(async()=>{const {characterAnimationMetrics:m}=await import('/src/game/Contestants.tsx'),sk=window.__WORLD_RENDER__.scene.getObjectByName('skinned-survivor')?(await import('/src/game/character/PlayableSurvivor.tsx')).skeletalMetrics:null,oldSk={...sk},q=window.hubQA,old={...m},cost=[];q.s.gl.render=()=>{};for(let i=0;i<180;i++){q.clock+=1/60;q.s.advance(q.clock,false);cost.push(q.io.dbg.cameraCpuMs);}q.s.gl.render=q.render;cost.sort((a,b)=>a-b);return {frames:cost.length,cameraMeanMs:cost.reduce((a,b)=>a+b,0)/cost.length,cameraP95Ms:cost[Math.floor(cost.length*.95)],contestantMeanMs:(m.totalMs-old.totalMs)/(m.updates-old.updates),skeletalMeanMs:sk?(sk.totalMs-oldSk.totalMs)/(sk.updates-oldSk.updates):null,...window.__CHALLENGE__.stats()};});report.samples.push({label:'cpu-'+quality,...metrics});
}
try{
 await page.goto(`http://127.0.0.1:${prodPort}/?devTravel=1&challengeTesting=1`);await page.getByTestId('explore-island').waitFor();assert.equal(await page.getByTestId('challenge-testing').count(),0);check('Production hub remains inaccessible');
 await page.goto(`http://127.0.0.1:${devPort}/?quality=low`);await page.getByTestId('challenge-testing').waitFor();await modules();console.log('Loaded dev modules');await page.getByTestId('explore-island').tap();console.log('Entered camp load');await ready('camp_tribe_a');console.log('Camp ready');
 // Move actual camp player with real touch before preserving a non-default departure.
 if(process.env.CHARACTER_EVIDENCE){
   if(!process.env.CHARACTER_BASELINE)await page.waitForFunction(()=>!!window.__WORLD_RENDER__.scene.getObjectByName('skinned-survivor'));
   await character('front',0);await character('side',Math.PI/2);await character('back',Math.PI);
 }
 await drive(0,1);await advance(30,true);await capture('camp-walk');if(process.env.CHARACTER_EVIDENCE)await sequence('walk',1.2);await release();await page.getByTestId('button-run').tap();await drive(0,1);await advance(24,true);await capture('camp-run');
 if(process.env.CHARACTER_EVIDENCE){
   await sequence('run',1.25);
   await drive(1,0);await sequence('turn',.9);await release();
 }await multiLook();await release();await advance(60);await page.getByTestId('button-menu').tap();await page.getByTestId('challenge-testing').waitFor();await snapshotOriginal();console.log('Camp preserved');await hub();console.log('Hub selected');await openRace();console.log('Race intro ready');await advance(90);await capture('01-introduction');
 assert.equal((await state()).runners.length,5);assert.equal(await page.evaluate(()=>window.__WORLD_RENDER__.lifecycle.peakActive),1);await raceStart();console.log('Race active');await sample('race-low');await drive(0,1);await advance(22);await multiLook();await release();await advance(160,true);await capture('behind-follow');const behind=await page.evaluate(()=>{const {dbg}=window.hubQA.io;return Math.abs(Math.atan2(Math.sin(window.hubQA.io.input.yaw-dbg.face-Math.PI),Math.cos(window.hubQA.io.input.yaw-dbg.face-Math.PI)));});assert.ok(behind<.04);check('Behind follow and idle recenter',behind);await cpuSample('low');
 await tap('coastal-pause');const frozen=await state();await advance(180);assert.deepEqual(await state(),frozen);await tap('coastal-resume');
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal((await state()).phase,'paused');await tap('coastal-resume');check('Direct real intro/Ready/countdown, pause/resume and focus-loss cleanup');
 const p=await runCourse({fall:true,delay:6,captures:true});report.puzzleArrival=p;assert.ok(p.runners[0].mistakes>0);assert.ok(p.runners[1].z>p.runners[0].z||p.runners[1].stage==='puzzle'||p.runners[1].stage==='finished');await capture('03-karst-mosaic');
 console.log('Puzzle ready');await drag(0,1);assert.ok((await state()).runners[0].slots.every(x=>x===-1));await drag(0,0,{cancel:true});assert.equal((await state()).runners[0].slots[0],-1);console.log('Testing second finger');await drag(0,0,{multi:true});assert.equal((await state()).runners[0].slots[0],0);await tap('mosaic-reset');assert.ok((await state()).runners[0].slots.every(x=>x===-1));
 for(const id of [4,1,5,0,3,2]){await drag(id,id);console.log('Placed',id,(await state()).runners[0].slots);}assert.equal((await state()).runners[0].stage,'finished');await advance(15,true);await capture('puzzle-to-follow');assert.notEqual(await page.evaluate(()=>window.hubQA.io.dbg.cameraOwner),'puzzle-inspection');check('Puzzle camera restores follow ownership');await advance(3000,true,.1);assert.equal((await state()).phase,'results');report.win=(await state()).result;assert.equal(report.win.find(r=>r.id===0).place,1);await capture('04-real-results');check('Continuous sprint/crawl/beam fall recovery/net/collection, actual touch mosaic wrong/cancel/multitouch/reset, comeback win');
 // A slower puzzle run loses through its actual completion time, then repeat a third full cycle.
 const activeSamples=[];for(let cycle=0;cycle<2;cycle++){
  if(cycle===0){await tap('coastal-retry');await raceStart();}else{await toHub();await openRace();await raceStart();}
  activeSamples.push(await sample('repeat-active-'+cycle));await runCourse();await advance(1000,false,.1);for(const id of [0,1,2,3,4,5])await drag(id,id);await advance(3000,true,.1);const result=(await state()).result;assert.equal((await state()).phase,'results');assert.ok(result.find(r=>r.id===0).place>1);await unchanged();
 }
 for(const key of ['sceneGeometryCount','ownership','listeners'])assert.equal(activeSamples[0][key],activeSamples[1][key],key);assert.ok(activeSamples[1].textures<=activeSamples[0].textures,'resident textures must not grow');assert.ok(activeSamples[1].geometries<=activeSamples[0].geometries,'resident GPU geometry must not grow; visibility may leave buffers unsubmitted');check('Input-driven puzzle loss, Retry and three full completed races; stable repeat ownership/listeners');
 await toHub();await unchanged();await page.getByTestId('hub-individual-balance').tap();await ready('challenge_main');await page.getByTestId('stillwater-rules').tap();await page.getByTestId('stillwater-ready').tap();await advance(181);assert.equal(await page.evaluate(()=>window.hubQA.sw.engine.state.phase),'active');await page.getByTestId('stillwater-hub').tap();await page.getByTestId('challenge-testing-hub').waitFor();
 for(const id of ['ocean-relay','jungle-net']){await page.getByTestId('hub-'+id).tap();await ready('challenge_main');assert.equal(await page.getByTestId('coastal-hud').count(),0);if(id==='ocean-relay'){await page.getByTestId('challenge-quality').tap();await advance(3);}await page.getByTestId('testing-hub').tap();await page.getByTestId('challenge-testing-hub').waitFor();}
 await openRace();await raceStart();await sample('race-high');await cpuSample('high');await capture('05-high-course');await tap('coastal-welcome');await page.getByTestId('challenge-testing').waitFor();await unchanged();await page.getByTestId('explore-island').tap();await ready('camp_tribe_a');
 const restored=await page.evaluate(()=>{const q=window.hubQA,o=window.hubOriginal;return {same:q.travel.session===o.session,pose:Math.hypot(q.io.dbg.x-o.pose.x,q.io.dbg.z-o.pose.z),input:[q.io.input.joyX,q.io.input.joyY],temporary:q.travel.challengeTesting,engine:q.co.engine};});assert.ok(restored.same&&restored.pose<.05);assert.deepEqual(restored.input,[0,0]);assert.equal(restored.temporary,null);assert.equal(restored.engine,null);check('Stillwater, both previews, High mode, Welcome and exact original camp resume');assert.deepEqual(report.errors,[]);check('No uncaught or shader/WebGL errors');
}catch(e){report.failure=e.stack;console.error(e);await page.screenshot({path:out+'/FAILURE.jpg'}).catch(()=>{});process.exitCode=1;}
finally{await writeFile(out+'/browser-report.json',JSON.stringify(report,null,2));await browser.close();await server.close();await new Promise(r=>production.httpServer.close(r));}
