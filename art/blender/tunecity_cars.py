"""
TuneCity — any car from car_specs.py on the dyno, built and rendered as stacked
pixel-art layers.

    blender -b --factory-startup --python art/blender/tunecity_cars.py -- --car civic_eg [--view dyno|spin] [--only PREFIX,PREFIX]
    python art/blender/pixelize.py --car civic_eg                  # raw frames -> game sprite sheets

Inside a running Blender (the BlenderMCP add-on) set BUILD_ONLY = True and
CAR_KEY before exec()ing this: it builds into its own scene, 'TuneCity <car>',
and renders nothing.

WHY LAYERS
The game shows any mix of hood, lights, engine, intake, turbo, exhaust, tires,
wheels, brakes and ride height, so each visible part is its own layer, rendered
once per variant on the same canvas from the same camera, and the game stacks
them. Two rules make the stacking right without per-combination renders:

  * Things the body hides (engine bay parts, exhaust tips, the intercooler,
    smoke) render with the body as a holdout, so they arrive already cut where
    the body is in front of them, and are drawn above it.
  * Tires, brakes and rims are drawn below the body. Every sprung layer holds out
    a solid disc at each wheel, so the wheel wells behind a tire never paint
    over it: those discs are the holes the wheels show through.

Ride height is a pixel offset on every sprung layer, applied by the game.

VIEWS
  dyno  384x256, the car on the dyno at 3/4, front to the right
  spin  256x256, the car alone, 16 angles, for the 360 view

OUTPUT  art/blender/out/<car>/raw/<view>/<layer>/<variant>/<frame>.png
"""
import bpy, bmesh, math, os, sys, json
from mathutils import Vector, Matrix

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
BUILD_ONLY = globals().get('BUILD_ONLY', False)
ONLY = tuple(ARGS[ARGS.index('--only') + 1].split(',')) if '--only' in ARGS else None
VIEWS = [ARGS[ARGS.index('--view') + 1]] if '--view' in ARGS else ['dyno', 'spin']
HERE = globals().get('TC_HERE') or os.path.dirname(os.path.abspath(__file__))   # TC_HERE: set when exec()d inside Blender
CAR_KEY = globals().get('CAR_KEY') or (ARGS[ARGS.index('--car') + 1] if '--car' in ARGS else 'civic_eg')

_specs = {}
exec(open(os.path.join(HERE, 'car_specs.py'), encoding='utf-8').read(), _specs)
CAR = _specs['CARS'][CAR_KEY]
RAW = os.path.join(HERE, 'out', CAR_KEY, 'raw')

PX_PER_M = 48                 # one pixel is ~2 cm
DYNO_YAW = 35                 # degrees the car is turned toward the camera, front to the right
ELEV = 26                     # camera degrees above level
SPIN_ANGLES = 16
WHEEL_FRAMES = 8              # frames per wheel revolution / roller cycle
IDLE = [(0.0, 0.0, 0.0), (0.022, 0.5, 2.0), (0.0, -0.35, -1.3), (-0.02, 0.25, 0.9)]   # (z m, roll deg, engine rock deg)

# ─── scene ────────────────────────────────────────────────────────────────────
SCENE_NAME = f'TuneCity {CAR_KEY}'
if BUILD_ONLY:
    # only our own earlier build of this car (and the old single 'TuneCity Civic' scene)
    ours = [sc for sc in bpy.data.scenes if sc.name.split('.')[0] in (SCENE_NAME, 'TuneCity Civic')]
    scene = bpy.data.scenes.new(SCENE_NAME + ' build')
    bpy.context.window.scene = scene
    for sc in ours: bpy.data.scenes.remove(sc)
    scene.name = SCENE_NAME
else:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene

scene.render.engine = 'BLENDER_EEVEE'
scene.render.film_transparent = True
scene.render.filter_size = 0.01                       # no anti-aliasing: hard pixel edges
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.view_settings.view_transform = 'Standard'
scene.eevee.taa_render_samples = 1
scene.eevee.use_soft_shadows = False
scene.eevee.shadow_cube_size = '1024'
scene.eevee.shadow_cascade_size = '2048'

world = bpy.data.worlds.new('tc_world'); scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.35, 0.36, 0.42, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6

sun = bpy.data.objects.new('tc_sun', bpy.data.lights.new('tc_sun', 'SUN'))
sun.data.energy = 3.2; sun.data.angle = 0.0
sun.rotation_euler = (math.radians(25), 0, math.radians(-20))
scene.collection.objects.link(sun)

# ─── collections: one per layer variant, all top level so each can be toggled ─
COLLS = {}
def C(name):
    if name not in COLLS:
        c = bpy.data.collections.new('tc_' + name)
        scene.collection.children.link(c)
        COLLS[name] = c
    return COLLS[name]

def lc(name):
    return scene.view_layers[0].layer_collection.children[COLLS[name].name]

def show(visible=(), holdout=()):
    """Exactly these collections render; holdout ones cut alpha; every other one is excluded."""
    for name in COLLS:
        l = lc(name)
        if name == 'rig':
            l.exclude = False; continue
        l.exclude = name not in visible and name not in holdout
        l.holdout = name in holdout

# ─── cel materials ────────────────────────────────────────────────────────────
MATS = {}
def cel(name, color, emit=0.0, rust=False, alpha=1.0, bands=(0.55, 0.78, 1.0)):
    m = bpy.data.materials.new('tc_' + name); m.use_nodes = True
    nt = m.node_tree; n = nt.nodes; l = nt.links; n.clear()
    out = n.new('ShaderNodeOutputMaterial')
    em = n.new('ShaderNodeEmission')
    if emit:
        em.inputs['Color'].default_value = (*color, 1); em.inputs['Strength'].default_value = emit
    else:
        diff = n.new('ShaderNodeBsdfDiffuse'); s2r = n.new('ShaderNodeShaderToRGB')
        ramp = n.new('ShaderNodeValToRGB'); ramp.color_ramp.interpolation = 'CONSTANT'
        e = ramp.color_ramp.elements
        e[0].position, e[0].color = 0.0, (bands[0],) * 3 + (1,)
        e[1].position, e[1].color = 0.40, (bands[1],) * 3 + (1,)
        e.new(0.75).color = (bands[2],) * 3 + (1,)
        mul = n.new('ShaderNodeMixRGB'); mul.blend_type = 'MULTIPLY'; mul.inputs[0].default_value = 1
        l.new(diff.outputs[0], s2r.inputs[0]); l.new(s2r.outputs[0], ramp.inputs[0]); l.new(ramp.outputs[0], mul.inputs[1])
        if rust:
            tc = n.new('ShaderNodeTexCoord'); noise = n.new('ShaderNodeTexNoise')
            noise.inputs['Scale'].default_value = 5.5; noise.inputs['Detail'].default_value = 4.0
            sep = n.new('ShaderNodeSeparateXYZ'); low = n.new('ShaderNodeMapRange')
            low.inputs['From Min'].default_value, low.inputs['From Max'].default_value = 0.26, 0.55
            low.inputs['To Min'].default_value, low.inputs['To Max'].default_value = 0.14, 0.0
            add = n.new('ShaderNodeMath'); add.operation = 'ADD'
            thr = n.new('ShaderNodeMath'); thr.operation = 'GREATER_THAN'; thr.inputs[1].default_value = 0.74
            mix = n.new('ShaderNodeMixRGB')
            mix.inputs[1].default_value = (*color, 1); mix.inputs[2].default_value = (0.26, 0.12, 0.07, 1)
            l.new(tc.outputs['Object'], noise.inputs['Vector']); l.new(tc.outputs['Object'], sep.inputs[0])
            l.new(sep.outputs['Z'], low.inputs['Value'])
            l.new(noise.outputs['Fac'], add.inputs[0]); l.new(low.outputs['Result'], add.inputs[1])
            l.new(add.outputs[0], thr.inputs[0]); l.new(thr.outputs[0], mix.inputs[0]); l.new(mix.outputs[0], mul.inputs[2])
        else:
            mul.inputs[2].default_value = (*color, 1)
        l.new(mul.outputs[0], em.inputs['Color'])
    if alpha < 1.0:
        tr = n.new('ShaderNodeBsdfTransparent'); mx = n.new('ShaderNodeMixShader')
        mx.inputs[0].default_value = 1 - alpha
        l.new(em.outputs[0], mx.inputs[1]); l.new(tr.outputs[0], mx.inputs[2]); l.new(mx.outputs[0], out.inputs[0])
        m.blend_method = 'BLEND'; m.shadow_method = 'NONE'
    else:
        l.new(em.outputs[0], out.inputs[0])
    MATS[name] = m
    return m

for name, col, kw in [
    ('paint', CAR['paint'], dict(rust=CAR.get('rust', False))), ('fiberglass', (0.07, 0.07, 0.08), {}),
    ('glass', (0.035, 0.037, 0.05), {}), ('black', (0.035, 0.035, 0.045), {}), ('trim', (0.10, 0.10, 0.12), {}),
    ('chrome', (0.62, 0.63, 0.66), dict(bands=(0.45, 0.85, 1.25))), ('alloy', (0.42, 0.43, 0.46), {}),
    ('lens', (0.70, 0.70, 0.66), {}), ('lens_in', (0.30, 0.30, 0.30), {}), ('amber', (0.95, 0.45, 0.10), {}),
    ('tail', (0.55, 0.05, 0.05), {}), ('bay', (0.08, 0.08, 0.10), {}), ('rad', (0.05, 0.05, 0.06), {}),
    ('pipe', (0.40, 0.38, 0.36), {}), ('rubber', (0.025, 0.025, 0.03), {}), ('groove', (0.006, 0.006, 0.008), {}),
    ('letters_white', (0.75, 0.75, 0.72), {}), ('letters_yellow', (0.85, 0.65, 0.05), {}), ('letters_grey', (0.25, 0.25, 0.26), {}),
    ('steel_black', (0.20, 0.20, 0.22), {}), ('gold', (0.62, 0.45, 0.12), {}), ('disc', (0.30, 0.29, 0.28), {}),
    ('disc_dark', (0.09, 0.09, 0.10), {}), ('red', (0.65, 0.04, 0.04), {}), ('yellow', (0.85, 0.62, 0.02), {}),
    ('carbon', (0.04, 0.04, 0.045), dict(bands=(0.5, 0.9, 1.4))), ('blue', (0.05, 0.18, 0.55), {}),
    ('filter_red', (0.62, 0.05, 0.05), {}), ('smoke', (0.10, 0.10, 0.11), dict(bands=(0.55, 0.9, 1.4))),
    ('puff', (0.30, 0.30, 0.32), dict(bands=(0.6, 0.85, 1.15))), ('fume', (0.80, 0.81, 0.84), dict(bands=(0.75, 0.9, 1.05))),
    ('lit_head', (1.0, 0.95, 0.75), dict(emit=6.0)), ('lit_amber', (1.0, 0.55, 0.10), dict(emit=6.0)),
    ('lit_tail', (1.0, 0.12, 0.10), dict(emit=6.0)), ('beam', (1.0, 0.95, 0.75), dict(emit=1.3, alpha=0.16)),
    ('shadow', (0.0, 0.0, 0.0), dict(emit=1.0, alpha=0.45)),
    ('concrete', (0.16, 0.17, 0.20), {}), ('wall', (0.13, 0.15, 0.19), {}), ('wall_trim', (0.20, 0.13, 0.08), {}),
    ('steel', (0.10, 0.10, 0.12), {}), ('hazard_y', (0.85, 0.60, 0.04), {}), ('roller', (0.36, 0.37, 0.40), {}),
    ('roller_mark', (0.80, 0.12, 0.08), {}), ('tube_light', (0.95, 0.97, 1.0), dict(emit=3.0)),
    # workshop props on the walls
    ('chest', (0.50, 0.04, 0.04), {}), ('pegboard', (0.30, 0.20, 0.11), {}), ('cardboard', (0.42, 0.29, 0.15), {}),
    ('drum', (0.05, 0.16, 0.45), {}), ('poster_a', (0.85, 0.30, 0.05), {}), ('poster_b', (0.10, 0.45, 0.60), {}),
    ('poster_ink', (0.06, 0.05, 0.07), {}), ('neon_pink', (1.0, 0.15, 0.55), dict(emit=4.0)), ('neon_cyan', (0.20, 0.85, 1.0), dict(emit=4.0)),
    ('door', (0.20, 0.22, 0.26), {}), ('bench_top', (0.36, 0.24, 0.13), {}), ('lamp_glow', (1.0, 0.92, 0.70), dict(emit=3.0)),
    ('paper', (0.80, 0.78, 0.70), {}), ('wood', (0.30, 0.18, 0.09), {}), ('shelf', (0.12, 0.12, 0.14), {}),
]:
    cel(name, col, **kw)

# ─── geometry helpers (all world space; attach() parents keeping the transform) ─
def update(): scene.view_layers[0].update()

def attach(o, parent):
    # No depsgraph update here: with thousands of objects that made the build
    # quadratic. Parents are empties, and empty() updates when each is made.
    if parent is None: return o
    o.parent = parent
    o.matrix_parent_inverse = parent.matrix_world.inverted()
    return o

def new_obj(name, me, mat, cname, parent):
    o = bpy.data.objects.new('tc_' + name, me)
    if mat: o.data.materials.append(MATS[mat])
    C(cname).objects.link(o)
    return attach(o, parent)

