import type { Point } from "../world.ts";

export type PersonId = number;
export type Place =
  "campfire" | "shelter" | "beach" | "waterWell" | "jungleTrail";
export type Activity =
  | "observe"
  | "rest"
  | "socialize"
  | "private_chat"
  | "collect_water"
  | "explore"
  | "chores";
export type Intent = {
  activity: Activity;
  place: Place;
  duration: number;
  targetId?: PersonId;
  reason: string;
};
export type PhysicalPerson = Point & {
  id: PersonId;
  place: Place | null;
  traveling: boolean;
  available: boolean;
  activity: Activity;
  groupId: number | null;
};
export type CampContext = {
  now: number;
  self: PhysicalPerson;
  people: PhysicalPerson[];
  visibleIds: PersonId[];
  playerAvailable: boolean;
};
export type PhysicalReceipt = {
  id: string;
  type: "departed" | "arrived" | "seen_together" | "work" | "approached";
  actorId: PersonId;
  participantIds: PersonId[];
  witnessIds: PersonId[];
  place: Place | null;
  fromPlace?: Place | null;
  privacy: "public" | "private";
  at: number;
};
export type Topic =
  "casual" | "activity" | "person" | "relationships" | "cooperate";
export type DialogueChoice = {
  id: string;
  label: string;
  topic: Topic;
  subjectId?: PersonId;
};
export type Dialogue = { line: string; choices: DialogueChoice[] };
export type KnownObservation = {
  id: string;
  actorId: PersonId;
  participantIds: PersonId[];
  type: string;
  location: string;
  visibility: string;
  detail: string;
  origin: string;
  campTime: number;
};
/** The only simulation-facing boundary. A future engine owns all semantic effects. */
export interface CampDecisionProvider {
  readonly mode: "demo" | "authoritative";
  decide(context: CampContext): Intent;
  wantsPlayer(context: CampContext): boolean;
  receive(receipt: PhysicalReceipt): void;
  knowledge(ownerId: PersonId): KnownObservation[];
  dialogue(
    actorId: PersonId,
    activity: Activity,
    topic?: Topic,
    subjectId?: PersonId,
    nearbyIds?: PersonId[],
  ): Dialogue;
  exchange(
    actorId: PersonId,
    participantIds: PersonId[],
    dialogue: Dialogue,
    at: number,
    place: Place | null,
  ): void;
}
/** Optional authoritative read services. Unknown is kept unknown. Never mirrored in React. */
export type SocialReadPort = {
  trust(from: PersonId, to: PersonId): number | undefined;
  affinity(from: PersonId, to: PersonId): number | undefined;
};
