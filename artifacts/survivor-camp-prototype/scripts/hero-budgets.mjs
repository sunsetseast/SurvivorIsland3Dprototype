import { buildContestant } from "../src/game/contestantArt.ts";
const report = [];
for (const [id, name] of [
  [11, "Sandra"],
  [13, "Parvati"],
  [18, "Russell"],
  [4, "Boston Rob"],
  [-1, "Jeff Probst"],
]) {
  const parts = buildContestant(id);
  let triangles = 0,
    uniqueBytes = 0;
  for (const key of [
    "torso",
    "pelvis",
    "head",
    "armU",
    "forearm",
    "thigh",
    "shin",
    "foot",
  ]) {
    const g = parts[key],
      copies = ["torso", "pelvis", "head"].includes(key) ? 1 : 2;
    triangles +=
      ((g.index ? g.index.count : g.attributes.position.count) / 3) * copies;
    for (const a of Object.values(g.attributes))
      uniqueBytes += a.array.byteLength;
    if (g.index) uniqueBytes += g.index.array.byteLength;
    g.dispose();
  }
  report.push({
    id,
    name,
    triangles,
    meshes: 13,
    materials: 1,
    textures: 0,
    uniqueBufferBytes: uniqueBytes,
  });
}
console.log(JSON.stringify(report, null, 2));
