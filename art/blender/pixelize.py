"""
Pixel-art pass: raw Blender frames -> the game's sprite sheets.

    python art/blender/pixelize.py

Reads   art/blender/out/raw/<view>/<layer>/<variant>/<frame>.png
Writes  src/assets/sprites/car_states/civic_eg/<view>/<layer>/<variant>.png
        one horizontal strip per variant, every frame on the full canvas, so the
        game can stack any layers by position alone
and     src/assets/sprites/car_states/civic_eg/manifest.json
        frame counts per layer variant and the canvas size per view

What it does to the frames, by layer kind:
  solid    alpha snapped on/off, one palette for the whole strip (no flicker
           between frames), 1 px dark outline: what the hand-drawn sprites have
  backdrop the garage: palette only
  shadow   one flat translucent black
  lights   lit lenses kept, two stepped glow rings; beams kept translucent
  smoke    alpha snapped to a fixed translucency, tiny palette, soft dark edge
"""
import glob, json, os, sys
from PIL import Image, ImageChops, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
CAR = sys.argv[sys.argv.index('--car') + 1] if '--car' in sys.argv else 'civic_eg'
RAW = os.path.join(HERE, 'out', CAR, 'raw')
OUT = os.path.normpath(os.path.join(HERE, '..', '..', 'src', 'assets', 'sprites', 'car_states', CAR))

OUTLINE = (12, 10, 17)            # the darkest colour in the existing car sprites
KIND = {
    'garage': 'backdrop', 'shadow': 'shadow', 'lights': 'lights',
    'smoke_exhaust': 'smoke', 'smoke_hood': 'smoke', 'start_puff': 'smoke', 'fumes': 'fumes',
    'rollers': 'plain',
}
COLORS = {'backdrop': 64, 'solid': 40, 'plain': 16, 'smoke': 6}


def strip(frames):
    w, h = frames[0].size
    s = Image.new('RGBA', (w * len(frames), h))
    for i, f in enumerate(frames): s.paste(f, (i * w, 0))
    return s


def snap_alpha(im, cut=128, keep=255):
    a = im.split()[3].point(lambda v: keep if v >= cut else 0)
    im = im.copy(); im.putalpha(a); return im


def quantize(im, colors):
    """Palette-reduce RGB, keep alpha as is."""
    a = im.split()[3]
    rgb = Image.new('RGB', im.size); rgb.paste(im, mask=a)
    q = rgb.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
    q.putalpha(a); return q


def grow(mask, px=1):
    """4-neighbour dilation of an L mask by px pixels, without wrapping."""
    out = mask
    for _ in range(px):
        acc = out.copy()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            shifted = Image.new('L', out.size, 0)
            shifted.paste(out, (dx, dy))
            acc = ImageChops.lighter(acc, shifted)
        out = acc
    return out


def outline(im, color=OUTLINE, alpha=255, per_frame_w=None):
    a = im.split()[3].point(lambda v: 255 if v else 0)
    ring = ImageChops.subtract(grow(a), a)
    if per_frame_w:   # never bleed an outline across the seam between two frames
        for x in range(per_frame_w, im.width, per_frame_w):
            for xx in (x - 1, x):
                ring.paste(0, (xx, 0, xx + 1, im.height))
    layer = Image.new('RGBA', im.size, (*color, alpha))
    out = im.copy(); out.paste(layer, mask=ring); return out


def glow(im):
    """Lit lenses: lens pixels kept; two stepped rings of their own colour around them; beams kept."""
    a = im.split()[3]
    lens = a.point(lambda v: 255 if v >= 200 else 0)
    beam = a.point(lambda v: 70 if 12 <= v < 200 else 0)
    rgb = im.convert('RGB')
    lens_rgb = Image.new('RGB', im.size); lens_rgb.paste(rgb, mask=lens)
    spread = lens_rgb.filter(ImageFilter.MaxFilter(5))
    out = Image.new('RGBA', im.size, (0, 0, 0, 0))
    beam_layer = rgb.copy(); beam_layer.putalpha(beam); out = Image.alpha_composite(out, beam_layer)
    for px, alpha in ((2, 70), (1, 150)):
        ring = grow(lens, px).point(lambda v, al=alpha: al if v else 0)
        g = spread.copy(); g.putalpha(ring); out = Image.alpha_composite(out, g)
    core = rgb.copy(); core.putalpha(lens); return Image.alpha_composite(out, core)


def process(view, layer, variant, files):
    frames = [Image.open(f).convert('RGBA') for f in files]
    w = frames[0].width
    kind = KIND.get(layer, 'solid')
    if kind == 'lights':
        sheet = strip([glow(f) for f in frames])
    else:
        sheet = strip(frames)
        if kind == 'backdrop':
            sheet = quantize(snap_alpha(sheet), COLORS['backdrop'])
        elif kind == 'shadow':
            a = sheet.split()[3].point(lambda v: 110 if v > 20 else 0)
            sheet = Image.new('RGBA', sheet.size, (8, 6, 12, 0)); sheet.putalpha(a)
        elif kind == 'smoke':
            sheet = outline(quantize(snap_alpha(sheet, cut=96, keep=225), COLORS['smoke']), (6, 6, 8), 170, w)
        elif kind == 'fumes':
            # thin white vapour: a few light greys, see-through, no dark edge
            sheet = quantize(snap_alpha(sheet, cut=80, keep=150), 4)
        elif kind == 'plain':
            sheet = quantize(snap_alpha(sheet), COLORS['plain'])
        else:
            sheet = outline(quantize(snap_alpha(sheet), COLORS['solid']), per_frame_w=w)
    dest = os.path.join(OUT, view, layer, variant + '.png')
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    sheet.save(dest, optimize=True)
    return len(frames)


if __name__ == '__main__':
    meta = json.load(open(os.path.join(RAW, 'views.json')))
    views = meta['views']
    manifest = {'car': CAR, 'game_id': meta['game_id'], 'engine_at': meta['engine_at'], 'drive': meta['drive'], 'views': {}}
    total = 0
    for view, cfg in views.items():
        layers = {}
        for layer_dir in sorted(glob.glob(os.path.join(RAW, view, '*'))):
            layer = os.path.basename(layer_dir)
            for var_dir in sorted(glob.glob(os.path.join(layer_dir, '*'))):
                variant = os.path.basename(var_dir)
                files = sorted(glob.glob(os.path.join(var_dir, '*.png')))
                if not files: continue
                n = process(view, layer, variant, files)
                layers.setdefault(layer, {})[variant] = n
                total += n
        manifest['views'][view] = {'w': cfg['w'], 'h': cfg['h'], 'layers': layers}
    with open(os.path.join(OUT, 'manifest.json'), 'w') as fh:
        json.dump(manifest, fh, indent=1, sort_keys=True)
    print(f'{total} frames -> {os.path.relpath(OUT)}')
