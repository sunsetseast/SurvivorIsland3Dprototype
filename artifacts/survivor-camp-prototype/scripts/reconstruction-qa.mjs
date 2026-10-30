/** Test-instrumented production build; actual Player boom and WebGL. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { build, preview } from "vite";
import { chromium } from "playwright";
const label = process.env.ART_PHASE || "after",
  out = path.resolve(
    process.env.ART_EVIDENCE ||
      `../../docs/tonsai-reconstruction/evidence/${label}`,
  );
await mkdir(out, { recursive: true });
const port = Number(process.env.ART_PORT || "5198");
process.env.PORT = String(port);
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
  preview: { host: "127.0.0.1", port, strictPort: true },
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
    "Minified production build with test-only read bridge; real Chromium ANGLE SwiftShader, 1536x620 DPR1 touch viewport, native Player boom. Fixed 60Hz gallery simulation. Host timings are not device/FPS measurements.",
  browser: browser.version(),
  errors: [],
  samples: [],
  poses: [],
  checks: [],
};
const page = await browser.newPage({
  viewport: { width: 1536, height: 620 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});
page.setDefaultTimeout(120000);
page.on("pageerror", (e) => report.errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error" && !m.text().startsWith("Failed to load resource"))
    report.errors.push(m.text());
});
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
  ["west-beach", -52, -13, -2.72, 0.1],
  ["shelter", 12, -32, 0, 0.13],
  ["shelter-from-fire", -11, -28, -1.06, 0.22],
  ["shelter-interior", 12, -44, Math.PI, 0.08],
  ["communal-camp", -29, -27, -1.1, 0.34],
  ["fire-pit", -14, -25, -2.7, 0.15],
  ["camp-edge", -5, -12, Math.PI, 0.1],
  ["first-trail", 26, -9, Math.PI, 0.1],
  ["deep-jungle", 53, 36, Math.PI, 0.1],
  ["spring", 104, 36, -1.4, 0.18],
  ["limestone-approach", -25, 75, Math.PI, 0.05],
  ["cliff-base", -17, 91, Math.PI, 0.13],
  ["cave-entrance", 11, 94, Math.PI, 0.08],
  ["cave-interior", 11, 104, Math.PI, 0.08],
  ["ancient-tree", 38, 5, -1.5, 0.1],
  ["fallen-giant", 63, 59, 0, 0.3],
  ["shoreline", -50, 12, 2.1, 0.22],
  ["ocean", -51, 0, Math.PI / 2, 0.13],
  ["forest-floor", 53, 36, Math.PI, 0.78],
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
    await page.goto(`http://127.0.0.1:${port}/?quality=${quality}&devTravel=1`);
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
        habitatBatches: (() => {
          const batches = [];
          s.scene.traverse((o) => {
            if (o.name === "habitat-instance-batch")
              batches.push({
                mesh: o.geometry.name,
                count: o.count,
                triangles:
                  ((o.geometry.index?.count ||
                    o.geometry.attributes.position.count) /
                    3) *
                  o.count,
              });
          });
          return batches;
        })(),
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
    const softwareFrameFinishMs =
      process.env.ART_RENDER_TIMING === "1"
        ? await page.evaluate(() => {
            const q = window.__ART_QA__,
              a = [];
            for (let i = 0; i < 3; i++) {
              const t = performance.now();
              q.render(q.s.scene, q.s.camera);
              q.s.gl.getContext().finish();
              a.push(performance.now() - t);
            }
            return a;
          })
        : [];
    report.samples.push({
      softwareFrameFinishMs,
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
      : poses.filter(
          (p) =>
            !process.env.ART_POSES ||
            process.env.ART_POSES.split(",").includes(p[0]),
        )) {
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
  if (process.env.ART_DIAGNOSTICS === "1") {
    for (const [name, x, z, azimuth] of [
      ["shelter", 12, -44, 0.5],
      ["fire", -9, -31, 1.57],
      ["edge", -5, -12, 1.57],
      ["trail", 26, -9, 0.8],
      ["deep", 53, 36, 0],
      ["spring", 104, 36, -2.3],
      ["cliff", -17, 91, 1.3],
    ]) {
      await page.evaluate(
        ({ x, z }) => (window.__ART_QA__.io.dbg.teleportRequested = { x, z }),
        { x, z },
      );
      await advance(90);
      const eye = await page.evaluate(
        ({ x, z, azimuth }) => {
          const q = window.__ART_QA__,
            s = q.s,
            T = q.T;
          const y = q.world.groundHeight(x, z) + 1.65;
          const pose = () => {
            s.camera.position.set(x, y, z);
            s.camera.lookAt(
              x + Math.sin(azimuth) * 10,
              y + 0.1,
              z + Math.cos(azimuth) * 10,
            );
            s.camera.updateMatrixWorld();
          };
          // The Player and asynchronously mounted instance batches can register
          // in either order. Every callback must see the inspection camera.
          const callbacks = s.internal.subscribers.map((sub) => [
            sub.ref,
            sub.ref.current,
          ]);
          for (const [ref, fn] of callbacks)
            ref.current = (...args) => {
              pose();
              return fn(...args);
            };
          s.gl.render = () => {};
          try {
            for (let i = 0; i < 45; i++) s.advance((q.clock += 1 / 60), false);
          } finally {
            for (const [ref, fn] of callbacks) ref.current = fn;
            s.gl.render = q.render;
          }
          pose();
          q.render(s.scene, s.camera);
          const foliage = [];
          s.scene.traverseVisible((o) => {
            if (
              o.isMesh &&
              (o.userData.visualFoliage ||
                (o.isInstancedMesh &&
                  [o.material].flat().some((m) => m.alphaTest >= 0.3)))
            )
              foliage.push(o);
          });
          const distances = [];
          for (let i = 0; i < 13; i++) {
            const a = azimuth + (i / 12 - 0.5) * 1.4;
            const ray = new T.Raycaster(
              new T.Vector3(x, y, z),
              new T.Vector3(Math.sin(a), 0, Math.cos(a)),
              0.5,
              45,
            );
            const hit = ray.intersectObjects(foliage, false)[0];
            distances.push(hit?.distance ?? null);
          }
          return {
            camera: s.camera.position.toArray(),
            heading: azimuth,
            distances,
            blockedFraction: distances.filter((d) => d !== null).length / 13,
            method:
              "Inspection camera applied before every frame subscriber, including late-mounted foliage culling. Eye-height mesh rays do not test texture alpha and supplement visual inspection; not a device result.",
          };
        },
        { x, z, azimuth },
      );
      report.checks.push({ diagnosticEye: name, ...eye });
      await page.screenshot({
        path: `${out}/eye-${name}.jpg`,
        type: "jpeg",
        quality: 91,
      });
      console.log("EYE", name, eye.blockedFraction);
    }
    await page.evaluate(() => {
      const q = window.__ART_QA__,
        s = q.s;
      const pose = () => {
        s.camera.fov = 60;
        s.camera.far = 600;
        s.camera.updateProjectionMatrix();
        s.camera.position.set(30, 180, 40);
        s.camera.lookAt(30, 0, 30);
        s.camera.updateMatrixWorld();
      };
      const callbacks = s.internal.subscribers.map((sub) => [
        sub.ref,
        sub.ref.current,
      ]);
      for (const [ref, fn] of callbacks)
        ref.current = (...args) => {
          pose();
          return fn(...args);
        };
      s.gl.render = () => {};
      try {
        for (let i = 0; i < 45; i++) s.advance((q.clock += 1 / 60), false);
      } finally {
        for (const [ref, fn] of callbacks) ref.current = fn;
        s.gl.render = q.render;
      }
      pose();
      q.render(s.scene, s.camera);
    });
    await page.screenshot({
      path: `${out}/overview.jpg`,
      type: "jpeg",
      quality: 91,
    });
  }
  assert.deepEqual(report.errors, []);
  report.result = "PASS";
} catch (e) {
  report.result = "FAIL";
  report.failure = e.stack;
  throw e;
} finally {
  await writeFile(
    `${out}/report${process.env.ART_QUALITY ? "-" + process.env.ART_QUALITY : ""}.json`,
    JSON.stringify(report, null, 2),
  );
  await browser.close();
  await new Promise((r) => server.httpServer.close(r));
}
