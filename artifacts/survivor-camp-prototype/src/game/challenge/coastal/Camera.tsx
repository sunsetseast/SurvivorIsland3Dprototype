import {useMemo} from 'react';import {useFrame} from '@react-three/fiber';import * as T from 'three';import {coastal} from './session';import {heightAt} from '../surface';
export function CoastalCamera(){const v=useMemo(()=>({goal:new T.Vector3(),look:new T.Vector3(),rotation:new T.Quaternion(),matrix:new T.Matrix4(),up:new T.Vector3(0,1,0)}),[]);
 useFrame(({camera},dt)=>{const e=coastal.engine;if(!coastal.ownsControls||!e)return;const s=e.state,r=s.heat===0?e.player:s.runners.find(r=>r.heat===s.heat&&r.stage!=='finished')??s.runners.find(r=>r.heat===s.heat)!;
 const intro=['introduction','tutorial','countdown'].includes(s.phase),puzzle=r.stage==='puzzle'||s.phase==='results',h=heightAt(r.x,r.z);
 if(intro){v.goal.set(-39,h+12,-26);v.look.set(-20,h+1,-10);}else if(puzzle){v.goal.set(r.x-5,h+4.2,12);v.look.set(r.x,h+1.8,19.2);}else{v.goal.set(r.x-5,h+r.lift+4.8,r.z-8);v.look.set(r.x,h+r.lift+1,r.z+2);}
 const k=1-Math.exp(-Math.min(dt,.05)*4);camera.position.lerp(v.goal,k);v.matrix.lookAt(camera.position,v.look,v.up);v.rotation.setFromRotationMatrix(v.matrix);camera.quaternion.slerp(v.rotation,k);
 },1);return null;}
