"""Designed Tonsai divider: named peaks, recessed chambers, fluted buttresses.
The low walking envelope is the PR11 field; above it the ridge composition is
redesigned, rather than increasing random displacement on the old level cap.
Run with Python numpy/scikit-image, then tools/blender/hero.py in Blender 4.5.
"""
from pathlib import Path
import json, numpy as np
from skimage.measure import marching_cubes
ROOT=Path(__file__).resolve().parents[2]
OUT=Path('/tmp/tonsai-hero');OUT.mkdir(exist_ok=True)
k=json.loads((ROOT/'tools/tonsai/footprints.json').read_text())[0]
design=json.loads((ROOT/'tools/tonsai/hero-design.json').read_text())
step=1.65;p=k['outline'];s=k['seed']
xs=np.arange(min(a['x'] for a in p)-30,max(a['x'] for a in p)+31,step,dtype=np.float32)
zs=np.arange(min(a['z'] for a in p)-30,max(a['z'] for a in p)+31,step,dtype=np.float32)
ys=np.arange(-8,207,step,dtype=np.float32)
x,z=np.meshgrid(xs,zs,indexing='ij');d=np.full(x.shape,1e9,np.float32);inside=np.zeros(x.shape,bool)
for a,b in zip(p,p[1:]+p[:1]):
 dx=b['x']-a['x'];dz=b['z']-a['z'];t=np.clip(((x-a['x'])*dx+(z-a['z'])*dz)/(dx*dx+dz*dz),0,1)
 d=np.minimum(d,np.hypot(x-a['x']-t*dx,z-a['z']-t*dz))
 inside^=((a['z']>z)!=(b['z']>z)) & (x<dx*(z-a['z'])/(dz+1e-20)+a['x'])
sd=np.where(inside,-d,d)
def noise(x,y,z):
 return np.sin(x*.039+z*.021+s)*np.cos(z*.043-y*.052)+.47*np.sin(x*.103-y*.091+np.sin(z*.072)*1.7)+.23*np.cos(z*.231+x*.173+y*.137)
oldtop=5+k['height']*(.78+.085*np.sin(x*.013+s)*np.cos(z*.011)+.055*np.sin(x*.031+z*.022+s))
# Five intentionally composed masses and two deep saddles, in metres.
top=np.full(x.shape,22.,np.float32)
for a in design['peaks']:
 q=((x-a['x'])/a['rx'])**2+((z-a['z'])/a['rz'])**2
 top=np.maximum(top,a['height']*np.exp(-q*.49))
top-=17*np.exp(-((x+316)/28)**2-((z+654)/34)**2)
top-=22*np.exp(-((x+220)/35)**2-((z+485)/31)**2)
top+=5.2*np.sin(x*.13+np.sin(z*.071))*np.sin(z*.094)
volume=np.empty((len(xs),len(ys),len(zs)),np.float32)
for j,y in enumerate(ys):
 fade=np.clip((y-3)/13,0,1)*np.clip((oldtop-y)/18,0,1)
 erosion=3.1*noise(x,y,z)+1.8*(2/np.pi*np.arcsin(np.sin(x*.081+z*.067+y*.05+s)))
 bedding=.65*(2/np.pi*np.arcsin(np.sin(y*.09+x*.017+z*.022)))+.4*np.sin(y*.39+x*.04)
 lobe=13*np.maximum(0,np.sin(x*.024+z*.031+s))**2*np.exp(-((y-38)/24)**2)
 niche=17*np.maximum(0,np.sin(x*.058-z*.033+s))**4*np.exp(-((y-15)/10)**2)
 oldside=sd-fade*(erosion+bedding+lobe-niche)+np.exp(-((y-4)/5)**2)*1.3
 oldside+=np.maximum(0,1-np.abs(np.sin(x*.018+z*.032+y*.006+s))*13)*4.5*fade
 oldside+=np.maximum(0,1-np.abs(np.sin(y*.047+x*.013+z*.021+s))*16)*3.5*fade
 # Upper masses lean inland, with pronounced buttresses and quiet faces between.
 taper=np.maximum(0,y-42)*.075
 flutes=5.5*np.sin(x*.097+z*.076+np.sin(y*.025)*.5)+2.5*np.sin(x*.21-z*.15+y*.018)
 # Dissolution slots stay predominantly vertical; their sharp V sections contrast
 # with projecting convex masses, rather than making a smooth melted surface.
 rill=8*np.maximum(0,1-np.abs(np.sin(x*.115+z*.082+np.sin(y*.017)*.26))*4.2)**1.3
 fracture=2.4*np.maximum(0,1-np.abs(np.sin(y*.20+x*.026+z*.02))*7)
 shelves=3.8*np.sin(y*.11+z*.016+x*.007)+1.1*np.sin(y*.29+z*.03)
 newside=sd+taper-flutes-shelves+rill+fracture-noise(x*1.3,y*.8,z*1.3)*1.4
 blend=np.clip((y-8)/18,0,1);blend=blend*blend*(3-2*blend)
 side=oldside*(1-blend)+newside*blend
 body=np.maximum(np.maximum(side,y-top),-y-4)
 for a in design['recesses']:
  # Negative ellipsoids open into exposed western face; retained roofs form shelves.
  pocket=(np.sqrt(((x-a['x'])/a['rx'])**2+((y-a['y'])/a['ry'])**2+((z-a['z'])/a['rz'])**2)-1)*min(a['rx'],a['ry'],a['rz'])
  body=np.maximum(body,-pocket)
 volume[:,j,:]=body
verts,faces,_,_=marching_cubes(volume,0,spacing=(step,step,step),allow_degenerate=False)
verts+=np.array([xs[0],ys[0],zs[0]])
np.savez_compressed(OUT/'hero.npz',vertices=verts,faces=faces)
print('Designed hero',len(faces),'source triangles',flush=True)
