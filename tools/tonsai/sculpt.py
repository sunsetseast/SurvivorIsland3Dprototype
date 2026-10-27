"""Original volumetric karst sculpt. Python numpy + scikit-image; metres, Y-up.

An implicit solid, not polygon ring extrusion: multi-axis erosion, sloping bedding,
finite recessed alcoves and undercut bases are sampled as a 3-D volume. Blender
then performs topology reduction and exports both LODs. Reference photos are
never sampled or redistributed. MIT, original art.
"""
from pathlib import Path
import json, sys
import numpy as np
from skimage.measure import marching_cubes

ROOT=Path(__file__).resolve().parents[2]
OUT=Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/tonsai-sculpt'); OUT.mkdir(parents=True,exist_ok=True)
defs=json.loads((ROOT/'tools/tonsai/footprints.json').read_text())
def noise(x,y,z,seed):
    return (np.sin(x*.039+z*.021+seed)*np.cos(z*.043-y*.052)
        +.47*np.sin(x*.103-y*.091+np.sin(z*.072)*1.7)
        +.23*np.cos(z*.231+x*.173+y*.137))
for k in defs:
    p=k['outline']; seed=k['seed']; step=2.4
    xs=np.arange(min(a['x'] for a in p)-30,max(a['x'] for a in p)+31,step,dtype=np.float32)
    zs=np.arange(min(a['z'] for a in p)-30,max(a['z'] for a in p)+31,step,dtype=np.float32)
    ys=np.arange(-8,k['height']+35,step,dtype=np.float32)
    x,z=np.meshgrid(xs,zs,indexing='ij'); d=np.full(x.shape,1e9,np.float32);inside=np.zeros(x.shape,bool)
    for a,b in zip(p,p[1:]+p[:1]):
        dx=b['x']-a['x'];dz=b['z']-a['z'];t=np.clip(((x-a['x'])*dx+(z-a['z'])*dz)/(dx*dx+dz*dz),0,1)
        d=np.minimum(d,np.hypot(x-a['x']-t*dx,z-a['z']-t*dz))
        inside^=((a['z']>z)!=(b['z']>z)) & (x<(b['x']-a['x'])*(z-a['z'])/(b['z']-a['z']+1e-20)+a['x'])
    sd=np.where(inside,-d,d)
    # Match existing authored terrain crown elevations, rather than introducing a
    # detached scenic mountain. The 14m terrain ramp is hidden under this solid.
    top=5+k['height']*(.78+.085*np.sin(x*.013+seed)*np.cos(z*.011)+.055*np.sin(x*.031+z*.022+seed))
    volume=np.empty((len(xs),len(ys),len(zs)),np.float32)
    for j,y in enumerate(ys):
        # Base starts at the preserved outline. Bulges/alcoves begin above walking
        # height; the outer foot never advances into the beach or inland trail.
        fade=np.clip((y-3)/13,0,1)*np.clip((top-y)/18,0,1)
        erosion=3.1*noise(x,y,z,seed)+1.8*(2/np.pi*np.arcsin(np.sin(x*.081+z*.067+y*.05+seed)))
        bedding=.65*(2/np.pi*np.arcsin(np.sin(y*.09+x*.017+z*.022)))+.4*np.sin(y*.39+x*.04)
        # Finite tufa lobes and concave pockets, different phase on each massif.
        lobe=13*np.maximum(0,np.sin(x*.024+z*.031+seed))**2*np.exp(-((y-38)/24)**2)
        niche=17*np.maximum(0,np.sin(x*.058-z*.033+seed))**4*np.exp(-((y-15)/10)**2)
        side=sd-fade*(erosion+bedding+lobe-niche)+np.exp(-((y-4)/5)**2)*1.3
        # Jagged dissolution slots change direction with height; no uniform ribs.
        slot=np.maximum(0,1-np.abs(np.sin(x*.018+z*.032+y*.006+seed))*13)*4.5*fade
        side+=slot+np.maximum(0,1-np.abs(np.sin(y*.047+x*.013+z*.021+seed))*16)*3.5*fade
        cap=y-top+noise(x*.4,y*.3,z*.4,seed)*1.1
        volume[:,j,:]=np.maximum(np.maximum(side,cap),-y-4)
    verts,faces,normals,_=marching_cubes(volume,0,spacing=(step,step,step),allow_degenerate=False)
    verts+=np.array([xs[0],ys[0],zs[0]])
    np.savez_compressed(OUT/(k['id']+'.npz'),vertices=verts,faces=faces)
    print(k['id'],len(verts),'vertices',len(faces),'triangles',flush=True)
