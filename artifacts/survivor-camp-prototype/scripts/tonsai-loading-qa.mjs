/** Real application/WebGL evidence. Host SwiftShader timings are NOT iPhone FPS. */
import assert from "node:assert/strict";
import os from "node:os";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";
// Restricted runner exposes no network interfaces; the server itself only needs loopback.
try {
  os.networkInterfaces();
} catch {
  os.networkInterfaces = () => ({});
}
const root = fileURLToPath(new URL("..", import.meta.url)),
  out = path.resolve(root, "../../docs/tonsai/evidence");
await mkdir(out, { recursive: true });
process.env.PORT = "5199";
process.env.BASE_PATH = "/";
const server = await createServer({
  configFile: path.join(root, "vite.config.ts"),
  server: { host: "127.0.0.1", hmr: false, watch: null },
});
await server.listen();
const report = {
  renderer:
    "Chrome 142 / ANGLE SwiftShader, host software WebGL; physical iPhone Safari UNVERIFIED",
  errors: [],
  captures: [],
  performance: [],
  checks: [],
};
let browser;
try {
  browser = await chromium.launch({
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
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  page.setDefaultTimeout(180000);
  page.on("pageerror", (e) => report.errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") report.errors.push(m.text());
  });

  const blocked = [];
  page.on("request", (r) => {
    if (/geology.glb|broadleaf.png|fern.png/.test(r.url()))
      console.log("REQUEST", r.resourceType(), r.url());
  });
  await page.route("**/*", (route) => {
    const r = route.request(),
      u = r.url();
    if (
      (/geology.glb|karsts.glb|karsts-(high|low).glb/.test(u) && r.resourceType() !== "script") ||
      (r.resourceType() === "image" &&
        /broadleaf.png|fern.png|canopy.png|rock_06_/.test(u))
    ) {
      blocked.push(u);
      console.log("BLOCK", u);
      return route.abort();
    }
    return route.continue();
  });
  await page.goto("http://127.0.0.1:5199/?devTravel=1");
  await page.getByTestId("explore-railay").click();
  await page.waitForFunction(() => window.__RAILAY__);
  await page.waitForTimeout(1000);
  const result = await page.evaluate(() => ({
    fallback: !!window.__RAILAY__.scene.getObjectByName(
      "railay-geology-fallback",
    ),
    tonsaiFallback: !!window.__RAILAY__.scene.getObjectByName(
      "tonsai-karsts-fallback",
    ),
    ready: !!window.__RAILAY__.scene.getObjectByName("railay-geology-ready"),
    stats: window.__RAILAY__.stats(),
  }));
  console.log(
    "RESULT",
    JSON.stringify({ blocked, result, errors: report.errors }),
  );
  assert.ok(blocked.length >= 3);
  assert.ok(result.fallback);
  assert.ok(result.tonsaiFallback);
  assert.ok(report.errors.every((e) => e.includes("ERR_FAILED")));
  report.checks.push({ blocked, result });
} finally {
  report.expectedNetworkErrors = report.errors.filter((e) =>
    e.includes("ERR_FAILED"),
  );
  report.errors = report.errors.filter((e) => !e.includes("ERR_FAILED"));
  await writeFile(
    path.join(out, "loading-report.json"),
    JSON.stringify(report, null, 2),
  );
  await browser?.close();
  await server.close();
}
console.log("Loading fallback QA passed");
