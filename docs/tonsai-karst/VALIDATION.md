# Final validation

Base: merged PR20 / main `5d54f292`. All rows below apply to the final eastern-clearance correction. Source and binary blobs were hash-verified during upload, and the complete remote tree is compared with the staged local tree before the draft PR is created.

| Check | Result | Evidence |
| --- | --- | --- |
| Application TypeScript | Pass | [Log](typecheck.log) |
| Unit suite | **109/109 pass** | [Log](tests.log) |
| Ordinary production build | Pass; existing bundle-size/static-dynamic import warnings remain | [Log](build.log) |
| Regenerated low/high kits | Pass existing hashes, source identities, download ceilings and per-mesh budgets | [Log](asset-build.log), committed manifests |
| Native/inspection production WebGL | **44 matched screenshots**, low/high, zero measured camera error, no recorded page errors | [Gallery](GALLERY.md), [comparison](comparison.json) |
| Afternoon / golden-hour rock checks | Four additional after-only WebGL images; both reports pass | [Gallery](GALLERY.md) |
| Connected world | **15 groups pass**; four round trips, conversations, ballot, failure recovery, disposal | [Report](evidence/connected/browser-report.json) |
| Trusted mobile controls | **16 groups pass**; joystick + Run + orbit, eight directions, cancellation, resets, other scenes, live RAF | [Report](evidence/mobile/report.json) |
| Continuous real-Player expedition | **50 route legs pass**, including **39/39 hiding approaches**, cave, spring and NPC water movement | [Report](evidence/routes/report.json) |
| Atmosphere integration | **7 groups pass**, all three presets, sun/ocean agreement, release and missing-atlas movement fallback | [Report](evidence/integration/report.json) |
| Southern/inland body clearance | **2,311 grid positions per LOD**; no new body intersections; existing cave-cheek cases recorded | Unit log and geometry audit |
| Isolated low/high resource/timing repeat | Both phases pass; counts unchanged at spawn; noisy host timing is reported separately from device performance | [Before](evidence/profile-before/report.json), [after](evidence/profile-after/report.json) |

Tests use Chromium 153 / ANGLE SwiftShader. Trusted touch events are desktop browser emulation; fixed 60 Hz simulation verifies actual movement independently of host raster speed. A separate live-RAF test confirms rendered sprint movement. These checks do not certify physical iPhone Safari, sustained FPS, thermals or battery use.

The final clearance sweep exposed and corrected eastern low ledges intruding into walkable terrain. Final unit/build, the complete matched capture set, connected-world/mobile/50-leg route/atmosphere suites and lighting checks were repeated after the correction. The original baseline GLB independently has seven cave-cheek intersections in the same 2,311-position grid; six remain at x=7 in the unchanged cave cheek. Centre-cave movement and all three cave hiding approaches pass.

Hosted CI status is separate from these local results. No merge, game deployment or publication was performed. The reference repository was untouched.
