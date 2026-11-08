/** Identical baseline/final WebGL gallery. Bridges exist only in this QA build. */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {build,preview} from 'vite';
import {chromium} from 'playwright';
const phase=process.env.ART_PHASE||'after',out=path.resolve(`../../docs/railay-renaissance/evidence/${phase}`);
await mkdir(out,{recursive:true});process.env.PORT='5202';process.env.BASE_PATH='/';
const plugin={name:'renaissance-test-only',enforce:'pre',transform(src,id){
 const append=code=>src+'\nif(typeof window!=="undefined"){window.__RAILAY_QA__??={};'+code+'}';
 if(id.endsWith('/game/world.ts'))return append('window.__RAILAY_QA__.world={groundHeight,isWalkable};');
 if(id.endsWith('/game/state.ts'))return append('window.__RAILAY_QA__.io={dbg,clearInput};');
 if(id.endsWith('/game/CampRuntime.ts')){const sig='step(rawDt: number, player = this.player) {';assert.ok(src.includes(sig));return src.replace(sig,sig+' return;');}
}};
await build({configFile:'vite.config.ts',plugins:[plugin],build:{outDir:`../../generated-artifacts/renaissance-${phase}`,emptyOutDir:true}});
const server=await preview({configFile:'vite.config.ts',build:{outDir:`../../generated-artifacts/renaissance-${phase}`},preview:{host:'127.0.0.1',port:5202,strictPort:true}});
const browser=await chromium.launch({executablePath:process.env.CAMP_CHROMIUM,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:932,height:430},deviceScaleFactor:1,hasTouch:true,isMobile:true});page.setDefaultTimeout(120000);
await page.addInitScript(()=>Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8}));
const report={phase,captureContract:'railay-fixed-views-v2',method:'Chromium ANGLE SwiftShader, 932x430 DPR1. Fixed cameras, golden preset, 4s shader time, initial NPC staging; 60Hz culling simulation, hardwareConcurrency=8 for explicit Low/High parity. Host software GPU timings are NOT phone FPS.',errors:[],qualities:[]};
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().startsWith('Failed to load resource'))report.errors.push(m.text());});
const views=[['01-panorama',[-50,1.65,42],[-9,28,108]],['02-jungle-cliff',[-25,1.65,75],[11,19,106]],['03-shoreline',[-41,1.65,83],[-27,14,112]]];
try{for(const quality of ['low','high']){
 await page.goto(`http://127.0.0.1:5202/?quality=${quality}&devTravel=1&atmosphere=golden`);
 await page.getByTestId('explore-island').click();
 await page.waitForFunction(()=>window.__WORLD_RENDER__?.scene.getObjectByName('camp-assets-ready')&&window.__CAMP_DEBUG__?.position.y>0&&window.__WORLD_RENDER__.scene.getObjectByName('andaman-tropical-sky')?.material.userData.cloudReady===true);
 // Let requested images/maps settle before stopping the real renderer.
 await page.waitForLoadState('networkidle');
 await page.evaluate(()=>{const q=window.__RAILAY_QA__,s=window.__WORLD_RENDER__.state;s.setFrameloop('never');s.clock.stop();s.clock.autoStart=false;Object.assign(q,{s,clock:s.clock.elapsedTime,render:s.gl.render.bind(s.gl)});});
 const sample={quality,views:[]};
 for(const [name,position,target]of views){
  const detail=await page.evaluate(({position,target})=>{
   const q=window.__RAILAY_QA__,s=q.s,[x,eye,z]=position;
   if(!q.world.isWalkable(x,z))throw Error('Benchmark must be accessible: '+x+','+z);
   const pos=[x,q.world.groundHeight(x,z)+eye,z];
   q.io.clearInput();Object.assign(q.io.dbg,{x,z,y:pos[1]-eye});
   const pose=()=>{s.camera.far=600;s.camera.fov=55;s.camera.updateProjectionMatrix();s.camera.position.set(...pos);s.camera.lookAt(...target);s.camera.updateMatrixWorld();};
   const callbacks=s.internal.subscribers.map(sub=>[sub.ref,sub.ref.current]);
   for(const[ref,fn]of callbacks)ref.current=(...args)=>{pose();const result=fn(...args);pose();return result;};
   s.gl.render=()=>{};try{for(let i=0;i<90;i++){q.clock=Math.max(q.clock,s.clock.elapsedTime)+1/60;s.advance(q.clock,false);}}finally{for(const[ref,fn]of callbacks)ref.current=fn;s.gl.render=q.render;}
   pose();s.scene.traverse(o=>{for(const m of[o.material].flat().filter(Boolean))if(m.uniforms?.uTime)m.uniforms.uTime.value=4;});
   q.render(s.scene,s.camera);s.gl.getContext().finish();
   const times=[];for(let i=0;i<12;i++){const t=performance.now();q.render(s.scene,s.camera);s.gl.getContext().finish();times.push(performance.now()-t);}
   const geos=new Set(),tex=new Set(),mats=new Set();let geometryBytes=0,textureBytes=0;
   s.scene.traverse(o=>{if(o.geometry&&!geos.has(o.geometry)){geos.add(o.geometry);for(const a of Object.values(o.geometry.attributes))geometryBytes+=a.array.byteLength;geometryBytes+=o.geometry.index?.array.byteLength||0;}for(const m of[o.material].flat().filter(Boolean)){mats.add(m);for(const t of[...Object.values(m),...(m.userData.textureResources||[]),...Object.values(m.uniforms||{}).map(u=>u.value)])if(t?.isTexture&&!tex.has(t)){tex.add(t);textureBytes+=(t.image?.width||0)*(t.image?.height||0)*4*4/3;}}});
   const batches=[];s.scene.traverse(o=>{if(o.isInstancedMesh&&o.count)batches.push({geometry:o.geometry.name,count:o.count});});
   return{position:pos,target,fov:55,batches,stats:window.__WORLD_RENDER__.stats(),frameFinishMs:times,geometryBytes,textureBytes,geometries:geos.size,textures:tex.size,materials:mats.size,renderer:{toneMapping:s.gl.toneMapping,exposure:s.gl.toneMappingExposure,outputColorSpace:s.gl.outputColorSpace}};
  },{position,target});
  sample.views.push({name,...detail});await page.screenshot({path:`${out}/${quality}-${name}.jpg`,type:'jpeg',quality:93});console.log('CAPTURE',quality,name,JSON.stringify(detail.stats));
 }
 report.qualities.push(sample);
}assert.deepEqual(report.errors,[]);report.result='PASS';}
catch(e){report.result='FAIL';report.failure=e.stack;throw e;}
finally{await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.httpServer.close(r));}
