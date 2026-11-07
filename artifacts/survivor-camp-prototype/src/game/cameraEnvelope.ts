import * as T from 'three';
/** Cached marked meshes only; bounded local candidates, no scene-wide per-frame rays. */
export class CameraEnvelope {
 private age=10;
 private blockers:{mesh:T.Mesh;center:T.Vector3;radius:number}[]=[];
 private local:T.Object3D[]=[];
 private ray=new T.Raycaster();private direction=new T.Vector3();private probe=new T.Vector3();private offset=new T.Vector3();private hits:T.Intersection[]=[];
 resolve(scene:T.Scene,target:T.Vector3,desired:T.Vector3,height:(x:number,z:number)=>number,dt:number){
  this.age+=dt;
  if(this.age>1){this.age=0;this.blockers.length=0;scene.updateMatrixWorld();scene.traverse(o=>{const m=o as T.Mesh;if(!m.isMesh||!o.userData.cameraBlocker)return;m.geometry.computeBoundingSphere();const sphere=m.geometry.boundingSphere!;this.blockers.push({mesh:m,center:sphere.center.clone().applyMatrix4(m.matrixWorld),radius:sphere.radius*m.matrixWorld.getMaxScaleOnAxis()});});}
  this.direction.subVectors(desired,target);let safe=this.direction.length();this.direction.normalize();this.local.length=0;
  for(const b of this.blockers)if(b.center.distanceToSquared(target)<(safe+b.radius+.5)**2)this.local.push(b.mesh);
  for(let i=0;i<5;i++){
   const side=i===1?-.22:i===2?.22:0,up=i===3?.22:i===4?-.22:0;
   this.offset.set(this.direction.z*side,up,-this.direction.x*side);this.probe.copy(target).add(this.offset);this.ray.set(this.probe,this.direction);this.ray.far=safe+.35;this.hits.length=0;this.ray.intersectObjects(this.local,false,this.hits);
   if(this.hits.length)safe=Math.min(safe,Math.max(.65,this.hits[0]!.distance-.35));
  }
  for(let d=.65;d<=safe;d+=.25){this.probe.copy(target).addScaledVector(this.direction,d);if(this.probe.y<height(this.probe.x,this.probe.z)+.3){safe=Math.max(.65,d-.3);break;}}
  desired.copy(target).addScaledVector(this.direction,safe);desired.y=Math.max(desired.y,height(desired.x,desired.z)+.3);return safe;
 }
 clear(){this.blockers.length=this.local.length=0;this.age=10;}
}
