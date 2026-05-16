// ── Cars ─────────────────────────────────────────────────────────────────────
import civic_eg       from './sprites/cars/civic_eg_portrait.png'
import charger_69     from './sprites/cars/charger_69_portrait.png'
import m4_comp        from './sprites/cars/M4_comp.png'
import urus           from './sprites/cars/5a995ef8.png'
import vette          from './sprites/cars/2519b160.png'
import camry          from './sprites/cars/camry_car.png'
import hellcat        from './sprites/cars/hellcat_car.png'
import ram_truck      from './sprites/cars/ram_truck.png'
import subaru         from './sprites/cars/subaru.png'
import mystery_0e     from './sprites/cars/0e309935.png'
import mystery_88     from './sprites/cars/8839dda0.png'
import mystery_ae     from './sprites/cars/ae415a63.png'

// ── Parts ────────────────────────────────────────────────────────────────────
import car_pistons          from './sprites/parts/car_pistons.png'
import car_oil_system       from './sprites/parts/car_oil_system.png'
import car_ecu              from './sprites/parts/car_ecu.png'
import car_headgasket       from './sprites/parts/car_headgasket.png'
import car_spark_plug       from './sprites/parts/car_spark_plug.png'
import car_battery          from './sprites/parts/car_battery.png'
import electric_battery     from './sprites/parts/electric_battery.png'
import fuelpump             from './sprites/parts/fuelpump.png'
import crankshaft           from './sprites/parts/crankshaft.png'
import dual_exhaust         from './sprites/parts/dual_exhuast.png'
import brakes               from './sprites/parts/brakes.png'
import tire                 from './sprites/parts/tire.png'
import black_rims           from './sprites/parts/black_rims.png'
import icon_coilover        from './sprites/parts/icon_coilover.png'
import icon_ignition        from './sprites/parts/icon_ignition_coil.png'
import icon_radiator        from './sprites/parts/icon_radiator.png'
import icon_intercooler     from './sprites/parts/icon_intercooler.png'
import icon_gearbox         from './sprites/parts/icon_gearbox.png'
import icon_spool           from './sprites/parts/icon_spool.png'
import icon_forged_rims     from './sprites/parts/icon_forged_rims.png'
import icon_stripped        from './sprites/parts/icon_stripped.png'
import icon_fiberglass      from './sprites/parts/icon_fiberglass.png'
import icon_tube_chassis    from './sprites/parts/icon_tube_chassis.png'
import icon_nitrous         from './sprites/parts/icon_nitrous.png'
import icon_internals       from './sprites/parts/icon_internals.png'
// ── New engine sprites ───────────────────────────────────────────────────────
import honda_engine         from './sprites/parts/honda_engine.png'
import m4_engine            from './sprites/parts/m4_engine.png'
import corvette_engine      from './sprites/parts/corvette_engine.png'
import hellcat_engine       from './sprites/parts/hellcat_engine.png'
import subaru_engine        from './sprites/parts/subaru_engine.png'
import porsche_engine       from './sprites/parts/porsche_engine.png'
import durango_engine       from './sprites/parts/durango_engine.png'
import ram_jeep_engine      from './sprites/parts/ram_jeep_engine.png'
import lamborghini_urus_engine from './sprites/parts/lamborghini_urus_engine.png'
import mercedes_engine      from './sprites/parts/mercedes_engine.png'
import supercharger_roots   from './sprites/parts/supercharger_roots.png'
// ── New turbo sprites ────────────────────────────────────────────────────────
import turbo_single         from './sprites/parts/turbo_single.png'
import turbo_twin           from './sprites/parts/turbo_twin.png'
import turbo_sequential     from './sprites/parts/turbo_sequential.png'
import turbo_hybrid         from './sprites/parts/turbo_hybrid.png'
import turbo_compound       from './sprites/parts/turbo_compound.png'
import turbo_antilag        from './sprites/parts/turbo_antilag.png'
// ── New intake sprites ───────────────────────────────────────────────────────
import intake_stock_airbox  from './sprites/parts/intake_stock_airbox.png'
import intake_twin_cone     from './sprites/parts/intake_twin_cone.png'
import intake_carbon        from './sprites/parts/intake_carbon.png'
import intake_velocity_stacks from './sprites/parts/intake_velocity_stacks.png'
// ── New exhaust / tire sprites ───────────────────────────────────────────────
import side_exits_exhaust   from './sprites/parts/side_exits_car_exhaust.png'
import sports_tires         from './sprites/parts/sports_tires.png'
// ── extraparts.zip sprites ───────────────────────────────────────────────────
import cooling_street_radiator from './sprites/parts/cooling_street_radiator.png'
import cooling_oil_cooler      from './sprites/parts/cooling_oil_cooler.png'
import cooling_dual_core       from './sprites/parts/cooling_dual_core.png'
import cooling_water_meth      from './sprites/parts/cooling_water_meth.png'
import cooling_triple_core     from './sprites/parts/cooling_triple_core.png'
import twin_turbo_intercooler from './sprites/parts/twin_turbo_intercooler.png'
import race_ecu              from './sprites/parts/race_ecu.png'
import nitrous_bottle        from './sprites/parts/nitrous_bottle.png'
import forged_internals      from './sprites/parts/forged_internals.png'
import dogbox_sequential     from './sprites/parts/dogbox_sequential.png'
import carbon_tube_chassis   from './sprites/parts/carbon_tube_chassis.png'
import dollar_stack          from './sprites/parts/dollar_stack.png'
import underground_sign      from './sprites/parts/underground_sign.png'

