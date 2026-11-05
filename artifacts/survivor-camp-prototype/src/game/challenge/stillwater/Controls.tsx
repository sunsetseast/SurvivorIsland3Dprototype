import { useEffect, useRef, useState } from "react";
import { BalanceInput } from "./input";
export function BalanceControls({ axis, place, pause }: { axis: (v:number)=>void; place:()=>void; pause:()=>void }) {
  const [value,setValue] = useState(0), [sensitivity,setSensitivity] = useState(1);
  const pad=useRef<HTMLDivElement>(null), button=useRef<HTMLButtonElement>(null);
  const callbacks=useRef({axis,place,pause}); callbacks.current={axis,place,pause};
  const [control] = useState(()=>new BalanceInput(v=>{callbacks.current.axis(v);setValue(v);},()=>callbacks.current.place()));
  control.sensitivity=sensitivity;
  useEffect(()=>{
    const release=()=>{for(const el of [pad.current,button.current])for(const id of [control.balancePointer,control.placementPointer])if(el && id!==null && el.hasPointerCapture(id))el.releasePointerCapture(id);control.reset();};
    const blur=()=>{release();callbacks.current.pause();};
    const hidden=()=>{if(document.hidden)blur();};
    const key=(e:KeyboardEvent)=>{if((e.target as HTMLElement)?.tagName==="INPUT")return;if(control.key(e.code,e.type==="keydown",e.repeat)){e.preventDefault();e.stopImmediatePropagation();}else if(e.code==="Escape"&&e.type==="keydown"){e.preventDefault();blur();}};
    window.addEventListener("keydown",key,true);window.addEventListener("keyup",key,true);window.addEventListener("blur",blur);document.addEventListener("visibilitychange",hidden);
    return ()=>{release();window.removeEventListener("keydown",key,true);window.removeEventListener("keyup",key,true);window.removeEventListener("blur",blur);document.removeEventListener("visibilitychange",hidden);};
  },[control]);
  return <div className="sw-controls">
    <div ref={pad} data-testid="balance-pad" role="slider" tabIndex={0} aria-label="Balance correction: drag left or right, or use arrow keys" aria-valuemin={-100} aria-valuemax={100} aria-valuenow={Math.round(value*100)} className="sw-pad"
      onContextMenu={e=>e.preventDefault()} onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();if(control.down(e.pointerId,e.clientX,e.currentTarget.clientWidth))e.currentTarget.setPointerCapture(e.pointerId);}}
      onPointerMove={e=>control.move(e.pointerId,e.clientX)} onPointerUp={e=>{control.up(e.pointerId);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
      onPointerCancel={e=>control.up(e.pointerId)} onLostPointerCapture={e=>control.up(e.pointerId)}>
      <span>← Balance →</span><i style={{left:`${50+value*40}%`}}/>
    </div>
    <button ref={button} data-testid="place-object" className="sw-place" aria-label="Place object (Space)" onContextMenu={e=>e.preventDefault()}
      onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();if(control.placeDown(e.pointerId))e.currentTarget.setPointerCapture(e.pointerId);}}
      onPointerUp={e=>{const r=e.currentTarget.getBoundingClientRect();control.placeUp(e.pointerId,e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
      onPointerCancel={e=>control.up(e.pointerId)} onLostPointerCapture={e=>control.up(e.pointerId)} onClick={e=>{if(e.detail===0)place();}}>Place <small>Space</small></button>
    <label className="sw-sensitivity">Sensitivity <input data-testid="balance-sensitivity" type="range" min="0.5" max="1.5" step="0.1" value={sensitivity} onChange={e=>{control.reset();setSensitivity(Number(e.target.value));}}/></label>
  </div>;
}
