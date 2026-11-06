import { TouchButton } from "../Hud";
import { CONFIGURATIONS, type ChallengeId } from "./configurations";
import { challengeTestingEnabled } from "./development";
import { BUILD_REVISION } from "../../buildInfo";
import "./testing-hub.css";

export function ChallengeTestingHub({ onSelect, onWelcome }: { onSelect?: (id:ChallengeId)=>void; onWelcome:()=>void }) {
  if(!challengeTestingEnabled())return null;
  const entries=Object.entries(CONFIGURATIONS).sort(([,a],[,b])=>Number(b.playable)-Number(a.playable));
  return <main className="challenge-testing-hub" data-testid="challenge-testing-hub">
    <header><div><p>DEVELOPMENT PREVIEW · REHEARSAL ONLY</p><h1>Challenge Testing</h1><span>Your camp session stays where you left it.</span></div><TouchButton data-testid="hub-welcome" onActivate={onWelcome}>Welcome screen</TouchButton></header>
    <div className="testing-cards">{entries.map(([id,c])=>{
      const [zone,title]=c.name.split(" · ");
      return <article key={id} className={c.playable?"testing-card playable":"testing-card"}>
        <small>{zone} · {c.playable?"Individual Immunity — Playable":"Environment Preview"}</small><h2>{title}</h2><p>{c.description}</p>
        <TouchButton data-testid={`hub-${id}`} disabled={!onSelect} onActivate={()=>onSelect?.(id as ChallengeId)}>{c.playable?"Play Stillwater Balance":"Preview environment"}<span aria-hidden="true"> →</span></TouchButton>
      </article>;
    })}</div>
    <footer data-testid="testing-build">Challenge Hub v1 · Development · Build {BUILD_REVISION}<span>Temporary results · No season awards</span></footer>
  </main>;
}
