"""Original alpha-cutout botanical textures, painted mathematically; no downloaded imagery."""
from PIL import Image,ImageDraw,ImageFilter
from pathlib import Path
import math,random
root=Path(__file__).resolve().parents[2]/'artifacts/survivor-camp-prototype/src/assets/railay';root.mkdir(parents=True,exist_ok=True)
r=random.Random(892)
def leaf(d,x,y,length,width,a,col):
 pts=[]
 for j in range(21):
  t=j/20;u=(t-.5)*length;v=math.sin(t*math.pi)**.8*width
  pts.append((x+math.cos(a)*u-math.sin(a)*v,y+math.sin(a)*u+math.cos(a)*v))
 for j in range(20,-1,-1):
  t=j/20;u=(t-.5)*length;v=-math.sin(t*math.pi)**.8*width
  pts.append((x+math.cos(a)*u-math.sin(a)*v,y+math.sin(a)*u+math.cos(a)*v))
 d.polygon(pts,fill=col)
 d.line([(x-math.cos(a)*length*.43,y-math.sin(a)*length*.43),(x+math.cos(a)*length*.43,y+math.sin(a)*length*.43)],fill=(col[0]+13,col[1]+19,col[2]+6,255),width=1)
im=Image.new('RGBA',(512,512));d=ImageDraw.Draw(im)
for j in range(21):
 a=r.random()*math.tau;rr=r.random()**.5*175;x=256+math.cos(a)*rr;y=260+math.sin(a)*rr*.8
 d.line([(250,420),(x,y)],fill=(77,69,32,255),width=4)
for i in range(460):
 a=r.random()*math.tau;rr=r.random()**.5;x=256+math.cos(a)*rr*219;y=251+math.sin(a)*rr*203
 bright=r.randint(-10,24)+int((1-rr)*6)
 leaf(d,x,y,r.uniform(22,52),r.uniform(7,14),r.random()*math.tau,(39+bright,78+bright,21+bright//2,255))
im.save(root/'broadleaf.png')
im=Image.new('RGBA',(512,512));d=ImageDraw.Draw(im)
for j in range(7):
 a=-math.pi/2+(j-3)*.35;length=330-r.random()*70
 ex=256+math.cos(a)*length;ey=460+math.sin(a)*length
 d.line([(256,460),(ex,ey)],fill=(73,107,34,255),width=3)
 for k in range(3,17):
  t=k/18;x=256+math.cos(a)*length*t;y=460+math.sin(a)*length*t
  for side in [-1,1]:
   ll=(1-t)*73+7;angle=a+side*1.1
   leaf(d,x+math.cos(angle)*ll*.4,y+math.sin(angle)*ll*.4,ll,6,angle,(44+k,91+k*2,27,255))
im.save(root/'fern.png')
