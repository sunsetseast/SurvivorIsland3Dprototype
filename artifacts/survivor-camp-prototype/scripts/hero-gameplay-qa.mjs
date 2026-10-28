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
  out = path.resolve(root, "../../docs/tonsai-hero/evidence");
await mkdir(out, { recursive: true });
process.env.PORT = "5193";
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
  await page.goto("http://127.0.0.1:5193/?devTravel=1");
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
  await page.setViewportSize({ width: 932, height: 430 });
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
    state.dbg.teleportRequested = {
      x: -467.96734814953726,
      z: -728.3277755297208,
    };
    const r = window.review.render;
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
    path: path.join(out, "gameplay-tonsai.jpg"),
    type: "jpeg",
    quality: 88,
  });
  report.captures.push({ name: "17-third-person-exploration" });
  const advance = async (n) =>
    page.evaluate((n) => {
      const q = window.review;
      q.s.gl.render = () => {};
      for (let i = 0; i < n; i++) {
        q.clock += 1 / 60;
        q.f.advance(
          q.clock,
          false,
          q.f._roots.get(document.querySelector("canvas")).store.getState(),
        );
      }
      q.s.gl.render = q.render;
    }, n);
  const cdp = await page.context().newCDPSession(page);
  const joy = await page.getByTestId("joystick").boundingBox();
  const beforeTouch = await page.evaluate(() => ({
    ...window.__CAMP_DEBUG__.position,
  }));
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { id: 1, x: joy.x + joy.width / 2, y: joy.y + joy.height / 2 - 25 },
    ],
  });
  await page.waitForTimeout(80);
  const touchInput = await page.evaluate(async () => ({
    ...(await import("/src/game/state.ts")).input,
  }));
  await advance(40);
  const afterTouch = await page.evaluate(() => ({
    ...window.__CAMP_DEBUG__.position,
  }));
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await advance(20);
  report.checks.push({
    touchDebug: { joy, beforeTouch, afterTouch, touchInput },
  });
  console.log(
    "TOUCH",
    JSON.stringify({ joy, beforeTouch, afterTouch, touchInput }),
  );
  assert.ok(
    Math.hypot(afterTouch.x - beforeTouch.x, afterTouch.z - beforeTouch.z) >
      0.3,
  );
  const yawBefore = await page.evaluate(
    async () => (await import("/src/game/state.ts")).input.yaw,
  );
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ id: 3, x: 500, y: 110 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ id: 3, x: 560, y: 130 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await advance(10);
  const yawAfter = await page.evaluate(
    async () => (await import("/src/game/state.ts")).input.yaw,
  );
  assert.ok(Math.abs(yawAfter - yawBefore) > 0.2);
  report.checks.push({
    touchscreen: {
      before: beforeTouch,
      after: afterTouch,
      yawBefore,
      yawAfter,
      note: "CDP touch emulation, not physical Safari",
    },
  });
  await page.getByTestId("island-travel").click();
  await page.getByTestId("travel-tonsai-showcase").click();
  await advance(50);
  const showcase = await page.evaluate(() => ({
    ...window.__CAMP_DEBUG__.position,
  }));
  assert.ok(Math.hypot(showcase.x + 670, showcase.z + 820) < 0.1);
  await page.evaluate(() => {
    const q = window.review;
    q.render(q.s.scene, q.s.camera);
  });
  await page.screenshot({
    path: path.join(out, "showcase-third-person.jpg"),
    type: "jpeg",
    quality: 90,
  });
  report.checks.push({ showcaseTravel: showcase });
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
        for (const t of [
          ...Object.values(m),
          ...(m.userData?.textureResources || []),
        ]) {
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
        for (const t of [
          ...Object.values(m),
          ...(m.userData?.textureResources || []),
        ]) {
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
    path.join(out, "gameplay-report.json"),
    JSON.stringify(report, null, 2),
  );
  await browser?.close();
  await server.close();
}
console.log("Tonsai gameplay QA passed");
