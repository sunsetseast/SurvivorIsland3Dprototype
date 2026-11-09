import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";

const out = process.env.CAST_EVIDENCE ?? "../../docs/cast-migration/evidence";
const args = process.argv.slice(2).map(Number);
const pilot = args.length > 0;
const manifest = JSON.parse(await readFile(new URL("../src/game/character/cast.json", import.meta.url), "utf8"));
const characters = manifest.survivors.filter(({ source }) => !pilot || args.includes(source.id)).map(({ source }) => ({
  id: source.id, name: source.name, url: `/src/assets/characters/cast/survivor-${source.id}.glb`,
}));
if (pilot) characters.unshift({ id: 0, name: "PR #29", url: "/src/assets/characters/tonsai-survivor.glb" });
const server = await createServer({ server: { host: "127.0.0.1", port: 5226, strictPort: true }, logLevel: "error" });
await server.listen();
try {
  const browser = await chromium.launch({
    executablePath: process.env.CAMP_CHROMIUM,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage();
    await page.goto("http://127.0.0.1:5226/");
    const { image, metrics } = await page.evaluate(async ({ entries, pilot }) => {
      const { renderCast } = await import("/scripts/cast-review.ts");
      return renderCast(entries, pilot);
    }, { entries: characters, pilot });
    await mkdir(out, { recursive: true });
    await writeFile(`${out}/${pilot ? "rig-pilot" : "cast-contact-sheet"}.jpg`, Buffer.from(image, "base64"));
    console.table(metrics);
  } finally {
    await browser.close();
  }
} finally {
  await server.close();
}