// ── Garage ───────────────────────────────────────────────────────────────────
import garage_bg from './sprites/garage/garage_bg.png'

// ── Car portrait map ─────────────────────────────────────────────────────────
export const CAR_SPRITES = {
  civic_eg_92_project: civic_eg,
  charger_69_rt:       charger_69,
  bmw_m4_comp:         m4_comp,
  lamborghini_urus:    urus,
  corvette_c5:         vette,
  toyota_camry:        camry,
  dodge_hellcat:       hellcat,
  ram_truck:           ram_truck,
  subaru_wrx:          subaru,
  mystery_0e:          mystery_0e,
  mystery_88:          mystery_88,
  mystery_ae:          mystery_ae,
}

export const CAR_ROTATION_KEYS = {
  civic_eg_92_project: 'civic_eg_portrait_Pixel_art_sprite_of_a_1992_Honda',
  charger_69_rt:       'charger_69_portrait_Pixel_art_sprite_of_a_1969_Dod',
  bmw_m4_comp:         'M4_comp',
  lamborghini_urus:    '5a995ef8',
  corvette_c5:         '2519b160',
  toyota_camry:        'camry_car',
  dodge_hellcat:       'hellcat_car',
  ram_truck:           'ram_truck',
  subaru_wrx:          'subaru',
  mystery_0e:          '0e309935',
  mystery_88:          '8839dda0',
  mystery_ae:          'ae415a63',
}

// ── Part slot icon map ────────────────────────────────────────────────────────
export const PART_SPRITES = {
  engine:           honda_engine,
  intake:           intake_stock_airbox,
  forced_induction: twin_turbo_intercooler,
  exhaust:          dual_exhaust,
  transmission:     dogbox_sequential,
  differential:     brakes,
  tires:            sports_tires,
  wheels:           black_rims,
  suspension:       icon_coilover,
  ecu:              race_ecu,
  cooling:          cooling_dual_core,
  weight_reduction: carbon_tube_chassis,
  nitrous:          nitrous_bottle,
  engine_internals: forged_internals,
  brakes:           brakes,
  battery:          car_battery,
  ignition_coil:    icon_ignition,
  spark_plugs:      car_spark_plug,
  head_gasket:      car_headgasket,
  fuel_pump:        fuelpump,
}

export { dollar_stack, underground_sign }

export { garage_bg }

