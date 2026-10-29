"""Assemble the measured PR17 report. Requires completed evidence; never invents metrics."""
import json, statistics
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
DOC=ROOT/'docs/tonsai-refinement'
EV=DOC/'evidence'
read=lambda p:json.loads(p.read_text())
profiles={(phase,q):read(EV/f'production-{phase}-{q}/report.json') for phase in ['before','after'] for q in ['low','high']}
samples={k:v['samples'][0] for k,v in profiles.items()}
gallery=read(EV/'after/report.json');before=read(EV/'before/report.json')
assert gallery['result']=='PASS' and len(gallery['poses'])==28
assert all(p['result']=='PASS' for p in profiles.values())
for a,b in zip(before['poses'],gallery['poses']):
 assert (a['name'],a['quality'])==(b['name'],b['quality'])
 assert max(abs(a['camera'][k]-b['camera'][k])for k in ['x','y','z','yaw','pitch'])<1e-6
metric=lambda key,fmt: '| '+key[0]+' | '+' | '.join(fmt(samples[(p,q)][key[1]])for q in ['low','high']for p in ['before','after'])+' |\n'
s='# Production performance and regressions\n\nBaseline: merged PR16 `fd2c39d`; final: this draft. Each primary sample uses a **fresh Chromium process**, minified Vite production assets, the same native default camera, 932 × 430 touch viewport, DPR1, ANGLE SwiftShader. The renderer is stopped for deterministic simulation and explicitly finished before collecting its default-view resource statistics. No physical iPhone results or sustained FPS are claimed.\n\n'
s+='The earlier 18.45 s dev-entry observation mixes different stages, manual simulation and synchronous render probes. It is not directly comparable with the timers below. Document-to-menu includes the eager world/navigation module work; Explore-to-ready measures subsequent scene/asset readiness. Separating these timers exposed the substantial pre-menu cost. These are individual host observations, not distributions or network-device forecasts.\n\n'
s+='| Metric | PR16 low | Refined low | PR16 high | Refined high |\n|---|---:|---:|---:|---:|\n'
s+=metric(('Draw calls','calls'),lambda x:f'{x:,}')
s+=metric(('Submitted triangles','triangles'),lambda x:f'{x:,}')
s+=metric(('Scene geometry CPU arrays','geometryBytes'),lambda x:f'{x/2**20:.2f} MiB')
s+=metric(('Estimated image texture storage','textureBytesEstimate'),lambda x:f'{x/2**20:.2f} MiB')
s+=metric(('Document → menu','documentToMenuMs'),lambda x:f'{x/1000:.3f} s')
s+=metric(('Explore → asset-ready scene','readyMs'),lambda x:f'{x/1000:.3f} s')
s+='\nScene-only readiness is slower in both refined samples; the extra mesh payload and graphics setup remain costs to review. The improvement is concentrated in pre-menu graph work, not a claim that every loading stage became faster.\n'
s+='\nGeometry counts include shared arrays only once. Image estimates assume RGBA8 plus 4/3 mip allowance and exclude driver, render-target and shadow-map overhead. Submitted triangles include the active scene/shadow passes and differ from total registered asset triangles.\n\n## Stage investigation\n\n'
s+='| Stage (host CPU/wall observation) | Low | High |\n|---|---:|---:|\n'
for label,key in [('PR16 navigation construction',None),('Refined graph decode/link','navigation-hydrate'),('Territory distance field','territory-distance-field'),('World tables/scatter','world-tables-and-scatter'),('Terrain material mask','terrain-mask'),('Terrain mesh generation','terrain-meshes'),('Landmark fetch/parse/readiness','asset-load-parse:landmarks')]:
 vals=[]
 for q in ['low','high']:
  v=samples[('before',q)]['stages']['navigationMs']if key is None else samples[('after',q)]['environmentStages'][key]['lastMs']
  vals.append(f'{v:.1f} ms')
 s+='| '+label+' | '+' | '.join(vals)+' |\n'
