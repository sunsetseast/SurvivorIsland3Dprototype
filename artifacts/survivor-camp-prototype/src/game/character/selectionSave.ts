import { castMember } from "./cast";

const key = "survivor-island-3d:selected-survivor";
type StoragePort = Pick<Storage, "getItem" | "setItem">;

/** The prototype persists the local identity. Location, AI state and challenge runs remain session-local. */
export function readSurvivorSelection(storage: StoragePort): number | null {
  try {
    const raw = storage.getItem(key);
    if (raw == null) return null;
    const saved: unknown = JSON.parse(raw);
    if (!saved || typeof saved !== "object" || !("version" in saved) || saved.version !== 1 ||
      !("survivorId" in saved) || typeof saved.survivorId !== "number") return null;
    return castMember(saved.survivorId)?.source.id ?? null;
  } catch {
    return null;
  }
}

export function saveSurvivorSelection(storage: StoragePort, survivorId: number): boolean {
  if (!castMember(survivorId)) return false;
  try {
    storage.setItem(key, JSON.stringify({ version: 1, survivorId }));
    return true;
  } catch {
    return false;
  }
}

export function loadLocalSurvivor(): number | null {
  try {
    return typeof window === "undefined" ? null : readSurvivorSelection(window.localStorage);
  } catch {
    return null;
  }
}
