import { spawnSync } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const [sourceDir, outputDir, ...ids] = process.argv.slice(2);
if (!sourceDir || !outputDir || !ids.length) {
  throw new Error("Usage: node tools/character/blender/build.mjs <foundation-directory> <output-directory> <survivor-id>...");
}

const here = fileURLToPath(new URL(".", import.meta.url));
const config = join(here, "appearances.json");
const { people } = JSON.parse(await readFile(config, "utf8"));
for (const id of ids) {
  if (!people[id]?.sculpt) throw new Error(`Survivor ${id} has no authored sculpt recipe`);
}

function run(executable, args) {
  const child = spawnSync(executable, args, { stdio: "inherit" });
  if (child.error) throw child.error;
  if (child.status !== 0) throw new Error(`${executable} exited with ${child.status}`);
}

const out = resolve(outputDir);
if (resolve(sourceDir) === out) throw new Error("Use different foundation and output directories");
await mkdir(out, { recursive: true });
for (const id of new Set(ids)) {
  const file = `survivor-${id}`;
  const foundation = resolve(sourceDir, `${file}.glb`);
  const raw = join(out, `${file}-blender.glb`);
  const bound = join(out, `${file}-bound.glb`);
  run(process.env.BLENDER ?? "blender", [
    "--background", "--factory-startup", "--threads", "4", "--python-exit-code", "1",
    "--python", join(here, "model.py"), "--",
    foundation, raw, config, id,
  ]);
  run(process.env.PYTHON ?? "python3", [join(here, "bind.py"), foundation, raw, bound, `Survivor_${id}`]);
  run(process.env.GLTF_TRANSFORM ?? "gltf-transform", [
    "optimize", bound, join(out, `${file}.glb`), "--compress", "meshopt",
    "--texture-compress", "webp", "--texture-size", "384",
    "--simplify-ratio", "0.45", "--simplify-error", "0.0038",
    "--simplify-lock-border", "true", "--join", "false", "--instance", "false", "--palette", "false",
  ]);
}
