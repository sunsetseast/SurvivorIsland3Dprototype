"""Optimize inspected CC0 Poly Haven candidates. Source acquisition documented
in docs/tonsai-hero/ASSETS.md. ASSET_SOURCE defaults to /tmp/asset-candidates.
"""
import bpy,os,json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/survivor-camp-prototype/src/assets/tonsai';SRC=Path(os.environ.get('ASSET_SOURCE','/tmp/asset-candidates'))
manifest=[]
for asset,filename,budget in [('coast_rocks_05','coast.gltf',2400),('fern_02','fern.gltf',700)]:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(SRC/asset/filename))
 if asset=='fern_02':
  # Restore separate CC0 alpha into the downloaded JPEG diffuse before export.
  rgba=bpy.data.images.load(str(SRC/asset/'textures/fern-rgba.png'))
  for mat in bpy.data.materials:
   if mat.use_nodes:
    for node in mat.node_tree.nodes:
     if node.type=='TEX_IMAGE' and node.image and 'diff' in node.image.name:node.image=rgba
 # Texture resolution selected deliberately: shared 512 maps with alpha preserved.
 for im in bpy.data.images:
  if im.size[0]>512:im.scale(512,512)
 for o in bpy.context.scene.objects:
  if o.type!='MESH':continue
  bpy.context.view_layer.objects.active=o
  # Existing high/low candidate parts are independent fern crown silhouettes.
  count=sum(len(p.vertices)-2 for p in o.data.polygons)
  if count>budget:
   mod=o.modifiers.new('mobile-optimized','DECIMATE');mod.ratio=budget/count;bpy.ops.object.modifier_apply(modifier=mod.name)
  manifest.append({'asset':asset,'name':o.name,'sourceTriangles':count,'triangles':sum(len(p.vertices)-2 for p in o.data.polygons)})
  if asset=='coast_rocks_05':
   # Center the scanned rock, normalize to unit XY extent for radius-compatible collisions.
   xs=[v.co.x for v in o.data.vertices];ys=[v.co.y for v in o.data.vertices];zs=[v.co.z for v in o.data.vertices]
   cx=(max(xs)+min(xs))/2;cy=(max(ys)+min(ys))/2;scale=max(max(xs)-min(xs),max(ys)-min(ys))/2
   for v in o.data.vertices:v.co.x=(v.co.x-cx)/scale;v.co.y=(v.co.y-cy)/scale;v.co.z=(v.co.z-min(zs))/scale
 for m in bpy.data.materials:
  m.use_backface_culling=False
  if asset=='fern_02':m.alpha_threshold=.42
 f=OUT/f'{asset}.glb';bpy.ops.export_scene.gltf(filepath=str(f),export_format='GLB',export_yup=True,export_materials='EXPORT',export_image_format='AUTO')
 manifest.append({'file':f.name,'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
(OUT/'coastal-manifest.json').write_text(json.dumps(manifest,indent=2))
