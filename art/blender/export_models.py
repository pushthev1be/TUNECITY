"""
Export each TuneCity car as a standalone, game-ready model for the asset pack.

    blender -b --factory-startup --python art/blender/export_models.py -- --car civic_eg --out <dir>

Builds the car with tunecity_cars.py, throws away everything that is only there
for the sprite pipeline (dyno, garage, smoke, part variants, masks), and merges
the rest into a few clean objects with sensible pivots:

  <Name>_Body        everything sprung that does not move
  <Name>_Hood        the hood (or engine lid), origin on its hinge: rotate X to open
  <Name>_Engine      engine + airbox, in the bay
  <Name>_Wheel_FL..  tire + rim + disc, origin at the hub: rotate X to roll
  <Name>_Caliper_FL. the brake caliper, which does not roll

The cel-shading node graphs the sprites use do not survive glTF/FBX export, so
every material becomes a plain Principled BSDF (or emission for lamps) with the
same colour. Writes GLB, FBX, OBJ and a .blend, and a preview render.
"""
import bpy, math, os, sys
from mathutils import Vector, Matrix

ARGS = sys.argv[sys.argv.index('--') + 1:]
CAR_KEY = ARGS[ARGS.index('--car') + 1]
OUTDIR = ARGS[ARGS.index('--out') + 1]
HERE = os.path.dirname(os.path.abspath(__file__))

NAMES = {
    'civic_eg': 'Hatch92', 'charger_69': 'Muscle69', 'm4': 'EuroCoupe', 'urus': 'SuperSUV',
    'corvette': 'MidEngineSports', 'camry': 'FamilySedan', 'hellcat': 'MuscleSedan', 'ram_trx': 'OffroadPickup',
    'wrx': 'RallySedan', 'mystery_0e': 'BoxSUV', 'mystery_88': 'SportSedan', 'mystery_ae': 'RearEngineGT',
}
STOCK_ENGINE = {
    'civic_eg': 'i4_honda', 'charger_69': 'v8_hemi', 'm4': 'i6_bmw', 'urus': 'v8_twin_turbo', 'corvette': 'v8_ls',
    'camry': 'i4_honda', 'hellcat': 'v8_blower', 'ram_trx': 'v8_hemi', 'wrx': 'flat_subaru', 'mystery_0e': 'v8_twin_turbo',
    'mystery_88': 'v8_twin_turbo', 'mystery_ae': 'flat_porsche',
}
NAME = NAMES[CAR_KEY]
KEEP = {'body', 'tire_performance_r17', 'rim_enkei_17', 'brake_stock', f'engine_{STOCK_ENGINE[CAR_KEY]}', 'intake_stock', 'exhaust_stock', 'rig'}

# ── build the car with the sprite builder, stopping before it renders anything ─
src = open(os.path.join(HERE, 'tunecity_cars.py'), encoding='utf-8').read()
src = src[:src.index("PREVIEW = ARGS")]
sys.argv = ['blender', '--', '--car', CAR_KEY]
g = {'__file__': os.path.join(HERE, 'tunecity_cars.py'), '__name__': '__main__'}
exec(compile(src, 'tunecity_cars.py', 'exec'), g)
scene = g['scene']; COLLS = g['COLLS']
g['ROOT'].rotation_euler = (0, 0, 0); g['ENV'].rotation_euler = (0, 0, 0)
g['pose'](0, lid=False)
g['update']()

