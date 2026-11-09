# Survivor character rebuild

[Draft PR #29](https://github.com/sunsetseast/SurvivorIsland3Dprototype/pull/29) targets the merged PR #28 base at `760460f679159d42ab241eebe211739a50538a2a`. The verified gameplay implementation is at `9098283ceca759d7984fe7c5345e1059e1cc1cd5`. The final evidence and test commit is recorded at the [draft branch head](https://github.com/sunsetseast/SurvivorIsland3Dprototype/commits/feat/survivor-character-renaissance/).

## Character and source rights

- The existing player, participant 0 (“You”), wears the established coral tank and teal shorts with a brown ponytail, trail boots and a fitted belt. The body has continuous weighted skin, modeled face, hands and shoes. Camp and Coastal Traverse use the same asset. The season owns the existing participant data.
- The body, skeleton, skin, eyes, brows, hair and shoe assets use MakeHuman's CC0 1.0 system assets. The selected source revision is `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`. [MakeHuman asset license](https://github.com/makehumancommunity/makehuman/blob/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/LICENSE.md) · [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)
- Ara 3D Gen at `70d806e8c7355e6700359060168999e8ec2d510b` shaped the mesh, fitted the garments and baked the rig. Its source license is MIT and its asset notice permits commercial and noncommercial use of exports. Idle, crouch, interact and talk use its authored clips. The offline recipe adds crawl, climb, balance and recovery with rig-space contact targets. [Generator and notices](https://github.com/olatunde85/3d-gen/tree/70d806e8c7355e6700359060168999e8ec2d510b) · [Baking recipe](../../tools/character/bake-survivor.ts)
- Walk, run and turns use retargeted Carnegie Mellon Graphics Lab Motion Capture Database trials 07_01, 09_01 and 69_17. The collection was funded by NSF EIA-0196217. The dataset permits use in games, including commercial games. This GLB embeds the retargeted takes as part of the game character. [CMU database](https://mocap.cs.cmu.edu/) · [Export asset notice](https://github.com/olatunde85/3d-gen/blob/70d806e8c7355e6700359060168999e8ec2d510b/scripts/ASSETS_LICENSE.txt)

## Movement and rendering

The model definition maps named GLB clips to presentation states. One Three.js mixer blends each live avatar and uses measured travel for gait cadence. Camp samples terrain at the animated toes. Coastal Traverse blends into crouch before advancing through the crawl, follows beam balance and net slope, and uses the existing obstacle input and race timing. Other contestants, the staged Tribal player and Stillwater retain their existing rigs. The old avatar also appears while the new GLB loads or if loading fails.

Partial-stick response is quicker, sharp changes have less inertia, and releasing the stick brakes faster. Full-stick camp speeds are still 3.25 and 6.4 m/s. The Coastal camera frames the player closer and follows smoothed heading through obstacle entries. A held movement gesture retains its original camera basis when the other thumb orbits.

## Verification

The [Third-person foundation workflow](https://github.com/sunsetseast/SurvivorIsland3Dprototype/actions/workflows/third-person-foundation.yml?query=branch%3Afeat%2Fsurvivor-character-renaissance) uploads the matching `before` and `after` WebGL captures. Evidence includes front, side, back and three-quarter stills, plus consecutive walking, running, turning, crawling, balancing and climbing frames. The harness verifies active skeletal clips and changing limb transforms. The baseline and candidate ran in the same landscape viewport with trusted touch events.

Local TypeScript, production build and 196 unit tests passed. Chromium completed camp walk/run, simultaneous touch look, course entry, beam fall and recovery, net traversal, puzzle win and loss, Retry, Low and High rendering, and exact restoration of camp state. GitHub results for the final branch head are on [PR checks](https://github.com/sunsetseast/SurvivorIsland3Dprototype/pull/29/checks).

| Chromium 149 software WebGL at 932 × 430, DPR 1 | Merged main | This branch |
| --- | ---: | ---: |
| Low course draw calls / submitted triangles | 82 / 225,650 | 71 / 222,764 |
| High course draw calls / submitted triangles | 82 / 603,182 | 71 / 600,296 |
| Low / High scene textures | 10 / 9 | 24 / 23 |
| Low / High player skeletal CPU update, 180 samples | — | 0.017 / 0.016 ms |
| Crawl height across four rendered poses | 1.00–1.02 m | 0.83 m |

The model is 652 KB with 14,172 triangles, 13 material primitives, a 66-bone skin, 12 clips and embedded textures at up to 512 px. Median CPU render submission across the 28 inspection frames was 4.3 ms on the software renderer. Scene draw counts depend on framing. Both quality settings use the same character asset. Repeat races kept stable scene ownership and texture counts, and returning to the hub released the prior WebGL context.

## Remaining limits and iPhone check

Contact uses baked targets and lightweight visual support. Two sampled net wrist positions were 16–22 cm from the rope plane, so individual hand placement remains approximate, especially near the crest. Foot locking on steep or abrupt terrain is also approximate. Physical iPhone 17 Pro Max Safari frame pacing, thermals and subjective touch feel are unverified.

On a private test build of the draft branch, hold the iPhone in landscape. In Tonsai Camp, walk, toggle Run, reverse direction and release while orbiting with the other thumb. In the development Challenge Testing hub, play Coastal Traverse through the crawl, beam and both net slopes. Try Low and High, and check framing and touch feel through a full race.
