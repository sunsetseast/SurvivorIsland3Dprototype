"""Label and resize genuine captures; originals remain unchanged."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[3]
root = ROOT / 'docs/tonsai-atmosphere'
ev = root / 'evidence'
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 17)
names = ['west-beach','ocean-horizon','sky-upward','campfire-shelter','jungle-edge','deep-jungle',
         'limestone-beach','limestone-close','freshwater-spring','jungle-trail','shoreline','elevated-overview']
for quality in ['low', 'high']:
    for start in [0, 6]:
        canvas = Image.new('RGB', (1024, 6*238+34), '#131c23')
        draw = ImageDraw.Draw(canvas)
        draw.text((12,8), f'{quality.upper()} — PR18 BEFORE (left) / ATMOSPHERE AFTER (right)', font=font, fill='white')
        for row, name in enumerate(names[start:start+6]):
            y = 34+row*238
            draw.text((12,y), name.replace('-',' ').title(), font=font, fill='white')
            for col, phase in enumerate(['before','after']):
                im = Image.open(ev / phase / f'{quality}-{name}.jpg')
                im.thumbnail((512,207))
                canvas.paste(im,(col*512,y+26))
        canvas.save(root / f'comparison-{quality}-{1+start//6}.jpg', quality=87)
canvas = Image.new('RGB',(1200,1040),'#131c23')
draw = ImageDraw.Draw(canvas)
for i, phase in enumerate(['before','after']):
    draw.text((12,i*520+4), f'{phase.upper()} · actual production WebGL', font=font, fill='white')
    im = Image.open(ev / phase / 'high-sky-upward.jpg')
    im.thumbnail((1200,485))
    canvas.paste(im,(0,i*520+26))
canvas.save(root / 'sky-comparison.jpg', quality=89)
