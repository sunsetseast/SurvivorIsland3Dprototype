/** Real Chromium/WebGL rehearsal integration. Manual 60 Hz updates isolate software raster cost; no physical-device FPS claims. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createServer, preview } from "vite";
const out="../../docs/challenge-beach/evidence";
await mkdir(out,{recursive:true});
process.env.PORT="5197";process.env.BASE_PATH="/";
const server=await createServer({configFile:"vite.config.ts",server:{host:"127.0.0.1",hmr:false,watch:null}});await server.listen();
const production=await preview({configFile:"vite.config.ts",preview:{host:"127.0.0.1",port:5198,strictPort:true}});
const browser=await chromium.launch({executablePath:process.env.CAMP_CHROMIUM,headless:true,args:["--no-sandbox","--disable-dev-shm-usage","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--single-process","--no-zygote"]});
const report={method:"Chromium software WebGL (SwiftShader), emulated mobile landscape 932×430, DPR1. Manual 60 Hz simulation updates; renderer captures are real. No physical iPhone FPS/thermal/battery certification.",checks:[],samples:[],routes:[],screenshots:[],errors:[],requests:[]};
const context=await browser.newContext({viewport:{width:932,height:430},hasTouch:true,isMobile:true,deviceScaleFactor:1});
const page=await context.newPage();page.setDefaultTimeout(90000);
page.on("pageerror",e=>report.errors.push(e.message));
page.on("console",m=>{if(m.type()==="error" && /THREE|shader|WebGL/.test(m.text()))report.errors.push(m.text());});
page.on("response",r=>{if(/\.(glb|png|jpg)(\?|$)/.test(r.url()))report.requests.push({file:r.url().split("/").pop(),status:r.status()});});
await page.addInitScript(()=>{
  const listeners=new Set(),ids=new WeakMap();let seq=0;
  const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
  const tracked=(target,type)=>(target===window||target===document)&&/^(pointer|key|blur|visibilitychange|survivor-)/.test(type);
  const key=(target,type,listener,o)=>{if(!ids.has(listener))ids.set(listener,++seq);return `${target===window?"w":"d"}:${type}:${ids.get(listener)}:${typeof o==="boolean"?o:!!o?.capture}`;};
  EventTarget.prototype.addEventListener=function(t,l,o){if(l&&tracked(this,t))listeners.add(key(this,t,l,o));return add.call(this,t,l,o);};
  EventTarget.prototype.removeEventListener=function(t,l,o){if(l&&tracked(this,t))listeners.delete(key(this,t,l,o));return remove.call(this,t,l,o);};
  window.challengeListenerCount=()=>listeners.size;
});
const check=(name,detail)=>{console.log("PASS",name);report.checks.push({name,detail});};
async function init(){await page.evaluate(async()=>{
  const io=await import("/src/game/state.ts"),t=await import("/src/game/locations/travel.ts"),r=await import("/src/game/locations/registry.ts"),c=await import("/src/game/CampRuntime.ts");
  const s=window.__WORLD_RENDER__.state;s.setFrameloop("never");s.clock.stop();s.clock.autoStart=false;
  window.challengeQA={io,travel:t.worldTravel,registry:r,camp:c.camp,s,render:s.gl.render.bind(s.gl),clock:s.clock.elapsedTime};
});}
async function advance(frames=1,render=false){await page.evaluate(({frames,render})=>{
  const q=window.challengeQA;q.s.gl.render=()=>{};
  try{for(let i=0;i<frames;i++){q.clock=Math.max(q.clock,q.s.clock.elapsedTime)+1/60;q.s.advance(q.clock,false);}}finally{q.s.gl.render=q.render;}
  if(render)q.render(q.s.scene,q.s.camera);
},{frames,render});}
async function ready(id){await page.waitForFunction(id=>window.__WORLD_RENDER__?.scene.getObjectByName("location-"+id),id);await init();
  for(let i=0;i<240;i++){await advance(3);if(await page.evaluate(()=>window.challengeQA.travel.getSnapshot().phase==="ready"))break;await page.waitForTimeout(80);}
  assert.equal(await page.evaluate(()=>window.challengeQA.travel.getSnapshot().phase),"ready",await page.locator("body").innerText());await advance(3,true);
}
async function teleport(p,yaw=0){await page.evaluate(({p,yaw})=>{const q=window.challengeQA;q.io.clearInput();q.io.dbg.teleportRequested=p;q.io.input.yaw=yaw;q.io.input.pitch=.3;window.__CHALLENGE__?.inspect(null);},{p,yaw});await advance(5,true);}
async function walk(target){
  // Use the actual existing Player and actual movement solver, with trusted W key input.
  for(let i=0;i<260;i++){
    const d=await page.evaluate(t=>{const p=window.challengeQA.io.dbg;return {distance:Math.hypot(t.x-p.x,t.z-p.z),yaw:Math.atan2(p.x-t.x,p.z-t.z)};},target);
    if(d.distance<.55){await page.keyboard.up("w");await advance(1);return;}
    await page.keyboard.up("w");await advance(1);await page.evaluate(y=>{const io=window.challengeQA.io;io.input.yaw=y;io.input.looking=true;},d.yaw);await page.keyboard.down("w");
    await advance(Math.max(1,Math.min(18,Math.floor(d.distance/3.25*60))));await page.keyboard.up("w");await advance(1);
  }throw Error("Player route blocked: "+JSON.stringify(target));
}
async function capture(name,pose){if(pose)await page.evaluate(p=>window.__CHALLENGE__.inspect(p),pose);await advance(3,true);await page.screenshot({path:`${out}/${name}.jpg`,type:"jpeg",quality:88});report.screenshots.push(name+".jpg");}
async function select(id){await page.getByTestId("challenge-selector").selectOption(id);await page.waitForFunction(id=>window.__CHALLENGE__?.configuration===id,id);await advance(12,true);
  const detail=await page.evaluate(()=>{const q=window.challengeQA,names=[];q.s.scene.traverse(o=>{if(o.name.startsWith("challenge-equipment-"))names.push(o.name);});return {names,actors:q.s.scene.getObjectByName("challenge-staged-roster")?.children.map(n=>n.name),campNow:q.camp.now};});
  assert.equal(detail.names.length,1);assert.equal(detail.names[0],"challenge-equipment-"+id);return detail;
}
async function sample(label){await advance(3,true);const s=await page.evaluate(label=>({label,...(window.__CHALLENGE__?.stats()??window.__WORLD_RENDER__.stats()),listeners:window.challengeListenerCount(),activeScenes:window.__WORLD_RENDER__.lifecycle.active}),label);report.samples.push(s);assert.equal(s.activeScenes,1);return s;}
async function listenerCount(){let previous=-1,stable=0;for(let i=0;i<12 && stable<2;i++){await page.waitForTimeout(170);const n=await page.evaluate(()=>window.challengeListenerCount());stable=n===previous?stable+1:0;previous=n;}assert.ok(stable>=2);return previous;}
const views={
 "beach-obstacle":{position:[-3,9,-26],target:[-22,2,-3]},
 "ocean-relay":{position:[-31,10,18],target:[-82,1,-10]},
 "jungle-net":{position:[39,11,8],target:[62,4,-24]},
 "individual-balance":{position:[24,10,84],target:[49,4,61]},
};
let origin,savedCamp,firstListeners;
async function depart(){
  await teleport({x:-6,z:26},Math.PI);await page.waitForTimeout(220);
  assert.equal(await page.evaluate(()=>window.challengeQA.travel.travel("camp_to_challenge")),false);
  await page.getByTestId("grant-challenge").click();
  savedCamp=await page.evaluate(()=>{const q=window.challengeQA;window.persistedChallengeCamp={runtime:q.camp,npcs:q.camp.npcs,provider:q.camp.provider,memory:q.camp.provider.memory};return {now:q.camp.now,npcs:JSON.stringify(q.camp.npcs),memory:JSON.stringify(q.camp.provider.memory),tribe:q.travel.session.participant.tribeId,instance:q.travel.session.instance.id,pose:q.travel.session.poses.camp_tribe_a};});
  origin=savedCamp.instance;await page.getByTestId("travel-connection").click();await ready("challenge_main");
  await page.waitForFunction(()=>!!window.__WORLD_RENDER__.scene.getObjectByName("challenge-botany-ready"));await advance(12,true);
  const retained=await page.evaluate(()=>{const q=window.challengeQA,p=window.persistedChallengeCamp;return {identity:q.camp===p.runtime&&q.camp.npcs===p.npcs&&q.camp.provider===p.provider&&q.camp.provider.memory===p.memory,now:q.camp.now,npcs:JSON.stringify(q.camp.npcs),memory:JSON.stringify(q.camp.provider.memory),tribe:q.travel.session.participant.tribeId,grant:q.travel.session.permissions.length,event:q.travel.session.instance.eventId,originalTree:!!q.s.scene.getObjectByName("location-camp_tribe_a")};});
  assert.equal(retained.identity,true);assert.equal(retained.now,savedCamp.now);assert.equal(retained.npcs,savedCamp.npcs);assert.equal(retained.memory,savedCamp.memory);assert.equal(retained.tribe,savedCamp.tribe);assert.equal(retained.grant,0);assert.match(retained.event,/^rehearsal:/);assert.equal(retained.originalTree,false);
}
async function returnCamp(){await page.evaluate(()=>window.__CHALLENGE__.inspect(null));await page.getByTestId("challenge-staging").click();await advance(8);await page.waitForTimeout(220);await page.getByTestId("travel-connection").click();await ready("camp_tribe_a");
  assert.equal(await page.evaluate(()=>window.challengeQA.travel.session.instance.id),origin);
  const p=await page.evaluate(()=>({x:window.challengeQA.io.dbg.x,z:window.challengeQA.io.dbg.z}));assert.ok(Math.hypot(p.x-savedCamp.pose.x,p.z-savedCamp.pose.z)<.05);
  assert.equal(await page.evaluate(()=>!!window.__CHALLENGE__),false);
  return await listenerCount();
}
try{
  report.browser=browser.version();
  // Production bundle is served as built, without VITE_CHALLENGE_REHEARSAL.
  await page.goto("http://127.0.0.1:5198/?devTravel=1");await page.getByTestId("explore-island").waitFor();assert.equal(await page.getByTestId("challenge-selector").count(),0);assert.equal(await page.getByTestId("grant-challenge").count(),0);check("Normal production bundle exposes no challenge preview/admission controls");
  await page.goto("http://127.0.0.1:5197/?quality=low");await page.getByTestId("explore-island").click();await ready("camp_tribe_a");
  assert.equal(await page.evaluate(()=>window.challengeQA.travel.grantChallengeRehearsal()),false);check("URL opt-in is required even in development");
  await page.goto("http://127.0.0.1:5197/?quality=low&devTravel=1");await page.getByTestId("explore-island").click();await ready("camp_tribe_a");
  await teleport({x:-6,z:26},Math.PI);firstListeners=await listenerCount();await sample("camp-low-at-departure");
  await depart();check("Scoped rehearsal admission preserves exact runtime/provider/NPC/tribe state and unloads camp");
  // Low/High use identical fixed world-space inspection poses for resource comparisons.
  for(const quality of ["low","high"]){
    const current=await page.evaluate(()=>window.__CHALLENGE__.stats().quality);if(current!==quality){await page.getByTestId("challenge-quality").click();await page.waitForFunction(q=>window.__CHALLENGE__.stats().quality===q,quality);await advance(20,true);}
    for(const id of Object.keys(views)){await select(id);await page.evaluate(p=>window.__CHALLENGE__.inspect(p),views[id]);await sample(`${id}-${quality}`);if(quality==="low")await capture(`low-${id}`);}
  }
  check("All four previews replace equipment, validate safe views and render in both quality modes");
  await select("beach-obstacle");await page.evaluate(()=>window.__CHALLENGE__.arrival());await advance(90,true);await capture("01-arrival-high");
  await capture("02-main-beach-panorama",{position:[-87,18,45],target:[-3,4,-12]});await capture("03-main-obstacle-course",views["beach-obstacle"]);
  await select("ocean-relay");await capture("04-ocean-area",views["ocean-relay"]);await capture("05-floating-platforms",{position:[-61,5,-36],target:[-80,1.2,-13]});
  await select("jungle-net");await teleport({x:35,z:-43},-2);await capture("06-jungle-trail");await capture("07-jungle-clearing",views["jungle-net"]);await capture("08-rope-and-net-course",{position:[48,7,-45],target:[62,4,-25]});
  await select("individual-balance");await capture("09-individual-arena",views["individual-balance"]);await capture("10-balance-stations",{position:[36,5.5,48],target:[44,4.1,57]});
  await select("beach-obstacle");await capture("11-limestone-and-coast",{position:[-73,12,56],target:[5,27,-57]});
  // Representative routes use trusted keyboard input through the normal Player.
  const layout=await page.evaluate(async()=>{const m=await import("/src/game/challenge/layout.ts");return {arrival:m.ARRIVAL,routes:m.ROUTES};});
  for(const route of layout.routes){await teleport(route[0]);for(const end of route.slice(1))await walk(end);report.routes.push({start:route[0],end:route.at(-1),reached:await page.evaluate(()=>({x:window.challengeQA.io.dbg.x,z:window.challengeQA.io.dbg.z}))});}
  await teleport({x:35,z:-43},-2);await walk({x:43,z:-41});await capture("12-player-camera-traversal");check("Normal Player walks all six connecting route chains using keyboard input",report.routes);
  // Actual three-touch Run + look + joystick ownership.
  await teleport({x:9,z:-43},0);const cdp=await context.newCDPSession(page);
  const joy=await page.getByTestId("joystick").boundingBox(),run=await page.getByTestId("button-run").boundingBox();assert.ok(joy&&run);
  const point=(id,x,y)=>({id,x,y,radiusX:7,radiusY:7,force:1});
  const a=point(1,joy.x+joy.width/2,joy.y+joy.height/2),b=point(2,run.x+run.width/2,run.y+run.height/2),c=point(3,740,170);
  await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[a]});await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[a,b]});await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[b]});assert.equal(await page.evaluate(()=>window.challengeQA.io.input.run),true,"Run tap must latch before the three-touch gesture");await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[a,b]});await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[a,b,c]});
  await cdp.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{...a,y:a.y-30},b,{...c,x:770,y:183}]});await advance(35,true);
  report.touchState=await page.evaluate(()=>{const q=window.challengeQA;return {run:q.io.input.run,joyX:q.io.input.joyX,joyY:q.io.input.joyY,looking:q.io.input.looking,locked:q.io.dbg.controlsLocked,speed:q.io.dbg.speed,running:q.io.dbg.running};});
  assert.equal(report.touchState.running,true,JSON.stringify(report.touchState));await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});await advance(4);check("Challenge scene retains existing three-touch run/movement/look controls");
  // Switching repeatedly must plateau for an equivalent selected configuration.
  const equivalent=[];for(let cycle=0;cycle<3;cycle++){for(const id of Object.keys(views))await select(id);await select("beach-obstacle");await page.waitForTimeout(250);equivalent.push(await sample(`selection-cycle-${cycle}`));}
  assert.equal(equivalent[1].geometries,equivalent[2].geometries);assert.equal(equivalent[1].textures,equivalent[2].textures);assert.equal(equivalent[1].listeners,equivalent[2].listeners);check("Repeated configuration selection plateaus GPU geometry/texture and listener counts",equivalent);
  const returned=[await returnCamp()];await sample("camp-high-first-return");
  for(let i=0;i<2;i++){await depart();await select("individual-balance");returned.push(await returnCamp());await sample(`camp-high-return-${i+2}`);}
  assert.equal(returned[1],returned[2]);assert.equal(returned[0],firstListeners);assert.equal(returned[0],returned[1]);
  const life=await page.evaluate(()=>structuredClone(window.__WORLD_RENDER__.lifecycle));report.lifecycle=life;assert.equal(life.peakActive,1);assert.ok(life.disposals.geometry>0);assert.ok(life.disposals.material>0);assert.ok(life.disposals.texture>0);
  check("Three rehearsal round trips restore exact camp instance/pose and stable input/listener ownership",{returned,firstListeners,life});
  const campSamples=report.samples.filter(s=>s.label.startsWith("camp-high"));assert.equal(campSamples[1].geometries,campSamples[2].geometries);assert.equal(campSamples[1].textures,campSamples[2].textures);check("Repeated camp returns plateau resident GPU resources",campSamples);
  assert.deepEqual(report.errors,[]);assert.ok(report.requests.every(r=>r.status<400));check("No uncaught/shader/WebGL errors or failed asset requests");
}catch(e){report.failure=e.stack;console.error(e);await page.screenshot({path:`${out}/FAILURE.jpg`}).catch(()=>{});process.exitCode=1;}
finally{await writeFile(`${out}/browser-report.json`,JSON.stringify(report,null,2));await browser.close();await server.close();await new Promise(r=>production.httpServer.close(r));}
