"""Acquire the small CC0 Camp source kit. Source bytes are MD5 checked.
Run python tools/camp/acquire.py /tmp/tonsai-production/sources
Only optimized exports are shipped. No account, paid asset or API key required.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib, json, sys, urllib.request, time
from PIL import Image

OUT = Path(sys.argv[1])
MODELS = ['boulder_01', 'island_tree_02']
TEXTURES = ['sand_02', 'brown_mud_leaves_01']
HEADERS = {'User-Agent': 'SurvivorIslandCampAssetPipeline/1.0'}

def fetch(url):
    for attempt in range(4):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=180).read()
        except Exception:
            if attempt == 3: raise
            time.sleep(1)

def asset(name):
    folder = OUT / name
    folder.mkdir(parents=True, exist_ok=True)
    data = json.loads(fetch('https://api.polyhaven.com/files/' + name))
    info = json.loads(fetch('https://api.polyhaven.com/info/' + name))
    (folder/'source-api.json').write_text(json.dumps(data, indent=2))
    (folder/'info.json').write_text(json.dumps(info, indent=2))
    if name in MODELS:
        gltf = data['gltf']['1k']['gltf']
        files = [(name+'.gltf', gltf), *gltf['include'].items()]
        if name=='island_tree_02': files.append(('textures/leaves-alpha.png', data['leaves_alpha']['1k']['png']))
    else:
        files = [(name+'-diff.jpg',data['Diffuse']['1k']['jpg']),
                 (name+'-normal.jpg',data['nor_gl']['1k']['jpg'])]
    manifest = []
    for filename, meta in files:
        path = folder / filename
        if '..' in Path(filename).parts or Path(filename).is_absolute(): raise ValueError(filename)
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists() or hashlib.md5(path.read_bytes()).hexdigest() != meta['md5']:
            content = fetch(meta['url'])
            if hashlib.md5(content).hexdigest() != meta['md5']: raise ValueError('hash mismatch: '+filename)
            path.write_bytes(content)
        manifest.append({'file': filename, **meta})
    if name=='island_tree_02':
        diffuse=Image.open(folder/'textures/island_tree_02_leaves_diff_1k.jpg').convert('RGBA')
        diffuse.putalpha(Image.open(folder/'textures/leaves-alpha.png').convert('L'))
        diffuse.save(folder/'textures/leaves-rgba.png')
    print(name, 'verified', sum(f['size'] for f in manifest), flush=True)
    return {'id':name,'source':'https://polyhaven.com/a/'+name,'license':'CC0-1.0','authors':info.get('authors'), 'files':manifest}

with ThreadPoolExecutor(max_workers=5) as pool:
    manifest = list(pool.map(asset, MODELS+TEXTURES))
(OUT/'manifest.json').write_text(json.dumps(manifest, indent=2))