def empty(name, loc=(0, 0, 0), parent=None):
    e = bpy.data.objects.new('tc_' + name, None); e.location = loc
    C('rig').objects.link(e)
    if parent is not None: update()
    attach(e, parent)
    update()
    return e

def box(name, x0, x1, y0, y1, z0, z1, mat, cname, parent, bevel=0.0):
    x0, x1 = sorted((x0, x1)); y0, y1 = sorted((y0, y1)); z0, z1 = sorted((z0, z1))
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector(((x0 + x1) / 2 + v.co.x * (x1 - x0), (y0 + y1) / 2 + v.co.y * (y1 - y0), (z0 + z1) / 2 + v.co.z * (z1 - z0)))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = new_obj(name, me, mat, cname, parent)
    if bevel:
        b = o.modifiers.new('bevel', 'BEVEL'); b.width = bevel; b.segments = 2
    return o

def both(name, x0, x1, *rest, **kw):
    """The same box on both sides of the car: x0..x1 given for the +X side."""
    for s in (1, -1):
        box(f'{name}{s}', s * x0, s * x1, *rest, **kw)

def poly(name, verts, faces, mat, cname, parent):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    return new_obj(name, me, mat, cname, parent)

def cyl(name, r, depth, center, axis, mat, cname, parent, verts=16, r2=None):
    """Cylinder (or cone with r2) centred at `center`, along 'X', 'Y' or 'Z'."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r, radius2=r if r2 is None else r2, depth=depth)
    rot = {'X': Matrix.Rotation(math.pi / 2, 4, 'Y'), 'Y': Matrix.Rotation(-math.pi / 2, 4, 'X'), 'Z': Matrix.Identity(4)}[axis]
    bmesh.ops.transform(bm, matrix=Matrix.Translation(Vector(center)) @ rot, verts=bm.verts)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    return new_obj(name, me, mat, cname, parent)

def ring(name, r_out, r_in, depth, center, mat, cname, parent, verts=32, arc=None):
    """A flat annulus along X (rim lips); `arc=(a0, a1)` makes it a part ring (fender flares)."""
    bm = bmesh.new()
    if arc:
        angs = [arc[0] + (arc[1] - arc[0]) * i / verts for i in range(verts + 1)]
    else:
        angs = [i * 2 * math.pi / verts for i in range(verts)]
    m = len(angs)
    outer = [bm.verts.new((sd * depth / 2, r_out * math.cos(a), r_out * math.sin(a))) for sd in (-1, 1) for a in angs]
    inner = [bm.verts.new((sd * depth / 2, r_in * math.cos(a), r_in * math.sin(a))) for sd in (-1, 1) for a in angs]
    verts = m
    for i in range(m if not arc else m - 1):
        j = (i + 1) % m
        o0, o1, O0, O1 = outer[i], outer[j], outer[verts + i], outer[verts + j]
        i0, i1, I0, I1 = inner[i], inner[j], inner[verts + i], inner[verts + j]
        bm.faces.new((o0, o1, O1, O0)); bm.faces.new((i0, I0, I1, i1))
        bm.faces.new((o0, i0, i1, o1)); bm.faces.new((O0, O1, I1, I0))
    bmesh.ops.transform(bm, matrix=Matrix.Translation(Vector(center)), verts=bm.verts)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    return new_obj(name, me, mat, cname, parent)

def sphere(name, r, center, mat, cname, parent, sub=2):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    bmesh.ops.translate(bm, vec=Vector(center), verts=bm.verts)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = new_obj(name, me, mat, cname, parent)
    for p in o.data.polygons: p.use_smooth = True
    return o

def with_cuts(sections, ys):
    """Insert interpolated sections at each y, so an open top can start and stop exactly there."""
    out = list(sections)
    for y in ys:
        if any(abs(s[0] - y) < 1e-4 for s in out): continue
        for a, b in zip(out, out[1:]):
            if a[0] < y < b[0]:
                t = (y - a[0]) / (b[0] - a[0])
                out.insert(out.index(b), tuple(a[k] + (b[k] - a[k]) * t for k in range(6)))
                break
    return out

def loft(name, sections, mat, cname, parent, open_ranges=()):
    """Body shell through cross-sections; the top is left open over each (y0, y1) range."""
    def is_open(a, b):
        return any(y0 - 1e-4 <= a and b <= y1 + 1e-4 for y0, y1 in open_ranges)
    bm = bmesh.new(); rings = []
    for y, wb, ws, zb, zs, zt in sections:
        pts = [(-wb, zb), (-ws, zs), (-(ws - 0.10), zt), (ws - 0.10, zt), (ws, zs), (wb, zb)]
        rings.append([bm.verts.new((x, y, z)) for x, z in pts])
    for i in range(len(rings) - 1):
        ra, rb = rings[i], rings[i + 1]
        for j in range(len(ra)):
            k = (j + 1) % len(ra)
            if j == 2 and is_open(sections[i][0], sections[i + 1][0]): continue
            bm.faces.new((ra[j], ra[k], rb[k], rb[j]))
    bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = new_obj(name, me, mat, cname, parent)
    bev = o.modifiers.new('round', 'BEVEL'); bev.width = 0.05; bev.segments = 2
    bev.limit_method = 'ANGLE'; bev.angle_limit = math.radians(25)
    return o

def section_at(y):
    """The lower-body section interpolated at y: (sill hw, shoulder hw, sill z, shoulder z, top z)."""
    secs = CAR['lower']
    if y <= secs[0][0]: return secs[0][1:]
    if y >= secs[-1][0]: return secs[-1][1:]
    for a, b in zip(secs, secs[1:]):
        if a[0] <= y <= b[0]:
            t = (y - a[0]) / (b[0] - a[0])
            return tuple(a[k] + (b[k] - a[k]) * t for k in range(1, 6))

# ═══ THE CAR ═════════════════════════════════════════════════════════════════
W, FRONT, REAR = CAR['W'], CAR['FRONT'], CAR['REAR']
AXLES = {'f': CAR['axles'][0], 'r': CAR['axles'][1]}
TIRE_R = CAR['tire_r']; HUB_Z = TIRE_R
K = TIRE_R / 0.31                           # wheel-size scale against the Civic
TIRE_X_OUT = W + 0.01                       # tire outer face flush with the body side
HUB_X = W - 0.10 * K
BAY_Y0, BAY_Y1 = CAR['bay']; BAY_FLOOR = CAR['bay_floor']
LID_Z0, LID_Z1 = CAR.get('lid_z', (0.8, 0.8)); LID_W = CAR.get('lid_w', 0.85)   # blueprint cars recompute these
AT = CAR['engine_at']                       # 'front' hinges at the cowl; 'mid'/'rear' lids hinge at their front edge
G = dict(CAR.get('green', {}))   # blueprint cars recompute this from their curves
DRIVEN = {'F': ['f'], 'R': ['r'], 'A': ['f', 'r']}[CAR['drive']]
EXTRAS = set(CAR.get('extras', []))
CENTER_Y = (BAY_Y0 + BAY_Y1) / 2
BAY_SIGN = -1 if AT == 'front' else 1       # which way the engine's "front" (radiator side) faces

ROOT = empty('root')                  # yaw for the dyno view, turntable for spin
BODY = empty('body', parent=ROOT)     # idle shake; ride height is applied by the game

OPEN = [(BAY_Y0, BAY_Y1)] + list(CAR.get('open_extra', []))
LOWER = with_cuts(CAR['lower'], [y for r in OPEN for y in r]) if 'lower' in CAR else None

def arches(target):
    for ax, y in AXLES.items():
        for s in (1, -1):
            cut = cyl(f'archcut_{ax}{s}', TIRE_R + 0.06, 0.40 * K, (s * W, y, HUB_Z), 'X', 'black', 'rig', None)
            cut.hide_render = True
            mod = target.modifiers.new(f'arch_{ax}{s}', 'BOOLEAN'); mod.operation = 'DIFFERENCE'; mod.object = cut
            mod.solver = 'EXACT'; mod.use_hole_tolerant = True
            target.modifiers.move(len(target.modifiers) - 1, 0)

def front_face_y(x):
    return FRONT

# ─── details, by spec ─────────────────────────────────────────────────────────
def lights_front(cname, P, mat_head, mat_ind, lit=False):
    hd = CAR['head']; z0, z1 = hd['z']; xi, xo = hd['x']
    d = 0.03 if lit else 0.0
    if hd['style'] == 'round':
        for s in (1, -1):
            cyl(f'{cname}_head{s}', hd['r'], 0.05, (s * xi, FRONT - 0.01 - d, z0), 'Y', mat_head, cname, P, verts=14)
            if not lit:
                ring_obj = cyl(f'{cname}_headring{s}', hd['r'] + 0.025, 0.03, (s * xi, FRONT + 0.005, z0), 'Y', 'chrome', cname, P, verts=14)
    else:
        if hd['style'] == 'slim': pass
        if hd.get('hidden') and not lit:
            return    # the '69 hides its lamps behind the grille until they are on
        both(f'{cname}_head', xi, xo, FRONT - 0.01 - d, FRONT + 0.03, z0, z1, mat_head, cname, P)
        if not lit and hd['style'] == 'rect':
            both(f'{cname}_headin', xi + (xo - xi) * 0.2, xi + (xo - xi) * 0.6, FRONT - 0.015, FRONT, z0 + 0.02, z1 - 0.02, 'lens_in', cname, P)
    if hd.get('ind'):
        both(f'{cname}_ind', xo, xo + 0.12, FRONT - d, FRONT + 0.10, z0, z1 if hd['style'] != 'round' else z0 + 0.06, mat_ind, cname, P)

def lights_rear(cname, P, mat, lit=False):
    tl = CAR['tail']; z0, z1 = tl['z']; xi, xo = tl['x']; d = 0.03 if lit else 0.0
    if tl['style'] == 'bar':
        box(f'{cname}_tailbar', -xo, xo, REAR - 0.02, REAR + 0.01 + d, z0, z1, mat, cname, P)
    else:
        both(f'{cname}_tail', xi, xo, REAR - 0.02, REAR + 0.01 + d, z0, z1, mat, cname, P)

def grille(cname, P):
    g = CAR['grille']; hz = CAR['head']['z']
    F = FRONT
    if g == 'slot':
        box(f'{cname}_grille', -0.30, 0.30, F - 0.01, F + 0.02, 0.56, 0.62, 'black', cname, P)
        box(f'{cname}_badge', -0.05, 0.05, F - 0.02, F, 0.57, 0.61, 'chrome', cname, P)
        box(f'{cname}_intake', -0.56, 0.56, F - 0.02, F + 0.02, 0.34, 0.44, 'black', cname, P)
        box(f'{cname}_strip', -0.84, 0.84, F - 0.02, F + 0.02, 0.47, 0.50, 'trim', cname, P)
    elif g == 'full':
        box(f'{cname}_grille', -0.86, 0.86, F - 0.015, F + 0.02, 0.48, 0.68, 'black', cname, P)
        box(f'{cname}_frame', -0.88, 0.88, F - 0.02, F + 0.02, 0.68, 0.70, 'chrome', cname, P)
        box(f'{cname}_frame2', -0.88, 0.88, F - 0.02, F + 0.02, 0.46, 0.48, 'chrome', cname, P)
        for i in range(9):
            x = -0.80 + i * 0.20
            box(f'{cname}_bar{i}', x - 0.008, x + 0.008, F - 0.02, F, 0.49, 0.67, 'trim', cname, P)
    elif g == 'kidney':
        both(f'{cname}_kidney', 0.04, 0.30, F - 0.02, F + 0.02, 0.38, 0.68, 'black', cname, P)
        both(f'{cname}_kframe', 0.03, 0.31, F - 0.025, F - 0.015, 0.37, 0.39, 'trim', cname, P)
        box(f'{cname}_lower', -0.70, 0.70, F - 0.02, F + 0.02, 0.28, 0.34, 'black', cname, P)
        both(f'{cname}_corner', 0.62, 0.86, F - 0.02, F + 0.02, 0.30, 0.48, 'black', cname, P)
    elif g == 'hex':
        box(f'{cname}_grille', -0.50, 0.50, F - 0.02, F + 0.02, hz[0] - 0.30, hz[0] - 0.02, 'black', cname, P)
        box(f'{cname}_upper', -0.30, 0.30, F - 0.02, F + 0.02, hz[0], hz[1], 'black', cname, P)
        both(f'{cname}_corner', 0.62, 0.88, F - 0.02, F + 0.02, hz[0] - 0.30, hz[0] - 0.12, 'black', cname, P)
    elif g == 'lower_big':
        box(f'{cname}_grille', -0.70, 0.70, F - 0.02, F + 0.02, 0.30, 0.54, 'black', cname, P)
        box(f'{cname}_upper', -0.30, 0.30, F - 0.02, F + 0.02, 0.60, 0.66, 'black', cname, P)
        box(f'{cname}_badge', -0.05, 0.05, F - 0.03, F, 0.60, 0.66, 'chrome', cname, P)
    elif g == 'wide':
        box(f'{cname}_grille', -0.78, 0.78, F - 0.02, F + 0.02, 0.48, 0.68, 'black', cname, P)
        box(f'{cname}_lower', -0.60, 0.60, F - 0.02, F + 0.02, 0.30, 0.42, 'black', cname, P)
        box(f'{cname}_cross', -0.78, 0.78, F - 0.025, F - 0.015, 0.575, 0.585, 'trim', cname, P)
    elif g == 'ram':
        box(f'{cname}_grille', -0.62, 0.62, F - 0.02, F + 0.02, 0.86, 1.12, 'black', cname, P)
        for i, x in enumerate((-0.36, -0.12, 0.12, 0.36)):
            box(f'{cname}_letter{i}', x - 0.08, x + 0.08, F - 0.03, F - 0.02, 0.94, 1.04, 'lens', cname, P)
        box(f'{cname}_bumper', -0.98, 0.98, F - 0.06, F + 0.04, 0.56, 0.80, 'black', cname, P, bevel=0.02)
        box(f'{cname}_skidplate', -0.60, 0.60, F - 0.04, F + 0.20, 0.50, 0.58, 'alloy', cname, P)
    elif g == 'slats':
        box(f'{cname}_grille', -0.46, 0.46, F - 0.02, F + 0.02, 0.76, 1.00, 'black', cname, P)
        for i in range(9):
            x = -0.40 + i * 0.10
            box(f'{cname}_slat{i}', x - 0.012, x + 0.012, F - 0.03, F - 0.01, 0.78, 0.98, 'chrome', cname, P)
    elif g == 'mesh':
        box(f'{cname}_grille', -0.62, 0.62, F - 0.02, F + 0.02, 0.32, 0.58, 'black', cname, P)
        box(f'{cname}_frame', -0.64, 0.64, F - 0.025, F - 0.015, 0.58, 0.60, 'chrome', cname, P)
    elif g == 'gt':
        box(f'{cname}_mid', -0.36, 0.36, F - 0.02, F + 0.02, 0.28, 0.40, 'black', cname, P)
        both(f'{cname}_side', 0.50, 0.80, F - 0.02, F + 0.02, 0.26, 0.40, 'black', cname, P)

def wing(cname, P):
    w = CAR['wing']; g = G
    deck = section_at(REAR - 0.25)[4]
    if w == 'roof':
        box(f'{cname}_wing', -g['gt'] - 0.18, g['gt'] + 0.18, g['ty1'] - 0.09, g['ty1'] + 0.16, g['zt'] + 0.12, g['zt'] + 0.16, 'black', cname, P, bevel=0.01)
        both(f'{cname}_wingend', g['gt'] + 0.16, g['gt'] + 0.20, g['ty1'] - 0.09, g['ty1'] + 0.16, g['zt'] + 0.08, g['zt'] + 0.19, 'black', cname, P)
        both(f'{cname}_wingpost', 0.42, 0.48, g['ty1'] - 0.03, g['ty1'] + 0.05, g['zt'] + 0.01, g['zt'] + 0.13, 'black', cname, P)
    elif w == 'roof_small':
        box(f'{cname}_wing', -g['gt'], g['gt'], g['ty1'] - 0.02, g['ty1'] + 0.14, g['zt'] - 0.02, g['zt'] + 0.02, 'paint', cname, P)
    elif w == 'lip':
        box(f'{cname}_lipwing', -0.78, 0.78, REAR - 0.16, REAR - 0.06, deck, deck + 0.04, 'black', cname, P)
    elif w == 'trunk_tall':
        box(f'{cname}_wing', -0.86, 0.86, REAR - 0.30, REAR - 0.06, deck + 0.30, deck + 0.34, 'black', cname, P, bevel=0.01)
        both(f'{cname}_wingend', 0.84, 0.88, REAR - 0.32, REAR - 0.04, deck + 0.26, deck + 0.38, 'black', cname, P)
        both(f'{cname}_wingpost', 0.52, 0.58, REAR - 0.24, REAR - 0.12, deck, deck + 0.31, 'black', cname, P)
    elif w == 'deck':
        box(f'{cname}_wing', -0.88, 0.88, REAR - 0.28, REAR - 0.04, deck + 0.16, deck + 0.20, 'black', cname, P, bevel=0.01)
        both(f'{cname}_wingpost', 0.60, 0.66, REAR - 0.20, REAR - 0.10, deck, deck + 0.17, 'black', cname, P)
    elif w == 'swan':
        box(f'{cname}_wing', -0.90, 0.90, REAR - 0.34, REAR - 0.02, deck + 0.42, deck + 0.46, 'black', cname, P, bevel=0.01)
        both(f'{cname}_wingend', 0.88, 0.92, REAR - 0.36, REAR, deck + 0.36, deck + 0.52, 'black', cname, P)
        both(f'{cname}_wingpost', 0.30, 0.36, REAR - 0.26, REAR - 0.16, deck, deck + 0.46, 'black', cname, P)

def extras(cname, P, pivot, panel_mat):
    E = EXTRAS; g = G
    if 'wipers' in E:
        for x0 in (-0.60, 0.02):
            poly(f'{cname}_wiper{x0}', [(x0, g['y0'] + 0.02, g['zb'] + 0.02), (x0 + 0.55, g['y0'] + 0.02, g['zb'] + 0.02),
                                        (x0 + 0.55, g['y0'] + 0.06, g['zb'] + 0.04), (x0, g['y0'] + 0.06, g['zb'] + 0.04)], [(0, 1, 2, 3)], 'black', cname, P)
    if 'antenna' in E:
        box(f'{cname}_antenna', -0.50, -0.48, g['ty0'] + 0.07, g['ty0'] + 0.09, g['zt'] + 0.03, g['zt'] + 0.22, 'black', cname, P)
    if 'rear_wiper' in E:
        box(f'{cname}_rwiper', -0.02, 0.30, g['y1'] - 0.09, g['y1'] - 0.05, g['zb'] + 0.15, g['zb'] + 0.17, 'black', cname, P)
    if 'tow_hooks' in E:
        both(f'{cname}_hook', 0.67, 0.73, FRONT - 0.04, FRONT, 0.26, 0.29, 'black', cname, P)
    if 'lip' in E:
        z = section_at(FRONT)[2]
        box(f'{cname}_lip', -W + 0.14, W - 0.14, FRONT - 0.05, FRONT + 0.08, z - 0.06, z - 0.02, 'black', cname, P)
    if 'diffuser' in E:
        z = section_at(REAR)[2]
        box(f'{cname}_diffuser', -0.70, 0.70, REAR - 0.10, REAR + 0.04, z - 0.04, z + 0.06, 'black', cname, P)
        for i in range(5):
            x = -0.48 + i * 0.24
            box(f'{cname}_fin{i}', x - 0.01, x + 0.01, REAR - 0.08, REAR + 0.05, z - 0.04, z + 0.08, 'trim', cname, P)
    if 'chrome_bumpers' in E:
        box(f'{cname}_fbumper', -W + 0.02, W - 0.02, FRONT - 0.06, FRONT + 0.04, 0.38, 0.46, 'chrome', cname, P, bevel=0.015)
        box(f'{cname}_rbumper', -W + 0.02, W - 0.02, REAR - 0.04, REAR + 0.06, 0.40, 0.48, 'chrome', cname, P, bevel=0.015)
    if 'hood_bulge' in E:
        L = BAY_Y1 - BAY_Y0
        bz0, bz1 = LID_Z0, LID_Z1
        poly(f'{cname}_bulge', [(-0.30, BAY_Y0 + 0.25, bz0 + 0.01), (0.30, BAY_Y0 + 0.25, bz0 + 0.01), (0.30, BAY_Y1 - 0.05, bz1 + 0.01), (-0.30, BAY_Y1 - 0.05, bz1 + 0.01),
                                (-0.24, BAY_Y0 + 0.40, bz0 + 0.06), (0.24, BAY_Y0 + 0.40, bz0 + 0.06), (0.24, BAY_Y1 - 0.10, bz1 + 0.06), (-0.24, BAY_Y1 - 0.10, bz1 + 0.06)],
             [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7), (4, 5, 6, 7)], panel_mat, cname, pivot)
    if 'hood_scoop' in E:
        y = BAY_Y0 + (BAY_Y1 - BAY_Y0) * 0.55; z = LID_Z0 + (LID_Z1 - LID_Z0) * 0.55
        box(f'{cname}_scoop', -0.22, 0.22, y - 0.18, y + 0.14, z, z + 0.08, panel_mat, cname, pivot, bevel=0.02)
        box(f'{cname}_scoopmouth', -0.18, 0.18, y - 0.19, y - 0.17, z + 0.01, z + 0.07, 'black', cname, pivot)
    if 'hood_vents' in E:
        for s in (1, -1):
            for i in range(4):
                y = FRONT + 0.30 + i * 0.08
                z = section_at(y)[4] + 0.003
                box(f'{cname}_vent{s}{i}', s * 0.18, s * 0.44, y - 0.015, y + 0.015, z, z + 0.006, 'black', cname, P)
    if 'side_intakes' in E:
        yy = AXLES['r'] - 0.60
        both(f'{cname}_sideintake', W - 0.005, W + 0.005, yy - 0.40, yy, 0.40, 0.62, 'black', cname, P)
    if 'cladding' in E:
        both(f'{cname}_clad', W - 0.01, W + 0.012, FRONT + 0.2, REAR - 0.2, section_at(0)[2], section_at(0)[2] + 0.14, 'black', cname, P)
    if 'roof_rails' in E:
        both(f'{cname}_rail', g['gt'] - 0.10, g['gt'] - 0.04, g['ty0'] + 0.1, g['ty1'] - 0.05, g['zt'] + 0.01, g['zt'] + 0.05, 'black', cname, P)
    if 'flares' in E:
        for ax, y in AXLES.items():
            for s in (1, -1):
                ring(f'{cname}_flare_{ax}{s}', TIRE_R + 0.14, TIRE_R + 0.04, 0.10, (0, 0, 0), 'black', cname, None, verts=12, arc=(math.radians(-15), math.radians(195)))
                fl = bpy.data.objects[f'tc_{cname}_flare_{ax}{s}']
                fl.matrix_world = Matrix.Translation((s * (W + 0.03), y, HUB_Z))
                attach(fl, P)
    if 'steps' in E:
        both(f'{cname}_step', W - 0.04, W + 0.10, AXLES['f'] + TIRE_R + 0.15, AXLES['r'] - TIRE_R - 0.15, section_at(0)[2] - 0.06, section_at(0)[2] - 0.02, 'black', cname, P)
    if 'skid' in E:
        pass
    if 'roof_lights' in E:
        for i in range(5):
            x = -0.32 + i * 0.16
            box(f'{cname}_marker{i}', x - 0.04, x + 0.04, g['ty0'] + 0.02, g['ty0'] + 0.07, g['zt'], g['zt'] + 0.03, 'amber', cname, P)
    if 'bed' in E:
        y0, y1 = CAR['open_extra'][0]
        zt = section_at((y0 + y1) / 2)[4]
        box(f'{cname}_bedfloor', -W + 0.10, W - 0.10, y0, y1, 0.80, 0.84, 'black', cname, P)
        both(f'{cname}_bedwall', W - 0.12, W - 0.08, y0, y1, 0.84, zt, 'trim', cname, P)
        box(f'{cname}_bedfront', -W + 0.10, W - 0.10, y0, y0 + 0.05, 0.84, zt, 'trim', cname, P)
        box(f'{cname}_gate', -W + 0.10, W - 0.10, y1 - 0.05, y1, 0.84, zt, 'trim', cname, P)
        both(f'{cname}_bedrail', W - 0.13, W - 0.02, y0, y1, zt, zt + 0.03, 'black', cname, P)
    if 'ram_graphics' in E:
        for i, (ya, yb) in enumerate([(0.4, 1.3), (1.0, 1.9), (1.6, 2.4)]):
            z = 0.70 + i * 0.05
            both(f'{cname}_splash{i}', W + 0.002, W + 0.006, ya, yb, z, z + 0.10, 'black', cname, P)
        poly(f'{cname}_hoodgfx', [(-0.30, BAY_Y0 + 0.30, LID_Z0 + 0.005), (0.30, BAY_Y0 + 0.30, LID_Z0 + 0.005),
                                  (0.30, BAY_Y1 - 0.05, LID_Z1 + 0.005), (-0.30, BAY_Y1 - 0.05, LID_Z1 + 0.005)], [(0, 1, 2, 3)], 'black', cname, pivot)
    if 'stripes' in E:
        # tiger slashes across the hood and down the flanks
        for i, y in enumerate((BAY_Y0 + 0.35, BAY_Y0 + 0.65, BAY_Y0 + 0.95)):
            z = LID_Z0 + (LID_Z1 - LID_Z0) * ((y - BAY_Y0) / (BAY_Y1 - BAY_Y0)) + 0.004
            for s in (1, -1):
                poly(f'{cname}_slash{i}{s}', [(s * 0.12, y, z), (s * 0.70, y - 0.30, z), (s * 0.70, y - 0.20, z), (s * 0.12, y + 0.10, z)],
                     [(0, 1, 2, 3)], 'black', cname, pivot)
        for i, y in enumerate((-0.4, 0.3, 1.0, 1.6)):
            both(f'{cname}_flank{i}', W + 0.002, W + 0.006, y, y + 0.22, 0.42, 0.74, 'black', cname, P)
    if 'stripes_ae' in E:
        # twin stripes over the nose, cabin and tail, following the top surface
        n = 30
        for s in (1, -1):
            for k in range(n):
                y0 = FRONT + 0.05 + (BAY_Y0 - FRONT - 0.07) * k / n; y1 = FRONT + 0.05 + (BAY_Y0 - FRONT - 0.07) * (k + 1) / n
                z0, z1 = section_at(y0)[4] + 0.006, section_at(y1)[4] + 0.006
                poly(f'{cname}_rstripe{s}{k}', [(s * 0.10, y0, z0), (s * 0.22, y0, z0), (s * 0.22, y1, z1), (s * 0.10, y1, z1)], [(0, 1, 2, 3)], 'black', cname, P)
    if 'spare' in E:
        cyl(f'{cname}_spare', TIRE_R * 0.95, 0.24, (0, REAR + 0.14, 1.05), 'Y', 'rubber', cname, P, verts=20)
        cyl(f'{cname}_sparecover', TIRE_R * 0.70, 0.25, (0, REAR + 0.145, 1.05), 'Y', 'steel_black', cname, P, verts=16)
    if 'bumper_bars' in E:
        box(f'{cname}_fbar', -W + 0.04, W - 0.04, FRONT - 0.10, FRONT + 0.02, 0.50, 0.64, 'black', cname, P, bevel=0.02)
        box(f'{cname}_rbar', -W + 0.04, W - 0.04, REAR - 0.02, REAR + 0.10, 0.50, 0.64, 'black', cname, P, bevel=0.02)
    if 'sail' in E:
        both(f'{cname}_sail', g['gb'] - 0.02, g['gb'] + 0.01, g['ty1'], g['y1'] + 0.40, g['zb'], g['zb'] + 0.18, 'paint', cname, P)

def body_parts(cname, panel_mat):
    """Everything sprung that is not a variant. Built twice: paint, and bare fiberglass lid."""
    P = BODY
    # bay lining, so paint never shows from inside
    hw = LID_W - 0.06
    box(f'{cname}_bayfloor', -hw, hw, BAY_Y0, BAY_Y1, BAY_FLOOR - 0.04, BAY_FLOOR, 'bay', cname, P)
    both(f'{cname}_liner', hw - 0.05, hw, BAY_Y0, BAY_Y1, BAY_FLOOR, min(LID_Z0, LID_Z1) - 0.02, 'bay', cname, P)
    box(f'{cname}_wallA', -hw, hw, BAY_Y0, BAY_Y0 + 0.05, BAY_FLOOR, LID_Z0 - 0.02, 'bay', cname, P)
    box(f'{cname}_wallB', -hw, hw, BAY_Y1 - 0.05, BAY_Y1, BAY_FLOOR, LID_Z1, 'bay', cname, P)
    rad_y = BAY_Y0 + 0.05 if AT == 'front' else BAY_Y1 - 0.11
    box(f'{cname}_radiator', -hw + 0.18, hw - 0.18, rad_y, rad_y + 0.06, BAY_FLOOR, BAY_FLOOR + 0.26, 'rad', cname, P)
    by = BAY_Y0 + 0.13 if AT == 'front' else BAY_Y1 - 0.33
    box(f'{cname}_battery', hw - 0.28, hw - 0.04, by, by + 0.20, BAY_FLOOR, BAY_FLOOR + 0.20, 'black', cname, P)
    box(f'{cname}_battop', hw - 0.24, hw - 0.18, by + 0.02, by + 0.06, BAY_FLOOR + 0.20, BAY_FLOOR + 0.23, 'red', cname, P)
    box(f'{cname}_reservoir', -hw + 0.04, -hw + 0.20, by, by + 0.14, BAY_FLOOR, BAY_FLOOR + 0.24, 'lens', cname, P)
    sy = (BAY_Y1 - 0.30) if AT == 'front' else (BAY_Y0 + 0.30)
    both(f'{cname}_strut', hw - 0.20, hw - 0.04, sy - 0.08, sy + 0.08, BAY_FLOOR, min(LID_Z0, LID_Z1) - 0.01, 'bay', cname, P)
    # wheel wells: the dark inside of each arch
    for ax, y in AXLES.items():
        for s in (1, -1):
            cyl(f'{cname}_well_{ax}{s}', TIRE_R + 0.05, 0.26 * K, (s * (W - 0.16 * K), y, HUB_Z), 'X', 'bay', cname, P, verts=20)

    # greenhouse with tumblehome
    gb, gt = G['gb'], G['gt']
    gv = [(-gb, G['y0'], G['zb']), (gb, G['y0'], G['zb']), (gb, G['y1'], G['zb']), (-gb, G['y1'], G['zb']),
          (-gt, G['ty0'], G['zt']), (gt, G['ty0'], G['zt']), (gt, G['ty1'], G['zt']), (-gt, G['ty1'], G['zt'])]
    cab = poly(f'{cname}_cabin', gv, [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7), (4, 5, 6, 7)], 'glass', cname, P)
    bm = bmesh.new(); bm.from_mesh(cab.data); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(cab.data); bm.free()
    box(f'{cname}_roof', -gt + 0.01, gt - 0.01, G['ty0'], G['ty1'], G['zt'] - 0.01, G['zt'] + 0.03, 'paint', cname, P, bevel=0.02)
    for s in (1, -1):
        poly(f'{cname}_apillar{s}', [(s * gb, G['y0'], G['zb']), (s * (gb - 0.07), G['y0'], G['zb']), (s * (gt - 0.05), G['ty0'], G['zt']), (s * gt, G['ty0'], G['zt'])],
             [(0, 1, 2, 3)], 'paint', cname, P)
        poly(f'{cname}_cpillar{s}', [(s * gb, G['y1'], G['zb']), (s * gb, G['y1'] - 0.22, G['zb']), (s * gt, G['ty1'] - 0.18, G['zt']), (s * gt, G['ty1'], G['zt'])],
             [(0, 1, 2, 3)], 'paint', cname, P)
        if CAR.get('bpillar') is not None:
            t = (CAR['bpillar'] - G['y0']) / max(0.01, G['y1'] - G['y0'])
            xb = gb + (gt - gb) * 0.5
            box(f'{cname}_bpillar{s}', s * (xb - 0.07) - 0.03, s * (xb - 0.07) + 0.03, CAR['bpillar'], CAR['bpillar'] + 0.10, G['zb'], G['zt'] - 0.01, 'black', cname, P)
        poly(f'{cname}_frame{s}', [(s * (gt + 0.005), G['ty0'], G['zt'] - 0.005), (s * (gt + 0.005), G['ty1'], G['zt'] - 0.005),
                                   (s * (gt + 0.02), G['ty1'], G['zt'] - 0.03), (s * (gt + 0.02), G['ty0'], G['zt'] - 0.03)], [(0, 1, 2, 3)], 'black', cname, P)
        # mirror: arm and housing at the front of the side glass
        my = G['y0'] + 0.10; mz = G['zb']
        box(f'{cname}_mirarm{s}', s * (gb + 0.02), s * (gb + 0.12), my, my + 0.06, mz + 0.03, mz + 0.07, 'black', cname, P)
        box(f'{cname}_mirror{s}', s * (gb + 0.08), s * (gb + 0.24), my - 0.02, my + 0.08, mz + 0.03, mz + 0.17, panel_mat, cname, P, bevel=0.015)
        # belt trim, door seams and handles, rub strip
        box(f'{cname}_belt{s}', s * W - 0.012, s * W + 0.012, G['y0'], G['y1'], G['zb'] - 0.03, G['zb'] + 0.005, 'black', cname, P)
        for i, dy in enumerate(CAR['doors']):
            zb_, zs_ = section_at(dy)[2], section_at(dy)[3]
            box(f'{cname}_seam{s}{i}', s * (W + 0.001) - 0.01, s * (W + 0.001) + 0.01, dy, dy + 0.02, zb_ + 0.06, G['zb'] - 0.02, 'black', cname, P)
            box(f'{cname}_handle{s}{i}', s * (W + 0.002) - 0.01, s * (W + 0.002) + 0.01, dy - 0.20, dy - 0.08, G['zb'] - 0.14, G['zb'] - 0.11, 'black', cname, P)
        box(f'{cname}_skirt{s}', s * W - 0.02, s * W + 0.015, AXLES['f'] + TIRE_R + 0.06, AXLES['r'] - TIRE_R - 0.06,
            section_at(0)[2] - 0.01, section_at(0)[2] + 0.07, 'trim', cname, P)

    wing(cname, P)
    lights_front(cname, P, 'lens', 'amber')
    lights_rear(cname, P, 'tail')
    grille(cname, P)
    z_r = section_at(REAR)
    box(f'{cname}_plate', -0.20, 0.20, REAR, REAR + 0.02, z_r[2] + 0.12, z_r[2] + 0.24, 'lens', cname, P)
    if 'chrome_bumpers' not in EXTRAS and 'bumper_bars' not in EXTRAS:
        box(f'{cname}_rbumper', -W + 0.10, W - 0.10, REAR - 0.04, REAR + 0.02, z_r[2] - 0.02, z_r[2] + 0.10, 'trim', cname, P)

    # the lid: front hood hinged at the cowl, or a mid/rear engine lid hinged at its front edge
    hinge_y, hinge_z = (BAY_Y1, LID_Z1) if AT == 'front' else (BAY_Y0, LID_Z0)
    pivot = empty(f'{cname}_lidpivot', (0, hinge_y, hinge_z), parent=BODY)
    lw = LID_W
    poly(f'{cname}_lid', [(-lw, BAY_Y0, LID_Z0), (lw, BAY_Y0, LID_Z0), (lw, BAY_Y1, LID_Z1), (-lw, BAY_Y1, LID_Z1),
                          (-lw, BAY_Y0, LID_Z0 - 0.03), (lw, BAY_Y0, LID_Z0 - 0.03), (lw, BAY_Y1, LID_Z1 - 0.03), (-lw, BAY_Y1, LID_Z1 - 0.03)],
         [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)],
         panel_mat if AT == 'front' else ('glass' if CAR_KEY == 'corvette' else panel_mat), cname, pivot)
    box(f'{cname}_lidunder', -lw + 0.12, lw - 0.12, BAY_Y0 + 0.08, BAY_Y1 - 0.08, min(LID_Z0, LID_Z1) - 0.05, min(LID_Z0, LID_Z1) - 0.03, 'bay', cname, pivot)
    if AT == 'front':
        box(f'{cname}_crease', -0.01, 0.01, BAY_Y0 + 0.05, BAY_Y1 - 0.02, LID_Z0, LID_Z1 + 0.005, 'trim', cname, pivot)
    else:
        for i in range(4):   # louvres on the engine lid
            y = BAY_Y0 + 0.25 + i * 0.22
            box(f'{cname}_louvre{i}', -0.40, 0.40, y, y + 0.05, LID_Z0 + 0.002, LID_Z0 + 0.008, 'black', cname, pivot)
    if panel_mat != 'paint':
        for s in (1, -1):
            box(f'{cname}_fender{s}', s * (W - 0.03), s * (W + 0.012), BAY_Y0 + 0.02, BAY_Y1 - 0.02,
                section_at(CENTER_Y)[3] - 0.25, section_at(CENTER_Y)[3] - 0.01, panel_mat, cname, P)
    extras(cname, P, pivot, panel_mat)
    return pivot

BLUEPRINT = 'bp' in CAR
if BLUEPRINT:
    # One smooth surface from the spec's curves (art/blender/blueprint.py)
    exec(open(os.path.join(HERE, 'blueprint.py'), encoding='utf-8').read(), globals())
    LID_PIVOT = bp_parts('body', 'paint')
    LID_PIVOT_FG = bp_parts('body_fg', 'fiberglass')
else:
    shell = loft('shell', LOWER, 'paint', 'body', BODY, open_ranges=OPEN); arches(shell)
    LID_PIVOT = body_parts('body', 'paint')
    shell_fg = loft('shell_fg', LOWER, 'paint', 'body_fg', BODY, open_ranges=OPEN); arches(shell_fg)
    LID_PIVOT_FG = body_parts('body_fg', 'fiberglass')
LID_OPEN = math.radians(-72) if AT == 'front' else math.radians(68)

# ─── wheels: hubs spin, knuckles do not ───────────────────────────────────────
HUBS, KNUCKLES = {}, {}
for ax, y in AXLES.items():
    for s in (1, -1):
        HUBS[ax, s] = empty(f'hub_{ax}{s}', (s * HUB_X, y, HUB_Z), parent=ROOT)
        KNUCKLES[ax, s] = empty(f'knuckle_{ax}{s}', (s * HUB_X, y, HUB_Z), parent=ROOT)

RIM_R = {k: v * K for k, v in {'r15': 0.19, 'r17': 0.215, 'r18': 0.232}.items()}   # tire inner radius per rim size
TIRES = {
    #                width, tread pattern, sidewall letters
    'street':      (0.20, 'blocks', 'letters_grey'),
    'performance': (0.22, 'grooves', 'letters_white'),
    'slick':       (0.31, None, 'letters_yellow'),
    'drift':       (0.23, 'chunky', 'letters_white'),
    'r888':        (0.24, 'sipes', 'letters_white'),
}
WHEELS = {'steel_15': 'r15', 'enkei_17': 'r17', 'work_18': 'r18'}

def build_tire(key, rsize):
    width, tread, letters = TIRES[key]; width *= K
    cname = f'tire_{key}_{rsize}'; r_in = RIM_R[rsize]
    for (ax, s), hub in HUBS.items():
        cx = s * (TIRE_X_OUT - width / 2)
        tag = f'{cname}_{ax}{s}'; y0 = hub.location.y
        bm = bmesh.new(); N = 36
        sh = 0.035 * K
        prof = [(r_in, -width / 2), (TIRE_R - sh, -width / 2), (TIRE_R, -width / 2 + sh),
                (TIRE_R, width / 2 - sh), (TIRE_R - sh, width / 2), (r_in, width / 2)]
        rings_ = [[bm.verts.new((cx + px, y0 + r * math.cos(a), HUB_Z + r * math.sin(a))) for r, px in prof]
                  for a in [i * 2 * math.pi / N for i in range(N)]]
        for i in range(N):
            a_, b_ = rings_[i], rings_[(i + 1) % N]
            for j in range(len(prof)):
                k = (j + 1) % len(prof)
                bm.faces.new((a_[j], a_[k], b_[k], b_[j]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        me = bpy.data.meshes.new(tag); bm.to_mesh(me); bm.free()
        new_obj(tag, me, 'rubber', cname, hub)
        if tread:
            n = {'blocks': 24, 'grooves': 18, 'chunky': 16, 'sipes': 10}[tread]
            gw = {'blocks': 0.8, 'grooves': 0.9, 'chunky': 0.95, 'sipes': 0.35}[tread] * width
            th = {'blocks': 0.03, 'grooves': 0.025, 'chunky': 0.045, 'sipes': 0.02}[tread] * K
            for i in range(n):
                a = i * 2 * math.pi / n
                g = box(f'{tag}_g{i}', cx - gw / 2, cx + gw / 2, -th / 2, th / 2, -0.004, 0.004, 'groove', cname, None)
                g.matrix_world = Matrix.Translation((0, y0 + (TIRE_R - 0.002) * math.cos(a), HUB_Z + (TIRE_R - 0.002) * math.sin(a))) @ Matrix.Rotation(a + math.pi / 2, 4, 'X')
                attach(g, hub)
        xs = s * (TIRE_X_OUT + 0.003); rm = (r_in + TIRE_R) / 2
        for i, a0 in enumerate((0.0, math.pi)):
            for k in range(5):
                a = a0 + (k - 2) * 0.12
                lt = box(f'{tag}_l{i}{k}', xs - 0.004, xs + 0.004, -0.018 * K, 0.018 * K, -0.012 * K, 0.012 * K, letters, cname, None)
                lt.matrix_world = Matrix.Translation((0, y0 + rm * math.cos(a), HUB_Z + rm * math.sin(a))) @ Matrix.Rotation(a, 4, 'X')
                attach(lt, hub)

def build_rim(key):
    rsize = WHEELS[key]; r = RIM_R[rsize]; cname = f'rim_{key}'
    for (ax, s), hub in HUBS.items():
        y0 = hub.location.y; xf = s * (TIRE_X_OUT - 0.035)
        tag = f'{cname}_{ax}{s}'
        if key == 'steel_15':
            ring(f'{tag}_lip', r, r - 0.03 * K, 0.03, (xf, y0, HUB_Z), 'steel_black', cname, hub)
            cyl(f'{tag}_disc', r - 0.03 * K, 0.02, (xf - s * 0.02, y0, HUB_Z), 'X', 'steel_black', cname, hub, verts=24)
            for i in range(5):
                a = i * 2 * math.pi / 5
                cyl(f'{tag}_hole{i}', 0.026 * K, 0.03, (xf - s * 0.012, y0 + 0.12 * K * math.cos(a), HUB_Z + 0.12 * K * math.sin(a)), 'X', 'rubber', cname, hub, verts=8)
            cyl(f'{tag}_cap', 0.06 * K, 0.03, (xf + s * 0.005, y0, HUB_Z), 'X', 'chrome', cname, hub, verts=12)
        elif key == 'enkei_17':
            ring(f'{tag}_lip', r, r - 0.025 * K, 0.03, (xf, y0, HUB_Z), 'alloy', cname, hub)
            cyl(f'{tag}_hubc', 0.055 * K, 0.04, (xf, y0, HUB_Z), 'X', 'alloy', cname, hub, verts=12)
            for i in range(6):
                sp = box(f'{tag}_sp{i}', -0.015, 0.015, 0.05 * K, r - 0.02 * K, -0.022 * K, 0.022 * K, 'alloy', cname, None)
                sp.matrix_world = Matrix.Translation((xf, y0, HUB_Z)) @ Matrix.Rotation(i * 2 * math.pi / 6, 4, 'X')
                attach(sp, hub)
            cyl(f'{tag}_badge', 0.025 * K, 0.045, (xf, y0, HUB_Z), 'X', 'black', cname, hub, verts=8)
        else:
            ring(f'{tag}_lip', r, r - 0.045 * K, 0.035, (xf, y0, HUB_Z), 'chrome', cname, hub)
            cyl(f'{tag}_hubc', 0.05 * K, 0.04, (xf, y0, HUB_Z), 'X', 'gold', cname, hub, verts=12)
            for i in range(10):
                sp = box(f'{tag}_sp{i}', -0.01, 0.01, 0.045 * K, r - 0.04 * K, -0.010 * K, 0.010 * K, 'gold', cname, None)
                sp.matrix_world = Matrix.Translation((xf - s * 0.005, y0, HUB_Z)) @ Matrix.Rotation(i * 2 * math.pi / 10 + 0.15, 4, 'X')
                attach(sp, hub)
            ring(f'{tag}_inner', r - 0.045 * K, r - 0.06 * K, 0.02, (xf - s * 0.01, y0, HUB_Z), 'gold', cname, hub)

def build_brakes(key):
    cname = f'brake_{key}'
    disc_r = {'stock': 0.13, 'big_kit': 0.16, 'carbon': 0.16}[key] * K
    disc_m = {'stock': 'disc', 'big_kit': 'disc', 'carbon': 'disc_dark'}[key]
    cal_m = {'stock': 'black', 'big_kit': 'red', 'carbon': 'yellow'}[key]
    cal_h = {'stock': 0.07, 'big_kit': 0.11, 'carbon': 0.11}[key] * K
    for (ax, s), kn in KNUCKLES.items():
        y0 = kn.location.y; xd = s * (TIRE_X_OUT - 0.09)
        cyl(f'{cname}_{ax}{s}_disc', disc_r, 0.025, (xd, y0, HUB_Z), 'X', disc_m, cname, HUBS[ax, s], verts=20)
        cy = y0 + 0.55 * disc_r; cz = HUB_Z + 0.55 * disc_r
        box(f'{cname}_{ax}{s}_cal', xd - 0.04, xd + 0.04, cy - cal_h / 2, cy + cal_h / 2, cz - 0.035 * K, cz + 0.035 * K, cal_m, cname, kn, bevel=0.01)

for (ax, s), hub in HUBS.items():
    cyl(f'mask_{ax}{s}', TIRE_R, 0.20 * K, (s * (TIRE_X_OUT - 0.10 * K), hub.location.y, HUB_Z), 'X', 'black', 'wheel_mask', ROOT, verts=24)
for t in TIRES:
    for rs in RIM_R: build_tire(t, rs)
for w in WHEELS: build_rim(w)
for b in ('stock', 'big_kit', 'carbon'): build_brakes(b)

# ─── engines ──────────────────────────────────────────────────────────────────
ENGINES = {
    'i4_honda':      dict(layout='inline', cyl=4, cover=(0.78, 0.10, 0.10)),
    'i6_bmw':        dict(layout='inline', cyl=6, cover=(0.18, 0.20, 0.26)),
    'flat_subaru':   dict(layout='flat', cyl=4, cover=(0.75, 0.12, 0.14)),
    'flat_porsche':  dict(layout='flat', cyl=6, cover=(0.60, 0.61, 0.64)),
    'v8_hemi':       dict(layout='v', cyl=8, cover=(0.90, 0.40, 0.08)),
    'v8_ls':         dict(layout='v', cyl=8, cover=(0.14, 0.14, 0.16)),
    'v8_blower':     dict(layout='v', cyl=8, cover=(0.85, 0.12, 0.10), blower=True),
    'v8_twin_turbo': dict(layout='v', cyl=8, cover=(0.12, 0.12, 0.14)),
}
ENGINE_C = Vector((0, CENTER_Y, BAY_FLOOR))
BAY_FIT = max(0.85, min(1.25, (BAY_Y1 - BAY_Y0) / 0.94))
S = Vector((1.3, 1.15, 0.95)) * BAY_FIT       # fill the bay: at this distance a true-size engine is a few pixels
ENG_ROOTS = {}

def build_engine(key):
    spec = ENGINES[key]; cname = f'engine_{key}'
    root = empty(f'eng_{key}', ENGINE_C, parent=BODY); ENG_ROOTS[key] = root
    cel(f'cover_{key}', spec['cover'])
    def b(nm, x0, x1, y0, y1, z0, z1, mat, bev=0.015):
        return box(f'{cname}_{nm}', ENGINE_C.x + x0 * S.x, ENGINE_C.x + x1 * S.x, ENGINE_C.y + y0 * S.y, ENGINE_C.y + y1 * S.y,
                   ENGINE_C.z + z0 * S.z, ENGINE_C.z + z1 * S.z, mat, cname, root, bevel=bev)
    n = spec['cyl']; cov = f'cover_{key}'
    if spec['layout'] == 'inline':
        L = 0.11 * n + 0.10
        b('block', -L / 2, L / 2, -0.22, 0.18, 0.0, 0.26, 'alloy')
        b('head', -L / 2 + 0.02, L / 2 - 0.02, -0.20, 0.14, 0.26, 0.34, 'alloy')
        b('cover', -L / 2 + 0.04, L / 2 - 0.04, -0.17, 0.11, 0.34, 0.41, cov)
        b('coverstrip', -L / 2 + 0.10, L / 2 - 0.10, -0.04, 0.0, 0.41, 0.425, 'black', 0)
        for i in range(n):
            x = -L / 2 + 0.10 + i * (L - 0.20) / max(1, n - 1)
            b(f'coil{i}', x - 0.025, x + 0.025, -0.10, -0.05, 0.41, 0.45, 'black', 0)
        b('manifold', -L / 2 + 0.06, L / 2 - 0.06, 0.14, 0.28, 0.16, 0.36, 'alloy')
        b('throttle', L / 2 - 0.10, L / 2 + 0.02, 0.10, 0.22, 0.30, 0.40, 'alloy')
        b('belt', L / 2, L / 2 + 0.04, -0.18, 0.10, 0.04, 0.30, 'black')
        if CAR.get('long'):
            # longitudinal in a RWD/AWD car: turn the inline engine to run front to back
            update()
            root.rotation_euler = (0, 0, math.pi / 2)
    elif spec['layout'] == 'flat':
        L = 0.10 * n + 0.18
        b('case', -0.18, 0.18, -L / 2, L / 2, 0.0, 0.24, 'alloy')
        for s in (1, -1):
            b(f'bank{s}', s * 0.18, s * 0.42, -L / 2 + 0.05, L / 2 - 0.05, 0.04, 0.22, 'alloy')
            b(f'cover{s}', s * 0.42, s * 0.50, -L / 2 + 0.07, L / 2 - 0.07, 0.06, 0.20, cov)
        b('plenum', -0.20, 0.20, -L / 2 + 0.04, L / 2 - 0.04, 0.24, 0.38, cov)
        b('badge', -0.08, 0.08, -0.06, 0.06, 0.38, 0.40, 'chrome', 0)
    else:
        L = 0.11 * n / 2 + 0.24
        b('block', -0.22, 0.22, -L / 2, L / 2, 0.0, 0.22, 'alloy')
        for s in (1, -1):
            c = box(f'{cname}_cover{s}', -0.08 * S.x, 0.08 * S.x, (-L / 2 + 0.04) * S.y, (L / 2 - 0.04) * S.y, -0.06 * S.z, 0.06 * S.z, cov, cname, None, bevel=0.015)
            c.matrix_world = Matrix.Translation(ENGINE_C + Vector((s * 0.26 * S.x, 0, 0.30 * S.z))) @ Matrix.Rotation(s * math.radians(35), 4, 'Y')
            attach(c, root)
            for i in range(n // 2):
                y = -L / 2 + 0.10 + i * (L - 0.20) / max(1, n // 2 - 1)
                b(f'coil{s}{i}', s * 0.36 - 0.02, s * 0.36 + 0.02, y - 0.02, y + 0.02, 0.33, 0.37, 'black', 0)
        if spec.get('blower'):
            b('blower', -0.17, 0.17, -L / 2 + 0.08, L / 2 - 0.10, 0.28, 0.50, cov)
            for k in range(5):
                b(f'rib{k}', -0.18, 0.18, -L / 2 + 0.12 + k * 0.08, -L / 2 + 0.14 + k * 0.08, 0.42, 0.51, 'alloy', 0)
            cyl(f'{cname}_pulley', 0.09 * S.x, 0.05, ENGINE_C + Vector((0, BAY_SIGN * (L / 2 - 0.02) * S.y, 0.40 * S.z)), 'Y', 'black', cname, root)
        else:
            b('plenum', -0.15, 0.15, -L / 2 + 0.06, L / 2 - 0.06, 0.24, 0.40, cov)
            b('plenumcap', -0.10, 0.10, -L / 2 + 0.10, L / 2 - 0.10, 0.40, 0.43, 'alloy')
        bl0 = -L / 2 - 0.04 if BAY_SIGN < 0 else L / 2
        b('belt', -0.20, 0.20, bl0, bl0 + 0.04, 0.04, 0.30, 'black')

for k in ENGINES: build_engine(k)

# ─── intakes, forced induction, headers, intercooler: in the bay ─────────────
# Positions are offsets from the bay centre at floor height (ENGINE_C), scaled
# with the bay. 'dy' is toward the engine's front (the radiator side).
def at(dx, dy, dz):
    return ENGINE_C + Vector((dx * BAY_FIT, BAY_SIGN * -dy * BAY_FIT, dz))

def bb(name, c, r, x0, x1, dy0, dy1, z0, z1, mat, bevel=0.0):
    p0, p1 = at(x0, dy0, z0), at(x1, dy1, z1)
    return box(name, p0.x, p1.x, p0.y, p1.y, p0.z, p1.z, mat, c, r, bevel=bevel)

def bay_part(cname, builder):
    root = empty(f'r_{cname}', ENGINE_C, parent=BODY); ENG_ROOTS[cname] = root
    builder(cname, root)

def intake_airbox(c, r):
    bb(f'{c}_box', c, r, 0.46, 0.76, -0.18, 0.12, 0.08, 0.26, 'black', 0.02)
    bb(f'{c}_lid', c, r, 0.48, 0.74, -0.16, 0.10, 0.26, 0.28, 'trim')
    cyl(f'{c}_hose', 0.05, 0.30, at(0.30, -0.02, 0.22), 'X', 'black', c, r, verts=10)
def intake_cone(c, r):
    cyl(f'{c}_pipe', 0.045, 0.34, at(0.42, 0.0, 0.22), 'X', 'chrome', c, r, verts=10)
    cyl(f'{c}_filter', 0.075, 0.18, at(0.66, 0.0, 0.22), 'X', 'filter_red', c, r, verts=12, r2=0.055)
    cyl(f'{c}_clamp', 0.08, 0.02, at(0.58, 0.0, 0.22), 'X', 'chrome', c, r, verts=12)
def intake_stacks(c, r):
    for i in range(4):
        cyl(f'{c}_stack{i}', 0.04, 0.12, at(-0.27 + i * 0.18, 0.16, 0.40), 'Z', 'chrome', c, r, verts=10, r2=0.06)
def intake_twin(c, r):
    for k, dy in enumerate((-0.14, 0.14)):
        cyl(f'{c}_pipe{k}', 0.04, 0.30, at(0.44, dy, 0.22), 'X', 'chrome', c, r, verts=10)
        cyl(f'{c}_filter{k}', 0.065, 0.16, at(0.66, dy, 0.22), 'X', 'filter_red', c, r, verts=12, r2=0.05)
def intake_carbon(c, r):
    cyl(f'{c}_tube', 0.06, 0.40, at(0.40, 0.0, 0.24), 'X', 'carbon', c, r, verts=12)
    bb(f'{c}_shield', c, r, 0.56, 0.80, -0.22, 0.20, 0.04, 0.30, 'carbon', 0.02)
    cyl(f'{c}_filter', 0.07, 0.14, at(0.66, 0.0, 0.22), 'X', 'filter_red', c, r, verts=12)
INTAKES = {'stock': intake_airbox, 'cone': intake_cone, 'stacks': intake_stacks, 'twin_cone': intake_twin, 'carbon': intake_carbon}

def snail(c, r, tag, dx, dz=0.18, size=1.0, mat='pipe'):
    p = at(dx, -0.38, dz)
    t = sphere(f'{c}_{tag}', 0.10 * size, p, mat, c, r); t.scale = (1, 0.7, 1)
    cyl(f'{c}_{tag}_comp', 0.06 * size, 0.10 * size, p + Vector((0.08 * size, 0, 0)), 'X', 'alloy', c, r, verts=12)
    cyl(f'{c}_{tag}_inlet', 0.045 * size, 0.06, p + Vector((0, BAY_SIGN * 0.10 * size, 0)), 'Y', 'black', c, r, verts=10)
FORCED = {
    'turbo_single':     lambda c, r: snail(c, r, 't', -0.36),
    'turbo_twin':       lambda c, r: (snail(c, r, 'a', -0.40, size=0.85), snail(c, r, 'b', 0.12, size=0.85)),
    'turbo_sequential': lambda c, r: (snail(c, r, 'a', -0.40, size=0.7), snail(c, r, 'b', 0.10, size=1.05)),
    'turbo_compound':   lambda c, r: (snail(c, r, 'a', -0.30, 0.13, 1.1), snail(c, r, 'b', -0.30, 0.34, 0.7)),
    'turbo_hybrid':     lambda c, r: (snail(c, r, 't', -0.36), cyl(f'{c}_motor', 0.06, 0.12, at(-0.18, -0.38, 0.18), 'X', 'blue', c, r, verts=12)),
    'turbo_antilag':    lambda c, r: (snail(c, r, 't', -0.36, mat='red'), cyl(f'{c}_wg', 0.035, 0.12, at(-0.52, -0.32, 0.24), 'Z', 'chrome', c, r, verts=8)),
    'turbo_stage4':     lambda c, r: snail(c, r, 't', -0.34, 0.20, 1.35),
    'supercharger':     lambda c, r: (bb(f'{c}_case', c, r, -0.24, 0.24, -0.20, 0.22, 0.40, 0.56, 'alloy', 0.02),
                                      bb(f'{c}_top', c, r, -0.18, 0.18, -0.16, 0.18, 0.56, 0.59, 'red'),
                                      cyl(f'{c}_pulley', 0.07, 0.04, at(0, -0.24, 0.48), 'Y', 'black', c, r, verts=12)),
}
def headers(c, r):
    for i in range(4):
        dx = -0.30 + i * 0.20
        cyl(f'{c}_drop{i}', 0.028, 0.26, at(dx, -0.30, 0.12), 'Z', 'chrome', c, r, verts=8)
        cyl(f'{c}_run{i}', 0.028, 0.18, at(dx, -0.38, 0.0), 'Y', 'chrome', c, r, verts=8)
    cyl(f'{c}_collector', 0.05, 0.70, at(0.0, -0.44, -0.04), 'X', 'chrome', c, r, verts=10)
def fmic(c, r):
    z0 = section_at(FRONT)[2] + 0.05
    box(f'{c}_core', -0.52, 0.52, FRONT - 0.035, FRONT - 0.015, z0, z0 + 0.12, 'alloy', c, r)
    for i in range(12):
        x = -0.48 + i * 0.087
        box(f'{c}_fin{i}', x - 0.006, x + 0.006, FRONT - 0.04, FRONT - 0.03, z0 + 0.01, z0 + 0.11, 'trim', c, r)
    both(f'{c}_tank', 0.52, 0.60, FRONT - 0.04, FRONT - 0.01, z0 - 0.01, z0 + 0.13, 'alloy', c, r)

for k, f in INTAKES.items(): bay_part(f'intake_{k}', f)
for k, f in FORCED.items(): bay_part(f'fi_{k}', f)
bay_part('headers', headers)
bay_part('fmic', fmic)

# ─── exhaust tips (outside the body; rendered held out by it) ─────────────────
EXH_TIP = {}
def exh_stock(c, r):
    EXH_TIP['stock'] = []
    for i, (x, z) in enumerate(CAR['tips']):
        cyl(f'{c}_tip{i}', 0.045, 0.18, (x, REAR + 0.04, z), 'Y', 'pipe', c, r, verts=10)
        cyl(f'{c}_hole{i}', 0.032, 0.19, (x, REAR + 0.045, z), 'Y', 'rubber', c, r, verts=8)
        EXH_TIP['stock'].append(Vector((x, REAR + 0.13, z)))
def exh_straight(c, r):
    z = CAR['tips'][0][1]
    cyl(f'{c}_pipe', 0.06, 0.70, (-0.40, REAR - 0.30, z - 0.06), 'Y', 'pipe', c, r, verts=12)
    cyl(f'{c}_tip', 0.075, 0.14, (-0.40, REAR + 0.08, z - 0.04), 'Y', 'chrome', c, r, verts=14)
    cyl(f'{c}_hole', 0.055, 0.15, (-0.40, REAR + 0.085, z - 0.04), 'Y', 'rubber', c, r, verts=12)
    EXH_TIP['straight'] = [Vector((-0.40, REAR + 0.16, z - 0.04))]
def exh_side(c, r):
    EXH_TIP['side'] = []
    y = AXLES['r'] - TIRE_R - 0.20; z = section_at(y)[2] + 0.02
    for s in (1, -1):
        cyl(f'{c}_tip{s}', 0.05, 0.16, (s * (W + 0.02), y, z), 'X', 'chrome', c, r, verts=10)
        cyl(f'{c}_hole{s}', 0.036, 0.17, (s * (W + 0.025), y, z), 'X', 'rubber', c, r, verts=8)
        EXH_TIP['side'].append(Vector((s * (W + 0.12), y, z)))
EXHAUSTS = {'stock': exh_stock, 'straight': exh_straight, 'side': exh_side}
for k, f in EXHAUSTS.items():
    root = empty(f'r_exh_{k}', parent=BODY); f(f'exhaust_{k}', root)

# ─── lamps (lit lenses + beams) and the ground shadow ─────────────────────────
if BLUEPRINT:
    bp_lamps()
else:
    lights_front('lamps', BODY, 'lit_head', 'lit_amber', lit=True)
    lights_rear('lamps', BODY, 'lit_tail', lit=True)
if BLUEPRINT:
    _lens = next((sh['pts'] for sh in CAR['bp'].get('front', []) if sh['mat'] == 'lens'), [(0.6, 0.6)])
    hx = sum(abs(x) for x, z in _lens) / len(_lens); hz = sum(z for x, z in _lens) / len(_lens)
else:
    hd = CAR['head']; hx = (hd['x'][0] + hd['x'][1]) / 2; hz = (hd['z'][0] + hd['z'][1]) / 2
for s in (1, -1):
    bm = bmesh.new()
    tip = bm.verts.new((s * hx, FRONT - 0.03, hz))
    far = [bm.verts.new((s * hx + 0.40 * math.cos(a), FRONT - 1.5, 0.05 + 0.22 * math.sin(a))) for a in [i * 2 * math.pi / 10 for i in range(10)]]
    for i in range(10): bm.faces.new((tip, far[i], far[(i + 1) % 10]))
    me = bpy.data.meshes.new(f'beam{s}'); bm.to_mesh(me); bm.free()
    new_obj(f'beam{s}', me, 'beam', 'lamps', BODY)

poly('shadow', [(x, y, 0.004) for x, y in [(-W - 0.06, FRONT - 0.05), (W + 0.06, FRONT - 0.05), (W + 0.06, REAR + 0.05), (-W - 0.06, REAR + 0.05)]],
     [(0, 1, 2, 3)], 'shadow', 'shadow', ROOT)

# ─── smoke, puffs and fumes (positions set per frame in car space) ────────────
PUFFS = [sphere(f'puff{i}', 1.0, (0, 0, 0), 'smoke', 'smoke', None) for i in range(16)]
PUFFS_LIGHT = [sphere(f'lpuff{i}', 1.0, (0, 0, 0), 'puff', 'puff', None) for i in range(10)]
FUMES = [sphere(f'fume{i}', 1.0, (0, 0, 0), 'fume', 'fumes', None, sub=1) for i in range(12)]

def to_world(v):
    update(); return ROOT.matrix_world @ v

def place(puffs, positions):
    for p, pr in zip(puffs, positions):
        if pr is None: p.hide_render = True; continue
        loc, r = pr
        p.hide_render = False; p.location = to_world(loc); p.scale = (r, r, r * 0.9)

def out_dir(tip, back=0.4):
    return Vector((0, 1, 0)) if abs(tip.x) < W else Vector((1 if tip.x > 0 else -1, back, 0))

def smoke_exhaust(t, tips):
    """Broken engine: black smoke rolling out of the tailpipe(s), drifting back and up."""
    out = []; n = len(PUFFS)
    for i in range(n):
        u = (t + i / n) % 1.0
        tip = tips[i % len(tips)]
        side = math.sin(i * 2.4) * 0.3
        loc = tip + out_dir(tip) * (0.15 + 1.0 * u) + Vector((side * u, 0.3 * u, 0.05 + 1.8 * u ** 0.8))
        out.append(None if u > 0.92 else (loc, 0.09 + 0.48 * u ** 0.7))
    return out

def fumes(t, tips):
    """Running: thin white exhaust vapour, small wisps that rise and vanish."""
    out = []; n = len(FUMES)
    for i in range(n):
        u = (t + i / n) % 1.0
        tip = tips[i % len(tips)]
        sway = math.sin(i * 1.9 + u * 6.0) * 0.08
        loc = tip + out_dir(tip, 0.2) * (0.08 + 0.45 * u) + Vector((sway, 0.1 * u, 0.02 + 0.55 * u))
        out.append(None if u > 0.85 else (loc, 0.035 + 0.11 * math.sin(min(1.0, u * 1.4) * math.pi * 0.8)))
    return out

def smoke_hood(t):
    """Engine failure: smoke forced out of the shut lid's seams."""
    hw = LID_W - 0.05
    seams = [(-hw * 0.7, BAY_Y0 + 0.05), (0.0, BAY_Y0 + 0.03), (hw * 0.7, BAY_Y0 + 0.05), (-hw, CENTER_Y - 0.2), (hw, CENTER_Y + 0.1),
             (0.0, BAY_Y1 - 0.03), (-hw * 0.5, BAY_Y1 - 0.04), (hw * 0.5, BAY_Y1 - 0.04)]
    out = []; n = len(PUFFS)
    for i in range(n):
        u = (t + i / n) % 1.0
        sx, sy = seams[i % len(seams)]; drift = math.sin(i * 1.7) * 0.25
        z0 = LID_Z0 + (LID_Z1 - LID_Z0) * ((sy - BAY_Y0) / (BAY_Y1 - BAY_Y0))
        out.append(None if u > 0.92 else (Vector((sx + drift * u, sy - 0.15 * u, z0 + 0.02 + 1.5 * u ** 0.85)), 0.08 + 0.42 * u ** 0.7))
    return out

