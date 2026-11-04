import * as T from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const geometryBytes = (g: T.BufferGeometry) => Object.values(g.attributes).reduce((sum,a) => sum+a.array.byteLength, g.index?.array.byteLength ?? 0);
function paint(g: T.BufferGeometry, hex: string) {
  const c=new T.Color(hex), p=g.getAttribute('position'), colors=new Float32Array(p.count*3);
  for(let i=0;i<p.count;i++) {
    const k=.94+.06*Math.sin(p.getX(i)*17+p.getZ(i)*11);
    colors.set([c.r*k,c.g*k,c.b*k],i*3);
  }
  g.setAttribute('color',new T.BufferAttribute(colors,3));
  return g;
}
function sleepingMats() {
  const parts:T.BufferGeometry[]=[];
  for(const [i,x] of [9,12,15].entries()) {
    const g=new T.PlaneGeometry(1.45,2.65,8,12);
    g.rotateX(-Math.PI/2);
    g.translate(x,1.825,-46.05+(i%2)*.18);
    const p=g.getAttribute('position');
    for(let k=0;k<p.count;k++) p.setY(k,p.getY(k)+.009*Math.sin(p.getX(k)*34)*Math.sin(p.getZ(k)*28));
    g.computeVertexNormals();
    parts.push(paint(g,['#968253','#aa9364','#84744f'][i]!));
    for(const side of [-1,1]) {
      parts.push(paint(new T.BoxGeometry(.028,.025,2.65).translate(x+side*.72,1.834,-46.05+(i%2)*.18),'#685b3f'));
      parts.push(paint(new T.BoxGeometry(1.45,.025,.028).translate(x,1.834,-46.05+(i%2)*.18+side*1.32),'#685b3f'));
    }
  }
  // A rolled spare palm mat next to the existing supply crate, off the ramp.
  const roll=new T.CylinderGeometry(.12,.12,1.05,8,1);
  roll.rotateZ(Math.PI/2); roll.translate(15.5,1.95,-42.25);
  parts.push(paint(roll,'#b09a68'));
  return parts;
}
/** One-time finishing of scene-owned decoded meshes. No new download, texture,
 * material, draw or per-frame geometry work. Never alter the physical deck. */
export function finishShelterMesh(mesh: T.Mesh) {
  if(!mesh.name.startsWith('shelter-') || mesh.geometry.userData.shelterFinished) return;
  const g=mesh.geometry, p=g.getAttribute('position'), c=g.getAttribute('color');
  if(mesh.name==='shelter-thatch') {
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      const edge=T.MathUtils.smoothstep(Math.max(Math.abs(x-12)/6,Math.abs(z+44)/5.4),.72,1);
      p.setXYZ(i,x+edge*.08*Math.sin(z*3.1),y+.055*Math.sin(x*2.1+z*.8)-edge*(.08+.06*Math.sin(x*4.7)),z+edge*.14*Math.sin(x*3.4));
    }
    g.computeVertexNormals();
  }
  if(mesh.name==='shelter-lashings') {
    // Turn the upper two existing wraps into crossed ties at each bamboo joint.
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      const cx=Math.abs(x-7.3)<Math.abs(x-16.7)?7.3:16.7;
      const cz=[-47.7,-44,-40.3].reduce((a,b)=>Math.abs(z-a)<Math.abs(z-b)?a:b);
      const top=3.72+(cz+48.6)*.195-.08;
      const cy=Math.abs(y-1.66)<Math.abs(y-top)?1.66:top;
      const ring=Math.round((y-cy)/.034);
      if(ring>=2) {
        const a=ring===2?.68:-.68,dx=x-cx,dy=y-(cy+ring*.034);
        p.setXY(i,cx+dx*Math.cos(a)-dy*Math.sin(a),cy+ring*.034+dx*Math.sin(a)+dy*Math.cos(a));
      }
    }
    g.computeVertexNormals();
  }
  if(c && mesh.name!=='shelter-deck') for(let i=0;i<c.count;i++) {
    const x=p.getX(i),z=p.getZ(i);
    const k=mesh.name==='shelter-lashings'?1.23:.93+.10*Math.sin(x*.83+z*.39)+.035*Math.sin(x*19+z*3);
    c.setXYZ(i,c.getX(i)*k,c.getY(i)*k,c.getZ(i)*k);
  }
  if(mesh.name==='shelter-supplies') {
    const additions=sleepingMats(), merged=mergeGeometries([g,...additions],false);
    if(!merged) throw Error('Shelter finishing attributes must match the decoded kit');
    merged.userData.shelterCompletionBytes=geometryBytes(merged)-geometryBytes(g);
    mesh.geometry=merged;
    g.dispose(); additions.forEach(part=>part.dispose());
  }
  mesh.geometry.userData.shelterFinished=true;
  mesh.geometry.computeBoundingBox(); mesh.geometry.computeBoundingSphere();
}