# ── plain materials ────────────────────────────────────────────────────────────
def plain(m):
    """The colour a cel material shows, as a Principled BSDF (emission for lamps)."""
    nodes = m.node_tree.nodes
    em = next((n for n in nodes if n.type == 'EMISSION'), None)
    lit = em is not None and not em.inputs['Color'].is_linked
    color = em.inputs['Color'].default_value[:] if lit else None
    if not lit:
        mul = next((n for n in nodes if n.type == 'MIX_RGB' and n.blend_type == 'MULTIPLY'), None)
        if mul and not mul.inputs[2].is_linked:
            color = mul.inputs[2].default_value[:]
        else:   # rusted paint: the clean colour is the mix's first input
            mix = next((n for n in nodes if n.type == 'MIX_RGB' and n.blend_type == 'MIX'), None)
            color = mix.inputs[1].default_value[:] if mix else (0.5, 0.5, 0.5, 1)
    alpha = 1.0
    if any(n.type == 'BSDF_TRANSPARENT' for n in nodes):
        alpha = 0.35
    nodes.clear()
    out = nodes.new('ShaderNodeOutputMaterial'); bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = color
    name = m.name
    bsdf.inputs['Roughness'].default_value = 0.15 if 'glass' in name or 'chrome' in name else 0.45
    bsdf.inputs['Metallic'].default_value = 0.9 if ('chrome' in name or 'alloy' in name) else 0.0
    if lit:
        bsdf.inputs['Emission'].default_value = color
        bsdf.inputs['Emission Strength'].default_value = 2.0
    if alpha < 1:
        bsdf.inputs['Alpha'].default_value = alpha; m.blend_method = 'BLEND'
    m.node_tree.links.new(bsdf.outputs[0], out.inputs[0])
    m.name = f'{NAME}_{name[3:] if name.startswith("tc_") else name}'

# ── drop everything the sprite pipeline needed but a game asset does not ──────
for cname, coll in list(COLLS.items()):
    if cname in KEEP: continue
    for o in list(coll.objects):
        bpy.data.objects.remove(o, do_unlink=True)
for o in list(scene.objects):
    if o.type in ('LIGHT', 'CAMERA') or o.hide_render and o.type == 'MESH':
        bpy.data.objects.remove(o, do_unlink=True)

# tow hooks sit in front of a nose that curves away from them: they float in 3D
for o in list(scene.objects):
    if '_hook' in o.name: bpy.data.objects.remove(o, do_unlink=True)
    # sidewall 'letters' only exist so a spinning tyre reads at pixel scale
    elif o.name.startswith('tc_tire_') and __import__('re').search(r'_l\d\d$', o.name): bpy.data.objects.remove(o, do_unlink=True)

dg = bpy.context.evaluated_depsgraph_get()
def bake(o):
    """Apply modifiers (bevels, arch booleans) into the mesh."""
    if o.type != 'MESH' or not o.modifiers: return
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    o.modifiers.clear(); old = o.data; o.data = me
    bpy.data.meshes.remove(old)

meshes = [o for o in scene.objects if o.type == 'MESH']
for o in meshes: bake(o)

def merge(name, objs, origin):
    """Join objs into one mesh object whose origin sits at `origin` (world)."""
    objs = [o for o in objs if o.type == 'MESH' and o.name in bpy.data.objects]
    if not objs: return None
    me = bpy.data.meshes.new(name); target = bpy.data.objects.new(name, me)
    scene.collection.objects.link(target); target.location = origin
    bpy.context.view_layer.update()
    for o in bpy.context.view_layer.objects: o.select_set(False)
    for o in objs:
        mw = o.matrix_world.copy()
        o.parent = None; o.matrix_world = mw
        o.select_set(True)
    target.select_set(True); bpy.context.view_layer.objects.active = target
    bpy.ops.object.join()
    return target

lid_pivot = g['LID_PIVOT']
lid_objs = [o for o in lid_pivot.children_recursive if o.type == 'MESH']
hubs, knuckles = g['HUBS'], g['KNUCKLES']
corner = {('f', 1): 'FL', ('f', -1): 'FR', ('r', 1): 'RL', ('r', -1): 'RR'}
wheel_sets = {k: [o for o in h.children_recursive if o.type == 'MESH'] for k, h in hubs.items()}
cal_sets = {k: [o for o in kn.children_recursive if o.type == 'MESH'] for k, kn in knuckles.items()}
eng_objs = [o for o in COLLS[f'engine_{STOCK_ENGINE[CAR_KEY]}'].objects] + list(COLLS['intake_stock'].objects)
taken = set(map(id, lid_objs)) | {id(o) for v in wheel_sets.values() for o in v} | {id(o) for v in cal_sets.values() for o in v} | set(map(id, eng_objs))
body_objs = [o for o in scene.objects if o.type == 'MESH' and id(o) not in taken]

