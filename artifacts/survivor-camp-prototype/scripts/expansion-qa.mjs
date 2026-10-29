import { captureOverview } from "./expansion-overview.mjs";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";
const profileOnly = process.env.PROFILE_ONLY === "1";
const visualOnly = process.env.VISUAL_ONLY === "1";
const expeditionOnly = process.env.EXPEDITION_ONLY === "1";
const phase = "expansion",
  out =
    process.env.EXPANSION_EVIDENCE || "../../docs/tonsai-expansion/evidence";
await mkdir(out, { recursive: true });
process.env.PORT = "5196";
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
const report = {
  method:
    "Real Chromium WebGL / ANGLE SwiftShader, 932x430 DPR1. Identical poses before/after. Manual 60Hz simulation avoids conflating software raster cost with input. Render submission wall timings are NOT GPU or iPhone FPS.",
  phase,
  browser: browser.version(),
  errors: [],
  samples: [],
  checks: [],
};
const page = await browser.newPage({
  viewport: { width: 932, height: 430 },
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
const advance = async (frames = 1, render = false) =>
  page.evaluate(
    ({ frames, render }) => {
      const q = window.campQA,
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
const poses = [
  ["01-main-camp", -6, -24, -0.48, 0.34],
  ["02-fire-shelter", -18, -25, -0.9, 0.28],
  ["03-beach-southern-limestone", -44, 32, -2.6, 0.1],
  ["04-southern-cliff-base", -17, 91, Math.PI, 0.13],
  ["05-accessible-overhang", -20, 94, Math.PI, 0.12],
  ["06-limestone-jungle-trail", -8, 57, Math.PI, 0.25],
  ["07-interior-jungle", 53, 36, Math.PI, 0.3],
  ["08-freshwater-trail", 70, 25, -1.15, 0.28],
  ["09-remote-spring", 104, 36, -1.4, 0.33],
  ["10-fern-clearing", 43, 80, -0.6, 0.27],
  ["11-branching-trails", 54, 14, -0.8, 0.3],
  ["12-secluded-alcove", 30, 91, Math.PI, 0.25],
  ["13-ancient-fig", 38, 5, -1.5, 0.1],
  ["14-fallen-giant", 63, 59, 0, 0.3],
  ["15-cave-interior", 11, 104, Math.PI, 0.08],
  ["16-moss-gates", 16, 65, Math.PI, 0.25],
  ["17-root-crown", 72, 25, -1.5, 0.15],
  ["18-hollow-stump", 28, -8, -1.5, 0.3],
  ["19-leaning-tree", -5, 43, -1.5, 0.1],
  ["20-strangler-stone", 95, 65, 0, 0.13],
  ["21-root-bridge", 89, 4, 0, 0.3],
  ["22-running", 66, 68, 0, 0.34],
  ["23-departure", -6, 24, Math.PI, 0.28],
];
async function sample(label) {
  await advance(1, true);
  return page.evaluate((label) => {
    const { s } = window.campQA,
      geos = new Set(),
      mats = new Set(),
      tex = new Set();
    let geometryBytes = 0,
      textureBytesEstimate = 0;
    s.scene.traverse((o) => {
      if (o.geometry && !geos.has(o.geometry)) {
        geos.add(o.geometry);
        for (const a of Object.values(o.geometry.attributes))
          geometryBytes += a.array.byteLength;
        geometryBytes += o.geometry.index?.array.byteLength || 0;
      }
      for (const m of [o.material].flat().filter(Boolean)) {
        mats.add(m);
        for (const t of [
          ...Object.values(m),
          ...(m.userData.textureResources || []),
          ...Object.values(m.uniforms || {}).map((u) => u.value),
        ])
          if (t?.isTexture && !tex.has(t)) {
            tex.add(t);
            textureBytesEstimate +=
              ((t.image?.width || 0) * (t.image?.height || 0) * 4 * 4) / 3;
          }
      }
    });
    const times = [];
    for (let i = 0; i < 5; i++) {
      const t = performance.now();
      s.gl.render(s.scene, s.camera);
      s.gl.getContext().finish();
      times.push(performance.now() - t);
    }
    return {
      label,
      ...window.__WORLD_RENDER__.stats(),
      sceneGeometries: geos.size,
      materials: mats.size,
      sceneTextures: tex.size,
      geometryBytes,
      textureBytesEstimate,
      softwareRenderFinishMs: times,
      position: window.__CAMP_DEBUG__.position,
      camera: window.__CAMP_DEBUG__.camera,
      resources: performance
        .getEntriesByType("resource")
        .filter((r) => /\.(glb|jpg|png)(\?|$)/.test(r.name))
        .map((r) => ({
          name: r.name.split("/").pop(),
          transferSize: r.transferSize,
          encodedBodySize: r.encodedBodySize,
          duration: r.duration,
        })),
    };
  }, label);
}
try {
  for (const quality of phase === "inspection" || expeditionOnly
    ? ["high"]
    : ["low", "high"]) {
    const start = Date.now();
    await page.goto(`http://127.0.0.1:5196/?quality=${quality}&devTravel=1`);
    await page.getByTestId("explore-island").click();
    await page.waitForFunction(
      () =>
        window.__WORLD_RENDER__?.scene.getObjectByName(
          "location-camp_tribe_a",
        ) && window.__CAMP_DEBUG__?.position.y > 0,
    );
    if (phase !== "before")
      await page.waitForFunction(() =>
        window.__WORLD_RENDER__.scene.getObjectByName("camp-assets-ready"),
      );
    await page.evaluate(async () => {
      const s = window.__WORLD_RENDER__.state;
      s.setFrameloop("never");
      s.clock.stop();
      s.clock.autoStart = false;
      window.campQA = {
        s,
        render: s.gl.render.bind(s.gl),
        clock: s.clock.elapsedTime,
        io: await import("/src/game/state.ts"),
        world: await import("/src/game/world.ts"),
        camp: (await import("/src/game/CampRuntime.ts")).camp,
        spots: (await import("/src/game/CampRuntime.ts")).SPOTS,
      };
    });
    await advance(150, true);
    report.samples.push({
      ...(await sample(`${quality} default`)),
      entryWallMs: Date.now() - start,
    });
    const selection =
      profileOnly ||
      expeditionOnly ||
      phase === "inspection" ||
      phase === "profile"
        ? []
        : quality === "high"
          ? poses
          : poses.filter((p) =>
              [
                "01-main-camp",
                "03-beach-southern-limestone",
                "07-interior-jungle",
              ].includes(p[0]),
            );
    for (const [name, x, z, yaw, pitch] of selection) {
      await page.evaluate(
        ({ x, z, yaw, pitch }) => {
          const q = window.campQA;
          let p = { x, z };
          if (!q.world.isWalkable(x, z)) {
            const n = q.camp.navigation.nodes
              .filter((n) => Math.hypot(n.x - x, n.z - z) < 2.5)
              .sort(
                (a, b) =>
                  Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z),
              )[0];
            if (!n) throw Error("Capture pose is not playable");
            p = { x: n.x, z: n.z };
          }
          q.io.dbg.teleportRequested = p;
          q.io.input.yaw = yaw;
          q.io.input.pitch = pitch;
        },
        { x, z, yaw, pitch },
      );
      await advance(90);
      if (name === "22-running") {
        await page.keyboard.down("w");
        await page.keyboard.down("Shift");
        await advance(24);
        assert.equal(
          await page.evaluate(() => window.__CAMP_DEBUG__.running),
          true,
        );
        report.checks.push("Run movement active during screenshot");
      }
      await advance(1, true);
      await page.screenshot({
        path: `${out}/${quality}-${name}.jpg`,
        type: "jpeg",
        quality: 90,
      });
      await page.keyboard.up("w");
      await page.keyboard.up("Shift");
      if (
        quality === "high" &&
        [
          "04-southern-cliff-base",
          "07-interior-jungle",
          "09-remote-spring",
        ].includes(name)
      )
        report.samples.push(await sample(name));
    }
    if (phase === "expansion" && !expeditionOnly) {
      report.frameObservationAfterGallery = await page.evaluate(async () => {
        const q = window.campQA,
          s = q.s,
          intervals = [];
        s.clock.autoStart = true;
        s.clock.start();
        s.setFrameloop("always");
        await new Promise((resolve) => {
          let previous;
          const tick = (t) => {
            if (previous !== undefined) intervals.push(t - previous);
            previous = t;
            if (intervals.length < 24) requestAnimationFrame(tick);
            else resolve();
          };
          requestAnimationFrame(tick);
        });
        s.setFrameloop("never");
        s.clock.stop();
        s.clock.autoStart = false;
        q.clock = s.clock.elapsedTime;
        return intervals;
      });
    }
    if (profileOnly) {
      report.samples.at(-1).liveFrameIntervalsMs =
        report.frameObservationAfterGallery;
      delete report.frameObservationAfterGallery;
    }
    if (phase === "inspection") {
      // Real scene, eye-height cameras over verified playable sand. These are
      // explicitly labeled art-inspection views, separate from Player's boom.
      for (const [name, x, z, tx, ty, tz] of [
        ["13-limestone-eye-height", -45, -53, -36, 18, -75],
        ["14-cove-enclosure-eye-height", -48, -34, -20, 17, -72],
      ]) {
        const inspected = await page.evaluate(
          ({ x, z, tx, ty, tz }) => {
            const q = window.campQA;
            if (!q.world.isWalkable(x, z))
              throw Error("Inspection camera is outside playable terrain");
            const s = q.s;
            s.camera.position.set(x, q.world.groundHeight(x, z) + 1.65, z);
            s.camera.lookAt(tx, ty, tz);
            s.camera.updateMatrixWorld();
            q.render(s.scene, s.camera);
            return { eye: s.camera.position.toArray(), target: [tx, ty, tz] };
          },
          { x, z, tx, ty, tz },
        );
        await page.screenshot({
          path: `${out}/${name}.jpg`,
          type: "jpeg",
          quality: 92,
        });
        report.checks.push({ name, inspectionCamera: inspected });
      }
    }
    if (quality === "high" && !expeditionOnly && !profileOnly) {
      await captureOverview(page, out);
    }

    if (quality === "high" && !expeditionOnly && !profileOnly) {
      const beforeMap = await page.evaluate(
        () => window.__CAMP_DEBUG__.position,
      );
      await page.getByRole("button", { name: "Expand camp map" }).click();
      await page.keyboard.down("w");
      await advance(60);
      await page.keyboard.up("w");
      const afterMap = await page.evaluate(
        () => window.__CAMP_DEBUG__.position,
      );
      assert.ok(
        Math.hypot(beforeMap.x - afterMap.x, beforeMap.z - afterMap.z) < 0.001,
      );
      report.checks.push(
        "Expanded camp map locks movement and clears contacts",
      );
      await page.screenshot({
        path: `${out}/high-24-camp-map.jpg`,
        type: "jpeg",
        quality: 92,
      });
      await page.getByRole("button", { name: "Close camp map" }).click();
    }
    // Gameplay anchors must remain reachable through the actual pathfinder.
    report.checks.push(
      await page.evaluate(() => {
        const q = window.campQA;
        return {
          qualityAnchors: Object.entries(q.spots).flatMap(([k, points]) =>
            points.map((p) => ({
              place: k,
              position: p,
              reachable: q.camp.navigation.route(q.world.SPAWN, p) !== null,
            })),
          ),
        };
      }),
    );
  }
  if (phase === "expansion" && !visualOnly) {
    const routes = [];
    report.routes = routes;
    const act = async (frames = 1) => advance(frames);
    const position = () =>
      page.evaluate(() => ({
        x: window.__CAMP_DEBUG__.position.x,
        z: window.__CAMP_DEBUG__.position.z,
      }));
    const walk = async (target, run) => {
      for (let gesture = 0; gesture < 10; gesture++) {
        const p = await position(),
          dx = target.x - p.x,
          dz = target.z - p.z,
          d = Math.hypot(dx, dz);
        if (d < 0.045) return true;
        const sprinting = run && d > 1.5;
        await page.keyboard.up("w");
        await page.keyboard.up("Shift");
        await act(1);
        await page.evaluate(
          (y) => {
            window.campQA.io.input.yaw = y;
            window.campQA.io.input.lookGrace = 2;
          },
          Math.atan2(-dx, -dz),
        );
        await page.keyboard.down("w");
        if (sprinting) await page.keyboard.down("Shift");
        // Hold a trusted keyboard gesture while advancing the real Player each
        // fixed tick. Batching ticks avoids thousands of inspector round trips.
        const result = await page.evaluate(
          ({ target, sprinting }) => {
            const q = window.campQA,
              s = q.s;
            let previous = Infinity,
              blocked = 0;
            s.gl.render = () => {};
            try {
              for (let i = 0; i < 360; i++) {
                q.clock = Math.max(q.clock, s.clock.elapsedTime) + 1 / 60;
                s.advance(q.clock, false);
                const d = Math.hypot(
                  target.x - q.io.dbg.x,
                  target.z - q.io.dbg.z,
                );
                if (d < 0.045) return "reached";
                if (sprinting && d < 0.8) return "brake";
                if (d > previous + 0.001 && d < 0.2) return "correct";
                blocked = d >= previous - 0.0001 ? blocked + 1 : 0;
                if (blocked > 12) return "blocked";
                previous = d;
              }
              return "retry";
            } finally {
              s.gl.render = q.render;
            }
          },
          { target, sprinting },
        );
        if (result === "reached") return true;
        if (result === "blocked") {
          await page.keyboard.up("w");
          await page.keyboard.up("Shift");
          await act(1);
          return false;
        }
      }
      return false;
    };
    const go = async (label, goals, run = false) => {
      const start = await position(),
        begin = Date.now();
      let count = 0;
      for (const goal of goals) {
        let reached = false;
        for (let attempt = 0; attempt < 12; attempt++) {
          const route = await page.evaluate((goal) => {
            const q = window.campQA,
              p = q.io.dbg;
            const targets = [
              goal,
              { x: goal.x + 1.5, z: goal.z },
              { x: goal.x - 1.5, z: goal.z },
              { x: goal.x, z: goal.z + 1.5 },
              { x: goal.x, z: goal.z - 1.5 },
            ];
            for (const target of targets) {
              if (
                !q.world.isWalkable(target.x, target.z) ||
                q.camp.npcs.some(
                  (n) => Math.hypot(n.x - target.x, n.z - target.z) < 1.25,
                )
              )
                continue;
              const avoid = q.camp.npcs.map((n) => ({
                x: n.x,
                z: n.z,
                radius: 0.95,
              }));
              const route = q.camp.navigation.route(p, target, avoid);
              if (route) return route;
            }
            return null;
          }, goal);
          assert.ok(
            route,
            "Pathfinder failed " + label + " " + JSON.stringify(goal),
          );
          let blocked = false;
          for (const point of route) {
            if (!(await walk(point, run))) {
              blocked = true;
              break;
            }
            count++;
          }
          if (!blocked) {
            reached = true;
            break;
          }
        }
        assert.ok(reached, "Dynamic avoidance could not finish " + label);
      }
      await page.keyboard.up("w");
      await page.keyboard.up("Shift");
      await act(1);
      const end = await position();
      routes.push({
        label,
        start,
        end,
        run,
        waypoints: count,
        hostWallMs: Date.now() - begin,
      });
      console.log("EXPEDITION", label, JSON.stringify(end));
      await writeFile(
        `${out}/route-checkpoint.json`,
        JSON.stringify(
          { method: report.method, routes, status: "in progress" },
          null,
          2,
        ),
      );
    };
    await page.keyboard.up("w");
    await page.keyboard.up("Shift");
    await page.evaluate(() => {
      const q = window.campQA;
      q.io.clearInput();
      q.io.dbg.teleportRequested = q.world.SPAWN;
    });
    await act(90);
    await go("Spawn to campfire", [{ x: -2.6, z: -33.1 }]);
    await go("Campfire to shelter", [{ x: 11, z: -43.1 }]);
    await go("Shelter to remote spring", [
      { x: 38, z: 5 },
      { x: 54, z: 14 },
      { x: 70, z: 25 },
      { x: 104, z: 36 },
    ]);
    await go(
      "Spring alternate loop return",
      [
        { x: 111, z: 50 },
        { x: 104, z: 62 },
        { x: 99, z: 66 },
        { x: 85, z: 71 },
        { x: 66, z: 68 },
        { x: 57, z: 58 },
        { x: 53, z: 36 },
        { x: 54, z: 14 },
        { x: 38, z: 10 },
        { x: 38, z: 5 },
        { x: -6, z: -24 },
      ],
      true,
    );
    await go("Camp to southern limestone", [
      { x: 5, z: 13 },
      { x: -7, z: 55 },
      { x: -14, z: 72 },
      { x: -17, z: 91 },
    ]);
    await go("Southern limestone to cave", [
      { x: -5, z: 92 },
      { x: 11, z: 97 },
      { x: 11, z: 104 },
    ]);
    await advance(1, true);
    await page.screenshot({
      path: `${out}/high-25-walked-into-cave.jpg`,
      type: "jpeg",
      quality: 90,
    });
    await go(
      "Cave to cliff to beach",
      [
        { x: 11, z: 97 },
        { x: -17, z: 91 },
        { x: -17, z: 86 },
        { x: -28, z: 73 },
        { x: -37, z: 54 },
        { x: -43, z: 30 },
        { x: -47, z: 5 },
        { x: -47, z: -27 },
      ],
      true,
    );
    await go("Beach to main camp", [{ x: -6, z: -24 }]);
    await go(
      "Camp jungle loop and return",
      [
        { x: 5, z: 13 },
        { x: 20, z: 23 },
        { x: 54, z: 14 },
        { x: 53, z: 36 },
        { x: 57, z: 58 },
        { x: 66, z: 68 },
        { x: 99, z: 66 },
        { x: 111, z: 50 },
        { x: 104, z: 36 },
        { x: 54, z: 14 },
        { x: -6, z: -24 },
      ],
      true,
    );
    await page.evaluate(() => {
      const q = window.campQA;
      const n = q.camp.npcs
        .filter((n) => Math.hypot(n.x - 108, n.z - 36) > 70)
        .sort(
          (a, b) =>
            Math.hypot(a.x + 9, a.z + 31) - Math.hypot(b.x + 9, b.z + 31),
        )[0];
      if (
        !n ||
        !q.camp.request(n, {
          activity: "collect_water",
          place: "waterWell",
          duration: 30,
          reason: "Water chore browser validation",
        })
      )
        throw Error("NPC chore request failed");
      q.followId = n.id;
      q.followDistance = n.distance;
      // Advance the real NPC movement solver while the player waits. No actor
      // positions/routes are written, and no rendering claims derive from this.
      for (let i = 0; i < 3600; i++)
        q.camp.step(1 / 60, {
          x: q.io.dbg.x,
          z: q.io.dbg.z,
          y: q.io.dbg.y,
          moving: false,
        });
    });
    for (let i = 0; i < 6; i++) {
      const n = await page.evaluate(() => {
        const q = window.campQA,
          n = q.camp.npc(q.followId);
        return {
          x: n.x,
          z: n.z,
          d: Math.hypot(n.x - q.io.dbg.x, n.z - q.io.dbg.z),
        };
      });
      if (n.d < 5) break;
      await go(
        "Follow water-collecting NPC " + i,
        [{ x: n.x + 1.8, z: n.z + 2.5 }],
        true,
      );
    }
    await page.evaluate(() => {
      const q = window.campQA,
        n = q.camp.npc(q.followId);
      // A completed collection trip is valid; observe its physical return leg.
      if (
        !n.traveling &&
        !q.camp.request(n, {
          activity: "rest",
          place: "campfire",
          duration: 30,
          reason: "Return after collecting water",
        })
      )
        throw Error("NPC return request failed");
    });
    await advance(20);
    const npc = await page.evaluate(() => {
      const q = window.campQA,
        n = q.camp.npc(q.followId);
      q.io.input.yaw = Math.atan2(q.io.dbg.x - n.x, q.io.dbg.z - n.z);
      q.io.input.pitch = 0.25;
      return {
        x: n.x,
        z: n.z,
        traveling: n.traveling,
        routeIndex: n.routeIndex,
        destination: n.destinationPlace,
        distanceAdvanced: n.distance - q.followDistance,
      };
    });
    report.npcTrailObservation = npc;
    assert.equal(npc.traveling, true);
    assert.ok(npc.distanceAdvanced > 60);
    assert.ok(npc.x > 34 || npc.z > 34, "NPC must be in expanded territory");
    await advance(60, true);
    await page.screenshot({
      path: `${out}/high-26-npc-expanded-trail.jpg`,
      type: "jpeg",
      quality: 90,
    });
    report.routes = routes;
  }
  if (phase === "after") {
    let aborted = 0;
    await page.route("**/*.glb*", (r) => {
      if (r.request().resourceType() !== "fetch") return r.continue();
      aborted++;
      return r.abort("failed");
    });
    await page.goto("http://127.0.0.1:5196/?quality=low&devTravel=1");
    await page.getByTestId("explore-island").click();
    await page.waitForFunction(() =>
      window.__WORLD_RENDER__?.scene.getObjectByName("camp-assets-degraded"),
    );
    await page.waitForFunction(
      async () =>
        (
          await import("/src/game/locations/travel.ts")
        ).worldTravel.getSnapshot().phase === "ready",
    );
    const a = await page.evaluate(() => window.__CAMP_DEBUG__.position);
    await page.keyboard.down("w");
    await page.waitForTimeout(700);
    await page.keyboard.up("w");
    const b = await page.evaluate(() => window.__CAMP_DEBUG__.position);
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 0.05);
    assert.ok(aborted >= 4);
    report.checks.push({
      name: "Missing models use degraded art, release loading curtain and retain movement",
      aborted,
    });
    await page.screenshot({
      path: `${out}/failure-degraded.jpg`,
      type: "jpeg",
      quality: 85,
    });
    await page.unroute("**/*.glb*");
    let delayed = 0;
    await page.route("**/limestone.glb*", async (r) => {
      if (r.request().resourceType() !== "fetch") return r.continue();
      delayed++;
      await new Promise((resolve) => setTimeout(resolve, 2500));
      return r.continue();
    });
    await page.goto("http://127.0.0.1:5196/?quality=low&devTravel=1");
    await page.getByTestId("explore-island").click();
    await page.waitForFunction(() =>
      window.__WORLD_RENDER__?.scene.getObjectByName("camp-assets-ready"),
    );
    assert.ok(delayed > 0);
    await page.waitForFunction(
      async () =>
        (
          await import("/src/game/locations/travel.ts")
        ).worldTravel.getSnapshot().phase === "ready",
    );
    report.checks.push("Delayed model recovers to full art and ready gameplay");
    await page.unroute("**/limestone.glb*");
    const start = Date.now();
    await page.getByTestId("button-menu").click();
    await page.getByTestId("explore-island").click();
    await page.waitForFunction(() =>
      window.__WORLD_RENDER__?.scene.getObjectByName("camp-assets-ready"),
    );
    await page.waitForFunction(
      async () =>
        (
          await import("/src/game/locations/travel.ts")
        ).worldTravel.getSnapshot().phase === "ready",
    );
    report.reentryWallMs = Date.now() - start;
    report.checks.push("Warm menu reentry restores complete environment");
  }
  assert.deepEqual(report.errors, []);
  report.result = "PASS";
  console.log(
    JSON.stringify(
      {
        checks: report.checks,
        samples: report.samples.map((s) => ({
          label: s.label,
          calls: s.calls,
          triangles: s.triangles,
          entryWallMs: s.entryWallMs,
        })),
        reentryWallMs: report.reentryWallMs,
      },
      null,
      2,
    ),
  );
} catch (error) {
  report.result = "FAIL";
  report.failure = error.stack;
  throw error;
} finally {
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
  await server.close();
}
