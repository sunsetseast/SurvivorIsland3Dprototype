import { worldTravel } from "../locations/travel";
import { challengeRehearsalEnabled } from "./development";
import { isChallengeId, type ChallengeId } from "./configurations";
export const PREVIEW_EVENT="survivor-challenge-preview";
export const SELECTED_EVENT="survivor-challenge-selected";
export function rehearsalActive() {
  return !worldTravel.blocked && worldTravel.session.locationId==="challenge_main" &&
    (!!worldTravel.challengeTesting || (challengeRehearsalEnabled() && !!worldTravel.session.returnTo && !!worldTravel.session.instance.eventId?.startsWith("rehearsal:")));
}
export function requestPreview(id:ChallengeId) {
  if(!isChallengeId(id)||!rehearsalActive())return false;
  if(worldTravel.challengeTesting && id!==worldTravel.challengeTesting.configuration)return false;
  window.dispatchEvent(new CustomEvent(PREVIEW_EVENT,{detail:id}));return true;
}
