import * as THREE from 'three';
import { LANDMARKS, SHADE, baseHeight, clamp, noise2, pathDistance, shorelineX, smooth, smoothstep } from './world';

const hx = (s: string) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const SAND = hx('#f0d59a'), SAND2 = hx('#f8e5b4'), WET = hx('#b49a68'), SHALLOW = hx('#ecdfae'), DEEP = hx('#1b5670'),
  DUNE = hx('#a9a550'), GRASS = hx('#5f9a38'), JUNGLE = hx('#2f6a30'), UNDER = hx('#1f4a28'), DIRT = hx('#b48750'),
  DIRT2 = hx('#8a6238'), LITTER = hx('#6b4a2a'), ASH = hx('#33292a'), STONE = hx('#b9ae9a'), WRACK = hx('#6f6244');

export function bakeGround(x0: number, x1: number, z0: number, z1: number, W: number, H: number): THREE.CanvasTexture {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!, img = ctx.createImageData(W, H), data = img.data;
  const fire = LANDMARKS.campfire, well = LANDMARKS.well;
  let r = 0, g = 0, b = 0;
  const to = (c: number[], t: number) => { r += (c[0]! - r) * t; g += (c[1]! - g) * t; b += (c[2]! - b) * t; };
  const set = (c: number[]) => { r = c[0]!; g = c[1]!; b = c[2]!; };
  for (let py = 0; py < H; py++) {
    const z = z0 + ((py + 0.5) / H) * (z1 - z0);
    for (let px = 0; px < W; px++) {
      const x = x0 + ((px + 0.5) / W) * (x1 - x0);
      const h = baseHeight(x, z), d = x - shorelineX(z);
      const n2 = noise2(x * 0.7 + 5, z * 0.7), fine = Math.sin(px * 12.9898 + py * 78.233) * 43758.5453, n3 = fine - Math.floor(fine);
      if (h < 0) {
        set(SHALLOW); to(DEEP, smooth(clamp(-h / 3.2, 0, 1)));
        const k = (n2 - 0.5) * 16 * (1 - clamp(-h / 3, 0, 1)); r += k; g += k; b += k;
      } else {
        const n1 = noise2(x * 0.18, z * 0.18);
        set(SAND); to(SAND2, noise2(x * 0.4, z * 0.4) * 0.6);
        to(WET, 1 - smoothstep(0.2, 3.2 + n1 * 2, d));
        if (Math.abs(d - (4.6 + n1 * 2)) < 0.35) to(WRACK, 0.45 * n2);
        const veg = smoothstep(12, 24, d + (n1 - 0.5) * 14);
        if (veg > 0) {
          const gr = [DUNE[0]!, DUNE[1]!, DUNE[2]!];
          const k = smoothstep(20, 45, d + (n2 - 0.5) * 10);
          const mixc = gr.map((v, i) => v + ((i === 0 ? JUNGLE[0]! : i === 1 ? JUNGLE[1]! : JUNGLE[2]!) - v) * k);
          const deep = smoothstep(0.55, 0.8, noise2(x * 0.08 + 20, z * 0.08));
          const bright = smoothstep(0.62, 0.8, noise2(x * 0.05 + 3, z * 0.05 + 8)) * k;
          const col = mixc.map((v, i) => v + (UNDER[i]! - v) * deep * 0.7 + (GRASS[i]! - v) * bright * 0.6);
          to(col, veg);
          if (n3 > 0.9) { r += 12; g += 18; } else if (n3 < 0.07) { r -= 10; g -= 10; b -= 6; }
          if (n2 > 0.72) to(LITTER, (n2 - 0.72) * 2.2 * veg);
        } else if (n3 > 0.996) { r = 255; g = 250; b = 240; }
        const pd = pathDistance(x, z, 3.4);
        if (pd < 3.2) {
          const jitter = (n2 - 0.5) * 0.8, tp = 1 - smoothstep(0.8 + jitter, 1.7 + jitter, pd);
          to(d < 20 ? [200, 164, 108] : DIRT, tp * (d < 20 ? 0.55 : 0.92));
          if (pd < 0.7 && d >= 20) to(DIRT2, 0.35 * n2);
        }
        const df = Math.hypot(x - fire.x, z - fire.z);
        if (df < 5) { to(DIRT, (1 - smoothstep(2.4, 4.6 + n1, df)) * 0.8); to(ASH, 1 - smoothstep(0.9, 2.2 + n2 * 0.5, df)); }
        const dw = Math.hypot(x - well.x, z - well.z);
        if (dw < 4.5) { to(DIRT, (1 - smoothstep(2, 4, dw)) * 0.8); to(STONE, (1 - smoothstep(1.6, 3, dw + n2)) * 0.5); }
        const sdx = Math.max(5 - x, 0, x - 19), sdz = Math.max(-50 - z, 0, z + 31);
        to(DIRT2, 0.55 * (1 - smoothstep(0, 2.5, Math.hypot(sdx, sdz))));
      }
      const o = (py * W + px) * 4;
      data[o] = r; data[o + 1] = g; data[o + 2] = b; data[o + 3] = 255;
    }
  }
  for (const s of SHADE) {
    const pxr = (s.r / (x1 - x0)) * W, pzr = (s.r / (z1 - z0)) * H;
    const cx = ((s.x - x0) / (x1 - x0)) * W, cy = ((s.z - z0) / (z1 - z0)) * H;
    for (let py = Math.max(0, Math.floor(cy - pzr)); py < Math.min(H, cy + pzr); py++) {
      for (let px = Math.max(0, Math.floor(cx - pxr)); px < Math.min(W, cx + pxr); px++) {
        const t = 1 - Math.hypot((px - cx) / pxr, (py - cy) / pzr);
        if (t <= 0) continue;
        const k = 1 - s.s * t * t, o = (py * W + px) * 4;
        data[o] = data[o]! * k; data[o + 1] = data[o + 1]! * k; data[o + 2] = data[o + 2]! * k;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}
