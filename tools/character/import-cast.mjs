import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const checkout = process.argv[2];
if (!checkout) throw new Error("Pass the read-only SurvivorIsland2025 checkout");
const sourceFile = "src/modules/data/GameData.js";
const revision = execFileSync("git", ["-C", checkout, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const { default: data } = await import(pathToFileURL(resolve(checkout, sourceFile)).href);
const target = new URL("../../artifacts/survivor-camp-prototype/src/game/character/cast.json", import.meta.url);
const previous = existsSync(target)
  ? new Map(JSON.parse(readFileSync(target, "utf8")).survivors.map((person) => [person.source.id, person]))
  : new Map();
const ids = new Set();
const avatars = new Set();
const survivors = data.getSurvivors().map((source) => {
  if (!Number.isSafeInteger(source.id) || source.id <= 0 || ids.has(source.id) ||
      !source.name || !source.season || !source.gender || !source.traitClass ||
      typeof source.avatarUrl !== "string" || !source.avatarUrl.startsWith("Assets/Avatars/") ||
      avatars.has(source.avatarUrl) || !existsSync(join(checkout, source.avatarUrl))) {
    throw new Error(`Invalid source contestant ${source.id}: ${source.name}`);
  }
  ids.add(source.id);
  avatars.add(source.avatarUrl);
  const prior = previous.get(source.id);
  return {
    source,
    appearance: prior?.source.avatarUrl === source.avatarUrl ? prior.appearance : null,
    model: prior?.source.avatarUrl === source.avatarUrl ? prior.model : null,
    status: prior?.source.avatarUrl === source.avatarUrl ? prior.status : "pending",
  };
}).sort((a, b) => a.source.id - b.source.id);
if (!survivors.length) throw new Error("Empty cast");
for (const id of previous.keys()) {
  if (!ids.has(id)) throw new Error(`Previously recorded survivor ${id} is absent`);
}
writeFileSync(target, JSON.stringify({
  version: 1,
  source: { repository: "sunsetseast/SurvivorIsland2025", revision, file: sourceFile },
  survivors,
}, null, 2) + "\n");
console.log(`Imported ${survivors.length} original survivors from ${revision}`);
