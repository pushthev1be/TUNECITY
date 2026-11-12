"""
Every TuneCity car as data for tunecity_cars.py.

Units are metres, the car faces -Y, +Z is up. Proportions are pixel-art chunky
(wider and shorter than the real cars), matched by eye to each car's existing
sprite in src/assets/sprites/rotations/.

lower      body-shell cross-sections, front to back:
           (y, sill half-width, shoulder half-width, sill z, shoulder z, top z)
green      the greenhouse: half-width at the belt (gb) and roof (gt), belt span
           y0..y1 at z zb, roof span ty0..ty1 at z zt
bay        engine bay y0..y1 (front, mid or rear), floor z, lid z at each end
drive      F, R or A: which axles the dyno drives
"""
import math

def sedan(front, rear, w, zb, zs, zt, nose=0.06, tail=0.06):
    """A generic three-box lower body."""
    return [
        (front,         w - 0.12, w - 0.08, zb + 0.08, zs - 0.14, zt - 0.10),
        (front + 0.10,  w - 0.03, w - 0.01, zb + 0.02, zs - 0.06, zt - 0.05),
        (front + 0.45,  w,        w,        zb,        zs - 0.02, zt - 0.02),
        (front * 0.40,  w,        w,        zb,        zs,        zt),
        (0.0,           w,        w,        zb,        zs,        zt),
        (rear * 0.75,   w,        w,        zb,        zs,        zt),
        (rear - 0.08,   w - 0.04, w - 0.04, zb + 0.03, zs - 0.02, zt - 0.02),
        (rear,          w - 0.10, w - 0.10, zb + 0.08, zs - 0.06, zt - 0.05),
    ]


CARS = {
    'civic_eg': dict(
        # 1992 EG hatch: low nose, long raked screen, flat roof, short steep hatch
        game_id='civic_eg_92_project', paint=(0.29, 0.30, 0.36), rust=True, drive='F', engine_at='front',
        W=0.95, FRONT=-1.83, REAR=1.83, axles=(-1.13, 1.18), tire_r=0.31,
        lower=[(-1.83, 0.76, 0.80, 0.34, 0.46, 0.56), (0.0, 0.95, 0.95, 0.22, 0.79, 0.82), (1.83, 0.84, 0.84, 0.32, 0.70, 0.76)],
        green=dict(gb=0.88, gt=0.67, y0=-0.55, y1=1.66, zb=0.79, ty0=0.05, ty1=1.12, zt=1.34),
        bay=(-1.72, -0.64), bay_floor=0.40, lid_z=(0.71, 0.83), lid_w=0.84,
        head=dict(style='rect', x=(0.32, 0.80), z=(0.55, 0.65), ind=True),
        tail=dict(style='rect', x=(0.42, 0.88), z=(0.62, 0.74)),
        grille='slot', wing='roof', doors=(-0.58, 0.50), bpillar=0.50,
        tips=[(-0.55, 0.30)], extras=['wipers', 'antenna', 'rear_wiper', 'tow_hooks'],
        bp=dict(
            zt=[(-1.83, 0.56), (-1.80, 0.64), (-1.74, 0.70), (-1.55, 0.745), (-1.00, 0.79), (-0.64, 0.83), (-0.52, 0.88),
                (0.02, 1.30), (0.30, 1.335), (0.80, 1.34), (1.12, 1.32), (1.24, 1.27), (1.62, 0.98), (1.74, 0.90),
                (1.80, 0.84), (1.83, 0.76)],
            zs=[(-1.83, 0.46), (-1.75, 0.60), (-1.20, 0.70), (-0.55, 0.79), (0.40, 0.83), (1.20, 0.87), (1.60, 0.86),
                (1.75, 0.80), (1.83, 0.70)],
            zb=[(-1.83, 0.34), (-1.72, 0.25), (-1.45, 0.22), (1.50, 0.22), (1.74, 0.25), (1.83, 0.32)],
            w=[(-1.83, 0.76), (-1.78, 0.86), (-1.66, 0.925), (-1.35, 0.95), (1.45, 0.95), (1.70, 0.925), (1.80, 0.88), (1.83, 0.84)],
            tumble=0.48, crown=0.03,
            side_glass=(-0.50, 1.58), bpillar=(0.48, 0.58), windshield=(-0.56, 0.06), backlight=(1.16, 1.68),
            front=[
                # wide slanted headlamps with an amber corner wrapping round the wing
                dict(mat='lens', pts=[(0.30, 0.555), (0.80, 0.545), (0.84, 0.590), (0.82, 0.645), (0.32, 0.655)]),
                dict(mat='lens_in', pts=[(0.40, 0.575), (0.62, 0.572), (0.62, 0.630), (0.40, 0.633)], lift=0.004),
                dict(mat='amber', pts=[(0.80, 0.545), (0.92, 0.555), (0.93, 0.610), (0.84, 0.590)]),
                dict(mat='black', pts=[(-0.27, 0.575), (0.27, 0.575), (0.27, 0.625), (-0.27, 0.625)], mirror=False),
                dict(mat='chrome', pts=[(-0.05, 0.582), (0.05, 0.582), (0.05, 0.618), (-0.05, 0.618)], mirror=False, lift=0.004),
                dict(mat='trim', pts=[(-0.92, 0.460), (0.92, 0.460), (0.92, 0.495), (-0.92, 0.495)], mirror=False),
                dict(mat='black', pts=[(-0.50, 0.330), (0.50, 0.330), (0.46, 0.420), (-0.46, 0.420)], mirror=False),
                dict(mat='black', pts=[(-0.86, 0.270), (0.86, 0.270), (0.88, 0.310), (-0.88, 0.310)], mirror=False, depth=0.20),
            ],
            rear=[
                dict(mat='tail', pts=[(0.42, 0.62), (0.86, 0.60), (0.88, 0.70), (0.84, 0.75), (0.42, 0.74)]),
                dict(mat='trim', pts=[(-0.42, 0.64), (0.42, 0.64), (0.42, 0.72), (-0.42, 0.72)], mirror=False),
                dict(mat='lens', pts=[(-0.20, 0.42), (0.20, 0.42), (0.20, 0.54), (-0.20, 0.54)], mirror=False),
                dict(mat='trim', pts=[(-0.88, 0.28), (0.88, 0.28), (0.88, 0.40), (-0.88, 0.40)], mirror=False, depth=0.12),
            ],
        ),
    ),
}


