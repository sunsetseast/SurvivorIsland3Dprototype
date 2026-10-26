import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createServer } from "vite";
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("..", import.meta.url));
const output = path.join(root, "../../docs/tribal-council/blender-evidence");
await mkdir(output, { recursive: true });
process.env.PORT = "5183";
process.env.BASE_PATH = "/";
const server = await createServer({
  configFile: path.join(root, "vite.config.ts"),
  server: { host: "127.0.0.1", hmr: false, watch: null },
});
await server.listen();
const report = { checks: [], errors: [], expectedAssetFailures: [] };
let browser;
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
      "--disable-gpu-sandbox",
    ],
  });
  const page = await browser.newPage({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
  });
  page.setDefaultTimeout(120000);
  page.on("pageerror", (e) => report.errors.push(e.message));
  await page.goto("http://127.0.0.1:5183/?quality=low");
  await page.getByTestId("explore-tribal").click();
  async function attach() {
    await page.evaluate(async () => { window.__kitFiber = await import("/node_modules/.vite/deps/@react-three_fiber.js"); });
    await page.waitForFunction(() => {
      const f = window.__kitFiber;
      const s = f._roots
        .get(document.querySelector("canvas"))
        ?.store.getState();
      if (
        !s ||
        ![
          "sanctuary-assets-ready",
          "sanctuary-assets-loading",
          "sanctuary-asset-fallback",
        ].some((name) => s.scene.getObjectByName(name))
      )
        return false;
      window.__kitQA = s;
      s.setFrameloop("never");
      return true;
    });
  }
  await attach();
  await page.waitForFunction(() =>
    window.__kitQA.scene.getObjectByName("sanctuary-assets-ready"),
  );
  const low = await page.evaluate(() => {
    const s = window.__kitQA;
    return {
      quality: s.scene.getObjectByName("blender-sanctuary-kit").userData
        .quality,
      dpr: s.viewport.dpr,
      shadows: s.gl.shadowMap.enabled,
    };
  });
  assert.equal(low.quality, "low");
  assert.equal(low.dpr, 1);
  assert.equal(low.shadows, false);
  await page.getByTestId("skip-tribal-intro").click();
  await page.getByTestId("stand-and-explore").click();
  await page.waitForSelector("[data-testid=joystick]");
  report.checks.push({ lowQualityAndControls: low });
  await page.getByTestId("button-menu").click();
  await page.waitForSelector("canvas", { state: "detached" });
  await page.route("**/*.glb*", (route) => {
    report.expectedAssetFailures.push(route.request().url());
    return route.fulfill({
      status: 404,
      body: "intentional asset-load failure",
    });
  });
  await page.getByTestId("explore-tribal").click();
  await attach();
  await page.waitForFunction(() =>
    window.__kitQA.scene.getObjectByName("sanctuary-asset-fallback"),
  );
  await page.getByTestId("skip-tribal-intro").click();
  await page.getByTestId("stand-and-explore").click();
  await page.waitForSelector("[data-testid=joystick]");
  report.checks.push(
    "404 asset failure retains procedural architecture and exploration controls",
  );
  await page.getByTestId("button-menu").click();
  await page.waitForSelector("canvas", { state: "detached" });
  await page.unroute("**/*.glb*");
  await page.getByTestId("explore-tribal").click();
  await attach();
  await page.waitForFunction(() =>
    window.__kitQA.scene.getObjectByName("sanctuary-assets-ready"),
  );
  report.checks.push(
    "menu/reentry reloads assets after disposal and after failed request",
  );
  assert.deepEqual(report.errors, []);
  console.log("Asset loading, low quality, fallback and reentry passed");
} finally {
  await writeFile(
    path.join(output, "loading-qa.json"),
    JSON.stringify(report, null, 2),
  );
  await browser?.close();
  await server.close();
}
