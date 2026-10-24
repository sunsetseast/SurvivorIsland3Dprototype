---
name: WebGL verification
description: A limitation of the automated screenshot browser in this workspace and what counts as game verification.
---

The default screenshot browser has repeatedly failed to create a WebGL context
in this environment even while the game renders in Chromium with software
WebGL. A screenshot-harness context error alone does not establish that the app
is broken.

**Why:** Actual software-WebGL browser sessions rendered the camp and executed
movement/touch tests while the ordinary capture browser showed the error boundary.

**How to apply:** Use a WebGL-capable browser for rendered game inspection and
actual controller walkthroughs. Label accelerated game-frame tests and software
renderer statistics honestly; neither measures sustained iPhone Safari FPS,
thermal behavior, native touch feel, or real-device safe areas.
