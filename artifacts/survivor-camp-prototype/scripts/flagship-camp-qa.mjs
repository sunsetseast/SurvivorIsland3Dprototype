import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";
const phase = process.env.CAMP_PHASE || "after",
  out =
    process.env.FLAGSHIP_EVIDENCE ||
    `../../docs/flagship-camp/evidence/${phase}`;
await mkdir(out, { recursive: true });
process.env.PORT = "5196";
process.env.BASE_PATH = "/";
const server = await createServer({
  configFile: "vite.config.ts",
  server: { host: "127.0.0.1", hmr: false, watch: null },
});
await server.listen();
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
  method:
    "Real Chromium WebGL / ANGLE SwiftShader, 932x430 DPR1. Identical poses before/after. Manual 60Hz simulation avoids conflating software raster cost with input. Render submission wall timings are NOT GPU or iPhone FPS.",
  phase,
  browser: browser.version(),
  errors: [],
  samples: [],
  checks: [],
};
const page = await browser.newPage({
  viewport: { width: 932, height: 430 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 1,
});
page.setDefaultTimeout(120000);
page.on("pageerror", (e) => report.errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error" && !m.text().startsWith("Failed to load resource"))
    report.errors.push(m.text());
});
const advance = async (frames = 1, render = false) =>
  page.evaluate(
    ({ frames, render }) => {
      const q = window.campQA,
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
const poses = [
  ["01-main-camp", -6, -24, -0.48, 0.34],
  ["02-fire-shelter", -18, -25, -0.9, 0.28],
  ["03-beach-cliffs", -47, -27, -0.25, 0.23],
  ["04-limestone-close", -28, -54, 0, 0.08],
  ["05-canopy", -3, -4, -1.6, 0.12],
  ["06-jungle-floor", 8, 15, -1.7, 0.45],
  ["07-beach-jungle", -37, -26, -1.45, 0.38],
  ["08-water", -48, -21, 1.7, 0.28],
  ["09-npcs", -9, -23, 0, 0.33],
  ["10-private-beach", -42, -40, -0.4, 0.3],
  ["11-departure", -6, 24, Math.PI, 0.28],
  ["12-running", -26, -26, -1.55, 0.34],
];
async function sample(label) {
  await advance(1, true);
  return page.evaluate((label) => {
    const { s } = window.campQA,
      geos = new Set(),
      mats = new Set(),
      tex = new Set();
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
    const times = [];
    for (let i = 0; i < 5; i++) {
      const t = performance.now();
      s.gl.render(s.scene, s.camera);
      s.gl.getContext().finish();
      times.push(performance.now() - t);
    }
    return {
      label,
      ...window.__WORLD_RENDER__.stats(),
      sceneGeometries: geos.size,
      materials: mats.size,
      sceneTextures: tex.size,
      geometryBytes,
      textureBytesEstimate,
      softwareRenderFinishMs: times,
      position: window.__CAMP_DEBUG__.position,
      camera: window.__CAMP_DEBUG__.camera,
      resources: performance
        .getEntriesByType("resource")
        .filter((r) => /\.(glb|jpg|png)(\?|$)/.test(r.name))
        .map((r) => ({
          name: r.name.split("/").pop(),
          transferSize: r.transferSize,
          encodedBodySize: r.encodedBodySize,
          duration: r.duration,
        })),
    };
  }, label);
}
try {
  for (const quality of phase === "inspection" ? ["high"] : ["low", "high"]) {
    const start = Date.now();
    await page.goto(`http://127.0.0.1:5196/?quality=${quality}&devTravel=1`);
    await page.getByTestId("explore-island").click();
    await page.waitForFunction(
      () =>
        window.__WORLD_RENDER__?.scene.getObjectByName(
          "location-camp_tribe_a",
        ) && window.__CAMP_DEBUG__?.position.y > 0,
    );
    if (phase !== "before")
      await page.waitForFunction(() =>
        window.__WORLD_RENDER__.scene.getObjectByName("camp-assets-ready"),
      );
    await page.evaluate(async () => {
      const s = window.__WORLD_RENDER__.state;
      s.setFrameloop("never");
      s.clock.stop();
      s.clock.autoStart = false;
      window.campQA = {
        s,
        render: s.gl.render.bind(s.gl),
        clock: s.clock.elapsedTime,
        io: await import("/src/game/state.ts"),
        world: await import("/src/game/world.ts"),
        camp: (await import("/src/game/CampRuntime.ts")).camp,
        spots: (await import("/src/game/CampRuntime.ts")).SPOTS,
      };
    });
    await advance(150, true);
    report.samples.push({
      ...(await sample(`${quality} default`)),
      entryWallMs: Date.now() - start,
    });
    const selection =
      phase === "inspection" || phase === "profile"
        ? []
        : quality === "high"
          ? poses
          : poses.filter((p) =>
              ["01-main-camp", "03-beach-cliffs", "06-jungle-floor"].includes(
                p[0],
              ),
            );
    for (const [name, x, z, yaw, pitch] of selection) {
      await page.evaluate(
        ({ x, z, yaw, pitch }) => {
          const q = window.campQA;
          let p = { x, z };
          if (!q.world.isWalkable(x, z)) {
            const n = q.camp.navigation.nodes
              .filter((n) => Math.hypot(n.x - x, n.z - z) < 2.5)
              .sort(
                (a, b) =>
                  Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z),
              )[0];
            if (!n) throw Error("Capture pose is not playable");
            p = { x: n.x, z: n.z };
          }
          q.io.dbg.teleportRequested = p;
          q.io.input.yaw = yaw;
          q.io.input.pitch = pitch;
        },
        { x, z, yaw, pitch },
      );
      await advance(90);
      if (name === "12-running") {
        await page.keyboard.down("w");
        await page.keyboard.down("Shift");
        await advance(24);
        assert.equal(
          await page.evaluate(() => window.__CAMP_DEBUG__.running),
          true,
        );
        report.checks.push("Run movement active during screenshot");
      }
      await advance(1, true);
      await page.screenshot({
        path: `${out}/${quality}-${name}.jpg`,
        type: "jpeg",
        quality: 90,
      });
      await page.keyboard.up("w");
      await page.keyboard.up("Shift");
    }
    if (phase === "profile") {
      report.samples.at(-1).liveFrameIntervalsMs = await page.evaluate(
        async () => {
          const q = window.campQA,
            s = q.s,
            intervals = [];
          s.clock.autoStart = true;
          s.clock.start();
          s.setFrameloop("always");
          await new Promise((resolve) => {
            let previous;
            const tick = (t) => {
              if (previous !== undefined) intervals.push(t - previous);
              previous = t;
              if (intervals.length < 24) requestAnimationFrame(tick);
              else resolve();
            };
            requestAnimationFrame(tick);
          });
          s.setFrameloop("never");
          s.clock.stop();
          s.clock.autoStart = false;
          q.clock = s.clock.elapsedTime;
          return intervals;
        },
      );
    }
    if (phase === "inspection") {
      // Real scene, eye-height cameras over verified playable sand. These are
      // explicitly labeled art-inspection views, separate from Player's boom.
      for (const [name, x, z, tx, ty, tz] of [
        ["13-limestone-eye-height", -45, -53, -36, 18, -75],
        ["14-cove-enclosure-eye-height", -48, -34, -20, 17, -72],
      ]) {
        const inspected = await page.evaluate(
          ({ x, z, tx, ty, tz }) => {
            const q = window.campQA;
            if (!q.world.isWalkable(x, z))
              throw Error("Inspection camera is outside playable terrain");
            const s = q.s;
            s.camera.position.set(x, q.world.groundHeight(x, z) + 1.65, z);
            s.camera.lookAt(tx, ty, tz);
            s.camera.updateMatrixWorld();
            q.render(s.scene, s.camera);
            return { eye: s.camera.position.toArray(), target: [tx, ty, tz] };
          },
          { x, z, tx, ty, tz },
        );
        await page.screenshot({
          path: `${out}/${name}.jpg`,
          type: "jpeg",
          quality: 92,
        });
        report.checks.push({ name, inspectionCamera: inspected });
      }
    }
    // Gameplay anchors must remain reachable through the actual pathfinder.
    report.checks.push(
      await page.evaluate(() => {
        const q = window.campQA;
        return {
          qualityAnchors: Object.entries(q.spots).flatMap(([place, points]) =>
            points.map((p) => ({
              place,
              position: p,
              reachable: q.camp.navigation.route(q.world.SPAWN, p) !== null,
            })),
          ),
        };
      }),
    );
  }
  if (phase === "after") {
    let aborted = 0;
    await page.route("**/*.glb*", (r) => {
      if (r.request().resourceType() !== "fetch") return r.continue();
      aborted++;
      return r.abort("failed");
    });
    await page.goto("http://127.0.0.1:5196/?quality=low&devTravel=1");
    await page.getByTestId("explore-island").click();
    await page.waitForFunction(() =>
      window.__WORLD_RENDER__?.scene.getObjectByName("camp-assets-degraded"),
    );
    await page.waitForFunction(
      async () =>
        (
          await import("/src/game/locations/travel.ts")
        ).worldTravel.getSnapshot().phase === "ready",
    );
    const a = await page.evaluate(() => window.__CAMP_DEBUG__.position);
    await page.keyboard.down("w");
    await page.waitForTimeout(700);
    await page.keyboard.up("w");
    const b = await page.evaluate(() => window.__CAMP_DEBUG__.position);
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 0.05);
    assert.ok(aborted >= 4);
    report.checks.push({
      name: "Missing models use degraded art, release loading curtain and retain movement",
      aborted,
    });
    await page.screenshot({
      path: `${out}/failure-degraded.jpg`,
      type: "jpeg",
      quality: 85,
    });
    await page.unroute("**/*.glb*");
    let delayed = 0;
    await page.route("**/limestone.glb*", async (r) => {
      if (r.request().resourceType() !== "fetch") return r.continue();
      delayed++;
      await new Promise((resolve) => setTimeout(resolve, 2500));
      return r.continue();
    });
    await page.goto("http://127.0.0.1:5196/?quality=low&devTravel=1");
    await page.getByTestId("explore-island").click();
    await page.waitForFunction(() =>
      window.__WORLD_RENDER__?.scene.getObjectByName("camp-assets-ready"),
    );
    assert.ok(delayed > 0);
    await page.waitForFunction(
      async () =>
        (
          await import("/src/game/locations/travel.ts")
        ).worldTravel.getSnapshot().phase === "ready",
    );
    report.checks.push("Delayed model recovers to full art and ready gameplay");
    await page.unroute("**/limestone.glb*");
    const start = Date.now();
    await page.getByTestId("button-menu").click();
    await page.getByTestId("explore-island").click();
    await page.waitForFunction(() =>
      window.__WORLD_RENDER__?.scene.getObjectByName("camp-assets-ready"),
    );
    await page.waitForFunction(
      async () =>
        (
          await import("/src/game/locations/travel.ts")
        ).worldTravel.getSnapshot().phase === "ready",
    );
    report.reentryWallMs = Date.now() - start;
    report.checks.push("Warm menu reentry restores complete environment");
  }
  for (const check of report.checks)
    for (const anchor of check.qualityAnchors ?? [])
      assert.equal(anchor.reachable, true, JSON.stringify(anchor));
  assert.deepEqual(report.errors, []);
  report.result = "PASS";
  console.log(
    JSON.stringify(
      {
        checks: report.checks,
        samples: report.samples.map((s) => ({
          label: s.label,
          calls: s.calls,
          triangles: s.triangles,
          entryWallMs: s.entryWallMs,
        })),
        reentryWallMs: report.reentryWallMs,
      },
      null,
      2,
    ),
  );
} catch (error) {
  report.result = "FAIL";
  report.failure = error.stack;
  throw error;
} finally {
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
  await server.close();
}