def start_puff(t, tips):
    """The catch: one quick grey cough from the exhaust, gone in under half a second."""
    out = []
    for i in range(len(PUFFS_LIGHT)):
        tip = tips[i % len(tips)]
        u = t * 1.2 - i * 0.04
        if u <= 0 or u >= 1: out.append(None); continue
        spread = Vector((math.sin(i * 2.1) * 0.25, math.cos(i * 1.3) * 0.2, math.sin(i * 0.7) * 0.15))
        out.append((tip + out_dir(tip, 0.3) * (0.1 + 0.7 * u) + spread * u + Vector((0, 0, 0.35 * u)), 0.10 + 0.30 * math.sin(u * math.pi)))
    return out

# ═══ THE DYNO CELL (kept bare: the car is the subject) ════════════════════════
ENV = empty('env')          # the room: always at the front-engine angle, so the walls stay behind the car
DECK = empty('deck')        # the dyno itself: turned with the car, so the car sits square on it
FLOOR = -0.30               # garage floor; the dyno deck is the car's ground (z = 0)
ROLL_R = 0.13 * K
ROLL_DY = 0.21 * K
ROLL_Z = HUB_Z - math.sqrt((TIRE_R + ROLL_R) ** 2 - ROLL_DY ** 2)
DW = W + 0.50               # deck half-width
DY0, DY1 = FRONT - 0.50, REAR + 0.45

