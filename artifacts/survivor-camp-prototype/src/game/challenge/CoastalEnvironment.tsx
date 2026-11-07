import { limestoneMaterial } from "../railay/tonsai/rockMaterial";
import { Understory } from "./Understory";
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
  const material=useMemo(()=>{const m=limestoneMaterial();m.color.setRGB(1.35,1.33,1.25);return m;},[]);
  useEffect(()=>()=>material.dispose(),[material]);
  const g=useMemo(()=>{
    const positions:number[]=[],colors:number[]=[],indices:number[]=[],c=new T.Color();
    const sides=low?20:32,levels=low?15:25;
    for(const k of KARSTS) {
      const offset=positions.length/3;
      for(let j=0;j<=levels;j++)for(let i=0;i<=sides;i++) {
        const t=j/levels,a=i/sides*Math.PI*2;
        const profile=[.78,.58,.91,.95,.84,.88,.81,.75,.7];
        const q=t*(profile.length-1),lo=Math.min(profile.length-2,Math.floor(q)),mix=q-lo;
        const waist=profile[lo]!*(1-mix)+profile[lo+1]!*mix;
        // Predominantly vertical unequal ribs and angular shoulders, avoiding concentric balloon rings.
        const scallop=.88+.07*Math.sin(a*7+k.seed)+.05*Math.sin(a*13+k.seed*2)+.025*Math.sin(a*9+t*5);
        const radial=waist*scallop;
        const crest=.84+.025*Math.sin(a*3+k.seed)+.015*Math.sin(a*7+k.seed*2);
        const y=heightAt(k.x,k.z)-.6+t*k.h*crest;
        positions.push(k.x+Math.cos(a)*k.rx*radial,y,k.z+Math.sin(a)*k.rz*radial);
        c.set("#e6e3d6").multiplyScalar(.9+.07*Math.sin(a*11+k.seed+t*3));
        if(t<.1)c.multiplyScalar(.83);
        colors.push(c.r,c.g,c.b);
        if(j<levels&&i<sides){const n=offset+j*(sides+1)+i;indices.push(n,n+sides+1,n+1,n+1,n+sides+1,n+sides+2);}
      }
      const center=positions.length/3;positions.push(k.x,heightAt(k.x,k.z)-.6+k.h*.84,k.z);colors.push(.53,.62,.4);
      for(let i=0;i<sides;i++){const n=offset+levels*(sides+1)+i;indices.push(n,center,n+1);}
    }
    const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(positions,3));g.setAttribute("color",new T.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
  },[low]);
  useEffect(()=>()=>g.dispose(),[g]);
  return <mesh name="challenge-krabi-karsts" geometry={g} material={material} userData={{cameraBlocker:true}}/>;
}

