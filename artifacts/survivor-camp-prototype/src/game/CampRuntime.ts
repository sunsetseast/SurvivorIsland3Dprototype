import {
  groundHeight,
  isWalkable,
  movePlayer,
  rng,
  SPAWN,
  type Point,
} from "./world.ts";
import { CampNavigation, clearSegment, distance } from "./navigation.ts";
import {
  CONTESTANTS,
  DemoCampProvider,
  personName,
} from "./simulation/DemoProvider.ts";
import { isCampPhysicallyPresent } from "./simulation/reference/locations/CampPresence.js";
import type {
  Activity,
  CampContext,
  CampDecisionProvider,
  Dialogue,
  DialogueChoice,
  Intent,
  PersonId,
  PhysicalPerson,
  PhysicalReceipt,
  Place,
} from "./simulation/contracts.ts";

export const SPOTS: Record<Place, Point[]> = {
  campfire: [
    { x: -9, z: -34.15 },
    { x: -6.5, z: -28.1 },
    { x: -11.3, z: -28.4 },
    { x: -2.6, z: -33.1 },
  ],
  shelter: [
    { x: 11, z: -43.1 },
    { x: 13.4, z: -44.1 },
    { x: 10.1, z: -46 },
  ],
  beach: [
    { x: -46.2, z: -26.6 },
    { x: -45, z: -29 },
    { x: -48, z: -24.5 },
  ],
  waterWell: [
    { x: -31.5, z: 8 },
    { x: -32, z: 11.6 },
    { x: -35.7, z: 6 },
  ],
  jungleTrail: [
    { x: 8, z: 15 },
    { x: 12.2, z: 8.5 },
    { x: -19, z: 17.7 },
  ],
};
export type NpcState = PhysicalPerson & {
  y: number;
  destination: Point | null;
  destinationPlace: Place | null;
  movement: "idle" | "walking" | "waiting" | "talking";
  animation: "idle" | "walk" | "talk" | "sit" | "work";
  facing: number;
  speed: number;
  distance: number;
  route: Point[];
  routeIndex: number;
  intent: Intent;
  until: number;
  decisionAt: number;
  approachCooldown: number;
  blockedFor: number;
  repathAt: number;
  travelId: string | null;
  fromPlace: Place | null;
  targetId: number | null;
  arrived: boolean;
  approach: "none" | "walking" | "offered";
};
export type CampGroup = {
  id: number;
  participantIds: number[];
  invitedIds: number[];
  privacy: "public" | "private";
  endsAt: number;
  anchor: Point;
  place: Place | null;
};
export type ConversationState = {
  actorId: number;
  dialogue: Dialogue;
  previousActivity: Activity;
  startedAt: number;
  turn: number;
};
export type CampUI = {
  nearbyId: number | null;
  incomingId: number | null;
  conversation: ConversationState | null;
  toast: string;
  mode: "demo" | "authoritative";
};
const idleIntent = (place: Place): Intent => ({
  activity: "observe",
  place,
  duration: 20,
  reason: "Watch camp",
});

/** Physical authority. There is no semantic alliance, relationship or vote state here. */
export class CampRuntime {
  readonly navigation: CampNavigation;
  readonly npcs: NpcState[];
  readonly groups: CampGroup[] = [];
  readonly receipts: PhysicalReceipt[] = [];
  readonly metrics = {
    updates: 0,
    totalMs: 0,
    maxMs: 0,
    replans: 0,
    failedRoutes: 0,
    arrivals: 0,
    decisions: 0,
    approaches: 0,
  };
  now = 0;
  player: Point & { y: number; moving: boolean } = {
    ...SPAWN,
    y: groundHeight(SPAWN.x, SPAWN.z),
    moving: false,
  };
  conversation: ConversationState | null = null;
  incomingId: number | null = null;
  private random: () => number;
  private sequence = 0;
  private groupSequence = 0;
  private globalApproachAt = 22;
  private uiAt = 0;
  private toastUntil = 0;
  private listeners = new Set<() => void>();
  private ui: CampUI = {
    nearbyId: null,
    incomingId: null,
    conversation: null,
    toast: "",
    mode: "demo",
  };

