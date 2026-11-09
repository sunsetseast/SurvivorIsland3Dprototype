import { createDrive, courseAxes, cancelDrive } from "../locomotion";
import {coastal} from "./coastal/session";
import {CoastalRoster} from "./coastal/Roster";
import {MosaicBoards} from "./coastal/Boards";
import {CoastalCamera} from "./coastal/Camera";
import {CoastalHud} from "./coastal/Hud";
import {traits} from "./coastal/engine";
import { challengeGroundMaterial } from "./groundMaterial";
import { CONFIGURATIONS, isChallengeId, validateSetup, type ChallengeId } from "./configurations";
import { PREVIEW_EVENT, SELECTED_EVENT, rehearsalActive, requestPreview } from "./preview";
import { challengeRehearsalEnabled, challengeTestingEnabled } from "./development";
import { RehearsalRoster } from "./RehearsalRoster";
import type { ChallengeSetup } from "./equipment";
import { Assembly } from "./meshKit";
import { InlandEnvironment } from "./InlandEnvironment";
import { trailDistance } from "./environmentLayout";
import { CoastalEnvironment } from "./CoastalEnvironment";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import * as T from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Player, type ExplorationWorld } from "../Player";
import { TropicalSky } from "../environment/TropicalSky";
import { ATMOSPHERES } from "../environment/atmosphere";
import { TrailMarker } from "../locations/TrailMarker";
import { validateSpawn } from "../locations/spawn";
import type { Pose } from "../locations/registry";
import { ARRIVAL, RETURN_EXIT, ZONES } from "./layout";
import { heightAt, moveOnTerrain, shoreX, walkable, walkableWithEquipment, zoneAt } from "./surface";
import { Joystick, RunButton, OrbitZone, TouchButton } from "../Hud";
import { clearInput, dbg, input } from "../state";
import { StillwaterStations } from "./stillwater/Stations";
import { StillwaterRoster } from "./stillwater/Roster";
import { StillwaterHud } from "./stillwater/Hud";
import { stillwater } from "./stillwater/session";
import { rehearsalAbility } from "./stillwater/engine";
import { camp } from "../CampRuntime";
import { castMember, PLAYER_SLOT } from "../character/cast";
import { Survivor } from "../Survivor";
import { StillwaterCamera } from "./stillwater/Camera";
import { worldTravel } from "../locations/travel";