# ═══ Blueprint rebuilds ═══════════════════════════════════════════════════════
# Curves from each real car's proportions (pixel-art chunky: x1.12 wide, x0.9 long).
# See blueprint.py for what each field means.

def circle(cx, cz, r, n=12):
    return [(cx + r * math.cos(2 * math.pi * i / n), cz + r * math.sin(2 * math.pi * i / n)) for i in range(n)]

def rect(x0, z0, x1, z1):
    return [(x0, z0), (x1, z0), (x1, z1), (x0, z1)]

def sill(front, rear, z=0.24):
    return [(front, z + 0.10), (front + 0.13, z + 0.02), (front + 0.40, z), (rear - 0.35, z), (rear - 0.10, z + 0.04), (rear, z + 0.12)]

def bp_car(game_id, paint, drive, engine_at, front, rear, w, axles, tire_r, bay, bay_floor, doors, tips, wing, extras, bp, **kw):
    return dict(game_id=game_id, paint=paint, drive=drive, engine_at=engine_at, long=(drive != 'F'),
                W=w, FRONT=front, REAR=rear, axles=axles, tire_r=tire_r, bay=bay, bay_floor=bay_floor,
                doors=doors, tips=tips, wing=wing, extras=extras, grille=None, bpillar=None, bp=bp, **kw)

