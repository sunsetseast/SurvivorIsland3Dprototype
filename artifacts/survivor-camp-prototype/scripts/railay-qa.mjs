/** Real application/WebGL evidence. Host SwiftShader timings are NOT iPhone FPS. */
import assert from "node:assert/strict";
import os from "node:os";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";
// Restricted runner exposes no network interfaces; the server itself only needs loopback.
try {
  os.networkInterfaces();
} catch {
  os.networkInterfaces = () => ({});
}
const root = fileURLToPath(new URL("..", import.meta.url)),
  out = path.resolve(root, "../../docs/railay/evidence");
await mkdir(out, { recursive: true });
process.env.PORT = "5195";
process.env.BASE_PATH = "/";
const server = await createServer({
  configFile: path.join(root, "vite.config.ts"),
  server: { host: "127.0.0.1", hmr: false, watch: null },
});
await server.listen();
const report = {
  renderer:
    "Chrome 142 / ANGLE SwiftShader, host software WebGL; physical iPhone Safari UNVERIFIED",
  errors: [],
  captures: [],
  performance: [],
  checks: [],
};
let browser;
try {
  browser = await chromium.launch({
    executablePath: process.env.CAMP_CHROMIUM,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--disable-gpu-sandbox",
      "--single-process",
      "--no-zygote",
    ],
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  page.setDefaultTimeout(180000);
  page.on("pageerror", (e) => report.errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") report.errors.push(m.text());
  });
  await page.goto("http://127.0.0.1:5195/");
  const enter = Date.now();
  await page.getByTestId("explore-railay").click();
  await page.waitForFunction(() => window.__RAILAY__);
  await page.waitForFunction(() =>
    window.__RAILAY__.scene.getObjectByName("railay-geology-ready"),
  );
  report.initialEntryHostWallMs = Date.now() - enter;
  await page.getByTestId("island-overview").click();
  await page.evaluate(async () => {
    const f = await import("/node_modules/.vite/deps/@react-three_fiber.js"),
      s = f._roots.get(document.querySelector("canvas")).store.getState();
    s.setFrameloop("never");
    s.clock.stop();
    s.clock.autoStart = false;
    window.review = {
      f,
      s,
      render: s.gl.render.bind(s.gl),
      clock: s.clock.elapsedTime,
    };
  });
  assert.ok(await page.getByTestId("island-minimap").isVisible());
  await page.getByTestId("island-map-toggle").click();
  assert.ok(
    await page
      .getByRole("dialog", { name: "Railay peninsula map" })
      .isVisible(),
  );
  await page.screenshot({
    path: path.join(out, "21-expanded-live-map.jpg"),
    type: "jpeg",
    quality: 88,
  });
  await page.getByTestId("island-map-close").click();
  report.checks.push(
    "Live minimap and expandable geographical map open / close correctly.",
  );
  const views = {
    "01-peninsula-aerial": { p: [-1300, 1800, 1950], t: [-30, 10, -150] },
    "02-overhead-coastline": {
      p: [-110, 3000, 0],
      t: [-110, 0, -0.01],
      fov: 48,
    },
    "03-tonsai-aerial": { p: [-950, 400, -100], t: [-430, 20, -750] },
    "04-tonsai-ground": { p: [-555, 5, -645], t: [-445, 55, -785] },
    "05-railay-west-aerial": { p: [-600, 340, 290], t: [40, 12, -140] },
    "06-railay-west-beach": { p: [-35, 4, -30], t: [-185, 22, -490] },
    "07-railay-east": { p: [395, 5, 80], t: [410, 20, -140] },
    "08-phra-nang": { p: [75, 5, 654], t: [260, 33, 760] },
    "09-southern-headlands": { p: [70, 200, 1120], t: [420, 45, 760] },
    "10-karst-formations": { p: [-90, 40, -290], t: [120, 125, -560] },
    "11-limestone-detail": { p: [-17, 19, -364], t: [-80, 38, -407] },
    "12-tropical-jungle": { p: [150, 9, -90], t: [225, 13, -155] },
    "13-jungle-floor": { p: [145, 6.9, -45], t: [160, 7, -65] },
    "14-hidden-lagoon": { p: [510, 210, 700], t: [510, 0, 700.01] },
    "15-cave-recess": { p: [214, 4, 810], t: [246, 5, 810] },
    "16-shallow-coastal-water": { p: [-180, 9, 75], t: [-40, 0, -35] },
  };
  async function frameCamera(view, render = false) {
    return page.evaluate(
      ({ view, render }) => {
        const q = window.review,
          { s, f } = q;
        if (s.frameloop !== "never") {
          s.setFrameloop("never");
          s.clock.stop();
          s.clock.autoStart = false;
          q.clock = s.clock.elapsedTime;
        }
        s.camera.position.set(...view.p);
        s.camera.lookAt(...view.t);
        if (view.fov) s.camera.fov = view.fov;
        else s.camera.fov = 55;
        s.camera.updateProjectionMatrix();
        if (render) {
          s.gl.render = q.render;
          const start = performance.now();
          q.render(s.scene, s.camera);
          const ms = performance.now() - start;
          return { hostRenderSubmissionMs: ms, ...window.__RAILAY__.stats() };
        }
        s.gl.render = () => {};
        q.clock += 0.8;
        f.advance(
          q.clock,
          false,
          f._roots.get(document.querySelector("canvas")).store.getState(),
        );
        s.gl.render = q.render;
      },
      { view, render },
    );
  }
  async function shot(name, view) {
    await frameCamera(view);
    await page.waitForTimeout(40);
    await frameCamera(view);
    await page.waitForTimeout(40);
    const stats = await frameCamera(view, true);
    await page.screenshot({
      path: path.join(out, `${name}.jpg`),
      type: "jpeg",
      quality: 88,
    });
    report.captures.push({ name, view, ...stats });
    console.log(name, stats.calls, stats.triangles);
    return stats;
  }
  for (const [name, v] of Object.entries(views)) await shot(name, v);
  const high = report.captures[4];
  report.performance.push({
    quality: "high",
    camera: "railay-west-aerial",
    ...high,
  });
  await page.getByTestId("island-quality").click();
  await page.waitForTimeout(60);
  const low = await shot("19-low-quality", views["05-railay-west-aerial"]);
  report.performance.push({
    quality: "low",
    camera: "railay-west-aerial",
    ...low,
  });
  assert.ok(
    low.triangles < high.triangles,
    "Low quality reduces submitted triangles",
  );
  await page.setViewportSize({ width: 844, height: 390 });
  await shot("18-iphone-landscape-viewport", views["06-railay-west-beach"]);
  await page.getByTestId("island-quality").click();
  await page.getByTestId("island-overview").click();
  await page.waitForTimeout(80);
  // Actual movement input, advance simulation while leaving WebGL out of the CPU loop.
  const movement = await page.evaluate(async () => {
    const { s, f } = window.review,
      state = await import("/src/game/state.ts");
    s.setFrameloop("never");
    s.clock.stop();
    s.clock.autoStart = false;
    window.review.clock = s.clock.elapsedTime;
    state.dbg.resetRequested = true;
    const r = s.gl.render;
    s.gl.render = () => {};
    for (let i = 0; i < 4; i++)
      f.advance(
        ++window.review.clock,
        false,
        f._roots.get(document.querySelector("canvas")).store.getState(),
      );
    const before = { x: state.dbg.x, z: state.dbg.z };
    state.input.joyY = 1;
    for (let i = 0; i < 100; i++) {
      window.review.clock += 1 / 60;
      f.advance(
        window.review.clock,
        false,
        f._roots.get(document.querySelector("canvas")).store.getState(),
      );
    }
    state.clearInput();
    s.gl.render = r;
    r(s.scene, s.camera);
    return {
      before,
      after: { x: state.dbg.x, z: state.dbg.z },
      y: state.dbg.y,
      moved: Math.hypot(state.dbg.x - before.x, state.dbg.z - before.z),
    };
  });
  console.log("MOVEMENT", JSON.stringify(movement));
  assert.ok(movement.moved > 1);
  report.checks.push({ playerMovement: movement });
  await page.screenshot({
    path: path.join(out, "17-third-person-exploration.jpg"),
    type: "jpeg",
    quality: 88,
  });
  report.captures.push({ name: "17-third-person-exploration" });
  await page.getByTestId("island-reset").click();
  await page.evaluate(() => {
    const { s, f } = window.review;
    s.gl.render = () => {};
    window.review.clock += 0.016;
    f.advance(
      window.review.clock,
      false,
      f._roots.get(document.querySelector("canvas")).store.getState(),
    );
    s.gl.render = window.review.render;
  });
  assert.ok(
    await page.evaluate(
      () => Math.abs(window.__CAMP_DEBUG__.position.x + 16.5165) < 0.01,
    ),
  );
  // Resource disposal events on the actual world resources, before renderer teardown.
  await page.evaluate(() => {
    window.disposed = { geometry: 0, material: 0, texture: 0 };
    const seen = new Set();
    window.__RAILAY__.scene.traverse((o) => {
      if (o.geometry && !seen.has(o.geometry)) {
        seen.add(o.geometry);
        o.geometry.addEventListener(
          "dispose",
          () => window.disposed.geometry++,
        );
      }
      for (const m of [o.material].flat().filter(Boolean)) {
        if (seen.has(m)) continue;
        seen.add(m);
        m.addEventListener("dispose", () => window.disposed.material++);
        for (const t of Object.values(m)) {
          if (t?.isTexture && !seen.has(t)) {
            seen.add(t);
            t.addEventListener("dispose", () => window.disposed.texture++);
          }
        }
      }
    });
  });
  await page.getByTestId("island-menu").click();
  await page.waitForTimeout(200);
  report.checks.push({ disposed: await page.evaluate(() => window.disposed) });
  assert.ok(await page.evaluate(() => !window.__RAILAY__));
  await page.getByTestId("explore-island").click();
  await page.waitForFunction(() => window.__CAMP_DEBUG__.location);
  await page.waitForTimeout(200);
  await page.screenshot({
    path: path.join(out, "regression-camp.jpg"),
    type: "jpeg",
    quality: 85,
  });
  await page.getByTestId("button-menu").click();
  await page.getByTestId("explore-tribal").click();
  await page.waitForFunction(() => window.__CAMP_DEBUG__.tribalFrames > 2);
  await page.getByTestId("skip-tribal-intro").click();
  await page.getByTestId("stand-and-explore").click();
  await page.waitForTimeout(200);
  await page.screenshot({
    path: path.join(out, "regression-tribal.jpg"),
    type: "jpeg",
    quality: 85,
  });
  await page.getByTestId("button-menu").click();
  await page.getByTestId("explore-railay").click();
  await page.waitForFunction(() => window.__RAILAY__);
  report.checks.push(
    "Menu → Railay → camp → Tribal Council → Railay; reset, quality, overview, player movement and disposal verified in WebGL.",
  );
  await page.waitForFunction(() => {
    let count = 0;
    const seen = new Set();
    window.__RAILAY__.scene.traverse((o) => {
      for (const m of [o.material].flat().filter(Boolean)) {
        if (m.map?.image?.width === 512 && !seen.has(m.map)) {
          seen.add(m.map);
          count++;
        }
      }
    });
    return (
      count >= 2 &&
      window.__RAILAY__.scene.getObjectByName("railay-geology-ready")
    );
  });
  report.resourceStats = await page.evaluate(() => {
    const { scene } = window.__RAILAY__,
      gs = new Set(),
      ts = new Set();
    let geometryBytes = 0,
      textureBytesEstimate = 0;
    scene.traverse((o) => {
      if (o.geometry && !gs.has(o.geometry)) {
        gs.add(o.geometry);
        for (const a of Object.values(o.geometry.attributes))
          geometryBytes += a.array.byteLength;
        if (o.geometry.index)
          geometryBytes += o.geometry.index.array.byteLength;
      }
      for (const m of [o.material].flat().filter(Boolean))
        for (const t of Object.values(m)) {
          if (t?.isTexture && !ts.has(t)) {
            ts.add(t);
            const im = t.image;
            textureBytesEstimate +=
              ((im?.width || 0) * (im?.height || 0) * 4 * 4) / 3;
          }
        }
    });
    return {
      geometryBytes,
      textureBytesEstimate,
      note: "CPU attribute bytes and uncompressed RGBA mip estimate; not driver GPU allocation. Shader depth texture is counted separately in report.",
    };
  });
  assert.deepEqual(report.errors, []);
} finally {
  await writeFile(
    path.join(out, "webgl-report.json"),
    JSON.stringify(report, null, 2),
  );
  await browser?.close();
  await server.close();
}
console.log("Railay WebGL QA passed");
