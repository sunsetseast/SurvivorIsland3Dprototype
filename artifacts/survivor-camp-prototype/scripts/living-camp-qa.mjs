import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";

// Optional host-specific overrides. No application code depends on these.
const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require("playwright");
} catch {
  playwright = require(
    process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + "/playwright",
  );
}
if (process.env.CAMP_RESTRICTED_HOST) os.networkInterfaces = () => ({});
const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const output = path.resolve(root, "../../docs/living-camp/evidence");
await mkdir(output, { recursive: true });
process.env.PORT = "5174";
process.env.BASE_PATH = "/";
const { createServer } = await import("vite");
const server = await createServer({
  configFile: path.join(root, "vite.config.ts"),
  server: { host: "127.0.0.1" },
});
await server.listen();
let browser;
const report = {
  renderer: "Chromium software WebGL (SwiftShader); not iPhone Safari",
  physicalIPhone: false,
  timing:
    "Fixed 1/30s game frames accelerated between captures; actual GPU render at captures. Separate wall-time render samples below.",
  checks: [],
  captures: [],
  errors: [],
  routes: [],
  performance: [],
};
try {
  browser = await playwright.chromium.launch({
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
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => report.errors.push(e.message));
  await page.goto("http://127.0.0.1:5174");
  await page.getByTestId("explore-island").click();
  await page.waitForFunction(() => !!window.__CAMP_DEBUG__?.location);
  const cdp = await context.newCDPSession(page);
  await page.evaluate(async () => {
    const f = await import("/node_modules/.vite/deps/@react-three_fiber.js");
    const { camp } = await import("/src/game/CampRuntime.ts");
    const io = await import("/src/game/state.ts");
    const w = await import("/src/game/world.ts");
    const nav = await import("/src/game/navigation.ts");
    const { characterAnimationMetrics } =
      await import("/src/game/Contestants.tsx");
    // A reproducible provider stream, not a fixed itinerary.
    camp.provider.random = w.rng(7141);
    const store = f._roots.get(document.querySelector("canvas")).store;
    store.getState().setFrameloop("never");
    const s = store.getState();
    window.__qa = {
      f,
      camp,
      io,
      w,
      nav,
      characterAnimationMetrics,
      s,
      store,
      render: s.gl.render.bind(s.gl),
      time: s.clock.elapsedTime,
    };
    s.gl.render = () => {};
    window.__qa.advance = (frames = 1) => {
      const q = window.__qa;
      for (let i = 0; i < frames; i++) {
        q.time += 1 / 30;
        f.advance(q.time, false, s);
      }
    };
    window.__qa.draw = () => {
      s.gl.shadowMap.needsUpdate = true;
      window.__qa.render(s.scene, s.camera);
    };
  });
  const ev = (fn) => page.evaluate(fn);
  const advance = async (frames) => {
    await page.evaluate((n) => window.__qa.advance(n), frames);
    await page.waitForTimeout(80);
  };
  const capture = async (name, note = "Gameplay camera, actual WebGL") => {
    await ev(() => window.__qa.draw());
    await page.screenshot({
      path: path.join(output, name + ".jpg"),
      type: "jpeg",
      quality: 90,
    });
    const data = await ev(() => {
      const q = window.__qa,
        gl = q.s.gl;
      return {
        at: q.camp.now,
        viewport: [innerWidth, innerHeight],
        drawingBuffer: [gl.domElement.width, gl.domElement.height],
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        npcs: window.__CAMP_DEBUG__.camp.npcs,
      };
    });
    report.captures.push({ name, note, ...data });
    console.log("Captured", name);
  };
  const navigate = async (target, label) => {
    const result = await page.evaluate((target) => {
      const q = window.__qa,
        { camp, io, nav } = q;
      const avoids = camp.npcs.map((n) => ({ x: n.x, z: n.z, radius: 0.9 }));
      const route = camp.navigation.route(io.dbg, target, avoids);
      if (!route) throw Error("No player route");
      let frames = 0,
        maxHeightError = 0,
        maxStep = 0;
      for (const goal of route) {
        let attempts = 0;
        while (nav.distance(io.dbg, goal) > 0.13 && attempts++ < 150) {
          const prev = { x: io.dbg.x, z: io.dbg.z },
            dx = goal.x - prev.x,
            dz = goal.z - prev.z;
          io.input.yaw = Math.atan2(-dx, -dz);
          io.input.joyY = Math.min(1, Math.hypot(dx, dz) / 0.5);
          io.input.joyX = 0;
          io.input.run = false;
          q.advance(1);
          frames++;
          maxStep = Math.max(maxStep, nav.distance(prev, io.dbg));
          maxHeightError = Math.max(
            maxHeightError,
            Math.abs(io.dbg.y - q.w.groundHeight(io.dbg.x, io.dbg.z)),
          );
          if (!q.w.isWalkable(io.dbg.x, io.dbg.z))
            throw Error("Player entered a solid");
        }
        if (attempts >= 150)
          throw Error(
            "Player route stuck: " + JSON.stringify({ goal, at: io.dbg }),
          );
      }
      io.input.joyY = io.input.joyX = 0;
      io.input.run = false;
      q.advance(30);
      return {
        frames,
        maxHeightError,
        maxStep,
        final: { x: io.dbg.x, z: io.dbg.z },
      };
    }, target);
    report.routes.push({ label, ...result });
  };
  // Controlled setup holds decisions, not positions. Player and NPC route tests
  // below use real motion and collisions, never coordinate teleportation.
  await ev(() => {
    for (const n of window.__qa.camp.npcs) {
      n.until = 1e6;
      n.decisionAt = 1e6;
    }
    window.__qa.camp.groups[0].endsAt = 1e6;
  });
  await capture("01-four-contestants-at-camp");
  await navigate({ x: -9.8, z: -32.8 }, "Walk from spawn to Sandra");
  await ev(() => {
    window.__qa.io.input.yaw = -0.2;
    window.__qa.io.input.pitch = 0.25;
  });
  await advance(30);
  await capture("02-sandra-at-campfire");
  assert(await ev(() => window.__qa.camp.canTalk(window.__qa.camp.npc(11))));
  await capture("05-player-approaches-sandra");
  await page.getByTestId("talk-prompt").click();
  await advance(50);
  assert(await page.getByTestId("conversation-panel").isVisible());
  await capture("06-active-conversation-desktop");
  await page.locator('[data-topic="activity"]').click();
  assert.match(
    await page.locator(".spoken-line").textContent(),
    /Taking a breather/,
  );
  await page.locator('[data-topic="cooperate"]').click();
  assert.match(await page.locator(".spoken-line").textContent(), /more time/);
  await page.getByRole("button", { name: "Leave conversation" }).click();
  await advance(40);
  report.checks.push(
    "Desktop proximity, dialogue topic choices, leave and camera return",
  );
  await navigate({ x: -8, z: -25.8 }, "Walk from Sandra to Rob and Parvati");
  await ev(() => {
    window.__qa.io.input.yaw = 0.4;
    window.__qa.io.input.pitch = 0.3;
  });
  await advance(35);
  await capture("03-parvati-and-rob-conversation");

  // Genuine touch input in mobile-sized landscape, including the complete social loop.
  await page.setViewportSize({ width: 844, height: 390 });
  await navigate({ x: -9.8, z: -32.8 }, "Mobile walk to Sandra");
  await ev(() => {
    window.__qa.io.input.yaw = 0;
    window.__qa.io.input.pitch = 0.25;
  });
  await advance(35);
  await page.getByTestId("talk-prompt").tap();
  await advance(50);
  await page.locator('[data-topic="casual"]').tap();
  assert.equal(await ev(() => window.__qa.camp.conversation.turn), 1);
  await capture("09-iphone-landscape-conversation");
  const mobileLayout = await page.evaluate(() => {
    const p = document
      .querySelector(".conversation-panel")
      .getBoundingClientRect();
    return {
      panel: { x: p.x, y: p.y, width: p.width, height: p.height },
      minButtonHeight: Math.min(
        ...[...document.querySelectorAll(".conversation-panel button")].map(
          (b) => b.getBoundingClientRect().height,
        ),
      ),
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  assert(!mobileLayout.overflow);
  assert(mobileLayout.minButtonHeight >= 44);
  assert(mobileLayout.panel.y > 135);
  report.checks.push({ mobileLayout });
  await page.getByRole("button", { name: "Leave conversation" }).tap();
  await advance(40);
  await ev(() => {
    window.__qa.io.input.yaw = -Math.PI / 2;
  });
  await advance(12);
  const joy = await page.getByTestId("joystick").boundingBox(),
    run = await page.getByTestId("button-run").boundingBox();
  const x = joy.x + joy.width / 2,
    y = joy.y + joy.height / 2;
  const startPos = await ev(() => ({ ...window.__CAMP_DEBUG__.position }));
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { id: 1, x, y: y - 25 },
      { id: 2, x: run.x + 35, y: run.y + 35 },
    ],
  });
  await advance(15);
  const afterTouch = await ev(() => ({
    position: window.__CAMP_DEBUG__.position,
    moving: window.__CAMP_DEBUG__.moving,
    running: window.__CAMP_DEBUG__.running,
  }));
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await advance(12);
  assert(afterTouch.moving);
  assert(afterTouch.running);
  assert(
    Math.hypot(
      afterTouch.position.x - startPos.x,
      afterTouch.position.z - startPos.z,
    ) > 0.3,
  );
  assert(!(await ev(() => window.__CAMP_DEBUG__.moving)));
  report.checks.push(
    "Touch Talk, response, Leave, then concurrent joystick/run and release",
  );
  const orbitBefore = await ev(() => window.__qa.io.input.yaw);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ id: 3, x: 500, y: 110 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ id: 3, x: 550, y: 120 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await advance(10);
  assert(
    Math.abs((await ev(() => window.__qa.io.input.yaw)) - orbitBefore) > 0.2,
  );
  report.checks.push("Camera drag still responds after conversation");

  // Physical NPC approach from its actual position. No presentation-only trigger.
  await navigate({ x: -1, z: -25 }, "Move near Russell for NPC approach");
  assert(await ev(() => window.__qa.camp.startApproach(18)));
  for (let i = 0; i < 12 && !(await ev(() => window.__qa.camp.incomingId)); i++)
    await advance(60);
  assert(await page.getByTestId("npc-approach").isVisible());
  await capture("10-russell-approach-offer");
  await page.getByRole("button", { name: "Not now" }).tap();
  await page.waitForTimeout(350);
  await advance(15);
  assert(!(await page.getByTestId("npc-approach").count()));
  report.checks.push("Physically walked NPC approach and touch decline");

  await page.setViewportSize({ width: 1280, height: 800 });
  // Controlled route samples are clearly labeled; movement remains the actual
  // runtime path follower. The separate autonomous sample below has no fixed script.
  assert(
    await ev(() =>
      window.__qa.camp.request(window.__qa.camp.npc(18), {
        activity: "explore",
        place: "beach",
        duration: 25,
        reason: "Route certification",
      }),
    ),
  );
  await advance(190);
  await ev(() => {
    window.__qa.io.input.yaw = 1.5;
    window.__qa.io.input.pitch = 0.3;
  });
  await advance(25);
  await capture(
    "04-russell-traveling-path",
    "Controlled route scenario, real physical motion, gameplay camera",
  );
  for (
    let i = 0;
    i < 25 && (await ev(() => window.__qa.camp.npc(18).traveling));
    i++
  )
    await advance(90);
  assert.equal(await ev(() => window.__qa.camp.npc(18).place), "beach");
  await navigate({ x: -42.5, z: -26.2 }, "Walk beach route behind Russell");
  await ev(() => {
    const q = window.__qa;
    q.io.input.yaw = 1.3;
    q.io.input.pitch = 0.28;
    q.camp.npc(18).until = 1e6;
  });
  await advance(40);
  assert(
    await ev(() =>
      window.__qa.camp.request(window.__qa.camp.npc(18), {
        activity: "explore",
        place: "jungleTrail",
        duration: 25,
        reason: "Route certification",
      }),
    ),
  );
  await advance(30);
  await capture(
    "08-beach-moving-contestant",
    "Controlled route scenario, genuine game motion",
  );
  // Clear the initial social group and let Rob/Parvati walk to the shelter independently.
  await ev(() => {
    const q = window.__qa;
    for (const id of [4, 13])
      q.camp.request(q.camp.npc(id), {
        activity: "rest",
        place: "shelter",
        duration: 1000,
        reason: "Shelter route certification",
      });
  });
  for (
    let i = 0;
    i < 30 &&
    (await ev(
      () =>
        window.__qa.camp.npc(4).traveling || window.__qa.camp.npc(13).traveling,
    ));
    i++
  )
    await advance(90);
  assert.equal(await ev(() => window.__qa.camp.npc(4).place), "shelter");
  await navigate({ x: 12, z: -37 }, "Walk shelter ramp");
  await ev(() => {
    window.__qa.io.input.yaw = 0.25;
    window.__qa.io.input.pitch = 0.28;
  });
  await advance(40);
  await capture("07-shelter-activity");
  // Diagnostic close views keep the same real scene/meshes, but frame the camera
  // explicitly; these do not count as playable-camera evidence.
  for (const id of [11, 13, 18, 4]) {
    await page.evaluate((id) => {
      const q = window.__qa,
        n = q.camp.npc(id);
      const face = n.facing;
      q.s.camera.position.set(
        n.x + Math.sin(face) * 2.5,
        n.y + 1.8,
        n.z + Math.cos(face) * 2.5,
      );
      q.s.camera.lookAt(n.x, n.y + 1.25, n.z);
      q.draw();
    }, id);
    await capture(
      "portrait-" + id,
      "Diagnostic close view of actual in-game procedural character; manual camera framing",
    );
  }
  await advance(50);
  // Restore genuine autonomous decisions and collect a bounded, accelerated sample.
  await ev(() => {
    const q = window.__qa;
    for (const n of q.camp.npcs) {
      n.decisionAt = q.camp.now + n.id * 0.1;
      n.until = q.camp.now + n.id * 0.4;
    }
  });
  await advance(3600);
  report.autonomous = await ev(() => ({
    ...window.__CAMP_DEBUG__.camp,
    receipts: window.__qa.camp.receipts.slice(-35),
  }));
  report.checks.push(
    "120 simulated seconds of autonomous browser camp updates after controlled route checks",
  );

  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 844, height: 390 },
    { width: 932, height: 430 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.evaluate(
      (dpr) => window.__qa.store.getState().setDpr(dpr),
      viewport.width === 1280 ? 1 : 1.5,
    );
    await advance(20);
    const perf = await ev(() => {
      const q = window.__qa,
        samples = [];
      for (let i = 0; i < 5; i++) {
        const t = performance.now();
        q.draw();
        q.s.gl.getContext().finish();
        samples.push(performance.now() - t);
      }
      const gl = q.s.gl,
        ext = gl.getContext().getExtension("WEBGL_debug_renderer_info");
      return {
        viewport: [innerWidth, innerHeight],
        drawingBuffer: [gl.domElement.width, gl.domElement.height],
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        renderAndFinishMs: samples,
        renderer: ext
          ? gl.getContext().getParameter(ext.UNMASKED_RENDERER_WEBGL)
          : "unavailable",
        npcUpdate: { ...q.camp.metrics },
        characterAnimation: { ...q.characterAnimationMetrics },
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
      };
    });
    perf.wallTimeRenderLoop = await ev(async () => {
      const q = window.__qa,
        startFrames = q.camp.metrics.updates;
      q.s.gl.render = q.render;
      q.store.getState().setFrameloop("always");
      const start = performance.now();
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const elapsedMs = performance.now() - start;
      q.store.getState().setFrameloop("never");
      q.time = q.s.clock.elapsedTime;
      q.s.gl.render = () => {};
      const frames = q.camp.metrics.updates - startFrames;
      return {
        frames,
        elapsedMs,
        fps: (frames * 1000) / elapsedMs,
        note: "Short software renderer sample; not sustained device FPS",
      };
    });
    report.performance.push(perf);
  }
  assert.deepEqual(report.errors, []);
  await writeFile(
    path.join(output, "browser-certification.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      {
        checks: report.checks,
        captures: report.captures.length,
        errors: report.errors,
        performance: report.performance,
      },
      null,
      2,
    ),
  );
} catch (e) {
  report.failure = e.stack;
  await writeFile(
    path.join(output, "browser-failure.json"),
    JSON.stringify(report, null, 2),
  );
  throw e;
} finally {
  await browser?.close();
  await server.close();
}