CARS.update({
    'charger_69': bp_car(
        'charger_69_rt', (0.022, 0.022, 0.028), 'R', 'front', -2.25, 2.25, 1.00, (-1.40, 1.27), 0.33,
        (-2.10, -0.55), 0.40, (-0.50, 0.70), [(-0.55, 0.28), (0.55, 0.28)], None, ['wipers', 'hood_bulge'],
        dict(zt=[(-2.25, 0.62), (-2.22, 0.74), (-2.10, 0.80), (-1.20, 0.83), (-0.58, 0.86), (-0.48, 0.90), (0.05, 1.29), (0.30, 1.32),
                 (0.75, 1.31), (0.95, 1.22), (1.45, 0.95), (1.60, 0.93), (2.15, 0.91), (2.22, 0.86), (2.25, 0.78)],
             zs=[(-2.25, 0.56), (-2.10, 0.70), (-0.50, 0.80), (0.60, 0.80), (1.20, 0.86), (1.60, 0.88), (2.15, 0.86), (2.25, 0.74)],
             zb=sill(-2.25, 2.25, 0.22),
             w=[(-2.25, 0.92), (-2.18, 0.98), (-1.90, 1.00), (1.90, 1.00), (2.18, 0.98), (2.25, 0.94)],
             tumble=0.50, crown=0.025, side_glass=(-0.45, 0.85), windshield=(-0.52, 0.08), backlight=(0.85, 1.48),
             front=[dict(mat='black', pts=rect(-0.90, 0.50, 0.90, 0.70), mirror=False),
                    dict(mat='chrome', pts=rect(-0.92, 0.70, 0.92, 0.725), mirror=False),
                    dict(mat='chrome', pts=rect(-0.92, 0.475, 0.92, 0.50), mirror=False),
                    *[dict(mat='trim', pts=rect(x - 0.008, 0.505, x + 0.008, 0.695), mirror=False, lift=0.003) for x in [-0.8 + 0.2 * i for i in range(9)]],
                    dict(mat='lens', pts=circle(0.62, 0.60, 0.07), lit_only=True, lift=0.006),
                    dict(mat='chrome', pts=rect(-0.98, 0.38, 0.98, 0.47), mirror=False, depth=0.20)],
             rear=[dict(mat='tail', pts=rect(-0.88, 0.58, 0.88, 0.70), mirror=False),
                   dict(mat='chrome', pts=rect(-0.90, 0.70, 0.90, 0.72), mirror=False),
                   dict(mat='lens', pts=rect(-0.20, 0.47, 0.20, 0.56), mirror=False),
                   dict(mat='chrome', pts=rect(-0.98, 0.38, 0.98, 0.46), mirror=False, depth=0.20)])),

    'm4': bp_car(
        'bmw_m4_comp', (0.02, 0.22, 0.11), 'R', 'front', -2.15, 2.15, 1.02, (-1.30, 1.27), 0.33,
        (-2.00, -0.66), 0.40, (-0.58, 0.55), [(-0.62, 0.30), (-0.46, 0.30), (0.46, 0.30), (0.62, 0.30)], 'lip', ['wipers'],
        dict(zt=[(-2.15, 0.60), (-2.12, 0.70), (-2.00, 0.76), (-1.30, 0.82), (-0.75, 0.88), (-0.62, 0.92), (-0.05, 1.32), (0.35, 1.37),
                 (0.75, 1.33), (1.25, 1.10), (1.55, 0.98), (1.95, 0.96), (2.10, 0.92), (2.15, 0.80)],
             zs=[(-2.15, 0.52), (-2.00, 0.68), (-0.70, 0.84), (0.50, 0.88), (1.40, 0.92), (1.90, 0.92), (2.15, 0.78)],
             zb=sill(-2.15, 2.15, 0.22),
             w=[(-2.15, 0.86), (-2.08, 0.96), (-1.80, 1.00), (1.60, 1.02), (2.00, 0.98), (2.15, 0.90)],
             tumble=0.50, crown=0.03, side_glass=(-0.58, 1.20), windshield=(-0.64, 0.00), backlight=(0.80, 1.55),
             front=[dict(mat='chrome', pts=[(0.02, 0.40), (0.33, 0.40), (0.35, 0.74), (0.02, 0.74)]),
                    dict(mat='black', pts=[(0.04, 0.42), (0.31, 0.42), (0.33, 0.72), (0.04, 0.72)], lift=0.003),
                    dict(mat='lens', pts=[(0.40, 0.66), (0.86, 0.70), (0.90, 0.75), (0.42, 0.72)]),
                    dict(mat='black', pts=[(0.55, 0.30), (0.88, 0.30), (0.88, 0.50), (0.62, 0.48)]),
                    dict(mat='black', pts=rect(-0.40, 0.28, 0.40, 0.36), mirror=False),
                    dict(mat='carbon', pts=rect(-0.86, 0.24, 0.86, 0.27), mirror=False, depth=0.18)],
             rear=[dict(mat='tail', pts=[(0.45, 0.82), (0.92, 0.80), (0.94, 0.88), (0.45, 0.88)]),
                   dict(mat='black', pts=[(-0.75, 0.26), (0.75, 0.26), (0.70, 0.40), (-0.70, 0.40)], mirror=False),
                   dict(mat='lens', pts=rect(-0.20, 0.50, 0.20, 0.60), mirror=False)])),

    'urus': bp_car(
        'lamborghini_urus', (0.20, 0.50, 0.02), 'A', 'front', -2.30, 2.30, 1.04, (-1.40, 1.30), 0.38,
        (-2.15, -0.78), 0.58, (-0.70, 0.45), [(-0.68, 0.50), (-0.52, 0.50), (0.52, 0.50), (0.68, 0.50)], 'roof_small', ['wipers', 'cladding', 'roof_rails'],
        dict(zt=[(-2.30, 0.80), (-2.27, 0.92), (-2.15, 0.98), (-1.40, 1.04), (-0.82, 1.10), (-0.70, 1.16), (-0.05, 1.58), (0.50, 1.62),
                 (1.00, 1.56), (1.60, 1.32), (2.05, 1.12), (2.22, 1.06), (2.30, 0.94)],
             zs=[(-2.30, 0.70), (-2.15, 0.92), (-0.75, 1.06), (0.80, 1.08), (1.80, 1.10), (2.30, 0.92)],
             zb=sill(-2.30, 2.30, 0.40),
             w=[(-2.30, 0.88), (-2.20, 0.98), (-1.90, 1.04), (1.90, 1.04), (2.20, 0.98), (2.30, 0.90)],
             tumble=0.45, crown=0.03, side_glass=(-0.70, 1.75), bpillar=(0.45, 0.55), windshield=(-0.75, -0.02), backlight=(1.20, 2.15),
             front=[dict(mat='lens', pts=[(0.45, 0.92), (0.90, 0.96), (0.93, 1.00), (0.47, 0.98)]),
                    dict(mat='black', pts=[(-0.55, 0.52), (0.55, 0.52), (0.62, 0.80), (-0.62, 0.80)], mirror=False),
                    dict(mat='black', pts=[(0.66, 0.52), (0.92, 0.55), (0.92, 0.82), (0.70, 0.82)]),
                    dict(mat='alloy', pts=rect(-0.60, 0.44, 0.60, 0.50), mirror=False, depth=0.15)],
             rear=[dict(mat='tail', pts=rect(-0.90, 1.00, 0.90, 1.05), mirror=False),
                   dict(mat='black', pts=rect(-0.95, 0.46, 0.95, 0.66), mirror=False, depth=0.15),
                   dict(mat='lens', pts=rect(-0.20, 0.80, 0.20, 0.90), mirror=False)])),

    'corvette': bp_car(
        'corvette_c5', (0.80, 0.55, 0.0), 'R', 'mid', -2.10, 2.10, 1.04, (-1.30, 1.15), 0.32,
        (0.48, 1.72), 0.46, (-0.82,), [(-0.30, 0.40), (-0.15, 0.40), (0.15, 0.40), (0.30, 0.40)], 'deck', ['side_intakes'],
        dict(zt=[(-2.10, 0.48), (-2.06, 0.56), (-1.90, 0.62), (-1.30, 0.70), (-0.95, 0.78), (-0.85, 0.82), (-0.30, 1.12), (0.25, 1.14),
                 (0.45, 1.02), (0.80, 0.98), (1.60, 0.92), (1.95, 0.90), (2.07, 0.86), (2.10, 0.76)],
             zs=[(-2.10, 0.40), (-1.90, 0.54), (-0.90, 0.70), (0.00, 0.76), (0.60, 0.86), (1.60, 0.88), (2.00, 0.86), (2.10, 0.72)],
             zb=sill(-2.10, 2.10, 0.18),
             w=[(-2.10, 0.86), (-2.00, 0.96), (-1.60, 1.00), (-0.50, 1.00), (0.60, 1.04), (1.60, 1.04), (2.00, 1.00), (2.10, 0.94)],
             tumble=0.55, crown=0.02, side_glass=(-0.82, 0.35), windshield=(-0.88, -0.25), backlight=None, lid_mat='glass',
             front=[dict(mat='lens', pts=[(0.45, 0.50), (0.90, 0.53), (0.94, 0.57), (0.50, 0.55)]),
                    dict(mat='black', pts=[(0.30, 0.26), (0.85, 0.28), (0.80, 0.42), (0.36, 0.40)]),
                    dict(mat='black', pts=rect(-0.25, 0.26, 0.25, 0.36), mirror=False),
                    dict(mat='carbon', pts=rect(-0.88, 0.20, 0.88, 0.23), mirror=False, depth=0.18)],
             rear=[dict(mat='tail', pts=[(0.45, 0.76), (0.95, 0.74), (0.95, 0.80), (0.45, 0.82)]),
                   dict(mat='black', pts=rect(-0.85, 0.34, 0.85, 0.62), mirror=False),
                   dict(mat='lens', pts=rect(-0.20, 0.64, 0.20, 0.72), mirror=False)])),

    'camry': bp_car(
        'toyota_camry', (0.68, 0.69, 0.72), 'F', 'front', -2.20, 2.20, 1.00, (-1.35, 1.19), 0.32,
        (-2.05, -0.70), 0.40, (-0.62, 0.40), [(-0.55, 0.32), (0.55, 0.32)], None, ['wipers', 'antenna'],
        dict(zt=[(-2.20, 0.62), (-2.17, 0.72), (-2.05, 0.78), (-1.30, 0.84), (-0.80, 0.90), (-0.68, 0.94), (-0.05, 1.40), (0.45, 1.44),
                 (0.90, 1.40), (1.30, 1.16), (1.55, 1.00), (2.00, 0.98), (2.15, 0.94), (2.20, 0.84)],
             zs=[(-2.20, 0.54), (-2.05, 0.70), (-0.70, 0.86), (0.60, 0.88), (1.50, 0.92), (2.00, 0.92), (2.20, 0.80)],
             zb=sill(-2.20, 2.20, 0.24),
             w=[(-2.20, 0.84), (-2.12, 0.94), (-1.85, 0.98), (1.70, 1.00), (2.05, 0.96), (2.20, 0.88)],
             tumble=0.48, crown=0.03, side_glass=(-0.62, 1.42), bpillar=(0.35, 0.45), windshield=(-0.70, 0.00), backlight=(0.95, 1.58),
             front=[dict(mat='lens', pts=[(0.42, 0.70), (0.88, 0.68), (0.92, 0.74), (0.46, 0.76)]),
                    dict(mat='black', pts=[(-0.72, 0.32), (0.72, 0.32), (0.66, 0.56), (-0.66, 0.56)], mirror=False),
                    dict(mat='black', pts=rect(-0.30, 0.62, 0.30, 0.68), mirror=False),
                    dict(mat='chrome', pts=rect(-0.05, 0.615, 0.05, 0.685), mirror=False, lift=0.003)],
             rear=[dict(mat='tail', pts=[(0.40, 0.80), (0.90, 0.78), (0.94, 0.86), (0.40, 0.88)]),
                   dict(mat='trim', pts=rect(-0.92, 0.32, 0.92, 0.44), mirror=False, depth=0.12),
                   dict(mat='lens', pts=rect(-0.20, 0.56, 0.20, 0.66), mirror=False)])),

    'hellcat': bp_car(
        'dodge_hellcat', (0.80, 0.05, 0.42), 'R', 'front', -2.30, 2.30, 1.04, (-1.43, 1.32), 0.34,
        (-2.15, -0.70), 0.40, (-0.62, 0.42), [(-0.62, 0.32), (0.62, 0.32)], 'lip', ['wipers', 'hood_bulge', 'stripes'],
        dict(zt=[(-2.30, 0.66), (-2.27, 0.76), (-2.15, 0.82), (-1.30, 0.88), (-0.78, 0.94), (-0.66, 0.98), (0.00, 1.42), (0.50, 1.46),
                 (0.95, 1.42), (1.40, 1.16), (1.65, 1.02), (2.15, 1.00), (2.26, 0.96), (2.30, 0.86)],
             zs=[(-2.30, 0.58), (-2.15, 0.74), (-0.70, 0.88), (0.60, 0.90), (1.50, 0.96), (2.15, 0.96), (2.30, 0.82)],
             zb=sill(-2.30, 2.30, 0.24),
             w=[(-2.30, 0.90), (-2.22, 0.98), (-1.90, 1.03), (1.90, 1.04), (2.20, 1.00), (2.30, 0.94)],
             tumble=0.50, crown=0.03, side_glass=(-0.62, 1.45), bpillar=(0.38, 0.48), windshield=(-0.70, 0.02), backlight=(0.98, 1.70),
             front=[dict(mat='black', pts=[(-0.80, 0.56), (0.80, 0.56), (0.82, 0.78), (-0.82, 0.78)], mirror=False),
                    dict(mat='lens', pts=[(0.52, 0.70), (0.84, 0.70), (0.86, 0.75), (0.54, 0.75)], lift=0.003),
                    dict(mat='trim', pts=rect(-0.50, 0.665, 0.50, 0.675), mirror=False, lift=0.003),
                    dict(mat='black', pts=rect(-0.62, 0.36, 0.62, 0.48), mirror=False)],
             rear=[dict(mat='tail', pts=rect(-0.92, 0.84, 0.92, 0.92), mirror=False),
                   dict(mat='black', pts=rect(-0.94, 0.32, 0.94, 0.44), mirror=False, depth=0.12),
                   dict(mat='lens', pts=rect(-0.20, 0.60, 0.20, 0.70), mirror=False)])),

    'ram_trx': bp_car(
        'ram_truck', (0.55, 0.03, 0.03), 'A', 'front', -2.65, 2.65, 1.12, (-1.75, 1.55), 0.46,
        (-2.50, -0.88), 0.80, (-0.80, 0.00), [(-0.75, 0.62), (0.75, 0.62)], None,
        ['flares', 'bed', 'roof_lights', 'ram_graphics', 'steps', 'wipers'],
        dict(zt=[(-2.65, 1.10), (-2.62, 1.22), (-2.50, 1.28), (-1.40, 1.34), (-0.95, 1.38), (-0.85, 1.44), (-0.35, 1.98), (0.65, 2.00),
                 (0.70, 1.95), (0.76, 1.36), (0.85, 1.34), (2.55, 1.34), (2.62, 1.30), (2.65, 1.22)],
             zs=[(-2.65, 1.00), (-2.50, 1.20), (-0.90, 1.30), (0.70, 1.32), (2.60, 1.32), (2.65, 1.20)],
             zb=sill(-2.65, 2.65, 0.60),
             w=[(-2.65, 0.98), (-2.55, 1.06), (-2.30, 1.12), (2.40, 1.12), (2.60, 1.08), (2.65, 1.04)],
             tumble=0.25, crown=0.02, side_glass=(-0.80, 0.62), bpillar=(-0.05, 0.05), windshield=(-0.88, -0.30), backlight=(0.66, 0.77),
             front=[dict(mat='black', pts=rect(-0.66, 0.98, 0.66, 1.24), mirror=False),
                    *[dict(mat='alloy', pts=rect(x - 0.08, 1.06, x + 0.08, 1.16), mirror=False, lift=0.003) for x in (-0.36, -0.12, 0.12, 0.36)],
                    dict(mat='lens', pts=rect(0.70, 1.08, 0.98, 1.22)),
                    dict(mat='amber', pts=rect(0.70, 1.04, 0.98, 1.075)),
                    dict(mat='black', pts=rect(-1.05, 0.66, 1.05, 0.94), mirror=False, depth=0.25),
                    dict(mat='alloy', pts=rect(-0.60, 0.60, 0.60, 0.68), mirror=False, depth=0.25)],
             rear=[dict(mat='tail', pts=rect(0.92, 0.98, 1.08, 1.30)),
                   dict(mat='black', pts=rect(-1.06, 0.66, 1.06, 0.84), mirror=False, depth=0.20),
                   dict(mat='lens', pts=rect(-0.20, 0.86, 0.20, 0.96), mirror=False)]),
        open_extra=[(0.84, 2.55)]),

    'wrx': bp_car(
        'subaru_wrx', (0.02, 0.10, 0.52), 'A', 'front', -2.08, 2.08, 1.00, (-1.25, 1.14), 0.32,
        (-1.92, -0.64), 0.40, (-0.58, 0.36), [(-0.62, 0.30), (-0.48, 0.30), (0.48, 0.30), (0.62, 0.30)], 'trunk_tall', ['wipers', 'hood_scoop'],
        dict(zt=[(-2.08, 0.62), (-2.05, 0.72), (-1.92, 0.78), (-1.20, 0.84), (-0.72, 0.90), (-0.62, 0.94), (-0.05, 1.40), (0.45, 1.44),
                 (0.85, 1.40), (1.20, 1.16), (1.45, 1.00), (1.95, 0.98), (2.05, 0.94), (2.08, 0.84)],
             zs=[(-2.08, 0.54), (-1.92, 0.70), (-0.65, 0.86), (0.50, 0.88), (1.40, 0.92), (1.95, 0.92), (2.08, 0.80)],
             zb=sill(-2.08, 2.08, 0.24),
             w=[(-2.08, 0.84), (-2.00, 0.94), (-1.75, 0.99), (1.60, 1.00), (1.95, 0.96), (2.08, 0.88)],
             tumble=0.48, crown=0.03, side_glass=(-0.58, 1.32), bpillar=(0.32, 0.42), windshield=(-0.64, 0.00), backlight=(0.88, 1.48),
             front=[dict(mat='lens', pts=[(0.40, 0.66), (0.84, 0.66), (0.90, 0.74), (0.52, 0.76)]),
                    dict(mat='black', pts=[(-0.36, 0.52), (0.36, 0.52), (0.30, 0.68), (-0.30, 0.68)], mirror=False),
                    dict(mat='black', pts=rect(-0.62, 0.30, 0.62, 0.46), mirror=False),
                    dict(mat='black', pts=[(0.66, 0.32), (0.88, 0.34), (0.88, 0.48), (0.70, 0.48)]),
                    dict(mat='black', pts=rect(-0.86, 0.24, 0.86, 0.27), mirror=False, depth=0.18)],
             rear=[dict(mat='tail', pts=[(0.48, 0.80), (0.92, 0.78), (0.94, 0.88), (0.48, 0.90)]),
                   dict(mat='black', pts=[(-0.75, 0.26), (0.75, 0.26), (0.70, 0.40), (-0.70, 0.40)], mirror=False),
                   dict(mat='lens', pts=rect(-0.20, 0.52, 0.20, 0.62), mirror=False)])),

    'mystery_0e': bp_car(
        'mystery_0e', (0.09, 0.09, 0.10), 'R', 'front', -2.20, 2.20, 1.04, (-1.32, 1.28), 0.40,
        (-2.10, -0.76), 0.70, (-0.60, 0.60), [(-0.86, 0.48), (0.86, 0.48)], None, ['flares', 'spare', 'steps', 'wipers'],
        dict(zt=[(-2.20, 1.02), (-2.17, 1.08), (-2.10, 1.10), (-0.80, 1.14), (-0.72, 1.20), (-0.62, 1.94), (2.05, 1.96), (2.15, 1.92), (2.20, 1.80)],
             zs=[(-2.20, 0.96), (-2.10, 1.04), (-0.70, 1.12), (2.10, 1.14), (2.20, 1.04)],
             zb=[(-2.20, 0.52), (-2.10, 0.46), (2.10, 0.46), (2.20, 0.52)],
             w=[(-2.20, 0.94), (-2.15, 1.00), (-2.00, 1.04), (2.10, 1.04), (2.20, 0.98)],
             tumble=0.10, crown=0.01, side_glass=(-0.60, 2.08), bpillar=(0.55, 0.65), windshield=(-0.75, -0.55), backlight=None,
             front=[dict(mat='chrome', pts=circle(0.72, 1.00, 0.135)),
                    dict(mat='lens', pts=circle(0.72, 1.00, 0.10), lift=0.003),
                    dict(mat='amber', pts=circle(0.72, 0.84, 0.04)),
                    dict(mat='black', pts=rect(-0.48, 0.82, 0.48, 1.06), mirror=False),
                    *[dict(mat='chrome', pts=rect(x - 0.012, 0.84, x + 0.012, 1.04), mirror=False, lift=0.003) for x in [-0.4 + 0.1 * i for i in range(9)]],
                    dict(mat='black', pts=rect(-1.00, 0.56, 1.00, 0.76), mirror=False, depth=0.20)],
             rear=[dict(mat='tail', pts=rect(0.84, 0.90, 0.98, 1.20)),
                   dict(mat='black', pts=rect(-1.00, 0.56, 1.00, 0.74), mirror=False, depth=0.20),
                   dict(mat='lens', pts=rect(-0.20, 0.78, 0.20, 0.88), mirror=False)])),

    'mystery_88': bp_car(
        'mystery_88', (0.74, 0.75, 0.80), 'R', 'front', -2.15, 2.15, 1.00, (-1.33, 1.24), 0.33,
        (-2.00, -0.68), 0.40, (-0.60, 0.42), [(-0.62, 0.30), (-0.48, 0.30), (0.48, 0.30), (0.62, 0.30)], 'lip', ['wipers'],
        dict(zt=[(-2.15, 0.62), (-2.12, 0.72), (-2.00, 0.77), (-1.30, 0.83), (-0.78, 0.89), (-0.66, 0.93), (0.00, 1.38), (0.45, 1.42),
                 (0.90, 1.38), (1.30, 1.12), (1.55, 0.98), (2.05, 0.96), (2.12, 0.92), (2.15, 0.82)],
             zs=[(-2.15, 0.54), (-2.00, 0.69), (-0.70, 0.85), (0.60, 0.87), (1.50, 0.91), (2.05, 0.91), (2.15, 0.78)],
             zb=sill(-2.15, 2.15, 0.24),
             w=[(-2.15, 0.84), (-2.07, 0.94), (-1.80, 0.99), (1.65, 1.00), (2.00, 0.96), (2.15, 0.88)],
             tumble=0.50, crown=0.03, side_glass=(-0.60, 1.40), bpillar=(0.38, 0.48), windshield=(-0.68, 0.02), backlight=(0.95, 1.58),
             front=[dict(mat='lens', pts=[(0.40, 0.70), (0.86, 0.66), (0.92, 0.72), (0.50, 0.78)]),
                    dict(mat='chrome', pts=[(-0.42, 0.46), (0.42, 0.46), (0.48, 0.68), (-0.48, 0.68)], mirror=False),
                    dict(mat='black', pts=[(-0.40, 0.48), (0.40, 0.48), (0.46, 0.66), (-0.46, 0.66)], mirror=False, lift=0.003),
                    dict(mat='black', pts=[(0.55, 0.32), (0.86, 0.34), (0.86, 0.46), (0.58, 0.46)])],
             rear=[dict(mat='tail', pts=[(0.44, 0.80), (0.90, 0.78), (0.94, 0.88), (0.44, 0.88)]),
                   dict(mat='black', pts=[(-0.72, 0.26), (0.72, 0.26), (0.68, 0.40), (-0.68, 0.40)], mirror=False),
                   dict(mat='lens', pts=rect(-0.20, 0.50, 0.20, 0.60), mirror=False)])),

    'mystery_ae': bp_car(
        'mystery_ae', (0.58, 0.03, 0.03), 'R', 'rear', -2.05, 2.05, 1.03, (-1.25, 0.96), 0.32,
        (1.05, 1.90), 0.44, (-0.56,), [(-0.12, 0.36), (0.12, 0.36)], 'swan', ['hood_vents', 'stripes_ae'],
        dict(zt=[(-2.05, 0.52), (-2.02, 0.58), (-1.90, 0.62), (-1.20, 0.70), (-0.68, 0.76), (-0.58, 0.80), (-0.05, 1.24), (0.25, 1.27),
                 (0.55, 1.20), (0.95, 1.00), (1.45, 0.88), (1.85, 0.84), (2.00, 0.82), (2.05, 0.72)],
             zs=[(-2.05, 0.46), (-1.90, 0.60), (-1.20, 0.68), (-0.60, 0.74), (0.30, 0.76), (1.00, 0.78), (1.80, 0.80), (2.05, 0.66)],
             zb=sill(-2.05, 2.05, 0.20),
             w=[(-2.05, 0.82), (-1.95, 0.92), (-1.50, 0.96), (-0.60, 0.95), (0.40, 0.98), (1.00, 1.03), (1.70, 1.03), (2.00, 0.98), (2.05, 0.92)],
             # the hood sits low between raised front wings: dished there, crowned from the screen back
             crown=[(-2.05, -0.035), (-0.72, -0.035), (-0.50, 0.03), (2.05, 0.03)],
             tumble=0.55, side_glass=(-0.56, 0.70), windshield=(-0.62, -0.02), backlight=(0.50, 1.00),
             front=[dict(mat='chrome', pts=circle(0.68, 0.60, 0.105)),
                    dict(mat='lens', pts=circle(0.68, 0.60, 0.085), lift=0.003),
                    dict(mat='black', pts=rect(-0.36, 0.28, 0.36, 0.40), mirror=False),
                    dict(mat='black', pts=[(0.50, 0.26), (0.80, 0.28), (0.80, 0.40), (0.50, 0.40)]),
                    dict(mat='black', pts=rect(-0.84, 0.22, 0.84, 0.25), mirror=False, depth=0.18)],
             rear=[dict(mat='tail', pts=rect(-0.90, 0.70, 0.90, 0.74), mirror=False),
                   dict(mat='black', pts=rect(-0.70, 0.26, 0.70, 0.42), mirror=False),
                   dict(mat='lens', pts=rect(-0.20, 0.50, 0.20, 0.60), mirror=False)])),
})
