import * as T from "three";
import { rng } from "../world";

/** Authored, seeded microtexture; no downloaded art or per-frame canvas work. */
export function surface(kind: "stone" | "wood" | "bark" | "earth" | "rings") {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const c = canvas.getContext("2d")!,
    pixels = c.createImageData(512, 512),
    random = rng(817 + kind.length);
  for (let y = 0; y < 512; y++)
    for (let x = 0; x < 512; x++) {
      const grain = random() * 36,
        large =
          Math.sin(x * 0.031 + Math.sin(y * 0.021) * 3) *
          Math.sin(y * 0.017) *
          12;
      let v = 155 + grain + large;
      if (kind === "wood" || kind === "bark")
        v +=
          Math.sin(x * 0.14 + Math.sin(y * 0.017) * 3) * 22 +
          Math.sin(x * 0.43 + Math.sin(y * 0.007) * 6) * 13;
      if (kind === "rings") {
        const r = Math.hypot(x - 251, y - 259);
        v =
          185 +
          Math.sin(
            r * 0.34 + Math.sin(Math.atan2(y - 259, x - 251) * 7) * 0.8,
          ) *
            27 +
          grain * 0.4;
      }
      if (kind === "earth") v = 105 + grain * 1.9 + large;
      const i = (y * 512 + x) * 4;
      pixels.data[i] = v;
      pixels.data[i + 1] = v * 0.96;
      pixels.data[i + 2] = v * 0.88;
      pixels.data[i + 3] = 255;
    }
  c.putImageData(pixels, 0, 0);
  if (kind === "stone" || kind === "bark") {
    for (let i = 0; i < 65; i++) {
      let x = random() * 512,
        y = random() * 512;
      c.strokeStyle = `rgba(34,31,22,${0.12 + random() * 0.2})`;
      c.lineWidth = 0.6 + random() * 2;
      c.beginPath();
      c.moveTo(x, y);
      for (let j = 0; j < 8; j++) {
        x += (random() - 0.5) * (kind === "bark" ? 6 : 34);
        y += random() * 20;
        c.lineTo(x, y);
      }
      c.stroke();
    }
  }
  if (kind === "rings") {
    c.strokeStyle = "rgba(35,23,12,.65)";
    c.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const a = random() * 7;
      c.beginPath();
      c.moveTo(251 + Math.cos(a) * 240, 259 + Math.sin(a) * 240);
      c.lineTo(
        251 + Math.cos(a + 0.04) * (90 + random() * 60),
        259 + Math.sin(a + 0.04) * (90 + random() * 60),
      );
      c.stroke();
    }
  }
  const texture = new T.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
export function sanctuaryMaterials() {
  const maps = {
    stone: surface("stone"),
    wood: surface("wood"),
    bark: surface("bark"),
    earth: surface("earth"),
    rings: surface("rings"),
  };
  const stone = (color: string, map = maps.stone) =>
    new T.MeshStandardMaterial({
      color,
      map,
      bumpMap: map,
      bumpScale: 0.09,
      roughness: 0.94,
      vertexColors: true,
    });
  const materials = {
    stone: stone("#969484"),
    trim: stone("#b0a28a"),
    dark: stone("#47473e"),
    wood: stone("#8a6240", maps.wood),
    bark: stone("#655543", maps.bark),
    cut: stone("#c9a26a", maps.rings),
    ground: stone("#514c3a", maps.earth),
    moss: stone("#475b38"),
    leaf: new T.MeshStandardMaterial({
      color: "#314a38",
      roughness: 0.9,
      side: T.DoubleSide,
      vertexColors: true,
    }),
    gold: new T.MeshStandardMaterial({
      color: "#927347",
      metalness: 0.45,
      roughness: 0.64,
      vertexColors: true,
    }),
    ash: stone("#302d28"),
    ember: new T.MeshBasicMaterial({
      color: "#fa4210",
      vertexColors: true,
      toneMapped: false,
    }),
    parchment: stone("#d5bd85", maps.earth),
  };
  return {
    materials,
    dispose: () => {
      Object.values(materials).forEach((m) => m.dispose());
      Object.values(maps).forEach((m) => m.dispose());
    },
  };
}
export type MaterialKey = keyof ReturnType<
  typeof sanctuaryMaterials
>["materials"];
