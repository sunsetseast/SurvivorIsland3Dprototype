# Camera behavior

Exploration and challenge follow use a 6.2m boom, heading behind the character, shortest-arc yaw damping, a .015rad settle band and cached local collision candidates. Five rays form the lens envelope; the boom is also sampled against terrain. Contact retracts immediately; outward recovery is damped. Cinematic and results shots remain authored.

Right-side pointer capture owns orbit independently of the joystick and buttons. Drag horizontally for yaw, vertically for bounded pitch (-.25..1.15 in outdoor scenes). Holding a movement gesture captures its camera basis, preventing orbit or auto-follow from redirecting held travel. Release and reapply the stick to use the inspected direction. After 1.6 seconds of no look input, follow resumes smoothly. In the race, vertical orbit returns toward .34rad on open lanes, .09rad under the crawl roof and .85rad on the net. The low crawl boom and higher net view keep the avatar readable while respecting the equipment collision envelope.

Race modes: cinematic introduction → challenge follow / obstacle interaction → puzzle inspection → results presentation. Each frame resolves one mode. Retry reinitializes camera state; exiting restores captured exploration yaw/pitch/position. Player camera writes are suppressed during Stillwater and explicit inspection, preserving staged ownership. World teardown releases pointer captures and cached camera references.

Merged challenge equipment uses cached authored capsules/boxes rather than triangle raycasts. Instanced trunks use world-transformed bounds; Challenge Beach trees expose lightweight trunk envelopes. Local candidates only receive the five lens queries. No extra draw calls or GPU resources.