for m in list(bpy.data.materials):
    if m.users and m.use_nodes: plain(m)

merge(f'{NAME}_Hood', lid_objs, lid_pivot.matrix_world.translation.copy())
for k, objs in wheel_sets.items(): merge(f'{NAME}_Wheel_{corner[k]}', objs, hubs[k].matrix_world.translation.copy())
for k, objs in cal_sets.items(): merge(f'{NAME}_Caliper_{corner[k]}', objs, knuckles[k].matrix_world.translation.copy())
eng = merge(f'{NAME}_Engine', eng_objs, Vector(g['ENGINE_C']))
if eng:
    # The sprites oversize the engine so it reads at pixel scale; a real model has
    # to close its hood over it. Squash it under the lid's underside.
    bpy.context.view_layer.update()
    ztop = max((eng.matrix_world @ v.co).z for v in eng.data.vertices)
    zlid = min(g['LID_Z0'], g['LID_Z1']) - 0.07
    base = g['BAY_FLOOR']
    if ztop > zlid:
        k = (zlid - base) / (ztop - base)
        eng.scale = (0.85, 0.85, k)
        bpy.context.view_layer.objects.active = eng
        for o in scene.objects: o.select_set(o == eng)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
merge(f'{NAME}_Body', body_objs, Vector((0, 0, 0)))
for o in list(scene.objects):
    if o.type == 'EMPTY': bpy.data.objects.remove(o, do_unlink=True)
for o in scene.objects:
    if o.type == 'MESH':
        for p in o.data.polygons: p.use_smooth = False

# ── export ─────────────────────────────────────────────────────────────────────
d = os.path.join(OUTDIR, NAME); os.makedirs(d, exist_ok=True)
for o in scene.objects: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(d, f'{NAME}.glb'), export_format='GLB', use_selection=False, export_apply=True)
bpy.ops.export_scene.fbx(filepath=os.path.join(d, f'{NAME}.fbx'), use_selection=False, apply_scale_options='FBX_SCALE_ALL',
                         axis_forward='-Z', axis_up='Y', bake_space_transform=True)
bpy.ops.wm.obj_export(filepath=os.path.join(d, f'{NAME}.obj'), export_selected_objects=False)

# preview: three-quarter view, soft studio light, transparent background
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); scene.collection.objects.link(cam); scene.camera = cam
cam.data.lens = 50
L = max(abs(g['FRONT']), abs(g['REAR']))
cam.location = (L * 2.3, -L * 2.6, L * 1.35)
direction = Vector((0, 0, g['G']['zt'] * 0.45)) - cam.location
cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
key = bpy.data.objects.new('key', bpy.data.lights.new('key', 'SUN')); key.data.energy = 3.5
key.rotation_euler = (math.radians(40), 0, math.radians(30)); scene.collection.objects.link(key)
fill = bpy.data.objects.new('fill', bpy.data.lights.new('fill', 'SUN')); fill.data.energy = 1.2
fill.rotation_euler = (math.radians(60), 0, math.radians(-140)); scene.collection.objects.link(fill)
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.6, 0.62, 0.68, 1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.8
scene.render.film_transparent = True
scene.render.filter_size = 1.5
scene.eevee.taa_render_samples = 32
scene.render.resolution_x, scene.render.resolution_y = 1280, 900
scene.render.filepath = os.path.join(d, f'{NAME}_preview.png')
bpy.ops.render.render(write_still=True)
bpy.data.objects.remove(cam); bpy.data.objects.remove(key); bpy.data.objects.remove(fill)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(d, f'{NAME}.blend'), compress=True)
print('EXPORTED', NAME, len([o for o in scene.objects if o.type == 'MESH']), 'objects')
