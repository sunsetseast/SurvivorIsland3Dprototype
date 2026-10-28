"""Regenerate the measurement tables from actual retained browser reports."""
from pathlib import Path
import json,statistics
ROOT=Path(__file__).resolve().parents[2]
DOC=ROOT/'docs/flagship-camp'
def read(path):return json.loads((DOC/'evidence'/path).read_text())
b,a,j,m=read('before/report.json'),read('after/report.json'),read('journeys/browser-report.json'),read('multitouch/report.json')
assert a['result']=='PASS' and j['result']=='PASS' and m['status']=='passed'
rows=[]
for s in [b['samples'][0],a['samples'][0],a['samples'][1]]:
    label='Original main, low' if s is b['samples'][0] else 'Rebuilt '+s['label']
    rows.append(f"| {label} | {s['calls']:,} | {s['triangles']:,} | {s['geometries']} / {s['textures']} | {s['materials']} | {s['geometryBytes']/1048576:.2f} MiB | {s['textureBytesEstimate']/1048576:.2f} MiB |")
journey_rows='\n'.join(f"| {s['label']} | {s['calls']} | {s['triangles']:,} | {s['geometries']} / {s['textures']} | {s['trackedGlobalListeners']} |"for s in j['samples'])
timing_rows='\n'.join(f"| {i+1} | {t['locationId']} | {t['ms']/1000:.3f} s |"for i,t in enumerate(j['timings'][:9]))
raw=[r for r in a['samples'][0]['resources']if 'import'not in r['name']]
transfer=sum(r['transferSize']for r in raw);encoded=sum(r['encodedBodySize']for r in raw)
frame_rows=[]
for s in a['samples']:
    times=s['softwareRenderFinishMs'];frame_rows.append(f"| {s['label']} | {min(times):.2f}–{max(times):.2f} ms | {statistics.median(times):.2f} ms |")
profile=DOC/'evidence/profile/report.json'
profile_text='The optional short live Camp RAF profile is not present; no sustained Camp FPS is claimed.'
if profile.exists():
    p=json.loads(profile.read_text())
    if p.get('result')=='PASS':
        r=[]
        for s in p['samples']:
            values=sorted(s['liveFrameIntervalsMs']);r.append(f"| {s['label']} | {len(values)} | {statistics.mean(values):.2f} ms | {statistics.median(values):.2f} ms | {values[min(len(values)-1,int(len(values)*.95))]:.2f} ms |")
        profile_text='Short live Camp RAF intervals, from [raw profile](evidence/profile/report.json). This is a small desktop software-renderer window, not a sustained mobile benchmark.\n\n| Profile | Intervals | Mean | Median | p95 |\n| --- | --- | --- | --- | --- |\n'+'\n'.join(r)
