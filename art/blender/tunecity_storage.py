"""
TuneCity — the storage garage: a long hall of numbered, angled parking bays.

    blender -b --factory-startup --python art/blender/tunecity_storage.py
    (inside a running Blender: set BUILD_ONLY = True and TC_HERE first; builds the
    'TuneCity storage' scene and renders nothing)

Renders the empty hall once, as one wide strip, from the same camera as the cars'
360 view (26 degrees up, orthographic, 48 px per metre). Because the camera is
orthographic, a car parked in any bay looks exactly like its 360-view sprite at
one angle, just moved: so the game parks each car by pasting its spin-view
layers (with that car's own wheels, tires and so on) at the bay's pixel spot.

Writes  src/assets/sprites/storage/hall_raw.png  (pixelized to hall.png by pixelize_hall below)
        src/assets/sprites/storage/storage.json  bay pixel spots, and where each car's
                                                 origin sits inside its spin sprite
"""
import bpy, bmesh, math, os, sys, json
from mathutils import Vector

BUILD_ONLY = globals().get('BUILD_ONLY', False)
HERE = globals().get('TC_HERE') or os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', '..', 'src', 'assets', 'sprites', 'storage'))

PX_PER_M = 48
ELEV = 26
BAYS = 12
SPACING = 4.9                 # metres between bay centres
PARK_FRAME = 2                # spin-view frame the parked cars use: 2 x 22.5 = 45 degrees, nose to the right
PARK_ANGLE = PARK_FRAME * 22.5
H = 320                       # strip height in pixels
MARGIN = 2.4                  # metres of hall beyond the end bays
BACK = 3.2                    # back wall, metres behind the bay centres
CAR_ROW_Y_PX = 222            # where a bay's car origin lands, pixels from the top

# ─── scene ────────────────────────────────────────────────────────────────────
if BUILD_ONLY:
    old = [sc for sc in bpy.data.scenes if sc.name.split('.')[0] == 'TuneCity storage']
    scene = bpy.data.scenes.new('TuneCity storage build'); bpy.context.window.scene = scene
    for sc in old: bpy.data.scenes.remove(sc)
    scene.name = 'TuneCity storage'
else:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.film_transparent = False
scene.render.filter_size = 0.01
scene.view_settings.view_transform = 'Standard'
scene.eevee.taa_render_samples = 1
scene.eevee.use_soft_shadows = False
scene.eevee.shadow_cube_size = '1024'
world = bpy.data.worlds.new('ts_world'); scene.world = world; world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.05, 0.05, 0.07, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.5
sun = bpy.data.objects.new('ts_sun', bpy.data.lights.new('ts_sun', 'SUN'))
sun.data.energy = 2.2; sun.rotation_euler = (math.radians(25), 0, math.radians(-20))
scene.collection.objects.link(sun)

def cel(name, color, emit=0.0, bands=(0.55, 0.78, 1.0)):
    m = bpy.data.materials.new('ts_' + name); m.use_nodes = True
    n = m.node_tree.nodes; l = m.node_tree.links; n.clear()
    out = n.new('ShaderNodeOutputMaterial'); em = n.new('ShaderNodeEmission')
    if emit:
        em.inputs['Color'].default_value = (*color, 1); em.inputs['Strength'].default_value = emit
    else:
        d = n.new('ShaderNodeBsdfDiffuse'); s2r = n.new('ShaderNodeShaderToRGB'); r = n.new('ShaderNodeValToRGB')
        r.color_ramp.interpolation = 'CONSTANT'; e = r.color_ramp.elements
        e[0].position, e[0].color = 0.0, (bands[0],) * 3 + (1,)
        e[1].position, e[1].color = 0.40, (bands[1],) * 3 + (1,)
        e.new(0.75).color = (bands[2],) * 3 + (1,)
        mul = n.new('ShaderNodeMixRGB'); mul.blend_type = 'MULTIPLY'; mul.inputs[0].default_value = 1; mul.inputs[2].default_value = (*color, 1)
        l.new(d.outputs[0], s2r.inputs[0]); l.new(s2r.outputs[0], r.inputs[0]); l.new(r.outputs[0], mul.inputs[1]); l.new(mul.outputs[0], em.inputs['Color'])
    l.new(em.outputs[0], out.inputs[0])
    return m

