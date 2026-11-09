import { readFile } from "node:fs/promises";

/** Intercept the review URL before Vite serves its production cast asset. */
export function castCandidatePlugin(file, url) {
  return {
    name: "cast-candidate-preview",
    async configureServer(server) {
      const bytes = await readFile(file);
      server.middlewares.use((req, res, next) => {
        if (req.url !== url) return next();
        res.setHeader("Content-Type", "model/gltf-binary");
        res.setHeader("Content-Length", bytes.length);
        res.end(bytes);
      });
    },
  };
}
