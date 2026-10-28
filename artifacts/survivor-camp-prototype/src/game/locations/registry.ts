/** One map, independent scene spaces. +X east, +Z south, metres; coastline is unchanged. */
import { ANCHORS, ZONES, type P } from "../railay/geography";
export type LocationId =
  | "camp_tribe_a"
  | "camp_tribe_b"
  | "camp_tribe_c"
  | "railay_trails"
  | "challenge_main"
  | "tribal_council"
  | "journey_destination_1";
export type SceneId = "camp" | "railay" | "tribal";
export type LocationCategory =
  "camp" | "journey" | "challenge" | "council" | "event";
export type Pose = P & { facing: number; yaw: number };
export type InstanceId = string;
export type LocationInstance = {
  id: InstanceId;
  locationId: LocationId;
  seasonId: string;
  eventId?: string;
  tribeId?: string;
};
export type Participant = {
  id: string;
  tribeId: string;
  instanceId: InstanceId;
};
export type LocationDefinition = {
  id: LocationId;
  name: string;
  category: LocationCategory;
  anchor: P;
  scene: SceneId | null;
  status: "playable" | "planned";
  /** Compact scenes are artistic local spaces. This rigid transform is a map association, not shared collision terrain. */
  space: { origin: P; rotation: number };
  spawns: Record<string, Pose>;
  connections: string[];
  quality: { mobileDpr: number; shadows: boolean };
  instanceScope: "tribe" | "event" | "journey";
  tribeId?: string;
  restrictions?: string[];
};
const pose = (x: number, z: number, facing: number): Pose => ({
  x,
  z,
  facing,
  yaw: facing - Math.PI,
});
const campAnchor = ZONES[0].spawn;
// The compact camp's south-facing jungle path corresponds to the eastbound Tonsai trail.
const trailEntry = { x: campAnchor.x + 50, z: campAnchor.z };
const planned = (
  id: LocationId,
  name: string,
  category: LocationCategory,
  anchor: P,
  scope: LocationDefinition["instanceScope"],
): LocationDefinition => ({
  id,
  name,
  category,
  anchor,
  scene: null,
  status: "planned",
  space: { origin: anchor, rotation: 0 },
  spawns: {},
  connections: [],
  quality: { mobileDpr: 1, shadows: false },
  instanceScope: scope,
});
export const LOCATIONS: Record<LocationId, LocationDefinition> = {
  camp_tribe_a: {
    id: "camp_tribe_a",
    name: "Tonsai Tribe Camp",
    category: "camp",
    anchor: campAnchor,
    scene: "camp",
    status: "playable",
    space: {
      origin: { x: campAnchor.x + 24, z: campAnchor.z - 6 },
      rotation: -Math.PI / 2,
    },
    spawns: {
      default: { ...pose(-6, -24, Math.PI), yaw: -0.48 },
      trail_return: pose(-1, 22, Math.atan2(9, -7)),
    },
    connections: ["camp_to_trail"],
    quality: { mobileDpr: 1.5, shadows: true },
    instanceScope: "tribe",
    tribeId: "tonsai",
  },
  camp_tribe_b: {
    ...planned(
      "camp_tribe_b",
      "South Cove Tribe Camp",
      "camp",
      ANCHORS.tribeSouth,
      "tribe",
    ),
    tribeId: "south",
    restrictions: ["assigned-tribe-or-visit-event"],
  },
  camp_tribe_c: {
    ...planned(
      "camp_tribe_c",
      "East Mangrove Tribe Camp",
      "camp",
      ZONES[2].spawn,
      "tribe",
    ),
    tribeId: "east",
    restrictions: ["assigned-tribe-or-visit-event"],
  },
  railay_trails: {
    id: "railay_trails",
    name: "Tonsai Jungle Journey",
    category: "journey",
    anchor: campAnchor,
    scene: "railay",
    status: "playable",
    space: { origin: { x: 0, z: 0 }, rotation: 0 },
    spawns: {
      default: pose(ZONES[1].spawn.x, ZONES[1].spawn.z, Math.PI - 1.35),
      tonsai_entry: pose(trailEntry.x, trailEntry.z, Math.atan2(-22, -78)),
    },
    connections: ["trail_to_camp"],
    quality: { mobileDpr: 1.5, shadows: false },
    instanceScope: "journey",
    restrictions: ["journey-event"],
  },
  challenge_main: planned(
    "challenge_main",
    "West Beach Challenge",
    "challenge",
    ANCHORS.challengeWest,
    "event",
  ),
  tribal_council: {
    ...planned(
      "tribal_council",
      "Island Sanctuary",
      "council",
      ANCHORS.councilAccess,
      "event",
    ),
    scene: "tribal",
    status: "playable",
    quality: { mobileDpr: 1.5, shadows: true },
    restrictions: ["council-event"],
  },
  journey_destination_1: planned(
    "journey_destination_1",
    "Northern Journey Clearing",
    "event",
    ANCHORS.journey,
    "journey",
  ),
};
export type Connection = {
  id: string;
  source: LocationId;
  exit: Pose;
  radius: number;
  destination: LocationId;
  spawn: string;
  permission: "journey" | "return";
  presentation: string;
};
export const CONNECTIONS: Record<string, Connection> = {
  camp_to_trail: {
    id: "camp_to_trail",
    source: "camp_tribe_a",
    exit: pose(-6, 26, 0),
    radius: 3.2,
    destination: "railay_trails",
    spawn: "tonsai_entry",
    permission: "journey",
    presentation: "Following the Tonsai jungle trail…",
  },
  trail_to_camp: {
    id: "trail_to_camp",
    source: "railay_trails",
    exit: pose(trailEntry.x - 5, trailEntry.z, -Math.PI / 2),
    radius: 4,
    destination: "camp_tribe_a",
    spawn: "trail_return",
    permission: "return",
    presentation: "Returning through the palms…",
  },
};
export function localToGeographic(id: LocationId, p: P): P {
  const { origin, rotation: r } = LOCATIONS[id].space;
  return {
    x: origin.x + p.x * Math.cos(r) - p.z * Math.sin(r),
    z: origin.z + p.x * Math.sin(r) + p.z * Math.cos(r),
  };
}
export function geographicToLocal(id: LocationId, p: P): P {
  const { origin, rotation: r } = LOCATIONS[id].space,
    x = p.x - origin.x,
    z = p.z - origin.z;
  return {
    x: x * Math.cos(r) + z * Math.sin(r),
    z: -x * Math.sin(r) + z * Math.cos(r),
  };
}
export const localInstance = (id: LocationId): LocationInstance => ({
  id: `local-season:${id}:${LOCATIONS[id].tribeId ?? "prototype"}`,
  locationId: id,
  seasonId: "local-season",
  ...(LOCATIONS[id].tribeId ? { tribeId: LOCATIONS[id].tribeId } : {}),
});
