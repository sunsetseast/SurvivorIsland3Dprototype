import { useEffect, useRef, useState } from 'react';
import { BOUNDS, LANDMARKS, PATH } from './world';
import { dbg, input } from './state';

const safe = (side: string) => `max(12px, env(safe-area-inset-${side}))`;

function Joystick() {
  const id = useRef<number | null>(null);
  const [k, setK] = useState({ x: 0, y: 0 });
  const upd = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const max = r.width / 2 - 18, l = Math.hypot(dx, dy);
    if (l > max) { dx = (dx / l) * max; dy = (dy / l) * max; }
    setK({ x: dx, y: dy });
    input.joyX = dx / max; input.joyY = -dy / max;
  };
  const end = (e: React.PointerEvent) => {
    if (e.pointerId !== id.current) return;
    id.current = null; setK({ x: 0, y: 0 }); input.joyX = 0; input.joyY = 0;
  };
  return (
    <div data-testid="joystick" className="absolute rounded-full chip" style={{ left: safe('left'), bottom: safe('bottom'), width: 116, height: 116, touchAction: 'none', zIndex: 5 }}
      onPointerDown={e => { if (id.current !== null) return; id.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); upd(e); }}
      onPointerMove={e => { if (e.pointerId === id.current) upd(e); }}
      onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
      <div className="absolute rounded-full" style={{ width: 48, height: 48, left: 34, top: 34, background: '#f6c35a', border: '2px solid #fff6dc', transform: `translate(${k.x}px,${k.y}px)` }} />
    </div>
  );
}

function RunButton() {
  const id = useRef<number | null>(null);
  const [on, setOn] = useState(false);
  const end = (e: React.PointerEvent) => { if (e.pointerId !== id.current) return; id.current = null; input.run = false; setOn(false); };
  return (
    <button data-testid="button-run" className={`btn absolute ${on ? 'on' : ''}`} style={{ right: safe('right'), bottom: safe('bottom'), width: 84, height: 84, zIndex: 5, fontSize: 15 }}
      onPointerDown={e => { id.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); input.run = true; setOn(true); }}
      onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} onContextMenu={e => e.preventDefault()}>RUN</button>
  );
}

function OrbitZone() {
  const id = useRef<number | null>(null);
  const last = useRef({ x: 0, y: 0 });
  return (
    <div data-testid="orbit-zone" className="absolute" style={{ right: 0, top: 0, bottom: 0, width: '62%', touchAction: 'none', pointerEvents: 'auto', zIndex: 1 }}
      onPointerDown={e => { if (id.current !== null) return; id.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); last.current = { x: e.clientX, y: e.clientY }; }}
      onPointerMove={e => {
        if (e.pointerId !== id.current) return;
        input.yaw -= (e.clientX - last.current.x) * 0.007;
        input.pitch = Math.max(0.12, Math.min(1.15, input.pitch + (e.clientY - last.current.y) * 0.005));
        last.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={e => { if (e.pointerId === id.current) id.current = null; }}
      onPointerCancel={e => { if (e.pointerId === id.current) id.current = null; }} />
  );
}

function Minimap() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const W = 100, H = 104;
    const sx = (x: number) => ((x - BOUNDS.minX) / (BOUNDS.maxX - BOUNDS.minX)) * W;
    const sz = (z: number) => ((z - BOUNDS.minZ) / (BOUNDS.maxZ - BOUNDS.minZ)) * H;
    const draw = () => {
      const g = ref.current?.getContext('2d'); if (!g) return;
      g.clearRect(0, 0, W, H);
      g.fillStyle = '#2f8f45'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#ecd08f'; g.fillRect(0, 0, sx(-35), H);
      g.fillStyle = '#16b3c6'; g.fillRect(0, 0, 3, H);
      g.strokeStyle = '#b8884d'; g.lineWidth = 3; g.beginPath();
      PATH.forEach((p, i) => (i ? g.lineTo(sx(p.x), sz(p.z)) : g.moveTo(sx(p.x), sz(p.z)))); g.stroke();
      const dot = (p: { x: number; z: number }, c: string, r = 3) => { g.fillStyle = c; g.beginPath(); g.arc(sx(p.x), sz(p.z), r, 0, 7); g.fill(); };
      dot(LANDMARKS.beach, '#fff', 2.5); dot(LANDMARKS.campfire, '#ff7a1c'); dot(LANDMARKS.shelter, '#e8b84a', 4); dot(LANDMARKS.well, '#7fe0ff');
      g.fillStyle = '#e8512f'; g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.arc(sx(dbg.x), sz(dbg.z), 3.5, 0, 7); g.fill(); g.stroke();
    };
    draw();
    const t = setInterval(draw, 120);
    return () => clearInterval(t);
  }, []);
  return <canvas ref={ref} data-testid="minimap" width={100} height={104} className="chip" style={{ width: 100, height: 104, padding: 2 }} />;
}

