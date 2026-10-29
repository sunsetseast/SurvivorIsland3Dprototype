/** Test-instrumented production build; actual Player boom and WebGL. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { build, preview } from "vite";
import { chromium } from "playwright";
const label = process.env.ART_PHASE || "after",
  out = path.resolve(
    process.env.ART_EVIDENCE ||
      `../../docs/tonsai-refinement/evidence/${label}`,
  );
await mkdir(out, { recursive: true });
process.env.PORT = "5197";
process.env.BASE_PATH = "/";
const instrument = {
  name: "test-only-production-bridge",
  enforce: "pre",
  transform(src, id) {
    const append = (code) =>
      src +
      '\nif(typeof window!=="undefined"){window.__ART_QA__??={};' +
      code +
      "}";
    if (id.endsWith("/game/world.ts"))
      return append(
        "window.__ART_QA__.world={SPAWN,groundHeight,isWalkable,movePlayer};",
      );
    if (id.endsWith("/game/environment/Landmarks.tsx"))
      return append("window.__ART_QA__.T=T;");
    if (id.endsWith("/game/state.ts"))
      return append("window.__ART_QA__.io={dbg,input,clearInput};");
    if (id.endsWith("/game/CampRuntime.ts"))
      return append(
        "window.__ART_QA__.camp=camp;window.__ART_QA__.spots=SPOTS;",
      );
    if (
      id.endsWith("/game/navigation.ts") &&
      !src.includes("navigation-hydrate")
    )
      return src
        .replace(
          "constructor(readonly step = 1) {",
          "constructor(readonly step = 1) { const qaStart=performance.now();",
        )
        .replace(
          "staticGraphs.set(step, { nodes: this.nodes, grid: this.grid });",
          'staticGraphs.set(step, { nodes: this.nodes, grid: this.grid }); if(typeof window!=="undefined") (window.__ART_STAGES__??={}).navigationMs=performance.now()-qaStart;',
        );
  },
};
if (process.env.ART_SKIP_BUILD !== "1")
  await build({
    configFile: "vite.config.ts",
    plugins: [instrument],
    build: {
      outDir: `../../generated-artifacts/art-${label}`,
      emptyOutDir: true,
    },
  });
const server = await preview({
  configFile: "vite.config.ts",
  build: { outDir: `../../generated-artifacts/art-${label}` },
  preview: { host: "127.0.0.1", port: 5197, strictPort: true },
});
const browser = await chromium.launch({
  executablePath: process.env.CAMP_CHROMIUM,
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--single-process",
    "--no-zygote",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const report = {
  label,
  method:
    "Minified production build with test-only read bridge; real Chromium ANGLE SwiftShader, 932x430 DPR1 touch viewport, native Player boom. Fixed 60Hz gallery simulation. Host timings are not device/FPS measurements.",
  browser: browser.version(),
  errors: [],
  samples: [],
  poses: [],
  checks: [],
};
const page = await browser.newPage({
  viewport: { width: 932, height: 430 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});
page.setDefaultTimeout(120000);
page.on("pageerror", (e) => report.errors.push(e.message));
await page.addInitScript(() => {
  window.__ART_STAGES__ = {};
  window.__ART_LONGTASKS__ = [];
  new PerformanceObserver((l) =>
    window.__ART_LONGTASKS__.push(
      ...l
        .getEntries()
        .map((e) => ({ start: e.startTime, duration: e.duration })),
    ),
  ).observe({ type: "longtask", buffered: true });
});
const poses = [
  ["moss-replacement", 16, 65, Math.PI, 0.25],
  ["cliff-base", -17, 91, Math.PI, 0.13],
  ["cave-entrance", 11, 94, Math.PI, 0.08],
  ["cave-interior", 11, 104, Math.PI, 0.08],
  ["ancient-tree", 38, 5, -1.5, 0.1],
  ["fallen-giant", 63, 59, 0, 0.3],
  ["intertwined-roots", 72, 25, -1.5, 0.15],
  ["hollow-stump", 28, -8, -1.5, 0.3],
  ["strangler-stone", 95, 65, 0, 0.13],
  ["jungle-trail", -8, 57, Math.PI, 0.25],
  ["freshwater", 104, 36, -1.4, 0.33],
  ["rock-alcove", 30, 91, Math.PI, 0.25],
  ["coastal-camp", -6, -24, -0.48, 0.34],
  ["dense-forest", 53, 36, Math.PI, 0.3],
];
const advance = async (frames = 1, render = false) =>
  page.evaluate(
    ({ frames, render }) => {
      const q = window.__ART_QA__,
        s = q.s;
      s.gl.render = () => {};
      try {
        for (let i = 0; i < frames; i++) {
          q.clock = Math.max(q.clock, s.clock.elapsedTime) + 1 / 60;
          s.advance(q.clock, false);
        }
      } finally {
        s.gl.render = q.render;
      }
      if (render) q.render(s.scene, s.camera);
    },
    { frames, render },
  );
try {
  for (const quality of process.env.ART_QUALITY
    ? [process.env.ART_QUALITY]
    : ["low", "high"]) {
    const navigationStart = Date.now();
    await page.goto(`http://127.0.0.1:5197/?quality=${quality}&devTravel=1`);
    await page.getByTestId("explore-island").waitFor({ state: "visible" });
    const documentToMenuMs = Date.now() - navigationStart;
    const start = Date.now();
    await page.getByTestId("explore-island").click();
    await page.waitForFunction(
      () =>
        window.__WORLD_RENDER__?.scene.getObjectByName("camp-assets-ready") &&
        window.__CAMP_DEBUG__?.position.y > 0,
    );
    const readyMs = Date.now() - start;
    await page.evaluate(() => {
      const q = window.__ART_QA__,
        s = window.__WORLD_RENDER__.state;
      s.setFrameloop("never");
      s.clock.stop();
      s.clock.autoStart = false;
      Object.assign(q, {
        s,
        clock: s.clock.elapsedTime,
        render: s.gl.render.bind(s.gl),
      });
    });
    await advance(150, true);
    await page.evaluate(() => window.__ART_QA__.s.gl.getContext().finish());
    const stats = await page.evaluate(() => {
      const s = window.__ART_QA__.s,
        geos = new Set(),
        tex = new Set(),
        mats = new Set();
      let geometryBytes = 0,
        textureBytesEstimate = 0;
      s.scene.traverse((o) => {
        if (o.geometry && !geos.has(o.geometry)) {
          geos.add(o.geometry);
          for (const a of Object.values(o.geometry.attributes))
            geometryBytes += a.array.byteLength;
          geometryBytes += o.geometry.index?.array.byteLength || 0;
        }
        for (const m of [o.material].flat().filter(Boolean)) {
          mats.add(m);
          for (const t of [
            ...Object.values(m),
            ...(m.userData.textureResources || []),
          ])
            if (t?.isTexture && !tex.has(t)) {
              tex.add(t);
              textureBytesEstimate +=
                ((t.image?.width || 0) * (t.image?.height || 0) * 4 * 4) / 3;
            }
        }
      });
      return {
        ...window.__WORLD_RENDER__.stats(),
        geometryBytes,
        textureBytesEstimate,
        materials: mats.size,
        stages: window.__ART_STAGES__,
        longTasks: window.__ART_LONGTASKS__,
        resources: performance
          .getEntriesByType("resource")
          .filter((r) => /\.(glb|jpg|png)(\?|$)/.test(r.name))
          .map((r) => ({
            name: r.name.split("/").at(-1),
            duration: r.duration,
            bytes: r.encodedBodySize,
          })),
        camera: window.__CAMP_DEBUG__.camera,
      };
    });
    const frameIntervalsMs =
      process.env.ART_MEASURE_LIVE === "1"
        ? await page.evaluate(async () => {
            const q = window.__ART_QA__,
              s = q.s,
              values = [];
            s.clock.autoStart = true;
            s.clock.start();
            s.gl.render = (...args) => {
              q.render(...args);
              s.gl.getContext().finish();
            };
            s.setFrameloop("always");
            await new Promise((resolve) => {
              let previous;
              const tick = (t) => {
                if (previous !== undefined) values.push(t - previous);
                previous = t;
                if (values.length < 24) requestAnimationFrame(tick);
                else resolve();
              };
              requestAnimationFrame(tick);
            });
            s.setFrameloop("never");
            s.clock.stop();
            s.clock.autoStart = false;
            q.clock = s.clock.elapsedTime;
            s.gl.render = q.render;
            return values;
          })
        : [];
    report.samples.push({
      quality,
      documentToMenuMs,
      readyMs,
      ...stats,
      frameIntervalsMs,
    });
    console.log(
      "SAMPLE",
      quality,
      JSON.stringify({
        readyMs,
        calls: stats.calls,
        triangles: stats.triangles,
        stages: stats.stages,
      }),
    );
    for (const [name, x, z, yaw, pitch] of process.env.ART_PROFILE_ONLY === "1"
      ? []
      : poses) {
      await page.evaluate(
        ({ x, z, yaw, pitch }) => {
          const q = window.__ART_QA__;
          if (!q.world.isWalkable(x, z))
            throw Error("Unwalkable fixed pose " + x + "," + z);
          q.io.dbg.teleportRequested = { x, z };
          q.io.input.yaw = yaw;
          q.io.input.pitch = pitch;
        },
        { x, z, yaw, pitch },
      );
      await advance(90, true);
      report.poses.push({
        quality,
        name,
        x,
        z,
        yaw,
        pitch,
        camera: await page.evaluate(() => window.__CAMP_DEBUG__.camera),
      });
      await page.screenshot({
        path: `${out}/${quality}-${name}.jpg`,
        type: "jpeg",
        quality: 91,
      });
      console.log("CAPTURE", quality, name);
    }
  }
  if (process.env.ART_PROFILE_ONLY !== "1" && label === "after") {
    for (const [name, x, z] of [
      ["cave", 11, 104],
      ["cliff", -17, 91],
      ["ancient-tree", 38, 5],
      ["fissure", 16, 65],
    ]) {
      await page.evaluate(
        ({ x, z }) => {
          const q = window.__ART_QA__;
          q.io.dbg.teleportRequested = { x, z };
        },
        { x, z },
      );
      const samples = [];
      for (let i = 0; i < 12; i++) {
        await page.evaluate((i) => {
          const q = window.__ART_QA__;
          q.io.input.yaw = (i * Math.PI) / 6;
          q.io.input.pitch = i % 2 ? 0.42 : 0.08;
        }, i);
        await advance(90);
        samples.push(
          await page.evaluate(() => {
            const q = window.__ART_QA__,
              T = q.T,
              io = q.io.dbg,
              origin = new T.Vector3(io.x, io.y + 1.5, io.z),
              to = q.s.camera.position.clone().sub(origin),
              d = to.length(),
              ray = new T.Raycaster(origin, to.normalize(), 0.05, d + 0.1),
              objects = [];
            q.s.scene.traverseVisible((o) => {
              if (o.isMesh && o.userData.cameraBlocker) objects.push(o);
            });
            const hit = ray.intersectObjects(objects, false)[0];
            return {
              camera: q.s.camera.position.toArray(),
              distance: d,
              firstSurface: hit?.distance ?? null,
              mesh: hit?.object.name ?? null,
              clear: !hit || hit.distance >= d - 0.12,
            };
          }),
        );
      }
      assert.ok(
        samples.every((s) => s.clear),
        "Camera clips at " +
          name +
          " " +
          JSON.stringify(samples.filter((s) => !s.clear)),
      );
      report.checks.push({ cameraOrbit: name, samples });
    }
  }
  if (
    label === "after" &&
    process.env.ART_PROFILE_ONLY === "1" &&
    process.env.ART_QUALITY !== "low"
  ) {
    await page.evaluate(() => {
      const q = window.__ART_QA__,
        seen = new Set(),
        counts = { geometry: 0, material: 0, texture: 0 };
      q.s.scene.traverse((o) => {
        for (const r of [o.geometry, ...[o.material].flat()].filter(Boolean)) {
          if (seen.has(r)) continue;
          seen.add(r);
          r.addEventListener(
            "dispose",
            () => counts[r.isBufferGeometry ? "geometry" : "material"]++,
          );
          if (r.isMaterial)
            for (const t of Object.values(r))
              if (t?.isTexture && !seen.has(t)) {
                seen.add(t);
                t.addEventListener("dispose", () => counts.texture++);
              }
        }
      });
      window.__ART_DISPOSAL__ = counts;
    });
    await page.getByTestId("button-menu").click();
    await page.getByTestId("explore-island").waitFor({ state: "visible" });
    await page.waitForFunction(
      () =>
        window.__ART_DISPOSAL__.geometry > 0 &&
        window.__ART_DISPOSAL__.texture > 0,
    );
    const disposed = await page.evaluate(() => window.__ART_DISPOSAL__);
    const start = Date.now();
    await page.getByTestId("explore-island").click();
    await page.waitForFunction(() =>
      window.__WORLD_RENDER__?.scene.getObjectByName("camp-assets-ready"),
    );
    report.checks.push({
      name: "Production high scene disposal and warm reentry",
      disposed,
      reentryMs: Date.now() - start,
      stages: await page.evaluate(
        () => window.__WORLD_RENDER__.stats().environmentStages,
      ),
    });
  }
  assert.deepEqual(report.errors, []);
  report.result = "PASS";
} catch (e) {
  report.result = "FAIL";
  report.failure = e.stack;
  throw e;
} finally {
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
  await new Promise((r) => server.httpServer.close(r));
}
