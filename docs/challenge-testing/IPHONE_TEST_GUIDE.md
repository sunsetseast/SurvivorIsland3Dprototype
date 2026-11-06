# iPhone Challenge Testing

This feature is in [draft PR #25](https://github.com/sunsetseast/SurvivorIsland3Dprototype/pull/25), branch `feat/challenge-testing-hub`. It has not been merged or deployed. Your existing project must have this branch's code; GitHub changes do not automatically prove the preview updated.

1. In your existing project's Git/source-control interface, sync GitHub and select `feat/challenge-testing-hub` while this PR is draft. Use your existing development **Run** workflow, then open its preview. These interface labels can vary; the running hosted project was not accessed or verified.
2. On the welcome screen, look for **Development preview**, a **Build** revision, and the large **Challenge Testing** button below **Continue Survivor Session**. Tap **Challenge Testing**. The next screen says **Challenge Hub v1**. These markers distinguish this feature from the old welcome screen.
3. Turn the phone sideways for the competition. Tap **Play Stillwater Balance**. You should immediately see the host introduction in the Individual Clearing. You do not need to visit camp, walk to a station, obtain a grant or edit a URL.
4. Tap **Show controls**, read the tutorial, then **I'm ready · Start**. Drag the balance pad gently left or right with one finger. When an object is ready, steady the marker in the gold band and tap **Place** with a second finger. Adjust **Sensitivity** if needed.
5. **Pause** holds the competition; tap **Resume challenge** to continue. After the real result, **Retry rehearsal** starts another attempt. **Challenge Hub** lets you choose again; **Welcome screen** takes you straight back to the welcome actions.
6. Tap **Continue Survivor Session** to resume normal camp. Your existing camp, position, contestants and progress should be intact. Testing does not advance the camp clock or award season immunity.

The other three cards say **Environment Preview**. They let you explore existing equipment, not play a completed competition. Use their **Challenge Hub** or **Welcome screen** buttons to leave.

If the new button is missing: check the footer first. **Production build** intentionally has no testing hub. An old/missing revision or absent **Challenge Hub v1** means you have not verified this code is running. Check the selected Git branch and existing development Run workflow, then stop/restart that workflow. This PR does not change hosted Run/deployment settings or unlock production. If your phone's source-control interface cannot select/sync a branch, that hosted setup step remains unresolved; no console, URL flag or Agent workaround is provided.

All implemented navigation works by touchscreen. Automated browser emulation passed; actual iPhone Safari and your live hosted preview still need this manual check. No Replit services were used after the instruction not to use Replit, and no Agent, credits, deployment or publishing were used.
