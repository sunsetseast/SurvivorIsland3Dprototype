import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
if (process.env.CAMP_RESTRICTED_HOST) os.networkInterfaces = () => ({});
const root = fileURLToPath(new URL("..", import.meta.url));
const output = path.resolve(
  root,
  process.env.HERO_EVIDENCE || "../../docs/characters/evidence",
);
await mkdir(output, { recursive: true });
process.env.PORT = "5186";
process.env.BASE_PATH = "/";
const { createServer } = await import("vite");
const server = await createServer({
  configFile: path.join(root, "vite.config.ts"),
  server: { host: "127.0.0.1", hmr: false, watch: null },
});
await server.listen();
console.log("Vite listening");
const report = {
  renderer: "Chromium / software WebGL; NOT physical iPhone Safari",
  acceleratedMovement: true,
  checks: [],
  captures: [],
  performance: [],
  errors: [],
};
let browser;
try {
  browser = await chromium.launch({
    executablePath: process.env.CAMP_CHROMIUM || undefined,
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
  console.log("Browser started");
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => {
    report.errors.push(e.message);
    console.error(e.message);
  });
  page.on("console", (m) => {
    if (m.type() === "error") report.errors.push(m.text());
  });
  page.setDefaultTimeout(60000);
  await page.goto("http://127.0.0.1:5186");
  console.log("Menu loaded");
  await page.getByTestId("explore-tribal").click();
  console.log("Tribal selected");
  await page.waitForSelector("[data-testid=tribal-intro]");
  await page.waitForFunction(() => window.__CAMP_DEBUG__?.tribalFrames > 2);
  async function connect() {
    await page.evaluate(async (baseline) => {
      const f = await import("/node_modules/.vite/deps/@react-three_fiber.js");
      const io = await import("/src/game/state.ts");
      const layout = await import("/src/game/tribal/layout.ts");
      const intro = await import("/src/game/tribal/intro.ts");
      const attendance = baseline
        ? null
        : await import("/src/game/tribal/attendance.ts");
      const metrics = (await import("/src/game/Contestants.tsx"))
        .characterAnimationMetrics;
      const camp = (await import("/src/game/CampRuntime.ts")).camp;
      const store = f._roots.get(document.querySelector("canvas")).store;
      store.getState().setFrameloop("never");
      const s = store.getState();
      const render = s.gl.render.bind(s.gl);
      s.gl.render = () => {};
      const q = (window.__tribalQA = {
        f,
        io,
        layout,
        intro,
        attendance,
        metrics,
        camp,
        s,
        store,
        render,
        time: s.clock.elapsedTime,
      });
      q.advance = (n = 1) => {
        for (let i = 0; i < n; i++) {
          q.time += 1 / 30;
          f.advance(q.time, false, store.getState());
        }
      };
      q.draw = (updateShadows = true) => {
        s.gl.shadowMap.needsUpdate = updateShadows;
        render(s.scene, s.camera);
      };
    }, !!process.env.HERO_BASELINE);
  }
  console.log("Scene ready");
  await connect();
  await page.waitForFunction(() =>
    window.__tribalQA.s.scene.getObjectByName("sanctuary-assets-ready"),
  );
  console.log(
    await page.evaluate(() => ({
      mode: window.__tribalQA.intro.tribalIntro.getSnapshot(),
      time: window.__tribalQA.intro.tribalIntro.time,
      frameloop: window.__tribalQA.s.frameloop,
    })),
  );
  await page.evaluate(() => window.__tribalQA.advance(1));
  console.log(
    "Advanced",
    await page.evaluate(() => window.__tribalQA.intro.tribalIntro.time),
  );
  async function capture(name, camera) {
    await page.waitForTimeout(240); // Let caption/store subscriptions commit after accelerated frames.
    const data = await page.evaluate((camera) => {
      const q = window.__tribalQA;
      if (camera) {
        q.s.camera.position.set(...camera.position);
        q.s.camera.lookAt(...camera.target);
        q.s.camera.updateMatrixWorld();
      }
      q.draw();
      return {
        player: window.__CAMP_DEBUG__.position,
        viewport: [innerWidth, innerHeight],
        calls: q.s.gl.info.render.calls,
        triangles: q.s.gl.info.render.triangles,
        geometries: q.s.gl.info.memory.geometries,
        textures: q.s.gl.info.memory.textures,
      };
    }, camera);
    await page.screenshot({
      path: path.join(output, name + ".jpg"),
      type: "jpeg",
      quality: 91,
      style: ".tribal-intro-overlay{visibility:hidden}",
    });
    report.captures.push({ name, ...data });
    console.log("Captured", name);
  }
  // Deterministic review moments; screenshots still use the live WebGL scene/rig/shader.
  await page.evaluate(() => {
    const q = window.__tribalQA;
    q.intro.tribalIntro.time = 23;
    q.advance(8);
  });
  await capture("arrival-procession");
  await page.getByTestId("skip-tribal-intro").click();
  await page.waitForSelector("[data-testid=stand-and-explore]");
  await page.evaluate(() => window.__tribalQA.advance(100));
  const seats = await page.evaluate(() => window.__tribalQA.intro.CAST_SEATS);
  for (let i = 0; i < 4; i++) {
    const s = seats[i],
      [x, , z] = s.position,
      a = s.facing;
    await capture("hero-" + [4, 11, 13, 18][i], {
      position: [x + Math.sin(a) * 2.05, 1.75, z + Math.cos(a) * 2.05],
      target: [x, 1.22, z],
    });
  }
  await capture("hero-jeff", {
    position: [5.4, 1.97, 2.25],
    target: [6.37, 1.78, 4.25],
  });
  await capture("council", { position: [5, 3.8, 3.8], target: [0, 1, -6.5] });
  await capture("heroes-with-host", {
    position: [12, 5.2, 6.5],
    target: [1, 1.2, -3.1],
  });
  await capture("host-facing-contestants", {
    position: [6.12, 1.85, 3.83],
    target: [0, 1.05, -6.5],
  });
  await capture("side-firelight", {
    position: [-5, 1.9, -3],
    target: [0, 1.2, -6.5],
  });
  if (!process.env.HERO_BASELINE) {
    for (const n of [4, 5, 8, 12]) {
      await page.evaluate((n) => {
        const q = window.__tribalQA;
        q.attendance.councilAttendance.setParticipants(
          [4, 11, 13, 18, 0, 1, 2, 3, 5, 6, 7, 8].slice(0, n),
        );
      }, n);
      await page.waitForFunction(
        (n) =>
          window.__tribalQA.s.scene.getObjectByName("council-environment")
            ?.userData.stoolCount === n,
        n,
      );
      await page.evaluate(() => {
        const q = window.__tribalQA;
        for (let i = 0; i < 90; i++) {
          q.intro.tribalIntro.time = q.intro.INTRO_DURATION - 0.1;
          q.advance(1);
        }
      });
      const check = await page.evaluate((n) => {
        const q = window.__tribalQA,
          scene = q.s.scene;
        const env = scene.getObjectByName("council-environment");
        const cuts = [];
        env.traverse((o) => {
          if (o.isMesh && o.name.startsWith("sanctuary-cut:")) cuts.push(o);
        });
        // A stump top is exactly one 28-triangle disc, measured from actual rendered buffers.
        const caps = cuts.reduce(
          (a, o) => a + o.geometry.attributes.position.count / (3 * 28),
          0,
        );
        const proxies = env.children.filter((o) =>
          o.name.startsWith("camera-stump-"),
        ).length;
        let actorCount = 0;
        scene.traverse((o) => {
          if (o.name.startsWith("council-attendee-")) actorCount++;
        });
        const heads = q.intro.CAST.map((_, i) => {
          const p = q.intro.stageAt(q.intro.tribalIntro.time, i);
          const v = q.s.camera.position
            .clone()
            .set(p.x, p.y + 1.7, p.z)
            .project(q.s.camera);
          return { x: v.x, y: v.y, z: v.z, arrived: p.arrived };
        });
        const feet = [];
        scene.updateMatrixWorld(true);
        scene.traverse((o) => {
          if (o.name.startsWith("hero-foot-")) {
            o.geometry.computeBoundingBox();
            const b = o.geometry.boundingBox
              .clone()
              .applyMatrix4(o.matrixWorld);
            const c = b.getCenter(q.s.camera.position.clone());
            feet.push(b.min.y - q.layout.tribalHeight(c.x, c.z));
          }
        });
        return {
          n,
          caps,
          proxies,
          actorCount,
          feet,
          ids: env.userData.contestantSeats.map((s) => s.id),
          heads,
        };
      }, n);
      assert.equal(check.caps, n);
      assert.equal(check.proxies, n);
      assert.equal(check.actorCount, n);
      assert.equal(new Set(check.ids).size, n);
      assert.ok(
        check.feet.every((y) => y > -0.04 && y < 0.08),
        JSON.stringify(check.feet),
      );
      assert.ok(
        check.heads.every(
          (p) =>
            p.arrived &&
            Math.abs(p.x) < 0.98 &&
            Math.abs(p.y) < 0.98 &&
            p.z < 1,
        ),
        JSON.stringify(check),
      );
      report.checks.push(check);
      await capture("stools-" + n);
      if (n === 12 || n === 5) {
        await page.setViewportSize({ width: 844, height: 390 });
        await page.evaluate(() => window.__tribalQA.advance(2));
        await capture("mobile-landscape-" + n);
        await page.setViewportSize({ width: 1280, height: 800 });
      }
    }
    // Restore the production demo and capture a real departing contestant on the voting route.
    await page.evaluate(() =>
      window.__tribalQA.attendance.councilAttendance.reset(),
    );
    await page.waitForFunction(
      () =>
        window.__tribalQA.s.scene.getObjectByName("council-environment")
          ?.userData.stoolCount === 5,
    );
    await page.getByTestId("skip-tribal-intro").click();
    await page.getByTestId("stand-and-explore").click();
    await page.waitForSelector("[data-testid=joystick]");
    await page.evaluate(() => {
      const q = window.__tribalQA;
      q.advance(35);
      q.io.dbg.teleportRequested = { x: -10, z: -4.25 };
      q.advance(3);
      q.io.input.yaw = Math.PI;
      q.io.input.joyY = 1;
      q.advance(20);
      q.io.input.joyY = 0;
    });
    await capture("voting-departure", {
      position: [-7, 2.5, 1],
      target: [-10, 1, -4],
    });
    const cost = await page.evaluate(() => {
      const q = window.__tribalQA,
        start = performance.now(),
        before = { ...q.metrics };
      q.advance(300);
      const renders = [];
      for (let i = 0; i < 5; i++) {
        const t = performance.now();
        q.draw(i === 0);
        const gl = q.s.gl.getContext();
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
        renders.push(performance.now() - t);
      }
      return {
        frames: 300,
        actorUpdates: q.metrics.updates - before.updates,
        animationMs: q.metrics.totalMs - before.totalMs,
        wallMs: performance.now() - start,
        softwareRenderMs: renders,
      };
    });
    report.performance.push(cost);
  }
  assert.deepEqual(report.errors, []);
  await writeFile(
    path.join(output, "review.json"),
    JSON.stringify(report, null, 2),
  );
} finally {
  await browser?.close();
  await server.close();
}
