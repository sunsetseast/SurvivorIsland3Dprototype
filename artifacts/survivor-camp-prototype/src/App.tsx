import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { KeyboardControls } from '@react-three/drei';
import { Scene } from '@/game/Scene';
import { Hud } from '@/game/Hud';
import { dbg, input } from '@/game/state';

const keyMap = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'back', keys: ['ArrowDown', 'KeyS'] },
  { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'right', keys: ['ArrowRight', 'KeyD'] },
  { name: 'run', keys: ['ShiftLeft', 'ShiftRight'] },
];

function App() {
  useEffect(() => {
    const clearInput = () => {
      input.joyX = 0; input.joyY = 0; input.run = false;
      // Browser tab switches can swallow keyup, leaving a development key held.
      for (const binding of keyMap) for (const code of binding.keys) {
        const key = code.startsWith('Key') ? code.slice(3).toLowerCase()
          : code.startsWith('Shift') ? 'Shift' : code;
        window.dispatchEvent(new KeyboardEvent('keyup', { code, key, bubbles: true }));
      }
    };
    window.addEventListener('blur', clearInput);
    document.addEventListener('visibilitychange', clearInput);
    const d = {
      get position() { return { x: dbg.x, y: dbg.y, z: dbg.z }; },
      get camera() { return { x: dbg.cx, y: dbg.cy, z: dbg.cz, yaw: input.yaw, pitch: input.pitch }; },
      get location() { return dbg.location; },
      get moving() { return dbg.moving; },
      get running() { return dbg.running; },
      get speed() { return dbg.speed; },
      get cameraDistance() { return dbg.cameraDistance; },
      get cameraBlocked() { return dbg.cameraBlocked; },
      reset: () => { dbg.resetRequested = true; },
    };
    (window as unknown as { __CAMP_DEBUG__: unknown }).__CAMP_DEBUG__ = Object.freeze(d);
    return () => {
      window.removeEventListener('blur', clearInput);
      document.removeEventListener('visibilitychange', clearInput);
    };
  }, []);
  return (
    <KeyboardControls map={keyMap}>
      <div style={{ position: 'fixed', inset: 0 }}>
        <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: 'high-performance' }}
          camera={{ fov: 55, near: 0.2, far: 200, position: [0, 6, 0] }} style={{ pointerEvents: 'none' }}>
          <Scene />
        </Canvas>
        <Hud />
      </div>
    </KeyboardControls>
  );
}

export default App;
