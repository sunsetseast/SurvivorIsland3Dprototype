"""Original sunlit broadleaf alpha atlas. MIT. No photographic inputs."""
from PIL import Image,ImageDraw,ImageFilter
from pathlib import Path
import random,math
r=random.Random(8817);im=Image.new('RGBA',(512,512));d=ImageDraw.Draw(im)
for i in range(240):
 a=r.random()*math.tau;rr=r.random()**.5;x=256+math.cos(a)*rr*220;y=250+math.sin(a)*rr*203
 length=r.uniform(26,63);width=r.uniform(8,18);angle=r.random()*math.tau
 bright=r.randint(-15,35)-int(rr*10);col=(102+bright,137+bright,52+bright//2,255)
 pts=[]
 for side in [1,-1]:
  for j in (range(17) if side==1 else range(16,-1,-1)):
   t=j/16;u=(t-.5)*length;v=math.sin(t*math.pi)**.8*width*side
   pts.append((x+math.cos(angle)*u-math.sin(angle)*v,y+math.sin(angle)*u+math.cos(angle)*v))
 d.polygon(pts,fill=col)
 d.line([(x-math.cos(angle)*length*.45,y-math.sin(angle)*length*.45),(x+math.cos(angle)*length*.45,y+math.sin(angle)*length*.45)],fill=(col[0]+20,col[1]+20,col[2]+12,255),width=1)
 # lighter sunward half, retaining a painted midrib and off-centre leaf point
 d.line([(x,y),(x+math.cos(angle)*length*.35,y+math.sin(angle)*length*.35)],fill=(col[0]+29,col[1]+24,col[2]+14,255),width=2)
root=Path(__file__).resolve().parents[2]/'artifacts/survivor-camp-prototype/src/assets/tonsai';im.save(root/'canopy.png')
