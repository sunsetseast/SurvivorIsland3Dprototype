# Known limitations and future work

- **Rehearsal only.** No authoritative season admission, immunity award, permanent elimination or season progression. The developer selector remains required; normal production builds cannot admit this challenge using a URL flag alone.
- **No physical iPhone test.** Chromium SwiftShader captures and automated mobile/WebKit regressions do not certify sustained iPhone Safari FPS, thermal/battery behavior, real touch feel, hardware safe areas or difficulty. A physical iPhone 17 Pro Max landscape review is still required.
- **Short original endurance format.** The 90-second cap ranks survivors by placements, then stability; exact ties share the win. It is not an unlimited TV-length endurance challenge. A failed solo/all-out attempt has no winner.
- **Only the existing roster.** Current rehearsal renders four existing NPCs plus the player; unused stations stay empty. No invented persistent contestants. Identity/trait lookup is read-only, and retry repeats the seed for fair comparison.
- **Lightweight authored animation.** Tilt, wobble, stack fall and spectator transitions use temporary gameplay state and authored transforms, without rigid-body physics, articulated hand-to-rope IK or a full challenge navigation/crowd system.
- **Original simple host and text introduction.** The shipped stylized avatar is reused for the host representation. No likeness of a television host, branded audio, dialogue recording or voice acting is added.
- **Limited environment scope.** Polish is concentrated on existing Stillwater equipment, local surface detail and camera composition. Other three competition configurations remain demonstrations.
- **Metrics are resource counts.** Draw calls/triangles are renderer submissions; active array bytes are a CPU-side geometry estimate. GPU geometry/texture counts and scene ownership entries are not GPU VRAM bytes or heap profiling. No FPS or physical-device performance certification is inferred from manually stepped software rendering.
- **Existing build warnings.** The production build still reports pre-existing large bundles and Scene dynamic/static import overlap. This PR does not rebuild unrelated application bundling or island asset delivery.

## Physical landscape acceptance checklist

Enter from the authorized camp rehearsal, read the rules, complete/fail a trial, use two fingers for balance/place, try reduced/increased sensitivity, background Safari, explicitly resume, retry several times, exit, change preview, and return to the same camp. Review notches/home indicator, screen gestures, 60–90-second touch comfort, readability, frame pacing, heat and battery use. Do not enable production awards before authoritative event/season integration exists.