def build_garage():
    # The room, and the workshop against its walls. Everything stays on the walls:
    # the floor round the dyno is kept clear, so the car stays the subject.
    E = ENV; c = 'garage'
    BW = DY1 + 1.30                  # back wall face
    SW = DW + 2.40                   # side wall face
    box('floor', -7, 7, -7, 7, FLOOR - 0.05, FLOOR, 'concrete', c, E)
    box('backwall', -7, 7, BW, BW + 0.15, FLOOR, 4.5, 'wall', c, E)
    box('sidewall', SW, SW + 0.15, -7, BW + 0.15, FLOOR, 4.5, 'wall', c, E)
    for x in [-3.0, 0.0, 3.0]:
        box(f'beam_b{x}', x - 0.08, x + 0.08, BW - 0.05, BW, FLOOR, 4.5, 'wall_trim', c, E)
    box('skirting', -7, SW, BW - 0.08, BW, FLOOR, FLOOR + 0.12, 'steel', c, E)
    box('tube', -1.6, 1.6, BW - 0.20, BW - 0.12, 3.0, 3.05, 'tube_light', c, E)

    # ── back wall ──
    # neon sign, high and centred
    sign = bpy.data.curves.new('tc_sign', 'FONT'); sign.body = 'TUNECITY'; sign.size = 0.42
    sign.align_x = 'CENTER'; sign.align_y = 'CENTER'; sign.extrude = 0.02
    so = bpy.data.objects.new('tc_sign', sign); so.location = (0.2, BW - 0.04, 2.30); so.rotation_euler = (math.radians(90), 0, 0)
    so.data.materials.append(MATS['neon_pink']); C(c).objects.link(so); attach(so, E)
    box('sign_bar', -1.05, 1.45, BW - 0.03, BW - 0.01, 1.97, 2.00, 'neon_cyan', c, E)
    # pegboard with tools, left
    box('peg', -3.0, -1.6, BW - 0.03, BW, 0.85, 1.85, 'pegboard', c, E)
    for i in range(6):
        x = -2.85 + i * 0.22
        top = 1.65 - (i % 3) * 0.12
        box(f'wrench{i}', x - 0.02, x + 0.02, BW - 0.05, BW - 0.03, 1.05, top, 'alloy', c, E)
        box(f'wrenchhead{i}', x - 0.045, x + 0.045, BW - 0.05, BW - 0.03, top - 0.03, top + 0.03, 'alloy', c, E)
    box('hammer', -1.85, -1.81, BW - 0.06, BW - 0.03, 1.00, 1.50, 'wood', c, E)
    box('hammerhead', -1.92, -1.74, BW - 0.06, BW - 0.03, 1.48, 1.56, 'steel', c, E)
    box('saw', -2.05, -1.95, BW - 0.06, BW - 0.03, 1.10, 1.30, 'red', c, E)
    # parts shelf, far left: boxes, a turbo, a cylinder head, a spare tire
    box('shelf', -4.9, -3.3, BW - 0.45, BW, FLOOR, 1.95, 'shelf', c, E)
    for z in (FLOOR + 0.10, FLOOR + 0.80, FLOOR + 1.50):
        box(f'board{z:.2f}', -4.9, -3.3, BW - 0.45, BW, z, z + 0.04, 'steel', c, E)
    for i, (x0, w_, h_) in enumerate([(-4.8, 0.40, 0.30), (-4.3, 0.35, 0.40), (-3.85, 0.45, 0.25)]):
        box(f'carton{i}', x0, x0 + w_, BW - 0.40, BW - 0.05, FLOOR + 0.14, FLOOR + 0.14 + h_, 'cardboard', c, E)
    t = sphere('shelf_turbo', 0.16, (-4.45, BW - 0.22, FLOOR + 1.0), 'pipe', c, E); t.scale = (1, 0.7, 1)
    cyl('shelf_turbo_c', 0.09, 0.14, (-4.25, BW - 0.22, FLOOR + 1.0), 'X', 'alloy', c, E, verts=12)
    box('shelf_head', -3.95, -3.40, BW - 0.38, BW - 0.08, FLOOR + 0.84, FLOOR + 1.00, 'alloy', c, E, bevel=0.02)
    box('shelf_cover', -3.92, -3.43, BW - 0.36, BW - 0.10, FLOOR + 1.00, FLOOR + 1.06, 'red', c, E)
    cyl('shelf_tire', 0.30, 0.22, (-4.2, BW - 0.22, FLOOR + 1.84), 'Y', 'rubber', c, E, verts=16)
    cyl('shelf_rim', 0.17, 0.23, (-4.2, BW - 0.22, FLOOR + 1.84), 'Y', 'alloy', c, E, verts=12)
    # posters, right of the sign
    box('poster1', 1.6, 2.3, BW - 0.02, BW, 1.30, 2.10, 'poster_a', c, E)
    box('poster1_car', 1.7, 2.2, BW - 0.03, BW - 0.02, 1.50, 1.70, 'poster_ink', c, E)
    box('poster1_wheel', 1.75, 1.85, BW - 0.035, BW - 0.025, 1.45, 1.55, 'poster_ink', c, E)
    box('poster1_wheel2', 2.05, 2.15, BW - 0.035, BW - 0.025, 1.45, 1.55, 'poster_ink', c, E)
    box('poster2', 2.5, 3.1, BW - 0.02, BW, 1.40, 2.05, 'poster_b', c, E)
    box('poster2_text', 2.6, 3.0, BW - 0.03, BW - 0.02, 1.85, 1.95, 'paper', c, E)
    # roll-up door, far right of the back wall
    box('door', 3.4, 6.0, BW - 0.04, BW, FLOOR, 2.6, 'door', c, E)
    for i in range(13):
        z = FLOOR + 0.1 + i * 0.2
        box(f'slat{i}', 3.4, 6.0, BW - 0.06, BW - 0.04, z, z + 0.03, 'steel', c, E)

    # ── side wall ──
    # red rolling tool chest near the back corner
    ty0 = BW - 1.75
    box('chest', SW - 0.62, SW, ty0, ty0 + 1.10, FLOOR + 0.08, FLOOR + 1.05, 'chest', c, E, bevel=0.02)
    for i in range(6):
        z = FLOOR + 0.22 + i * 0.14
        box(f'drawer{i}', SW - 0.63, SW - 0.61, ty0 + 0.08, ty0 + 1.02, z, z + 0.02, 'alloy', c, E)
    box('chest_top', SW - 0.58, SW, ty0 + 0.04, ty0 + 1.06, FLOOR + 1.05, FLOOR + 1.45, 'chest', c, E, bevel=0.02)
    for k in (0, 1):
        cyl(f'caster{k}', 0.05, 0.05, (SW - 0.50, ty0 + 0.1 + k * 0.9, FLOOR + 0.05), 'X', 'rubber', c, E, verts=8)
    # workbench with a vise, an engine block and pistons; tool rack and lamp above
    by0 = BW - 4.4
    box('bench', SW - 0.75, SW, by0, by0 + 2.0, FLOOR + 0.85, FLOOR + 0.92, 'bench_top', c, E)
    for yy in (by0 + 0.05, by0 + 1.90):
        box(f'bench_leg{yy:.2f}', SW - 0.70, SW - 0.64, yy, yy + 0.05, FLOOR, FLOOR + 0.85, 'steel', c, E)
    box('bench_shelf', SW - 0.72, SW, by0 + 0.05, by0 + 1.95, FLOOR + 0.25, FLOOR + 0.28, 'steel', c, E)
    box('vise', SW - 0.62, SW - 0.48, by0 + 0.15, by0 + 0.35, FLOOR + 0.92, FLOOR + 1.06, 'blue', c, E)
    box('block', SW - 0.62, SW - 0.18, by0 + 0.60, by0 + 1.15, FLOOR + 0.92, FLOOR + 1.20, 'alloy', c, E, bevel=0.02)
    box('blockhead', SW - 0.58, SW - 0.22, by0 + 0.64, by0 + 1.11, FLOOR + 1.20, FLOOR + 1.30, 'red', c, E, bevel=0.015)
    for i in range(3):
        cyl(f'piston{i}', 0.04, 0.08, (SW - 0.45, by0 + 1.35 + i * 0.12, FLOOR + 0.96), 'Z', 'chrome', c, E, verts=10)
    box('bin', SW - 0.65, SW - 0.15, by0 + 0.10, by0 + 1.80, FLOOR + 0.28, FLOOR + 0.55, 'cardboard', c, E)
    box('rack', SW - 0.03, SW, by0 + 0.1, by0 + 1.9, FLOOR + 1.25, FLOOR + 1.95, 'pegboard', c, E)
    for i in range(7):
        yy = by0 + 0.25 + i * 0.24
        box(f'rack_tool{i}', SW - 0.06, SW - 0.03, yy - 0.02, yy + 0.02, FLOOR + 1.35, FLOOR + 1.85 - (i % 2) * 0.15, 'alloy', c, E)
    box('benchlamp', SW - 0.40, SW - 0.02, by0 + 0.85, by0 + 1.15, FLOOR + 2.15, FLOOR + 2.20, 'lamp_glow', c, E)
    # tire stack in the back corner, oil drum beside the shelf
    for k in range(4):
        cyl(f'stack{k}', 0.32, 0.22, (SW - 0.50, BW - 0.45, FLOOR + 0.11 + k * 0.22), 'Z', 'rubber', c, E, verts=18)
        cyl(f'stackhole{k}', 0.18, 0.225, (SW - 0.50, BW - 0.45, FLOOR + 0.11 + k * 0.22), 'Z', 'black', c, E, verts=12)
    cyl('drum', 0.30, 0.90, (-3.0, BW - 0.40, FLOOR + 0.45), 'Z', 'drum', c, E, verts=16)
    cyl('drum_lid', 0.30, 0.02, (-3.0, BW - 0.40, FLOOR + 0.91), 'Z', 'steel', c, E, verts=16)

