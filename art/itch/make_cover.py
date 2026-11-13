"""
The itch.io cover (630x500 recommended, plus a 2x copy): a group shot of the
cars under the pack title on the game's dark garage colours.

    python art/itch/make_cover.py <models_dir> <out_dir>
"""
import os, sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

MODELS, OUT = sys.argv[1], sys.argv[2]
W, H = 1260, 1000                      # drawn at 2x, saved at 1x too
FONT = 'C:/Windows/Fonts/'

def font(name, size):
    try: return ImageFont.truetype(FONT + name, size)
    except OSError: return ImageFont.load_default()

def car(name, width):
    im = Image.open(os.path.join(MODELS, name, f'{name}_preview.png')).convert('RGBA')
    im = im.crop(im.getbbox())
    return im.resize((width, int(im.height * width / im.width)), Image.LANCZOS)

# backdrop: dark garage blue-grey, a floor glow, a yellow accent line
bg = Image.new('RGBA', (W, H), (22, 24, 30, 255))
d = ImageDraw.Draw(bg)
for y in range(H):                     # vertical gradient
    t = y / H
    d.line([(0, y), (W, y)], fill=(int(22 + 16 * t), int(24 + 17 * t), int(30 + 20 * t), 255))
glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(glow).ellipse([W * 0.08, H * 0.55, W * 0.92, H * 1.08], fill=(255, 200, 40, 46))
bg.alpha_composite(glow.filter(ImageFilter.GaussianBlur(60)))

# the group: back row small and high, the hero cars large in front
shots = [
    ('OffroadPickup', 440, 780, 360), ('BoxSUV', 360, 80, 385), ('SuperSUV', 380, 455, 355),
    ('MidEngineSports', 430, 45, 625), ('RearEngineGT', 440, 780, 625),
    ('RallySedan', 560, 350, 585),
]
for name, wdt, x, y in shots:
    im = car(name, wdt)
    shadow = Image.new('RGBA', im.size, (0, 0, 0, 0))
    shadow.putalpha(im.split()[3].point(lambda a: int(a * 0.55)))
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); sh.paste(shadow, (x + 14, y + 26), shadow)
    bg.alpha_composite(sh.filter(ImageFilter.GaussianBlur(14)))
    bg.alpha_composite(im, (x, y))

# title block
d = ImageDraw.Draw(bg)
d.rectangle([70, 70, 82, 238], fill=(255, 200, 40, 255))
d.text((104, 58), 'TUNECITY', font=font('impact.ttf', 132), fill=(255, 200, 40, 255))
d.text((108, 196), 'LOW-POLY CAR PACK', font=font('bahnschrift.ttf', 46), fill=(236, 236, 240, 255))
tag_font = font('segoeuib.ttf', 30)
x = 108
for label in ('12 CARS', 'GAME-READY', 'GLB · FBX · OBJ'):
    tw = d.textlength(label, font=tag_font)
    d.rounded_rectangle([x, 262, x + tw + 32, 308], radius=23, fill=(0, 0, 0, 150), outline=(255, 200, 40, 255), width=2)
    d.text((x + 16, 266), label, font=tag_font, fill=(255, 200, 40, 255))
    x += tw + 46

os.makedirs(OUT, exist_ok=True)
bg = bg.convert('RGB')
bg.save(os.path.join(OUT, 'cover_1260x1000.png'), optimize=True)
bg.resize((630, 500), Image.LANCZOS).save(os.path.join(OUT, 'cover_630x500.png'), optimize=True)
print('cover written')
