"""Original deterministic cloud impostor authoring (numpy/scipy/Pillow).
Bakes scattered, eroded density volumes and light extinction into one RGBA atlas.
No runtime raymarch, network assets or external imagery. Run from any directory.
"""
from pathlib import Path
import hashlib, json
import numpy as np
from scipy.ndimage import gaussian_filter
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'artifacts/survivor-camp-prototype/src/assets/camp'
W,H=1024,512
atlas=np.zeros((H,W,4),dtype=np.uint8)

def cloud(seed, azimuth):
    rng=np.random.default_rng(seed)
    z,y,x=np.meshgrid(np.linspace(-.9,.9,48),np.linspace(-.8,1.5,100),np.linspace(-2,2,224),indexing='ij')
    field=np.full_like(x,-3.)
    for i in range(11):
        cx=-1.25+i*.25+rng.uniform(-.14,.14)
        rx=rng.uniform(.38,.66); ry=rng.uniform(.30,.65)*(1.25-abs(cx)*.3)
        cy=-.38+ry+rng.uniform(-.07,.07); cz=rng.uniform(-.22,.22)
        rz=rng.uniform(.36,.63)
        d=1.-np.sqrt(((x-cx)/rx)**2+((y-cy)/ry)**2+((z-cz)/rz)**2)
        field=np.maximum(field,d)
    fbm=np.zeros_like(field)
    for sigma,weight in [(5.,.50),(2.1,.30),(.8,.20)]:
        n=gaussian_filter(rng.standard_normal(field.shape).astype(np.float32),sigma)
        n/=max(.001,n.std())
        fbm+=n*weight
    density=np.clip(field-.055+fbm*.11,0.,1.)*2.8
    top=np.cumsum(density[:,::-1,:],axis=1)[:,::-1,:]
    side=np.cumsum(density[:,:,::(-1 if np.sin(azimuth+2.12)>0 else 1)],axis=2)
    if np.sin(azimuth+2.12)>0: side=side[:,:,::-1]
    illumination=.34+.66*np.exp(-(top*.075+side*.018))
    opacity=1.-np.exp(-density*.32)
    transmission=np.exp(-np.concatenate([np.zeros_like(density[:1]),np.cumsum(density[:-1],axis=0)],axis=0)*.32)
    alpha=np.sum(opacity*transmission,axis=0)
    light=np.sum(opacity*transmission*illumination,axis=0)/np.maximum(.0001,alpha)
    # Image rows run downwards; the volume's Y axis runs upwards.
    rgba=np.stack([light,light,light,alpha],axis=-1)[::-1]
    return Image.fromarray(np.uint8(np.clip(rgba,0,1)*255),'RGBA')

# Centers in sky azimuth / elevation degrees, with varied angular silhouettes.
formations=[(28,28,116,118),(65,17,124,92),(100,44,144,158),(143,23,109,98),
            (185,37,162,168),(225,17,114,92),(266,49,140,150),(307,24,124,112),
            (345,36,120,136),(4,7,108,34),(116,8,92,32),(237,7,114,30),(330,8,96,34)]
canvas=Image.fromarray(atlas,'RGBA')
for i,(az,el,w,h) in enumerate(formations):
    sprite=cloud(19019+i,az*np.pi/180-np.pi).resize((w,h),Image.Resampling.LANCZOS)
    centerx=int(az/360*W);centery=int((1-el/90)*H)
    for wrap in [-W,0,W]: canvas.alpha_composite(sprite,(centerx-w//2+wrap,centery-h//2))
file=OUT/'tropical-clouds.png'
canvas.save(file,optimize=True)
(OUT/'tropical-clouds-manifest.json').write_text(json.dumps({
    'method':'Original seeded offline density-volume integration; no external image source',
    'dimensions':[W,H], 'formations':len(formations),'rgbaBytes':W*H*4,
    'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),
    'sourceSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    'dependencies': ['numpy','scipy','Pillow']
},indent=2)+'\n')
print(file.name,file.stat().st_size)
