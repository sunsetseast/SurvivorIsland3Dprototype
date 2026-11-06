/** Pure 60 Hz rehearsal simulation. No DOM, renderer, camp or season authority. */
export const STEP = 1 / 60;
export const RULES = { duration: 90, countdown: 3, placementInterval: 10, placementGrace: 7, maxStrikes: 3 } as const;
export type Phase = "idle" | "introduction" | "tutorial" | "countdown" | "active" | "paused" | "player-eliminated" | "results" | "completed" | "cancelled";
export type Entrant = { id: number; name: string; ability?: number };
export type Competitor = Entrant & {
  station: number; balance: number; velocity: number; control: number; stability: number;
  placed: number; strikes: number; nextPlacement: number; eliminatedAt: number | null;
  placementFlash: number; lastPlacement: "none" | "success" | "miss"; phase: number;
};
export type Result = { winnerIds: number[]; ranking: { id: number; name: string; place: number; placed: number; eliminatedAt: number | null }[]; duration: number; reason: "last-standing" | "time-limit" | "all-out"; rehearsal: true };
export type Snapshot = { phase: Phase; resumePhase: Phase; tick: number; countdown: number; elapsed: number; competitors: Competitor[]; result: Result | null; notices: string[] };
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const difficultyAt = (t: number) => 1 + clamp(t / RULES.duration, 0, 1) * 1.25;
export const balanceWindow = (t: number) => .27 - clamp(t / RULES.duration, 0, 1) * .09;
/** Authored, continuous, predictable disturbance. Exposed for the UI preview and reference tests. */
export function disturbance(t: number, phase: number) {
  return (Math.sin(t * 1.18 + phase) * .59 + Math.sin(t * .47 + phase * 2) * .28) * difficultyAt(t);
}
export function placementWindow(t: number) { return .19 - .06 * clamp(t / RULES.duration, 0, 1); }
export function canPlace(c: Competitor, t: number) { return c.eliminatedAt === null && t >= c.nextPlacement && Math.abs(c.balance) <= placementWindow(t) && Math.abs(c.velocity) < .3; }
/** Ability is a temporary read-only blend of existing traits, never a new character statistic. */
export function rehearsalAbility(p: {focus?:number;dexterity?:number;endurance?:number}) { return clamp(((p.focus??6)*.4+(p.dexterity??6)*.35+(p.endurance??6)*.25)/10,.25,.95); }
export function opponentInput(c: Competitor, t: number) {
  const ability=c.ability??.65,lag=.14+(1-ability)*1.25,fatigue=t/RULES.duration;
  const error=(Math.sin(t*1.9+c.phase*3)*.18+Math.sin(t*.67+c.phase)*.36)*(1-ability)*(1+fatigue*3.5);
  return clamp(-(disturbance(Math.max(0,t-lag),c.phase)*.62+c.balance*(1.6+ability)+c.velocity*1.6)/1.65+error,-1,1);
}
export function assignEntrants(roster: readonly Entrant[], stationCount = 8): Competitor[] {
  if (!Number.isInteger(stationCount) || stationCount < 1 || stationCount > 8) throw Error("Invalid station capacity");
  const unique = [ { id: 0, name: "You" }, ...roster.filter(p => p.id !== 0) ].filter((p, i, all) => all.findIndex(q => q.id === p.id) === i).slice(0, stationCount);
  return unique.map((p, station) => ({ ...p, ability: clamp(p.ability ?? .65, .2, .95), station, balance: 0, velocity: 0, control: 0, stability: 1, placed: 0, strikes: 0, nextPlacement: 8, eliminatedAt: null, placementFlash: 0, lastPlacement: "none", phase: 0 }));
}
export class StillwaterEngine {
  state: Snapshot;
  private accumulator = 0;
  private input = 0;
  private placeQueued = false;
  private seed: number;
  constructor(readonly roster: readonly Entrant[], readonly initialSeed = 2401) {
    this.seed = initialSeed >>> 0;
    this.state = this.fresh();
  }
  private random() { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296; }
  private fresh(): Snapshot {
    this.seed = this.initialSeed >>> 0;
    const competitors = assignEntrants(this.roster).map(c => ({ ...c, phase: this.random() * Math.PI * 2 }));
    return { phase: "idle", resumePhase: "active", tick: 0, elapsed: 0, countdown: RULES.countdown, competitors, result: null, notices: [] };
  }
  get ownsControls() { return !["idle", "completed", "cancelled"].includes(this.state.phase); }
  begin() { if (!this.ownsControls) { this.state = this.fresh(); this.state.phase = "introduction"; return true; } return false; }
  tutorial() { if (this.state.phase === "introduction") this.state.phase = "tutorial"; }
  ready() { if (this.state.phase === "tutorial") { this.state.phase = "countdown"; this.accumulator = 0; this.release(); } }
  setInput(value: number) { this.input = Number.isFinite(value) ? clamp(value, -1, 1) : 0; }
  place() { if (this.state.phase === "active") this.placeQueued = true; }
  release() { this.input = 0; this.placeQueued = false; }
  pause() { if (["countdown", "active", "player-eliminated"].includes(this.state.phase)) { this.state.resumePhase = this.state.phase; this.state.phase = "paused"; this.release(); this.accumulator = 0; } }
  resume() { if (this.state.phase === "paused") { this.state.phase = this.state.resumePhase; this.release(); } }
  cancel() { this.release(); this.accumulator = 0; this.state.phase = "cancelled"; }
  complete() { if (this.state.phase === "results") { this.release(); this.state.phase = "completed"; } }
  retry() { this.release(); this.accumulator = 0; this.state = this.fresh(); this.state.phase = "tutorial"; }
  private notice(s: string) { this.state.notices = [...this.state.notices.slice(-3), s]; }
  private placement(c: Competitor) {
    if (this.state.elapsed < c.nextPlacement || c.eliminatedAt !== null) return;
    c.placementFlash = .65;
    if (canPlace(c, this.state.elapsed)) { c.placed++; c.stability = clamp(c.stability + .1, 0, 1); c.lastPlacement = "success"; }
    else { c.strikes++; c.stability = clamp(c.stability - .19, 0, 1); c.velocity += Math.sign(c.balance || 1) * .13; c.lastPlacement = "miss"; }
    c.nextPlacement += RULES.placementInterval;
  }
  private finish(reason: Result["reason"]) {
    if (this.state.result) return;
    const list = [...this.state.competitors].sort((a, b) => {
      if (a.eliminatedAt === null && b.eliminatedAt !== null) return -1;
      if (b.eliminatedAt === null && a.eliminatedAt !== null) return 1;
      if (a.eliminatedAt !== null && b.eliminatedAt !== null) return b.eliminatedAt - a.eliminatedAt;
      return b.placed - a.placed || b.stability - a.stability;
    });
    const same = (a: Competitor, b: Competitor) => a.eliminatedAt === b.eliminatedAt && (a.eliminatedAt !== null || (a.placed === b.placed && Math.abs(a.stability - b.stability) < 1e-9));
    let place = 1;
    this.state.result = { winnerIds: reason==="all-out"?[]:list.filter(c => same(c, list[0]!)).map(c => c.id), ranking: list.map((c, i) => { if (i && !same(c, list[i-1]!)) place = i+1; return { id:c.id, name:c.name, place, placed:c.placed, eliminatedAt:c.eliminatedAt }; }), duration: this.state.elapsed, reason, rehearsal: true };
    this.state.phase = "results"; this.release(); this.accumulator = 0;
  }
  advance(dt: number) {
    if (!Number.isFinite(dt) || dt <= 0 || !["countdown", "active", "player-eliminated"].includes(this.state.phase)) return;
    this.accumulator += dt;
    while (this.accumulator + 1e-10 >= STEP && ["countdown", "active", "player-eliminated"].includes(this.state.phase)) { this.accumulator = Math.max(0, this.accumulator - STEP); this.step(); }
  }
  private step() {
    const s = this.state;
    if (s.phase === "countdown") {
      s.countdown = Math.max(0, s.countdown - STEP);
      if (s.countdown < 1e-8) { s.countdown = 0; s.phase = "active"; }
      return;
    }
    s.tick++; s.elapsed = s.tick * STEP;
    for (const c of s.competitors) {
      c.placementFlash = Math.max(0, c.placementFlash - STEP);
      if (c.eliminatedAt !== null) continue;
      const target = c.id === 0 ? this.input : opponentInput(c,s.elapsed);
      c.control += (target - c.control) * (1 - Math.exp(-STEP * 12));
      const acceleration = disturbance(s.elapsed, c.phase) * .62 + c.control * 1.65 - c.velocity * 2.1 + c.balance * .12;
      c.velocity += acceleration * STEP; c.balance = clamp(c.balance + c.velocity * STEP, -1.5, 1.5);
      const excess = Math.max(0, Math.abs(c.balance) - balanceWindow(s.elapsed));
      c.stability = clamp(c.stability + (excess > 0 ? -excess * .95 * difficultyAt(s.elapsed) : .11) * STEP, 0, 1);
      if (c.id === 0 && this.placeQueued) this.placement(c);
      if (c.id !== 0 && s.elapsed >= c.nextPlacement + .7 + (1-(c.ability??.65))*2 && (canPlace(c,s.elapsed) || s.elapsed >= c.nextPlacement + RULES.placementGrace - .25)) this.placement(c);
      if (s.elapsed > c.nextPlacement + RULES.placementGrace) { c.strikes++; c.lastPlacement = "miss"; c.placementFlash = .65; c.nextPlacement += RULES.placementInterval; }
      if (c.stability <= 0 || c.strikes >= RULES.maxStrikes || Math.abs(c.balance) >= 1.15) { c.eliminatedAt = s.elapsed; this.notice(`${c.name} ${c.id===0?"are":"is"} out · ${s.elapsed.toFixed(1)}s`); if (c.id === 0) { s.phase = "player-eliminated"; this.release(); } }
    }
    this.placeQueued = false;
    const live = s.competitors.filter(c => c.eliminatedAt === null);
    if (!live.length) this.finish("all-out");
    else if (live.length === 1 && s.competitors.length > 1) this.finish("last-standing");
    else if (s.elapsed >= RULES.duration) this.finish("time-limit");
  }
}
