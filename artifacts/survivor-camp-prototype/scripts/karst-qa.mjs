/** Test-instrumented production build; actual Player boom and WebGL. */
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { build, preview } from "vite";
import { chromium } from "playwright";
const label = process.env.ART_PHASE || "after",
  out = path.resolve(
    process.env.ART_EVIDENCE || `../../docs/tonsai-karst/evidence/${label}`,
  );
await mkdir(out, { recursive: true });
const port = Number(process.env.ART_PORT || "5201");
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
      outDir: `../../generated-artifacts/karst-${label}`,
      emptyOutDir: true,
    },
  });
if (process.env.ART_BUILD_ONLY === "1") process.exit(0);
const server = await preview({
  configFile: "vite.config.ts",
  build: { outDir: `../../generated-artifacts/karst-${label}` },
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
  ["south-beach", -50, 42, Math.PI, 0.0],
  ["north-offshore", -50, 42, 0, 0.0],
  ["cliff-beside", -17, 91, Math.PI, 0.13],
  ["cliff-approach", -25, 75, Math.PI, 0.05],
  ["waterline", -41, 83, -2.3, 0.0],
  ["distant-silhouette", -50, 5, Math.PI, -0.1],
  ["jungle-limestone", 5, 75, Math.PI, 0.05],
  ["cave-entrance", 11, 94, Math.PI, 0.08],
  ["camp-limestone", -29, -27, -2.3, 0.0],
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
    await page.goto(
      `http://127.0.0.1:${port}/?quality=${quality}&devTravel=1${process.env.ART_PRESET ? "&atmosphere=" + process.env.ART_PRESET : ""}`,
    );
    await page.getByTestId("explore-island").waitFor({ state: "visible" });
    const documentToMenuMs = Date.now() - navigationStart;
    const start = Date.now();
    await page.getByTestId("explore-island").click();
    await page.waitForFunction(
      () =>
        window.__WORLD_RENDER__?.scene.getObjectByName("camp-assets-ready") &&
        window.__CAMP_DEBUG__?.position.y > 0 &&
        (!window.__WORLD_RENDER__.scene.getObjectByName(
          "andaman-tropical-sky",
        ) ||
          window.__WORLD_RENDER__.scene.getObjectByName("andaman-tropical-sky")
            .material.userData.cloudReady === true),
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
            ...Object.values(m.uniforms || {}).map((u) => u.value),
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
        renderer: {
          toneMapping: s.gl.toneMapping,
          exposure: s.gl.toneMappingExposure,
          outputColorSpace: s.gl.outputColorSpace,
          msaa: s.gl.getContext().getParameter(s.gl.getContext().SAMPLES),
        },
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
            for (let i = 0; i < 12; i++) {
              const t = performance.now();
              q.render(q.s.scene, q.s.camera);
              q.s.gl.getContext().finish();
              a.push(performance.now() - t);
            }
            return a;
          })
        : [];
    const costDiagnostics =
      process.env.ART_COST === "1"
        ? await page.evaluate(() => {
            const q = window.__ART_QA__,
              s = q.s,
              sky = s.scene.getObjectByName("andaman-tropical-sky");
            const materials = new Set();
            s.scene.traverse((o) => {
              for (const m of [o.material].flat().filter(Boolean))
                if (m.alphaToCoverage) materials.add(m);
            });
            const probe = () => {
              for (let i = 0; i < 5; i++) {
                q.render(s.scene, s.camera);
                s.gl.getContext().finish();
              }
              const values = [];
              for (let i = 0; i < 30; i++) {
                const t = performance.now();
                q.render(s.scene, s.camera);
                s.gl.getContext().finish();
                values.push(performance.now() - t);
              }
              return values;
            };
            const result = { defaultWarm: probe() };
            if (sky) {
              sky.visible = false;
              result.skyHidden = probe();
              sky.visible = true;
            }
            for (const m of materials) {
              m.alphaToCoverage = false;
              m.needsUpdate = true;
            }
            result.coverageDisabled = probe();
            for (const m of materials) {
              m.alphaToCoverage = true;
              m.needsUpdate = true;
            }
            result.restoredDefault = probe();
            return result;
          })
        : undefined;
    report.samples.push({
      costDiagnostics,
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
    for (const [name, x, z, yaw, pitch] of process.env.ART_PROFILE_ONLY ===
      "1" || process.env.ART_INSPECTION_ONLY === "1"
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
      console.log("RENDER", quality, name);
      await advance(90, true);
      report.poses.push({
        quality,
        name,
        x,
        z,
        yaw,
        pitch,
        camera: await page.evaluate(() => window.__CAMP_DEBUG__.camera),
        render: await page.evaluate(() => window.__WORLD_RENDER__.stats()),
      });
      await page.screenshot({
        path: `${out}/${quality}-${name}.jpg`,
        type: "jpeg",
        quality: 91,
      });
      console.log("CAPTURE", quality, name);
    }
    if (process.env.ART_PROFILE_ONLY !== "1")
      for (const [name, position, target] of [
        ["coast-eye", [-62, 2.4, 77], [-22, 23, 108]],
        ["elevated-overview", [20, 240, 45], [20, 0, 45]],
      ].filter(
        (p) =>
          !process.env.ART_INSPECTION_NAMES ||
          process.env.ART_INSPECTION_NAMES.split(",").includes(p[0]),
      )) {
        const camera = await page.evaluate(
          ({ name, position, target }) => {
            const q = window.__ART_QA__,
              s = q.s;
            const previous = { far: s.camera.far, fov: s.camera.fov };
            const pose = () => {
              s.camera.far = 600;
              s.camera.fov = 55;
              s.camera.updateProjectionMatrix();
              s.camera.position.set(...position);
              s.camera.lookAt(...target);
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
              for (let i = 0; i < 45; i++)
                s.advance((q.clock += 1 / 60), false);
            } finally {
              for (const [ref, fn] of callbacks) ref.current = fn;
              s.gl.render = q.render;
            }
            pose();
            q.render(s.scene, s.camera);
            s.gl.getContext().finish();
            // Restore projection only after the capture, in the next scene navigation.
            return {
              position: s.camera.position.toArray(),
              target,
              previous,
              inspection: true,
            };
          },
          { name, position, target },
        );
        report.poses.push({ quality, name, camera });
        await page.screenshot({
          path: `${out}/${quality}-${name}.jpg`,
          type: "jpeg",
          quality: 91,
        });
        console.log("CAPTURE", quality, name);
      }
  }
  assert.deepEqual(report.errors, []);
  report.result = "PASS";
} catch (e) {
  report.result = "FAIL";
  report.failure = e.stack;
  throw e;
} finally {
  if (process.env.ART_APPEND === "1" && report.result === "PASS") {
    const previous = JSON.parse(await readFile(`${out}/report.json`, "utf8"));
    report.samples = previous.samples;
    report.poses = [
      ...previous.poses.filter(
        (p) =>
          !report.poses.some(
            (q) => q.name === p.name && q.quality === p.quality,
          ),
      ),
      ...report.poses,
    ];
    report.checks = [...previous.checks, ...report.checks];
    report.method +=
      " Elevated overview recaptured with wider identical inspection framing; original native Player captures retained.";
  }
  await writeFile(
    `${out}/report${process.env.ART_QUALITY ? "-" + process.env.ART_QUALITY : ""}.json`,
    JSON.stringify(report, null, 2),
  );
  await browser.close();
  await new Promise((r) => server.httpServer.close(r));
}
