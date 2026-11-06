/** Read-only baseline worktree benchmark; no deployment or hosted tooling. */
import {createServer} from 'vite';import {chromium} from 'playwright';import {writeFile,mkdir} from 'node:fs/promises';import path from 'node:path';
const root=process.env.BASELINE_ROOT;if(!root)throw Error('Set BASELINE_ROOT to a clean PR #25/main worktree');process.env.PORT='5230';process.env.BASE_PATH='/';
const app=path.join(root,'artifacts/survivor-camp-prototype'),server=await createServer({root:app,configFile:path.join(app,'vite.config.ts'),server:{host:'127.0.0.1',hmr:false,watch:null,fs:{allow:[root,path.resolve('../..')]}}});await server.listen();
const b=await chromium.launch({executablePath:process.env.CAMP_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--single-process','--no-zygote']});const page=await b.newPage({viewport:{width:932,height:430},hasTouch:true,isMobile:true,deviceScaleFactor:1});page.setDefaultTimeout(90000);
const report={source:'9b20b6da29feb0f8d23e1170bb3ae9bb4149d9e3',browser:b.version(),method:'Actual software WebGL from clean base worktree; same player-start camera framing as Coastal active sample, static Main Beach preview with existing staged roster. Not physical device FPS or a paired animation benchmark.',samples:[]};
try{
 await page.goto('http://127.0.0.1:5230/?quality=low');await page.getByTestId('challenge-testing').tap();await page.getByTestId('hub-beach-obstacle').tap();await page.waitForFunction(()=>window.__CHALLENGE__&&window.__WORLD_RENDER__?.scene.getObjectByName('challenge-botany-ready'));await page.waitForLoadState('networkidle');
 for(const quality of ['low','high']){
  if(quality==='high')await page.getByTestId('challenge-quality').tap();await page.waitForTimeout(500);
  await page.evaluate(()=>{const w=window.__WORLD_RENDER__,s=w.state,h=window.__CHALLENGE__.surface.height(-27,-50);s.setFrameloop('never');s.clock.stop();s.clock.autoStart=false;window.__CHALLENGE__.inspect({position:[-32,h+4.8,-58],target:[-23.5,h+1,-48]});for(let i=0;i<90;i++)s.advance(s.clock.elapsedTime+1/60,false);});
  report.samples.push(await page.evaluate(()=>({...window.__CHALLENGE__.stats(),ownership:window.__WORLD_RENDER__.stats().trackedResources,activeScenes:window.__WORLD_RENDER__.lifecycle.active})));console.log('Baseline',report.samples.at(-1));
 }
 await mkdir('../../docs/coastal-traverse/evidence',{recursive:true});await writeFile('../../docs/coastal-traverse/evidence/baseline-report.json',JSON.stringify(report,null,2));
}finally{await b.close();await server.close();}
