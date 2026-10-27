import xml.etree.ElementTree as E,json,math
from pathlib import Path
r=E.parse('/workspace/scratch/8be3f64da88a/source-1.txt').getroot();ns={n.attrib['id']:[float(n.attrib['lon']),float(n.attrib['lat'])] for n in r.findall('node')};ways=[];coast=[]
for w in r.findall('way'):
 t={v.attrib['k']:v.attrib['v'] for v in w.findall('tag')};nd=[n.attrib['ref'] for n in w.findall('nd')]
 if t.get('natural') in ['coastline','cliff','water','beach']:
  obj={'id':int(w.attrib['id']),'version':int(w.attrib['version']),'tags':t,'coordinates':[ns[n] for n in nd]};ways.append(obj)
  if t.get('natural')=='coastline':coast.append(nd)
chains=[]
while coast:
 chain=coast.pop(0);change=True
 while change and chain[0]!=chain[-1]:
  change=False
  for k,c in enumerate(coast):
   if chain[-1]==c[0]:chain+=c[1:]
   elif chain[-1]==c[-1]:chain+=c[-2::-1]
   elif chain[0]==c[-1]:chain=c[:-1]+chain
   elif chain[0]==c[0]:chain=c[:0:-1]+chain
   else:continue
   coast.pop(k);change=True;break
 chains.append([ns[n] for n in chain])
chains.sort(key=len,reverse=True)
print('chains',[(len(a),a[0],a[-1]) for a in chains])
# Close only the extraction cut on mainland; all coastal vertices are preserved.
a=chains[0];a += [[a[-1][0],8.060],[a[0][0],8.060],a[0]]
def clip(poly,axis,value,less):
 out=[]
 for i,p in enumerate(poly):
  prev=poly[i-1];inside=(p[axis]<=value if less else p[axis]>=value);pin=(prev[axis]<=value if less else prev[axis]>=value)
  if inside!=pin:
   t=(value-prev[axis])/(p[axis]-prev[axis]);out.append([prev[j]+t*(p[j]-prev[j]) for j in range(2)])
  if inside:out.append(p)
 return out
for axis,val,less in [(1,8.060,True),(0,98.860,True)]:a=clip(a,axis,val,less)
features=[]
for n in r.findall('node'):
 t={v.attrib['k']:v.attrib['v'] for v in n.findall('tag')}
 if t.get('natural') in ['peak','cave_entrance'] or t.get('tourism')=='viewpoint':features.append({'id':int(n.attrib['id']),'coordinates':ns[n.attrib['id']],'tags':t})
raw={'license':'Open Database License 1.0','attribution':'© OpenStreetMap contributors','retrieved':'2026-10-27','endpoint':'https://api.openstreetmap.org/api/0.6/map?bbox=98.825,7.998,98.853,8.026','ways':ways,'points':features}
Path('data/railay/osm-natural-features.json').write_text(json.dumps(raw,ensure_ascii=False,indent=2))
geo={'origin':[98.838,8.011],'radius':6371008.8,'mainland':a,'islets':[p for p in chains[1:] if p[0]==p[-1] and min(x[1] for x in p)>8.001 and max(x[1] for x in p)<8.01],'lagoon':next(w['coordinates'] for w in ways if w['id']==193757084),'cliffs':[w for w in ways if w['tags'].get('natural')=='cliff']}
Path('artifacts/survivor-camp-prototype/src/game/railay/geography.json').write_text(json.dumps(geo,separators=(',',':')))