export function Hud() {
  const [, tick] = useState(0);
  const [help, setHelp] = useState(false);
  useEffect(() => { const t = setInterval(() => tick(n => n + 1), 250); return () => clearInterval(t); }, []);
  return (
    <div className="hud absolute inset-0" style={{ pointerEvents: 'none' }}>
      <OrbitZone />
      <div className="absolute flex items-start gap-2" style={{ left: safe('left'), top: safe('top'), right: safe('right'), zIndex: 4 }}>
        <div className="chip" style={{ padding: '4px 10px', fontSize: 12, lineHeight: 1.25 }}>
          <div style={{ fontWeight: 800, letterSpacing: '.04em', color: '#f6c35a' }}>SURVIVOR ISLAND CAMP</div>
          <div data-testid="text-location" style={{ fontSize: 13, fontWeight: 700 }}>{dbg.location}</div>
          <div data-testid="text-debug" style={{ fontFamily: 'var(--app-font-mono)', fontSize: 10, opacity: .85 }}>
            X {dbg.x.toFixed(1)} Y {dbg.y.toFixed(1)} Z {dbg.z.toFixed(1)} · {dbg.fps} FPS
          </div>
        </div>
        <div className="flex-1" />
        <div style={{ pointerEvents: 'auto' }} className="flex flex-col items-end gap-1">
          <div className="flex gap-1">
            <button data-testid="button-reset" className="btn" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => { dbg.resetRequested = true; }}>Reset</button>
            <button data-testid="button-help" className={`btn ${help ? 'on' : ''}`} style={{ width: 30, fontSize: 14 }} onClick={() => setHelp(h => !h)}>?</button>
          </div>
          <Minimap />
        </div>
      </div>
      {help && (
        <div data-testid="panel-help" className="chip absolute" style={{ left: '50%', top: '50%', transform: 'translate(-50%,-50%)', padding: '10px 16px', fontSize: 12, lineHeight: 1.45, maxWidth: 360, zIndex: 6, pointerEvents: 'auto' }} onClick={() => setHelp(false)}>
          <b style={{ color: '#f6c35a' }}>How to explore</b>
          <div>Joystick (left) or WASD / arrows to walk. Hold RUN or Shift to run.</div>
          <div>Drag on the right side to orbit the camera. Follow the dirt path between signposts: beach, campfire, shelter, well.</div>
          <div style={{ opacity: .7, marginTop: 4 }}>Isolated prototype · provisional geography. Tap to close.</div>
        </div>
      )}
      <div className="absolute" style={{ left: '50%', transform: 'translateX(-50%)', bottom: 6, fontSize: 9, opacity: .6, zIndex: 3 }}>
        Isolated prototype · provisional geography
      </div>
      <div className="rotate-hint chip absolute" style={{ left: '50%', top: '38%', transform: 'translateX(-50%)', padding: '6px 12px', fontSize: 12, zIndex: 6, animation: 'bob 2s infinite' }}>
        Rotate to landscape for the best view
      </div>
      <div style={{ pointerEvents: 'auto' }}><Joystick /><RunButton /></div>
    </div>
  );
}