function BotanicalInstances({geometry,material,plants}:{geometry:T.BufferGeometry;material:T.Material;plants:Array<(typeof TREES)[number]&{y?:number}>}) {
  const ref=useRef<T.InstancedMesh>(null);
  useEffect(()=>{
    const m=ref.current;if(!m)return;
    const o=new T.Object3D();plants.forEach((p,i)=>{o.position.set(p.x,p.y??heightAt(p.x,p.z)-0.08,p.z);o.rotation.y=p.turn;o.scale.setScalar(p.scale);o.updateMatrix();m.setMatrixAt(i,o.matrix);});
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
  const cameraCylinders=useMemo(()=>TREES.map(p=>({x:p.x,y:heightAt(p.x,p.z),z:p.z,r:.28*p.scale+.12,h:10*p.scale})),[]);
  const [kit,setKit]=useState<T.Group|null>(null);
  const resources=useMemo(()=>{
    const leaf=new T.MeshStandardMaterial({color:"#d5e2bb",vertexColors:true,roughness:0.95,side:T.DoubleSide,alphaTest:0.42});
    const wood=new T.MeshStandardMaterial({color:"#80705a",vertexColors:true,roughness:1});
    const plain=new T.MeshStandardMaterial({color:"#bbd29c",vertexColors:true,roughness:0.95,side:T.DoubleSide});
    return {leaf,wood,plain};
  },[]);
  useEffect(()=>{
    let active=true,owned:T.Group|undefined,texture:T.Texture|undefined;
    new GLTFLoader().load(botanicalUrl,({scene})=>{owned=scene;if(active)setKit(scene);else disposeAsset(scene);},undefined,()=>{});
    new T.TextureLoader().load(leafUrl,t=>{texture=t;if(!active){t.dispose();return;}t.colorSpace=T.SRGBColorSpace;resources.leaf.map=t;resources.leaf.needsUpdate=true;},undefined,()=>{});
    return ()=>{active=false;texture?.dispose();if(owned)disposeAsset(owned);resources.leaf.dispose();resources.wood.dispose();resources.plain.dispose();};
  },[resources]);
  const crowns=useMemo(()=>{
    if(!kit)return null;
    const source=kit.getObjectByName("canopy-1-far-leaves") as T.Mesh|undefined;if(!source)return null;
    const geometry=source.geometry.clone();geometry.computeBoundingBox();geometry.translate(0,-geometry.boundingBox!.min.y,0);
    const plants=KARSTS.flatMap(k=>Array.from({length:5},(_,i)=>{
      const a=i*2.4,r=i===0?0:.23,scallop=.88+.07*Math.sin(a*7+k.seed)+.05*Math.sin(a*13+k.seed*2)+.025*Math.sin(a*9+5);
      const crest=.84+.025*Math.sin(a*3+k.seed)+.015*Math.sin(a*7+k.seed*2),blend=r/(.7*scallop);
      return {x:k.x+Math.cos(a)*k.rx*r,z:k.z+Math.sin(a)*k.rz*r,y:heightAt(k.x,k.z)-.6+k.h*(.84+(crest-.84)*blend)-.3,scale:.55,turn:a,kind:"canopy"};
    }));return {geometry,plants};
  },[kit]);
  useEffect(()=>()=>crowns?.geometry.dispose(),[crowns]);
  const palms=useMemo(()=>TREES.filter(p=>p.kind==="palm"),[]),broad=useMemo(()=>TREES.filter(p=>p.kind==="canopy"),[]);
  if(!kit)return <group userData={{cameraCylinders}}><FallbackForest low={low}/></group>;
  return <group name="challenge-botany-ready" userData={{cameraCylinders}}>{crowns && <BotanicalInstances geometry={crowns.geometry} material={resources.leaf} plants={crowns.plants}/>} {(["palm","canopy"] as const).flatMap(kind=>[0,1,2].flatMap(variant=>(["wood","leaves"] as const).map(part=>{
    const source=kit.getObjectByName(`${kind}-${variant}-${low?"far":"near"}-${part}`) as T.Mesh|undefined;
    return source?<BotanicalInstances key={`${kind}-${variant}-${part}-${low}`} geometry={source.geometry} material={part==="wood"?resources.wood:kind==="canopy"?resources.leaf:resources.plain} plants={(kind==="palm"?palms:broad).filter((_,i)=>i%3===variant)}/>:null;
  })))}</group>;
}
function Water() {
  const material=useMemo(()=>new T.ShaderMaterial({
    uniforms:{time:{value:0}},
    vertexShader:`varying vec3 world;void main(){world=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}`,
    fragmentShader:`varying vec3 world;uniform float time;void main(){float edge=-61.+.0013*world.z*world.z+2.5*sin(world.z*.045);float depth=clamp((edge-world.x)/58.,0.,1.);float ripple=sin(world.x*.21+world.z*.13+time*.7+sin(world.z*.071)*.5)*.7+sin(world.x*.43-world.z*.17-time*.8+sin(world.x*.08))*.3;vec3 color=mix(vec3(.18,.55,.48),vec3(.055,.26,.36),depth);color+=vec3(.012,.02,.018)*ripple;color=mix(color,vec3(.47,.67,.72),smoothstep(100.,390.,edge-world.x));float foam=(1.-smoothstep(0.,2.4,abs(edge-world.x+sin(time*.5+world.z*.15)*.5)))*.43;color=mix(color,vec3(.75,.85,.76),foam);gl_FragColor=vec4(color,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>}`,
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
  return <><Limestone low={low}/><Water/><CoastalForest low={low}/><Understory/><Assembly pieces={details} low={low} name="challenge-arrival-and-coastal-detail"/></>;
}
