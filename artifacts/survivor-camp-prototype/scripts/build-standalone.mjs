import { build } from "vite";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("..", import.meta.url));
process.env.PORT ||= "5174";
process.env.BASE_PATH = "./";
const result = await build({
  configFile: path.join(root, "vite.config.ts"),
  base: "./",
  build: {
    write: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
const output = Array.isArray(result) ? result[0].output : result.output;
const js = output
  .filter((o) => o.type === "chunk")
  .map((o) => o.code)
  .join("\n");
const css = output
  .filter((o) => o.type === "asset" && o.fileName.endsWith(".css"))
  .map((o) => o.source)
  .join("\n");
const commit = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: root,
  encoding: "utf8",
}).trim();
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover, user-scalable=no"><meta name="robots" content="noindex,nofollow"><meta name="source-commit" content="${commit}"><title>Survivor Island · Tribal Council Preview</title><style>${css}</style></head><body><div id="root"></div><script type="module">${js.replaceAll("</script", "<\\/script")}</script></body></html>`;
const destination = path.resolve(
  process.env.TRIBAL_PREVIEW_DIR || path.join(root, "dist/standalone"),
);
await mkdir(destination, { recursive: true });
await writeFile(
  path.join(destination, "Survivor_Tribal_Council_Preview.html"),
  html,
);
await writeFile(
  path.join(destination, "preview-manifest.json"),
  JSON.stringify(
    {
      sourceCommit: commit,
      sha256: createHash("sha256").update(html).digest("hex"),
      bytes: Buffer.byteLength(html),
      note: "Built directly from the PR source. No deployment or external asset requests required. WebGL browser required.",
    },
    null,
    2,
  ),
);
console.log("Standalone preview:", destination);
