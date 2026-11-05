type DisposalRecord = { disposed: boolean; listener: () => void };
type ObservedResource = { removeEventListener(type: "dispose", listener: () => void): void };

/** Forget released, detached assets without losing the final sweep of live or pending assets. */
export function pruneDisposedResources<R extends ObservedResource>(
  owned: Map<R, DisposalRecord>,
  live: ReadonlySet<R>,
) {
  for (const [resource, entry] of owned) {
    if (!entry.disposed || live.has(resource)) continue;
    resource.removeEventListener("dispose", entry.listener);
    owned.delete(resource);
  }
}
