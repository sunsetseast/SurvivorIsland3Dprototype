/** Trusted touch + actual WebGL testing. Local emulation is not physical iPhone/Replit verification. */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createServer,preview} from 'vite';
const out='../../docs/challenge-testing/evidence';await mkdir(out,{recursive:true});
process.env.PORT='5210';process.env.BASE_PATH='/';
const server=await createServer({configFile:'vite.config.ts',server:{host:'127.0.0.1',hmr:false,watch:null}});await server.listen();
const production=await preview({configFile:'vite.config.ts',preview:{host:'127.0.0.1',port:5211,strictPort:true}});
const browser=await chromium.launch({executablePath:process.env.CAMP_CHROMIUM,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--single-process','--no-zygote']});
const context=await browser.newContext({viewport:{width:932,height:430},hasTouch:true,isMobile:true,deviceScaleFactor:1});
const page=await context.newPage();page.setDefaultTimeout(90000);
const report={method:'Real Chromium software WebGL; emulated mobile landscape 932x430 DPR1; trusted touchscreen/CDP events, manual 60Hz simulation. No actual Replit access or physical iPhone certification.',browser:browser.version(),checks:[],screenshots:[],samples:[],errors:[],requests:[]};
const check=(name,detail)=>{report.checks.push({name,detail});console.log('PASS',name);};
page.on('pageerror',e=>report.errors.push(e.stack));page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL/.test(m.text()))report.errors.push(m.text());});
page.on('request',r=>{if(/ChallengeScene/.test(r.url()))report.requests.push(r.url());});
await page.addInitScript(()=>{
 const listeners=new Set(),ids=new WeakMap();let seq=0;const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
 const tracked=(target,type)=>(target===window||target===document)&&/^(pointer|key|blur|visibilitychange|survivor-)/.test(type);
 const key=(target,type,listener,o)=>{if(!ids.has(listener))ids.set(listener,++seq);return `${target===window?'w':'d'}:${type}:${ids.get(listener)}:${typeof o==='boolean'?o:!!o?.capture}`;};
 EventTarget.prototype.addEventListener=function(t,l,o){if(l&&tracked(this,t))listeners.add(key(this,t,l,o));return add.call(this,t,l,o);};
 EventTarget.prototype.removeEventListener=function(t,l,o){if(l&&tracked(this,t))listeners.delete(key(this,t,l,o));return remove.call(this,t,l,o);};
 window.hubListeners=()=>listeners.size;
});
async function modules(){await page.evaluate(async()=>{const io=await import('/src/game/state.ts'),t=await import('/src/game/locations/travel.ts'),c=await import('/src/game/CampRuntime.ts'),s=await import('/src/game/challenge/stillwater/session.ts');window.hubQA={io,travel:t.worldTravel,camp:c.camp,sw:s.stillwater};});}
async function init(){await page.evaluate(()=>{const q=window.hubQA,s=window.__WORLD_RENDER__.state;s.setFrameloop('never');s.clock.stop();s.clock.autoStart=false;Object.assign(q,{s,render:s.gl.render.bind(s.gl),clock:s.clock.elapsedTime});});}
async function advance(frames=1,render=false){await page.evaluate(({frames,render})=>{const q=window.hubQA;q.s.gl.render=()=>{};try{for(let i=0;i<frames;i++){q.clock=Math.max(q.clock,q.s.clock.elapsedTime)+1/60;q.s.advance(q.clock,false);}}finally{q.s.gl.render=q.render;}if(render)q.render(q.s.scene,q.s.camera);},{frames,render});}
async function ready(id){await page.waitForFunction(id=>window.__WORLD_RENDER__?.scene.getObjectByName('location-'+id),id);await init();for(let i=0;i<240;i++){await advance(3);if(await page.evaluate(()=>window.hubQA.travel.getSnapshot().phase==='ready'))break;await page.waitForTimeout(60);}assert.equal(await page.evaluate(()=>window.hubQA.travel.getSnapshot().phase),'ready');await advance(8,true);}
async function capture(name){if(await page.evaluate(()=>!!window.__WORLD_RENDER__))await advance(10,true);await page.screenshot({path:`${out}/${name}.jpg`,type:'jpeg',quality:86});report.screenshots.push(name+'.jpg');}
async function state(){return await page.evaluate(()=>structuredClone(window.hubQA.sw.engine?.state));}
async function hub(){await page.getByTestId('challenge-testing').tap();await page.getByTestId('challenge-testing-hub').waitFor();}
async function play(){await page.getByTestId('hub-individual-balance').tap();await ready('challenge_main');await page.waitForFunction(()=>window.hubQA.sw.engine?.state.phase==='introduction');}
async function start(){await page.getByTestId('stillwater-rules').tap();await page.getByTestId('stillwater-ready').tap();await advance(181,true);assert.equal((await state()).phase,'active');}
async function leftToHub(){await page.getByTestId('stillwater-hub').tap();await page.getByTestId('challenge-testing-hub').waitFor();await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>!!window.__WORLD_RENDER__),false);assert.equal(await page.evaluate(()=>window.hubQA.sw.engine),null);}
try{
 await page.goto('http://127.0.0.1:5211/?devTravel=1&challengeTesting=1');await page.getByTestId('explore-island').waitFor();assert.equal(await page.getByTestId('challenge-testing').count(),0);assert.match(await page.getByTestId('welcome-build').innerText(),/Production build/);check('Normal production welcome rejects URL-based hub unlock');
 await page.goto('http://127.0.0.1:5210/?quality=low');await page.getByTestId('challenge-testing').waitFor();await modules();
 assert.equal(await page.evaluate(()=>!!window.__WORLD_RENDER__),false);assert.equal(report.requests.length,0);await capture('01-welcome');
 await page.evaluate(()=>{const q=window.hubQA;window.hubOriginal={session:q.travel.session,instance:q.travel.session.instance,participant:q.travel.session.participant,npcs:q.camp.npcs,provider:q.camp.provider,memory:q.camp.provider.memory,now:q.camp.now,npcJSON:JSON.stringify(q.camp.npcs),memoryJSON:JSON.stringify(q.camp.provider.memory)};});
 await hub();assert.equal(await page.locator('.testing-card').count(),4);assert.equal(await page.getByText('Environment Preview',{exact:false}).count(),3);await capture('02-hub-landscape');assert.equal(report.requests.length,0);check('Welcome → hub needs no URL flag, loads no ChallengeScene and lists one playable/three previews');
 await play();await capture('03-direct-introduction');assert.equal((await state()).competitors.length,5);assert.equal(await page.getByTestId('grant-challenge').count(),0);assert.equal(await page.getByTestId('stillwater-enter').count(),0);assert.equal(await page.evaluate(()=>window.__CHALLENGE__.configuration),'individual-balance');check('One tap loads existing Individual Clearing and auto-starts the real introduction with actual roster');
 await start();await capture('04-active-touch-controls');assert.equal(await page.getByTestId('balance-pad').count(),1);assert.equal(await page.getByTestId('joystick').count(),0);await leftToHub();
 await page.getByTestId('hub-welcome').tap();await page.getByTestId('challenge-testing').waitFor();assert.equal(await page.evaluate(()=>{const q=window.hubQA,o=window.hubOriginal;return q.travel.session===o.session&&q.travel.session.instance===o.instance&&q.travel.session.participant===o.participant&&q.camp.npcs===o.npcs&&q.camp.provider===o.provider&&q.camp.provider.memory===o.memory&&q.camp.now===o.now&&JSON.stringify(q.camp.npcs)===o.npcJSON&&JSON.stringify(q.camp.provider.memory)===o.memoryJSON;}),true);check('Ready and Hub/Welcome touch exits preserve original normal/camp/social identities and clock');
 await page.getByTestId('explore-island').tap();await ready('camp_tribe_a');assert.ok(await page.evaluate(()=>Math.hypot(window.hubQA.io.dbg.x+6,window.hubQA.io.dbg.z+24)<.05));check('Continue normal session after cold-start testing reaches the original camp default spawn');
 assert.deepEqual(report.errors,[]);check('No uncaught or shader/WebGL errors');
}catch(e){report.failure=e.stack;console.error(e);await page.screenshot({path:`${out}/FAILURE.jpg`}).catch(()=>{});process.exitCode=1;}
finally{await writeFile(`${out}/browser-report.json`,JSON.stringify(report,null,2));await browser.close();await server.close();await new Promise(r=>production.httpServer.close(r));}
