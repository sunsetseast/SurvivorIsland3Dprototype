# Actual root causes (main af9c61c, merged #26)

- `coastal/Camera.tsx` hardcodes x-5/z-8 and looks toward x+3.5/z+2. It neither reads facing nor provides orbit ownership. `CoastalHud` omits OrbitZone entirely.
- `ChallengeScene` forwards raw joystick axes straight into the fixed-step engine, without the radial deadzone, analog normalization, acceleration or camera basis used by Player. Diagonal input exceeds unit speed; every segment uses maximum speed immediately.
- `Player` damps a scalar speed but stops displacing on the release frame, so its advertised deceleration is visual only. The radial deadzone is discontinuous at .12. Gesture basis locking correctly prevents free-look feeding back into travel and must be retained.
- `coastal/visual.ts` returns scaleY=.43 on crawl; Roster scales the entire body including head. Both Survivor and Contestant already have hip/spine/head, shoulders/elbows, hips/knees/ankles. No new skeleton package is needed.
- Coastal Roster resets world facing to zero every frame. It infers gait from displacement only, treats net and puzzle as generic work, and applies beam lean to the entire body. No crawl/climb/recovery articulation exists.
- Engine recovery instantly teleports to the checkpoint. Net lift follows the equipment envelope but the upright avatar ignores the net slope. Crawl starts at -38, leaving a one-metre transition zone before the actual -37 aperture; exit at -30 leaves one metre after -31.
- Exploration already has five camera envelope rays, cached marked blockers, terrain boom sampling, bounded terrain collision and axis sliding. Preserve these; bound blocker queries further rather than add rigid body physics. Challenge equipment is already marked for camera collision.
- Stillwater and Tribal intentionally use staged cameras; they must retain their ownership. Challenge exploration Player is hidden but still updates behind Stillwater (legacy); Coastal unmounts it. Explicit suppression of Player camera updates avoids simultaneous writers.

Scope: reuse existing assets, displacement-driven gait, deterministic race rules, input pointer capture/epoch/focus cleanup and world lifecycle. Add shared input math, follow math/modes, joint pose blending and lightweight camera envelope. Preserve camp/social/season state and all environment art.

Additional integration finding: two joystick gestures can end and begin between render frames. A controller that detects release only by sampling a zero axis misses that boundary and keeps an obsolete camera basis. Joystick acquisition/release now increments a gesture epoch consumed by both controllers. A held gesture stays stable through orbit; a new gesture rebases even without an intervening simulation frame.

Net crest contact must sample the actual A-frame support at the hand/foot target, including the opposite slope. Extrapolating only the body's current slope produced hovering hands when reaching over the crest. Targets now use the actual piecewise support profile and a continuous forward body transition.
