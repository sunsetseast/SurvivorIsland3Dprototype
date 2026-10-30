"""Verify matched real-camera captures and summarize measured resource changes."""
import json, subprocess, statistics
from pathlib import Path
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[3]
doc=root/'docs/tonsai-karst'
reports={p:json.loads((doc/f'evidence/{p}/report.json').read_text()) for p in ['before','after']}
assert all(r['result']=='PASS' and not r['errors'] for r in reports.values())
poses={p:{(v['quality'],v['name']):v for v in r['poses']} for p,r in reports.items()}
assert poses['before'].keys()==poses['after'].keys()
max_error=0
for key,a in poses['before'].items():
 b=poses['after'][key]
 if a['camera'].get('inspection'):
  assert a['camera']['position']==b['camera']['position']
  assert a['camera']['target']==b['camera']['target']
 else:
  for k in ['x','y','z','yaw','pitch']:
   max_error=max(max_error,abs(a['camera'][k]-b['camera'][k]))
  assert max_error<1e-6,(key,max_error)
 for phase in reports:
  im=Image.open(doc/f'evidence/{phase}/{key[0]}-{key[1]}.jpg')
  assert im.size==(932,430),(phase,key,im.size)
summary={'base':'5d54f29294833ef47494381b973c9db0d49f53c9','camera_pairs':len(poses['after']),
 'max_native_camera_error':max_error,'viewport':[932,430],'quality':{},'payload':{}}
for q in ['low','high']:
 data={}
 for phase,r in reports.items():
  s=next(x for x in r['samples'] if x['quality']==q)
  data[phase]={k:s[k] for k in ['calls','triangles','geometryBytes','textureBytesEstimate','readyMs']}
  data[phase]['host_frame_finish_median_ms']=statistics.median(s['softwareFrameFinishMs'])
 data['views']={}
 for name in ['south-beach','north-offshore','waterline','cliff-beside','distant-silhouette']:
  data['views'][name]={p:{k:poses[p][q,name]['render'][k] for k in ['calls','triangles']} for p in reports}
 summary['quality'][q]=data
for file in ['landmarks.glb','landmarks-low.glb']:
 rel='artifacts/survivor-camp-prototype/src/assets/camp/'+file
 before=subprocess.check_output(['git','show',summary['base']+':'+rel],cwd=root)
 summary['payload'][file]={'before':len(before),'after':(root/rel).stat().st_size}
(doc/'comparison.json').write_text(json.dumps(summary,indent=2)+'\n')
# A labeled contact sheet, assembled only from real production WebGL captures.
items=[('south-beach','Native third-person beach'),('coast-eye','Eye-height inspection'),('waterline','Native shoreline'),('elevated-overview','Elevated inspection')]
sheet=Image.new('RGB',(932*2, (430+36)*len(items)), '#151c20')
draw=ImageDraw.Draw(sheet)
for row,(name,label) in enumerate(items):
 for col,phase in enumerate(['before','after']):
  img=Image.open(doc/f'evidence/{phase}/high-{name}.jpg')
  y=row*466
  draw.text((col*932+12,y+10),f'{phase.upper()} — {label}',fill='white')
  sheet.paste(img,(col*932,y+36))
sheet.save(doc/'comparison.jpg',quality=92)
print(json.dumps(summary,indent=2))