def build_dyno():
    E = DECK; c = 'dyno'
    box('deck', -DW, DW, DY0, DY1, FLOOR, -0.005, 'steel', c, E)
    box('edge_l', -DW, -DW + 0.06, DY0, DY1, -0.03, 0.0, 'hazard_y', c, E)
    box('edge_r', DW - 0.06, DW, DY0, DY1, -0.03, 0.0, 'hazard_y', c, E)
    box('edge_f', -DW, DW, DY0, DY0 + 0.06, -0.03, 0.0, 'hazard_y', c, E)
    poly('ramp', [(-DW + 0.25, DY1, -0.005), (DW - 0.25, DY1, -0.005), (DW - 0.25, DY1 + 0.95, FLOOR), (-DW + 0.25, DY1 + 0.95, FLOOR)], [(0, 1, 2, 3)], 'steel', c, E)
    for ax in DRIVEN:
        y = AXLES[ax]
        box(f'pit_{ax}', -DW + 0.15, DW - 0.15, y - 0.42 * K, y + 0.42 * K, -0.004, 0.0, 'black', c, E)
    for ax in AXLES:
        if ax in DRIVEN: continue
        for s in (1, -1):
            for dy in (-1, 1):
                yy = AXLES[ax] + dy * (TIRE_R + 0.05)
                box(f'chock{ax}{s}{dy}', s * HUB_X - 0.12, s * HUB_X + 0.12, yy - 0.06, yy + 0.06, 0.0, 0.10 * K, 'hazard_y', c, E)

