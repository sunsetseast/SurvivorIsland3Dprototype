/** Production WebGL assertions for shared lighting, preset isolation and owned cloud resources. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { preview } from "vite";
import { chromium } from "playwright";
const out =
  process.env.ATMOSPHERE_EVIDENCE ||
  "../../docs/tonsai-atmosphere/evidence/integration";
await mkdir(out, { recursive: true });
process.env.PORT = "5194";
process.env.BASE_PATH = "/";
const server = await preview({
  configFile: "vite.config.ts",
  build: { outDir: "../../generated-artifacts/atmosphere-after" },
  preview: { host: "127.0.0.1", port: 5194, strictPort: true },
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
const page = await browser.newPage({
  viewport: { width: 932, height: 430 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 1,
});
page.setDefaultTimeout(120000);
const report = {
  method:
    "Minified production bundle; real software WebGL. Not physical iPhone Safari.",
  checks: [],
  errors: [],
};
page.on("pageerror", (e) => report.errors.push(e.message));
const check = (name, detail) => {
  report.checks.push({ name, detail });
  console.log("PASS", name);
};
async function enter(query = "") {
  await page.goto("http://127.0.0.1:5194/?quality=low" + query);
  await page.getByTestId("explore-island").click();
  await page.waitForFunction(
    () =>
      window.__WORLD_RENDER__?.scene.getObjectByName("camp-assets-ready") &&
      window.__WORLD_RENDER__.scene.getObjectByName("andaman-tropical-sky")
        .material.userData.cloudReady,
  );
  await page.evaluate(() => {
    const s = window.__WORLD_RENDER__.state;
    s.setFrameloop("never");
    s.clock.stop();
    s.clock.autoStart = false;
  });
}
try {
  for (const preset of ["midday", "afternoon", "golden"]) {
    await enter(preset === "midday" ? "" : "&devTravel=1&atmosphere=" + preset);
    const result = await page.evaluate(() => {
      const { scene, state: s } = window.__WORLD_RENDER__,
        sky = scene.getObjectByName("andaman-tropical-sky"),
        water = scene.getObjectByName("continuous-tropical-ocean");
      let sun;
      const hashed = [];
      let covered = 0;
      scene.traverse((o) => {
        if (o.isDirectionalLight) sun = o;
        for (const m of [o.material].flat().filter(Boolean)) {
          if (m.alphaHash) hashed.push(m.name);
          if (m.alphaToCoverage) covered++;
        }
      });
      const u = sky.material.uniforms,
        w = water.material.uniforms;
      const dir = sun.position.clone().sub(sun.target.position).normalize();
      const t = u.uTime.value;
      // setFrameloop("never") resets R3F's clock. Advance past the last
      // rendered shader time instead of accidentally taking it backwards.
      s.advance(Math.max(s.clock.elapsedTime, t) + 1, false);
      window.qaGl = s.gl;
      window.qaCloudRelease = { geometry: 0, material: 0, texture: 0 };
      sky.geometry.addEventListener(
        "dispose",
        () => window.qaCloudRelease.geometry++,
      );
      sky.material.addEventListener(
        "dispose",
        () => window.qaCloudRelease.material++,
      );
      u.uCloudAtlas.value.addEventListener(
        "dispose",
        () => window.qaCloudRelease.texture++,
      );
      return {
        sunError: dir.distanceTo(u.uSun.value),
        waterSunError: w.uSun.value.distanceTo(u.uSun.value),
        skyError: w.uZenith.value.equals(u.uZenith.value) ? 0 : 1,
        cloud: [
          u.uCloudAtlas.value.image.width,
          u.uCloudAtlas.value.image.height,
        ],
        animated: u.uTime.value > t,
        hashed,
        covered,
        exposure: s.gl.toneMappingExposure,
      };
    });
    assert.ok(result.sunError < 1e-10);
    assert.ok(result.waterSunError < 1e-10);
    assert.ok(result.skyError < 1e-10);
    assert.deepEqual(result.cloud, [1024, 512]);
    assert.ok(result.animated);
    assert.deepEqual(result.hashed, []);
    assert.ok(result.covered > 0);
    assert.equal(result.exposure, 0.96);
    check(preset + " sun, sky, ocean and filtered foliage agree", result);
    if (preset !== "midday") {
      await page.evaluate(() => {
        const s = window.__WORLD_RENDER__.state;
        s.camera.position.set(-51, 4, 0);
        s.camera.lookAt(-72, 22, -25);
        s.camera.updateMatrixWorld();
        const sky = s.scene.getObjectByName("andaman-tropical-sky");
        sky.position.copy(s.camera.position);
        s.gl.render(s.scene, s.camera);
      });
      await page.screenshot({
        path: out + "/" + preset + ".jpg",
        type: "jpeg",
        quality: 90,
      });
    }
    await page.getByTestId("button-menu").click();
    await page.getByTestId("explore-island").waitFor();
    await page.waitForFunction(
      () =>
        Object.values(window.qaCloudRelease).every((n) => n > 0) &&
        window.qaGl.toneMappingExposure === 1,
    );
    check(
      preset + " cloud resources released; exposure restored",
      await page.evaluate(() => ({
        disposed: window.qaCloudRelease,
        memory: window.qaGl.info.memory,
      })),
    );
  }
  await page.route("**/tropical-clouds-*.png", (route) =>
    route.abort("failed"),
  );
  await enter();
  const fallback = await page.evaluate(() => {
    const s = window.__WORLD_RENDER__.state;
    return {
      sky: s.scene.getObjectByName("andaman-tropical-sky").material.userData
        .cloudReady,
      position: window.__CAMP_DEBUG__.position,
    };
  });
  assert.equal(fallback.sky, "fallback");
  await page.keyboard.down("w");
  await page.evaluate(() => {
    const s = window.__WORLD_RENDER__.state;
    for (let i = 0; i < 45; i++) s.advance(s.clock.elapsedTime + 1 / 60, false);
  });
  await page.keyboard.up("w");
  const moved = await page.evaluate(() => window.__CAMP_DEBUG__.position);
  assert.ok(
    Math.hypot(moved.x - fallback.position.x, moved.z - fallback.position.z) >
      0.3,
  );
  check("missing cloud atlas retains blue-sky fallback and player movement", {
    fallback,
    moved,
  });
  assert.deepEqual(report.errors, []);
  report.result = "PASS";
} catch (e) {
  report.result = "FAIL";
  report.failure = e.stack;
  throw e;
} finally {
  await writeFile(out + "/report.json", JSON.stringify(report, null, 2));
  await browser.close();
  await new Promise((r) => server.httpServer.close(r));
}
