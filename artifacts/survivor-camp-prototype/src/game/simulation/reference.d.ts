declare module "*/reference/systems/CampBehaviorProfile.js" {
  export function getCampBehaviorProfile(p: object): Record<string, number>;
}
declare module "*/reference/systems/ConversationCharacter.js" {
  export function conversationCharacter(
    p: object,
  ): Record<string, number> & { style: string };
}
declare module "*/reference/locations/CampPresence.js" {
  export function isCampPhysicallyPresent(
    p: object,
    locations: object,
    place: string,
    gm?: object,
  ): boolean;
}
declare module "*/reference/systems/SocialMemorySystem.js" {
  const memory: {
    constructor: new () => typeof memory;
    recordCampObservation(event: object): string[];
    recordConversationHistory(event: object): void;
    getCampObservations(
      owner: number,
    ): import("./contracts").KnownObservation[];
    serialize(): object;
    deserialize(payload: object): void;
  };
  export default memory;
}
