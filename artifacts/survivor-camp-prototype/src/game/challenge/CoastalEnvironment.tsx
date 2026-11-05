import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as T from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import botanicalUrl from "../../assets/tonsai/botanical.glb?url";
import leafUrl from "../../assets/tonsai/leaf-sprays.png?url";
import { KARSTS, TREES } from "./environmentLayout";
import { ARRIVAL_STAGING, ARRIVAL_HOST, shoreX } from "./layout";
import { heightAt } from "./surface";
import { Assembly, beam, box, sphere, WOOD, CUT, ROPE, TEAL, type Piece } from "./meshKit";

function Limestone({low}:{low:boolean}) {
  const g=useMemo(()=>{
    const positions:number[]=[],colors:number[]=[],indices:number[]=[],c=new T.Color();
    const sides=low?20:32,levels=low?15:25;
    for(const k of KARSTS) {
      const offset=positions.length/3;
      for(let j=0;j<=levels;j++)for(let i=0;i<=sides;i++) {
        const t=j/levels,a=i/sides*Math.PI*2;
        const waist=0.84+0.09*Math.sin(t*9+k.seed)+0.06*Math.sin(t*28+k.seed*3);
        const crown=t>0.83?Math.max(0.09,1-(t-0.83)*4.7):1;
        const scallop=0.86+0.08*Math.sin(a*5+k.seed)+0.06*Math.sin(a*9+t*7);
        const radial=waist*crown*scallop;
        const y=heightAt(k.x,k.z)-0.6+t*k.h*(0.95+0.035*Math.sin(a*3+k.seed));
        positions.push(k.x+Math.cos(a)*k.rx*radial,y,k.z+Math.sin(a)*k.rz*radial);
        c.set("#aaa793").lerp(new T.Color("#756f5b"),0.18+0.27*Math.sin(t*34+k.seed)**2);
        if(t<0.13)c.multiplyScalar(0.66+t*1.6);
        if(t>0.75 && Math.sin(a*7+k.seed)>0.1)c.lerp(new T.Color("#48634a"),0.65);
        colors.push(c.r,c.g,c.b);
        if(j<levels&&i<sides){const n=offset+j*(sides+1)+i;indices.push(n,n+sides+1,n+1,n+1,n+sides+1,n+sides+2);}
      }
    }
    const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(positions,3));g.setAttribute("color",new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
  },[low]);
  useEffect(()=>()=>g.dispose(),[g]);
  return <mesh name="challenge-krabi-karsts" geometry={g} userData={{cameraBlocker:true}}><meshStandardMaterial vertexColors roughness={0.98} side={T.DoubleSide}/></mesh>;
}

