import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateKit } from "./validate.mjs";
const executable = process.env.BLENDER || "blender";
const version = spawnSync(executable, ["--background", "--version"], {
  encoding: "utf8",
});
if (version.error || !version.stdout.includes("Blender 4.5."))
  throw new Error(
    "Set BLENDER to a Blender 4.5 LTS executable. See tools/blender/README.md.",
  );
const result = spawnSync(
  executable,
  [
    "--background",
    "--factory-startup",
    "--python-exit-code",
    "1",
    "--python",
    fileURLToPath(new URL("sanctuary.py", import.meta.url)),
  ],
  { stdio: "inherit" },
);
if (result.status !== 0) process.exit(result.status || 1);
console.log(validateKit());