build_garage(); build_dyno()

ROLL_PIVOTS = []
for ax in DRIVEN:
    for dy in (-ROLL_DY, ROLL_DY):
        y = AXLES[ax] + dy
        piv = empty(f'roller_{ax}{dy:.2f}', (0, y, ROLL_Z), parent=DECK)
        cyl(f'roller_{ax}{dy:.2f}', ROLL_R, 2 * (DW - 0.20), (0, y, ROLL_Z), 'X', 'roller', 'rollers', piv, verts=16)
        for k in range(3):
            a = k * 2 * math.pi / 3
            mk = box(f'rmark_{ax}{dy:.2f}{k}', -(DW - 0.20), DW - 0.20, -0.02, 0.02, -0.006, 0.006, 'roller_mark', 'rollers', None)
            mk.matrix_world = Matrix.Translation((0, y + (ROLL_R + 0.002) * math.cos(a), ROLL_Z + (ROLL_R + 0.002) * math.sin(a))) @ Matrix.Rotation(a, 4, 'X')
            attach(mk, piv)
        ROLL_PIVOTS.append(piv)

# ═══ CAMERAS, POSING, RENDERING ══════════════════════════════════════════════
cam = bpy.data.objects.new('tc_cam', bpy.data.cameras.new('tc_cam'))
cam.data.type = 'ORTHO'
cam.location = (0, -14, 14 * math.tan(math.radians(ELEV)))
cam.rotation_euler = (math.radians(90 - ELEV), 0, 0)
scene.collection.objects.link(cam); scene.camera = cam

