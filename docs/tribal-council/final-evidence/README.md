# Actual in-game WebGL evidence

Chromium 142 / SwiftShader, full quality. No generated mockups or Blender beauty renders. Diagnostic environment/prop views use explicit cameras; portrait and two-thumb sequences use the actual gameplay camera. Software rendering is not physical iPhone certification.

- [Matched Council before/after](before-after.jpg), [arrival reveal](arrival.jpg), [front approach](front-approach.jpg).
- [Decorated booth/table](booth-tabletop.jpg), [complete tabletop](props-close.jpg), close [marker](pen-close.jpg), [hollow urn](urn-close.jpg), [cloth bag](bag-close.jpg).
- [Desktop portrait](portrait-desktop.jpg), [mobile landscape writing UI](portrait-mobile-writing.jpg).
- [Ordered voting-camera entry/exit](voting-camera-sequence.jpg): approach → transition → portrait → step away → current follow position. Ordered frames, not a real-time video.
- [Two-thumb walk/run and camera proof](two-thumb-sequence.jpg); [raw inputs, positions and camera yaw](review.json) accompany the actual native CDP touch gestures. Corresponding camp frames are included separately.
- Practice ballot [fold](ballot-01-fold.jpg) → [over urn](ballot-02-over-urn.jpg) → [deposited](ballot-03-deposited.jpg).
- [Twelve seated attendees](twelve-seated.jpg), [seated host view](ceremony-seated.jpg), [preserved last-walk rehearsal](ceremony-last-walk.jpg).

`review.json` contains the final interaction/keyboard-viewport run; `staticEvidence` lists the fixed compositions captured by the preceding full run. `before-performance.json` and `after-performance.json` retain the matched-view counters and timings. `camp-regression.json` contains the separate camp suite; its redundant screenshots were kept out of this consolidated gallery. `tests.txt`, `typecheck.txt`, and `build.txt` record local checks.

See [certification and limits](../FINAL-CERTIFICATION.md) for implementation details, references, costs and reproduction commands.
