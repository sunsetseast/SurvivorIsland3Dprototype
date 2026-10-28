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
  out = path.resolve(
    root,
    `../../docs/tonsai-hero/evidence/${process.env.TONSAI_PHASE || "after"}`,
  );
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
    "Chrome 142 headless shell / ANGLE SwiftShader, host software WebGL; physical iPhone Safari UNVERIFIED",
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
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 }),
  );
  await page.goto("http://127.0.0.1:5195/");
  const enter = Date.now();
  await page.getByTestId("explore-railay").click();
  await page.waitForFunction(() => window.__RAILAY__);
  await page.waitForFunction(() =>
    window.__RAILAY__.scene.getObjectByName("railay-geology-ready"),
  );
  if (process.env.TONSAI_PHASE !== "before")
    await page.waitForFunction(() =>
      window.__RAILAY__.scene.getObjectByName("tonsai-karsts-ready"),
    );
  await page.waitForFunction(() => {
    let ready = false;
    window.__RAILAY__.scene.traverse((o) => {
      if (o.material?.name === "tonsai-mineral-limestone") {
        const maps = [...(o.material.userData.textureResources || [])];
        if (maps.filter((t) => t.image?.width === 1024).length >= 2)
          ready = true;
      }
    });
    return ready;
  });
  if (process.env.TONSAI_PHASE !== "before")
    await page.waitForFunction(
      () =>
        window.__RAILAY__.scene.getObjectByName("tonsai-tropical-forest")
          ?.userData.assetsReady,
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
  if (!process.env.TONSAI_VIEWS)
    process.env.TONSAI_VIEWS =
      "05-cliff-hero,11-understory,12-palms,16-iphone-landscape,19-benchmark,20-benchmark-low";
  const views = JSON.parse(
    await readFile(path.join(root, "scripts/tonsai-views.json"), "utf8"),
  );
  async function frameCamera(view, render = false) {
    return page.evaluate(
      ({ view, render }) => {
        const q = window.review,
          f = q.f,
          s = f._roots.get(document.querySelector("canvas")).store.getState();
        q.s = s;
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
        // Keep every LOD callback on the captured view even when the player or
        // overview controller normally owns the camera in another subscriber.
        const callbacks = s.internal.subscribers.map((sub) => ({
          ref: sub.ref,
          fn: sub.ref.current,
        }));
        const lock = () => {
          s.camera.position.set(...view.p);
          s.camera.lookAt(...view.t);
          s.camera.updateMatrixWorld();
        };
        for (const { ref, fn } of callbacks)
          ref.current = (state, dt, xr) => {
            lock();
            fn(state, 0.8, xr);
            lock();
          };
        try {
          f.advance(q.clock, false, s);
        } finally {
          for (const { ref, fn } of callbacks) ref.current = fn;
        }
        s.gl.render = q.render;
      },
      { view, render },
    );
  }
  async function shot(name, view) {
    for (let i = 0; i < 4; i++) {
      await frameCamera(view);
      await page.waitForTimeout(40);
    }
    const stats = await frameCamera(view, true);
    stats.breakdown = await page.evaluate(() => {
      const q = window.review,
        groups = {};
      q.s.scene.traverse((o) => {
        if (!o.isMesh) return;
        o.onBeforeRender = () => {
          let key = o.name || o.parent?.name || "unnamed";
          if (key.startsWith("terrain-")) key = "terrain";
          const count =
            ((o.geometry.index?.count || o.geometry.attributes.position.count) /
              3) *
            (o.isInstancedMesh ? o.count : 1);
          groups[key] = (groups[key] || 0) + count;
        };
      });
      q.render(q.s.scene, q.s.camera);
      q.s.scene.traverse((o) => {
        if (o.isMesh) o.onBeforeRender = () => {};
      });
      return Object.fromEntries(
        Object.entries(groups)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20),
      );
    });
    await page.screenshot({
      path: path.join(out, `${name}.jpg`),
      type: "jpeg",
      quality: 88,
    });
    if (name === "19-benchmark" && process.env.TONSAI_PHASE !== "before") {
      assert.equal(stats.quality, "high");
      assert.ok(
        stats.triangles < 1_241_579,
        "Hero high must stay below the matched main triangle budget",
      );
    }
    if (name === "20-benchmark-low" && process.env.TONSAI_PHASE !== "before") {
      assert.equal(stats.quality, "low");
      assert.ok(
        stats.triangles < 514_783,
        "Hero low must stay below the matched main triangle budget",
      );
      assert.ok(
        Object.keys(stats.breakdown).some((k) =>
          k.startsWith("botanical-canopy"),
        ),
        "Low mode must retain the actual forest",
      );
    }
    if (name === "19-benchmark" || name === "20-benchmark-low") {
      stats.synchronizedHostFrameMs = await page.evaluate(() => {
        const q = window.review,
          values = [];
        for (let i = 0; i < 3; i++) {
          const t = performance.now();
          q.render(q.s.scene, q.s.camera);
          q.s.gl.getContext().finish();
          values.push(performance.now() - t);
        }
        return values;
      });
    }
    report.captures.push({ name, view, ...stats });
    console.log(name, stats.calls, stats.triangles);
    return stats;
  }
  for (const [name, v] of Object.entries(views)) {
    if (
      process.env.TONSAI_VIEWS &&
      !process.env.TONSAI_VIEWS.split(",").includes(name)
    )
      continue;
    if (v.low) {
      await page.getByTestId("island-quality").click();
      await page.waitForTimeout(100);
    }
    if (v.mobile) await page.setViewportSize({ width: 932, height: 430 });
    if (v.player) {
      await page.evaluate(() => window.__RAILAY__.teleport("tonsai"));
      await page.getByTestId("island-overview").click();
      await page.evaluate(() => {
        const q = window.review;
        q.s.gl.render = q.render;
        q.s.setFrameloop("always");
      });
      await page.waitForTimeout(1500);
      await page.screenshot({
        path: path.join(out, `${name}.jpg`),
        type: "jpeg",
        quality: 90,
      });
      await page.getByTestId("island-overview").click();
      continue;
    }
    await shot(name, v);
    if (v.mobile) await page.setViewportSize({ width: 1280, height: 900 });
    if (v.low) await page.getByTestId("island-quality").click();
  }
  const high = report.captures.find((c) => c.name === "01-aerial"),
    low = report.captures.find((c) => c.name === "17-low-quality");
  if (high && low)
    assert.ok(
      low.triangles < high.triangles,
      "Low mode must reduce actual submitted geometry",
    );
  report.resourceStats = await page.evaluate(() => {
    const gs = new Set(),
      ts = new Set();
    let geometryBytes = 0,
      textureBytesEstimate = 0;
    window.__RAILAY__.scene.traverse((o) => {
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
        ])
          if (t?.isTexture && !ts.has(t)) {
            ts.add(t);
            textureBytesEstimate +=
              ((t.image?.width || 0) * (t.image?.height || 0) * 4 * 4) / 3;
          }
    });
    return {
      geometryBytes,
      textureBytesEstimate,
      note: "CPU attributes; uncompressed mip estimate, not driver allocation",
    };
  });
  if (report.errors.length) throw new Error(JSON.stringify(report.errors));
} finally {
  await writeFile(
    path.join(out, "webgl-report.json"),
    JSON.stringify(report, null, 2),
  );
  await browser?.close();
  await server.close();
}
console.log("Tonsai visual capture passed");
