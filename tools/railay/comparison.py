"""Pair licensed OSM vectors with the actual north-up game/WebGL capture."""
from pathlib import Path
import json,math
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[2];d=ROOT/'docs/railay/evidence';j=json.loads((ROOT/'artifacts/survivor-camp-prototype/src/game/railay/geography.json').read_text());R=j['radius'];lon0,lat0=j['origin']
def project(p):return ((p[0]-lon0)*math.pi/180*R*math.cos(lat0*math.pi/180),(lat0-p[1])*math.pi/180*R)
f=900/(2*math.tan(math.radians(24)))
def pixel(p):x,z=project(p);return (640+(x+110)/3000*f,450+z/3000*f)
shot=Image.open(d/'02-overhead-coastline.jpg').convert('RGB');overlay=ImageDraw.Draw(shot)
ref=Image.new('RGB',(1280,900),'#194753');v=ImageDraw.Draw(ref)
for p in [j['mainland']]+j['islets']:
 pts=[pixel(a) for a in p];v.polygon(pts,fill='#729577');v.line(pts+[pts[0]],fill='#f1d9a2',width=3);overlay.line(pts+[pts[0]],fill='#85ffed',width=2)
v.polygon([pixel(a) for a in j['lagoon']],fill='#4f9e92')
fontpath='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';font=ImageFont.truetype(fontpath,25);small=ImageFont.truetype(fontpath,21)
for coords,label in [((98.83335,8.01675),'Tonsai'),((98.8375,8.01125),'Railay West'),((98.8413,8.01015),'Railay East'),((98.8387,8.00515),'Phra Nang'),((98.84265,8.0048),'Lagoon')]:
 x,y=pixel(coords);v.ellipse((x-4,y-4,x+4,y+4),fill='#fff7da');v.text((x+9,y-10),label,font=small,fill='#fff4d1',stroke_width=1,stroke_fill='#203e3b')
v.text((45,40),'N ↑',font=font,fill='#fff4d1')
out=Image.new('RGB',(2560,1045),'#102b2c');out.paste(ref,(0,80));out.paste(shot,(1280,80));g=ImageDraw.Draw(out);g.text((30,20),'SOURCE · OpenStreetMap coastline vectors',font=font,fill='white');g.text((1310,20),'GAME · Actual WebGL + source outline in cyan',font=font,fill='white');g.text((30,995),'© OpenStreetMap contributors · ODbL | 6 m game terrain lattice | Authored elevations; no survey-level fidelity claim',font=small,fill='#d5dfcf');out.save(d/'20-geographical-reference-comparison.jpg',quality=94)