  constructor(
    readonly provider: CampDecisionProvider = new DemoCampProvider(),
    seed = 7141,
    nav?: CampNavigation,
  ) {
    this.navigation = nav ?? new CampNavigation();
    this.random = rng(seed);
    const initial: Record<
      number,
      { p: Point; activity: Activity; facing: number }
    > = {
      11: { p: SPOTS.campfire[0]!, activity: "rest", facing: 0 },
      13: { p: { x: -10.7, z: -27.5 }, activity: "socialize", facing: 1.4 },
      4: { p: { x: -8.7, z: -27.5 }, activity: "socialize", facing: -1.4 },
      18: { p: { x: -2, z: -29 }, activity: "observe", facing: -1.8 },
    };
    this.npcs = CONTESTANTS.map((c) => {
      const start = initial[c.id]!;
      return {
        id: c.id,
        ...start.p,
        y: groundHeight(start.p.x, start.p.z),
        place: "campfire",
        traveling: false,
        available: true,
        activity: start.activity,
        groupId: null,
        destination: null,
        destinationPlace: null,
        movement: "idle",
        animation: c.id === 11 ? "sit" : "idle",
        facing: start.facing,
        speed: 0,
        distance: 0,
        route: [],
        routeIndex: 0,
        intent: { ...idleIntent("campfire"), activity: start.activity },
        until: c.id === 11 ? 31 : c.id === 18 ? 8 : 23,
        decisionAt: 0,
        approachCooldown: 18 + this.random() * 30,
        blockedFor: 0,
        repathAt: 0,
        travelId: null,
        fromPlace: null,
        targetId: null,
        arrived: true,
        approach: "none",
      } satisfies NpcState;
    });
    // A starting social context, never replayed by the decision provider.
    this.formGroup(this.npc(4)!, this.npc(13)!, "public", 23);
    this.ui.mode = provider.mode;
  }
  npc = (id: number) => this.npcs.find((n) => n.id === id);
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.ui;
  private say(text: string) {
    this.ui = { ...this.ui, toast: text };
    this.toastUntil = this.now + 4;
  }
  private refreshUI() {
    this.ui = {
      nearbyId: this.nearestTalkable()?.id ?? null,
      incomingId: this.incomingId,
      conversation: this.conversation ? { ...this.conversation } : null,
      toast: this.now < this.toastUntil ? this.ui.toast : "",
      mode: this.provider.mode,
    };
    this.listeners.forEach((f) => f());
  }
  private available(n: NpcState) {
    const g = this.groups.find((g) => g.id === n.groupId);
    return (
      !n.traveling &&
      n.approach === "none" &&
      this.conversation?.actorId !== n.id &&
      (!g || (g.privacy === "public" && g.participantIds.length < 3))
    );
  }
  physical(n: NpcState): PhysicalPerson {
    return {
      id: n.id,
      x: n.x,
      z: n.z,
      place: n.place,
      traveling: n.traveling,
      activity: n.activity,
      groupId: n.groupId,
      available: this.available(n),
    };
  }
  /** Reuses production arrival/travel gating. A traveler occupies no endpoint. */
  present(id: PersonId, place: Place) {
    const n = this.npc(id);
    if (!n) return false;
    return isCampPhysicallyPresent(
      { id, campActivity: { type: n.traveling ? "travel" : n.activity } },
      { getLocation: () => n.place },
      place,
    );
  }
  private body(id: PersonId) {
    return id === 0 ? this.player : this.npc(id);
  }
  private sight(a: Point, b: Point, max = 11) {
    return (
      distance(a, b) <= max &&
      Math.abs(groundHeight(a.x, a.z) - groundHeight(b.x, b.z)) < 2.3 &&
      clearSegment(a, b)
    );
  }
  /** Geometry supplies possible witnesses. Private contents never go to witnesses. */
  audience(participantIds: PersonId[], privacy: "public" | "private") {
    const points = participantIds
      .map((id) => this.body(id))
      .filter((n): n is NonNullable<typeof n> => !!n);
    const observers: PersonId[] = [],
      hearing: PersonId[] = [];
    for (const n of [
      { id: 0, ...this.player, traveling: this.player.moving },
      ...this.npcs,
    ]) {
      if (participantIds.includes(n.id) || n.traveling) continue;
      if (points.some((p) => this.sight(n, p, 10))) observers.push(n.id);
      if (points.some((p) => this.sight(n, p, privacy === "private" ? 1.6 : 4)))
        hearing.push(n.id);
    }
    return {
      participantIds: [...participantIds],
      observerIds: observers,
      potentialHearingIds: hearing,
    };
  }
  private emit(
    n: NpcState,
    type: PhysicalReceipt["type"],
    participants: number[] = [],
    privacy: "public" | "private" = "public",
  ) {
    const r: PhysicalReceipt = {
      id: `3d:${++this.sequence}`,
      actorId: n.id,
      type,
      participantIds: participants,
      witnessIds: this.audience([n.id, ...participants], privacy).observerIds,
      place: type === "departed" ? n.destinationPlace : n.place,
      fromPlace: n.fromPlace,
      privacy,
      at: this.now,
    };
    this.provider.receive(r);
    this.receipts.push(r);
    if (this.receipts.length > 300) this.receipts.shift();
  }
  private context(n: NpcState): CampContext {
    const people = this.npcs.map((n) => this.physical(n));
    people.push({
      id: 0,
      ...this.player,
      place: null,
      traveling: this.player.moving,
      available: !this.conversation && !this.incomingId,
      activity: "observe",
      groupId: null,
    });
    return {
      now: this.now,
      self: this.physical(n),
      people,
      visibleIds: people
        .filter((p) => p.id !== n.id && this.sight(n, p))
        .map((p) => p.id),
      playerAvailable:
        !this.player.moving &&
        !this.conversation &&
        this.incomingId === null &&
        this.now >= this.globalApproachAt,
    };
  }
  private leaveGroup(n: NpcState) {
    const g = this.groups.find((g) => g.id === n.groupId);
    n.groupId = null;
    if (!g) return;
    g.participantIds = g.participantIds.filter((id) => id !== n.id);
    g.invitedIds = g.invitedIds.filter((id) => id !== n.id);
    if (g.participantIds.length < 2 && !g.invitedIds.length) this.endGroup(g);
  }
  private endGroup(g: CampGroup) {
    for (const id of [...g.participantIds, ...g.invitedIds]) {
      const n = this.npc(id);
      if (!n || n.groupId !== g.id) continue;
      n.groupId = null;
      n.targetId = null;
      if (!n.traveling) {
        n.movement = "idle";
        n.animation = "idle";
        n.until = this.now + 2 + this.random() * 8;
      }
    }
    const i = this.groups.indexOf(g);
    if (i >= 0) this.groups.splice(i, 1);
  }
  private formGroup(
    a: NpcState,
    b: NpcState,
    privacy: "public" | "private",
    duration: number,
  ) {
    if (
      a.traveling ||
      b.traveling ||
      distance(a, b) > 2.8 ||
      !this.sight(a, b, 2.8)
    )
      return false;
    const existing = this.groups.find(
      (g) =>
        g.id === b.groupId &&
        g.privacy === "public" &&
        g.participantIds.length < 3,
    );
    this.leaveGroup(a);
    const g = existing ?? {
      id: ++this.groupSequence,
      participantIds: [b.id],
      invitedIds: [],
      privacy,
      endsAt: this.now + duration,
      anchor: { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 },
      place: b.place,
    };
    if (!existing) {
      this.leaveGroup(b);
      this.groups.push(g);
    }
    if (!g.participantIds.includes(a.id)) g.participantIds.push(a.id);
    for (const id of g.participantIds) {
      const n = this.npc(id)!;
      n.groupId = g.id;
      n.targetId = g.participantIds.find((p) => p !== id) ?? null;
      n.movement = "talking";
      n.animation = "talk";
      n.activity = g.privacy === "private" ? "private_chat" : "socialize";
      n.until = this.now + duration * (0.7 + this.random() * 0.3);
    }
    this.emit(
      a,
      "seen_together",
      g.participantIds.filter((id) => id !== a.id),
      g.privacy,
    );
    // NPC exchanges remain participant-owned. No transcript is sent to observers.
    this.provider.exchange(
      a.id,
      g.participantIds,
      this.provider.dialogue(a.id, a.activity, "casual"),
      this.now,
      a.place,
    );
    return true;
  }
  private freeSpot(place: Place, n: NpcState): Point | null {
    const spots = [...SPOTS[place]];
    for (let i = spots.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [spots[i], spots[j]] = [spots[j]!, spots[i]!];
    }
    return (
      spots.find(
        (p) =>
          this.npcs.every(
            (o) => o.id === n.id || distance(o.destination ?? o, p) > 0.95,
          ) && this.navigation.route(n, p),
      ) ?? null
    );
  }
  /** Public for adapters/tests: issuing an intent never moves the physical body. */
  request(n: NpcState, intent: Intent): boolean {
    let goal: Point | null;
    const target =
      intent.targetId === undefined ? null : this.npc(intent.targetId);
    if (target) {
      if (!this.available(target) || !this.sight(n, target)) return false;
      goal = this.navigation.standNear(
        target,
        n,
        target.groupId ? 2 : 1.75,
        this.npcs
          .filter((o) => o.id !== n.id && o.id !== target.id)
          .map((o) => ({ ...o, radius: 0.9 })),
      );
    } else goal = this.freeSpot(intent.place, n);
    if (!goal) return false;
    const route = this.navigation.route(n, goal);
    if (!route) {
      this.metrics.failedRoutes++;
      return false;
    }
    this.leaveGroup(n);
    n.intent = { ...intent };
    n.targetId = target?.id ?? null;
    // Someone visibly walking over creates a short opportunity window. This
    // reserves no semantic membership and never counts the traveler as present.
    if (target && !target.groupId)
      target.until = Math.max(
        target.until,
        this.now + distance(n, target) / 1.2 + 5,
      );
    return this.startTravel(n, goal, intent.place, route);
  }
  private startTravel(
    n: NpcState,
    goal: Point,
    place: Place | null,
    route?: Point[],
  ) {
    const path = route ?? this.navigation.route(n, goal);
    if (!path) return false;
    n.fromPlace = n.place;
    n.destination = { ...goal };
    n.destinationPlace = place;
    n.route = path;
    n.routeIndex = 0;
    n.travelId = `trip:${++this.sequence}`;
    n.traveling = true;
    n.arrived = false;
    n.place = null;
    n.movement = "walking";
    n.animation = "walk";
    n.blockedFor = 0;
    n.repathAt = this.now + 1;
    this.emit(n, "departed");
    return true;
  }
  private arrive(n: NpcState) {
    n.traveling = false;
    n.arrived = true;
    n.place = n.destinationPlace;
    n.destination = null;
    n.destinationPlace = null;
    n.route = [];
    n.speed = 0;
    n.movement = "idle";
    n.activity = n.intent.activity;
    n.animation =
      n.activity === "rest" &&
      n.place === "campfire" &&
      distance(n, SPOTS.campfire[0]!) < 0.4
        ? "sit"
        : ["collect_water", "chores"].includes(n.activity)
          ? "work"
          : "idle";
    n.until = this.now + n.intent.duration;
    this.metrics.arrivals++;
    this.emit(n, "arrived");
    n.travelId = null;
    if (n.approach === "walking") {
      if (
        !this.player.moving &&
        this.sight(n, this.player, 2.5) &&
        this.incomingId === null &&
        !this.conversation
      ) {
        n.approach = "offered";
        n.until = this.now + 12;
        this.incomingId = n.id;
        n.facing = Math.atan2(this.player.x - n.x, this.player.z - n.z);
        this.emit(n, "approached", [0]);
        this.say(`${personName(n.id)} would like a word.`);
      } else this.cancelApproach(n);
      return;
    }
    if (n.targetId !== null) {
      const target = this.npc(n.targetId);
      if (
        target &&
        this.available(target) &&
        this.formGroup(
          n,
          target,
          n.intent.activity === "private_chat" ? "private" : "public",
          n.intent.duration,
        )
      )
        return;
      n.targetId = null;
      n.activity = "observe";
      n.animation = "idle";
      n.until = this.now + 6;
    }
    if (n.animation === "work") this.emit(n, "work");
  }
  private move(n: NpcState, dt: number) {
    let target = n.route[n.routeIndex];
    while (target && distance(n, target) < 0.09)
      target = n.route[++n.routeIndex];
    if (!target) {
      this.arrive(n);
      return;
    }
    const d = distance(n, target),
      speed = n.id === 11 ? 1.25 : n.id === 18 ? 1.65 : 1.5;
    const step = Math.min(d, speed * dt),
      dx = ((target.x - n.x) / d) * step,
      dz = ((target.z - n.z) / d) * step;
    const next = movePlayer(n, dx, dz);
    const blockers = [{ id: 0, ...this.player }, ...this.npcs].filter(
      (o) => o.id !== n.id && distance(next, o) < 0.78,
    );
    const moved = blockers.length ? 0 : distance(n, next);
    n.speed = moved / dt;
    if (moved > 0.001) {
      n.x = next.x;
      n.z = next.z;
      n.y = groundHeight(n.x, n.z);
      n.distance += moved;
      n.blockedFor = 0;
      n.facing +=
        Math.atan2(
          Math.sin(Math.atan2(dx, dz) - n.facing),
          Math.cos(Math.atan2(dx, dz) - n.facing),
        ) *
        (1 - Math.exp(-dt * 8));
      n.movement = "walking";
      n.animation = "walk";
    } else {
      n.blockedFor += dt;
      n.movement = "waiting";
      n.animation = "idle";
    }
    if (n.blockedFor > 0.9 && this.now >= n.repathAt && n.destination) {
      const avoid = [{ id: 0, ...this.player }, ...this.npcs]
        .filter((o) => o.id !== n.id && distance(n, o) < 5)
        .map((o) => ({
          x: o.x,
          z: o.z,
          radius: Math.min(0.92, distance(n, o) - 0.015),
        }));
      const route = this.navigation.route(n, n.destination, avoid);
      n.repathAt = this.now + 2 + this.random();
      this.metrics.replans++;
      if (route) {
        n.route = route;
        n.routeIndex = 0;
        n.blockedFor = 0;
      } else if (n.blockedFor > 6) this.interrupt(n);
    }
  }
  interrupt(n: NpcState) {
    this.leaveGroup(n);
    n.traveling = false;
    n.place = null;
    n.destination = null;
    n.destinationPlace = null;
    n.route = [];
    n.speed = 0;
    n.movement = "idle";
    n.animation = "idle";
    n.targetId = null;
    n.travelId = null;
    n.until = this.now + 2 + this.random() * 3;
    // No arrival receipt for a canceled trip. Physical coordinates never change.
    if (n.approach !== "none") this.cancelApproach(n);
  }
  private cancelApproach(n: NpcState) {
    if (this.incomingId === n.id) this.incomingId = null;
    n.approach = "none";
    n.approachCooldown = this.now + 90;
    this.globalApproachAt = this.now + 35;
    if (n.traveling) {
      n.traveling = false;
      n.place = null;
      n.route = [];
      n.destination = null;
      n.destinationPlace = null;
      n.travelId = null;
    }
    n.speed = 0;
    n.animation = "idle";
    n.movement = "idle";
    n.until = this.now + 3;
  }
  startApproach(id: number): boolean {
    const n = this.npc(id);
    if (
      !n ||
      !this.available(n) ||
      this.conversation ||
      this.incomingId !== null ||
      this.npcs.some((o) => o.approach !== "none") ||
      !this.sight(n, this.player)
    )
      return false;
    const goal = this.navigation.standNear(this.player, n);
    if (!goal) return false;
    this.leaveGroup(n);
    n.intent = idleIntent(n.place ?? "campfire");
    n.targetId = 0;
    if (!this.startTravel(n, goal, null)) return false;
    n.approach = "walking";
    n.until = this.now + 20;
    n.approachCooldown = this.now + 95;
    this.globalApproachAt = this.now + 55;
    this.metrics.approaches++;
    return true;
  }
  declineApproach() {
    const n = this.incomingId !== null ? this.npc(this.incomingId) : null;
    if (n) {
      this.cancelApproach(n);
      this.say(`${personName(n.id)} gives you some space.`);
      this.refreshUI();
    }
  }
  canTalk(n: NpcState) {
    return (
      !n.traveling &&
      this.sight(n, this.player, 2.65) &&
      Math.abs(n.y - this.player.y) < 0.65
    );
  }
  nearestTalkable() {
    if (this.conversation) return null;
    return (
      this.npcs
        .filter((n) => this.canTalk(n))
        .sort(
          (a, b) => distance(a, this.player) - distance(b, this.player),
        )[0] ?? null
    );
  }
  talk(id: PersonId) {
    const n = this.npc(id);
    if (!n || !this.canTalk(n) || this.conversation) return false;
    const previousActivity = n.activity;
    this.leaveGroup(n);
    const approaching = this.npcs.find((o) => o.approach !== "none");
    if (approaching) this.cancelApproach(approaching);
    n.approachCooldown = this.now + 110;
    this.globalApproachAt = this.now + 50;
    n.movement = "talking";
    n.animation = "talk";
    n.speed = 0;
    this.conversation = {
      actorId: id,
      previousActivity,
      dialogue: this.provider.dialogue(id, previousActivity),
      startedAt: this.now,
      turn: 0,
    };
    this.emit(n, "seen_together", [0], "private");
    this.provider.exchange(
      id,
      [0, id],
      this.conversation.dialogue,
      this.now,
      n.place,
    );
    this.refreshUI();
    return true;
  }
  choose(id: string) {
    const c = this.conversation;
    if (!c) return false;
    const choice: DialogueChoice | undefined = c.dialogue.choices.find(
      (o) => o.id === id,
    );
    if (!choice) return false;
    c.dialogue = this.provider.dialogue(
      c.actorId,
      c.previousActivity,
      choice.topic,
      choice.subjectId,
      this.audience([0, c.actorId], "private").observerIds,
    );
    c.turn++;
    this.provider.exchange(
      c.actorId,
      [0, c.actorId],
      c.dialogue,
      this.now,
      this.npc(c.actorId)?.place ?? null,
    );
    this.refreshUI();
    return true;
  }
  endConversation() {
    const c = this.conversation;
    if (!c) return;
    const n = this.npc(c.actorId)!;
    n.movement = "idle";
    n.animation =
      c.previousActivity === "rest" &&
      n.place === "campfire" &&
      distance(n, SPOTS.campfire[0]!) < 0.4
        ? "sit"
        : ["chores", "collect_water"].includes(c.previousActivity)
          ? "work"
          : "idle";
    n.until = this.now + 4 + this.random() * 4;
    n.targetId = null;
    this.conversation = null;
    this.refreshUI();
  }
  step(rawDt: number, player = this.player) {
    if (!Number.isFinite(rawDt) || rawDt <= 0) return;
    const start = performance.now(),
      dt = Math.min(rawDt, 0.05);
    this.now += dt;
    this.player = { ...player };
    for (const g of [...this.groups])
      if (this.now >= g.endsAt) this.endGroup(g);
    for (const n of this.npcs) {
      if (this.conversation?.actorId === n.id) {
        if (distance(n, this.player) > 3.3) {
          this.endConversation();
          continue;
        }
        const face = Math.atan2(this.player.x - n.x, this.player.z - n.z);
        n.facing +=
          Math.atan2(Math.sin(face - n.facing), Math.cos(face - n.facing)) *
          (1 - Math.exp(-dt * 6));
        continue;
      }
      if (n.approach !== "none") {
        if (
          this.now > n.until ||
          !this.sight(n, this.player, 12) ||
          (this.player.moving && n.approach === "offered")
        ) {
          this.cancelApproach(n);
          continue;
        }
        if (
          n.approach === "walking" &&
          n.destination &&
          distance(n.destination, this.player) > 3.5 &&
          this.now > n.repathAt
        ) {
          const goal = this.navigation.standNear(this.player, n);
          if (goal) {
            n.route = this.navigation.route(n, goal) ?? n.route;
            n.routeIndex = 0;
            n.destination = goal;
          }
          n.repathAt = this.now + 2;
        }
      }
      if (n.traveling) {
        this.move(n, dt);
        continue;
      }
      if (n.approach === "offered") continue;
      if (n.groupId !== null) {
        const g = this.groups.find((g) => g.id === n.groupId);
        if (g) {
          if (this.now >= n.until) {
            this.leaveGroup(n);
            n.animation = "idle";
            n.movement = "idle";
            n.until = this.now + 2 + this.random() * 4;
            continue;
          }
          const face = Math.atan2(g.anchor.x - n.x, g.anchor.z - n.z);
          n.facing +=
            Math.atan2(Math.sin(face - n.facing), Math.cos(face - n.facing)) *
            (1 - Math.exp(-dt * 5));
          continue;
        }
      }
      if (this.now < n.until || this.now < n.decisionAt) continue;
      n.decisionAt = this.now + 4 + this.random() * 4;
      const context = this.context(n);
      if (
        this.now >= n.approachCooldown &&
        this.provider.wantsPlayer(context) &&
        this.startApproach(n.id)
      )
        continue;
      this.metrics.decisions++;
      const intent = this.provider.decide(context);
      if (!this.request(n, intent)) n.until = this.now + 4 + this.random() * 6;
    }
    if (this.now >= this.uiAt) {
      this.uiAt = this.now + 0.12;
      this.refreshUI();
    }
    const cost = performance.now() - start;
    this.metrics.updates++;
    this.metrics.totalMs += cost;
    this.metrics.maxMs = Math.max(this.metrics.maxMs, cost);
  }
}

export const camp = new CampRuntime();
