/** Browser-generated, trusted multitouch input drives the real Player + Survivor.
 * Fixed 60 Hz simulation isolates speed from software WebGL cost. Captures render
 * the real scene; a separate live-frame sample is recorded, never called phone FPS.
 * No test writes input.joy*, input.run, or animation state. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import playwright, { chromium, webkit } from "playwright";
import { createServer } from "vite";
const root = fileURLToPath(new URL("..", import.meta.url));
const isWebkit = process.env.SPRINT_BROWSER === "webkit";
const out = path.resolve(
  root,
  process.env.SPRINT_EVIDENCE || "../../docs/mobile-controls/evidence",
);
await mkdir(out, { recursive: true });
process.env.PORT = process.env.SPRINT_PORT || "5195";
process.env.BASE_PATH = "/";
const server = await createServer({
  configFile: path.join(root, "vite.config.ts"),
  server: { host: "127.0.0.1", hmr: false, watch: null },
});
await server.listen();
const report = {
  physicalIPhone: false,
  viewport: { width: 932, height: 430 },
  methodology:
    "Trusted browser inspector touches; actual Player + terrain + Survivor; 60 Hz fixed simulation between real WebGL captures. Live RAF sample separate. Not physical Safari or device FPS.",
  checks: [],
  events: [],
  touchSequence: [],
  errors: [],
  samples: [],
};
let browser, page;
const check = (name, detail = {}) => {
  report.checks.push({ name, ...detail });
  console.log("PASS", name);
};
try {
  browser = await (isWebkit
    ? webkit.launch({ headless: true })
    : chromium.launch({
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
      }));
  report.browser = browser.version();
  page = await browser.newPage({
    viewport: report.viewport,
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 1,
  });
  page.setDefaultTimeout(120000);
  page.on("pageerror", (e) => report.errors.push(e.message));
  await page.addInitScript(() => {
    window.touchEvidence = [];
    for (const type of [
      "pointerdown",
      "pointermove",
      "pointerup",
      "pointercancel",
      "lostpointercapture",
      "click",
    ])
      document.addEventListener(
        type,
        (e) =>
          window.touchEvidence.push({
            type,
            id: e.pointerId,
            target: e.target.closest?.("[data-testid]")?.dataset.testid,
            trusted: e.isTrusted,
            detail: e.detail,
          }),
        true,
      );
  });
  await page.goto(
    `http://127.0.0.1:${process.env.PORT}/?devTravel=1&quality=low`,
  );
  // Playwright exposes CDP for Chromium. Its in-process WebKit page proxy
  // supplies the equivalent inspector touch command for this optional check.
  // This dev-only adapter is covered by the event log (every pointer is trusted).
  const cdp = isWebkit
    ? playwright._connection.toImpl(page).delegate._pageProxySession
    : await page.context().newCDPSession(page);
  const points = new Map();
  let nextTouchId = 100;
  const dispatch = async (type, changedPoints) => {
    const touchPoints = changedPoints ?? [...points.values()];
    report.touchSequence.push({
      type,
      touchPoints: structuredClone(touchPoints),
    });
    await cdp.send("Input.dispatchTouchEvent", { type, touchPoints });
  };
  const down = async (id, x, y) => {
    points.set(id, {
      id: isWebkit ? nextTouchId++ : id,
      x: Math.round(x),
      y: Math.round(y),
    });
    await dispatch("touchStart", isWebkit ? [points.get(id)] : undefined);
  };
  const move = async (id, x, y) => {
    points.set(id, {
      id: points.get(id).id,
      x: Math.round(x),
      y: Math.round(y),
    });
    await dispatch("touchMove", isWebkit ? [points.get(id)] : undefined);
  };
  const up = async (id) => {
    const ended = points.get(id);
    points.delete(id);
    // Partial release supplies the contact being lifted; the pointer event
    // log below verifies that the other fingers remain down and captured.
    await dispatch("touchEnd", isWebkit || points.size ? [ended] : []);
  };
  const cancel = async () => {
    const ended = [...points.values()];
    points.clear();
    await dispatch("touchCancel", isWebkit ? ended : []);
  };
  const box = async (testId) => {
    const r = await page.getByTestId(testId).boundingBox();
    assert.ok(r, testId);
    return { ...r, cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
  };
  const tap = async (testId) => {
    const r = await box(testId);
    await down(90, r.cx, r.cy);
    await up(90);
  };
  const connect = async () => {
    // Location controls appear only after the destination has passed readiness.
    await page.getByTestId("button-run").waitFor();
    await page.evaluate(async () => {
      window.sprintModules = {
        f: await import("/node_modules/.vite/deps/@react-three_fiber.js"),
        io: await import("/src/game/state.ts"),
      };
    });
    await page.waitForFunction((allowUnnamedPlayer) => {
      const { f, io } = window.sprintModules;
      const root = f._roots.get(document.querySelector("canvas"));
      if (
        !root ||
        root.store === window.sprintQA?.store ||
        (!allowUnnamedPlayer &&
          !root.store.getState().scene.getObjectByName("exploration-player"))
      )
        return false;
      const s = root.store.getState();
      s.setFrameloop("never");
      s.clock.stop();
      s.clock.autoStart = false;
      window.sprintQA = {
        f,
        io,
        store: root.store,
        render: s.gl.render.bind(s.gl),
        clock: s.clock.elapsedTime,
      };
      return true;
    }, process.env.SPRINT_BASELINE === "1");
  };

  const advance = async (frames = 60, render = false) =>
    page.evaluate(
      ({ frames, render }) => {
        const q = window.sprintQA,
          s = q.store.getState();
        s.gl.render = () => {};
        try {
          for (let i = 0; i < frames; i++) {
            // A queued RAF can arrive immediately after switching to manual mode.
            // Start after its elapsed time so no animation receives negative dt.
            q.clock = Math.max(q.clock, s.clock.elapsedTime) + 1 / 60;
            q.f.advance(q.clock, false, q.store.getState());
          }
        } finally {
          s.gl.render = q.render;
        }
        if (render) q.render(s.scene, s.camera);
      },
      { frames, render },
    );
  const snapshot = async () =>
    page.evaluate(() => {
      const q = window.sprintQA,
        { input, dbg } = q.io;
      // Read the real rig transforms, not just the requested running flag.
      const actor = q.store
        .getState()
        .scene.getObjectByName("exploration-player");
      const hips = actor?.children[0]?.children[0]?.children[0];
      const spine = hips?.children[1],
        leg = hips?.children[2];
      return {
        input: { ...input },
        position: { x: dbg.x, y: dbg.y, z: dbg.z },
        speed: dbg.speed,
        running: dbg.running,
        moving: dbg.moving,
        camera: {
          yaw: input.yaw,
          pitch: input.pitch,
          distance: dbg.cameraDistance,
          blocked: dbg.cameraBlocked,
          x: dbg.cx,
          y: dbg.cy,
          z: dbg.cz,
        },
        locomotion: actor?.userData.locomotion,
        rig: hips && {
          leg: leg.rotation.x,
          spine: spine.rotation.x,
          elbow: spine.children[3].children[1].rotation.x,
        },
      };
    });
  const enabled = async (value) => {
    await page.waitForFunction(
      (value) =>
        document
          .querySelector('[data-testid="button-run"]')
          ?.getAttribute("aria-pressed") === String(value),
      value,
      { timeout: 8000 },
    );
    assert.equal((await snapshot()).input.run, value);
    assert.equal(
      await page.getByTestId("button-run").textContent(),
      value ? "RUN ON" : "RUN",
    );
  };
  const place = async (x, z, yaw = 0) => {
    await page.evaluate(
      ({ x, z, yaw }) => {
        const q = window.sprintQA;
        q.io.dbg.teleportRequested = { x, z };
        q.io.input.yaw = yaw;
        q.io.input.pitch = 0.34;
      },
      { x, z, yaw },
    );
    await advance(60);
  };
  const stick = async (x = 0, y = 1) => {
    const r = await box("joystick");
    await down(1, r.cx, r.cy);
    await move(1, r.cx + x * 46, r.cy - y * 46);
  };
  const capture = async (name) => {
    await advance(1, true);
    await page.screenshot({
      path: path.join(out, `${name}.jpg`),
      type: "jpeg",
      quality: 88,
    });
  };
  const displacement = (a, b) =>
    Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z);
  if (!process.env.SPRINT_SCENES_ONLY) {
    await tap("explore-railay");
    await page.waitForFunction(() =>
      window.__RAILAY__?.scene.getObjectByName("railay-geology-ready"),
    );
    await connect();
    await advance(60);
    report.webgl = await page.evaluate(() => {
      const gl = window.__RAILAY__.gl.getContext();
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      return {
        version: gl.getParameter(gl.VERSION),
        renderer: ext && gl.getParameter(ext.UNMASKED_RENDERER_WEBGL),
      };
    });
    await tap("button-run");
    await enabled(true);
    await tap("button-run");
    await enabled(false);
    check("A: real touch toggles RUN / RUN ON and gameplay latch");
    if (process.env.SPRINT_CASE === "release") {
      await tap("button-run");
      await enabled(true);
      await stick();
      await advance(60);
      await up(1);
      await advance(60);
      await enabled(true);
      check("C: isolated joystick release preserves Run");
      report.status = "passed";
      await writeFile(
        path.join(out, "report.json"),
        JSON.stringify(report, null, 2),
      );
      await browser.close();
      await server.close();
      process.exit(0);
    }
    // Known open beach fixture, using the real collision/height solver.
    await place(-670, -820);
    await capture("01-idle-run-off");
    await stick();
    await advance(60);
    const walkStart = await snapshot();
    await advance(60);
    const walk = await snapshot();
    assert.ok(walk.speed > 3.15 && walk.speed < 3.35);
    assert.ok(Math.abs(displacement(walkStart, walk) - 3.25) < 0.08);
    assert.equal(walk.running, false);
    await capture("02-walking");
    // Critical original failure: second-thumb Run tap while the first finger is held.
    await tap("button-run");
    await enabled(true);
    assert.ok((await snapshot()).input.joyY > 0.95);
    await advance(60);
    const runStart = await snapshot();
    await advance(60);
    const run = await snapshot();
    assert.ok(run.speed > 6.25 && run.speed < 6.5);
    assert.ok(Math.abs(displacement(runStart, run) - 6.4) < 0.1);
    assert.ok(run.speed / walk.speed > 1.9);
    assert.equal(run.running, true);
    report.samples.push(
      { name: "walk", before: walkStart, after: walk },
      { name: "run", before: runStart, after: run },
    );
    await capture("03-running");
    check("B: joystick + second-thumb Run produces actual 3.25 → 6.4 m/s", {
      walk: walk.speed,
      run: run.speed,
    });
    await up(1);
    await advance(5);
    const slowing = await snapshot();
    await advance(55);
    const idle = await snapshot();
    assert.equal(idle.speed, 0);
    assert.equal(idle.running, false);
    await enabled(true);
    await capture("04-idle-run-latched");
    await stick();
    await advance(90);
    const resumed = await snapshot();
    assert.ok(resumed.speed > 6.25);
    assert.equal(resumed.running, true);
    await up(1);
    await advance(60);
    check(
      "C: release stops movement, preserves Run, and next gesture resumes sprint",
      { slowing, idle, resumed },
    );
    // The idle, walk and sprint poses must actually differ in the animated rig.
    assert.ok(run.rig.elbow < walk.rig.elbow - 0.4);
    assert.ok(run.rig.spine > walk.rig.spine + 0.1);
    assert.ok(Math.abs(idle.rig.leg) < 0.01);
    check("Actual Survivor rig transitions walk → run → slowing → idle", {
      walk: walk.rig,
      run: run.rig,
      idle: idle.rig,
    });
    // Eight directions, same full pressure, collision-free surrounding beach.
    for (const [x, y] of [
      [0, 1],
      [1, 1],
      [1, 0],
      [1, -1],
      [0, -1],
      [-1, -1],
      [-1, 0],
      [-1, 1],
    ]) {
      await place(-670, -820);
      await stick(x, y);
      await advance(60);
      const a = await snapshot();
      await advance(45);
      const b = await snapshot();
      assert.ok(
        b.speed > 6.25 && b.speed < 6.5,
        `direction ${x},${y}: ${b.speed}`,
      );
      assert.ok(Math.abs(displacement(a, b) / (45 / 60) - 6.4) < 0.12);
      await up(1);
      await advance(45);
      report.samples.push({ name: `direction-${x}-${y}`, before: a, after: b });
    }
    check(
      "Eight directions sprint at normalized maximum; diagonals do not exceed 6.4 m/s",
    );
    await place(-670, -820);
    await stick();
    await advance(1);
    await down(2, 540, 235);
    const beforeLook = await snapshot();
    await move(2, 600, 260);
    await advance(30);
    const duringLook = await snapshot();
    assert.ok(Math.abs(duringLook.camera.yaw - beforeLook.camera.yaw) > 0.35);
    assert.ok(
      duringLook.input.joyY > 0.95 &&
        duringLook.input.looking &&
        duringLook.input.run,
    );
    // Third finger toggles Run while stick AND orbit remain captured.
    await tap("button-run");
    await enabled(false);
    await advance(60);
    const tripleWalk = await snapshot();
    assert.ok(tripleWalk.speed > 3.15 && tripleWalk.speed < 3.35);
    assert.ok(tripleWalk.input.looking && tripleWalk.input.joyY > 0.95);
    await tap("button-run");
    await enabled(true);
    await advance(60);
    const tripleRun = await snapshot();
    assert.ok(tripleRun.speed > 6.25 && tripleRun.input.looking);
    // Continuous movement basis remains stable despite camera turns.
    assert.ok(Math.abs(tripleRun.position.x - beforeLook.position.x) < 0.1);
    await capture("05-three-touch-running-and-look");
    for (const [x, y] of [
      [760, 190],
      [470, 285],
      [600, 240],
    ]) {
      await move(2, x, y);
      await advance(10);
      const turning = await snapshot();
      assert.ok(
        turning.speed > 6.25 && turning.input.run && turning.input.joyY > 0.95,
      );
      assert.ok(Math.abs(turning.position.x - beforeLook.position.x) < 0.1);
      assert.ok(Number.isFinite(turning.camera.distance));
    }
    await down(7, (await box("button-run")).cx, (await box("button-run")).cy);
    const cancelledPointer = await page.evaluate(
      () =>
        window.touchEvidence
          .filter((e) => e.type === "pointerdown" && e.target === "button-run")
          .at(-1).id,
    );
    // Native touchCancel above/below is trusted. This extra per-pointer DOM
    // cancellation isolates one control while the other two fingers stay down.
    await page.getByTestId("button-run").dispatchEvent("pointercancel", {
      pointerId: cancelledPointer,
      pointerType: "touch",
      bubbles: true,
    });
    await up(7);
    const isolatedCancel = await snapshot();
    assert.ok(
      isolatedCancel.input.run &&
        isolatedCancel.input.looking &&
        isolatedCancel.input.joyY > 0.95,
    );
    report.isolatedPointerCancel = isolatedCancel;

    // A second orbit/joystick finger must not replace the original owner.
    await down(3, 700, 240);
    const yaw = (await snapshot()).camera.yaw;
    await move(3, 750, 280);
    assert.equal((await snapshot()).camera.yaw, yaw);
    await up(3);
    const jr = await box("joystick");
    await down(4, jr.cx - 30, jr.cy + 25);
    await move(4, jr.cx - 40, jr.cy + 35);
    await up(4);
    assert.ok((await snapshot()).input.joyY > 0.95);
    await up(2);
    assert.equal((await snapshot()).input.looking, false);
    await enabled(true);
    await up(1);
    await advance(60);
    check(
      "D: stick + Run + orbit; extra pointers cannot steal either gesture",
      {
        beforeLook,
        duringLook,
        tripleWalk,
        tripleRun,
      },
    );
    // Run drag/cancel is not a toggle and cannot clear an existing latch.
    const rb = await box("button-run");
    await down(7, rb.cx, rb.cy);
    await move(7, rb.cx - 100, rb.cy - 80);
    await up(7);
    await enabled(true);
    await down(7, rb.cx, rb.cy);
    await cancel();
    await enabled(true);
    for (let i = 0; i < 6; i++) await tap("button-run");
    await enabled(true);
    check(
      "Cancelled/dragged Run taps preserve state; six rapid taps toggle exactly six times",
    );
    await stick();
    await down(2, 540, 235);
    await cancel();
    await advance(60);
    const cancelled = await snapshot();
    assert.equal(cancelled.speed, 0);
    assert.equal(cancelled.input.looking, false);
    await enabled(true);
    check(
      "E: browser touchCancel releases stick/look without clearing deliberate Run",
      { cancelled },
    );
    // Keyboard + joystick pressure cap, and Shift operates independently of the latch.
    await tap("button-run");
    await enabled(false);
    await place(-670, -820);
    await page.keyboard.down("w");
    await page.keyboard.down("Shift");
    await advance(90);
    assert.ok((await snapshot()).speed > 6.25);
    assert.equal((await snapshot()).input.run, false);
    await stick(1, 1);
    await advance(60);
    assert.ok((await snapshot()).speed <= 6.401);
    await up(1);
    await page.keyboard.up("Shift");
    await advance(60);
    assert.ok((await snapshot()).speed < 3.35);
    await page.keyboard.up("w");
    await advance(60);
    // Native keyboard button activation remains usable and does not double-toggle.
    await page.getByTestId("button-run").focus();
    await page.keyboard.press("Space");
    await enabled(true);
    await page.keyboard.press("Enter");
    await enabled(false);
    check(
      "Keyboard Shift, keyboard Run activation and combined-input maximum preserved",
    );
    // Modal / reset / blur while actual contacts are still down. Their old moves
    // after reset must not resurrect movement or look.
    await tap("button-run");
    await stick();
    await down(2, 540, 235);
    await tap("island-map-toggle");
    await page.getByTestId("island-map-close").waitFor();
    // React propagates modal -> HUD -> App -> Player through effects. Manual
    // simulation can outrun those commits on a fast CI host. Wait for the
    // observed Player lock, without setting the lock or altering any input.
    const modalLock = async (expected) =>
      page.waitForFunction(
        (expected) => {
          const q = window.sprintQA,
            s = q.store.getState();
          s.gl.render = () => {};
          try {
            q.clock = Math.max(q.clock, s.clock.elapsedTime) + 1 / 60;
            q.f.advance(q.clock, false, s);
          } finally {
            s.gl.render = q.render;
          }
          return q.io.dbg.controlsLocked === expected;
        },
        expected,
        { timeout: 5000 },
      );
    await modalLock(true);
    await advance(10);
    assert.equal((await snapshot()).input.run, false);
    assert.equal((await snapshot()).input.looking, false);
    await page.keyboard.down("w");
    await advance(60);
    assert.equal((await snapshot()).speed, 0);
    await page.keyboard.up("w");
    await move(1, jr.cx, jr.cy - 40);
    await move(2, 620, 260);
    await up(1);
    await up(2);
    await tap("island-map-close");
    await page.getByTestId("island-map-close").waitFor({ state: "hidden" });
    await modalLock(false);
    await advance(10);
    await enabled(false);
    await tap("button-run");
    await stick();
    await tap("island-reset");
    await advance(60);
    assert.equal((await snapshot()).input.run, false);
    assert.equal((await snapshot()).speed, 0);
    await move(1, jr.cx, jr.cy - 40);
    assert.equal((await snapshot()).input.joyY, 0);
    await up(1);
    await tap("button-run");
    await stick();
    await down(2, 540, 235);
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await advance(60);
    assert.equal((await snapshot()).speed, 0);
    assert.equal((await snapshot()).input.run, false);
    await move(1, jr.cx, jr.cy - 40);
    await move(2, 620, 260);
    await up(1);
    await up(2);
    assert.equal((await snapshot()).input.joyY, 0);
    assert.equal((await snapshot()).input.looking, false);
    check(
      "Map lock, reset and focus loss clear capture, sprint and stale contacts",
    );
    // Real terrain camera blockers at the Tonsai cliff fixture; no art changes.
    await tap("island-travel");
    await tap("travel-tonsai-showcase");
    await advance(60);
    let blocked = 0;
    for (let i = 0; i < 12; i++) {
      await page.evaluate(
        (yaw) => (window.sprintQA.io.input.yaw = yaw),
        (i * Math.PI) / 6,
      );
      await advance(12);
      const s = await snapshot();
      if (s.camera.blocked) blocked++;
      assert.ok(
        Number.isFinite(s.camera.distance) &&
          s.camera.distance >= 0.69 &&
          s.camera.distance < 7.6,
      );
    }
    assert.ok(
      blocked > 0,
      "Tonsai camera blocker must actually shorten the boom",
    );
    report.cameraSweep = { blocked, positions: 12 };
    check(
      "Tonsai camera boom stays finite and bounded during full orbit",
      report.cameraSweep,
    );
    // A short unmodified RAF/WebGL sample complements deterministic displacement.
    await place(-670, -820);
    await tap("button-run");
    await stick();
    const liveBefore = await snapshot(),
      liveStart = Date.now();
    await page.evaluate(() => {
      const q = window.sprintQA,
        s = q.store.getState();
      s.clock.autoStart = true;
      s.clock.start();
      s.setFrameloop("always");
    });
    await page.waitForTimeout(1800);
    await page.evaluate(() => {
      const q = window.sprintQA,
        s = q.store.getState();
      s.setFrameloop("never");
      s.clock.stop();
      s.clock.autoStart = false;
      q.clock = s.clock.elapsedTime;
    });
    const liveAfter = await snapshot();
    assert.ok(displacement(liveBefore, liveAfter) > 0.01);
    assert.equal(liveAfter.running, true);
    report.liveRAF = {
      before: liveBefore,
      after: liveAfter,
      wallMs: Date.now() - liveStart,
      displacement: displacement(liveBefore, liveAfter),
    };
    await up(1);
    await advance(60);
    check("Real RAF + WebGL sprint moves and animates", report.liveRAF);
    await tap("button-run");
    await stick();
    await tap("island-menu");
    await move(1, jr.cx, jr.cy - 40);
    await up(1);
    const clean = await page.evaluate(async () => ({
      ...(await import("/src/game/state.ts")).input,
    }));
    assert.equal(clean.run, false);
    assert.equal(clean.joyY, 0);
    assert.equal(clean.looking, false);
    check("Scene exit while touching clears inputs");
  }
  for (const scene of ["camp", "tribal"]) {
    await tap(scene === "camp" ? "explore-island" : "explore-tribal");
    if (scene === "tribal") {
      await page.waitForFunction(() => window.__CAMP_DEBUG__.tribalFrames > 2);
      await tap("skip-tribal-intro");
      await tap("stand-and-explore");
    }
    await connect();
    await advance(90);
    await place(scene === "camp" ? -46 : 10, scene === "camp" ? -20 : 9);
    await enabled(false);
    await stick();
    await advance(45);
    const w = await snapshot();
    report.samples.push({ name: scene + "-walk", after: w });
    assert.ok(
      Object.values(w.rig).every(Number.isFinite),
      `${scene} finite walking rig`,
    );
    assert.ok(w.speed > 3.1, `${scene} walk ${w.speed}`);
    await tap("button-run");
    await enabled(true);
    await down(2, 540, 235);
    await move(2, 580, 250);
    await advance(60);
    const r = await snapshot();
    assert.ok(
      Object.values(r.rig).every(Number.isFinite),
      `${scene} finite running rig`,
    );
    assert.ok(r.speed > 6.1, `${scene} run ${r.speed}`);
    assert.equal(r.running, true);
    assert.equal(r.input.looking, true);
    await up(1);
    await up(2);
    await advance(60);
    await enabled(true);
    assert.equal((await snapshot()).speed, 0);
    await capture(`regression-${scene}`);
    await tap("button-reset");
    await advance(60);
    await enabled(false);
    await tap("button-menu");
    check(
      `F: ${scene} walking, sprinting, simultaneous look, release and reset`,
      { walk: w, run: r },
    );
  }
  await tap("explore-railay");
  await page.waitForFunction(() => window.__RAILAY__);
  await connect();
  await advance(60);
  await enabled(false);
  assert.equal((await snapshot()).input.joyY, 0);
  assert.equal((await snapshot()).input.looking, false);
  const geometry = await page.evaluate(() => ({
    scrollX,
    scrollY,
    width: innerWidth,
    height: innerHeight,
    scrollHeight: document.documentElement.scrollHeight,
  }));
  assert.equal(geometry.scrollX, 0);
  assert.equal(geometry.scrollY, 0);
  assert.equal(geometry.scrollHeight, geometry.height);
  for (const id of ["joystick", "button-run"]) {
    const r = await box(id);
    assert.ok(r.x >= 12 && r.y + r.height <= geometry.height - 11);
    const hit = await page.evaluate(
      ({ x, y }) =>
        document
          .elementFromPoint(x, y)
          ?.closest("[data-testid]")
          ?.getAttribute("data-testid"),
      { x: r.cx, y: r.cy },
    );
    assert.equal(hit, id);
  }
  check(
    "Return to Railay has no phantom inputs; landscape controls hit-test with edge margins and no page scrolling",
    geometry,
  );
  assert.deepEqual(report.errors, []);
  report.status = "passed";
} catch (error) {
  report.status = "failed";
  if (page)
    report.failureSnapshot = await page
      .evaluate(() => ({
        input: { ...window.sprintQA?.io.input },
        position: { ...window.__CAMP_DEBUG__?.position },
      }))
      .catch(() => null);
  report.failure = error.stack;
  if (page)
    await page
      .screenshot({ path: path.join(out, "failure.jpg") })
      .catch(() => {});
  throw error;
} finally {
  if (page)
    report.events = await page
      .evaluate(() => window.touchEvidence)
      .catch(() => []);
  await writeFile(
    path.join(out, "report.json"),
    JSON.stringify(report, null, 2),
  );
  await browser?.close();
  await server.close();
}
console.log("Mobile sprint WebGL QA passed");
