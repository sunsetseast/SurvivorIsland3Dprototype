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
  "../../docs/tribal-council/overhaul-evidence",
);
await mkdir(output, { recursive: true });
process.env.PORT = "5176";
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
  await page.goto("http://127.0.0.1:5176");
  console.log("Menu loaded");
  await page.getByTestId("explore-tribal").click();
  console.log("Tribal selected");
  await page.waitForSelector("[data-testid=tribal-intro]");
  await page.waitForFunction(() => window.__CAMP_DEBUG__?.tribalFrames > 2);
  async function connect() {
    await page.evaluate(async () => {
      const f = await import("/node_modules/.vite/deps/@react-three_fiber.js");
      const io = await import("/src/game/state.ts");
      const layout = await import("/src/game/tribal/layout.ts");
      const intro = await import("/src/game/tribal/intro.ts");
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
    });
  }
  console.log("Scene ready");
  await connect();
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
  for (const [time, name] of [
    [3, "intro-01-drone"],
    [8, "intro-02-ruin-detail"],
    [12, "intro-03-jeff-probst"],
    [20, "intro-04-survivor-arrival"],
    [30, "intro-05-taking-seats"],
  ]) {
    await page.evaluate((t) => {
      const q = window.__tribalQA;
      while (q.intro.tribalIntro.time < t) q.advance();
    }, time);
    await capture(name);
  }
  if (process.env.TRIBAL_QUICK)
    await page.getByTestId("skip-tribal-intro").click();
  else
    await page.evaluate(() => {
      const q = window.__tribalQA;
      while (q.intro.tribalIntro.getSnapshot() === "intro") q.advance();
    });
  await page.waitForSelector("[data-testid=stand-and-explore]");
  assert.equal(
    await page.getByTestId("joystick").count(),
    0,
    "exploration controls gated until seated",
  );
  await page.evaluate(() => window.__tribalQA.advance(60));
  await capture("intro-06-player-seated");
  await page.getByTestId("stand-and-explore").click();
  await page.waitForSelector("[data-testid=joystick]");
  await page.evaluate(() => {
    const q = window.__tribalQA;
    q.advance(2);
    q.io.dbg.resetRequested = true;
    q.advance(2);
  });
  await capture("01-arrival-path");
  if (!process.env.TRIBAL_QUICK) {
    const campTime = await page.evaluate(() => window.__tribalQA.camp.now);
    const paths = await page.evaluate(() => {
      const l = window.__tribalQA.layout;
      return {
        arrival: l.ARRIVAL,
        voting: l.VOTING_PATH,
        jury: l.JURY_PATH,
        exit: l.EXIT_PATH,
      };
    });
    for (const [name, route] of Object.entries(paths)) {
      // Only relocate to the beginning of an independently tested route. Every following
      // metre is traversed by the real Player/useFrame/controller, without teleporting.
      await page.evaluate((p) => {
        const q = window.__tribalQA;
        q.io.dbg.teleportRequested = p;
        q.advance(2);
      }, route[0]);
      for (const target of [
        ...route.slice(1),
        ...route.slice(0, -1).reverse(),
      ]) {
        const result = await page.evaluate((target) => {
          const q = window.__tribalQA;
          let frames = 0,
            lowCamera = 10;
          while (frames++ < 750) {
            const d = q.io.dbg,
              dx = target.x - d.x,
              dz = target.z - d.z;
            if (Math.hypot(dx, dz) < 0.16) break;
            q.io.input.yaw = Math.atan2(-dx, -dz);
            q.io.input.joyY = 1;
            q.io.input.run = true;
            q.advance();
            lowCamera = Math.min(lowCamera, d.cameraDistance);
          }
          q.io.input.joyY = 0;
          q.io.input.run = false;
          q.advance(10);
          return {
            distance: Math.hypot(target.x - q.io.dbg.x, target.z - q.io.dbg.z),
            frames,
            lowCamera,
            grounded:
              Math.abs(
                q.io.dbg.y - q.layout.tribalHeight(q.io.dbg.x, q.io.dbg.z),
              ) < 0.001,
          };
        }, target);
        assert.ok(
          result.distance < 0.4,
          `${name}: ${JSON.stringify({ target, ...result })}`,
        );
        assert.ok(result.grounded);
        report.checks.push({ route: name, target, ...result });
      }
      console.log("Walked", name, "both ways");
    }
    assert.equal(
      await page.evaluate(() => window.__tribalQA.camp.now),
      campTime,
      "island runtime must remain paused in Council",
    );
    report.checks.push("Camp runtime remains paused during Tribal exploration");
  }
  await page.evaluate(() => window.__tribalQA.intro.tribalIntro.sit());
  await page.waitForSelector("[data-testid=stand-and-explore]");
  await page.evaluate(() => window.__tribalQA.advance(40));
  const cameras = await page.evaluate(
    () => window.__tribalQA.layout.TRIBAL.cameras,
  );
  await capture("02-first-reveal", cameras.reveal);
  await capture("03-full-council", cameras.council);
  for (const name of ["contestantEye", "hostEye", "fireSide", "entrance"])
    await capture("composition-" + name, cameras[name]);
  await capture("elephant-guardian", {
    position: [-8, 2.6, -9],
    target: [-11.8, 1.5, -15.2],
  });
  await capture("04-staggered-stumps", cameras.contestants);
  await capture("05-central-fire", {
    position: [4.5, 2.3, 5],
    target: [0, 0.8, 0],
  });
  await capture("06-jury-gallery", cameras.jury);
  await capture("07-voting-exterior", {
    position: [-23.5, 3.2, 22],
    target: [-34, 2.5, 17],
  });
  await capture("08-voting-interior", cameras.vote);
  await capture("09-host-and-exit", cameras.host);
  await capture("10-stars-and-sanctuary", cameras.sky);
  await page.getByTestId("stand-and-explore").click();
  await page.evaluate(() => window.__tribalQA.advance(3));
  // Wall-time GPU rendering: separately labelled, no accelerated clock trick in timing.
  for (const viewport of [
    { width: 375, height: 812 },
    { width: 430, height: 932 },
    { width: 844, height: 390 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => {
      const q = window.__tribalQA;
      q.io.dbg.teleportRequested = { x: 0, z: 9 };
      q.io.input.yaw = 0.1;
      q.io.input.pitch = 0.3;
      q.advance(2);
    });
    await capture(
      `${viewport.width === 844 ? "11-iphone-landscape" : "viewport-" + viewport.width}`,
    );
    const measured = await page.evaluate(() => {
      const q = window.__tribalQA,
        samples = [];
      for (let i = 0; i < 8; i++) {
        const t = performance.now();
        q.draw(i % 5 === 0);
        const gl = q.s.gl.getContext();
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
        samples.push(performance.now() - t);
      }
      const gl = q.s.gl.getContext(),
        ext = gl.getExtension("WEBGL_debug_renderer_info");
      return {
        samplesMs: samples,
        calls: q.s.gl.info.render.calls,
        triangles: q.s.gl.info.render.triangles,
        buffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
        renderer: ext
          ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
          : gl.getParameter(gl.RENDERER),
      };
    });
    report.performance.push({ viewport, ...measured });
  }
  // New environmental interactions use production DOM controls and lock real movement.
  await page.setViewportSize({ width: 844, height: 390 });
  await page.evaluate(() => {
    const q = window.__tribalQA;
    q.io.dbg.teleportRequested = { x: -34, z: 18 };
    q.advance(3);
  });
  await page.getByTestId("tribal-interact").click();
  await page.getByTestId("practice-ballot").fill("Sandra");
  const writingPosition = await page.evaluate(
    () => window.__CAMP_DEBUG__.position,
  );
  await page.evaluate(() => {
    const q = window.__tribalQA;
    q.io.input.joyY = 1;
    q.advance(30);
  });
  assert.deepEqual(
    await page.evaluate(() => window.__CAMP_DEBUG__.position),
    writingPosition,
    "modal locks locomotion",
  );
  await page.getByTestId("fold-ballot").click();
  await page.evaluate(() => window.__tribalQA.advance(3));
  assert.ok(
    await page.evaluate(
      () =>
        !!window.__tribalQA.s.scene.getObjectByName("folded-practice-ballot"),
    ),
  );
  await capture("practice-ballot-folded", cameras.vote);
  report.checks.push(
    "Ballot writing, movement lock, fold and visible parchment passed",
  );
  await page.evaluate(() => {
    const q = window.__tribalQA;
    const p = q.layout.TRIBAL.seats[7].position;
    q.io.dbg.teleportRequested = { x: p[0], z: p[2] + 1.05 };
    q.advance(3);
  });
  await page.waitForFunction(() =>
    document
      .querySelector("[data-testid=tribal-interact]")
      ?.textContent.includes("Return to your seat"),
  );
  await page.getByTestId("tribal-interact").click();
  await page.waitForSelector("[data-testid=stand-and-explore]");
  await page.getByTestId("stand-and-explore").click();
  await page.evaluate(() => window.__tribalQA.advance(3));
  report.checks.push("Return to seat and stand again passed");
  // Real pointer/touch events through the unchanged joystick and orbit zones.
  await page.setViewportSize({ width: 844, height: 390 });
  const joy = await page.getByTestId("joystick").boundingBox();
  await page.evaluate(() => {
    const q = window.__tribalQA;
    q.io.dbg.teleportRequested = { x: 0, z: 8 };
    q.io.input.yaw = Math.PI;
    q.advance(2);
  });
  const before = await page.evaluate(() => window.__CAMP_DEBUG__.position);
  await page.mouse.move(joy.x + joy.width / 2, joy.y + joy.height / 2);
  await page.mouse.down();
  await page.mouse.move(joy.x + joy.width / 2, joy.y + 10);
  await page.evaluate(() => window.__tribalQA.advance(35));
  await page.mouse.up();
  const after = await page.evaluate(() => window.__CAMP_DEBUG__.position);
  assert.ok(
    Math.hypot(after.x - before.x, after.z - before.z) > 1,
    "joystick moves player",
  );
  const yaw = await page.evaluate(() => window.__CAMP_DEBUG__.camera.yaw);
  await page.mouse.move(600, 170);
  await page.mouse.down();
  await page.mouse.move(720, 180, { steps: 6 });
  await page.mouse.up();
  assert.ok(
    Math.abs(
      (await page.evaluate(() => window.__CAMP_DEBUG__.camera.yaw)) - yaw,
    ) > 0.5,
  );
  await page.mouse.move(610, 180);
  await page.mouse.down();
  await page.mouse.move(610, 30, { steps: 6 });
  await page.mouse.up();
  assert.ok(
    await page.evaluate(() => window.__tribalQA.io.input.pitch < 0),
    "Tribal camera can look up at the towers",
  );
  await page.evaluate(() => {
    window.__tribalQA.io.input.pitch = 0.3;
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ id: 1, x: joy.x + joy.width / 2, y: joy.y + 10 }],
  });
  await page.evaluate(() => window.__tribalQA.advance(15));
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  assert.equal(await page.evaluate(() => window.__tribalQA.io.input.joyY), 0);
  report.checks.push(
    "Joystick movement, touch release and drag camera passed at 844×390",
  );
  await page.getByTestId("button-audio").click();
  assert.match(
    await page.getByTestId("button-audio").textContent(),
    /SOUND ON/,
  );
  await page.getByTestId("button-audio").click();
  assert.match(
    await page.getByTestId("button-audio").textContent(),
    /SOUND OFF/,
  );
  report.checks.push(
    "Gesture-enabled audio starts and stops without autoplay errors",
  );
  // Camera obstruction, booth roof and walls, no trapped lens.
  await page.evaluate(() => {
    const q = window.__tribalQA;
    q.io.dbg.teleportRequested = { x: -34, z: 18.5 };
    q.advance(2);
  });
  const cameraChecks = await page.evaluate(() => {
    const q = window.__tribalQA,
      out = [];
    for (let i = 0; i < 16; i++) {
      q.io.input.yaw = (i * Math.PI) / 8;
      q.advance(5);
      out.push({
        distance: q.io.dbg.cameraDistance,
        y: q.io.dbg.cy,
        blocked: q.io.dbg.cameraBlocked,
      });
    }
    return out;
  });
  assert.ok(cameraChecks.some((c) => c.blocked));
  assert.ok(
    cameraChecks.every(
      (c) => Number.isFinite(c.distance) && c.distance >= 0.69,
    ),
  );
  report.checks.push({ cameraChecks });
  await page.getByTestId("button-menu").click();
  await page.getByTestId("explore-island").click();
  await page.waitForFunction(() => window.__CAMP_DEBUG__.position.x > -20);
  report.checks.push("Menu -> Tribal -> Menu -> Island transitions passed");
  await page.getByTestId("button-menu").click();
  await page.getByTestId("explore-tribal").click();
  await page.waitForSelector("[data-testid=skip-tribal-intro]");
  await page.getByTestId("skip-tribal-intro").click();
  await page.getByTestId("stand-and-explore").click();
  report.checks.push("Reentry replays intro; skip reaches seated handoff");
  assert.deepEqual(report.errors, []);
  console.log("Tribal Council WebGL certification passed");
} finally {
  await writeFile(
    path.join(output, "browser-certification.json"),
    JSON.stringify(report, null, 2),
  );
  await browser?.close();
  await server.close();
}