const WORLD: ExplorationWorld = { locationId: "challenge_main", spawn: ARRIVAL, yaw: ARRIVAL.yaw, height: heightAt, move: moveOnTerrain, location: zoneAt };
function Ground({ low }: { low: boolean }) {
  const material=useMemo(challengeGroundMaterial,[]);
  useEffect(()=>()=>material.dispose(),[material]);
  const geometry = useMemo(() => {
    const g = new T.PlaneGeometry(240, 260, low ? 64 : 96, low ? 70 : 104);
    g.rotateX(-Math.PI / 2);
    const p = g.getAttribute("position"), colors: number[] = [];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), d = x - shoreX(z);
      p.setY(i, heightAt(x, z));
      const t = T.MathUtils.smoothstep(d, 58, 95);
      const c = new T.Color(d < 9 ? "#b4ad81" : "#e4cc96").lerp(new T.Color("#697347"), t);
      const clearing = Math.max(...["jungle", "individual"].map(id => { const q=ZONES[id as "jungle"|"individual"].center;return 1-T.MathUtils.smoothstep(Math.hypot(x-q.x,z-q.z),18,25); }));
      c.lerp(new T.Color("#a99a6b"),clearing*0.85*t);
      c.lerp(new T.Color("#b7a67a"),(1-T.MathUtils.smoothstep(trailDistance(x,z),1.6,3.6))*t);
      c.multiplyScalar(0.96 + 0.05 * Math.sin(x * 1.3 + z * 1.9));
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [low]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh name="challenge-ground-ready" geometry={geometry} material={material} receiveShadow/>;
}
function challengeCast() {
  const selected = castMember(worldTravel.session.participant.survivorId)?.source;
  const opponents = camp.npcs.slice(0, 7).map(({ id }) => {
    const attributes = castMember(id)!.source;
    return { id, name: attributes.firstName, attributes };
  });
  return selected
    ? [{ id: PLAYER_SLOT, name: `${selected.firstName} (You)`, attributes: selected }, ...opponents]
    : opponents;
}
export function ChallengeScene({ low, arrival, initialConfiguration="beach-obstacle" }: { low: boolean; arrival?: Pose; initialConfiguration?:ChallengeId }) {
  useSyncExternalStore(stillwater.subscribe,()=>stillwater.ownsControls);
  useSyncExternalStore(coastal.subscribe,coastal.snapshot);
  const [model,setModel]=useState<ChallengeSetup|null>(()=>validateSetup(CONFIGURATIONS[initialConfiguration].build()));
  const [switching,setSwitching]=useState(false);
  const selected=useRef<ChallengeSetup|null>(model),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const inspection=useRef<{position:[number,number,number];target:[number,number,number]}|null>(null);
  const {scene,camera,gl}=useThree();
  const hostMotion=useRef({speed:0,running:false,distance:0,talking:true});
  const autoStarted=useRef<string|null>(null);
  const raceDrive=useRef(createDrive(Math.PI));
  const coastalReturn=useRef<Pose|null>(null);
  selected.current=model;
  const environment=useMemo(()=>({...WORLD,cameraLocked:()=>!!inspection.current||stillwater.ownsControls||coastal.ownsControls,controlsLocked:()=>switching||!!inspection.current||stillwater.ownsControls||coastal.ownsControls,
    move:(p:{x:number;z:number},dx:number,dz:number)=>moveOnTerrain(p,dx,dz,model?.solids??[])}),[model,switching]);
  useEffect(()=>{
    return stillwater.configure({
      admit:()=>rehearsalActive()&&selected.current?.id==="individual-balance",
      roster: () => challengeCast().map(({ id, name, attributes }) => ({ id, name, ability: rehearsalAbility(attributes) })),
      capture:()=>{inspection.current=null;return {x:dbg.x,z:dbg.z,yaw:input.yaw,pitch:input.pitch,facing:dbg.face};},
      restore:p=>{dbg.teleportRequested={x:p.x,z:p.z};input.yaw=p.yaw;input.pitch=p.pitch;},
      release:clearInput,
    });
  },[]);
  useEffect(()=>coastal.configure({
    admit:()=>rehearsalActive()&&selected.current?.id==="beach-obstacle",
    roster: () => challengeCast().map(({ id, name, attributes }) => ({ id, name, ...traits(attributes) })),
    capture:()=>{const pose={x:dbg.x,z:dbg.z,yaw:input.yaw,pitch:input.pitch,facing:dbg.face};input.yaw=Math.PI;input.pitch=.34;cancelDrive(raceDrive.current);return pose;},
    restore:p=>{coastalReturn.current={...p};dbg.teleportRequested={x:p.x,z:p.z};input.yaw=p.yaw;input.pitch=p.pitch;},release:clearInput,
  }),[]);
  useEffect(()=>{
   const down=(e:KeyboardEvent)=>{if(!coastal.ownsControls)return;const k=e.key.toLowerCase();if(k===' '&&e.target instanceof Element&&e.target.closest('button,input,select,textarea'))return;if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','q','e','escape'].includes(k)){e.preventDefault();coastal.keys.add(k);if(!e.repeat){if(k===' ')coastal.action();if(k==='q')coastal.grip(0);if(k==='e')coastal.grip(1);if(k==='escape')coastal.pause();}}},up=(e:KeyboardEvent)=>coastal.keys.delete(e.key.toLowerCase()),reset=()=>{coastal.keys.clear();cancelDrive(raceDrive.current);};
   window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('survivor-input-clear',reset);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('survivor-input-clear',reset);};
  },[]);
  useEffect(()=>{
    const blur=()=>{if(stillwater.ownsControls)stillwater.pause();if(coastal.ownsControls)coastal.pause();},hidden=()=>{if(document.hidden)blur();};
    window.addEventListener("blur",blur);document.addEventListener("visibilitychange",hidden);
    return()=>{window.removeEventListener("blur",blur);document.removeEventListener("visibilitychange",hidden);};
  },[]);
  useEffect(()=>{
    const select=(event:Event)=>{
      const id=(event as CustomEvent).detail;
      if(!rehearsalActive()||!isChallengeId(id)||id===selected.current?.id)return;
      stillwater.exit();stillwater.proximity(false);coastal.exit();coastal.near=false;
      const next=validateSetup(CONFIGURATIONS[id].build());
      clearTimeout(timer.current);clearInput();inspection.current=null;setSwitching(true);setModel(null);
      // The old subtree unmounts and its explicit geometry/material disposals run before the next activation.
      timer.current=setTimeout(()=>{
        if(!rehearsalActive())return;
        dbg.teleportRequested={...next.view};input.yaw=next.view.yaw;input.pitch=.3;
        setModel(next);setSwitching(false);
      },120);
    };
    window.addEventListener(PREVIEW_EVENT,select);
    return ()=>{window.removeEventListener(PREVIEW_EVENT,select);clearTimeout(timer.current);clearInput();};
  },[]);
  useEffect(()=>{
    if(model)window.dispatchEvent(new CustomEvent(SELECTED_EVENT,{detail:model.id}));
  },[model]);
  useEffect(()=>{
    if(!challengeRehearsalEnabled()&&!challengeTestingEnabled())return;
    const w=window as any;
    w.__CHALLENGE__={
      get drive(){return raceDrive.current;},
      get configuration(){return selected.current?.id??null;},
      get setup(){return selected.current;},
      select:requestPreview,
      arrival:()=>{if(rehearsalActive()){inspection.current=null;dbg.teleportRequested={...ARRIVAL};input.yaw=ARRIVAL.yaw;input.pitch=.3;}},
      inspect:(p:typeof inspection.current)=>{if(rehearsalActive()){clearInput();inspection.current=p;}},
      stillwater, coastal,
      surface:{height:heightAt,walkable:(x:number,z:number)=>walkableWithEquipment(x,z,selected.current?.solids??[]),move:(p:{x:number;z:number},dx:number,dz:number)=>moveOnTerrain(p,dx,dz,selected.current?.solids??[])},
      stats:()=>{const geometries=new Set<T.BufferGeometry>();scene.traverse(o=>{if((o as T.Mesh).geometry)geometries.add((o as T.Mesh).geometry);});let bytes=0;for(const g of geometries){for(const a of Object.values(g.attributes)){const data=(a as T.InterleavedBufferAttribute).isInterleavedBufferAttribute?(a as T.InterleavedBufferAttribute).data.array:(a as T.BufferAttribute).array;bytes+=data.byteLength;}if(g.index)bytes+=g.index.array.byteLength;}
        return {quality:low?"low":"high",configuration:selected.current?.id,calls:gl.info.render.calls,triangles:gl.info.render.triangles,geometries:gl.info.memory.geometries,textures:gl.info.memory.textures,activeGeometryBytes:bytes,programs:gl.info.programs?.length};},
    };
    return ()=>{delete w.__CHALLENGE__;};
  },[scene,camera,gl,low]);
  useFrame((_,dt)=>{
    const m=selected.current;
    const near=m?.id==="individual-balance"&&rehearsalActive()&&Math.min(...[m.view,...m.starts].map(p=>Math.hypot(dbg.x-p.x,dbg.z-p.z)))<5;
    const coastNear=m?.id==="beach-obstacle"&&rehearsalActive();if(coastal.near!==coastNear){coastal.near=!!coastNear;coastal.notify();}
    const keys=coastal.keys;
    if(!coastal.ownsControls||coastal.engine?.state.phase!=='racing')cancelDrive(raceDrive.current);
    const axes=courseAxes(raceDrive.current,input.joyX+Number(keys.has("d")||keys.has("arrowright"))-Number(keys.has("a")||keys.has("arrowleft")),input.joyY+Number(keys.has("w")||keys.has("arrowup"))-Number(keys.has("s")||keys.has("arrowdown")),input.yaw,dt,input.joyEpoch);
    // Balance corrections stay in the beam frame so inspection never reverses them.
    coastal.engine?.axis(coastal.engine.player.stage==='beam'?-input.joyX-Number(keys.has('d')||keys.has('arrowright'))+Number(keys.has('a')||keys.has('arrowleft')):axes.x,axes.forward);
    if(!document.hidden)coastal.advance(Math.min(dt,.1));
    stillwater.proximity(!!near);if(!document.hidden)stillwater.advance(Math.min(dt,.1));
    const request=worldTravel.challengeTesting;
    if(request?.play && request.configuration===m?.id && autoStarted.current!==request.eventId && rehearsalActive() && (m.id==="beach-obstacle"?coastal.start():stillwater.start()))autoStarted.current=request.eventId;
  },-.5);
  useFrame(()=>{if(inspection.current){camera.position.set(...inspection.current.position);camera.lookAt(...inspection.current.target);}},1);
  useFrame(()=>gl.render(scene,camera),2);
  const spawn = useMemo(() => validateSpawn(arrival ?? ARRIVAL, { height: heightAt, walkable }), [arrival]);
  return <>
    <color attach="background" args={["#8fc3d7"]} />
    <fog attach="fog" args={["#adcbd0", 170, 700]} />
    <TropicalSky atmosphere={ATMOSPHERES.midday} />
    <hemisphereLight args={["#c7e3ed", "#77775b", 1.35]} />
    <directionalLight position={[-80, 110, -65]} intensity={2.8} color="#fff0d5" />
    <group name="challenge-beach-world">
      <Ground low={low} />
      <CoastalEnvironment low={low} />
      <InlandEnvironment low={low} />
      <TrailMarker connectionId="challenge_to_camp" height={heightAt} />
      {model && <group key={model.id} name="challenge-active-configuration"><Assembly pieces={model.pieces} low={low} name={`challenge-equipment-${model.id}`} blocker/>{model.id==="individual-balance"&&<><StillwaterStations low={low} engine={()=>stillwater.ownsControls?stillwater.engine:null}/><group name="stillwater-original-host" position={[model.host.x,heightAt(model.host.x,model.host.z),model.host.z]} rotation={[0,Math.PI/2,0]} scale={1.06}><Survivor motion={hostMotion}/></group></>}{model.id==="beach-obstacle"&&<group name="coastal-original-host" position={[model.host.x,heightAt(model.host.x,model.host.z),model.host.z]} rotation={[0,Math.PI/2,0]}><Survivor motion={hostMotion}/></group>}{coastal.ownsControls&&coastal.engine?<><CoastalRoster key={coastal.engine.seed} engine={coastal.engine}/><MosaicBoards key={`board-${coastal.engine.seed}`} engine={coastal.engine}/></>:stillwater.ownsControls&&stillwater.engine?<StillwaterRoster engine={()=>stillwater.engine} roster={stillwater.engine.state.competitors}/>:<RehearsalRoster model={model}/>}</group>}
      {!coastal.ownsControls&&<group visible={!stillwater.ownsControls}><Player environment={environment} arrival={coastalReturn.current??spawn} /></group>}
      <StillwaterCamera/><CoastalCamera/>
    </group>
  </>;
}
export function ChallengeHud({ low, setLow, onMenu, initialConfiguration="beach-obstacle",onHub,onWelcome }: { low: boolean; setLow: (v: boolean) => void; onMenu: () => void; initialConfiguration?:ChallengeId;onHub?:()=>void;onWelcome?:()=>void }) {
  useSyncExternalStore(stillwater.subscribe,()=>stillwater.ownsControls);
  useSyncExternalStore(coastal.subscribe,coastal.snapshot);
  const [selected,setSelected]=useState<ChallengeId>(initialConfiguration);
  useEffect(()=>{const f=(e:Event)=>{const id=(e as CustomEvent).detail;if(isChallengeId(id))setSelected(id);};window.addEventListener(SELECTED_EVENT,f);return ()=>{window.removeEventListener(SELECTED_EVENT,f);clearInput();};},[]);
  return <div className="island-hud">
    {!stillwater.ownsControls&&!coastal.ownsControls&&<><OrbitZone allowLookUp />
    <div className="island-toolbar">
      {onHub?<><TouchButton data-testid="testing-hub" onActivate={onHub}>Challenge Hub</TouchButton><TouchButton data-testid="testing-welcome" onActivate={()=>onWelcome?.()}>Welcome screen</TouchButton></>:<TouchButton data-testid="challenge-menu" onActivate={()=>{stillwater.exit();onMenu();}}>Menu</TouchButton>}
      {!onHub&&challengeRehearsalEnabled() && <>
        <label style={{pointerEvents:"auto",background:"#263f36",color:"#fff5da",padding:"7px",borderRadius:"8px"}}>Preview <select data-testid="challenge-selector" value={selected} onChange={e=>requestPreview(e.target.value as ChallengeId)} style={{maxWidth:"220px",color:"#172d27",background:"#f1e2ba",border:0,borderRadius:"4px",fontSize:"14px"}}>{Object.entries(CONFIGURATIONS).map(([id,c])=><option key={id} value={id}>{c.name}</option>)}</select></label>
        <TouchButton data-testid="challenge-staging" onActivate={()=>{if(rehearsalActive()){clearInput();dbg.teleportRequested={...RETURN_EXIT};input.yaw=RETURN_EXIT.yaw;input.pitch=.3;}}}>Return staging</TouchButton>
      </>}
      <TouchButton data-testid="challenge-quality" onActivate={() => setLow(!low)}>{low ? "Quality: Low" : "Quality: High"}</TouchButton>
    </div>
    <div style={{ pointerEvents: "auto" }}><Joystick /><RunButton /></div></>}
    <StillwaterHud onHub={onHub} onWelcome={onWelcome}/><CoastalHud onHub={onHub} onWelcome={onWelcome} onExit={coastal.exit}/>
  </div>;
}
