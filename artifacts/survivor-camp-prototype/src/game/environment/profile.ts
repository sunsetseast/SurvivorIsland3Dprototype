/** Bounded stage diagnostics; host CPU observations, not GPU/device benchmarks. */
export const environmentStages: Record<
  string,
  { lastMs: number; totalMs: number; runs: number }
> = {};
export function recordStage(name: string, start: number) {
  const elapsed = performance.now() - start,
    old = environmentStages[name];
  environmentStages[name] = {
    lastMs: elapsed,
    totalMs: (old?.totalMs ?? 0) + elapsed,
    runs: (old?.runs ?? 0) + 1,
  };
  return elapsed;
}
