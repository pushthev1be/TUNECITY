"""
Blueprint bodies: one smooth car surface from four curves, for tunecity_cars.py.

exec()'d into tunecity_cars.py's namespace (it uses its helpers: box, poly,
new_obj, empty, both, cyl, MATS, CAR, BODY...). A car spec opts in with a
'bp' dict:

  zt   top line from the side: bumper top, hood, windshield, roof, hatch, tail
  zs   beltline / shoulder
  zb   sill / underside
  w    half-width from above
       each a list of (y, value) control points, joined by a monotone cubic,
       so the curves never overshoot between points
  tumble        how far the cabin sides lean in per metre of height
  crown         how much the hood and roof bulge at the centre line
  side_glass    (y0, y1) of the side windows; bpillar (y0, y1) breaks them
  windshield    (y0, y1) of the windscreen on the top surface
  backlight     (y0, y1) of the rear glass on the top surface
  front, rear   shapes on the nose and tail as front-view polygons (x, z):
                [{'mat': 'lens', 'pts': [...], 'mirror': True, 'depth': 0.2}, ...]
                pressed in along Y so they wrap round the curved nose

Every cross-section is the same 13-point half outline (floor, flank bulge,
shoulder, window, roof edge, crown), so the surface is one continuous mesh,
and which part a face is (glass, paint, roof, hood) follows from where it
sits on that outline.
"""

def mono_cubic(pts):
    """Fritsch-Carlson monotone cubic through (x, y) points; returns f(x)."""
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]; n = len(pts)
    d = [(ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]) for i in range(n - 1)]
    m = [d[0]] + [0.0 if d[i - 1] * d[i] <= 0 else (d[i - 1] + d[i]) / 2 for i in range(1, n - 1)] + [d[-1]]
    for i in range(n - 1):
        if d[i] == 0:
            m[i] = m[i + 1] = 0.0
        else:
            a, b = m[i] / d[i], m[i + 1] / d[i]
            s = a * a + b * b
            if s > 9:
                t = 3 / math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]
    def f(x):
        if x <= xs[0]: return ys[0]
        if x >= xs[-1]: return ys[-1]
        for i in range(n - 1):
            if xs[i] <= x <= xs[i + 1]:
                h = xs[i + 1] - xs[i]; t = (x - xs[i]) / h
                h00 = 2 * t ** 3 - 3 * t ** 2 + 1; h10 = t ** 3 - 2 * t ** 2 + t
                h01 = -2 * t ** 3 + 3 * t ** 2; h11 = t ** 3 - t ** 2
                return h00 * ys[i] + h10 * h * m[i] + h01 * ys[i + 1] + h11 * h * m[i + 1]
    return f

BP = CAR['bp']
zt_f, zs_f, zb_f, w_f = (mono_cubic(BP[k]) for k in ('zt', 'zs', 'zb', 'w'))
TUMBLE = BP.get('tumble', 0.45)
# crown: how much the top bulges at the centre line. A list varies it along the car;
# negative dishes it, for a hood sitting low between raised wings.
_cr = BP.get('crown', 0.03)
crown_f = mono_cubic(_cr) if isinstance(_cr, list) else (lambda y, c=_cr: c)


def _derived():
    ws_ = BP.get('windshield') or (FRONT * 0.3, 0.0)
    back = BP.get('backlight') or (BP['side_glass'][1] - 0.2, BP['side_glass'][1])
    mid = (ws_[1] + back[0]) / 2
    zt_m, zs_m, w_m = zt_f(mid), zs_f(mid), w_f(mid)
    gt = w_m - 0.07 - TUMBLE * max(0.0, zt_m - zs_m - 0.08)
    return dict(gb=w_m - 0.07, gt=gt, y0=ws_[0], y1=back[1], zb=zs_f(ws_[0]), ty0=ws_[1], ty1=back[0], zt=zt_m)
G = _derived()
LID_Z0, LID_Z1 = zt_f(BAY_Y0), zt_f(BAY_Y1)
LID_W = min(w_f(BAY_Y0 + 0.1), w_f(BAY_Y1 - 0.1)) - 0.05