function BotanicalInstances({geometry,material,plants}:{geometry:T.BufferGeometry;material:T.Material;plants:typeof TREES}) {
  const ref=useRef<T.InstancedMesh>(null);
  useEffect(()=>{
    const m=ref.current;if(!m)return;
    const o=new T.Object3D();plants.forEach((p,i)=>{o.position.set(p.x,heightAt(p.x,p.z)-0.08,p.z);o.rotation.y=p.turn;o.scale.setScalar(p.scale);o.updateMatrix();m.setMatrixAt(i,o.matrix);});
    m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();
    return ()=>m.dispose();
  },[geometry,material,plants]);
  return <instancedMesh ref={ref} args={[geometry,material,plants.length]} dispose={null} frustumCulled/>;
}
function disposeAsset(group:T.Group) {
  group.traverse(o=>{const m=o as T.Mesh;if(!m.isMesh)return;m.geometry.dispose();for(const mat of [m.material].flat()){for(const v of Object.values(mat))if(v instanceof T.Texture)v.dispose();mat.dispose();}});
}
function FallbackForest({low}:{low:boolean}) {
  const pieces=useMemo(()=>TREES.flatMap(p=>{const y=heightAt(p.x,p.z),h=10*p.scale;return [beam([p.x,y,p.z],[p.x+0.5,y+h,p.z],0.23*p.scale,WOOD),sphere([p.x+0.5,y+h,p.z],[3*p.scale,2*p.scale,3*p.scale],"#55784b")];}),[]);
  return <group name="challenge-botany-fallback"><Assembly pieces={pieces} low={low} name="challenge-fallback-trees"/></group>;
}
function CoastalForest({low}:{low:boolean}) {
  const [kit,setKit]=useState<T.Group|null>(null);
  const resources=useMemo(()=>{
    const leaf=new T.MeshStandardMaterial({color:"#819b60",vertexColors:true,roughness:0.95,side:T.DoubleSide,alphaTest:0.42});
    const wood=new T.MeshStandardMaterial({color:"#80705a",vertexColors:true,roughness:1});
    return {leaf,wood};
  },[]);
  useEffect(()=>{
    let active=true,owned:T.Group|undefined,texture:T.Texture|undefined;
    new GLTFLoader().load(botanicalUrl,({scene})=>{owned=scene;if(active)setKit(scene);else disposeAsset(scene);},undefined,()=>{});
    new T.TextureLoader().load(leafUrl,t=>{texture=t;if(!active){t.dispose();return;}t.colorSpace=T.SRGBColorSpace;resources.leaf.map=t;resources.leaf.needsUpdate=true;},undefined,()=>{});
    return ()=>{active=false;texture?.dispose();if(owned)disposeAsset(owned);resources.leaf.dispose();resources.wood.dispose();};
  },[resources]);
  const palms=useMemo(()=>TREES.filter(p=>p.kind==="palm"),[]),broad=useMemo(()=>TREES.filter(p=>p.kind==="canopy"),[]);
  if(!kit)return <FallbackForest low={low}/>;
  return <group name="challenge-botany-ready">{(["palm","canopy"] as const).flatMap(kind=>(["wood","leaves"] as const).map(part=>{
    const source=kit.getObjectByName(`${kind}-0-${low?"far":"near"}-${part}`) as T.Mesh|undefined;
    return source?<BotanicalInstances key={`${kind}-${part}-${low}`} geometry={source.geometry} material={part==="wood"?resources.wood:resources.leaf} plants={kind==="palm"?palms:broad}/>:null;
  }))}</group>;
}
function Water() {
  const material=useMemo(()=>new T.ShaderMaterial({
    uniforms:{time:{value:0}},
    vertexShader:`varying vec3 world;void main(){world=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}`,
    fragmentShader:`varying vec3 world;uniform float time;void main(){float edge=-61.+.0013*world.z*world.z+2.5*sin(world.z*.045);float depth=clamp((edge-world.x)/58.,0.,1.);float ripple=sin(world.x*1.1+world.z*.6+time*.8)*sin(world.z*.9-world.x*.3-time*.5);vec3 color=mix(vec3(.18,.55,.48),vec3(.055,.26,.36),depth);color+=vec3(.035,.045,.045)*ripple;float foam=(1.-smoothstep(0.,2.4,abs(edge-world.x+sin(time*.5+world.z*.15)*.5)))*.43;color=mix(color,vec3(.75,.85,.76),foam);gl_FragColor=vec4(color,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>}`,
  }),[]);
  useEffect(()=>()=>material.dispose(),[material]);
  useFrame(({clock})=>{material.uniforms.time!.value=clock.elapsedTime;});
  return <mesh name="challenge-andaman-water" rotation-x={-Math.PI/2} position={[-190,-0.01,0]} material={material}><planeGeometry args={[420,800]}/></mesh>;
}
export function CoastalEnvironment({low}:{low:boolean}) {
  const details=useMemo(()=>{
    const p:Piece[]=[];
    for(const s of ARRIVAL_STAGING)p.push(box([s.x,heightAt(s.x,s.z)+0.018,s.z],[1.1,0.035,1.1],"#ad9b6a"));
    const h=ARRIVAL_HOST;p.push(box([h.x,heightAt(h.x,h.z)+0.04,h.z],[2.6,0.08,1.8],CUT));
    // Small waiting benches face the open arrival space, with embedded legs.
    for(const x of [7,28]){const y=heightAt(x,-58);p.push(box([x,y+0.45,-58],[0.7,0.14,5],WOOD));for(const z of [-59.6,-56.4])p.push(beam([x,y-0.1,z],[x,y+0.43,z],0.11,WOOD));}
    for(let i=0;i<24;i++){const z=-85+i*7.1,x=shoreX(z)+7.2,y=heightAt(x,z);p.push(beam([x,y+0.06,z],[x+1.1,y+0.13,z+0.4],0.07,"#8b8064"));if(i%3===0)p.push(sphere([x+0.6,y+0.13,z+0.6],[0.17,0.12,0.22],"#aaa28a"));}
    // Visible shoreline safety markers; walking is limited to supported dry sand.
    for(const z of [-51,-25,1,27]){const x=shoreX(z)+5.4,y=heightAt(x,z);p.push(beam([x,y-0.1,z],[x,y+0.9,z],0.055,WOOD),box([x,y+0.75,z],[0.12,0.28,0.32],TEAL));}
    return p;
  },[]);
  return <><Limestone low={low}/><Water/><CoastalForest low={low}/><Assembly pieces={details} low={low} name="challenge-arrival-and-coastal-detail"/></>;
}
