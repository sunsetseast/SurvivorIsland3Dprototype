"""Repack exported GLBs with web-sized images; preserves all vertex/UV data.
python tools/camp/pack.py /tmp/tonsai-production/sources
"""
from pathlib import Path
from PIL import Image
import json,struct,io,hashlib,sys,shutil
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'artifacts/survivor-camp-prototype/src/assets/camp'
report=[]
build=json.loads((OUT/'build-manifest.json').read_text())
export_bytes={a['file']:a['bytes']for a in build['assets']if 'file'in a}
for path in sorted(OUT.glob('*.glb')):
    raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+n]);data=raw[28+n:]
    if doc.get('asset',{}).get('extras',{}).get('campPacked')==2:
        report.append({'file':path.name,'bytes':len(raw),'sourceExportBytes':export_bytes[path.name],'sha256':hashlib.sha256(raw).hexdigest()});continue
    new=bytearray();images={im['bufferView']:im for im in doc.get('images',[]) if 'bufferView'in im}
    for i,v in enumerate(doc['bufferViews']):
        blob=data[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
        if i in images:
            im=Image.open(io.BytesIO(blob));name=images[i].get('name','')
            limit=1024 if ('rgba'in name or (path.stem=='limestone' and 'diff'in name)) else 512
            im.thumbnail((limit,limit));b=io.BytesIO()
            if im.mode=='RGBA' and im.getextrema()[3][0]<255: im.save(b,format='PNG',optimize=True);images[i]['mimeType']='image/png'
            else: im.convert('RGB').save(b,format='JPEG',quality=84,optimize=True);images[i]['mimeType']='image/jpeg'
            blob=b.getvalue()
        while len(new)%4:new.append(0)
        v['byteOffset']=len(new);v['byteLength']=len(blob);new.extend(blob)
    while len(new)%4:new.append(0)
    doc['buffers'][0]['byteLength']=len(new)
    doc['asset'].setdefault('extras',{})['campPacked']=2
    js=json.dumps(doc,separators=(',',':')).encode()
    while len(js)%4:js+=b' '
    path.write_bytes(struct.pack('<III',0x46546c67,2,28+len(js)+len(new))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(new),0x004e4942)+new)
    report.append({'file':path.name,'bytes':path.stat().st_size,'sourceExportBytes':export_bytes[path.name],'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
src=Path(sys.argv[1])
for a in ['sand_02','brown_mud_leaves_01']:
    for suffix in ['diff','normal']:
        im=Image.open(src/a/(a+'-'+suffix+'.jpg'))
        if suffix=='normal':im.thumbnail((512,512))
        im.save(OUT/(a+'-'+suffix+'.jpg'),quality=86,optimize=True)
provenance=json.loads((src/'manifest.json').read_text())
(OUT/'provenance.json').write_text(json.dumps([p for p in provenance if p['id']!='coast_rocks_02'],indent=2))
(OUT/'transfer-manifest.json').write_text(json.dumps(report,indent=2))
source=ROOT/'tools/camp/source';source.mkdir(exist_ok=True)
if (OUT/'camp-kit.blend').exists():shutil.move(OUT/'camp-kit.blend',source/'camp-kit.blend')
print(json.dumps(report,indent=2))