# region of each outline segment j -> j+1 (0 = bottom centre ... 12 = top centre)
SEG = ['floor', 'floor', 'flank', 'flank', 'flank', 'belt', 'belt', 'window', 'window', 'roofedge', 'top', 'top']

def outline(y):
    """Half cross-section at y, bottom centre to top centre: 13 (x, z) points."""
    zt, zs, zb, w = zt_f(y), zs_f(y), zb_f(y), w_f(y)
    zs = min(zs, zt - 0.02); zb = min(zb, zs - 0.05)
    z_edge = max(zs + 0.03, zt - 0.05)                       # bottom of the roof edge
    gw = w - 0.07 - TUMBLE * (z_edge - zs - 0.03)            # cabin half-width at the roof edge
    cr = crown_f(y)
    z_top = max(z_edge + 0.005, zt - cr) if cr >= 0 else zt - cr
    return [
        (0.0, zb), (w - 0.06, zb), (w - 0.012, zb + 0.07),
        (w, zb + 0.45 * (zs - zb)), (w - 0.008, zs - 0.035), (w - 0.03, zs),
        (w - 0.06, zs + 0.025),
        ((w - 0.07) * 2 / 3 + gw / 3, zs + 0.03 + (z_edge - zs - 0.03) / 3),
        ((w - 0.07) / 3 + gw * 2 / 3, zs + 0.03 + (z_edge - zs - 0.03) * 2 / 3),
        (gw, z_edge), (gw - 0.04, z_top), ((gw - 0.04) * 0.5, zt - 0.25 * (zt - z_top)), (0.0, zt),
    ]

def in_range(y, r):
    return r is not None and r[0] <= y <= r[1]

def face_mat(region, y, steep):
    if region == 'floor': return 'trim'
    if region == 'window':
        if in_range(y, BP.get('side_glass')) and not in_range(y, BP.get('bpillar')): return 'glass'
        return 'paint'
    if region == 'top' and steep and (in_range(y, BP.get('windshield')) or in_range(y, BP.get('backlight'))):
        return 'glass'
    return 'paint'

def bp_ys(n=72):
    """Section stations, denser at the nose and tail where the shape turns fastest."""
    ys = [FRONT + (REAR - FRONT) * (1 - math.cos(math.pi * i / (n - 1))) / 2 for i in range(n)]
    extra = [BAY_Y0, BAY_Y1] + [a for ax in AXLES.values() for a in (ax - TIRE_R - 0.06, ax + TIRE_R + 0.06)]
    return sorted(set(round(y, 4) for y in ys + extra))

