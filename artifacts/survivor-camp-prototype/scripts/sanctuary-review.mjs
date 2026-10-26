// Actual application/WebGL captures and fixed-frustum comparison; never Blender renders.
import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(
  process.env.SANCTUARY_ROOT || fileURLToPath(new URL("..", import.meta.url)),
);
const output = path.resolve(
  process.env.SANCTUARY_OUTPUT ||
    path.join(root, "../../docs/tribal-council/blender-evidence"),
);
await mkdir(output, { recursive: true });
process.env.PORT = "5181";
process.env.BASE_PATH = "/";
const server = await createServer({
  configFile: path.join(root, "vite.config.ts"),
  server: { host: "127.0.0.1", hmr: false, watch: null },
});
await server.listen();
const report = {
  renderer: "Chrome 142 / SwiftShader; not iPhone Safari",
  captures: [],
  errors: [],
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
    viewport: { width: 1280, height: 800 },
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  page.setDefaultTimeout(120000);
  page.on("pageerror", (e) => report.errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") report.errors.push(m.text());
  });
  await page.goto(
    "http://127.0.0.1:5181/" +
      (process.env.SANCTUARY_LOW ? "?quality=low" : ""),
  );
  await page.getByTestId("explore-tribal").click();
  await page.waitForFunction(() => window.__CAMP_DEBUG__?.tribalFrames > 2);
  await page.getByTestId("skip-tribal-intro").click();
  await page.getByTestId("stand-and-explore").click();
  await page.evaluate(async () => {
    const f = await import("/node_modules/.vite/deps/@react-three_fiber.js");
    const s = f._roots.get(document.querySelector("canvas")).store.getState();
    s.setFrameloop("never");
    window.__assetReview = { s, render: s.gl.render.bind(s.gl) };
  });
  if (!process.env.SANCTUARY_BASELINE)
    await page.waitForFunction(() =>
      window.__assetReview.s.scene.getObjectByName("sanctuary-assets-ready"),
    );
  const cameras = await page.evaluate(
    async () => (await import("/src/game/tribal/layout.ts")).TRIBAL.cameras,
  );
  const shots = {
    arrival: cameras.entrance,
    sanctuary: cameras.council,
    seating: cameras.hostEye,
    jeff: cameras.host,
    "voting-roof": { position: [-23, 6, 29], target: [-34, 4, 18] },
    "voting-interior": cameras.vote,
    "voting-approach": cameras.votingApproach || {
      position: [-22, 2.3, 15],
      target: [-31, 2, 17],
    },
    exit: cameras.lastWalk || { position: [16, 2, 9], target: [24, 2, 9] },
    guardian: { position: [-6.5, 2.7, -10], target: [-7.5, 1.8, -16.3] },
  };
  const names = process.env.SANCTUARY_BASELINE
    ? ["sanctuary", "guardian", "voting-roof"]
    : process.env.SANCTUARY_LOW
      ? ["sanctuary", "voting-roof"]
      : Object.keys(shots);
  for (const name of names) {
    const data = await page.evaluate((camera) => {
      const { s, render } = window.__assetReview;
      s.camera.position.set(...camera.position);
      s.camera.lookAt(...camera.target);
      s.camera.updateMatrixWorld();
      s.gl.shadowMap.autoUpdate = false;
      s.gl.shadowMap.needsUpdate = true;
      render(s.scene, s.camera);
      const gl = s.gl.getContext();
      const samples = [];
      for (let i = 0; i < 3; i++) {
        const t = performance.now();
        render(s.scene, s.camera);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
        samples.push(performance.now() - t);
      }
      let meshes = 0,
        instances = 0,
        lights = 0,
        shadowLights = 0;
      s.scene.traverse((o) => {
        if (o.isMesh) meshes++;
        if (o.isInstancedMesh) instances += o.count;
        if (o.isLight) {
          lights++;
          if (o.castShadow) shadowLights++;
        }
      });
      return {
        calls: s.gl.info.render.calls,
        triangles: s.gl.info.render.triangles,
        textures: s.gl.info.memory.textures,
        geometries: s.gl.info.memory.geometries,
        meshes,
        instances,
        lights,
        shadowLights,
        samplesMs: samples,
      };
    }, shots[name]);
    await page.screenshot({
      path: path.join(output, name + ".jpg"),
      type: "jpeg",
      quality: 90,
    });
    report.captures.push({
      name,
      viewport: [1280, 800],
      camera: shots[name],
      ...data,
    });
    console.log("Captured", name, data.calls, data.triangles);
  }
  if (!process.env.SANCTUARY_BASELINE && !process.env.SANCTUARY_LOW)
    for (const viewport of [
      { width: 375, height: 812 },
      { width: 430, height: 932 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(200);
      await page.evaluate((camera) => {
        const { s, render } = window.__assetReview;
        s.camera.position.set(...camera.position);
        s.camera.lookAt(...camera.target);
        s.camera.updateMatrixWorld();
        render(s.scene, s.camera);
      }, cameras.council);
      await page.screenshot({
        path: path.join(output, "mobile-" + viewport.width + ".jpg"),
        type: "jpeg",
        quality: 90,
      });
      report.captures.push({ name: "mobile-" + viewport.width, viewport });
    }
  if (!process.env.SANCTUARY_BASELINE) {
    const result = await page.evaluate(() => {
      const { s } = window.__assetReview;
      const root = s.scene.getObjectByName("blender-sanctuary-kit");
      const assets = new Set();
      root.traverse((o) => {
        if (o.isInstancedMesh) assets.add(o.name.split(":")[0]);
      });
      return { assets: [...assets], quality: root.userData.quality };
    });
    report.checks.push(result);
    if (result.assets.length < 7)
      throw new Error("Incomplete Blender kit integration");
  }
  if (report.errors.length) throw new Error(JSON.stringify(report.errors));
} finally {
  await writeFile(
    path.join(output, "asset-review.json"),
    JSON.stringify(report, null, 2),
  );
  await browser?.close();
  await server.close();
}