M = {k: cel(k, *v) for k, v in {
    'floor': ((0.14, 0.15, 0.18),), 'line': ((0.70, 0.70, 0.66),), 'yellow': ((0.85, 0.60, 0.04),),
    'wall': ((0.12, 0.14, 0.18),), 'panel': ((0.15, 0.17, 0.21),), 'column': ((0.20, 0.13, 0.08),),
    'steel': ((0.10, 0.10, 0.12),), 'plate': ((0.80, 0.80, 0.76),), 'ink': ((0.03, 0.03, 0.04),),
    'lamp': ((1.0, 0.92, 0.70), 4.0), 'stop': ((0.85, 0.60, 0.04),),
}.items()}

def box(name, x0, x1, y0, y1, z0, z1, mat, rot_z=0.0, about=(0, 0)):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector(((x0 + x1) / 2 + v.co.x * (x1 - x0), (y0 + y1) / 2 + v.co.y * (y1 - y0), (z0 + z1) / 2 + v.co.z * (z1 - z0)))
    if rot_z:
        c, s = math.cos(rot_z), math.sin(rot_z)
        for v in bm.verts:
            x, y = v.co.x - about[0], v.co.y - about[1]
            v.co.x, v.co.y = about[0] + x * c - y * s, about[1] + x * s + y * c
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('ts_' + name, me); o.data.materials.append(M[mat]); scene.collection.objects.link(o)
    return o

def text(name, body, x, y, z, size, mat, flat=True):
    cu = bpy.data.curves.new(name, 'FONT'); cu.body = body; cu.size = size; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
    cu.extrude = 0.005
    o = bpy.data.objects.new('ts_' + name, cu); o.location = (x, y, z)
    o.rotation_euler = (0, 0, 0) if flat else (math.radians(90), 0, 0)
    o.data.materials.append(M[mat]); scene.collection.objects.link(o)
    return o

# ─── the hall ─────────────────────────────────────────────────────────────────
X0 = -(BAYS - 1) / 2 * SPACING - MARGIN; X1 = -X0
box('floor', X0 - 1, X1 + 1, -6, BACK + 0.2, -0.05, 0.0, 'floor')
box('backwall', X0 - 1, X1 + 1, BACK, BACK + 0.2, 0.0, 6.0, 'wall')
box('kerb', X0 - 1, X1 + 1, BACK - 0.35, BACK, 0.0, 0.12, 'steel')
box('stripe', X0 - 1, X1 + 1, BACK - 0.36, BACK - 0.34, 0.0, 0.125, 'yellow')
bays = []
for i in range(BAYS):
    bx = (i - (BAYS - 1) / 2) * SPACING
    bays.append(bx)
    a = math.radians(PARK_ANGLE)
    # angled bay lines either side, parallel to the parked car
    for side in (-1, 1):
        lx = bx + side * SPACING / 2
        box(f'line{i}{side}', lx - 0.04, lx + 0.04, -2.6, 2.4, 0.0, 0.006, 'line', rot_z=a, about=(lx, 0))
    # wheel stop at the head of the bay, and the bay number on the floor in front of it
    box(f'stop{i}', bx - 0.7, bx + 0.7, 1.9, 2.05, 0.0, 0.08, 'stop', rot_z=a, about=(bx, 0))
    text(f'num{i}', f'{i + 1:02d}', bx - 1.15, -2.0, 0.008, 0.55, 'line').rotation_euler = (0, 0, a)
    # back wall: a lit panel per bay with its number plate and a lamp above
    box(f'panel{i}', bx - 1.7, bx + 1.7, BACK - 0.02, BACK, 0.4, 3.6, 'panel')
    box(f'plate{i}', bx - 0.45, bx + 0.45, BACK - 0.04, BACK - 0.02, 2.4, 3.0, 'plate')
    t = text(f'wallnum{i}', f'{i + 1:02d}', bx, BACK - 0.05, 2.7, 0.42, 'ink', flat=False)
    box(f'lamp{i}', bx - 0.6, bx + 0.6, BACK - 0.30, BACK - 0.02, 3.75, 3.85, 'lamp')
    spot = bpy.data.objects.new(f'ts_spot{i}', bpy.data.lights.new(f'ts_spot{i}', 'SPOT'))
    spot.data.energy = 900; spot.data.spot_size = math.radians(70); spot.data.spot_blend = 0.0
    spot.data.color = (1.0, 0.93, 0.78)
    spot.location = (bx, BACK - 0.6, 4.2); spot.rotation_euler = (math.radians(-20), 0, 0)
    scene.collection.objects.link(spot)