def bp_shell(cname, panel_mat, lid_parent):
    """The body surface. The lid (hood or engine lid) comes out as its own object on lid_parent."""
    ys = bp_ys()
    body_bm, lid_bm = bmesh.new(), bmesh.new()
    mat_names = ['paint', 'glass', 'trim', panel_mat]
    for bm in (body_bm, lid_bm):
        pass
    rings = []
    for y in ys:
        half = outline(y)
        right = [(x, y, z) for x, z in half]
        left = [(-x, y, z) for x, z in reversed(half[1:-1])]
        rings.append(right + left)            # 13 + 11 = 24 points around
    N = len(rings[0])
    def add(bm, cache, key, co):
        if key not in cache: cache[key] = bm.verts.new(co)
        return cache[key]
    cb, cl = {}, {}
    body_faces, lid_faces = [], []
    for i in range(len(ys) - 1):
        ya, yb = ys[i], ys[i + 1]; ym = (ya + yb) / 2
        steep = abs(zt_f(yb) - zt_f(ya)) / max(1e-6, yb - ya) > 0.35
        for j in range(N):
            k = (j + 1) % N
            jj = j if j < 12 else (N - 1 - j)          # mirror the region index for the left side
            region = SEG[min(jj, 11)]
            pa, pb = rings[i][j], rings[i][k]
            qa, qb = rings[i + 1][j], rings[i + 1][k]
            cy = (pa[1] + qb[1]) / 2; cz = (pa[2] + pb[2] + qa[2] + qb[2]) / 4
            # wheel arches: drop the flank faces inside each arch circle
            if region in ('floor', 'flank', 'belt'):
                if any((cy - ay) ** 2 + (cz - HUB_Z) ** 2 < (TIRE_R + 0.06) ** 2 for ay in AXLES.values()):
                    continue
            in_lid = region in ('roofedge', 'top') and BAY_Y0 - 1e-4 <= ya and yb <= BAY_Y1 + 1e-4
            in_open = region in ('roofedge', 'top') and any(a - 1e-4 <= ya and yb <= b + 1e-4 for a, b in CAR.get('open_extra', []))
            if in_open: continue
            lid_mat = panel_mat if panel_mat != 'paint' else BP.get('lid_mat', 'paint')
            mat = lid_mat if in_lid else face_mat(region, ym, steep)
            bm, cache = (lid_bm, cl) if in_lid else (body_bm, cb)
            vs = [add(bm, cache, (i, j), pa), add(bm, cache, (i, k), pb), add(bm, cache, (i + 1, k), qb), add(bm, cache, (i + 1, j), qa)]
            try:
                f = bm.faces.new(vs); f.material_index = mat_names.index(mat)
            except ValueError:
                pass
    # end caps: the bumper faces
    for idx, flip in ((0, True), (len(ys) - 1, False)):
        vs = [add(body_bm, cb, (idx, j), rings[idx][j]) for j in range(N)]
        try:
            f = body_bm.faces.new(list(reversed(vs)) if flip else vs); f.material_index = 0
        except ValueError:
            pass
    objs = []
    for bm, nm, parent in ((body_bm, f'{cname}_shell', BODY), (lid_bm, f'{cname}_lid', lid_parent)):
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        me = bpy.data.meshes.new(nm); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new('tc_' + nm, me)
        for mn in mat_names: o.data.materials.append(MATS[mn])
        C(cname).objects.link(o); attach(o, parent)
        objs.append(o)
    return objs

def side_x(y, z):
    """Where the flank surface is at (y, z): for placing seams, handles and mirrors."""
    half = outline(y)
    for (x0, z0), (x1, z1) in zip(half, half[1:]):
        if min(z0, z1) <= z <= max(z0, z1) and z1 != z0:
            return x0 + (x1 - x0) * (z - z0) / (z1 - z0)
    return w_f(y)

def half_width_at(y, z):
    """The body's half-width at height z in the section at y (None if z is above it)."""
    best = None
    half = outline(y)
    for (x0, z0), (x1, z1) in zip(half, half[1:]):
        if min(z0, z1) <= z <= max(z0, z1):
            x = x0 if z1 == z0 else x0 + (x1 - x0) * (z - z0) / (z1 - z0)
            best = x if best is None else max(best, x)
    return best

def surface_y(x, z, sign):
    """First y from the nose (sign +1) or tail (sign -1) where the body reaches (|x|, z)."""
    y = FRONT if sign > 0 else REAR
    for _ in range(80):
        hw = half_width_at(y, z)
        if hw is not None and hw >= abs(x) - 1e-4:
            return y
        y += sign * 0.005
    return y

def densify(pts, step=0.04):
    out = []
    for (x0, z0), (x1, z1) in zip(pts, pts[1:] + pts[:1]):
        n = max(1, int(math.hypot(x1 - x0, z1 - z0) / step))
        out += [(x0 + (x1 - x0) * t / n, z0 + (z1 - z0) * t / n) for t in range(n)]
    return out