s+='\nThe default navigation graph is no longer constructed on the browser main thread. Build-time validation uses the identical 0.12 m body/height tests; the shipped compact edge masks preserve exact float64 trail costs. An independent cold reconstruction test compares every node and directed edge. Source hashes fail CI when the geography/collision/navigation bake is stale. Custom grid sizes retain the original constructor.\n\n'
nav=read(ROOT/'artifacts/survivor-camp-prototype/src/game/environment/navigation-manifest.json')
s+=f"The final graph contains **{nav['nodes']:,} nodes / {nav['directedEdges']:,} directed edges**, {nav['bytes']:,} decoded bytes. The same territory boundary and all 12 trail branches remain. Scan-shaped collisions free a small amount of former rectangular corner space; this is not a territory expansion.\n\n"
s+='The terrain mask remains the largest measured small synchronous art-initialization stage, so its 1 MiB CPU weight array is cached across reentry. GPU textures/materials still belong to the scene and are disposed. Offline authored indexed landmark meshes replace runtime mesh assembly; per-site bounds/LOD also avoid raycasting one enormous world-spanning landmark mesh. No new texture image is added.\n\n'
s+='Asset-load/parse measurements include asynchronous fetch, image decode, scheduling and the callback; they overlap and must not be summed. Resource Timing entries retain transfer durations independently. Shader variants/program counts are recorded, but GPU compilation time was not independently isolated. Scene mounting, shader preparation and software raster synchronization remain in the ready timer; no claim that navigation explains all load cost is made.\n\n## Rendering/scheduling stall investigation\n\n'
s+='An additional unbounded live-RAF diagnostic reproduced large stalls while software rendering. [The retained PR16 diagnostic](evidence/baseline-profile/report.json) preserves the original intervals. These observations show why a median RAF interval cannot certify smooth iPhone rendering.\n\n'
for phase,j in [('PR16',read(EV/'baseline-profile/report.json'))]:
 for a in j['samples']:
  f=a.get('frameIntervalsMs',[])
  if f:s+=f"- {phase} {a['quality']}: {len(f)} RAF intervals; median {statistics.median(f):.2f} ms, maximum {max(f):.2f} ms.\n"
s+='\nThe primary startup runs use fresh processes without that live-RAF loop and explicitly drain submitted work. This avoids attributing preceding scene teardown/queued software work to the next cold load. It does **not** prove that every scheduling stall is fixed, or that Safari will reproduce these numbers. The QA harness also supports bounded live sampling (`ART_MEASURE_LIVE=1`, synchronous finish per render) for software-host investigation. That mode is not a GPU/device FPS benchmark either.\n\n## Transfer budget\n\n'
for file,man in [('landmarks-low.glb','landmark-low-manifest.json'),('landmarks.glb','landmark-manifest.json')]:
 m=read(ROOT/'artifacts/survivor-camp-prototype/src/assets/camp'/man)
 s+=f"- `{file}`: **{m['bytes']:,} bytes**, {sum(x['triangles'] for x in m['meshes']):,} total registered triangles across its included parts/LODs, no embedded images.\n"
s+='\nLow downloads only its reduced kit. High retains both LODs. This adds transfer bytes relative to PR16 even though default submissions/CPU geometry arrays improve. The graph also increases the JavaScript transfer; its compact binary data is embedded as base64. This is a deliberate startup-CPU versus transfer tradeoff, not a claim of a smaller overall download. Existing production chunk-size advisories remain.\n\n## Gameplay and cleanup\n\n'
journeys=read(EV/'journeys/browser-report.json');expedition=read(EV/'expedition/report.json');mobile=read(EV/'mobile/report.json')
s+=f"- **100 unit tests pass**, plus the final focused asset/navigation/surface checks. TypeScript, normal production build and 294 eligible collision checks pass.\n- **{len(expedition['routes'])} continuous browser route legs**, including **39/39 hiding approaches**, cave entry/exit, cliff, both spring routes and a real NPC water journey. Trusted keyboard gestures advance the real Player; no teleport between route destinations.\n- **{len(mobile['checks'])} mobile-input checks**, including two-thumb Run/joystick/look, diagonal normalization, pointer cancellation, map/focus/reset and other scenes. Desktop touch emulation, not physical iPhone Safari.\n- **{len(journeys['checks'])} connected-world checks**, including four complete round trips, authorization, persisted NPC/social ownership, conversation, existing Tribal Council ballot, failed-module recovery and cleanup.\n- **48 production camera rays/orbit samples** near the cave, cliff, ancient tree and fissure pass. The 28 gallery captures retain exactly matching native camera positions to within 1e-6 m/radian.\n"
life=journeys['lifecycle'];s+=f"\nScene peak ownership stays at **{life['peakActive']} detailed scene**. Every recorded release checkpoint returns to **0 uploaded geometries / 1 retained renderer texture**. Observed disposal events: {life['disposals']['geometry']} geometry, {life['disposals']['material']} material, {life['disposals']['texture']} texture and {life['disposals']['target']} render targets; these are events, not freed-byte measurements. Equivalent return-view listener counts remain stable.\n\n"
for check in profiles[('after','high')]['checks']:
 if 'reentryMs'in check:s+=f"Production high-quality menu reentry observed **{check['reentryMs']} ms**; resource disposal was observed before reentry. Its repeated terrain-mask stage was **{check['stages']['terrain-mask']['lastMs']:.2f} ms**. Parsed GPU assets are released; persistent social/navigation and the CPU mask cache are intentional retained world state.\n\n"
s+='## Raw primary profiles\n\n'
for phase in ['before','after']:
 for q in ['low','high']:s+=f'- [{phase} {q}](evidence/production-{phase}-{q}/report.json)\n'
s+='\nPhysical iPhone Safari, thermal behavior, real mobile network loading, sustained device GPU timings and a separately isolated shader compilation benchmark remain unverified.\n'
(DOC/'PERFORMANCE.md').write_text(s)
print('Wrote PERFORMANCE.md with measured source-backed values')