// Maps part IDs and slot keys → rotation folder under /assets/sprites/rotations/
export const ROTATION_KEYS = {
  // ── Slot-level fallbacks ──────────────────────────────────────────────────
  engine:           'honda_engine',
  intake:           'intake_stock_airbox',
  forced_induction: 'twin_turbo_intercooler',
  exhaust:          'dual_exhuast',
  transmission:     'dogbox_sequential',
  differential:     'brakes',
  tires:            'sports_tires',
  wheels:           'black_rims',
  engine_internals: 'forged_internals',
  brakes:           'icon_brakes',
  suspension:       '4_icon_coilover_Pixel_art_icon_of_a_coilover_suspe',
  ecu:              'race_ecu',
  cooling:          'icon_radiator_Pixel_art_icon_of_a_car_radiator_fla',
  battery:          'car_battery',
  battery_basic:    'car_battery',
  battery_lithium:  'electric_battery',
  ignition_coil:    'icon_ignition_coil_Pixel_art_icon_of_a_car_ignitio',
  spark_plugs:      'car_spark_plug',
  head_gasket:      'car_headgasket',
  fuel_pump:        'fuelpump',
  weight_reduction: 'icon_stripped',
  nitrous:          'icon_nitrous',

  // ── Engines ───────────────────────────────────────────────────────────────
  engine_b18_stock:           'honda_engine',
  engine_k20_built:           'honda_engine',
  engine_hemi_426_stroker:    'durango_engine',
  engine_ls3:                 'corvette_engine',
  engine_subaru_ej25:         'subaru_engine',
  engine_m4_s55:              'm4_engine',
  engine_hellcat_hemi:        'hellcat_engine',
  engine_porsche_flat6:       'porsche_engine',
  engine_mercedes_amg_v8:     'mercedes_engine',
  engine_lamborghini_urus_v8: 'lamborghini_urus_engine',
  engine_ram_hemi:            'ram_jeep_engine',

  // ── Forced induction ──────────────────────────────────────────────────────
  turbo_single:               'turbo_single',
  turbo_twin:                 'twin_turbo_intercooler',
  supercharger_roots:         'supercharger_roots',
  turbo_sequential:           'turbo_sequential',
  turbo_compound:             'turbo_compound',
  turbo_hybrid:               'turbo_hybrid',
  turbo_antilag:              'turbo_antilag',
  turbo_stage4_race:          'twin_turbo_intercooler',

  // ── Intake ────────────────────────────────────────────────────────────────
  intake_stock_airbox:        'intake_stock_airbox',
  intake_cone:                'intake_twin_cone',
  intake_twin_cone:           'intake_twin_cone',
  intake_carbon_cold_air:     'intake_carbon',
  intake_velocity_stacks:     'intake_velocity_stacks',

  // ── Exhaust ───────────────────────────────────────────────────────────────
  exhaust_stock:              'dual_exhuast',
  exhaust_long_tube_headers:  'dual_exhuast',
  exhaust_straight_pipe:      'stright_pipe_car_exhaust',
  exhaust_side_exits:         'side_exits_car_exhaust',

  // ── Differential ─────────────────────────────────────────────────────────
  diff_lsd:                'brakes',
  diff_stock:              'brakes',
  diff_spool:              'icon_spool',

  // ── Tires ─────────────────────────────────────────────────────────────────
  tires_street_basic:      'tire',
  tires_performance:       'sports_tires',
  tires_305_slick:         'sports_tires',
  tires_drift:             'sports_tires',

  // ── Wheels ────────────────────────────────────────────────────────────────
  wheels_steel_15:         'black_rims',
  wheels_alloy_enkei:      'black_rims',
  wheels_work_meister_18:  'icon_forged_rims',

  // ── Cooling ───────────────────────────────────────────────────────────────
  cooling_race:            'icon_radiator_Pixel_art_icon_of_a_car_radiator_fla',
  cooling_stock:           'icon_radiator_Pixel_art_icon_of_a_car_radiator_fla',
  cooling_intercooler:     'icon_intercooler',
  cooling_street_radiator: 'cooling_street_radiator',
  cooling_oil_cooler:      'cooling_oil_cooler',
  cooling_dual_core:       'cooling_dual_core',
  cooling_water_meth:      'cooling_water_meth',
  cooling_triple_core:     'cooling_triple_core',

  // ── Transmission ─────────────────────────────────────────────────────────
  trans_t56_6spd:          'icon_gearbox',
  trans_dogbox_sequential: 'dogbox_sequential',

  // ── Weight reduction ──────────────────────────────────────────────────────
  weight_stripped_interior:'icon_stripped',
  weight_fiberglass_panels:'icon_fiberglass',
  weight_tube_chassis:     'carbon_tube_chassis',

  // ── Nitrous ───────────────────────────────────────────────────────────────
  nitrous_single_stage:    'nitrous_bottle',
  nitrous_dual_stage:      'nitrous_bottle',

  // ── Engine internals ──────────────────────────────────────────────────────
  pistons_stock:           'icon_internals',
  pistons_forged:          'forged_internals',
  pistons_race:            'forged_internals',

  // ── Brakes ────────────────────────────────────────────────────────────────
  brakes_stock:            'icon_brakes',
  brakes_big_brake_kit:    'icon_brakes',
  brakes_carbon_ceramic:   'icon_brakes',

  // ── ECU variants ─────────────────────────────────────────────────────────
  ecu_race_tune:           'race_ecu',
  ecu_illegal_tune:        'race_ecu',

  // ── Condition variants ────────────────────────────────────────────────────
  battery_basic_used:         'car_battery',
  battery_basic_rebuilt:      'car_battery',
  spark_plugs_used:           'car_spark_plug',
  spark_plugs_rebuilt:        'car_spark_plug',
  ignition_coil_used:         'icon_ignition_coil_Pixel_art_icon_of_a_car_ignitio',
  ignition_coil_rebuilt:      'icon_ignition_coil_Pixel_art_icon_of_a_car_ignitio',
  head_gasket_used:           'car_headgasket',
  head_gasket_rebuilt:        'car_headgasket',
  fuel_pump_used:             'fuelpump',
  fuel_pump_rebuilt:          'fuelpump',
}