def pressed(cname, shapes, at_y, sign, P, lit=False):
    """
    Front- or rear-view polygons laid onto the curved nose or tail: every corner is
    projected onto the surface, so a lamp that wraps round a corner follows it.
    """
    for n_, sh in enumerate(shapes):
        mat = sh['mat']
        if sh.get('lit_only') and not lit: continue      # e.g. the '69's hidden headlamps
        if lit:
            mat = {'lens': 'lit_head', 'amber': 'lit_amber', 'tail': 'lit_tail'}.get(mat)
            if not mat: continue
        depth = sh.get('depth', 0.06)
        lift = sh.get('lift', 0.0) + (0.006 if lit else 0.0)
        for s in ((1, -1) if sh.get('mirror', True) else (1,)):
            pts = densify([(s * x, z) for x, z in sh['pts']])
            if s < 0: pts = list(reversed(pts))
            n = len(pts)
            outer, inner = [], []
            for x, z in pts:
                ys = surface_y(x, z, sign)
                outer.append((x, ys - sign * (0.008 + lift), z))
                inner.append((x, ys + sign * depth, z))
            verts = outer + inner
            faces = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))] + [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
            o = poly(f'{cname}_{"lit" if lit else "sh"}{n_}_{s}', verts, faces, mat, 'lamps' if lit else cname, P)
            bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(o.data); bm.free()

def ribbon(cname, pts, width, mat, P, out=0.004):
    """A thin strip through surface points (x, y, z), lifted `out` off the surface: panel lines and trim."""
    verts, faces = [], []
    for i, (x, y, z) in enumerate(pts):
        sx = 1 if x >= 0 else -1
        verts += [(x + sx * out, y, z - width / 2), (x + sx * out, y, z + width / 2)]
        if i: faces.append((2 * i - 2, 2 * i - 1, 2 * i + 1, 2 * i))
    return poly(cname, verts, faces, mat, cname.split('_')[0] if cname.startswith('body') else cname, P)

def bp_parts(cname, panel_mat):
    """Shell, lid, bay lining and every detail, for one body variant."""
    P = BODY
    hinge_y = BAY_Y1 if AT == 'front' else BAY_Y0
    pivot = empty(f'{cname}_lidpivot', (0, hinge_y, zt_f(hinge_y)), parent=BODY)
    bp_shell(cname, panel_mat, pivot)

    # bay lining under the lid
    yc = (BAY_Y0 + BAY_Y1) / 2; hw = min(w_f(BAY_Y0 + 0.1), w_f(BAY_Y1 - 0.1)) - 0.10
    ztop = min(zt_f(BAY_Y0), zt_f(BAY_Y1)) - 0.02
    box(f'{cname}_bayfloor', -hw, hw, BAY_Y0, BAY_Y1, BAY_FLOOR - 0.04, BAY_FLOOR, 'bay', cname, P)
    both(f'{cname}_liner', hw - 0.04, hw, BAY_Y0, BAY_Y1, BAY_FLOOR, ztop, 'bay', cname, P)
    box(f'{cname}_wallA', -hw, hw, BAY_Y0, BAY_Y0 + 0.04, BAY_FLOOR, zt_f(BAY_Y0) - 0.02, 'bay', cname, P)
    box(f'{cname}_wallB', -hw, hw, BAY_Y1 - 0.04, BAY_Y1, BAY_FLOOR, zt_f(BAY_Y1) - 0.01, 'bay', cname, P)
    rad_y = BAY_Y0 + 0.05 if AT == 'front' else BAY_Y1 - 0.11
    box(f'{cname}_radiator', -hw + 0.18, hw - 0.18, rad_y, rad_y + 0.06, BAY_FLOOR, BAY_FLOOR + 0.26, 'rad', cname, P)
    by = BAY_Y0 + 0.12 if AT == 'front' else BAY_Y1 - 0.32
    box(f'{cname}_battery', hw - 0.28, hw - 0.04, by, by + 0.20, BAY_FLOOR, BAY_FLOOR + 0.20, 'black', cname, P)
    box(f'{cname}_battop', hw - 0.24, hw - 0.18, by + 0.02, by + 0.06, BAY_FLOOR + 0.20, BAY_FLOOR + 0.23, 'red', cname, P)
    box(f'{cname}_reservoir', -hw + 0.04, -hw + 0.20, by, by + 0.14, BAY_FLOOR, BAY_FLOOR + 0.24, 'lens', cname, P)
    sy = (BAY_Y1 - 0.30) if AT == 'front' else (BAY_Y0 + 0.30)
    both(f'{cname}_strut', hw - 0.20, hw - 0.04, sy - 0.08, sy + 0.08, BAY_FLOOR, ztop - 0.01, 'bay', cname, P)
    # underside of the lid, and its seam on the body
    lw = hw + 0.05
    box(f'{cname}_lidunder', -lw + 0.12, lw - 0.12, BAY_Y0 + 0.08, BAY_Y1 - 0.08, ztop - 0.04, ztop - 0.02, 'bay', cname, pivot)

    # wheel wells: the dark inside of each arch
    for ax, y in AXLES.items():
        for s in (1, -1):
            cyl(f'{cname}_well_{ax}{s}', TIRE_R + 0.05, 0.26 * K, (s * (w_f(y) - 0.16 * K), y, HUB_Z), 'X', 'bay', cname, P, verts=20)

    # panel lines: door seams, the lid edge; black belt trim under the side glass
    sg = BP.get('side_glass')
    for s in (1, -1):
        for i, dy in enumerate(CAR['doors']):
            zb_, zs_ = zb_f(dy), zs_f(dy)
            box(f'{cname}_seamb{s}{i}', s * (side_x(dy, (zb_ + zs_) / 2) + 0.004) - 0.006, s * (side_x(dy, (zb_ + zs_) / 2) + 0.004) + 0.006,
                dy, dy + 0.018, zb_ + 0.07, zs_ - 0.04, 'black', cname, P)
            hz = zs_ - 0.12
            hx = side_x(dy - 0.14, hz) + 0.006
            box(f'{cname}_handle{s}{i}', s * hx - 0.008, s * hx + 0.008, dy - 0.22, dy - 0.08, hz - 0.015, hz + 0.015, 'black', cname, P)
        if sg:
            ys_ = [sg[0] + (sg[1] - sg[0]) * t / 12 for t in range(13)]
            for k_ in range(12):
                y0_, y1_ = ys_[k_], ys_[k_ + 1]
                z0_, z1_ = zs_f(y0_) + 0.012, zs_f(y1_) + 0.012
                x0_, x1_ = w_f(y0_) - 0.045, w_f(y1_) - 0.045
                poly(f'{cname}_belt{s}{k_}', [(s * x0_, y0_, z0_ - 0.012), (s * x1_, y1_, z1_ - 0.012), (s * x1_, y1_, z1_ + 0.012), (s * x0_, y0_, z0_ + 0.012)],
                     [(0, 1, 2, 3)], 'black', cname, P)
        # lid seam along the shoulder
        for k_ in range(8):
            y0_ = BAY_Y0 + (BAY_Y1 - BAY_Y0) * k_ / 8; y1_ = BAY_Y0 + (BAY_Y1 - BAY_Y0) * (k_ + 1) / 8
            o0, o1 = outline(y0_)[10], outline(y1_)[10]
            poly(f'{cname}_lidseam{s}{k_}', [(s * (o0[0] + 0.012), y0_, o0[1] - 0.004), (s * (o1[0] + 0.012), y1_, o1[1] - 0.004),
                                             (s * (o1[0] + 0.03), y1_, o1[1] - 0.02), (s * (o0[0] + 0.03), y0_, o0[1] - 0.02)], [(0, 1, 2, 3)], 'trim', cname, P)
        # mirror: arm and housing at the front corner of the side glass
        my = (sg[0] if sg else G['y0']) + 0.06; mz = zs_f(my) + 0.02; mx = w_f(my) - 0.05
        box(f'{cname}_mirarm{s}', s * mx, s * (mx + 0.10), my, my + 0.06, mz, mz + 0.04, 'black', cname, P)
        box(f'{cname}_mirror{s}', s * (mx + 0.06), s * (mx + 0.20), my - 0.03, my + 0.07, mz - 0.01, mz + 0.13, panel_mat, cname, P, bevel=0.02)
        box(f'{cname}_mirglass{s}', s * (mx + 0.08), s * (mx + 0.18), my + 0.068, my + 0.075, mz + 0.01, mz + 0.11, 'glass', cname, P)

    # nose and tail shapes
    pressed(cname, BP.get('front', []), FRONT, +1, P)
    pressed(cname, BP.get('rear', []), REAR, -1, P)
    wing(cname, P)
    extras(cname, P, pivot, panel_mat)
    return pivot

def section_at(y):
    """Same shape as the loft builder's: (sill hw, shoulder hw, sill z, shoulder z, top z)."""
    w = w_f(y)
    return (w - 0.06, w, zb_f(y), zs_f(y), zt_f(y))

def bp_lamps():
    pressed('lamps', BP.get('front', []), FRONT, +1, BODY, lit=True)
    pressed('lamps', BP.get('rear', []), REAR, -1, BODY, lit=True)
