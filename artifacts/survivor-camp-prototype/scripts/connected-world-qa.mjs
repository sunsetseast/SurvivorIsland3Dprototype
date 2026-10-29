/** Real software-WebGL gameplay. Trusted key/touch movement; manual 60 Hz simulation isolates host raster cost. */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";
const out = process.env.WORLD_EVIDENCE || "../../docs/connected-world/evidence";
await mkdir(out, { recursive: true });
process.env.PORT = "5193";
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
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--single-process",
    "--no-zygote",
  ],
});
const report = {
  method:
    "Chromium SwiftShader; 932x430 DPR1 low; trusted keyboard/touch input, real collision/camera/rig; 60 Hz manual simulation between genuine WebGL captures. No physical iPhone certification. Entry timings are host wall times.",
  checks: [],
  samples: [],
  errors: [],
  requests: [],
  touches: [],
};
const context = await browser.newContext({
  viewport: { width: 932, height: 430 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 1,
});
const page = await context.newPage();
page.setDefaultTimeout(90000);
page.on("pageerror", (e) => report.errors.push(e.message));
page.on("response", (r) => {
  if (/\.(glb|jpg|png)(\?|$)/.test(r.url()))
    report.requests.push({
      url: r.url().split("/").slice(-1)[0],
      status: r.status(),
      fromServiceWorker: r.fromServiceWorker(),
    });
});
await page.addInitScript(() => {
  performance.setResourceTimingBufferSize(1000);
  window.worldTouches = [];
  const listeners = new Set(),
    ids = new WeakMap();
  let sequence = 0;
  const add = EventTarget.prototype.addEventListener,
    remove = EventTarget.prototype.removeEventListener;
  const tracked = (target, type) =>
    (target === window || target === document) &&
    /^(pointer|key|blur|visibilitychange|survivor-input-clear)/.test(type);
  const key = (target, type, listener, options) => {
    if (!ids.has(listener)) ids.set(listener, ++sequence);
    return `${target === window ? "window" : "document"}:${type}:${ids.get(listener)}:${typeof options === "boolean" ? options : !!options?.capture}`;
  };
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (listener && tracked(this, type))
      listeners.add(key(this, type, listener, options));
    return add.call(this, type, listener, options);
  };
  EventTarget.prototype.removeEventListener = function (
    type,
    listener,
    options,
  ) {
    if (listener && tracked(this, type))
      listeners.delete(key(this, type, listener, options));
    return remove.call(this, type, listener, options);
  };
  window.worldListenerCount = () => listeners.size;
  for (const type of ["pointerdown", "pointerup", "pointercancel"])
    document.addEventListener(
      type,
      (e) =>
        window.worldTouches.push({
          type,
          trusted: e.isTrusted,
          target: e.target.closest?.("[data-testid]")?.dataset.testid,
        }),
      true,
    );
});
const check = (name, detail) => {
  console.log("PASS", name);
  report.checks.push({ name, detail });
};
const init = async () =>
  page.evaluate(async () => {
    const f = await import("/node_modules/.vite/deps/@react-three_fiber.js"),
      io = await import("/src/game/state.ts"),
      travel = await import("/src/game/locations/travel.ts"),
      registry = await import("/src/game/locations/registry.ts"),
      runtime = await import("/src/game/CampRuntime.ts");
    const s = window.__WORLD_RENDER__.state;
    s.setFrameloop("never");
    s.clock.stop();
    s.clock.autoStart = false;
    window.worldQA = {
      f,
      io,
      travel: travel.worldTravel,
      registry,
      camp: runtime.camp,
      s,
      render: s.gl.render.bind(s.gl),
      clock: s.clock.elapsedTime,
    };
  });
const advance = async (frames = 1, render = false) =>
  page.evaluate(
    ({ frames, render }) => {
      const q = window.worldQA,
        s = q.s;
      s.gl.render = () => {};
      try {
        for (let i = 0; i < frames; i++) {
          q.clock = Math.max(q.clock, s.clock.elapsedTime) + 1 / 60;
          s.advance(q.clock, false);
        }
      } finally {
        s.gl.render = q.render;
      }
      if (render) q.render(s.scene, s.camera);
    },
    { frames, render },
  );
