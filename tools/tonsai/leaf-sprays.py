"""Original botanical spray atlas, four branching silhouettes; RGBA, MIT.
Physical leaf lamina, midrib and secondary veins; no third-party photographs.
"""
from PIL import Image,ImageDraw
from pathlib import Path
import random,math
r=random.Random(28149);im=Image.new('RGBA',(1024,1024));d=ImageDraw.Draw(im)
for cell in range(4):
 ox=(cell%2)*512;oy=(cell//2)*512
 for branch in range(7):
  bx=ox+256;by=oy+475
  ex=ox+68+branch*59+r.uniform(-20,20);ey=oy+r.uniform(35,160)
  d.line([(bx,by),(ex,ey)],fill=(71,79,29,255),width=4)
  for j in range(3,11):
   t=j/11;px=bx+(ex-bx)*t;py=by+(ey-by)*t
   for side in [-1,1]:
    angle=math.atan2(ey-by,ex-bx)+side*r.uniform(.6,1.3);length=r.uniform(38,67);w=length*r.uniform(.22,.31)
    x=px+math.cos(angle)*length*.45;y=py+math.sin(angle)*length*.45
    bright=r.randint(-13,22);col=(66+bright,106+bright,35+bright//2,255)
    pts=[]
    for s,seq in [(1,range(17)),(-1,range(16,-1,-1))]:
     for k in seq:
      u=k/16;along=(u-.5)*length;across=math.sin(u*math.pi)**.85*w*s
      pts.append((x+math.cos(angle)*along-math.sin(angle)*across,y+math.sin(angle)*along+math.cos(angle)*across))
    d.polygon(pts,fill=col)
    def point(u,v):return (x+math.cos(angle)*u-math.sin(angle)*v,y+math.sin(angle)*u+math.cos(angle)*v)
    d.line([point(-length*.47,0),point(length*.46,0)],fill=(105+bright,137+bright,52+bright//2,255),width=2)
    for vein in range(1,6):
     u=(vein/6-.5)*length
     for s in [-1,1]:d.line([point(u,0),point(u+length*.12,s*w*math.sin(vein/6*math.pi)*.8)],fill=(83+bright,119+bright,43,255),width=1)
ROOT=Path(__file__).resolve().parents[2];im.save(ROOT/'artifacts/survivor-camp-prototype/src/assets/tonsai/leaf-sprays.png',optimize=True)
