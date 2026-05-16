import { describe, it, expect } from 'vitest'
import { computeStats } from '../diagnostic/computeStats.js'
import { evaluateTags } from '../diagnostic/evaluateTags.js'
import { buildIssues, predictIgnition } from '../diagnostic/buildIssues.js'
import carsData  from '../../data/cars.json'
import partsData from '../../data/parts.json'

// Helpers
const car   = (id) => carsData.find(c => c.id === id)
const part  = (id) => partsData.find(p => p.id === id)

function run(carId, partMap) {
  const carDef = car(carId)
  const installed = {}
  for (const [slot, partId] of Object.entries(partMap)) {
    installed[slot] = partId ? part(partId) : null
  }
  const build = { car_id: carId, installed_parts: installed }
  const stats = computeStats(build, carDef)
  const { activeTags, stats: finalStats } = evaluateTags(build, carDef, stats)
  const issues = buildIssues(activeTags)
  const prediction = predictIgnition(activeTags)
  return { stats: finalStats, activeTags, issues, prediction }
}

// ── Test 1: Bare minimum running build ────────────────────────────────────────
describe('Test 1 — Stock Civic: minimal running build', () => {
  const result = run('civic_eg_92_project', {
    engine:       'engine_b18_stock',
    intake:       'intake_stock_airbox',
    exhaust:      'exhaust_stock',
    transmission: 'trans_5spd_stock',
    differential: 'diff_stock',
    tires:        'tires_street_basic',
    wheels:       'wheels_steel_15',
    suspension:   'suspension_stock',
    ecu:          'ecu_stock',
    cooling:      'cooling_stock',
    battery:      'battery_basic',
    ignition_coil: 'ignition_coil_stock',
    spark_plugs:  'spark_plugs_stock',
    head_gasket:  'head_gasket_stock',
    fuel_pump:    'fuel_pump_stock',
  })

  it('has no catastrophic tags', () => {
    const cats = result.activeTags.filter(t => t.category === 'catastrophic')
    expect(cats).toHaveLength(0)
  })

  it('predicts success', () => {
    expect(result.prediction).toBe('success')
  })

  it('hp is around 102 (stock B18)', () => {
    expect(result.stats.hp).toBeGreaterThan(90)
    expect(result.stats.hp).toBeLessThan(130)
  })
})

// ── Test 2: HP overdrive — blown tag ─────────────────────────────────────────
// K20 (220) * velocity_stacks(1.12) * headers(1.08) * race_ecu(1.15) ≈ 306hp
// civic drivetrain_rating = 250 → blown range 275–325 → 306 is in range ✓
describe('Test 2 — Blown: K20 all-motor build with stock trans', () => {
  const result = run('civic_eg_92_project', {
    engine:        'engine_k20_built',
    intake:        'intake_velocity_stacks',
    exhaust:       'exhaust_long_tube_headers',
    transmission:  'trans_5spd_stock',
    differential:  'diff_stock',
    tires:         'tires_performance',
    wheels:        'wheels_alloy_enkei',
    suspension:    'suspension_stock',
    ecu:           'ecu_race_tune',
    cooling:       'cooling_race',
    battery:       'battery_basic',
    ignition_coil: 'ignition_coil_stock',
    spark_plugs:   'spark_plugs_stock',
    head_gasket:   'head_gasket_stock',
    fuel_pump:     'fuel_pump_high_flow',
  })

  it('fires the blown penalty tag', () => {
    const blown = result.activeTags.find(t => t.id === 'blown')
    expect(blown).toBeTruthy()
  })

  it('does NOT predict catastrophic failure (blown is penalty, not catastrophic)', () => {
    expect(result.prediction).toBe('success')
  })

  it('hp is significantly above stock trans rating (250hp)', () => {
    expect(result.stats.hp).toBeGreaterThan(280)
  })
})

// ── Test 3: Grenade build ─────────────────────────────────────────────────────
describe('Test 3 — Grenaded: Hemi 426 + stock trans + race ECU', () => {
  const result = run('civic_eg_92_project', {
    engine:           'engine_hemi_426_stroker',
    forced_induction: 'turbo_twin',
    intake:           'intake_velocity_stacks',
    exhaust:          'exhaust_long_tube_headers',
    transmission:     'trans_5spd_stock',   // rated 250hp — grenade territory
    differential:     'diff_stock',
    tires:            'tires_305_slick',
    wheels:           'wheels_alloy_enkei',
    suspension:       'suspension_coilovers',
    ecu:              'ecu_race_tune',
    cooling:          'cooling_race',
    battery:          'battery_basic',
    ignition_coil:    'ignition_coil_stock',
    spark_plugs:      'spark_plugs_stock',
    head_gasket:      'head_gasket_stock',
    fuel_pump:        'fuel_pump_high_flow',
  })

  it('fires grenaded catastrophic tag', () => {
    const grenaded = result.activeTags.find(t => t.id === 'grenaded')
    expect(grenaded).toBeTruthy()
  })

  it('predicts catastrophic failure', () => {
    expect(result.prediction).toContain('fail_')
  })
})

// ── Test 4: Sleeper ───────────────────────────────────────────────────────────
// Charger + Hemi 426 (580) * cone(1.05) * headers(1.08) * race_ecu(1.15) ≈ 756hp
// Charger drivetrain_rating = 500 + race_6spd(200) = 700 → blown range 770–910
// 756 < 770 → no blown, no grenaded. sleeper fires (hp>=500). ✓
describe('Test 4 — Sleeper: all-motor Charger', () => {
  const result = run('charger_69_rt', {
    engine:        'engine_hemi_426_stroker',
    intake:        'intake_cone',
    exhaust:       'exhaust_long_tube_headers',
    transmission:  'trans_race_6spd',
    differential:  'diff_lsd',
    tires:         'tires_performance',
    wheels:        'wheels_alloy_enkei',
    suspension:    'suspension_lowered',
    ecu:           'ecu_race_tune',
    cooling:       'cooling_race',
    battery:       'battery_basic',
    ignition_coil: 'ignition_coil_stock',
    spark_plugs:   'spark_plugs_stock',
    head_gasket:   'head_gasket_stock',
    fuel_pump:     'fuel_pump_high_flow',
  })

  it('fires sleeper positive tag', () => {
    const sleeper = result.activeTags.find(t => t.id === 'sleeper')
    expect(sleeper).toBeTruthy()
  })

  it('has no catastrophic tags', () => {
    const cats = result.activeTags.filter(t => t.category === 'catastrophic')
    expect(cats).toHaveLength(0)
  })
})

// ── Test 5: Won't start ───────────────────────────────────────────────────────
describe('Test 5 — Dead build: engine installed but no battery', () => {
  const result = run('civic_eg_92_project', {
    engine:           'engine_b18_stock',
    intake:           'intake_stock_airbox',
    exhaust:          'exhaust_stock',
    transmission:     'trans_5spd_stock',
    differential:     'diff_stock',
    tires:            'tires_street_basic',
    wheels:           'wheels_steel_15',
    suspension:       'suspension_stock',
    ecu:              'ecu_stock',
    cooling:          'cooling_stock',
    // battery intentionally missing
    ignition_coil:    'ignition_coil_stock',
    spark_plugs:      'spark_plugs_stock',
    head_gasket:      'head_gasket_stock',
    fuel_pump:        'fuel_pump_stock',
  })

  it('fires wont_turn_over catastrophic tag', () => {
    const tag = result.activeTags.find(t => t.id === 'wont_turn_over')
    expect(tag).toBeTruthy()
  })

  it('predicts failure', () => {
    expect(result.prediction).toContain('fail_')
  })
})