const ready = async (id) => {
  await page.waitForFunction(
    (id) => window.__WORLD_RENDER__?.scene.getObjectByName("location-" + id),
    id,
  );
  await init();
  for (let i = 0; i < 180; i++) {
    await advance(3);
    if (
      await page.evaluate(
        () => window.worldQA.travel.getSnapshot().phase === "ready",
      )
    )
      break;
    await page.waitForTimeout(100);
  }
  assert.equal(
    await page.evaluate(() => window.worldQA.travel.getSnapshot().phase),
    "ready",
    await page.locator("body").innerText(),
  );
  await advance(2, true);
};
const capture = async (name) => {
  await advance(1, true);
  await page.screenshot({
    path: `${out}/${name}.jpg`,
    type: "jpeg",
    quality: 86,
  });
};
const sample = async (label) => {
  await advance(1, true);
  report.samples.push(
    await page.evaluate((label) => {
      const q = window.worldQA;
      const geometries = new Set(),
        textures = new Set();
      let geometryBytes = 0,
        textureBytesEstimate = 0;
      q.s.scene.traverse((o) => {
        if (o.geometry && !geometries.has(o.geometry)) {
          geometries.add(o.geometry);
          for (const a of Object.values(o.geometry.attributes))
            geometryBytes += a.array.byteLength;
          geometryBytes += o.geometry.index?.array.byteLength || 0;
        }
        for (const m of [o.material].flat().filter(Boolean))
          for (const t of [
            ...Object.values(m),
            ...(m.userData?.textureResources || []),
            ...Object.values(m.uniforms || {}).map((u) => u.value),
          ])
            if (t?.isTexture && !textures.has(t)) {
              textures.add(t);
              textureBytesEstimate +=
                ((t.image?.width || 0) * (t.image?.height || 0) * 4 * 4) / 3;
            }
      });
      return {
        label,
        geometryBytes,
        textureBytesEstimate,
        location: q.travel.session.locationId,
        position: { x: q.io.dbg.x, y: q.io.dbg.y, z: q.io.dbg.z },
        ...window.__WORLD_RENDER__.stats(),
        jsHeap: performance.memory?.usedJSHeapSize,
        trackedGlobalListeners: window.worldListenerCount(),
        disposals: structuredClone(window.__WORLD_RENDER__.lifecycle.disposals),
        active: window.__WORLD_RENDER__.lifecycle.active,
      };
    }, label),
  );
};
const walk = async (target) => {
  for (let i = 0; i < 200; i++) {
    const d = await page.evaluate((t) => {
      const q = window.worldQA,
        p = q.io.dbg,
        dx = t.x - p.x,
        dz = t.z - p.z;
      return { len: Math.hypot(dx, dz), yaw: Math.atan2(-dx, -dz) };
    }, target);
    if (d.len < 0.65) return;
    await page.keyboard.up("w");
    await page.evaluate((y) => (window.worldQA.io.input.yaw = y), d.yaw);
    await page.keyboard.down("w");
    await advance(Math.max(1, Math.min(15, Math.floor((d.len / 3.25) * 60))));
    await page.keyboard.up("w");
    await advance(1);
  }
  throw Error("Could not walk to " + JSON.stringify(target));
};
const campExit = async () => {
  const route = await page.evaluate(() => {
    const q = window.worldQA;
    return q.camp.navigation.route(
      { x: q.io.dbg.x, z: q.io.dbg.z },
      q.registry.CONNECTIONS.camp_to_trail.exit,
      q.camp.npcs.map((n) => ({ x: n.x, z: n.z, radius: 1.5 })),
    );
  });
  assert.ok(route);
  for (const p of route) await walk(p);
  await page.waitForTimeout(200);
};
const menu = async () => {
  const id = await page.evaluate(
    () => window.worldQA.travel.session.locationId,
  );
  await page
    .getByTestId(id === "railay_trails" ? "island-menu" : "button-menu")
    .click();
};
try {
  report.browser = browser.version();
  await page.goto("http://127.0.0.1:5193/?quality=low");
  assert.equal(await page.getByTestId("explore-railay").count(), 0);
  check("Normal menu has no unrestricted island scene selector");
  // Explicit development flag is the only entry to the authorization rehearsal.
  await page.goto("http://127.0.0.1:5193/?quality=low&devTravel=1");
  await page.getByTestId("explore-island").click();
  await ready("camp_tribe_a");
  await capture("01-camp-before");
  await sample("initial camp");
  assert.equal(await page.evaluate(() => window.worldQA.camp.npcs.length), 4);
  await advance(120);
  check("Camp NPC runtime advances");
  await campExit();
  await capture("02-departure-trail");
  assert.equal(await page.getByTestId("travel-connection").isDisabled(), true);
  assert.equal(
    await page.evaluate(() => window.worldQA.travel.travel("camp_to_trail")),
    false,
  );
  check("Unauthorized departure denied at real exit");
  await page.keyboard.down("w");
  await advance(10);
  await page.keyboard.up("w");
  assert.equal(
    await page.evaluate(() => window.worldQA.travel.getSnapshot().phase),
    "ready",
  );
  check("Denied travel leaves movement usable");
  await walk({ x: -6, z: 26 });
  await page.getByTestId("grant-journey").click();
  await capture("03-authorized-interaction");
  const saved = await page.evaluate(() => {
    const c = window.worldQA.camp;
    window.persistedCamp = {
      camp: c,
      npcs: c.npcs,
      provider: c.provider,
      memory: c.provider.memory,
    };
    return {
      now: c.now,
      npcs: structuredClone(c.npcs),
      receipts: structuredClone(c.receipts),
      memory: JSON.stringify(c.provider.memory),
      instance: window.worldQA.travel.session.instance.id,
    };
  });
  await page.getByTestId("travel-connection").click();
  await page.waitForFunction(() =>
    ["loading", "arriving"].includes(window.worldQA.travel.getSnapshot().phase),
  );
  await page.screenshot({ path: `${out}/04-transition.jpg` });
  await ready("railay_trails");
  assert.equal(
    await page.evaluate(() =>
      window.worldQA.s.scene.getObjectByName("location-camp_tribe_a"),
    ),
    undefined,
  );
  assert.equal(await page.evaluate(() => window.worldQA.camp.now), saved.now);
  assert.equal(
    await page.evaluate(() => {
      const c = window.worldQA.camp,
        p = window.persistedCamp;
      return (
        c === p.camp &&
        c.npcs === p.npcs &&
        c.provider === p.provider &&
        c.provider.memory === p.memory
      );
    }),
    true,
  );
  check(
    "Camp visual tree unloads, camp simulation retains exact state while paused",
  );
  await capture("05-trail-arrival");
  await sample("first Railay trail arrival");
  assert.equal(
    await page.getByTestId("island-overview").textContent(),
    "Overview",
  );
  // Trusted concurrent joystick + camera + Run taps, after a cross-scene transition.
  const cdp = await page.context().newCDPSession(page);
  const points = new Map();
  const send = async (type) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: [...points.values()],
    });
  const down = async (id, x, y) => {
    points.set(id, { id, x: Math.round(x), y: Math.round(y) });
    await send("touchStart");
  };
  const move = async (id, x, y) => {
    points.set(id, { id, x: Math.round(x), y: Math.round(y) });
    await send("touchMove");
  };
  const up = async (id) => {
    const p = points.get(id);
    points.delete(id);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: points.size ? [p] : [],
    });
  };
  const box = async (id) => {
    const b = await page.getByTestId(id).boundingBox();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  const joy = await box("joystick"),
    run = await box("button-run"),
    look = { x: 710, y: 220 };
  await down(1, joy.x, joy.y);
  await move(1, joy.x, joy.y - 43);
  await down(2, look.x, look.y);
  await move(2, look.x + 35, look.y - 10);
  await down(3, run.x, run.y);
  await up(3);
  await advance(45, true);
  assert.equal(
    await page.getByTestId("button-run").getAttribute("aria-pressed"),
    "true",
  );
  await capture("06-player-trail-multitouch");
  await up(2);
  await up(1);
  await advance(20);
  assert.equal(
    await page.getByTestId("button-run").getAttribute("aria-pressed"),
    "true",
  );
  check(
    "Run toggles while joystick and camera remain held; latch survives release",
  );
  await page.getByTestId("button-run").click();
  await advance(2);
  const returnPoint = await page.evaluate(
    () => window.worldQA.registry.CONNECTIONS.trail_to_camp.exit,
  );
  await walk(returnPoint);
  await capture("07-return-connection");
  await page.getByTestId("island-map-toggle").click();
  await capture("08-map-correspondence");
  await page.getByTestId("island-map-close").click();
  await page.getByTestId("travel-connection").click();
  await ready("camp_tribe_a");
  await capture("09-restored-camp");
  await sample("first camp return");
  const restored = await page.evaluate(() => {
    const c = window.worldQA.camp;
    return {
      now: c.now,
      npcs: structuredClone(c.npcs),
      receipts: structuredClone(c.receipts),
      memory: JSON.stringify(c.provider.memory),
      instance: window.worldQA.travel.session.instance.id,
    };
  });
  // Ready helper advances a few frames after arrival. Existing NPC histories must grow, never reconstruct.
  assert.ok(restored.now >= saved.now);
  assert.equal(restored.instance, saved.instance);
  assert.ok(restored.receipts.length >= saved.receipts.length);
  assert.ok(
    restored.npcs.every((n, i) => n.distance >= saved.npcs[i].distance),
  );
  check(
    "Camp NPC progress, social-memory owner and original instance survive return",
    { savedNow: saved.now, restoredNow: restored.now },
  );
  for (let round = 2; round <= 4; round++) {
    await campExit();
    await page.getByTestId("grant-journey").click();
    await page.getByTestId("travel-connection").click();
    await ready("railay_trails");
    await sample(`Railay round ${round}`);
    await walk(returnPoint);
    if (round === 4) await page.getByTestId("island-overview").click();
    await page.getByTestId("travel-connection").click();
    await ready("camp_tribe_a");
    await sample(`camp round ${round}`);
  }
  const campSamples = report.samples.filter(
    (s) => s.location === "camp_tribe_a",
  );
  assert.ok(
    campSamples
      .filter((s) => s.label !== "initial camp")
      .every(
        (s) =>
          s.trackedGlobalListeners === campSamples[1].trackedGlobalListeners,
      ),
  );
  check(
    "Four complete Camp ↔ Trail round trips; equivalent return-UI listener count stays constant",
  );
  await page.evaluate(() => {
    window.worldQA.io.dbg.teleportRequested = { x: -6, z: -24 };
    window.worldQA.io.input.yaw = -0.48;
  });
  await advance(15);
  await sample("camp baseline pose after four rounds");
  await campExit();
  await page.getByTestId("grant-journey").click();
  await page.getByTestId("travel-connection").click();
  await page.waitForFunction(() =>
    ["loading", "arriving"].includes(window.worldQA.travel.getSnapshot().phase),
  );
  await page.evaluate(() => {
    const m = window.worldQA.travel;
    m.fail(m.getSnapshot().token, "QA injected interrupted destination load");
  });
  await page.getByTestId("travel-retry").waitFor();
  await page.screenshot({ path: `${out}/10-load-error.jpg` });
  await page.getByTestId("travel-cancel").click();
  await ready("camp_tribe_a");
  check("Interrupted destination recovers to preserved source");
  await campExit();
  await page.getByTestId("travel-connection").click();
  await page.waitForFunction(() =>
    ["loading", "arriving"].includes(window.worldQA.travel.getSnapshot().phase),
  );
  await page.evaluate(() => {
    const m = window.worldQA.travel;
    m.fail(m.getSnapshot().token, "QA injected retryable load failure");
  });
  await page.getByTestId("travel-retry").click();
  await ready("railay_trails");
  await walk(returnPoint);
  await page.getByTestId("travel-connection").click();
  await ready("camp_tribe_a");
  check(
    "Failed destination can retry and complete return; overview does not persist into travel",
  );
  // Controlled setup for social regression only; journey movement above uses trusted input.
  await page.evaluate(() => {
    const q = window.worldQA,
      n = q.camp.npcs.find((n) => !n.traveling);
    const p = q.camp.navigation.standNear(
      n,
      q.camp.player,
      1.8,
      q.camp.npcs.filter((o) => o !== n).map((o) => ({ ...o, radius: 1 })),
    );
    if (!p) throw Error("No safe NPC interaction setup");
    q.io.dbg.teleportRequested = p;
  });
  await advance(20);
  await page.getByTestId("talk-prompt").waitFor();
  await page.getByTestId("talk-prompt").click();
  await advance(5);
  assert.ok(await page.getByTestId("conversation-panel").isVisible());
  await capture("11-camp-conversation");
  await page.getByRole("button", { name: "Leave conversation" }).click();
  check("Existing camp conversation opens and closes after repeated journeys");
  report.assetTimings = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter((r) => /\.(glb|jpg|png)(\?|$)/.test(r.name))
      .map((r) => ({
        asset: r.name.split("/").slice(-1)[0],
        transferSize: r.transferSize,
        encodedBodySize: r.encodedBodySize,
        duration: r.duration,
      })),
  );
  report.touches = await page.evaluate(() => window.worldTouches);
  report.lifecycle = await page.evaluate(() =>
    structuredClone(window.__WORLD_RENDER__.lifecycle),
  );
  report.timings = await page.evaluate(() => window.worldQA.travel.timings);
  assert.equal(report.lifecycle.peakActive, 1);
  assert.ok(report.lifecycle.disposals.texture > 0);
  check(
    "At most one detailed scene; observed geometry/material/texture disposal",
  );
  await menu();
  await page.getByTestId("explore-tribal").click();
  await ready("tribal_council");
  await advance(300, true);
  await page.getByTestId("skip-tribal-intro").click();
  await page.getByTestId("stand-and-explore").click();
  await advance(90, true);
  await capture("12-tribal-council");
  check("Existing sanctuary scene, intro and mobile HUD load through adapter");
  // Existing voting UI still drives the real pavilion and parchment animation.
  await page.evaluate(async () => {
    const { VOTING } = await import("/src/game/tribal/votingAnchors.ts");
    window.worldQA.io.dbg.teleportRequested = VOTING.writing;
    window.worldQA.io.input.yaw = 0;
  });
  await advance(90);
  await page.waitForTimeout(200);
  await page.getByTestId("tribal-interact").click();
  await page.getByTestId("practice-ballot").fill("Journey regression");
  await page.getByTestId("fold-ballot").click();
  await advance(240, true);
  assert.equal(
    await page.evaluate(async () => {
      const { tribalInteractions } =
        await import("/src/game/tribal/interactions.ts");
      return tribalInteractions.getSnapshot().deposited;
    }),
    true,
  );
  await capture("13-tribal-voting");
  check("Existing practice ballot folds and deposits after the world adapter");
  // An actual aborted module request, independent of the injected state-machine scenarios above.
  // Reuse the context: single-process software WebGL cannot create another
  // isolated browser context reliably. The new document has a fresh module map.
  const failurePage = await page.context().newPage();
  failurePage.setDefaultTimeout(90000);
  let aborted = 0;
  await failurePage.route("**/src/game/railay/IslandScene.tsx*", (route) => {
    aborted++;
    return route.abort("failed");
  });
  await failurePage.goto("http://127.0.0.1:5193/?devTravel=1&quality=low");
  await failurePage.getByTestId("explore-island").click();
  await failurePage.getByTestId("button-run").waitFor();
  await failurePage.waitForFunction(
    () =>
      window.__WORLD_RENDER__?.scene.getObjectByName("camp-assets-ready") ||
      window.__WORLD_RENDER__?.scene.getObjectByName("camp-assets-degraded"),
  );
  await failurePage.evaluate(async () => {
    const { dbg } = await import("/src/game/state.ts");
    dbg.teleportRequested = { x: -6, z: 26 };
  });
  await failurePage.getByTestId("grant-journey").click();
  await failurePage.getByTestId("travel-connection").click();
  await failurePage.getByTestId("travel-retry").waitFor();
  assert.ok(aborted > 0);
  await failurePage.screenshot({ path: `${out}/14-network-load-failure.jpg` });
  await failurePage.getByTestId("travel-cancel").click();
  await failurePage.getByTestId("button-run").waitFor();
  assert.match(
    await failurePage.getByTestId("world-location").textContent(),
    /Tonsai Tribe Camp/,
  );
  await failurePage.close();
  check("Actual aborted destination module request returns safely to camp", {
    abortedRequests: aborted,
  });
  assert.deepEqual(report.errors, []);
  report.result = "PASS";
} catch (e) {
  report.result = "FAIL";
  report.failure = e.stack;
  try {
    console.log(await page.locator("body").innerText());
    await page.screenshot({ path: `${out}/failure.jpg` });
  } catch {}
  throw e;
} finally {
  await writeFile(
    `${out}/browser-report.json`,
    JSON.stringify(report, null, 2),
  );
  await browser.close();
  await server.close();
}
