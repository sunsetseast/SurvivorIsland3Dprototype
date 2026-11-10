import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";

const out = process.env.CAST_EVIDENCE ?? "../../docs/character-benchmarks/evidence";
const port = Number(process.env.CAST_QA_PORT ?? 5229);
process.env.PORT = String(port);
process.env.BASE_PATH = "/";
const base = `http://127.0.0.1:${port}/?quality=low`;
const preview = `${base}&cast-preview=benchmarks`;
const ids = [10, 17];
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
await mkdir(out, { recursive: true });
const server = await createServer({
  server: { host: "127.0.0.1", port, strictPort: true, hmr: false, watch: null },
  optimizeDeps: { include: ["three/addons/loaders/GLTFLoader.js", "three/addons/libs/meshopt_decoder.module.js"] },
});
await server.listen();
let browser;
try {
  browser = await chromium.launch({
    executablePath: process.env.CAMP_CHROMIUM,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader", "--single-process", "--no-zygote"],
  });
  const context = await browser.newContext({
    viewport: { width: 932, height: 430 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
  });
  const page = await context.newPage();
  const input = await context.newCDPSession(page);
  const errors = [];
  const report = { browser: browser.version(), viewport: "932 × 430", defaultCast: [], previews: [], errors };
  page.setDefaultTimeout(80_000);
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error" && /THREE|shader|WebGL/i.test(message.text())) errors.push(message.text());
  });
  const tap = (id) => page.getByTestId(id).tap();
  const shot = (name) => page.screenshot({ path: `${out}/${name}.jpg`, type: "jpeg", quality: 86 });

  async function choose(id, usePreview) {
    await page.goto(usePreview ? preview : base);
    await tap("new-survivor");
    const kind = usePreview ? "benchmarks" : "cast";
    const path = `/src/assets/characters/${kind}/survivor-${id}.glb`;
    const request = page.waitForResponse((r) => new URL(r.url()).pathname === path);
    await tap(`select-survivor-${id}`);
    const response = await request;
    assert.equal(response.status(), 200);
    const bytes = await response.body();
    const expected = await readFile(new URL(`..${path}`, import.meta.url));
    assert.equal(hash(bytes), hash(expected), `Picker did not load ${kind} ID ${id}`);
    await page.locator(`[data-model-id="${id}"]`).waitFor();
    return hash(bytes);
  }

  async function move(action) {
    const box = await page.getByTestId("joystick").boundingBox();
    assert.ok(box, "Camp touch joystick unavailable");
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    const start = await page.evaluate(() =>
      window.__WORLD_RENDER__.scene.getObjectByName("exploration-player").position.toArray());
    await input.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
    await input.send("Input.dispatchTouchEvent", {
      type: "touchMove", touchPoints: [{ x, y: y - box.height * .40, id: 1 }],
    });
    try {
      await page.waitForFunction(({ start, action }) => {
        const player = window.__WORLD_RENDER__?.scene.getObjectByName("exploration-player");
        return player && Math.hypot(player.position.x - start[0], player.position.z - start[2]) > .14 &&
          player.getObjectByName("survivor-visual-offset")?.userData.action === action;
      }, { start, action });
    } catch (error) {
      await input.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      throw error;
    }
  }

  for (const id of ids) {
    report.defaultCast.push({ id, sha256: await choose(id, false) });
    await shot(`${id}-picker-control`);
    console.log(`PASS production picker ID ${id}`);
    const sha256 = await choose(id, true);
    await shot(`${id}-picker`);
    await tap("confirm-survivor");
    await page.waitForFunction((id) => {
      const scene = window.__WORLD_RENDER__?.scene;
      return scene?.getObjectByName("location-camp_tribe_a") &&
        scene.getObjectByName("skinned-survivor")?.userData.survivorId === id;
    }, id);
    await page.waitForFunction(async () =>
      (await import("/src/game/locations/travel.ts")).worldTravel.getSnapshot().phase === "ready");
    await shot(`${id}-camp-standing`);
    const detail = await page.evaluate(() => {
      const { scene, camera, gl } = window.__WORLD_RENDER__;
      const actor = scene.getObjectByName("skinned-survivor");
      const head = actor.getObjectByName("Head");
      const at = head.getWorldPosition(head.position.clone());
      at.y -= .36;
      const front = actor.getWorldDirection(at.clone()).multiplyScalar(2.48);
      const view = camera.clone();
      view.position.copy(at).add(front);
      view.position.x += .41;
      view.position.y += .04;
      view.lookAt(at);
      view.fov = 35;
      view.updateProjectionMatrix();
      gl.render(scene, view);
      return gl.domElement.toDataURL("image/jpeg", .9).split(",")[1];
    });
    await writeFile(`${out}/${id}-camp-detail.jpg`, Buffer.from(detail, "base64"));

    for (const action of ["walk", "run"]) {
      if (action === "run") await tap("button-run");
      await move(action);
      try {
        await shot(`${id}-camp-${action}`);
      } finally {
        await input.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      }
    }
    const stats = await page.evaluate(() => {
      const { gl, stats } = window.__WORLD_RENDER__;
      const { calls, triangles, textures } = stats();
      return { calls, triangles, textures, dpr: gl.getPixelRatio() };
    });
    report.previews.push({ id, sha256, standing: true, walk: true, run: true, ...stats });
    console.log(`PASS candidate picker, camp, walk and run ID ${id}`);
  }
  assert.deepEqual(errors, []);
  await writeFile(`${out}/webgl-report.json`, JSON.stringify(report, null, 2) + "\n");
} finally {
  await browser?.close();
  await server.close();
}
