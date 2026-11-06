import { useSyncExternalStore } from "react";
import { stillwater } from "./session";
import { BalanceControls } from "./Controls";
import { balanceWindow, placementWindow, canPlace, RULES } from "./engine";
import "./stillwater.css";
export function StillwaterHud(){
  useSyncExternalStore(stillwater.subscribe,stillwater.snapshot);
  const e=stillwater.engine,s=e?.state,c=s?.competitors[0];
  if(!e?.ownsControls)return stillwater.near?<div className="sw-entry"><small>INDIVIDUAL CLEARING · REHEARSAL</small><strong>Stillwater Balance</strong><span>Keep your footing. Build your stack. Outlast the tribe.</span><button data-testid="stillwater-enter" onClick={stillwater.start}>Enter challenge</button></div>:null;
  if(!s||!c)return null;
  const live=s.competitors.filter(p=>p.eliminatedAt===null),intro=s.phase==="introduction",tutorial=s.phase==="tutorial",results=s.phase==="results",paused=s.phase==="paused",active=s.phase==="active";
  return <div className="sw-overlay" data-testid="stillwater-hud" data-phase={s.phase}>
    <div className="sw-heading"><div><small>INDIVIDUAL IMMUNITY · REHEARSAL ONLY</small><h1>Stillwater Balance</h1></div><div className="sw-status">{live.length}/{s.competitors.length} remain <b>{Math.floor(s.elapsed/60)}:{String(Math.floor(s.elapsed%60)).padStart(2,"0")}</b></div></div>
    {(intro||tutorial)&&<section className="sw-card" aria-label={intro?"Host introduction":"Challenge tutorial"}>
      <small>{intro?"YOUR HOST · THE INDIVIDUAL CLEARING":"YOUR STATION · HOW TO PLAY"}</small>
      <h2>{intro?"Steady hands. Quiet mind.":"Find the center."}</h2>
      <p>{intro?"Welcome to Stillwater Balance. Keep your footing on the narrow board and build a stack on your moving platform. Every ten seconds, another object is ready. The last contestant standing wins this rehearsal.":"Drag the balance pad gently left or right to keep the marker inside the center band. Use A / D or arrow keys on a keyboard. Let go to return correction to neutral."}</p>
      <p>{intro?"Lose your balance or stability, or collect three placement misses, and you are out. At 90 seconds, surviving contestants rank by objects placed, then stability. Exact ties share the win.":"When an object is ready, steady the marker in the gold band and tap Place (Space). You have seven seconds. Green feedback means a clean placement; a miss adds a strike. Recovering inside the balance band restores stability."}</p>
      <button data-testid={intro?"stillwater-rules":"stillwater-ready"} onClick={intro?stillwater.tutorial:stillwater.ready}>{intro?"Show controls":"I’m ready · Start"}</button>
    </section>}
    {s.phase==="countdown"&&<div className="sw-countdown" role="status">{Math.max(1,Math.ceil(s.countdown))}<small>Find your balance</small></div>}
    {(active||s.phase==="player-eliminated")&&<>
      <div className="sw-roster">{s.competitors.map(p=><span key={p.id} className={p.eliminatedAt!==null?"out":""}>{p.name}<i>{p.eliminatedAt!==null?"OUT":`${p.placed} stacked`}</i></span>)}</div>
      {active?<div className="sw-instruments">
        <div className="sw-meter-title"><strong>Stability {Math.round(c.stability*100)}%</strong><span>{c.strikes}/{RULES.maxStrikes} misses</span></div>
        <div className="sw-stability"><i style={{width:`${c.stability*100}%`}}/></div>
        <div className="sw-balance"><i className="sw-safe" style={{width:`${balanceWindow(s.elapsed)*92}%`}}/><i className="sw-precision" style={{left:"50%",transform:"translateX(-50%)",width:`${placementWindow(s.elapsed)*92}%`}}/><b style={{left:`${50+Math.max(-1,Math.min(1,c.balance))*46}%`}}/></div>
        <div className="sw-objective" data-testid="placement-objective">{c.lastPlacement!=="none"&&c.placementFlash>0?<strong>{c.lastPlacement==="success"?"Clean placement":"Placement missed"}</strong>:s.elapsed>=c.nextPlacement?<strong className={canPlace(c,s.elapsed)?"ready":""}>{canPlace(c,s.elapsed)?"Steady · Place now":"Object ready · Center and slow down"} <small>{Math.max(0,Math.ceil(c.nextPlacement+7-s.elapsed))}s</small></strong>:<span>Next object in {Math.ceil(c.nextPlacement-s.elapsed)}s · {c.placed} stacked</span>}</div>
      </div>:<div className="sw-watching"><strong>You’re out</strong><span>Watch the remaining contestants compete.</span></div>}
      <div className="sw-notices" aria-live="polite">{s.notices.slice(-2).map((n,i)=><span key={i}>{n}</span>)}</div>
    </>}
    {paused&&<section className="sw-card"><small>CHALLENGE PAUSED</small><h2>Take a breath.</h2><p>Your station is held steady. Resume when you are ready.</p><button data-testid="stillwater-resume" onClick={stillwater.resume}>Resume challenge</button></section>}
    {results&&s.result&&<section className="sw-card sw-results" data-testid="stillwater-results">
      <small>REHEARSAL RESULT · NO SEASON IMMUNITY AWARDED</small><h2>{!s.result.winnerIds.length?"No contestant finished.":s.result.winnerIds.includes(0)?"You held your nerve.":`${s.result.ranking[0]?.name} wins.`}</h2>
      <p>{s.result.winnerIds.length>1?"Shared win · ":s.result.winnerIds.length?"Winner · ":"All contestants out"}{s.result.ranking.filter(p=>s.result!.winnerIds.includes(p.id)).map(p=>p.name).join(" & ")} · You placed {s.result.ranking.find(p=>p.id===0)?.place} of {s.competitors.length} · {s.result.duration.toFixed(1)} seconds</p>
      <ol>{s.result.ranking.map(p=><li key={p.id}><b>{p.place}. {p.name}</b><span>{p.placed} objects · {p.eliminatedAt===null?"standing":`out at ${p.eliminatedAt.toFixed(1)}s`}</span></li>)}</ol>
      <div className="sw-actions"><button data-testid="stillwater-retry" onClick={stillwater.retry}>Retry rehearsal</button><button data-testid="stillwater-return" onClick={stillwater.exit}>Return to exploration</button></div>
    </section>}
    {active&&<BalanceControls axis={stillwater.axis} place={stillwater.place} pause={stillwater.pause}/>}
    <div className="sw-session-actions">{(active||s.phase==="countdown"||s.phase==="player-eliminated")&&<button data-testid="stillwater-pause" onClick={stillwater.pause}>Pause</button>}<button data-testid="stillwater-cancel" onClick={stillwater.exit}>{results?"Explore":"Leave challenge"}</button></div>
  </div>;
}
