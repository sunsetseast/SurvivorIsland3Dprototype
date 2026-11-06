/** Real software-WebGL integration. Fixed stepping does not measure physical-device FPS. */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createServer} from 'vite';
const out='../../docs/stillwater-balance/evidence';await mkdir(out,{recursive:true});
process.env.PORT='5204';process.env.BASE_PATH='/';
const server=await createServer({configFile:'vite.config.ts',server:{host:'127.0.0.1',hmr:false,watch:null}});await server.listen();
const browser=await chromium.launch({executablePath:process.env.CAMP_CHROMIUM,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--single-process','--no-zygote']});
const context=await browser.newContext({viewport:{width:932,height:430},hasTouch:true,isMobile:true,deviceScaleFactor:1});
const page=await context.newPage();page.setDefaultTimeout(90000);
const report={method:'Actual Chromium SwiftShader WebGL; emulated landscape mobile 932x430 DPR1. Manually advanced 60 Hz simulation. No physical iPhone, FPS, thermal or battery certification.',browser:browser.version(),checks:[],screenshots:[],samples:[],errors:[]};
const check=(name,detail)=>{report.checks.push({name,detail});console.log('PASS',name);};
page.on('pageerror',e=>report.errors.push(e.stack));
page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL/.test(m.text()))report.errors.push(m.text());});
await page.addInitScript(()=>{
 const listeners=new Set(),ids=new WeakMap();let seq=0;const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
 const tracked=(target,type)=>(target===window||target===document)&&/^(pointer|key|blur|visibilitychange|survivor-)/.test(type);
 const key=(target,type,listener,o)=>{if(!ids.has(listener))ids.set(listener,++seq);return `${target===window?'w':'d'}:${type}:${ids.get(listener)}:${typeof o==='boolean'?o:!!o?.capture}`;};
 EventTarget.prototype.addEventListener=function(t,l,o){if(l&&tracked(this,t))listeners.add(key(this,t,l,o));return add.call(this,t,l,o);};
 EventTarget.prototype.removeEventListener=function(t,l,o){if(l&&tracked(this,t))listeners.delete(key(this,t,l,o));return remove.call(this,t,l,o);};
 window.stillwaterListenerCount=()=>listeners.size;
});
async function init(){await page.evaluate(async()=>{
 const io=await import('/src/game/state.ts'),t=await import('/src/game/locations/travel.ts'),c=await import('/src/game/CampRuntime.ts');
 const s=window.__WORLD_RENDER__.state;s.setFrameloop('never');s.clock.stop();s.clock.autoStart=false;
 window.swQA={io,travel:t.worldTravel,camp:c.camp,s,render:s.gl.render.bind(s.gl),clock:s.clock.elapsedTime};
});}
async function advance(frames=1,render=false){await page.evaluate(({frames,render})=>{
 const q=window.swQA;q.s.gl.render=()=>{};
 try{for(let i=0;i<frames;i++){q.clock=Math.max(q.clock,q.s.clock.elapsedTime)+1/60;q.s.advance(q.clock,false);}}finally{q.s.gl.render=q.render;}
 if(render)q.render(q.s.scene,q.s.camera);
},{frames,render});}
async function ready(id){await page.waitForFunction(id=>window.__WORLD_RENDER__?.scene.getObjectByName('location-'+id),id);await init();for(let i=0;i<240;i++){await advance(3);if(await page.evaluate(()=>window.swQA.travel.getSnapshot().phase==='ready'))break;await page.waitForTimeout(60);}assert.equal(await page.evaluate(()=>window.swQA.travel.getSnapshot().phase),'ready');await advance(3,true);}
async function teleport(x,z){await page.evaluate(({x,z})=>{const q=window.swQA;q.io.clearInput();q.io.dbg.teleportRequested={x,z};q.io.input.yaw=0;q.io.input.pitch=.3;window.__CHALLENGE__?.inspect(null);},{x,z});await advance(6,true);}
async function capture(name){await advance(8,true);await page.screenshot({path:`${out}/${name}.jpg`,type:'jpeg',quality:88});report.screenshots.push(name+'.jpg');}
async function state(){return await page.evaluate(()=>structuredClone(window.__CHALLENGE__.stillwater.engine.state));}
async function select(id){await page.getByTestId('challenge-selector').selectOption(id);await page.waitForFunction(id=>window.__CHALLENGE__?.configuration===id,id);await advance(10,true);}
async function sample(label){await page.waitForTimeout(250);await advance(15,true);const data=await page.evaluate(label=>({label,...window.__CHALLENGE__.stats(),trackedResources:window.__WORLD_RENDER__.stats().trackedResources,listeners:window.stillwaterListenerCount(),activeScenes:window.__WORLD_RENDER__.lifecycle.active}),label);report.samples.push(data);return data;}
async function enter(){await teleport(30,49);await page.getByTestId('stillwater-enter').click();await advance(60,true);}
async function start(){await page.getByTestId('stillwater-rules').click();await page.getByTestId('stillwater-ready').click();await advance(181,true);assert.equal((await state()).phase,'active');}
async function retry(){await page.getByTestId('stillwater-retry').click();await page.getByTestId('stillwater-ready').click();await advance(181,true);assert.equal((await state()).phase,'active');}
async function returnCamp(){await page.getByTestId('challenge-staging').click();await advance(12);await page.waitForTimeout(220);await page.getByTestId('travel-connection').click();await ready('camp_tribe_a');
 const r=await page.evaluate(()=>{const q=window.swQA,o=window.swOrigin;return {instance:q.travel.session.instance.id===o.instance,pose:Math.hypot(q.io.dbg.x-o.pose.x,q.io.dbg.z-o.pose.z),identity:q.camp===o.camp&&q.camp.npcs===o.npcs&&q.camp.provider.memory===o.memory,now:q.camp.now,npcJSON:JSON.stringify(q.camp.npcs),memoryJSON:JSON.stringify(q.camp.provider.memory),expectedNPC:o.npcJSON,expectedMemory:o.memoryJSON,challengeAbsent:!window.__CHALLENGE__,active:window.__WORLD_RENDER__.lifecycle.active};});
 assert.ok(r.instance&&r.identity&&r.challengeAbsent);assert.ok(r.pose<.05);assert.equal(r.memoryJSON,r.expectedMemory);assert.equal(r.active,1);check('Return restores exact source camp instance/pose and original NPC/provider/memory identities; camp movement resumes normally',r);
}
try{
 await page.goto('http://127.0.0.1:5204/?quality=low&devTravel=1');await page.getByTestId('explore-island').click();await ready('camp_tribe_a');
 await teleport(-6,26);await page.waitForTimeout(220);await page.getByTestId('grant-challenge').click();
 await page.evaluate(()=>{const q=window.swQA;window.swOrigin={camp:q.camp,npcs:q.camp.npcs,memory:q.camp.provider.memory,now:q.camp.now,npcJSON:JSON.stringify(q.camp.npcs),memoryJSON:JSON.stringify(q.camp.provider.memory),instance:q.travel.session.instance.id,pose:{...q.travel.session.poses.camp_tribe_a}};});
 await page.getByTestId('travel-connection').click();await ready('challenge_main');await page.waitForFunction(()=>window.__WORLD_RENDER__.scene.getObjectByName('challenge-botany-ready'));
 assert.equal(await page.evaluate(()=>window.__CHALLENGE__.stillwater.start()),false);await select('individual-balance');await sample('exploration-low');await enter();await capture('01-introduction-low');assert.equal(await page.evaluate(()=>window.__CHALLENGE__.stillwater.start()),false);check('Only valid nearby rehearsal can enter; duplicate session rejected; staged host and exclusive session');
 await page.getByTestId('stillwater-rules').click();await capture('02-tutorial-low');await page.getByTestId('stillwater-ready').click();await advance(181,true);assert.equal((await state()).phase,'active');await capture('03-active-low');await sample('active-low');
 await page.keyboard.down('d');await advance(45,true);await page.keyboard.up('d');await advance(3,true);assert.ok((await state()).competitors[0].balance>0);await capture('04-struggle-low');
 await page.getByTestId('stillwater-cancel').click();await advance(30,true);assert.equal(await page.getByTestId('joystick').count(),1);assert.equal(await page.evaluate(()=>window.__CHALLENGE__.stillwater.ownsControls),false);check('Actual keyboard changes simulation and cancellation restores exploration input');
 const restored=await page.evaluate(()=>({x:window.swQA.io.dbg.x,z:window.swQA.io.dbg.z,locked:window.swQA.io.dbg.controlsLocked}));assert.ok(Math.hypot(restored.x-30,restored.z-49)<.05);assert.equal(restored.locked,false);
 await enter();await start();
 const cdp=await context.newCDPSession(page),pad=await page.getByTestId('balance-pad').boundingBox(),button=await page.getByTestId('place-object').boundingBox();assert.ok(pad&&button);
 const point=(id,x,y)=>({id,x,y,radiusX:6,radiusY:6,force:1});const a=point(1,pad.x+pad.width/2,pad.y+pad.height/2),b=point(2,button.x+button.width/2,button.y+button.height/2),stray=point(3,850,300);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a,stray]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...a,x:a.x+35},{...stray,x:870}]});await advance(6);assert.ok((await state()).competitors[0].control>.1);
 assert.equal(await page.evaluate(()=>window.swQA.io.input.joyX),0);assert.equal(await page.getByTestId('joystick').count(),0);assert.equal(await page.evaluate(()=>window.swQA.io.dbg.controlsLocked),true);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await advance(60);assert.ok(Math.abs((await state()).competitors[0].control)<.001);check('Real CDP multitouch owns balance without movement/look leakage; touch cancellation returns correction to neutral');
 // Blur and background require an explicit resume; no unobserved catch-up.
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));const paused=await state();assert.equal(paused.phase,'paused');await advance(300);assert.deepEqual(await state(),paused);await page.getByTestId('stillwater-resume').click();await advance(1);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal((await state()).phase,'paused');const hidden=await state();await advance(180);assert.deepEqual(await state(),hidden);
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});assert.equal((await state()).phase,'paused');await page.getByTestId('stillwater-resume').click();await advance(1);check('Focus/background freeze simulation and release pointers; returning never auto-resumes');
 // Deliberately lose through real keyboard input. Opponents continue independently.
 await page.keyboard.down('d');await advance(180,true);await page.keyboard.up('d');assert.equal((await state()).phase,'player-eliminated');await capture('05-player-eliminated-low');await advance(5400,true);const loss=await state();assert.equal(loss.phase,'results');assert.ok(!loss.result.winnerIds.includes(0));await capture('06-results-loss-low');check('Gameplay mistakes eliminate player; remaining real roster determines an independent winner',loss.result);
 await retry();
 // A successful run uses real balance-pointer motion and a second real placement finger, never edited engine state.
 const p2=await page.getByTestId('balance-pad').boundingBox(),b2=await page.getByTestId('place-object').boundingBox();const touch=point(10,p2.x+p2.width/2,p2.y+p2.height/2),placeTouch=point(11,b2.x+b2.width/2,b2.y+b2.height/2);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});let placements=0;report.touchTrace=[];
 for(let i=0;i<920;i++){
   const v=await page.evaluate(async()=>{const e=window.__CHALLENGE__.stillwater.engine,c=e.state.competitors[0],m=await import('/src/game/challenge/stillwater/engine.ts');return {phase:e.state.phase,elapsed:e.state.elapsed,input:Math.max(-1,Math.min(1,-(m.disturbance(e.state.elapsed,c.phase)*.62+c.balance*2.7+c.velocity*2)/1.65)),place:m.canPlace(c,e.state.elapsed),placed:c.placed};});
   if(v.phase==='results')break;if(i%100===0)report.touchTrace.push({...v,competitor:(await state()).competitors[0]});assert.equal(v.phase,'active');const moved={...touch,x:touch.x+v.input*p2.width*.38};await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[moved]});
   // CDP touchEnd identifies the finger being lifted. Keep the balance finger held.
   if(v.place){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[moved,placeTouch]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[placeTouch]});placements++;}
   await advance(6,i===220||i===650);if(i===220)await capture('07-active-stack-low');
 }
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});const win=await state();assert.equal(win.phase,'results');assert.ok(win.result.winnerIds.includes(0));assert.ok(win.competitors[0].placed>=7);assert.equal(win.competitors[0].placed,placements);await capture('08-results-win-low');check('Actual multitouch balance and precise placements complete 90 seconds with a player win and no duplicated placement',win.result);
 // High quality and equivalent-session resource plateaus.
 await page.getByTestId('stillwater-return').click();await advance(40);await page.getByTestId('challenge-quality').click();await page.waitForFunction(()=>window.__CHALLENGE__.stats().quality==='high');await advance(20,true);await enter();await capture('09-introduction-high');await start();await capture('10-active-high');await sample('active-high');
 const cycles=[];for(let i=0;i<4;i++){await page.keyboard.down('d');await advance(180);await page.keyboard.up('d');await advance(5400);await retry();cycles.push(await sample('retry-'+i));}
 for(const key of ['trackedResources','geometries','textures','listeners'])assert.equal(cycles[2][key],cycles[3][key],`Retry retention ${key}`);assert.ok(cycles.every(c=>c.activeScenes===1));check('Four complete retries plateau GPU/texture/ownership/listener resources in one active scene',cycles);
 await page.evaluate(()=>window.__CHALLENGE__.select('ocean-relay'));await page.waitForFunction(()=>window.__CHALLENGE__.configuration==='ocean-relay');await advance(40);assert.equal(await page.evaluate(()=>window.__CHALLENGE__.stillwater.ownsControls),false);assert.equal(await page.getByTestId('stillwater-hud').count(),0);assert.equal(await page.getByTestId('joystick').count(),1);check('Replacing preview explicitly cancels active challenge and restores exploration');
 await select('individual-balance');await enter();await page.getByTestId('stillwater-cancel').click();await advance(60,true);await sample('exploration-high-after-retries');
 await page.evaluate(()=>{const q=window.swQA,o=window.swOrigin;if(q.camp.now!==o.now||JSON.stringify(q.camp.npcs)!==o.npcJSON||JSON.stringify(q.camp.provider.memory)!==o.memoryJSON)throw Error('Rehearsal changed camp/social state');});check('All competitions leave camp clock, NPCs and social memory byte-identical');
 await returnCamp();
 assert.deepEqual(report.errors,[]);check('No uncaught or WebGL/shader errors');
}catch(e){report.failure=e.stack;report.lastState=await state().catch(()=>null);console.error(e);await page.screenshot({path:`${out}/FAILURE.jpg`}).catch(()=>{});process.exitCode=1;}
finally{await writeFile(`${out}/browser-report.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
