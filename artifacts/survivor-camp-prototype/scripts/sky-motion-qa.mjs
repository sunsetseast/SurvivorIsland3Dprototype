/** Motion regression in the minified app with the real Player frame order.
 * Only this test build exposes input/Three. No shipping QA controls are added.
 * Captures are sampled at 10 Hz from fixed 60 Hz simulation, not device FPS. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { build, preview } from "vite";
import { chromium } from "playwright";

const phase = process.env.SKY_PHASE || "after";
const out = path.resolve(`../../docs/sky-motion/evidence/${phase}`);
const dist = `../../generated-artifacts/sky-motion-${phase}`;
const port = Number(process.env.SKY_PORT || 5193);
process.env.PORT = String(port);
process.env.BASE_PATH = "/";
await mkdir(out, { recursive: true });
if (process.env.SKY_SKIP_BUILD !== "1")
  await build({
    configFile: "vite.config.ts",
    plugins: [
      {
        name: "sky-motion-test-only-bridge",
        enforce: "pre",
        transform(src, id) {
          if (id.endsWith("/game/environment/atmosphere.ts"))
            return src + ";window.__SKY_QA__??={};window.__SKY_QA__.T=T;";
          if (id.endsWith("/game/state.ts"))
            return (
              src +
              ";window.__SKY_QA__??={};window.__SKY_QA__.io={input,dbg,clearInput};"
            );
        },
      },
    ],
    build: { outDir: dist, emptyOutDir: true },
  });
const server = await preview({
  configFile: "vite.config.ts",
  build: { outDir: dist },
  preview: { host: "127.0.0.1", port, strictPort: true },
});
let browser;
const report = {
  phase,
  base: "ffc142eaf12354204eaf91a447b7ae616b98f86b",
  method:
    "Minified production app; real Player and native frame subscriber order. Fixed 60 Hz simulation, 10 Hz rendered evidence. Sky-only RGB readbacks exclude terrain/foliage/HUD. ANGLE SwiftShader, not physical iPhone Safari or phone FPS.",
  samples: [],
  checks: [],
  errors: [],
};
const check = (name, detail) => {
  report.checks.push({ name, detail });
  console.log("PASS", name);
};
try {
  browser = await chromium.launch({
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
  report.browser = browser.version();
  const page = await browser.newPage({
    viewport: { width: 800, height: 360 },
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
  for (const quality of ["low", "high"]) {
    await mkdir(`${out}/${quality}-frames`, { recursive: true });
    await page.goto(`http://127.0.0.1:${port}/?quality=${quality}&devTravel=1`);
    await page.getByTestId("explore-island").click();
    await page.waitForFunction(
      () =>
        window.__WORLD_RENDER__?.scene.getObjectByName("camp-assets-ready") &&
        window.__WORLD_RENDER__.scene.getObjectByName("andaman-tropical-sky")
          ?.material.userData.cloudReady === true,
    );
    await page.evaluate(() => {
      const q = window.__SKY_QA__,
        s = window.__WORLD_RENDER__.state,
        T = q.T;
      s.setFrameloop("never");
      s.clock.stop();
      s.clock.autoStart = false;
      Object.assign(q, {
        s,
        time: s.clock.elapsedTime,
        render: s.gl.render.bind(s.gl),
        sky: s.scene.getObjectByName("andaman-tropical-sky"),
      });
      q.step = (n = 6) => {
        s.gl.render = () => {};
        try {
          for (let i = 0; i < n; i++) s.advance((q.time += 1 / 60), false);
        } finally {
          s.gl.render = q.render;
        }
      };
      q.diff = (a, b) => {
        let sum = 0,
          max = 0,
          changed = 0;
        for (let i = 0; i < a.length; i++)
          if (i % 4 !== 3) {
            const d = Math.abs(a[i] - b[i]);
            sum += d;
            max = Math.max(max, d);
            if (d > 2) changed++;
          }
        return {
          mean: sum / (a.length * 0.75),
          max,
          changedFraction: changed / (a.length * 0.75),
        };
      };
      q.testScene = new T.Scene();
      q.testScene.background = new T.Color("#ff00ff");
      q.copy = q.sky.clone();
      q.testScene.add(q.copy);
      q.target = new T.WebGLRenderTarget(384, 180);
      q.read = (camera = s.camera, centered = false) => {
        q.copy.position.copy(centered ? camera.position : q.sky.position);
        q.copy.quaternion.copy(q.sky.quaternion);
        const previous = s.gl.getRenderTarget(),
          shadows = s.gl.shadowMap.enabled;
        s.gl.shadowMap.enabled = false;
        s.gl.setRenderTarget(q.target);
        q.render(q.testScene, camera);
        const pixels = new Uint8Array(384 * 180 * 4);
        s.gl.readRenderTargetPixels(q.target, 0, 0, 384, 180, pixels);
        s.gl.setRenderTarget(previous);
        s.gl.shadowMap.enabled = shadows;
        return pixels;
      };
      q.sample = () => {
        const actual = q.read(),
          centered = q.read(s.camera, true);
        return {
          time: q.time,
          cloudTime: q.sky.material.uniforms.uTime.value,
          camera: s.camera.position.toArray(),
          quaternion: s.camera.quaternion.toArray(),
          skyPosition: q.sky.position.toArray(),
          centerOffset: s.camera.position.distanceTo(q.sky.position),
          correctedReferenceError: q.diff(actual, centered),
          position: { ...window.__CAMP_DEBUG__.position },
          running: q.io.dbg.running,
        };
      };
      q.io.dbg.teleportRequested = { x: -51, z: 0 };
      q.io.input.yaw = Math.PI / 2;
      q.io.input.pitch = -0.18;
      q.io.input.looking = true;
      q.step(150);
    });
    const initial = await page.evaluate(() => {
      const q = window.__SKY_QA__,
        s = q.s;
      return {
        ...q.sample(),
        subscribers: s.internal.subscribers.length,
        depthWrite: q.sky.material.depthWrite,
        depthTest: q.sky.material.depthTest,
        renderOrder: q.sky.renderOrder,
        sphereRadius: q.sky.geometry.parameters.radius,
        skyQuaternion: q.sky.quaternion.toArray(),
        sun: q.sky.material.uniforms.uSun.value.toArray(),
        renderer: s.gl.getContext().getParameter(s.gl.getContext().RENDERER),
      };
    });
    const motions = [];
    const batch = { quality, initial, motions };
    report.samples.push(batch);
    let frame = 0;
    const capture = async (name, change) => {
      const result = await page.evaluate(
        ({ name, change }) => {
          const q = window.__SKY_QA__,
            i = q.io.input;
          if (change.yaw !== undefined) i.yaw = change.yaw;
          if (change.pitch !== undefined) i.pitch = change.pitch;
          q.step(6);
          const sample = q.sample();
          q.render(q.s.scene, q.s.camera);
          return {
            name,
            ...sample,
            image: q.s.gl.domElement.toDataURL("image/jpeg", 0.86),
          };
        },
        { name, change },
      );
      const { image, ...sample } = result;
      motions.push(sample);
      await writeFile(
        `${out}/${quality}-frames/${String(frame++).padStart(3, "0")}.jpg`,
        Buffer.from(image.split(",")[1], "base64"),
      );
    };
    const baseYaw = Math.PI / 2;
    for (let k = 1; k <= 36; k++)
      await capture("360 orbit", { yaw: baseYaw + (k * Math.PI * 2) / 36 });
    for (let k = 1; k <= 9; k++)
      await capture("90 out", { yaw: baseYaw + (k * Math.PI) / 18 });
    for (let k = 8; k >= 0; k--)
      await capture("90 back", { yaw: baseYaw + (k * Math.PI) / 18 });
    for (const pitch of [
      -0.25, -0.05, 0.2, 0.5, 0.9, 1.15, 0.9, 0.5, 0.2, -0.05, -0.18,
    ])
      await capture("pitch", { pitch });
    // Face along the traversable beach; facing the ocean would test a blocked walk.
    await capture("turn along beach", { yaw: 0 });
    await page.keyboard.down("w");
    for (let k = 0; k < 10; k++) await capture("walk forward", {});
    await page.keyboard.up("w");
    await page.keyboard.down("s");
    for (let k = 0; k < 10; k++) await capture("walk backward", {});
    await page.keyboard.up("s");
    // Trusted UI click drives the existing sprint toggle, keyboard drives movement.
    await page.getByTestId("button-run").click();
    await page.keyboard.down("w");
    for (let k = 1; k <= 12; k++)
      await capture("run + rotate", { yaw: (k * Math.PI) / 18 });
    await page.keyboard.up("w");
    await page.getByTestId("button-run").click();
    assert.ok(
      motions.some((m) => m.running),
      "native Player sprint must execute",
    );
    assert.ok(
      motions.every((m) => Math.abs(m.time - m.cloudTime) < 1e-10),
      "cloud animation must track elapsed time throughout every input sequence",
    );
    const walked = motions.filter((m) => m.name.startsWith("walk"));
    assert.ok(
      Math.hypot(
        walked[9].position.x - walked[0].position.x,
        walked[9].position.z - walked[0].position.z,
      ) > 0.5,
      "player must walk",
    );
    const worst = motions.reduce((a, b) =>
      a.correctedReferenceError.mean > b.correctedReferenceError.mean ? a : b,
    );
    if (phase === "before")
      assert.ok(
        worst.correctedReferenceError.mean > 1,
        "baseline must reproduce visible sky drift",
      );
    else
      assert.ok(
        worst.correctedReferenceError.mean < 0.02,
        JSON.stringify(worst),
      );
    check(
      `${quality}: native motion ${phase === "before" ? "reproduces defect" : "keeps world sky aligned"}`,
      { frames: motions.length, worst },
    );

    // Deterministic camera tests freeze ONLY cloud time, not camera transforms.
    const invariants = await page.evaluate(() => {
      const q = window.__SKY_QA__,
        s = q.s,
        T = q.T,
        u = q.sky.material.uniforms;
      const c = s.camera.clone();
      c.position.set(-51, 4, 0);
      c.fov = 55;
      c.aspect = 384 / 180;
      c.updateProjectionMatrix();
      const pose = (yaw, pitch) => {
        c.quaternion.setFromEuler(new T.Euler(pitch, yaw, 0, "YXZ"));
        c.updateMatrixWorld();
      };
      u.uTime.value = 40;
      pose(1.7, 0.35);
      // Center once, then move the camera without touching the sky or advancing callbacks.
      q.sky.position.copy(c.position);
      const original = q.read(c),
        results = {};
      pose(1.7 + Math.PI / 2, 0.35);
      results.revealsDifferentClouds = q.diff(original, q.read(c));
      pose(1.7, 0.35);
      results.return90 = q.diff(original, q.read(c));
      pose(1.7 + Math.PI * 2, 0.35);
      results.return360 = q.diff(original, q.read(c));
      pose(1.7, 1.4);
      q.read(c);
      pose(1.7, -0.9);
      q.read(c);
      pose(1.7, 0.35);
      results.returnPitch = q.diff(original, q.read(c));
      c.position.add(new T.Vector3(10, 3, -8));
      c.updateMatrixWorld();
      results.translation = q.diff(original, q.read(c));
      c.position.set(-51, 4, 0);
      c.updateMatrixWorld();
      u.uTime.value = 100;
      results.slowAnimation = q.diff(original, q.read(c));
      // Adjacent views straddle the mesh's duplicated UV seam (-X) and atlas wrap (-Z).
      u.uTime.value = 40;
      pose(Math.PI / 2 - 0.00001, 0.35);
      const seam = q.read(c);
      pose(Math.PI / 2 + 0.00001, 0.35);
      results.seam = q.diff(seam, q.read(c));
      pose(-0.00001, 0.35);
      const wrap = q.read(c);
      pose(0.00001, 0.35);
      results.atlasWrap = q.diff(wrap, q.read(c));
      pose(0, Math.PI / 2);
      const pole = q.read(c);
      pose(Math.PI * 2, Math.PI / 2);
      results.pole = q.diff(pole, q.read(c));
      results.sun = u.uSun.value.toArray();
      return results;
    });
    for (const key of ["return90", "return360", "returnPitch", "pole"])
      assert.ok(invariants[key].mean < 0.02, key);
    assert.ok(invariants.revealsDifferentClouds.mean > 1);
    assert.ok(invariants.slowAnimation.mean > 0.05);
    assert.ok(invariants.seam.mean < 0.1);
    assert.ok(invariants.atlasWrap.mean < 0.1);
    if (phase === "after") assert.equal(invariants.translation.mean, 0);
    else assert.ok(invariants.translation.mean > 1);
    assert.deepEqual(invariants.sun, initial.sun);
    check(
      `${quality}: return poses, seam, pole, sun, elapsed animation and translation`,
      invariants,
    );
    batch.invariants = invariants;
    await page.evaluate(() => {
      const q = window.__SKY_QA__;
      q.target.dispose();
      q.testScene.remove(q.copy);
    });
  }
  assert.deepEqual(report.errors, []);
  report.result = phase === "before" ? "DEFECT REPRODUCED" : "PASS";
} catch (e) {
  report.result = "FAIL";
  report.failure = e.stack;
  throw e;
} finally {
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  await browser?.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