VIEW = {'dyno': dict(w=384, h=256, cx=200, cy=150), 'spin': dict(w=256, h=256, cx=128, cy=140)}

def set_view(v):
    """Ortho camera at a fixed pixel scale; the car's bounding box centred on (cx, cy)."""
    cfg = VIEW[v]
    scene.render.resolution_x, scene.render.resolution_y = cfg['w'], cfg['h']
    cam.data.ortho_scale = max(cfg['w'], cfg['h']) / PX_PER_M
    cam.data.shift_x = cam.data.shift_y = 0
    # rear- and mid-engine cars back onto the dyno: their engine lid and tailpipes face the camera
    yaw = (DYNO_YAW if AT == 'front' else 180 + DYNO_YAW) if v == 'dyno' else 0
    ROOT.rotation_euler = DECK.rotation_euler = (0, 0, math.radians(yaw))
    ENV.rotation_euler = (0, 0, math.radians(DYNO_YAW if v == 'dyno' else 0))
    from bpy_extras.object_utils import world_to_camera_view
    update()
    top = G['zt'] + 0.2
    pts = [ROOT.matrix_world @ Vector((x, y, z)) for x in (-W, W) for y in (FRONT, REAR) for z in (0, top)]
    ps = [world_to_camera_view(scene, cam, p) for p in pts]
    cx = (min(p.x for p in ps) + max(p.x for p in ps)) / 2 * cfg['w']
    cy = (min(p.y for p in ps) + max(p.y for p in ps)) / 2 * cfg['h']
    big = max(cfg['w'], cfg['h'])
    cam.data.shift_x = (cx - cfg['cx']) / big
    cam.data.shift_y = (cy - (cfg['h'] - cfg['cy'])) / big

