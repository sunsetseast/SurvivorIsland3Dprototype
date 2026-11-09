import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";

const out = process.env.CAST_EVIDENCE ?? "../../docs/cast-migration/evidence";
const port = Number(process.env.CAST_QA_PORT ?? 5227);
process.env.PORT = String(port);
process.env.BASE_PATH = "/";
const url = `http://127.0.0.1:${port}/?quality=low`;
const councilOnly = process.argv.includes("--council");
const scenesOnly = councilOnly || process.argv.includes("--scenes");
await mkdir(out, { recursive: true });
const server = await createServer({
  server: { host: "127.0.0.1", port, strictPort: true, hmr: false, watch: null },
  optimizeDeps: { include: ["three/addons/loaders/GLTFLoader.js", "three/addons/libs/meshopt_decoder.module.js", "three/addons/utils/SkeletonUtils.js"] },
});
await server.listen();
const browser = await chromium.launch({
  executablePath: process.env.CAMP_CHROMIUM,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--single-process", "--no-zygote"],
});
const context = await browser.newContext({ viewport: { width: 932, height: 430 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const page = await context.newPage();
page.setDefaultTimeout(75_000);
const input = await context.newCDPSession(page);
const errors = [];
const report = { browser: browser.version(), checks: [], perf: [], requests: [], errors };
page.on("pageerror", (error) => errors.push(String(error)));
page.on("console", (message) => {
  if (message.type() === "error" && /THREE|shader|WebGL/i.test(message.text())) errors.push(message.text());
});
const tap = (id) => page.getByTestId(id).tap();
const shot = (name) => page.screenshot({ path: `${out}/${name}.jpg`, type: "jpeg", quality: 85 });
const check = (name) => { report.checks.push(name); console.log(`PASS ${name}`); };

async function ready(location, model) {
  await page.waitForFunction(({ location, model }) => {
    const scene = window.__WORLD_RENDER__?.scene;
    return scene?.getObjectByName(`location-${location}`) && (!model || scene.getObjectByName("skinned-survivor")?.userData.survivorId === model);
  }, { location, model });
  await page.waitForFunction(async () => (await import("/src/game/locations/travel.ts")).worldTravel.getSnapshot().phase === "ready");
}
async function castIds(root) {
  return page.evaluate((name) => {
    const scene = window.__WORLD_RENDER__.scene;
    const group = name ? scene.getObjectByName(name) : scene;
    const models = [];
    group?.traverse((node) => { if (node.userData.riggedCast) models.push(node.userData.survivorId); });
    return models.sort((a, b) => a - b);
  }, root);
}
async function waitForCast(root, count) {
  await page.waitForFunction(({ root, count }) => {
    const scene = window.__WORLD_RENDER__?.scene;
    const group = root ? scene?.getObjectByName(root) : scene;
    let ready = 0;
    group?.traverse((node) => { if (node.userData.riggedCast) ready++; });
    return ready === count;
  }, { root, count });
}
async function seated(root, count) {
  await page.waitForFunction(({ root, count }) => {
    const scene = window.__WORLD_RENDER__?.scene;
    const group = root ? scene?.getObjectByName(root) : scene;
    let posed = 0;
    group?.traverse((node) => {
      if (!node.userData.riggedCast || node.parent?.userData.action !== "sit") return;
      const hip = node.getObjectByName("Hips");
      const knee = node.getObjectByName("LeftLeg");
      if (!hip || !knee) return;
      const h = hip.getWorldPosition(hip.position.clone());
      const k = knee.getWorldPosition(knee.position.clone());
      const aboveBench = root !== "council-jurors" || h.y > 1.30;
      if (aboveBench && Math.hypot(h.x - k.x, h.z - k.z) > 0.24 && Math.abs(h.y - k.y) < 0.26) posed++;
    });
    return posed === count;
  }, { root, count });
}
async function framed(name, position, target) {
  const result = await page.evaluate(({ position, target }) => {
    const { camera, scene, gl } = window.__WORLD_RENDER__;
    const view = camera.clone();
    view.position.fromArray(position);
    view.lookAt(...target);
    view.fov = 46;
    view.updateProjectionMatrix();
    gl.render(scene, view);
    return gl.domElement.toDataURL("image/jpeg", 0.88).split(",")[1];
  }, { position, target });
  await writeFile(`${out}/${name}.jpg`, Buffer.from(result, "base64"));
}
async function choose(id, capture = false) {
  await tap("new-survivor");
  await page.getByTestId("survivor-selection").waitFor();
  if (id === 11) {
    await page.getByLabel("Gender").selectOption("female");
    await page.getByLabel("Trait class").selectOption("Mental");
    assert.equal(await page.getByTestId("select-survivor-4").count(), 0);
    await page.getByLabel("Trait class").selectOption("");
  }
  await tap(`select-survivor-${id}`);
  await page.locator(`[data-model-id="${id}"]`).waitFor();
  const panel = (await page.getByRole("region", { name: "Survivor attributes" }).innerText()).toLowerCase();
  const { source } = await page.evaluate(async (id) => (await import("/src/game/character/cast.ts")).castMember(id), id);
  assert.ok([source.name, source.season, source.gameplayStyle].every((field) => panel.includes(field.toLowerCase())), panel);
  if (capture) await shot("selection");
  await tap("confirm-survivor");
  await ready("camp_tribe_a", id);
  await waitForCast(undefined, 5);
  const roster = await castIds();
  assert.equal(roster.filter((other) => other === id).length, 1);
  assert.equal(new Set(roster).size, 5);
  assert.equal(await page.evaluate(async () => (await import("/src/game/locations/travel.ts")).worldTravel.session.participant.survivorId), id);
  const joystick = await page.getByTestId("joystick").boundingBox();
  const x = joystick.x + joystick.width / 2, y = joystick.y + joystick.height / 2;
  const start = await page.evaluate(() => window.__WORLD_RENDER__.scene.getObjectByName("exploration-player").position.toArray());
  await input.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
  await input.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y - joystick.height * 0.39, id: 1 }] });
  await page.waitForFunction((start) => {
    const player = window.__WORLD_RENDER__.scene.getObjectByName("exploration-player");
    return Math.hypot(player.position.x - start[0], player.position.z - start[2]) > 0.24 &&
      ["walk", "run"].includes(player.getObjectByName("survivor-visual-offset")?.userData.action);
  }, start);
  if (capture) await shot("selected-survivor-moving");
  await input.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  check(`Survivor ${id} preview, original stats, touch movement and unique camp assignment`);
}
async function sample(quality) {
  const values = await page.evaluate(async () => {
    const { gl, stats } = window.__WORLD_RENDER__;
    const intervals = [];
    let previous = await new Promise(requestAnimationFrame);
    for (let i = 0; i < 30; i++) {
      const now = await new Promise(requestAnimationFrame);
      intervals.push(now - previous);
      previous = now;
    }
    intervals.sort((a, b) => a - b);
    const { calls, triangles, textures, geometries } = stats();
    return { calls, triangles, textures, geometries, dpr: gl.getPixelRatio(), rafMedianMs: intervals[15], rafP95Ms: intervals[28] };
  });
  report.perf.push({ quality, ...values });
}

