import migratedSurfaces from "./candidate-surfaces.json";
import { baseHeight } from "../world";
import { NATURAL_LANDMARKS, SPRING } from "./geography";
export type HidingCategory =
  | "buttress-root"
  | "root-pocket"
  | "hollow-log"
  | "rock-crevice"
  | "cave-recess"
  | "overhang"
  | "hollow-stump"
  | "fallen-branch"
  | "behind-boulder"
  | "fern-litter"
  | "spring-rock";
export type HidingCandidate = {
  id: string;
  landmarkId: string;
  category: HidingCategory;
  position: { x: number; y: number; z: number };
  interactionPosition: { x: number; y: number; z: number };
  collision: {
    inspectRadius: number;
    clearanceHeight: number;
    surface: "wood" | "rock" | "earth";
    requiresClimbing: false;
  };
  visibility: {
    exposure: "partly-screened" | "recessed";
    approachDirection: { x: number; z: number };
  };
  eligibleFor: readonly ["idol", "clue"];
  enabled: boolean;
  surfaceAnchor?: { x: number; y: number; z: number; mesh: string };
};
// Hand-authored offsets: hide dx/dz/height, player dx/dz. No spawned items,
// search markers, ownership state or discovery events are created by this data.
const sites: Record<
  string,
  {
    category: HidingCategory;
    surface: "wood" | "rock" | "earth";
    offsets: number[][];
  }
> = {
  "ancient-fig": {
    category: "buttress-root",
    surface: "wood",
    offsets: [
      [3.1, 0.7, 0.35, 5.1, 1.2],
      [-2.6, 2.5, 0.35, -4.3, 4.1],
      [-1, -3.5, 0.35, -1.7, -5.5],
    ],
  },
  "root-crown": {
    category: "root-pocket",
    surface: "wood",
    offsets: [
      [2.8, 1, 0.3, 4.8, 1.7],
      [-2.8, 1, 0.3, -4.8, 1.7],
      [0, -3, 0.3, 0, -5],
    ],
  },
  "fallen-giant": {
    category: "hollow-log",
    surface: "wood",
    offsets: [
      [4.3, 0, 1, 5.7, 0],
      [-4.3, 0, 1, -5.7, 0],
      [1, 1, 0.25, 1, 2.5],
    ],
  },
  "moss-gates": {
    category: "rock-crevice",
    surface: "rock",
    offsets: [
      [-1.8, 0, 0.6, 0, 0],
      [1.8, 2, 0.6, 0, 2],
      [0, 4.8, 0.5, 0, 3.2],
    ],
  },
  "southern-cave": {
    category: "cave-recess",
    surface: "rock",
    offsets: [
      [-3.8, -1, 0.7, -2, -1],
      [3.8, 2, 0.9, 2, 2],
      [0, 6.8, 0.5, 0, 5],
    ],
  },
  "roof-shelter": {
    category: "overhang",
    surface: "rock",
    offsets: [
      [-3, 1, 0.4, -3, -1],
      [0, 1, 0.4, 0, -1],
      [3, 0, 0.4, 3, -2],
    ],
  },
  "hollow-stump": {
    category: "hollow-stump",
    surface: "wood",
    offsets: [
      [0, 0, 2.2, 0, -2.1],
      [0.6, 0.7, 0.3, 1.6, 1.8],
      [-0.6, 0.7, 0.3, -1.6, 1.8],
    ],
  },
  "leaning-tamarind": {
    category: "root-pocket",
    surface: "wood",
    offsets: [
      [0, 2.7, 0.3, 0, 4.7],
      [-2.7, 0, 0.3, -4.7, 0],
      [0, -2.7, 0.3, 0, -4.7],
    ],
  },
  "strangler-stone": {
    category: "behind-boulder",
    surface: "rock",
    offsets: [
      [-2.1, 0, 0.7, -4.5, 0],
      [2.1, 0, 0.7, 4.5, 0],
      [0, 2.1, 0.7, 0, 4.5],
    ],
  },
  "fern-bowl": {
    category: "fallen-branch",
    surface: "earth",
    offsets: [
      [-1.5, 2.5, 0.15, -1.5, 1],
      [0, 2.5, 0.15, 0, 1],
      [1.5, 2.5, 0.15, 1.5, 1],
    ],
  },
  "root-bridge": {
    category: "hollow-log",
    surface: "wood",
    offsets: [
      [-4.3, 0, 0.4, -5.7, 0],
      [4.3, 0, 0.4, 5.7, 0],
      [1, 1, 0.25, 1, 2.5],
    ],
  },
  "quiet-alcove": {
    category: "rock-crevice",
    surface: "rock",
    offsets: [
      [-2.5, 1, 0.6, -1, 1],
      [2.5, 1, 0.6, 1, 1],
      [0, 2.8, 0.5, 0, 1.2],
    ],
  },
  "spring-seep": {
    category: "spring-rock",
    surface: "rock",
    offsets: [
      [1.8, 0.8, 0.35, 3.3, 0.8],
      [0.8, 1.6, 0.25, 0.8, 3.1],
      [-1.7, 0, 0.2, -3.3, 0],
    ],
  },
};
export function createHidingCandidates(
  useMigrated = true,
): readonly HidingCandidate[] {
  return Object.entries(sites).flatMap(([landmarkId, s]) => {
    const l =
      landmarkId === "spring-seep"
        ? SPRING
        : NATURAL_LANDMARKS.find((l) => l.id === landmarkId)!;
    return s.offsets.map(([dx, dz, h, ix, iz], i) => {
      const x = l.x + dx!,
        z = l.z + dz!,
        px = l.x + ix!,
        pz = l.z + iz!,
        d = Math.hypot(x - px, z - pz) || 1;
      const id = `tonsai-${landmarkId}-${i + 1}`;
      const migrated = useMigrated
        ? (
            migratedSurfaces as Record<
              string,
              {
                position: { x: number; y: number; z: number };
                interactionPosition?: { x: number; y: number; z: number };
                surfaceAnchor: {
                  x: number;
                  y: number;
                  z: number;
                  mesh: string;
                };
              }
            >
          )[id]
        : undefined;
      const target = migrated?.position ?? { x, y: baseHeight(x, z) + h!, z },
        approach = migrated?.interactionPosition ?? {
          x: px,
          y: baseHeight(px, pz),
          z: pz,
        },
        len = Math.hypot(target.x - approach.x, target.z - approach.z) || 1;
      return {
        id,
        landmarkId,
        category: s.category,
        position: target,
        surfaceAnchor: migrated?.surfaceAnchor,
        interactionPosition: approach,
        collision: {
          inspectRadius: 2.8,
          clearanceHeight: 2.1,
          surface: s.surface,
          requiresClimbing: false as const,
        },
        visibility: {
          exposure: (s.category.includes("hollow") ||
          s.category === "cave-recess"
            ? "recessed"
            : "partly-screened") as "recessed" | "partly-screened",
          approachDirection: {
            x: (target.x - approach.x) / len,
            z: (target.z - approach.z) / len,
          },
        },
        eligibleFor: ["idol", "clue"] as const,
        enabled: true,
      };
    });
  });
}
export const HIDING_CANDIDATES = createHidingCandidates();
export function eligibleHidingCandidates(kind: "idol" | "clue") {
  return HIDING_CANDIDATES.filter(
    (s) => s.enabled && s.eligibleFor.includes(kind),
  );
}
