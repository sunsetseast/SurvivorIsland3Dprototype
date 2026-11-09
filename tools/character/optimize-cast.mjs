import { execFile } from "node:child_process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const input = process.argv[2];
if (!input) throw new Error("Pass the directory of baked cast GLBs");
const run = promisify(execFile);
const game = new URL("../../artifacts/survivor-camp-prototype/src/", import.meta.url);
const manifestFile = new URL("game/character/cast.json", game);
const looks = JSON.parse(await readFile(new URL("./appearances.json", import.meta.url), "utf8"));
const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
const directory = fileURLToPath(new URL("assets/characters/cast/", game));
await mkdir(directory, { recursive: true });

const ids = new Set(process.argv.slice(3).map(Number));
const people = manifest.survivors.filter(({ source }) => !ids.size || ids.has(source.id));
if (ids.size && people.length !== ids.size) throw new Error("Unknown cast ID");
for (let offset = 0; offset < people.length; offset += 3) {
  await Promise.all(people.slice(offset, offset + 3).map(async (record) => {
    const id = record.source.id;
    if (!looks.people[id]) throw new Error(`No appearance for ${id}`);
    const file = `survivor-${id}.glb`;
    const output = resolve(directory, file);
    const temporary = resolve(directory, `survivor-${id}.tmp.glb`);
    await run(process.env.GLTF_TRANSFORM ?? "gltf-transform", [
      "optimize", resolve(input, file), temporary, "--compress", "meshopt", "--texture-compress", "webp",
      "--texture-size", "384", "--simplify-ratio", "0.65", "--simplify-error", "0.004",
      "--simplify-lock-border", "true", "--join", "false", "--instance", "false", "--palette", "false",
    ]);
    await rename(temporary, output);
    record.appearance = `tools/character/appearances.json#people/${id}`;
    record.model = file;
    record.status = "generated";
    console.log(`Optimized survivor ${id}`);
  }));
}
await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
