import manifest from "./cast.json";

export const PLAYER_SLOT = 0;
export const cast = manifest.survivors;
export type CastMember = (typeof cast)[number];
const byId = new Map(cast.map((person) => [person.source.id, person]));

export function castMember(id: number | null | undefined): CastMember | undefined {
  return id == null ? undefined : byId.get(id);
}

/** Runtime slots belong to gameplay. Source IDs belong to people and save data. */
export function survivorIdForSlot(slot: number, playerSurvivorId: number | null): number | null {
  return slot === PLAYER_SLOT ? playerSurvivorId : slot;
}

/** Keep prototype staging sizes while assigning a real, unused identity to a vacated AI slot. */
export function assignAiSurvivors(stagedIds: readonly number[], playerSurvivorId: number | null): number[] {
  const used = new Set(stagedIds);
  const reserve = cast.find(({ source }) => !used.has(source.id) && source.id !== playerSurvivorId);
  return stagedIds.flatMap((id) => id === playerSurvivorId ? (reserve ? [reserve.source.id] : []) : [id]);
}
