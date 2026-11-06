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
try{
 await page.goto('http://127.0.0.1:5204/?quality=low&devTravel=1');await page.getByTestId('explore-island').click();await ready('camp_tribe_a');
 await teleport(-6,26);await page.waitForTimeout(220);await page.getByTestId('grant-challenge').click();
 await page.evaluate(()=>{const q=window.swQA;window.swOrigin={camp:q.camp,npcs:q.camp.npcs,memory:q.camp.provider.memory,now:q.camp.now,npcJSON:JSON.stringify(q.camp.npcs),memoryJSON:JSON.stringify(q.camp.provider.memory),instance:q.travel.session.instance.id,pose:{...q.travel.session.poses.camp_tribe_a}};});
 await page.getByTestId('travel-connection').click();await ready('challenge_main');await page.waitForFunction(()=>window.__WORLD_RENDER__.scene.getObjectByName('challenge-botany-ready'));
 await select('individual-balance');await sample('exploration-low');await enter();await capture('01-introduction-low');check('Enter existing individual clearing, staged host introduction and exclusive session');
 await page.getByTestId('stillwater-rules').click();await capture('02-tutorial-low');await page.getByTestId('stillwater-ready').click();await advance(181,true);assert.equal((await state()).phase,'active');await capture('03-active-low');await sample('active-low');
 await page.keyboard.down('d');await advance(45,true);await page.keyboard.up('d');await advance(3,true);assert.ok((await state()).competitors[0].balance>0);await capture('04-struggle-low');
 await page.getByTestId('stillwater-cancel').click();await advance(30,true);assert.equal(await page.getByTestId('joystick').count(),1);assert.equal(await page.evaluate(()=>window.__CHALLENGE__.stillwater.ownsControls),false);check('Actual keyboard changes simulation and cancellation restores exploration input');
 assert.deepEqual(report.errors,[]);check('No uncaught or WebGL/shader errors');
}catch(e){report.failure=e.stack;console.error(e);await page.screenshot({path:`${out}/FAILURE.jpg`}).catch(()=>{});process.exitCode=1;}
finally{await writeFile(`${out}/browser-report.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