async function stillwaterRound() {
  await tap("hub-individual-balance");
  await ready("challenge_main", 17);
  await waitForCast("stillwater-competing-roster", 5);
  assert.deepEqual(await castIds("stillwater-competing-roster"), [4, 11, 13, 17, 18]);
  await tap("stillwater-rules");
  await tap("stillwater-ready");
  await page.locator('[data-testid="stillwater-hud"][data-phase="active"]').waitFor();
}

try {
  if (scenesOnly) await page.addInitScript(() => {
    localStorage.setItem("survivor-island-3d:selected-survivor", JSON.stringify({ version: 1, survivorId: 17 }));
  });
  await page.goto(url);
  if (!scenesOnly) {
    await choose(11);
    await tap("button-menu");
    await choose(6);
    await tap("button-menu");
    await choose(17, true);
    report.requests = await page.evaluate(() => performance.getEntriesByType("resource")
      .filter((entry) => /survivor-\d+\.glb$/.test(entry.name))
      .map(({ name, encodedBodySize, transferSize }) => ({ file: name.split("/").at(-1), encodedBodySize, transferSize })));
    await tap("button-menu");
    await page.reload();
  }
  if (!councilOnly) {
    await page.getByTestId("explore-island").filter({ hasText: "Continue as Carolyn" }).waitFor();
    await tap("explore-island");
    await ready("camp_tribe_a", 17);
    await waitForCast(undefined, 5);
    await framed("tonsai-camp-cast", [-8, 2.65, -33.3], [-7.8, 0.95, -27.5]);
    await tap("button-menu");
    if (!scenesOnly) check("Saved selection reloads to the same survivor");
    await tap("challenge-testing");
    await tap("hub-beach-obstacle");
    await ready("challenge_main", 17);
    await waitForCast("coastal-competing-roster", 5);
    assert.deepEqual(await castIds("coastal-competing-roster"), [4, 11, 13, 17, 18]);
    await tap("coastal-rules");
    await tap("coastal-ready");
    await page.locator('[data-testid="coastal-hud"][data-phase="racing"]').waitFor();
    await shot("coastal-traverse");
    await tap("coastal-hub");
    await stillwaterRound();
    await sample("Low");
    await shot("stillwater-balance");
    await tap("stillwater-hub");
    await tap("hub-ocean-relay");
    await ready("challenge_main", 17);
    await tap("challenge-quality");
    await page.getByTestId("challenge-quality").filter({ hasText: "High" }).waitFor();
    await tap("testing-hub");
    await stillwaterRound();
    await sample("High");
    await tap("stillwater-welcome");
    check("Both playable challenges keep the selected human slot and four rigged AI opponents");
  }
  await tap("explore-tribal");
  await ready("tribal_council", 17);
  await tap("skip-tribal-intro");
  await waitForCast(undefined, 5);
  await seated(undefined, 5);
  await framed("tribal-council-cast", [5.4, 2.25, -0.1], [0.1, 0.95, -6.8]);
  await page.evaluate(async () => {
    const { councilAttendance } = await import("/src/game/tribal/attendance.ts");
    councilAttendance.setJury([7, 10, 16]);
  });
  await waitForCast("council-jurors", 3);
  await seated("council-jurors", 3);
  assert.deepEqual(await castIds("council-jurors"), [7, 10, 16]);
  await framed("tribal-jury", [-12.8, 2.6, 0.3], [-17.8, 1.6, -2.7]);
  await tap("stand-and-explore");
  await page.waitForFunction(() => {
    const player = window.__WORLD_RENDER__.scene.getObjectByName("exploration-player");
    return player?.getObjectByName("skinned-survivor")?.userData.survivorId === 17;
  });
  check("Council, staged jury and post-ceremony exploration use original cast IDs");
  const assetTest = await page.evaluate(async () => {
    const { acquireSurvivorAsset } = await import("/src/game/character/modelAssets.ts");
    const { castModel } = await import("/src/game/character/survivorModels.ts");
    const { SkeletalPlayback } = await import("/src/game/character/SkeletalPlayback.ts");
    const model = castModel(17);
    const a = acquireSurvivorAsset(model.url), b = acquireSurvivorAsset(model.url);
    try {
      const [left, right] = await Promise.all([a.instantiate(), b.instantiate()]);
      const skin = (root) => root.getObjectsByProperty("isSkinnedMesh", true)[0];
      const l = skin(left.scene), r = skin(right.scene);
      const pose = r.skeleton.getBoneByName("Hips").quaternion.toArray();
      const playback = new SkeletalPlayback(left.scene, left.animations, model.clips);
      playback.update("run", 1, 0.35);
      const moved = l.skeleton.getBoneByName("Hips").quaternion.toArray();
      playback.dispose();
      return l.geometry === r.geometry && l.material === r.material && left.animations === right.animations &&
        l.skeleton !== r.skeleton && l.skeleton.getBoneByName("Hips") !== r.skeleton.getBoneByName("Hips") &&
        pose.some((value, index) => Math.abs(value - moved[index]) > 0.0001) &&
        r.skeleton.getBoneByName("Hips").quaternion.toArray().every((value, index) => value === pose[index]);
    } finally {
      a.release();
      b.release();
    }
  });
  assert.equal(assetTest, true);
  check("Model instances share meshes, materials and clips with isolated poses");
  assert.deepEqual(errors, []);
} catch (error) {
  report.failure = String(error.stack ?? error);
  console.error(error);
  await shot("cast-qa-failure").catch(() => {});
  process.exitCode = 1;
} finally {
  await writeFile(`${out}/cast-browser-report.json`, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  await server.close();
}
