"""Bake a reusable branch spray from existing licensed Poly Haven leaf photos.
No downloaded press photos, AI renders, new network requests, or runtime baking.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import json, struct, io, random
ROOT=Path(__file__).resolve().parents[3]
base=ROOT/'artifacts/survivor-camp-prototype/src/assets/camp'
b=(base/'coastal-tree.glb').read_bytes();n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);im=next(i for i in j['images'] if i.get('name')=='leaves-rgba');v=j['bufferViews'][im['bufferView']]
atlas=Image.open(io.BytesIO(b[28+n+v['byteOffset']:28+n+v['byteOffset']+v['byteLength']])).convert('RGBA')
leaf=atlas.crop((168,4,344,430));out=Image.new('RGBA',(1024,1024));draw=ImageDraw.Draw(out);R=random.Random(18)
# Deliberately asymmetrical secondary twigs, in the structure of a broadleaf spray.
for endx,endy,startx,starty in [(140,190,480,840),(370,65,490,860),(760,140,500,850),(930,490,500,850),(180,580,500,850)]:
 draw.line((startx,starty,endx,endy),fill=(94,92,58,255),width=10)
 for k in range(1,7):
  t=k/7;x=startx+(endx-startx)*t;y=starty+(endy-starty)*t
  for side in [-1,1]:
   sprig=leaf.resize((int(82+R.random()*30),int(165+R.random()*50)),Image.Resampling.LANCZOS)
   angle=(side*38+(endx-500)*.045)+R.uniform(-16,16)
   sprig=sprig.rotate(angle,Image.Resampling.BICUBIC,expand=True)
   px=int(x+side*(55+R.random()*25)-sprig.width/2);py=int(y-sprig.height*.68)
   out.alpha_composite(sprig,(px,py))
temporary=base/'canopy-spray.tmp.png'
out.save(temporary,optimize=True)
with Image.open(temporary) as check: check.verify()
temporary.replace(base/'canopy-spray.png')
print('Photographic canopy spray', (base/'canopy-spray.png').stat().st_size)
