import { castMember } from "../character/cast";
import { loadLocalSurvivor } from "../character/selectionSave";
import { challengeRehearsalEnabled, challengeTestingEnabled } from "../challenge/development";
import { CONFIGURATIONS, isChallengeId, validateSetup, type ChallengeId } from "../challenge/configurations";
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
  scope?: "challenge-rehearsal";
};
export type WorldSession = {
  version: 1;
  participant: Participant;
  locationId: LocationId;
  instance: LocationInstance;
  poses: Partial<Record<LocationId, Pose>>;
  permissions: TravelPermission[];
  returnTo?: { locationId: LocationId; instance: LocationInstance; pose?: Pose };
};
/** No invented season/inventory/relationship data. CampRuntime + its provider own existing gameplay data. */
export function createSession(survivorId: number | null = null): WorldSession {
  const instance = localInstance("camp_tribe_a");
  const identity = castMember(survivorId)?.source.id;
  return {
    version: 1,
    participant: {
      id: "local-player",
      ...(identity !== undefined ? { survivorId: identity } : {}),
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
export type ChallengeTestingRequest = Readonly<{ configuration:ChallengeId; play:boolean; eventId:string; instanceId:string }>;
export class TravelManager {
  private normalSession: WorldSession;
  private testing: { request:ChallengeTestingRequest; session:WorldSession } | null = null;
  /** Keep the normal session untouched while the same scene host runs a temporary rehearsal. */
  get session() { return this.testing?.session ?? this.normalSession; }
  get challengeTesting(): ChallengeTestingRequest | null {
    const t=this.testing;
    return t && this.allowChallengeTesting() && t.session.locationId==="challenge_main" &&
      t.session.instance.eventId===t.request.eventId && t.session.instance.id===t.request.instanceId &&
      t.session.participant.instanceId===t.request.instanceId ? t.request : null;
  }
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
  private rehearsalSerial = 0;
  constructor(
    private load: Load,
    private reset = clearInput,
    private fadeMs = 280,
    private allowChallengeRehearsal: () => boolean = () => false,
    private allowChallengeTesting: () => boolean = () => false,
    savedSurvivorId: number | null = null,
  ) {
    this.normalSession = createSession(savedSurvivorId);
  }
  beginSurvivorSession(survivorId: number): boolean {
    if (this.state.phase !== "menu" || this.testing || !castMember(survivorId)) return false;
    this.normalSession = createSession(survivorId);
    this.last = null;
    return true;
  }
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
  /** Explicit dev-only adapter, not a grant, production route, or second scene/runtime. */
  enterChallengeTesting(id: unknown): boolean {
    if(!this.allowChallengeTesting() || this.state.phase!=="menu" || this.testing || !isChallengeId(id))return false;
    const configuration=CONFIGURATIONS[id],setup=validateSetup(configuration.build());
    const eventId=`testing-rehearsal:${++this.rehearsalSerial}`;
    const instance:LocationInstance={id:`${this.normalSession.instance.seasonId}:challenge_main:${eventId}`,locationId:"challenge_main",seasonId:this.normalSession.instance.seasonId,eventId};
    this.testing={request:Object.freeze({configuration:id,play:configuration.playable,eventId,instanceId:instance.id}),session:{version:1,participant:{...this.normalSession.participant,instanceId:instance.id},locationId:"challenge_main",instance,poses:{},permissions:[]}};
    this.pendingConnection=null;
    this.start("challenge_main",configuration.playable?setup.starts[0]??setup.view:setup.view);
    return true;
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
  grantChallengeRehearsal() {
    if (!this.allowChallengeRehearsal() || this.session.locationId !== "camp_tribe_a" || this.blocked || this.session.returnTo) return false;
    this.session.permissions = [{ participantId: this.session.participant.id, connectionId: "camp_to_challenge",
      originInstanceId: this.session.instance.id, eventId: `rehearsal:${++this.rehearsalSerial}`, scope: "challenge-rehearsal" }];
    this.set({});
    return true;
  }
  permission(id: string): string | null {
    if(this.testing)return "Leave this isolated rehearsal using Challenge Hub or Welcome screen.";
    const c = CONNECTIONS[id];
    if (!c || c.source !== this.session.locationId)
      return "This route is not available here.";
    if (c.permission === "return")
      return this.session.returnTo?.locationId === c.destination
        ? null
        : "No return journey is active.";
    if (c.permission === "challenge-rehearsal" && !this.allowChallengeRehearsal()) return "Challenge rehearsal is disabled in this build.";
    return this.session.permissions.some(
      (p) =>
        p.participantId === this.session.participant.id &&
        p.connectionId === id &&
        p.originInstanceId === this.session.instance.id &&
        (c.permission !== "challenge-rehearsal" || (p.scope === "challenge-rehearsal" && /^rehearsal:\d+$/.test(p.eventId))),
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
    const entry = id === "challenge_to_camp" ? this.session.returnTo?.pose : undefined;
    this.start(c.destination, entry ?? LOCATIONS[c.destination].spawns[c.spawn]!);
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
    // A direct menu/rehearsal request is never challenge admission. Only a previously admitted rehearsal may resume.
    if (id === "challenge_main" && (!this.allowChallengeRehearsal() || this.session.locationId !== id || !this.session.returnTo || !this.session.instance.eventId?.startsWith("rehearsal:"))) return false;
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
    if(this.testing && !this.challengeTesting){this.fail(token,"Challenge testing is not authorized in this build/session.");return;}
    const c = this.pendingConnection
      ? CONNECTIONS[this.pendingConnection]
      : null;
    let instance = id === this.last?.id ? this.last.instance : localInstance(id);
    if (c && this.permission(c.id)) { this.fail(token, this.permission(c.id)!); return; }
    if (c?.permission === "journey" || c?.permission === "challenge-rehearsal") {
      this.session.returnTo = {
        locationId: this.last!.id,
        instance: this.last!.instance,
        ...(this.last!.pose ? { pose: { ...this.last!.pose } } : {}),
      };
      if (c.permission === "challenge-rehearsal") {
        const grant = this.session.permissions.find(p => p.connectionId === c.id)!;
        instance = { id: `${this.last!.instance.seasonId}:challenge_main:${grant.eventId}`, locationId: id, seasonId: this.last!.instance.seasonId, eventId: grant.eventId };
      }
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
    if(this.testing){this.menu();return;}
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
    this.testing = null;
    this.destinationEntry = null;
    this.set({
      phase: "menu",
      active: null,
      target: null,
      token: this.state.token + 1,
      error: null,
      entry: null,
    });
  }
}
export const worldTravel = new TravelManager(async (id) => {
  switch (LOCATIONS[id].scene) {
    case "camp":
      return import("../Scene");
    case "railay":
      return import("../railay/IslandScene");
    case "challenge":
      return import("../challenge/ChallengeScene");
    case "tribal":
      return import("../tribal/TribalScene");
    default:
      throw Error("This location is planned, and has no scene yet.");
  }
}, clearInput, 280, challengeRehearsalEnabled, challengeTestingEnabled, loadLocalSurvivor());

