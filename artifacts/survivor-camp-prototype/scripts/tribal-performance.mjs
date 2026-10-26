// Compare the SAME camera/frustum and viewport on baseline and head checkouts.
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const output = path.resolve(
  root,
  process.env.TRIBAL_EVIDENCE || "../../docs/tribal-council/polish-evidence",
);
await mkdir(output, { recursive: true });
process.env.PORT = "5178";
process.env.BASE_PATH = "/";
const server = await createServer({
  configFile: path.join(root, "vite.config.ts"),
  server: { host: "127.0.0.1", hmr: false, watch: null },
});
await server.listen();
let browser;
const report = {
  renderer: "Chromium SwiftShader; physical iPhone Safari not tested",
  method:
    "Eight synchronous GPU readback samples per viewport, shadows refreshed on samples 0 and 5. Identical fixed production-camera composition on both commits. CPU/software renderer timing is not device FPS.",
  camera: { position: [0.705, 3.69, 16.03], target: [0, 1.85, 9] },
  performance: [],
  errors: [],
};
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
    viewport: { width: 1280, height: 800 },
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  page.on("pageerror", (e) => report.errors.push(e.message));
  await page.goto("http://127.0.0.1:5178");
  await page.getByTestId("explore-tribal").click();
  await page.waitForFunction(() => window.__CAMP_DEBUG__?.tribalFrames > 2);
  await page.getByTestId("skip-tribal-intro").click();
  await page.getByTestId("stand-and-explore").click();
  await page.evaluate(async () => {
    const f = await import("/node_modules/.vite/deps/@react-three_fiber.js"),
      io = await import("/src/game/state.ts");
    const store = f._roots.get(document.querySelector("canvas")).store,
      s = store.getState();
    s.setFrameloop("never");
    const render = s.gl.render.bind(s.gl);
    s.gl.render = () => {};
    let time = s.clock.elapsedTime;
    const advance = (n) => {
      for (let i = 0; i < n; i++)
        f.advance((time += 1 / 30), false, store.getState());
    };
    window.__perf = { s, render, io, advance };
    io.dbg.teleportRequested = { x: 0, z: 9 };
    advance(90);
  });
  for (const viewport of [
    { width: 375, height: 812 },
    { width: 430, height: 932 },
    { width: 844, height: 390 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(250);
    const measured = await page.evaluate((camera) => {
      const { s, render } = window.__perf;
      s.camera.position.set(...camera.position);
      s.camera.lookAt(...camera.target);
      s.camera.updateMatrixWorld();
      s.gl.shadowMap.autoUpdate = false;
      const samplesMs = [];
      const gl = s.gl.getContext();
      // Warm shaders before measuring.
      s.gl.shadowMap.needsUpdate = true;
      render(s.scene, s.camera);
      for (let i = 0; i < 8; i++) {
        s.gl.shadowMap.needsUpdate = i % 5 === 0;
        const start = performance.now();
        render(s.scene, s.camera);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
        samplesMs.push(performance.now() - start);
      }
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      return {
        samplesMs,
        calls: s.gl.info.render.calls,
        triangles: s.gl.info.render.triangles,
        buffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
        renderer: ext
          ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
          : gl.getParameter(gl.RENDERER),
      };
    }, report.camera);
    report.performance.push({ viewport, ...measured });
    const name =
      viewport.width === 844
        ? "11-iphone-landscape"
        : "viewport-" + viewport.width;
    await page.screenshot({
      path: path.join(output, name + ".jpg"),
      type: "jpeg",
      quality: 91,
    });
    console.log(viewport, measured.calls, measured.triangles);
  }
} finally {
  await writeFile(
    path.join(output, "render-benchmark.json"),
    JSON.stringify(report, null, 2),
  );
  await browser?.close();
  await server.close();
}