def pose(idle=0, lid=False, spin=None, wheel_a=0.0, roll_a=0.0):
    z, roll, rock = IDLE[idle]
    BODY.location = (0, 0, z); BODY.rotation_euler = (0, math.radians(roll), 0)
    for p in (LID_PIVOT, LID_PIVOT_FG):
        p.rotation_euler = (LID_OPEN if lid else 0, 0, 0)
    for k, r in ENG_ROOTS.items():
        rz = r.rotation_euler.z
        r.rotation_euler = (0, math.radians(rock), rz)
    for (ax, s), h in HUBS.items():
        h.rotation_euler = (wheel_a if ax in DRIVEN else 0, 0, 0)
    for p in ROLL_PIVOTS:
        p.rotation_euler = (roll_a, 0, 0)
    if spin is not None:
        ROOT.rotation_euler = (0, 0, math.radians(spin))

def hide_all_puffs():
    for p in PUFFS + PUFFS_LIGHT + FUMES: p.hide_render = True

JOBS = []
def job(view, layer, variant, frame, setup):
    JOBS.append((view, layer, variant, frame, setup))

def render_job(view, layer, variant, frame, setup):
    name = f'{view}/{layer}/{variant}/{frame:02d}'
    if ONLY and not name.startswith(ONLY): return
    hide_all_puffs(); setup()
    path = os.path.join(RAW, view, layer, variant, f'{frame:02d}.png')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)

BODY_SETS = ['body', 'body_fg']
TIRE_SETS = [(t, rs) for t in TIRES for rs in RIM_R]
WHEEL_STEP = 2 * math.pi / WHEEL_FRAMES
SPRUNG_HOLD = ['body', 'wheel_mask']

def dyno_jobs():
    v = 'dyno'
    job(v, 'garage', 'base', 0, lambda: (show(['garage', 'dyno']), pose()))
    job(v, 'shadow', 'base', 0, lambda: (show(['shadow']), pose()))
    for f in range(WHEEL_FRAMES):
        job(v, 'rollers', 'base', f, lambda f=f: (show(['rollers']), pose(roll_a=-f * (2 * math.pi / 3) / WHEEL_FRAMES)))
    for bset in BODY_SETS:
        for lid in (False, True):
            for i in range(4):
                job(v, 'body', f'{bset}_{"open" if lid else "closed"}', i, lambda b=bset, l=lid, i=i: (show([b], holdout=['wheel_mask']), pose(i, l)))
    for t, rs in TIRE_SETS:
        for f in range(WHEEL_FRAMES):
            job(v, 'tires', f'{t}_{rs}', f, lambda t=t, rs=rs, f=f: (show([f'tire_{t}_{rs}']), pose(wheel_a=f * WHEEL_STEP)))
    for w in WHEELS:
        for f in range(WHEEL_FRAMES):
            job(v, 'rims', w, f, lambda w=w, f=f: (show([f'rim_{w}']), pose(wheel_a=f * WHEEL_STEP)))
    for b in ('stock', 'big_kit', 'carbon'):
        job(v, 'brakes', b, 0, lambda b=b: (show([f'brake_{b}'], holdout=['tire_street_r15']), pose()))
    for k in ENGINES:
        for i in range(4):
            job(v, 'engine', k, i, lambda k=k, i=i: (show([f'engine_{k}'], holdout=SPRUNG_HOLD), pose(i, True)))
    bay = [f'intake_{k}' for k in INTAKES] + [f'fi_{k}' for k in FORCED] + ['headers']
    for part in bay:
        layer, variant = part.split('_', 1) if part != 'headers' else ('headers', 'base')
        for i in range(4):
            job(v, layer, variant, i, lambda p=part, i=i: (show([p], holdout=SPRUNG_HOLD), pose(i, True)))
    for i in range(4):
        job(v, 'fmic', 'base', i, lambda i=i: (show(['fmic'], holdout=SPRUNG_HOLD), pose(i)))
        job(v, 'lights', 'base', i, lambda i=i: (show(['lamps'], holdout=SPRUNG_HOLD), pose(i)))
        for k in EXHAUSTS:
            job(v, 'exhaust', k, i, lambda k=k, i=i: (show([f'exhaust_{k}'], holdout=SPRUNG_HOLD), pose(i)))
    hold = ['body', 'wheel_mask', 'tire_street_r15']
    for origin, tips_key in (('rear', 'stock'), ('side', 'side')):
        for f in range(16):
            job(v, 'smoke_exhaust', origin, f, lambda tk=tips_key, f=f: (show(['smoke'], holdout=hold), pose(), place(PUFFS, smoke_exhaust(f / 16, EXH_TIP[tk]))))
            job(v, 'fumes', origin, f, lambda tk=tips_key, f=f: (show(['fumes'], holdout=hold), pose(), place(FUMES, fumes(f / 16, EXH_TIP[tk]))))
        for f in range(10):
            job(v, 'start_puff', origin, f, lambda tk=tips_key, f=f: (show(['puff'], holdout=hold), pose(), place(PUFFS_LIGHT, start_puff(f / 10, EXH_TIP[tk]))))
    for f in range(16):
        job(v, 'smoke_hood', 'base', f, lambda f=f: (show(['smoke'], holdout=SPRUNG_HOLD), pose(), place(PUFFS, smoke_hood(f / 16))))

def spin_jobs():
    v = 'spin'
    for a in range(SPIN_ANGLES):
        ang = a * 360 / SPIN_ANGLES
        for bset in BODY_SETS:
            job(v, 'body', bset, a, lambda b=bset, ang=ang: (show([b], holdout=['wheel_mask']), pose(spin=ang)))
        job(v, 'shadow', 'base', a, lambda ang=ang: (show(['shadow']), pose(spin=ang)))
        for t, rs in TIRE_SETS:
            job(v, 'tires', f'{t}_{rs}', a, lambda t=t, rs=rs, ang=ang: (show([f'tire_{t}_{rs}']), pose(spin=ang)))
        for w in WHEELS:
            job(v, 'rims', w, a, lambda w=w, ang=ang: (show([f'rim_{w}']), pose(spin=ang)))
        for b in ('stock', 'big_kit', 'carbon'):
            job(v, 'brakes', b, a, lambda b=b, ang=ang: (show([f'brake_{b}'], holdout=['tire_street_r15']), pose(spin=ang)))
        for k in EXHAUSTS:
            job(v, 'exhaust', k, a, lambda k=k, ang=ang: (show([f'exhaust_{k}'], holdout=SPRUNG_HOLD), pose(spin=ang)))
        job(v, 'fmic', 'base', a, lambda ang=ang: (show(['fmic'], holdout=SPRUNG_HOLD), pose(spin=ang)))

for o in bpy.data.objects:
    if o.type == 'MESH' and not o.name.startswith(('tc_puff', 'tc_lpuff', 'tc_fume')):
        for p in o.data.polygons: p.use_smooth = False

PREVIEW = ARGS[ARGS.index('--preview') + 1] if '--preview' in ARGS else None

if BUILD_ONLY or PREVIEW:
    # On the dyno, lid up, lights on, stock parts, seen through the game camera.
    set_view('dyno')
    show(['garage', 'dyno', 'rollers', 'shadow', 'body', 'lamps', 'tire_street_r15', 'rim_steel_15', 'brake_stock',
          'engine_' + {'charger_69': 'v8_hemi', 'm4': 'i6_bmw', 'urus': 'v8_twin_turbo', 'corvette': 'v8_ls', 'hellcat': 'v8_blower',
                       'ram_trx': 'v8_hemi', 'wrx': 'flat_subaru', 'mystery_0e': 'v8_twin_turbo', 'mystery_ae': 'flat_porsche'}.get(CAR_KEY, 'i4_honda'),
          'intake_stock', 'exhaust_stock'])
    pose(0, lid=True)
    scene.render.film_transparent = False
    if PREVIEW:
        # Two quick checks of the whole build at 2x: lid shut, lid open; and the side at spin angle 90.
        scene.render.resolution_percentage = 200
        for lid in (False, True):
            pose(0, lid=lid); scene.render.filepath = f'{PREVIEW}_{"open" if lid else "closed"}.png'
            bpy.ops.render.render(write_still=True)
        show(['body', 'tire_street_r15', 'rim_steel_15', 'exhaust_stock']); set_view('spin'); pose(spin=90)
        scene.render.filepath = f'{PREVIEW}_side.png'; bpy.ops.render.render(write_still=True)
        raise SystemExit
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            area.spaces[0].shading.type = 'RENDERED'
            area.spaces[0].region_3d.view_perspective = 'CAMERA'
    raise SystemExit

meta = {'car': CAR_KEY, 'game_id': CAR['game_id'], 'engine_at': AT, 'drive': CAR['drive'], 'views': {}}
for v in VIEWS:
    JOBS.clear(); set_view(v)
    (dyno_jobs if v == 'dyno' else spin_jobs)()
    print(f'{CAR_KEY} {v}: {len(JOBS)} renders')
    for j in JOBS: render_job(*j)
    meta['views'][v] = {'w': VIEW[v]['w'], 'h': VIEW[v]['h']}
os.makedirs(RAW, exist_ok=True)
old = {}
mp = os.path.join(RAW, 'views.json')
if os.path.exists(mp):
    old = json.load(open(mp)).get('views', {})
meta['views'] = {**old, **meta['views']}
with open(mp, 'w') as fh: json.dump(meta, fh)
print('DONE', CAR_KEY)
