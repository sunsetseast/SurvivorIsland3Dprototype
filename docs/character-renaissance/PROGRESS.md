# Survivor character rebuild

Checkpoint 4 of 4. Base is main at `760460f679159d42ab241eebe211739a50538a2a`, the merge of PR #28. The working branch is `feat/survivor-character-renaissance`.

## Diagnosis

1. The playable body is assembled from separately drawn rigid pieces. Its joint groups can pose each piece but cannot deform skin or clothing across joints.
2. PR #27 removed body squash and provided displacement and obstacle state. The presentation still derives poses from procedural angles instead of clips designed around planted feet, weight transfer and contact.
3. Joystick damping delays direction changes while camera recentering follows the resulting heading. Keep per-gesture camera basis locking, independent orbit and deterministic obstacle logic while tuning response and framing.

## Completed

- Reused PR #27 controls and browser QA as the baseline. Its committed evidence is in [third-person-foundation](../third-person-foundation/FINAL_REPORT.md).
- Built and ran the exact merged base in Chromium Headless Shell with software WebGL. The baseline touch and full race suite passed. Captured matching front, side and back views plus camp movement frames.
- Added a Three.js clip playback layer with explicit states, transition blending and mixer cleanup. No gameplay path changes in this checkpoint.
- The new GLB is in Tonsai Camp and Coastal Traverse as participant 0, “You.” Compared matching WebGL front, side and back views against the primitive version. The fitted tank, cargo shorts, ponytail and boots preserve the existing character design.
- The 652 KB GLB contains 14,172 triangles, 66 bones and 12 baked clips. It uses embedded textures capped at 512 px and a bundled Meshopt decoder.
- Checkpoint 2 was verified remotely at `f3248ab3597288184bce2e86e76702e4b3461c0f`.
- Tuned partial-stick drive, directional response and stopping while keeping full-stick speed and gesture ownership. Coastal framing is closer, with smoother obstacle alignment.
- Integrated crawl entry, crawl, beam balance, cargo net and recovery states without changing the race engine. A browser rehearsal completed the course and puzzle, Retry, a loss, and camp restoration. Four crawl poses were below 0.83 m under the 1.05 m frame. Two net wrist samples were within 0.22 m of the rope plane.
- Added focused checks for interrupted clip blending, cleanup and the bundled GLB budget. [Draft PR #29](https://github.com/sunsetseast/SurvivorIsland3Dprototype/pull/29) tracks the branch.

## Resume

Read the branch tip with `git ls-remote origin refs/heads/feat/survivor-character-renaissance`. The tip containing this file is the latest checkpoint. Checkpoint 3 was verified remotely at `9098283ceca759d7984fe7c5345e1059e1cc1cd5`. The final branch head contains the evidence workflow and [verification report](FINAL_REPORT.md). To reproduce, install with the frozen workspace lockfile, run the camp prototype typecheck and tests, build with `PORT=5220 BASE_PATH=/`, and run `CHARACTER_EVIDENCE=/tmp/survivor-webgl node scripts/third-person-qa.mjs` from the game package. The draft's Actions runs collect the matched captures.
