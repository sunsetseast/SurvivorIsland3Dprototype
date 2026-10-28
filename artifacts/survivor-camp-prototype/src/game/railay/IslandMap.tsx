import { LOCATIONS } from "../locations/registry";
import { TouchButton } from "../Hud";
import { useEffect, useMemo, useRef, useState } from "react";
import { COAST, ISLETS, LAGOON, KARSTS, ZONES, type P } from "./geography";
import { heightAt } from "./terrain";
import { dbg, clearInput } from "../state";
const EXTENT = { left: -1400, right: 1350, top: -1500, bottom: 1250 };
function drawBase(width: number, height: number, large: boolean) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const g = c.getContext("2d")!;
  const sx = (x: number) =>
      ((x - EXTENT.left) / (EXTENT.right - EXTENT.left)) * width,
    sz = (z: number) =>
      ((z - EXTENT.top) / (EXTENT.bottom - EXTENT.top)) * height;
  const fill = (poly: P[], color: string, stroke?: string) => {
    g.beginPath();
    poly.forEach((p, i) =>
      i ? g.lineTo(sx(p.x), sz(p.z)) : g.moveTo(sx(p.x), sz(p.z)),
    );
    g.closePath();
    g.fillStyle = color;
    g.fill();
    if (stroke) {
      g.strokeStyle = stroke;
      g.lineWidth = large ? 2 : 1;
      g.stroke();
    }
  };
  g.fillStyle = "#153e4e";
  g.fillRect(0, 0, width, height);
  fill(COAST, "#3c6044", "#e6d0a1");
  ISLETS.forEach((p) => fill(p, "#526448", "#d3bb8f"));
  KARSTS.slice(0, 5).forEach((k) => fill(k.outline, "#827e61", "#a9a07a"));
  fill(LAGOON, "#438d79", "#afcab0");
  // A restrained translucent relief layer reads at both minimap and expanded sizes.
  for (let y = 0; y < height; y += 4)
    for (let x = 0; x < width; x += 4) {
      const wx = EXTENT.left + (x / width) * (EXTENT.right - EXTENT.left),
        wz = EXTENT.top + (y / height) * (EXTENT.bottom - EXTENT.top),
        h = heightAt(wx, wz);
      if (h > 15) {
        g.fillStyle = `rgba(225,219,178,${Math.min(0.15, h / 1400)})`;
        g.fillRect(x, y, 4, 4);
      }
    }
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `600 ${large ? 15 : 9}px system-ui`;
  g.shadowColor = "#07191b";
  g.shadowBlur = 4;
  const labels = [
    { id: 0, text: "Tonsai", dx: -14, dz: -18 },
    { id: 1, text: "Railay West", dx: -40, dz: 0 },
    { id: 2, text: "Railay East", dx: 42, dz: -15 },
    { id: 3, text: "Phra Nang", dx: -8, dz: 20 },
    { id: 4, text: "Lagoon", dx: 37, dz: 4 },
  ];
  labels.forEach(({ id, text, dx, dz }) => {
    const p = ZONES[id]!.point,
      x = sx(p.x),
      y = sz(p.z);
    g.fillStyle = "#f4deb2";
    g.beginPath();
    g.arc(x, y, large ? 3 : 2, 0, Math.PI * 2);
    g.fill();
    g.fillText(text, x + dx * (large ? 1 : 0.45), y + dz * (large ? 1 : 0.45));
  });
  if (large) for (const loc of Object.values(LOCATIONS)) {
    const x=sx(loc.anchor.x), y=sz(loc.anchor.z);
    g.fillStyle=loc.status==='playable'?'#f4c16d':'#c9c6b6';g.fillRect(x-3,y-3,6,6);
    g.font='600 10px system-ui';g.fillText(loc.id, x+45, y+12);
  }
  g.shadowBlur = 0;
  g.fillStyle = "#e9edcf";
  g.font = `700 ${large ? 15 : 10}px system-ui`;
  g.fillText("N", width - 18, 14);
  g.beginPath();
  g.moveTo(width - 18, 23);
  g.lineTo(width - 22, 31);
  g.lineTo(width - 14, 31);
  g.closePath();
  g.fill();
  if (large) {
    const length = (200 / (EXTENT.right - EXTENT.left)) * width;
    g.strokeStyle = "#e9edcf";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(18, height - 21);
    g.lineTo(18 + length, height - 21);
    g.stroke();
    g.font = "11px system-ui";
    g.textAlign = "left";
    g.fillText("200 m", 18, height - 10);
  }
  return c;
}
function MapCanvas({ large = false }: { large?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null),
    size = large ? 680 : 240;
  const base = useMemo(() => drawBase(size, size, large), [size, large]);
  useEffect(() => {
    const draw = () => {
      const g = ref.current?.getContext("2d");
      if (!g) return;
      g.clearRect(0, 0, size, size);
      g.drawImage(base, 0, 0);
      const x = ((dbg.x - EXTENT.left) / (EXTENT.right - EXTENT.left)) * size,
        z = ((dbg.z - EXTENT.top) / (EXTENT.bottom - EXTENT.top)) * size;
      g.save();
      g.translate(x, z);
      g.rotate(Math.PI - dbg.face);
      g.shadowColor = "#001814";
      g.shadowBlur = 5;
      g.fillStyle = "#ffd37a";
      g.strokeStyle = "#fff9db";
      g.lineWidth = large ? 2 : 1;
      g.beginPath();
      g.moveTo(0, -(large ? 10 : 6));
      g.lineTo(large ? 6 : 4, large ? 6 : 4);
      g.lineTo(0, large ? 3 : 2);
      g.lineTo(large ? -6 : -4, large ? 6 : 4);
      g.closePath();
      g.fill();
      g.stroke();
      g.restore();
    };
    draw();
    const t = setInterval(draw, 100);
    return () => clearInterval(t);
  }, [base, size, large]);
  return (
    <canvas
      data-testid={large ? "island-map-large" : "island-minimap"}
      ref={ref}
      width={size}
      height={size}
      aria-label="Railay map showing the beaches, lagoon, cliffs and your live position"
    />
  );
}
export function IslandMap({
  onOpenChange,
}: {
  onOpenChange: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    onOpenChange(open);
  }, [open, onOpenChange]);
  return (
    <>
      <TouchButton
        className="island-minimap"
        data-testid="island-map-toggle"
        onActivate={() => {
          clearInput();
          setOpen(true);
        }}
        aria-label="Open island map"
      >
        <MapCanvas />
        <span>MAP ↗</span>
      </TouchButton>
      {open && (
        <div className="island-map-backdrop" onClick={() => setOpen(false)}>
          <section
            className="island-map-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Railay peninsula map"
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <strong>Railay Peninsula</strong>
              <TouchButton
                data-testid="island-map-close"
                onActivate={() => setOpen(false)}
                aria-label="Close map"
              >
                ×
              </TouchButton>
            </header>
            <MapCanvas large />
            <footer>
              <span>▲ You · Limestone cliffs · Tropical forest</span>
              <small>Coastline © OpenStreetMap contributors · ODbL</small>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
