/** CPU-only reproducible benchmark; deliberately does not claim rendering/device FPS. */
import {mkdir,writeFile} from 'node:fs/promises';import * as T from 'three';
import {mainCourse} from '../src/game/challenge/mainCourse.ts';import {heightAt} from '../src/game/challenge/surface.ts';
import {CameraEnvelope} from '../src/game/cameraEnvelope.ts';import {createPose,sampleTraversalPose} from '../src/game/locomotionPose.ts';
const scene=new T.Scene(),mesh=new T.Mesh();mesh.userData.cameraPieces=mainCourse().pieces;scene.add(mesh);
const envelope=new CameraEnvelope(),target=new T.Vector3(),desired=new T.Vector3(),cost=[],poseCost=[],poses=Array.from({length:8},createPose),motion={speed:1.65,running:false,distance:0,state:'crawl'};
for(let i=0;i<600;i++){
 const z=-50+i/10,targetHeight=heightAt(-27,z)+1.2;target.set(-27,targetHeight,z);desired.set(-27,targetHeight+2,z-6);
 let start=performance.now();envelope.resolve(scene,target,desired,heightAt,1/60);if(i>60)cost.push(performance.now()-start);
 start=performance.now();for(let n=0;n<8;n++){motion.distance=i*.0275+n*.1;motion.state=['crawl','balance','climb'][n%3];sampleTraversalPose(poses[n],motion);}if(i>60)poseCost.push(performance.now()-start);
}
const summarize=a=>{a.sort((x,y)=>x-y);return {samples:a.length,meanMs:a.reduce((x,y)=>x+y,0)/a.length,p95Ms:a[Math.floor(a.length*.95)],maxMs:a.at(-1)};};
const report={method:'Local Node CPU-only: 600 frames, full authored course collision primitives, eight traversal poses/frame; excludes WebGL, DOM and device frame rate.',node:process.version,platform:process.platform,pieces:mesh.userData.cameraPieces.length,camera:summarize(cost),eightPoseUpdates:summarize(poseCost)};
await mkdir('../../docs/third-person-foundation/evidence',{recursive:true});await writeFile('../../docs/third-person-foundation/evidence/cpu-only-benchmark.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
mesh.geometry.dispose();mesh.material.dispose();envelope.clear();
