import records from "./contestants.json";
import { conversationCharacter } from "./reference/systems/ConversationCharacter.js";
import referenceMemory from "./reference/systems/SocialMemorySystem.js";
import type {
  Activity,
  CampContext,
  CampDecisionProvider,
  Dialogue,
  DialogueChoice,
  Intent,
  KnownObservation,
  PersonId,
  PhysicalReceipt,
  Place,
  SocialReadPort,
  Topic,
} from "./contracts.ts";

export const CONTESTANTS = records;
export const personName = (id: number) =>
  id === 0 ? "You" : (records.find((p) => p.id === id)?.firstName ?? "Someone");
export const ACTIVITY_LABEL: Record<Activity, string> = {
  observe: "Watching camp",
  rest: "Taking a breather",
  socialize: "Getting to know the tribe",
  private_chat: "Talking quietly",
  collect_water: "Collecting water",
  explore: "Exploring the trail",
  chores: "Helping around camp",
};
const UNKNOWN_SOCIAL: SocialReadPort = {
  trust: () => undefined,
  affinity: () => undefined,
};

/** TEMPORARY opportunity provider, NOT a replacement relationship/season engine.
 * Production identities, behavioral profiles and SocialMemory run unchanged.
 * No trust, alliances, votes, inventory or season clock are invented here.
 */
export class DemoCampProvider implements CampDecisionProvider {
  readonly mode = "demo" as const;
  readonly memory = new referenceMemory.constructor();
  private sequence = 0;
  constructor(
    private random = Math.random,
    private social = UNKNOWN_SOCIAL,
  ) {}

