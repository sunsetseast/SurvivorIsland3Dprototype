# Completion performance and resource accounting

Production Chromium 156 / ANGLE SwiftShader captures at 932×430, DPR 1, real Player camera. The PR #21 baseline and current art were captured sequentially on the same GitHub runner with identical renderer settings and static initial NPC staging. These are resource measurements, not physical iPhone performance.

| Spawn metric | Low: PR #21 → completion | High: PR #21 → completion |
| --- | ---: | ---: |
| Draw calls | 234 → 234 | 251 → 251 |
| Submitted triangles | 680,644 → 685,103 (+0.66%) | 980,009 → 985,563 (+0.57%) |
| Resident geometry arrays | 20,819,754 → 20,858,126 bytes | 26,447,300 → 26,485,672 bytes |
| Geometry increase | 38,372 bytes | 38,372 bytes |
| Estimated texture image storage | 55,031,152 → 55,031,152 bytes | 55,031,152 → 55,031,152 bytes |
| Highest native-pose draw count | 258 | 275 |

The finishing pass itself adds 34,916 geometry bytes and no draws, materials, textures or downloads. The shared cave-body correction changes soft planting eligibility near the vault, adding one 32-triangle litter patch (3,456 bytes). The comparison measures those named categories and rejects all unaccounted resident growth. Combined increase is 37.5 KiB, approximately 0.18% Low / 0.15% High. The original per-pose +2 call and +5% triangle ceilings remain unchanged; spawn call and texture-storage equality remain exact.

Foliage visibility adds a shared vector uniform and a small cutout calculation to the existing leaf shaders. It uses existing alpha test/MSAA coverage, without transparent sorting, plant removal, postprocessing, extra geometry or draws. Shelter geometry is finished once while its scene-owned asset is decoded. The small replaced supplies buffer and construction temporaries are disposed; scene cleanup retains existing resource ownership.

The art captures succeeded at implementation checkpoint `80c7ee9e132d4023a8b2420fd94af8ae7d19c3f8`; the initial comparison correctly rejected the then-unaccounted cave-litter bytes. The explicit accounting follow-up retains strict resource checks. Final CI links and outcomes are recorded in COMPLETION.md and the PR.

No physical iPhone 17 Pro Max FPS, sustained thermals or battery measurements are claimed. The existing large production chunks/dynamic-import warnings remain. Follow the device acceptance checklist in COMPLETION.md before hardware certification.