for k in range(BAYS + 1):
    cx = (k - BAYS / 2) * SPACING
    box(f'column{k}', cx - 0.14, cx + 0.14, BACK - 0.16, BACK, 0.0, 6.0, 'column')
for i in range(int((X1 - X0) / 0.35)):
    x = X0 + i * 0.35
    box(f'rib{i}', x - 0.02, x + 0.02, BACK - 0.01, BACK, 3.6, 6.0, 'steel')
# end walls
box('endL', X0 - 1, X0 - 0.8, -6, BACK + 0.2, 0.0, 6.0, 'wall')
box('endR', X1 + 0.8, X1 + 1, -6, BACK + 0.2, 0.0, 6.0, 'wall')

# ─── camera: the 360 view's, widened to the whole hall ───────────────────────
W_PX = int(round((X1 - X0) * PX_PER_M))
cam = bpy.data.objects.new('ts_cam', bpy.data.cameras.new('ts_cam')); cam.data.type = 'ORTHO'
cam.location = (0, -20, 20 * math.tan(math.radians(ELEV))); cam.rotation_euler = (math.radians(90 - ELEV), 0, 0)
scene.collection.objects.link(cam); scene.camera = cam
scene.render.resolution_x, scene.render.resolution_y = W_PX, H
cam.data.ortho_scale = max(W_PX, H) / PX_PER_M
from bpy_extras.object_utils import world_to_camera_view
scene.view_layers[0].update()
p = world_to_camera_view(scene, cam, Vector((0, 0, 0)))
cam.data.shift_y = (p.y * H - (H - CAR_ROW_Y_PX)) / max(W_PX, H)
scene.view_layers[0].update()
bay_px = []
for bx in bays:
    q = world_to_camera_view(scene, cam, Vector((bx, 0, 0)))
    bay_px.append({'x': round(q.x * W_PX, 2), 'y': round(H - q.y * H, 2)})

if BUILD_ONLY:
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            area.spaces[0].shading.type = 'RENDERED'; area.spaces[0].region_3d.view_perspective = 'CAMERA'
    raise SystemExit

# ─── where each car's origin sits in its 360-view sprite ──────────────────────
# Same arithmetic as tunecity_cars.set_view('spin'): the car's bounding box is
# centred on (128, 140) of the 256 canvas, so its origin is offset by the box.
specs = {}; exec(open(os.path.join(HERE, 'car_specs.py'), encoding='utf-8').read(), specs)
bp_src = open(os.path.join(HERE, 'blueprint.py'), encoding='utf-8').read()
ns = {'math': math}; exec(bp_src[:bp_src.index('BP = CAR')], ns)
mono = ns['mono_cubic']
s26, c26 = math.sin(math.radians(ELEV)), math.cos(math.radians(ELEV))
origins = {}
for key, car in specs['CARS'].items():
    bp = car['bp']; zt = mono(bp['zt'])
    ws = bp.get('windshield') or (car['FRONT'] * 0.3, 0.0)
    back = bp.get('backlight') or (bp['side_glass'][1] - 0.2, bp['side_glass'][1])
    top = zt((ws[1] + back[0]) / 2) + 0.2
    vals = [y * s26 + z * c26 for y in (car['FRONT'], car['REAR']) for z in (0.0, top)]
    c = (min(vals) + max(vals)) / 2
    origins[car['game_id']] = {'ox': 128, 'oy': round(140 + c * PX_PER_M, 2), 'pack': key}

os.makedirs(OUT, exist_ok=True)
scene.render.image_settings.file_format = 'PNG'; scene.render.image_settings.color_mode = 'RGB'
scene.render.filepath = os.path.join(OUT, 'hall_raw.png')
bpy.ops.render.render(write_still=True)
with open(os.path.join(OUT, 'storage.json'), 'w') as fh:
    json.dump({'w': W_PX, 'h': H, 'park_frame': PARK_FRAME, 'bays': bay_px, 'cars': origins}, fh, indent=1)
print('DONE storage', W_PX, H)
