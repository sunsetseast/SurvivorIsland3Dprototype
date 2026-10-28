# Tonsai Limestone Cove — implementation and visual review

This draft rebuilds one connected Tonsai showcase around the existing Tonsai–Railay limestone divider. It contains implemented game assets and controller integration, not a separate art scene. It is **not a declaration that the approved cinematic/AAA art target has been achieved**. The cliff composition, foliage and asset pipeline are materially improved; residual artificial forms and physical iPhone performance still require review before wider reuse.

## Where to explore

Enter **Explore Railay → Explore → Tonsai · Limestone Cove**. This places the actual player at (-670,-820), on the existing beach, facing the headland. Walk and look around normally; the location is connected to the original Tonsai spawn, forest and inland route. There is no Blender/Xcode/desktop step for the player. The existing beach spawns, map, touch controls and access to other Railay regions remain available.

![Real player and touch controls](evidence/showcase-third-person.jpg)

## Implemented art and reusable systems

- The hero divider has five deliberately composed peak masses, two lowered saddles, a more irregular skyline, projecting buttresses, dissolution cuts, finite chambers, ledges and undercuts. A named design file drives the broad composition; tertiary noise does not determine the mountain silhouette. Blender retopology and baked cavity/orientation tint produce bounded high/low assets.
- The geographic outline, projection, coast, beach floor and low walking envelope remain the PR11 foundation. The crown is artist-authored rather than surveyed: maximum height rises from roughly 145m to 190m, with lower internal saddles. No claim that these exact heights reconstruct a measured Thai cliff is made. The NW massif is not redesigned.
- Limestone shading uses scanned grain and normal detail beneath broad gray/mineral coloration, vertical rain staining, damp lower zones, roughness variation and slope-sensitive moss. Lighting, sky cloud veils and haze are inexpensive shader/light composition, without post-processing.
- Three original canopy architectures, three spreading ficus architectures and three coconut palms are authored in an editable Blender scene. Curved tapered trunks, branched crowns, roots, bent atlas cards, per-leaflet palm geometry, actual mesh variation and distinct far LODs replace the earlier primary tree assets. Existing procedural trees remain available on failed downloads.
- 1,288 rooted shelf/crest specimens are sampled from actual upward-facing sculpt triangles. Stunted cliff trees have lower vertical proportions; selected shelf gardens add hanging vines and exposed roots. Plants are not scattered arbitrarily in 3D wall space. Dense crest placement is jittered and follows the rock surface.
- A locally clustered beach/jungle understory adds ferns, pandanus, broad leaves and litter while reserving the existing trail corridor. Scanned CC0 fern variants and selected coastal rocks are optimized before inclusion. A separate alpha map repairs the fern download's JPEG base color.
- Trees share geometry/materials through instancing, with near/far selection and per-instance frustum culling. Asset swaps correctly repopulate instance matrices. Selection runs after the final game camera, independent of subscriber remount order. Separate quality karst downloads and inexpensive camera proxies control cost.

The rest of Railay remains the existing environment. Materials and primary plant assets are reused by the existing Tonsai forest system, but this PR does not attempt another peninsula-wide reconstruction.

## Verification

| Check | Result |
| --- | --- |
| Latest main base | `807d85c5a1ddca8000b01f9621c0d5f898de3b82`, including merged #10 and #11 |
| Unit and regression suite | **77 passed**, including new asset/hash/budget, walk-height sculpt alignment, shelf rooting, variant/LOD and playable-viewpoint checks |
| TypeScript / production build | Passed; existing large vendor/terrain chunk warnings recorded |
| Genuine WebGL views | Six inspection views including ground-level cliff, palms, understory, phone landscape and high/low benchmark; actual third-person view additionally captured |
| Before/after | Main checked out independently; identical eye/target/FOV, unchanged coastline and real WebGL in both images |
| Movement / joystick / look | Actual controller moved 5.17m; CDP touchscreen joystick moved the player; right-thumb drag changed yaw |
| Natural inland route | Existing full waypoint chain passed the actual movement solver; four-beach regression suite passed |
| Showcase entry | Travel button placed the real player at (-670,-820); actual third-person frame captured |
| Map / reset / other scenes | Minimap, expanded map, reset, menu→camp→Tribal Council→Railay and resource disposal checks passed |
| Missing downloads | Blocked karsts, botanical GLBs, scan, maps and foliage textures retained rendered fallback geometry; expected network errors are separated from application errors |
| Initial low mode | Network trace showed low karst + botanical + fern + existing geology; no high karst or coastal scan request; visible forest and player verified |
| Mobile device | 932×430 touch/layout emulation only; physical iPhone Safari **unverified** |

See [gallery](GALLERY.md), [measured performance](PERFORMANCE.md), [asset rights/reproduction](ASSETS.md), and the committed JSON/text evidence. The final paired benchmark is 1,063,473 triangles / 218 calls high and 479,525 / 147 low; main was 1,241,579 / 214 high and 514,783 / 144 low. A broader sweep produced a somewhat higher high count; the performance report discloses the range.

## Visual review and unresolved target

The new skyline steps through distinct masses instead of a uniform curtain. Cliff-rooted vegetation, denser inland layers and the recognizable curved palm foreground improve the beach composition at human scale. The real third-person capture demonstrates that the view is part of exploration.

The approved marketing-quality target remains **open**. Some faces still retain a soft procedural erosion rhythm; distant crowns can reveal cards and repeated branch motifs; close trunks and ground transitions remain stylized. The preserved far Railay environment is visibly simpler than the showcase. This is a self-reviewed implementation with evidence, not an independent external art certification. No AI illustration or Blender render is substituted for in-game quality.

A further hand-art pass on silhouette/face breakup and foliage density should be judged against these exact ground-level frames before expanding the kit to the entire peninsula. Real-device Safari profiling and visual feedback should determine final mobile budgets. Decorative foliage does not introduce individual tree colliders; existing ground/rock/water/camera collision behavior is preserved.

**One draft PR. Do not merge, deploy or publish. SurvivorIsland2025 was not modified.**
