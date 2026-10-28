"""Acquire only the two documented CC0 source models, with API MD5 verification.
python3 tools/tonsai/acquire-hero-assets.py [/tmp/asset-candidates]
Internet required for regeneration only. The shipped game uses repository assets.
"""
import json,sys,urllib.request,hashlib
from pathlib import Path
from PIL import Image
out=Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/asset-candidates')
headers={'User-Agent':'SurvivorIslandAssetProduction/1.0'}
for asset,filename in [('coast_rocks_05','coast.gltf'),('fern_02','fern.gltf')]:
 req=urllib.request.Request('https://api.polyhaven.com/files/'+asset,headers=headers)
 data=json.load(urllib.request.urlopen(req,timeout=60));gltf=data['gltf']['1k']['gltf']
 files=[(filename,gltf),*gltf['include'].items()]
 if asset=='fern_02':files.append(('textures/fern-alpha.png',data['Alpha']['1k']['png']))
 for name,meta in files:
  target=out/asset/name
  if '..' in Path(name).parts or Path(name).is_absolute():raise ValueError(name)
  target.parent.mkdir(parents=True,exist_ok=True)
  b=urllib.request.urlopen(urllib.request.Request(meta['url'],headers=headers),timeout=120).read()
  if hashlib.md5(b).hexdigest()!=meta['md5']:raise ValueError('Source hash mismatch: '+name)
  target.write_bytes(b)
 (out/asset/'source-api.json').write_text(json.dumps(data,indent=2))
 if asset=='fern_02':
  p=out/asset/'textures';im=Image.open(p/'fern_02_diff_1k.jpg').convert('RGBA');im.putalpha(Image.open(p/'fern-alpha.png').convert('L'));im.save(p/'fern-rgba.png')
 print(asset,'verified',flush=True)