  decide(c: CampContext): Intent {
    const actor = records.find((p) => p.id === c.self.id)!;
    const p = conversationCharacter(actor);
    const recent = this.knowledge(actor.id).filter(
      (e) => c.now - e.campTime < 95,
    );
    const nearby = c.people.filter(
      (n) =>
        c.visibleIds.includes(n.id) &&
        n.id !== 0 &&
        !n.traveling &&
        n.available,
    );
    const candidates: (Intent & { weight: number })[] = [
      {
        activity: "observe",
        place: "campfire",
        duration: 22 + this.random() * 28,
        reason: "Read the room before getting involved",
        weight:
          0.25 +
          p.paranoiaDrive! * 0.5 +
          (p.style.includes("shadow") ? 2.1 : 0.1) +
          (c.self.place !== "campfire" && nearby.length === 0 ? 2.5 : 0),
      },
      {
        activity: "rest",
        place: "shelter",
        duration: 28 + this.random() * 25,
        reason: "A quiet moment in the shade",
        weight: 0.4,
      },
      {
        activity: "collect_water",
        place: "waterWell",
        duration: 16 + this.random() * 14,
        reason: "Bring water back to camp",
        weight: 0.12 + p.workDrive! * 0.4,
      },
      {
        activity: "chores",
        place: this.random() < 0.5 ? "shelter" : "campfire",
        duration: 20 + this.random() * 24,
        reason: "Make a useful contribution",
        weight: 0.15 + p.leadershipDrive! * p.workDrive! * 0.8,
      },
      {
        activity: "explore",
        place: this.random() < 0.5 ? "beach" : "jungleTrail",
        duration: 18 + this.random() * 20,
        reason: "Look around away from the group",
        weight:
          0.2 + p.strategyDrive! * 0.35 + (p.style.includes("wild") ? 0.65 : 0),
      },
    ];
    for (const n of nearby) {
      const interactions = recent.filter(
        (e) =>
          e.type === "seen_together" &&
          (e.actorId === n.id || e.participantIds.includes(n.id)),
      ).length;
      const trust = this.social.trust(actor.id, n.id),
        affinity = this.social.affinity(actor.id, n.id);
      const relevance =
        (trust === undefined ? 0.5 : trust / 100) + (affinity ?? 0);
      const privacyPreference =
        p.coverDrive! * 0.6 +
        p.pressureDrive! * 0.5 +
        (p.style.includes("wild") ? 0.25 : 0) +
        (p.style.includes("shadow") ? 0.15 : 0);
      const privateChat =
        n.groupId === null && this.random() < privacyPreference * 0.65;
      candidates.push({
        activity: privateChat ? "private_chat" : "socialize",
        place: n.place ?? "campfire",
        targetId: n.id,
        duration: 25 + this.random() * 24,
        reason: privateChat
          ? "Find a quieter opportunity to compare notes"
          : "Build a connection with someone available",
        weight:
          ((3 + p.socialDrive! * 3 + p.delegationDrive!) * relevance) /
          (1 + interactions * 3),
      });
    }
    for (const n of candidates)
      if (n.place === c.self.place && n.activity === c.self.activity)
        n.weight *= 0.15;
    let roll = this.random() * candidates.reduce((sum, n) => sum + n.weight, 0);
    const chosen =
      candidates.find((n) => (roll -= n.weight) <= 0) ?? candidates[0]!;
    const { weight: _weight, ...intent } = chosen;
    return intent;
  }
  wantsPlayer(c: CampContext) {
    if (!c.playerAvailable || !c.visibleIds.includes(0)) return false;
    const profile = conversationCharacter(
      records.find((p) => p.id === c.self.id)!,
    );
    return (
      this.random() <
      0.2 + profile.socialDrive! * 0.25 + profile.delegationDrive! * 0.15
    );
  }
  receive(r: PhysicalReceipt) {
    this.memory.recordCampObservation({
      id: r.id,
      actorId: r.actorId,
      participantIds: r.participantIds,
      witnessIds: r.witnessIds,
      type: r.type,
      location: r.place,
      fromLocation: r.fromPlace,
      day: 1,
      campTime: r.at,
      visibility: r.privacy === "private" ? "private" : "visible",
      detail:
        r.type === "seen_together"
          ? `${personName(r.actorId)} spent time with ${r.participantIds.map(personName).join(" and ")}.`
          : "",
    });
  }
  knowledge(ownerId: PersonId): KnownObservation[] {
    // Defensive projection: callers cannot rewrite production memory records.
    return this.memory
      .getCampObservations(ownerId)
      .map((k: KnownObservation) => ({
        ...k,
        participantIds: [...k.participantIds],
      }));
  }
  dialogue(
    id: PersonId,
    activity: Activity,
    topic?: Topic,
    subjectId?: PersonId,
    nearbyIds: PersonId[] = [],
  ): Dialogue {
    const p = conversationCharacter(records.find((p) => p.id === id)!);
    const name = personName(id),
      observations = this.knowledge(id);
    const shadow = p.style.includes("shadow"),
      charmer = p.style.includes("lethal"),
      power = p.style.includes("power");
    let line: string;
    if (!topic) {
      line = shadow
        ? "Come sit a minute. You learn plenty by listening around here."
        : charmer
          ? "There you are! We should actually get to know each other."
          : power
            ? "Good timing. We need everybody pulling together around camp."
            : "I was hoping to catch you. I want to know where your head is at.";
    } else if (topic === "activity") {
      line =
        activity === "collect_water"
          ? "Getting water. It gives me a little space to think, too."
          : activity === "private_chat"
            ? "Just comparing notes. I’ll let them speak for themselves."
            : `${ACTIVITY_LABEL[activity]}. ${shadow ? "I don’t need to be in the middle of every conversation." : power ? "People notice who shows up and helps." : charmer ? "It’s easier to talk when you’re doing something together." : "There’s always something happening if you pay attention."}`;
    } else if (topic === "person") {
      const seen = observations
        .filter(
          (e) =>
            e.actorId === subjectId || e.participantIds.includes(subjectId!),
        )
        .at(-1);
      line = seen
        ? `I saw ${personName(subjectId!)} ${seen.type === "seen_together" ? "spending time with other people" : seen.type === "arrived" ? "arrive" : seen.type === "departed" ? "head off" : "around camp"}. That tells me where they were, not what they’re planning.`
        : `I haven’t seen enough of ${personName(subjectId!)} to tell you anything useful. You should talk to them yourself.`;
    } else if (topic === "relationships") {
      const company = observations
        .filter(
          (e) =>
            e.type === "seen_together" &&
            (e.actorId === id || e.participantIds.includes(id)),
        )
        .at(-1);
      const other = company
        ? [company.actorId, ...company.participantIds].find((n) => n !== id)
        : undefined;
      line =
        other !== undefined
          ? `I’ve spent a little time with ${personName(other)}. ${shadow ? "That doesn’t mean I’m making promises." : charmer ? "I want to know people before I put my trust in them." : power ? "A conversation is a start. You still need to follow through." : "Talking doesn’t mean they’ve got my loyalty."}`
          : "I’m still getting a read on everybody. I’m not going to pretend I know where all the relationships stand.";
    } else if (topic === "cooperate") {
      line = shadow
        ? "Help each other out around camp? Sure. Anything bigger, we need more time."
        : charmer
          ? "I’m open to getting closer. Let’s spend some time together and see how we get along."
          : power
            ? "Start with the work. If we can rely on each other, we can keep talking."
            : "I’m interested in talking. I’m not handing out a promise before I know you, though.";
    } else {
      line = shadow
        ? "I’d rather keep my eyes open than tell everybody my business."
        : charmer
          ? `This place is beautiful. ${nearbyIds.length > 2 ? "And it’s getting crowded—maybe we can find a quieter moment later." : "A little breathing room makes it easier to talk."}`
          : power
            ? "There’s a lot to do here. I like having something useful to put my energy into."
            : "People get comfortable fast out here. I’m taking my time figuring them out.";
    }
    const choices: DialogueChoice[] = [
      { id: "casual", label: "How are you settling in?", topic: "casual" },
      { id: "activity", label: "What are you up to?", topic: "activity" },
      {
        id: "relationships",
        label: "How are you getting on with everyone?",
        topic: "relationships",
      },
      {
        id: "cooperate",
        label: "Could we help each other out?",
        topic: "cooperate",
      },
      ...records
        .filter((r) => r.id !== id)
        .map((r) => ({
          id: `person-${r.id}`,
          label: `What have you noticed about ${r.firstName}?`,
          topic: "person" as const,
          subjectId: r.id,
        })),
    ];
    return { line, choices };
  }
  exchange(
    actorId: PersonId,
    participantIds: PersonId[],
    dialogue: Dialogue,
    at: number,
    place: Place | null,
  ) {
    this.memory.recordConversationHistory({
      id: `3d:line:${++this.sequence}`,
      participantIds,
      speakerId: actorId,
      type: "camp_demo",
      topic: "camp",
      line: dialogue.line,
      day: 1,
      campTime: at,
      location: place,
      semantic: {
        source: "3d-demo",
        listenerIds: participantIds.filter((n) => n !== actorId),
      },
    });
  }
}
