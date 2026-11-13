"""
Stack a car's game sprites the way CarStage does and write a still sheet plus GIFs.

    python art/blender/preview_states.py <car> <out_dir>
"""
import json, os, sys
from PIL import Image, ImageEnhance

CAR, OUTDIR = sys.argv[1], sys.argv[2]
D = f'src/assets/sprites/car_states/{CAR}/'
M = json.load(open(D + 'manifest.json'))['views']

def fr(view, layer, var, i=0):
    im = Image.open(f'{D}{view}/{layer}/{var}.png').convert('RGBA'); n = M[view]['layers'][layer][var]; w = im.width // n
    i %= n; return im.crop((i * w, 0, (i + 1) * w, im.height))

def faded(im, k):
    a = im.split()[3].point(lambda v: int(v * k)); out = im.copy(); out.putalpha(a); return out

def scene(look, idle=0, wheel=0, lid=False, lights=0.0, smoke=None, hoodsmoke=None, puff=None, fume=None, drop=0):
    c = Image.new('RGBA', (384, 256), (0, 0, 0, 255))
    for L, v, i in [('garage', 'base', 0), ('rollers', 'base', wheel), ('shadow', 'base', 0), ('tires', look['tires'], wheel),
                    ('brakes', look['brakes'], 0), ('rims', look['rims'], wheel)]:
        c.alpha_composite(fr('dyno', L, v, i))
    sp = Image.new('RGBA', (384, 256))
    layers = [('body', f"{look['body']}_{'open' if lid else 'closed'}", idle), ('exhaust', look['exhaust'], idle)]
    if look.get('fmic'): layers.append(('fmic', 'base', idle))
    if lid:
        layers.append(('engine', look['engine'], idle))
        if look.get('fi'): layers.append(('fi', look['fi'], idle))
        if look.get('intake'): layers.append(('intake', look['intake'], idle))
    for L, v, i in layers: sp.alpha_composite(fr('dyno', L, v, i))
    if lights: sp.alpha_composite(faded(fr('dyno', 'lights', 'base', idle), lights))
    if fume is not None: sp.alpha_composite(faded(fr('dyno', 'fumes', look['from'], fume), 0.7))
    if smoke is not None: sp.alpha_composite(fr('dyno', 'smoke_exhaust', look['from'], smoke))
    if hoodsmoke is not None: sp.alpha_composite(fr('dyno', 'smoke_hood', 'base', hoodsmoke))
    if puff is not None: sp.alpha_composite(fr('dyno', 'start_puff', look['from'], puff))
    c.alpha_composite(sp, (0, drop))
    return c

ENG = {'civic_eg': 'i4_honda', 'charger_69': 'v8_hemi', 'm4': 'i6_bmw', 'urus': 'v8_twin_turbo', 'corvette': 'v8_ls', 'camry': 'i4_honda',
       'hellcat': 'v8_blower', 'ram_trx': 'v8_hemi', 'wrx': 'flat_subaru', 'mystery_0e': 'v8_twin_turbo', 'mystery_88': 'v8_twin_turbo',
       'mystery_ae': 'flat_porsche'}[CAR]
stock = dict(body='body', tires='street_r15', rims='steel_15', brakes='stock', exhaust='stock', engine=ENG, intake='stock', fi=None, fmic=False, **{'from': 'rear'})
built = dict(body='body_fg', tires='slick_r18', rims='work_18', brakes='big_kit', exhaust='side', engine=ENG, intake='cone', fi='turbo_single', fmic=True, **{'from': 'side'})

stills = [scene(stock), scene(stock, lid=True, lights=1), scene(built, lid=True, lights=1, drop=2),
          scene(stock, smoke=4, lights=1, fume=3), scene(stock, hoodsmoke=6), scene(built, wheel=3, lights=1, fume=5, drop=2)]
sheet = Image.new('RGBA', (384 * 3, 256 * 2), (20, 20, 24, 255))
for k, im in enumerate(stills): sheet.paste(im, ((k % 3) * 384, (k // 3) * 256))
sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST).save(os.path.join(OUTDIR, f'{CAR}_states.png'))

FLICKER = [0, 0.85, 0.15, 1, 0.4, 0, 0.9, 0.25, 0.7, 0.05, 1, 0.5]
frames = []
for t in range(12): frames.append(scene(stock, idle=(t * 2) % 4, lights=FLICKER[t]))               # cranking: shake + flicker
for t in range(10): frames.append(scene(stock, idle=t % 4, puff=t, lights=1))                      # catch: puff, lights steady
for t in range(24): frames.append(scene(stock, idle=t % 4, lights=1, fume=t))                      # idle: white fumes
for t in range(24): frames.append(scene(stock, idle=t % 4, wheel=t, lights=1, fume=t))             # dyno run
for t in range(16): frames.append(scene(built, idle=t % 4, wheel=t, lid=True, lights=1, fume=t, drop=2))
for t in range(16): frames.append(scene(stock, idle=t % 4, smoke=t, lights=1, fume=t))             # broken
for t in range(16): frames.append(scene(stock, hoodsmoke=t))                                        # engine failure
g = [f.resize((768, 512), Image.NEAREST).convert('RGB') for f in frames]
g[0].save(os.path.join(OUTDIR, f'{CAR}_states.gif'), save_all=True, append_images=g[1:], duration=70, loop=0)

sp = []
for a in range(16):
    c = Image.new('RGBA', (256, 256), (20, 20, 24, 255))
    for L, v in [('shadow', 'base'), ('tires', 'street_r15'), ('brakes', 'stock'), ('rims', 'steel_15'), ('body', 'body'), ('exhaust', 'stock')]:
        c.alpha_composite(fr('spin', L, v, a))
    sp.append(c.resize((512, 512), Image.NEAREST).convert('RGB'))
sp[0].save(os.path.join(OUTDIR, f'{CAR}_spin.gif'), save_all=True, append_images=sp[1:], duration=110, loop=0)
print('ok')
