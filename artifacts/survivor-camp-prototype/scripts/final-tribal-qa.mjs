import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";
const root = fileURLToPath(new URL("..", import.meta.url));
const out = path.resolve(root, "../../docs/tribal-council/final-evidence");
await mkdir(out, { recursive: true });
process.env.PORT = process.env.FINAL_QA_PORT || "5184";
process.env.BASE_PATH = "/";
const server = await createServer({
  configFile: path.join(root, "vite.config.ts"),
  server: { host: "127.0.0.1", hmr: false, watch: null },
});
await server.listen();
const report = {
  renderer: "Chromium 142 / SwiftShader; not physical iPhone Safari",
  checks: [],
  captures: [],
  errors: [],
  sequences: {},
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
  page.setDefaultTimeout(90000);
  page.on("pageerror", (e) => report.errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") report.errors.push(m.text());
  });
  await page.goto("http://127.0.0.1:" + process.env.PORT);
  await page.getByTestId("explore-tribal").click();
  await page.waitForFunction(() => window.__CAMP_DEBUG__?.tribalFrames > 2);
  await page.getByTestId("skip-tribal-intro").click();
  await page.getByTestId("stand-and-explore").click();
  async function connect() {
    await page.evaluate(async () => {
      const f = await import("/node_modules/.vite/deps/@react-three_fiber.js"),
        io = await import("/src/game/state.ts");
      const store = f._roots.get(document.querySelector("canvas")).store,
        s = store.getState();
      s.setFrameloop("never");
      const render = s.gl.render.bind(s.gl);
      s.gl.render = () => {};
      const q = (window.q = {
        f,
        io,
        store,
        s,
        render,
        time: s.clock.elapsedTime,
        layout: await import("/src/game/tribal/layout.ts"),
        interactions: (await import("/src/game/tribal/interactions.ts"))
          .tribalInteractions,
        intro: (await import("/src/game/tribal/intro.ts")).tribalIntro,
        attendance: (await import("/src/game/tribal/attendance.ts"))
          .councilAttendance,
      });
      q.advance = (n = 1) => {
        for (let i = 0; i < n; i++) {
          q.time += 1 / 30;
          f.advance(q.time, false, store.getState());
        }
      };
      q.draw = () => {
        s.gl.shadowMap.needsUpdate = true;
        render(s.scene, s.camera);
      };
    });
  }
  await connect();
  await page.waitForFunction(
    () =>
      window.q.s.scene.getObjectByName("sanctuary-assets-ready") &&
      window.q.s.scene.getObjectByName("voting-props-ready"),
  );
  await page.evaluate(() => window.q.advance(35));
  async function shot(name, camera) {
    await page.waitForTimeout(180);
    const metrics = await page.evaluate((camera) => {
      const q = window.q,
        s = q.s;
      if (camera) {
        s.camera.fov = 55;
        s.camera.updateProjectionMatrix();
        s.camera.position.set(...camera.position);
        s.camera.lookAt(...camera.target);
        s.camera.updateMatrixWorld();
      }
      q.draw();
      let bufferBytes = 0;
      const gs = new Set();
      s.scene.traverse((o) => {
        if (o.isMesh) gs.add(o.geometry);
      });
      for (const g of gs) {
        if (g.index) bufferBytes += g.index.array.byteLength;
        for (const a of Object.values(g.attributes))
          bufferBytes += a.array.byteLength;
      }
      const samples = [];
      const gl = s.gl.getContext();
      s.gl.shadowMap.needsUpdate = false;
      for (let i = 0; i < 3; i++) {
        const t = performance.now();
        q.render(s.scene, s.camera);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
        samples.push(performance.now() - t);
      }
      return {
        calls: s.gl.info.render.calls,
        triangles: s.gl.info.render.triangles,
        textures: s.gl.info.memory.textures,
        geometries: s.gl.info.memory.geometries,
        sceneBufferBytes: bufferBytes,
        samplesMs: samples,
        player: { x: q.io.dbg.x, z: q.io.dbg.z, face: q.io.dbg.face },
        camera: window.__CAMP_DEBUG__.camera,
      };
    }, camera);
    await page.screenshot({
      path: path.join(out, name + ".jpg"),
      type: "jpeg",
      quality: 88,
    });
    report.captures.push({
      name,
      viewport: await page.viewportSize(),
      ...metrics,
    });
    console.log("Captured", name, metrics.calls, metrics.triangles);
    return metrics;
  }
  const cams = await page.evaluate(() => window.q.layout.TRIBAL.cameras);
  if (!process.env.QA_DYNAMIC_ONLY) {
    await shot("council-after", cams.council);
    await shot("arrival", cams.entrance);
    await shot("front-approach", {
      position: [-28, 3.3, 28],
      target: [-34, 2.6, 18],
    });
    await shot("booth-tabletop", {
      position: [-31.7, 2.75, 19.5],
      target: [-34, 1.75, 16.8],
    });
    await shot("props-close", {
      position: [-33.7, 2.8, 18.15],
      target: [-34.05, 1.72, 16.8],
    });
    await shot("pen-close", {
      position: [-33.3, 1.94, 17.7],
      target: [-33.5, 1.56, 17.11],
    });
    await shot("urn-close", {
      position: [-35.8, 2.75, 17.65],
      target: [-35.1, 1.9, 16.65],
    });
    await shot("bag-close", {
      position: [-32.5, 2.25, 17.55],
      target: [-32.96, 1.72, 16.79],
    });
  }
  const props = await page.evaluate(() => {
    const q = window.q,
      s = q.s;
    let urns = 0;
    s.scene.traverse((o) => {
      if (o.name === "voting_urn") urns++;
    });
    return {
      urns,
      props: ["voting_pen", "voting_urn", "shot_dark_bag", "parchment"].map(
        (n) => ({
          name: n,
          position: s.scene.getObjectByName(n).position.toArray(),
        }),
      ),
    };
  });
  assert.equal(props.urns, 1);
  report.checks.push(props);
  const routes = await page.evaluate(() => ({
    vote: window.q.layout.VOTING_PATH,
    exit: window.q.layout.EXIT_PATH,
    arrival: window.q.layout.ARRIVAL,
    jury: window.q.layout.JURY_PATH,
  }));
  for (const [name, points] of Object.entries(routes)) {
    const result = await page.evaluate((points) => {
      const q = window.q;
      q.io.dbg.teleportRequested = points[0];
      q.io.clearInput();
      q.advance(1);
      let maxError = 0;
      for (const target of [
        ...points.slice(1),
        ...points.slice(0, -1).reverse(),
      ]) {
        q.io.input.joyY = 0;
        q.advance(1);
        const dx = target.x - q.io.dbg.x,
          dz = target.z - q.io.dbg.z;
        q.io.input.yaw = Math.atan2(-dx, -dz);
        q.io.input.joyY = 1;
        q.io.input.run = true;
        for (
          let i = 0;
          i < 750 &&
          Math.hypot(target.x - q.io.dbg.x, target.z - q.io.dbg.z) > 0.16;
          i++
        )
          q.advance();
        maxError = Math.max(
          maxError,
          Math.hypot(target.x - q.io.dbg.x, target.z - q.io.dbg.z),
        );
      }
      q.io.clearInput();
      q.advance(5);
      return maxError;
    }, points);
    assert.ok(result < 0.3, `${name} route error ${result}`);
    report.checks.push({ route: name, maxError: result });
    console.log("Route", name, result);
  }
  async function place(x, z, yaw = 0) {
    await page.evaluate(
      ({ x, z, yaw }) => {
        const q = window.q;
        q.io.clearInput();
        q.io.input.yaw = yaw;
        q.io.dbg.teleportRequested = { x, z };
        q.advance(1);
      },
      { x, z, yaw },
    );
  }
  const advance = (n) => page.evaluate((n) => window.q.advance(n), n);
  async function approach() {
    await place(-34, 20.25);
    await page.evaluate(() => {
      window.q.interactions.reset();
      window.q.io.input.joyY = 1;
    });
    await advance(19);
    await page.evaluate(() => (window.q.io.input.joyY = 0));
    await advance(3);
  }
  await approach();
  const seq = [];
  for (const [n, label] of [
    [0, "01-entry"],
    [8, "02-transition"],
    [35, "03-portrait"],
  ]) {
    await advance(n);
    seq.push(await shot(label));
  }
  assert.ok(seq.at(-1).camera.blend > 0.98, "portrait did not settle");
  assert.equal(await page.getByTestId("tribal-inspect").count(), 0);
  await shot("portrait-desktop");
  await advance(60);
  assert.equal(
    (await page.evaluate(() => window.__CAMP_DEBUG__.camera)).owner,
    "voting-portrait",
  );
  await page.evaluate(() => {
    window.q.io.input.yaw = Math.PI;
    window.q.io.input.joyY = 1;
  });
  await advance(18);
  await page.evaluate(() => (window.q.io.input.joyY = 0));
  seq.push(await shot("04-step-away"));
  await advance(45);
  seq.push(await shot("05-follow-restored"));
  assert.ok(seq.at(-1).camera.blend < 0.01);
  report.sequences.voting = seq.map((s) => ({
    camera: s.camera,
    player: s.player,
  }));
  await place(-32.8, 17.6);
  await advance(45);
  assert.equal(
    (await page.evaluate(() => window.__CAMP_DEBUG__.camera)).blend,
    0,
  );
  await approach();
  await page.evaluate(() => {
    window.q.io.input.yaw = Math.PI;
    window.q.io.input.joyY = 1;
  });
  await advance(25);
  await page.evaluate(() => (window.q.io.input.joyY = 0));
  await advance(40);
  assert.ok(
    (await page.evaluate(() => window.__CAMP_DEBUG__.camera)).blend < 0.01,
  );
  await approach();
  await advance(45);
  console.log(
    "Pre-dialog",
    await page.evaluate(() => ({
      player: window.__CAMP_DEBUG__.position,
      face: window.q.io.dbg.face,
      snapshot: window.q.interactions.getSnapshot(),
    })),
  );
  await page.getByTestId("tribal-interact").click();
  await page.getByTestId("practice-ballot").fill("Sandra");
  const pos = await page.evaluate(() => window.__CAMP_DEBUG__.position);
  await page.keyboard.down("w");
  await advance(10);
  await page.keyboard.up("w");
  assert.deepEqual(
    await page.evaluate(() => window.__CAMP_DEBUG__.position),
    pos,
  );
  await page.setViewportSize({ width: 844, height: 390 });
  await advance(20);
  await shot("portrait-mobile-writing");
  // Simulate the iOS visual viewport shrinking without claiming a real keyboard/device test.
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport, "height", {
      value: 220,
      configurable: true,
    });
    window.visualViewport.dispatchEvent(new Event("resize"));
  });
  await page.waitForTimeout(250);
  const keyboardViewport = await page.evaluate(() => ({
    canvas: document.querySelector("canvas").getBoundingClientRect().height,
    panel: document
      .querySelector('[data-testid="tribal-inspect"]')
      .getBoundingClientRect()
      .toJSON(),
  }));
  assert.ok(keyboardViewport.canvas <= 221);
  assert.ok(
    keyboardViewport.panel.top >= 0 && keyboardViewport.panel.bottom <= 221,
  );
  await page.evaluate(() => {
    delete window.visualViewport.height;
    window.visualViewport.dispatchEvent(new Event("resize"));
  });
  await page.waitForTimeout(250);
  report.checks.push({ simulatedKeyboardViewport: keyboardViewport });
  await page.getByTestId("fold-ballot").click();
  for (const [frames, label] of [
    [12, "ballot-01-fold"],
    [43, "ballot-02-over-urn"],
    [40, "ballot-03-deposited"],
  ]) {
    await advance(frames);
    await shot(label);
  }
  assert.equal(
    await page.evaluate(() => window.q.interactions.getSnapshot().deposited),
    true,
  );
  await page.getByTestId("tribal-interact").click();
  await page.getByTestId("close-tribal-inspect").click();
  await advance(45);
  assert.ok(
    (await page.evaluate(() => window.__CAMP_DEBUG__.camera)).blend < 0.01,
  );
  report.checks.push(
    "Portrait entry/hold/exit/reversal/revisit, modal movement lock, mobile UI, fold/deposit, cancel",
  );
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, points) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: points.map(([id, x, y]) => ({
        id,
        x,
        y,
        radiusX: 8,
        radiusY: 8,
        force: 1,
      })),
    });
  async function twoThumb(run = false, scene = "tribal") {
    await place(scene === "camp" ? -6 : -10, scene === "camp" ? -24 : 3, 0);
    if (run) await page.getByTestId("button-run").click();
    const box = await page.getByTestId("joystick").boundingBox(),
      x = box.x + box.width / 2,
      y = box.y + box.height / 2;
    await touch("touchStart", [[1, x, y]]);
    await touch("touchMove", [[1, x, y - 36]]);
    await advance(8);
    const before = await page.evaluate(() => ({
      camera: window.__CAMP_DEBUG__.camera,
      p: window.__CAMP_DEBUG__.position,
    }));
    await touch("touchStart", [
      [1, x, y - 36],
      [2, 580, 180],
    ]);
    await touch("touchMove", [
      [1, x, y - 36],
      [2, 690, 205],
    ]);
    await advance(10);
    const a = await shot(`${scene}-${run ? "run" : "walk"}-orbit-01`);
    await touch("touchMove", [
      [1, x, y - 36],
      [2, 740, 185],
    ]);
    await advance(10);
    const b = await shot(`${scene}-${run ? "run" : "walk"}-orbit-02`);
    const data = await page.evaluate(() => ({
      input: { ...window.q.io.input },
      speed: window.q.io.dbg.speed,
      running: window.q.io.dbg.running,
    }));
    assert.ok(Math.abs(b.camera.yaw - before.camera.yaw) > 0.5);
    assert.ok(
      Math.hypot(b.player.x - a.player.x, b.player.z - a.player.z) > 0.3,
    );
    assert.equal(data.input.looking, true);
    if (run) assert.equal(data.running, true);
    await touch("touchEnd", [[2, 740, 185]]);
    await advance(3);
    assert.ok((await page.evaluate(() => window.q.io.input.joyY)) > 0.5);
    await touch("touchEnd", []);
    await advance(8);
    assert.equal(await page.evaluate(() => window.q.io.input.run), false);
    report.sequences[`${scene}-${run ? "run" : "walk"}`] = [before, a, b, data];
    console.log("Two-thumb", scene, run);
  }
  await twoThumb(false);
  await twoThumb(true);
  await page.getByTestId("button-run").click();
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  assert.equal(await page.evaluate(() => window.q.io.input.run), false);
  const collision = await page.evaluate(() => {
    const q = window.q,
      results = [],
      cpu = [];
    q.io.clearInput();
    for (const p of [
      { x: -34, z: 18 },
      { x: -22, z: -4 },
      { x: 3, z: -16 },
    ]) {
      q.io.dbg.teleportRequested = p;
      q.advance(1);
      for (let i = 0; i < 48; i++) {
        q.io.input.yaw = (i * Math.PI) / 24;
        q.advance();
        cpu.push(q.io.dbg.cameraCpuMs);
        if (i % 6 === 0)
          results.push({
            blocked: q.io.dbg.cameraBlocked,
            d: q.io.dbg.cameraDistance,
            y: q.io.dbg.cy,
            floor: q.layout.tribalHeight(q.io.dbg.cx, q.io.dbg.cz),
          });
      }
    }
    cpu.sort((a, b) => a - b);
    return {
      results,
      cpuMedianMs: cpu[Math.floor(cpu.length / 2)],
      cpuP95Ms: cpu[Math.floor(cpu.length * 0.95)],
    };
  });
  assert.ok(collision.results.some((r) => r.blocked));
  assert.ok(
    collision.results.every((r) => r.d >= 0.69 && r.y >= r.floor + 0.29),
  );
  report.checks.push(collision);
  await page.setViewportSize({ width: 1280, height: 800 });
  for (const count of [4, 5, 8, 12]) {
    await page.evaluate(
      (n) =>
        window.q.attendance.setParticipants(
          Array.from({ length: n }, (_, i) => i),
        ),
      count,
    );
    await page.waitForTimeout(250);
    await page.evaluate(() => window.q.intro.skip());
    await page.waitForTimeout(100);
    await advance(2);
    const data = await page.evaluate(() => {
      const g = window.q.s.scene.getObjectByName("council-environment");
      return {
        stools: g.userData.stoolCount,
        seats: g.userData.contestantSeats.map((s) => s.position),
      };
    });
    assert.equal(data.stools, count);
    assert.equal(new Set(data.seats.map((p) => JSON.stringify(p))).size, count);
    if (count === 12) await shot("twelve-seated", cams.contestants);
    report.checks.push({ attendees: count, ...data });
  }
  await page.evaluate(() =>
    window.q.attendance.setParticipants([1, 2, 3, 4, 0]),
  );
  await page.waitForTimeout(200);
  await page.getByTestId("skip-tribal-intro").click();
  await advance(2);
  await shot("ceremony-seated", cams.hostEye);
  await page.getByTestId("stand-and-explore").click();
  await page.waitForTimeout(150);
  await advance(30);
  await page.evaluate(() => window.q.intro.rehearse());
  await page.waitForTimeout(150);
  await advance(100);
  await shot("ceremony-last-walk");
  await page.getByTestId("button-menu").click();
  await page.getByTestId("explore-island").click();
  await page.waitForTimeout(200);
  await connect();
  await advance(30);
  await page.setViewportSize({ width: 844, height: 390 });
  await twoThumb(false, "camp");
  await twoThumb(true, "camp");
  report.checks.push(
    "Native CDP walk/run+orbit in Tribal and camp; pointer release, blur, obstructions, 4/5/8/12 unique stools, ceremony",
  );
  assert.deepEqual(report.errors, []);
} finally {
  await writeFile(
    path.join(out, "review.json"),
    JSON.stringify(report, null, 2),
  );
  await browser?.close();
  await server.close();
}
console.log("FINAL TRIBAL QA PASSED");
