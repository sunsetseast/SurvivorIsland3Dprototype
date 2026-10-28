import { chromium } from "playwright";
import { createServer } from "vite";
import { mkdir, writeFile } from "node:fs/promises";
process.env.PORT = "5194";
process.env.BASE_PATH = "/";
const server = await createServer({
  configFile: "vite.config.ts",
  server: { host: "127.0.0.1", hmr: false, watch: null },
});
await server.listen();
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CAMP_CHROMIUM,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
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
const results = [];
try {
  await page.goto("http://127.0.0.1:5194/?quality=low&devTravel=1");
  for (const [id, label, menu] of [
    ["explore-island", "initial camp", "menu"],
    ["explore-railay", "Railay default entry", "island-menu"],
    ["explore-island", "camp reentry", "menu"],
  ]) {
    console.log("BASELINE", label);
    const start = Date.now();
    await page.getByTestId(id).click();
    if (id === "explore-railay") {
      await page.waitForFunction(
        () =>
          window.__RAILAY__?.scene.getObjectByName("railay-geology-ready") &&
          window.__RAILAY__?.scene.getObjectByName("tonsai-karsts-ready"),
      );
    } else
      await page.waitForFunction(
        () =>
          document.querySelector("canvas") &&
          !window.__RAILAY__ &&
          window.__CAMP_DEBUG__.position.y > 0,
      );
    await page.waitForTimeout(2500);
    results.push(
      await page.evaluate(
        async ({ label, ms }) => {
          const f =
            await import("/node_modules/.vite/deps/@react-three_fiber.js");
          const s =
            window.__WORLD_RENDER__?.state ??
            f._roots.get(document.querySelector("canvas")).store.getState();
          return {
            label,
            hostEntryPlusSettleMs: ms,
            calls: s.gl.info.render.calls,
            triangles: s.gl.info.render.triangles,
            ...s.gl.info.memory,
            position: window.__CAMP_DEBUG__.position,
            jsHeap: performance.memory?.usedJSHeapSize,
          };
        },
        { label, ms: Date.now() - start },
      ),
    );
    if (menu === "menu") await page.getByTestId("button-menu").click();
    else await page.getByTestId(menu).click();
  }
  await mkdir("../../docs/connected-world/evidence", { recursive: true });
  await writeFile(
    `../../docs/connected-world/evidence/${process.env.WORLD_BASELINE_PHASE || "baseline"}.json`,
    JSON.stringify(
      {
        method:
          "Comparable menu entry / default poses; Chromium software WebGL; 932x430 DPR1 low; host wall time includes 2.5s settle; not journey spawn timings",
        browser: browser.version(),
        phase: process.env.WORLD_BASELINE_PHASE || "baseline-main-8ef774f",
        results,
      },
      null,
      2,
    ),
  );
  console.log(results);
} finally {
  await browser.close();
  await server.close();
}
