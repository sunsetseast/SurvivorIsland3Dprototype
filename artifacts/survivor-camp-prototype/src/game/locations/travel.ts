import { clearInput } from "../state";
import {
  CONNECTIONS,
  LOCATIONS,
  localInstance,
  type LocationId,
  type LocationInstance,
  type Participant,
  type Pose,
} from "./registry";
export type TravelPermission = {
  participantId: string;
  connectionId: string;
  originInstanceId: string;
  eventId: string;
};
export type WorldSession = {
  version: 1;
  participant: Participant;
  locationId: LocationId;
  instance: LocationInstance;
  poses: Partial<Record<LocationId, Pose>>;
  permissions: TravelPermission[];
  returnTo?: { locationId: LocationId; instance: LocationInstance };
};
/** No invented season/inventory/relationship data. CampRuntime + its provider own existing gameplay data. */
export function createSession(): WorldSession {
  const instance = localInstance("camp_tribe_a");
  return {
    version: 1,
    participant: {
      id: "local-player",
      tribeId: "tonsai",
      instanceId: instance.id,
    },
    locationId: "camp_tribe_a",
    instance,
    poses: {},
    permissions: [],
  };
}
export type TravelState = {
  phase:
    | "menu"
    | "fading"
    | "unloading"
    | "loading"
    | "arriving"
    | "ready"
    | "error";
  active: LocationId | null;
  target: LocationId | null;
  entry: Pose | null;
  token: number;
  message: string;
  error: string | null;
};
type Load = (id: LocationId) => Promise<unknown>;
export class TravelManager {
  readonly session = createSession();
  private state: TravelState = {
    phase: "menu",
    active: null,
    target: null,
    entry: null,
    token: 0,
    message: "",
    error: null,
  };
  private listeners = new Set<() => void>();
  private last: {
    id: LocationId;
    pose: Pose | null;
    instance: LocationInstance;
  } | null = null;
  private pendingConnection: string | null = null;
  private destinationEntry: Pose | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  readonly timings: { locationId: LocationId; ms: number; outcome: string }[] =
    [];
  private started = 0;
  constructor(
    private load: Load,
    private reset = clearInput,
    private fadeMs = 280,
  ) {}
  subscribe = (f: () => void) => {
    this.listeners.add(f);
    return () => {
      this.listeners.delete(f);
    };
  };
  getSnapshot = () => this.state;
  get blocked() {
    return this.state.phase !== "ready";
  }
  private set(p: Partial<TravelState>) {
    this.state = { ...this.state, ...p };
    this.listeners.forEach((f) => f());
  }
  recordPose(id: LocationId, pose: Pose) {
    if (this.state.active === id && this.state.phase === "ready")
      this.session.poses[id] = { ...pose };
  }
  grantJourney() {
    if (
      this.session.locationId !== "camp_tribe_a" ||
      this.state.phase !== "ready"
    )
      return false;
    this.session.permissions = [
      {
        participantId: this.session.participant.id,
        connectionId: "camp_to_trail",
        originInstanceId: this.session.instance.id,
        eventId: "development-journey",
      },
    ];
    this.set({});
    return true;
  }
  permission(id: string): string | null {
    const c = CONNECTIONS[id];
    if (!c || c.source !== this.session.locationId)
      return "This route is not available here.";
    if (c.permission === "return")
      return this.session.returnTo?.locationId === c.destination
        ? null
        : "No return journey is active.";
    return this.session.permissions.some(
      (p) =>
        p.participantId === this.session.participant.id &&
        p.connectionId === id &&
        p.originInstanceId === this.session.instance.id,
    )
      ? null
      : "A journey invitation is required.";
  }
  travel(id: string): boolean {
    const c = CONNECTIONS[id],
      p = this.session.poses[this.session.locationId];
    if (
      this.blocked ||
      !c ||
      this.permission(id) ||
      !p ||
      Math.hypot(p.x - c.exit.x, p.z - c.exit.z) > c.radius
    )
      return false;
    this.pendingConnection = id;
    this.start(c.destination, LOCATIONS[c.destination].spawns[c.spawn]!);
    return true;
  }
  /** Only the camp resume and explicit rehearsal adapters call this. Normal gameplay uses travel(). */
  enter(id: LocationId, rehearsal = false) {
    if (this.state.phase !== "menu") return false;
    if (!rehearsal)
      id =
        LOCATIONS[this.session.locationId].category === "council"
          ? "camp_tribe_a"
          : this.session.locationId;
    if (!LOCATIONS[id].scene) return false;
    this.pendingConnection = null;
    this.start(
      id,
      this.session.poses[id] ?? LOCATIONS[id].spawns.default ?? null,
    );
    return true;
  }
  private start(id: LocationId, entry: Pose | null) {
    this.destinationEntry = entry;
    clearTimeout(this.timer);
    this.reset();
    this.started = performance.now();
    this.last = {
      id: this.session.locationId,
      pose: this.session.poses[this.session.locationId] ?? null,
      instance: this.session.instance,
    };
    const token = this.state.token + 1;
    this.set({
      phase: "fading",
      target: id,
      token,
      error: null,
      message: this.pendingConnection
        ? CONNECTIONS[this.pendingConnection]!.presentation
        : `Preparing ${LOCATIONS[id].name}…`,
    });
    this.timer = setTimeout(() => {
      if (this.state.token === token)
        this.set({ phase: "unloading", active: null });
    }, this.fadeMs);
  }
  /** Called by the host after React has removed the source tree. Token guards every async completion. */
  async loadPending(token: number) {
    if (token !== this.state.token || this.state.phase !== "unloading") return;
    const id = this.state.target!;
    this.set({ phase: "loading" });
    this.timer = setTimeout(
      () =>
        this.fail(
          token,
          "The location took too long to prepare. Retry or return safely.",
        ),
      45000,
    );
    try {
      await this.load(id);
      if (token !== this.state.token || this.getSnapshot().phase !== "loading")
        return;
      this.set({ phase: "arriving", active: id, entry: this.destinationEntry });
    } catch (e) {
      this.fail(token, e instanceof Error ? e.message : String(e));
    }
  }
  ready(token: number) {
    if (token !== this.state.token || this.state.phase !== "arriving") return;
    clearTimeout(this.timer);
    const id = this.state.active!;
    const c = this.pendingConnection
      ? CONNECTIONS[this.pendingConnection]
      : null;
    let instance = localInstance(id);
    if (c?.permission === "journey") {
      this.session.returnTo = {
        locationId: this.last!.id,
        instance: this.last!.instance,
      };
      this.session.permissions = [];
    }
    if (c?.permission === "return") {
      instance = this.session.returnTo!.instance;
      delete this.session.returnTo;
      this.session.permissions = [];
    }
    this.session.locationId = id;
    this.session.instance = instance;
    this.session.participant.instanceId = instance.id;
    this.timings.push({
      locationId: id,
      ms: performance.now() - this.started,
      outcome: "ready",
    });
    this.reset();
    this.set({ phase: "ready", target: null, error: null });
  }
  fail(token: number, error: string) {
    if (
      token !== this.state.token ||
      !["loading", "arriving"].includes(this.state.phase)
    )
      return;
    clearTimeout(this.timer);
    this.reset();
    this.timings.push({
      locationId: this.state.target!,
      ms: performance.now() - this.started,
      outcome: "error",
    });
    this.set({ phase: "error", active: null, error });
  }
  retry() {
    if (this.state.phase !== "error") return;
    this.reset();
    this.set({ phase: "unloading", token: this.state.token + 1, error: null });
  }
  returnSafely() {
    if (
      !["error", "loading", "arriving", "unloading", "fading"].includes(
        this.state.phase,
      ) ||
      !this.last
    )
      return;
    const last = this.last;
    this.pendingConnection = null;
    this.destinationEntry =
      last.pose ?? LOCATIONS[last.id].spawns.default ?? null;
    clearTimeout(this.timer);
    this.reset();
    this.set({
      phase: "unloading",
      active: null,
      target: last.id,
      entry: last.pose ?? LOCATIONS[last.id].spawns.default ?? null,
      token: this.state.token + 1,
      error: null,
      message: "Returning to the previous location…",
    });
  }
  menu() {
    clearTimeout(this.timer);
    this.reset();
    this.pendingConnection = null;
    this.set({
      phase: "menu",
      active: null,
      target: null,
      token: this.state.token + 1,
      error: null,
    });
  }
}
export const worldTravel = new TravelManager(async (id) => {
  switch (LOCATIONS[id].scene) {
    case "camp":
      return import("../Scene");
    case "railay":
      return import("../railay/IslandScene");
    case "tribal":
      return import("../tribal/TribalScene");
    default:
      throw Error("This location is planned, and has no scene yet.");
  }
});
