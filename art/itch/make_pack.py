"""
Assemble the itch.io pack: models, previews, pixel 360 strips, README, zip.

    # 1. export every car (see export_models.py), e.g. into build/itch/models
    for c in civic_eg charger_69 m4 urus corvette camry hellcat ram_trx wrx mystery_0e mystery_88 mystery_ae; do
      blender -b --factory-startup --python art/blender/export_models.py -- --car $c --out build/itch/models
    done
    # 2. a lineup.png of the previews in build/itch, then:
    python art/itch/make_pack.py build

Page text for itch.io lives beside this file in itch_page.md.
"""
import json, os, shutil, sys, zipfile
from PIL import Image

SP = sys.argv[1]                                                   # folder holding itch/models and itch/lineup.png
GAME = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
PACK = os.path.join(SP, 'itch', 'TuneCity_LowPoly_Car_Pack')
shutil.rmtree(PACK, ignore_errors=True)
os.makedirs(PACK)
CARS = [('civic_eg', 'Hatch92', "Hatch '92", "a 90s three-door hot hatch with a roof wing"),
        ('charger_69', 'Muscle69', "Muscle '69", "a long late-60s muscle coupe with a full-width grille and hidden lamps"),
        ('m4', 'EuroCoupe', 'Euro Coupe', "a modern German-style performance coupe with tall kidney grilles"),
        ('urus', 'SuperSUV', 'Super SUV', "a sloping-roof performance SUV"),
        ('corvette', 'MidEngineSports', 'Mid-Engine Sports', "a cab-forward mid-engine sports car with a glass engine lid"),
        ('camry', 'FamilySedan', 'Family Sedan', "an everyday four-door sedan"),
        ('hellcat', 'MuscleSedan', 'Muscle Sedan', "a modern four-door muscle sedan with tiger stripes"),
        ('ram_trx', 'OffroadPickup', 'Off-Road Pickup', "a lifted crew-cab desert pickup with an open bed"),
        ('wrx', 'RallySedan', 'Rally Sedan', "a rally-bred sedan with a hood scoop and big wing"),
        ('mystery_0e', 'BoxSUV', 'Box SUV', "an upright, boxy off-roader with round lamps and a spare wheel"),
        ('mystery_88', 'SportSedan', 'Sport Sedan', "a swept sport sedan"),
        ('mystery_ae', 'RearEngineGT', 'Rear-Engine GT', "a rear-engine track car with a swan-neck wing")]

shutil.copytree(os.path.join(SP, 'itch', 'models'), os.path.join(PACK, 'models'))
shutil.copy(os.path.join(SP, 'itch', 'lineup.png'), os.path.join(PACK, 'lineup.png'))

# Bonus: each car's pixel-art 360 strip (16 angles, 256 px frames), stock parts
bonus = os.path.join(PACK, 'bonus_pixel_360')
os.makedirs(bonus)
for key, name, _, _ in CARS:
    D = os.path.join(GAME, 'src', 'assets', 'sprites', 'car_states', key)
    M = json.load(open(os.path.join(D, 'manifest.json')))['views']['spin']['layers']
    def frames(layer, var):
        im = Image.open(os.path.join(D, 'spin', layer, var + '.png')).convert('RGBA'); n = M[layer][var]; w = im.width // n
        return [im.crop((i * w, 0, (i + 1) * w, im.height)) for i in range(n)]
    stack = [frames(*lv) for lv in [('shadow', 'base'), ('tires', 'street_r15'), ('brakes', 'stock'), ('rims', 'steel_15'), ('body', 'body'), ('exhaust', 'stock')]]
    strip = Image.new('RGBA', (256 * 16, 256))
    for a in range(16):
        f = Image.new('RGBA', (256, 256))
        for layer in stack: f.alpha_composite(layer[a])
        strip.paste(f, (a * 256, 0))
    strip.save(os.path.join(bonus, f'{name}_360_strip.png'), optimize=True)

lines = '\n'.join(f'  {name:<16} {label} - {desc}' for _, name, label, desc in CARS)
readme = f"""TuneCity Low-Poly Car Pack
==========================

12 stylised, game-ready low-poly cars from the pixel-art car-tuning game TuneCity.
Every car opens its hood, rolls its wheels and has an engine in the bay.

CARS
{lines}

FILES (in models/<Name>/)
  <Name>.glb            glTF binary  (Godot, Unity via glTFast, three.js, Babylon)
  <Name>.fbx            FBX          (Unity, Unreal; -Z forward, Y up, scale applied)
  <Name>.obj + .mtl     Wavefront OBJ
  <Name>.blend          Blender source (3.6+)
  <Name>_preview.png    1280x900 preview render (transparent background)

  lineup.png            all twelve together
  bonus_pixel_360/      each car as a 16-angle pixel-art turntable strip (256 px frames, left to right)

EACH MODEL IS 11 OBJECTS
  <Name>_Body           the body, cabin, lights, trim and exhaust tips
  <Name>_Hood           the hood (engine lid on the two rear/mid-engine cars), origin on its hinge
                        -> rotate about X to open: about -70 deg for front hoods, +70 deg for rear lids
  <Name>_Engine         the engine and airbox in the bay, visible when the hood is open
  <Name>_Wheel_FL/FR/RL/RR   tire + rim + brake disc, origin at the hub -> rotate about X to roll
  <Name>_Caliper_FL/...      the brake calipers, which do not roll

SCALE AND STYLE
  Real-world metres (about 4-5 m long). The car faces -Y in Blender, ground at Z = 0.
  Proportions are deliberately chunky (about 12% wider, 10% shorter than a real car).
  Flat-shaded, solid colours: one simple material per colour, no textures to manage.
  About 11k-13k triangles per car.

These are original stylised designs, inspired by car types. No manufacturer names,
logos or badges are used.

LICENSE
  [Set by the author before publishing - e.g. CC0, CC BY 4.0, or a custom game-dev licence.]

Made by Simon Olawuyi - simonolawuyi.com
"""
open(os.path.join(PACK, 'README.txt'), 'w', encoding='utf-8').write(readme)

shutil.copy(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'itch_page.md'), os.path.join(SP, 'itch', 'itch_page.md'))

zpath = os.path.join(SP, 'itch', 'TuneCity_LowPoly_Car_Pack.zip')
with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for root, _, files in os.walk(PACK):
        for f in files:
            full = os.path.join(root, f)
            z.write(full, os.path.relpath(full, os.path.dirname(PACK)))
print('zip', round(os.path.getsize(zpath) / 1e6, 1), 'MB')
