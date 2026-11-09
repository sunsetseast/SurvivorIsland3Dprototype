# Survivor character rebuild

Checkpoint 1 of 4. Base is main at `760460f679159d42ab241eebe211739a50538a2a`, the merge of PR #28. The working branch is `feat/survivor-character-renaissance`.

## Diagnosis

1. The playable body is assembled from separately drawn rigid pieces. Its joint groups can pose each piece but cannot deform skin or clothing across joints.
2. PR #27 removed body squash and provided displacement and obstacle state. The presentation still derives poses from procedural angles instead of clips designed around planted feet, weight transfer and contact.
3. Joystick damping delays direction changes while camera recentering follows the resulting heading. Keep per-gesture camera basis locking, independent orbit and deterministic obstacle logic while tuning response and framing.

## Completed

- Reused PR #27 controls and browser QA as the baseline. Its committed evidence is in [third-person-foundation](../third-person-foundation/FINAL_REPORT.md).
- Built the exact merged base. Local Chromium launch hit an executor socket restriction. Baseline and final WebGL capture will use an available browser or GitHub Actions.
- Added a Three.js clip playback layer with explicit states, transition blending and mixer cleanup. No gameplay path changes in this checkpoint.
- Evaluated CC0 Quaternius and MakeHuman derivatives. Proceed with a MakeHuman-derived body and tropical outfit, with clips baked to the same rig offline. The showcase is the existing playable Survivor (participant 0).

## Resume

Read the branch tip with `git ls-remote origin refs/heads/feat/survivor-character-renaissance`. The tip containing this file is the latest checkpoint. Next, integrate the verified local GLB into the playable camp and race renderer, then capture the rig before changing controller behavior.