releases=j['lifecycle']['releases'];nonzero=[r for r in releases if r['geometries'] or r['textures']>1]
exceptions='None in the retained run.' if not nonzero else '; '.join(f"{r['id']}: {r['geometries']} geometries / {r['textures']} textures"for r in nonzero)
text=f'''# Performance and gameplay verification

Measured 2026-10-28, Chromium **{a['browser']}**, ANGLE SwiftShader software WebGL, **932 × 430, DPR 1**. These are host observations, not physical iPhone Safari certification. Raw [visual](evidence/after/report.json), [journey](evidence/journeys/browser-report.json) and [multitouch](evidence/multitouch/report.json) reports are retained.

## Comparable default-pose rendering

Before and after use the same Camp spawn, yaw, pitch and viewport; both use the actual Camp renderer. NPC timing can vary with loading. They do not compare an aerial view with a ground view. Counts include the renderer's submitted work and depend on camera/frustum/shadows.

| Scene/profile | Calls | Submitted triangles | Uploaded geometries / textures | Attached materials | CPU geometry arrays | Estimated scene textures |
| --- | --- | --- | --- | --- | --- | --- |
{chr(10).join(rows)}

The quality improvement costs **{(a['samples'][0]['triangles']/b['samples'][0]['triangles']-1)*100:.1f}% more submitted triangles on low** and a substantial texture-memory increase. High adds nearby detail and a larger shadow map. This PR does not claim a free performance improvement over the primitive original.

CPU storage counts attached geometry attribute/index arrays, not total JS heap, retained parsed source LODs or instance-matrix buffers. Texture estimates use RGBA8 plus mipmaps from image dimensions; they are **estimates, not measured GPU bytes**, and exclude driver overhead, render targets, compressed-format differences and browser decoded-image caches. Approximate shadow-map storage adds about 4 MiB on low / 16 MiB on high, depending on actual driver format. Renderer memory counters are object counts.

## Loading, transfer and reentry

Comparable visual-harness entry-plus-settle wall samples were original low **{b['samples'][0]['entryWallMs']/1000:.3f}s**, rebuilt low **{a['samples'][0]['entryWallMs']/1000:.3f}s**, rebuilt high **{a['samples'][1]['entryWallMs']/1000:.3f}s**. These include navigation/bootstrap, menu entry, shader/asset work, 150 manual simulation frames and sampling; they are not pure network timings. Runs can contend with other host work, so these samples do not establish a speedup. High's second-page assets benefit from HTTP cache reuse.

Initial actual model/ground-image requests carried **{encoded:,} encoded bytes** and **{transfer:,} transferred bytes**, excluding Vite's `?import&url` JavaScript modules. Both modes download the same compact LOD kit; low saves submitted work rather than claiming a smaller download. The 9.9 MB editable `.blend` is not part of the browser build. Warm binary requests in the high sample report 300-byte revalidation/cache responses rather than full re-downloads.

The separate permission-gated journey controller measured the following request-to-ready times, including fade, cleanup, module/assets and harness polling:

| Request | Destination | Host elapsed |
| --- | --- | --- |
{timing_rows}

The asset-failure/delay stress harness's menu reentry took **{a['reentryWallMs']/1000:.3f}s**. Routing interception disables normal cache behavior, and this stress result must not be presented as the normal warm journey return. It remains a real slow host observation, not omitted from the report.

## Frame observations and provisional budgets

Five actual render-plus-`gl.finish()` wall samples at the default Camp view:

| Profile | Range | Median |
| --- | --- | --- |
{chr(10).join(frame_rows)}

These submission/finish samples omit the whole game frame and cannot be converted into phone FPS or treated as GPU timestamp measurements.

{profile_text}

The multitouch harness also retains a live RAF sprint in the **unchanged Railay journey scene**, not a Camp FPS benchmark. It proves live input/rig displacement rather than measuring this camp's rendering throughput.

Provisional default-view budgets are ≤250 calls / 650k submitted triangles on low, ≤280 calls / 1.1M triangles on high, ≤12 MiB attached CPU geometry arrays, approximately ≤48 MiB scene-image texture estimate, and <5 MB packed Camp model/ground-image payload. The retained default samples meet these provisional budgets. They are engineering guardrails for this host view, not device acceptance criteria. DPR, shadow targets, alpha overdraw, thermal behavior and sustained Safari frame pacing still need actual-device measurement.

## Four round trips and resource ownership

| Sample | Calls | Triangles | Uploaded geometry / textures | Tracked global listeners |
| --- | --- | --- | --- | --- |
{journey_rows}

- Peak simultaneously mounted detailed locations: **{j['lifecycle']['peakActive']}**. Camp's tracked global listener count is **43** on every return; Railay uses 50.
- Camp return geometry allocations stay at 95 in the sampled return views. Textures move from 27 to 29 with later views/NPC activity; they are not falsely described as an exact byte plateau. Returning to the baseline view uploads additional previously culled meshes.
- Most source-release checkpoints record **0 geometries / 1 retained texture**. Nonzero checkpoint(s): **{exceptions}**. This occurs around the existing overview exit; later release checkpoints return to 0/1. No persistent scene-count or listener accumulation was observed, but this is not a claim that every asynchronous checkpoint reached zero or that GPU bytes were proven leak-free.
- Observed disposal events: **{j['lifecycle']['disposals']['geometry']} geometry, {j['lifecycle']['disposals']['material']} material, {j['lifecycle']['disposals']['texture']} texture, {j['lifecycle']['disposals']['target']} render-target** resources. Events are deduplicated per observed object and are not bytes freed.
- The new instance batches capture their instance object before React clears its ref, so their instance buffers receive explicit disposal. Final ownership release is idempotent even if an object was disposed and later uploaded again. Late model callbacks after unmount/timeout are disposed by their loader owner.

## Gameplay certification

| Verification | Result and evidence |
| --- | --- |
| Unit suite | **87 pass, 0 fail**: prior 84 plus provenance/finite asset budgets, physical root/rock bounds, and reachability of every activity/private/departure anchor |
| TypeScript and production build | Pass; existing large-chunk warning remains. No new runtime dependency |
| Real WebGL visual/loading harness | PASS: low/high captures, active running, reachable anchors, four aborted model requests with playable fallback, delayed model completion, complete reentry; no captured application/shader errors |
| Connected world | **{len(j['checks'])} pass**: unauthorized/authorized departure, four round trips, preserved NPC/provider/social-memory identity, safe return pose/controls, dialogue, error/cancel/retry, actual aborted module recovery and resource observations |
| Mobile controls | **{len(m['checks'])} pass**: trusted multi-pointer input, joystick + camera + Run, latch, normalized sprint, cancellation, focus/reset/map locks, Camp/Tribal regression and scene-exit input cleanup |
| Tribal Council | Real sanctuary/intro and folded/deposited practice ballot pass through the existing adapter; screenshots retained |
| Physical iPhone Safari | **Not tested or certified** |
| Historical iPhone diagonal | **Root cause unresolved**; not reproduced in this Camp baseline/final set, so not certified fixed |

The read-only CI workflow is supplied, but local passes are not represented as an unobserved GitHub Actions pass. Remaining art limits are listed in [REPORT.md](REPORT.md) and shown in [GALLERY.md](GALLERY.md).
'''
(DOC/'PERFORMANCE.md').write_text(text)
print('Updated',DOC/'PERFORMANCE.md')
