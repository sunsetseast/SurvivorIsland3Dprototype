# Physical iPhone review — not yet performed

This is an acceptance checklist for iPhone 17 Pro Max Safari. The committed WebGL captures and automated WebKit controls test do not certify physical-device FPS, memory, heat or battery behavior.

## Open a local development rehearsal

Use a Mac and iPhone on the same trusted local network. From this PR's repository root, with Node 24 and the existing pnpm version:

```sh
pnpm install --frozen-lockfile --ignore-scripts --config.strict-dep-builds=false
pnpm exec tsc -b lib/api-client-react
PORT=5174 BASE_PATH=/ pnpm --filter @workspace/survivor-camp-prototype dev
```

On the phone, open `http://<Mac-LAN-IP>:5174/?quality=low&devTravel=1` in Safari. Use the Mac's LAN address, not `localhost`. This is local development access; no hosting, production update, merge or Replit action is required. Stop the development server with Ctrl-C when done.

Enter the camp, walk to its existing departure marker, use the explicit Challenge Beach rehearsal grant, then take the offered route. Direct challenge admission and production event access are not provided. The URL flag does not enable this interface in a normal production build.

## Acceptance record

Record the tested commit, iPhone model, iOS/Safari versions, orientation, quality mode and session length. Every item below is **untested on a physical phone** until a reviewer records its result.

- [ ] Arrival has grounded feet, a useful camera view and working joystick/look/Run controls.
- [ ] Walk the main beach, shore viewing edge, jungle trail, jungle clearing and individual clearing; return by the same routes.
- [ ] Rotate the camera near cliffs and vegetation; look for gaps, floating props, severe obstruction and unstable water/sky behavior.
- [ ] Inspect all four configurations in Low, then High. Only the selected equipment should appear; each switch should place the player at its safe viewing point.
- [ ] Walking stops before unsupported water. Offshore platforms remain visual demonstrations; swimming and climbing are not expected to work.
- [ ] Hold movement and look with Run enabled, then release all touches. Open/close Menu and confirm control ownership recovers.
- [ ] Switch through all four configurations repeatedly for several minutes. Note visible pauses, crashes, reloads or increasing degradation; do not infer memory or thermal measurements from appearance alone.
- [ ] Use Return staging and the normal return route. Confirm the exact departure camp/position, contestant identities and existing camp controls are preserved. Repeat a second round trip.
- [ ] Record observed usability and any measured performance separately. Only report device FPS, memory, heat or battery results if actually measured, including the method and duration.

If a defect appears, save the commit, mode, route/selection sequence, screenshot or short recording, and whether returning to camp clears it. Keep PR #23 draft while acceptance issues are reviewed.
