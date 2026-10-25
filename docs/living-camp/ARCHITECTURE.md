# Living camp architecture and preimplementation audit

Base: prototype `d4a1e6f5cfe1da16d55d58b84480027b0062ffc3`.
Read-only reference: SurvivorIsland2025 `cf894e578d77fce1e588d793dfc8d14f61ec7628`.

## Audit and decisions (before implementation)

The prototype is a React 19 / Fiber 9 / Three 0.186 Vite workspace. Scene assembles
procedural terrain, merged props, chunked instanced flora, a raised shelter and
an articulated player. Player owns distance-based gait and a five-ray collision
camera. Hud owns pointer-captured joystick, run and orbit controls. world.ts is
pure and already shares height, colliders, ramp, vegetation, trail and landmarks
with scenery. Preserve these systems. Existing verification consists of world-check
and a CDP walkthrough; there is no NPC or simulation boundary on main.

The reference is a browser ES-module application. Audited actual source:
GameData; CampBehaviorProfile; ConversationCharacter; CampPresence; LocationUtils;
NpcLocationSystem; CampActivitySystem (choice scoring, start, settleTravel,
recordPhysicalMovement); NpcInitiative (actor-owned sightings); ConversationSystem;
ConversationResolver; CampInteractionSystem; CampKnowledge; SocialMemorySystem;
RelationshipSystem; AllianceSystem (asymmetric getAllianceAffinity); CampTime;
SaveManager; SeasonEngine; StrategicObjectivePlanner.

Reuse verbatim, pinned local snapshots: personality profiles and character style;
location keys/normalization; physical camp presence; owner-scoped SocialMemory and
its knowledge projections. Record paths and SHA256 in reference-origin.json.
Extract the four actual identity/rating records, retaining original numeric IDs.
No avatar images or other original-game art are redistributed.

The activity engine is tied to GameManager phase/dayTimer, stockpile, work plans,
NpcLocationSystem singleton, strategy and event manager. Conversations import
DOM view/screen and singleton manager dependencies; resolver additionally needs
strategic tasks, negotiation, objectives, relationship/trust and alliance services.
Importing this closure would bootstrap a second partly initialized original game.
Do not copy it. Season progression and saves require the whole authoritative world.

## Implementation boundary

- `simulation/contracts.ts`: intents, physical event receipts, dialogue and owner
  knowledge interfaces. No React, meshes, browser or season state.
- `simulation/DemoProvider.ts`: explicitly temporary weighted opportunity provider;
  uses real production profiles and SocialMemory. No parallel trust/alliance store.
  Optional read-only relationship/affinity service defaults to unknown, not fabricated
  historical alliances. Limited authored dialogue is not the full resolver.
- `navigation.ts`: terrain/collider-validated A* lattice with trail cost, edge slope
  checks and smoothing. Shared physical geometry, not brittle scripted routes.
- `CampRuntime.ts`: positions, reservations, travel, interruption, conversations,
  spatial witnesses and approach lifecycle. Emits completion only on physical arrival.
- React: meshes/rigs, animation, camera, touch and conversation display only.

Future authoritative provider supplies intents and dialogue from the existing
GameManager. Bind identity IDs once; feed spatial receipts into CampActivitySystem
completion, NpcLocationSystem and SocialMemory. Reconcile countdown simulation time
with elapsed physical time before enabling writes. Do not advance a semantic route
step on departure. Existing season saves remain untouched. Future presentation saves need their own versioned position/route state;
no 3D persistence or original save migration is implemented in this PR.

Deferred: authoritative needs/resources, trust effects, alliance consent, vote plans,
strategic delegation, full conversation resolver, full season, challenges and council.
The replaceable provider is the only temporary behavior layer; renderer and navigation
can survive that replacement.
