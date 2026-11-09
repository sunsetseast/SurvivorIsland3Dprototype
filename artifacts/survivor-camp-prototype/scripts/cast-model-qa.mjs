import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";
import { castCandidatePlugin } from "./cast-candidate.mjs";

const out = process.env.CAST_EVIDENCE ?? "../../docs/cast-migration/evidence";
const args = process.argv.slice(2).map(Number);
const candidate = process.env.CAST_CANDIDATE;
const pilot = args.length > 0 || Boolean(candidate);
const candidateUrl = "/__cast-candidate.glb";
const manifest = JSON.parse(await readFile(new URL("../src/game/character/cast.json", import.meta.url), "utf8"));
const characters = manifest.survivors.filter(({ source }) => candidate ? source.id === 1 : !pilot || args.includes(source.id)).map(({ source }) => ({
  id: source.id, name: source.name, url: `/src/assets/characters/cast/survivor-${source.id}.glb`,
}));
if (candidate) characters.push({ id: 1, name: "Blender Ozzy candidate", url: candidateUrl });
else if (pilot) characters.unshift({ id: 0, name: "PR #29", url: "/src/assets/characters/tonsai-survivor.glb" });
const server = await createServer({
  server: { host: "127.0.0.1", port: 5226, strictPort: true }, logLevel: "error",
  plugins: candidate ? [castCandidatePlugin(candidate, candidateUrl)] : [],
});
await server.listen();
try {
  const browser = await chromium.launch({
    executablePath: process.env.CAMP_CHROMIUM,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  try {
    const page = await browser.newPage();
    await page.goto("http://127.0.0.1:5226/");
    const { image, metrics } = await page.evaluate(async ({ entries, pilot, benchmark }) => {
      const { renderCast } = await import("/scripts/cast-review.ts");
      return renderCast(entries, pilot, benchmark);
    }, { entries: characters, pilot, benchmark: Boolean(candidate) });
    await mkdir(out, { recursive: true });
    await writeFile(`${out}/${candidate ? "ozzy-webgl-comparison" : pilot ? "rig-pilot" : "cast-contact-sheet"}.jpg`, Buffer.from(image, "base64"));
    console.table(metrics);
  } finally {
    await browser.close();
  }
} finally {
  await server.close();
}
