import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const assetDirectory = fileURLToPath(
  new URL(
    "../../artifacts/survivor-camp-prototype/src/assets/sanctuary/",
    import.meta.url,
  ),
);
export function inspectGLB(bytes) {
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, "GLB magic");
  assert.equal(bytes.readUInt32LE(4), 2, "glTF version");
  assert.equal(bytes.readUInt32LE(8), bytes.length, "complete binary");
  const jsonLength = bytes.readUInt32LE(12);
  const doc = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  const binary = bytes.subarray(28 + jsonLength);
  assert.match(doc.asset.generator, /Blender/, "real Blender exporter");
  assert.equal(doc.images.length, 2, "shared albedo + normal atlas");
  assert.ok(doc.materials.length <= 2, "bounded material count");
  assert.ok(!doc.images.some((i) => i.uri), "self-contained textures");
  assert.ok(!doc.buffers.some((i) => i.uri), "self-contained geometry");
  assert.equal(doc.nodes.filter((n) => n.mesh !== undefined).length, 9);
  let triangles = 0;
  for (const mesh of doc.meshes)
    for (const p of mesh.primitives) {
      assert.equal(p.mode ?? 4, 4, "triangle primitives");
      assert.ok(
        p.attributes.NORMAL !== undefined &&
          p.attributes.TEXCOORD_0 !== undefined,
        "normals and UVs exported",
      );
      assert.ok(
        p.attributes.COLOR_0 !== undefined,
        "weather vertex colors exported",
      );
      const indices = doc.accessors[p.indices];
      triangles += indices.count / 3;
      for (const attr of Object.values(p.attributes)) {
        const a = doc.accessors[attr];
        const view = doc.bufferViews[a.bufferView];
        assert.ok(
          view.byteOffset + view.byteLength <= binary.length,
          "buffer bounds",
        );
        if (a.componentType === 5126) {
          const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
          const stride = view.byteStride || components * 4;
          for (let i = 0; i < a.count; i++)
            for (let k = 0; k < components; k++)
              assert.ok(
                Number.isFinite(
                  binary.readFloatLE(
                    (view.byteOffset || 0) +
                      (a.byteOffset || 0) +
                      i * stride +
                      k * 4,
                  ),
                ),
                "finite mesh attribute",
              );
        }
      }
    }
  assert.ok(triangles < 80000, "kit triangle budget");
  const nodes = Object.fromEntries(
    doc.nodes.filter((n) => n.mesh !== undefined).map((n) => [n.name, n]),
  );
  const bounds = (name) => {
    const primitives = doc.meshes[nodes[name].mesh].primitives;
    return primitives.map((p) => doc.accessors[p.attributes.POSITION]);
  };
  for (const a of bounds("elephant_guardian")) {
    assert.ok(a.min[1] > -0.1, "elephant grounded on Y-up plinth");
    assert.ok(a.max[1] > 2.4 && a.max[1] < 3.5, "metres, not centimetres");
  }
  const images = doc.images.map((image) => {
    const v = doc.bufferViews[image.bufferView],
      png = binary.subarray(v.byteOffset, v.byteOffset + v.byteLength);
    assert.equal(png.toString("ascii", 1, 4), "PNG");
    return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
  });
  return {
    bytes: bytes.length,
    triangles,
    materials: doc.materials.length,
    images,
    assets: Object.keys(nodes),
  };
}

export function validateKit() {
  const manifest = JSON.parse(
    readFileSync(path.join(assetDirectory, "manifest.json")),
  );
  assert.equal(
    manifest.generatorSha256,
    createHash("sha256")
      .update(
        readFileSync(fileURLToPath(new URL("sanctuary.py", import.meta.url))),
      )
      .digest("hex"),
    "generator changed without regenerating assets",
  );
  const summary = {};
  for (const [name, expected] of Object.entries(manifest.files)) {
    const bytes = readFileSync(path.join(assetDirectory, name));
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      expected.sha256,
      "manifest SHA",
    );
    assert.equal(bytes.length, expected.bytes);
    summary[name] = inspectGLB(bytes);
    assert.deepEqual(new Set(summary[name].assets), new Set(manifest.assets));
  }
  const full = summary["sanctuary-kit.glb"],
    low = summary["sanctuary-kit-low.glb"];
  assert.ok(full.bytes < 8e6 && low.bytes < 3e6, "download budgets");
  assert.ok(
    low.triangles < full.triangles * 0.65,
    "meaningful geometry fallback",
  );
  assert.ok(
    low.images.every((i) => i.width === 512),
    "lower texture memory fallback",
  );
  return summary;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = validateKit();
  if (process.argv[2])
    writeFileSync(process.argv[2], JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result, null, 2));
}
