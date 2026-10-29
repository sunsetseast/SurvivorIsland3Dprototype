/** Genuine WebGL layout diagnostic. Elevated camera, fog disabled; this is
 * deliberately separate from the normal third-person gameplay evidence. */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
export async function captureOverview(page, out) {
  await page.evaluate(() => {
    const s = window.__WORLD_RENDER__.state,
      c = s.camera;
    window.overviewSaved = {
      position: c.position.toArray(),
      quaternion: c.quaternion.toArray(),
      fov: c.fov,
      far: c.far,
      fog: s.scene.fog,
    };
    s.scene.fog = null;
    const pose = () => {
      c.position.set(30, 180, 40);
      c.lookAt(30, 0, 30);
      c.fov = 65;
      c.far = 600;
      c.updateProjectionMatrix();
      c.updateMatrixWorld();
    };
    // Player and late-mounted foliage callbacks register in different orders.
    // Give every callback the same diagnostic camera without editing scene art.
    const callbacks = s.internal.subscribers.map((sub) => [
      sub.ref,
      sub.ref.current,
    ]);
    for (const [ref, fn] of callbacks)
      ref.current = (...args) => {
        pose();
        return fn(...args);
      };
    const render = s.gl.render;
    s.gl.render = () => {};
    try {
      let t = s.clock.elapsedTime;
      for (let i = 0; i < 24; i++) {
        pose();
        t += 1 / 60;
        s.advance(t, false);
      }
    } finally {
      s.gl.render = render;
      for (const [ref, fn] of callbacks) ref.current = fn;
    }
    // The Sky and instanced batches have now observed this diagnostic camera.
    pose();
    render.call(s.gl, s.scene, c);
  });
  await page.screenshot({
    path: `${out}/diagnostic-27-expanded-overview.jpg`,
    type: "jpeg",
    quality: 92,
  });
  await page.evaluate(() => {
    const s = window.__WORLD_RENDER__.state,
      c = s.camera,
      p = window.overviewSaved;
    c.position.fromArray(p.position);
    c.quaternion.fromArray(p.quaternion);
    c.fov = p.fov;
    c.far = p.far;
    s.scene.fog = p.fog;
    c.updateProjectionMatrix();
    c.updateMatrixWorld();
    delete window.overviewSaved;
  });
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { chromium } = await import("playwright"),
    { createServer } = await import("vite");
  process.env.PORT = "5198";
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
  try {
    const page = await browser.newPage({
      viewport: { width: 932, height: 430 },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 1,
    });
    page.setDefaultTimeout(120000);
    await page.goto("http://127.0.0.1:5198/?quality=high");
    await page.getByTestId("explore-island").click();
    await page.waitForFunction(
      () =>
        window.__WORLD_RENDER__?.scene.getObjectByName("camp-assets-ready") &&
        window.__CAMP_DEBUG__?.position.y > 0,
    );
    await page.evaluate(() => {
      const s = window.__WORLD_RENDER__.state;
      s.setFrameloop("never");
      s.clock.stop();
      s.clock.autoStart = false;
    });
    const before = await page.evaluate(() => window.__CAMP_DEBUG__.position);
    await page.getByRole("button", { name: "Expand camp map" }).click();
    await page.keyboard.down("w");
    const mapCheck = await page.evaluate(async () => {
      const s = window.__WORLD_RENDER__.state;
      let t = s.clock.elapsedTime;
      const render = s.gl.render;
      s.gl.render = () => {};
      try {
        for (let i = 0; i < 60; i++) {
          t += 1 / 60;
          s.advance(t, false);
        }
      } finally {
        s.gl.render = render;
      }
      const { dbg } = await import("/src/game/state.ts");
      return {
        position: { x: dbg.x, z: dbg.z },
        controlsLocked: dbg.controlsLocked,
      };
    });
    await page.keyboard.up("w");
    if (
      !mapCheck.controlsLocked ||
      Math.hypot(
        before.x - mapCheck.position.x,
        before.z - mapCheck.position.z,
      ) > 0.001
    )
      throw Error("Expanded map did not lock movement");
    await page.waitForTimeout(150);
    await page.screenshot({
      path: "../../docs/tonsai-expansion/evidence/high-24-camp-map.jpg",
      type: "jpeg",
      quality: 92,
    });
    await page.getByRole("button", { name: "Close camp map" }).click();
    const { writeFile } = await import("node:fs/promises");
    await writeFile(
      "../../docs/tonsai-expansion/evidence/map-check.json",
      JSON.stringify(
        {
          result: "PASS",
          method:
            "Trusted W key held for 60 real Player ticks while expanded map is open",
          before,
          ...mapCheck,
        },
        null,
        2,
      ),
    );
    await captureOverview(page, "../../docs/tonsai-expansion/evidence");
    console.log(
      "PASS elevated WebGL overview; fog disabled; culling and sky updated",
    );
  } finally {
    await browser.close();
    await server.close();
  }
}
