import carsData  from '../data/cars.json'
import partsData from '../data/parts.json'
import { computeStats }  from '../engine/diagnostic/computeStats.js'
import { evaluateTags }  from '../engine/diagnostic/evaluateTags.js'
import { buildIssues, predictIgnition } from '../engine/diagnostic/buildIssues.js'

const SLOTS = ['engine','intake','forced_induction','exhaust','transmission',
               'differential','tires','wheels','suspension','ecu','cooling',
               'battery','ignition_coil','spark_plugs','head_gasket','fuel_pump']

function emptySlots() {
  return Object.fromEntries(SLOTS.map(s => [s, null]))
}

function getSmokeColor(activeTags, stats) {
  const ids = new Set(activeTags.map(t => t.id))
  if (ids.has('grenaded') || ids.has('hydrolocked')) return 'black'
  if (ids.has('overheated')) return 'white'
  if (ids.has('blown') && ids.has('nos_stress')) return 'black'
  if (ids.has('overheating')) return 'grey'
  if (stats.heat_output > (stats.cooling_capacity ?? 0) * 0.9) return 'blue'
  return null
}

function recompute(carId, installedParts) {
  const car = carsData.find(c => c.id === carId)
  if (!car) return { stats: {}, activeTags: [], issues: [], prediction: { state: 'dead', label: "Won't Turn Over", confidence: 1.0, color: '#ef4444' }, smokeColor: null }

  const build = { car_id: carId, installed_parts: installedParts }
  const stats = computeStats(build, car)
  const { activeTags, stats: finalStats } = evaluateTags(build, car, stats)
  const issues = buildIssues(activeTags)
  const prediction = predictIgnition(activeTags, finalStats)
  const smokeColor = getSmokeColor(activeTags, finalStats)

  return { stats: finalStats, activeTags, issues, prediction, smokeColor }
}

const CAR_DEFAULT_ENGINE = {
  civic_eg_92_project:  'engine_b18_stock',
  charger_69_rt:        'engine_hemi_426_stroker',
  bmw_m4_comp:          'engine_m4_s55',
  lamborghini_urus:     'engine_lamborghini_urus_v8',
  corvette_c5:          'engine_ls3',
  toyota_camry:         'engine_b18_stock',
  dodge_hellcat:        'engine_hellcat_hemi',
  ram_truck:            'engine_ram_hemi',
  subaru_wrx:           'engine_subaru_ej25',
  mystery_0e:           'engine_b18_stock',
  mystery_88:           'engine_b18_stock',
  mystery_ae:           'engine_b18_stock',
}

function defaultInstalled(car) {
  const f = id => partsData.find(p => p.id === id) ?? null
  const base = {
    ...emptySlots(),
    engine:           f(CAR_DEFAULT_ENGINE[car.id] ?? 'engine_b18_stock'),
    intake:           f('intake_stock_airbox'),
    exhaust:          f('exhaust_stock'),
    differential:     f('diff_stock'),
    tires:            f('tires_street_basic'),
    wheels:           f('wheels_steel_15'),
    suspension:       f('suspension_stock'),
    ecu:              f('ecu_stock'),
    cooling:          f('cooling_stock'),
    engine_internals: f('pistons_stock'),
    brakes:           f('brakes_stock'),
    fuel_pump:        f('fuel_pump_stock'),
  }
  if (car.starting_condition === 'running') {
    return {
      ...base,
      transmission:  f('trans_stock_auto'),
      battery:       f('battery_basic'),
      ignition_coil: f('ignition_coil_stock'),
      spark_plugs:   f('spark_plugs_stock'),
      head_gasket:   f('head_gasket_stock'),
    }
  }
  return {
    ...base,
    transmission:  f('trans_5spd_stock'),
    battery:       null,
    ignition_coil: null,
    spark_plugs:   null,
    head_gasket:   null,
  }
}

export function createBuildSlice(set, get) {
  const _civicCar = carsData.find(c => c.id === 'civic_eg_92_project')
  const _civicDefaults = _civicCar ? defaultInstalled(_civicCar) : emptySlots()

  return {
    activeCar: 'civic_eg_92_project',
    installedPartsByCar: { 'civic_eg_92_project': _civicDefaults },
    installedParts: _civicDefaults,
    computed: recompute('civic_eg_92_project', _civicDefaults),

    setActiveCar(carId) {
      const { installedPartsByCar } = get()
      const carParts = installedPartsByCar[carId] || emptySlots()

      set({
        activeCar: carId,
        installedPartsByCar: { ...installedPartsByCar, [carId]: carParts },
        installedParts: carParts,
        computed: recompute(carId, carParts),
        engineRunning: false,
        ignitionResult: null,
        ignitionState: 'idle',
      })

      // Auto-select the relevant objective for this car
      get().autoSelectObjectiveForCar?.(carId)
    },

    installPart(slot, partId) {
      const { activeCar, installedPartsByCar, ownedParts, removePart } = get()
      const carParts = installedPartsByCar[activeCar] || emptySlots()

      // Uninstall currently slotted part first (put it back in inventory)
      const current = carParts[slot]
      if (current) {
        get().addPart(current.id)
      }

      // Consume one of the target part from inventory
      const partDef = partsData.find(p => p.id === partId)
      if (!partDef) return
      if ((ownedParts[partId] ?? 0) < 1) return

      get().removePart(partId)

      const next = { ...carParts, [slot]: partDef }
      const nextByCar = { ...installedPartsByCar, [activeCar]: next }
      
      set({ 
        installedPartsByCar: nextByCar, 
        installedParts: next,
        computed: recompute(activeCar, next) 
      })
    },

    uninstallPart(slot) {
      const { activeCar, installedPartsByCar } = get()
      const carParts = installedPartsByCar[activeCar] || emptySlots()
      
      const part = carParts[slot]
      if (!part) return

      get().addPart(part.id)
      
      const next = { ...carParts, [slot]: null }
      const nextByCar = { ...installedPartsByCar, [activeCar]: next }
      
      set({ 
        installedPartsByCar: nextByCar, 
        installedParts: next,
        computed: recompute(activeCar, next) 
      })
    },

    destroyParts(slots) {
      const { activeCar, installedPartsByCar } = get()
      const carParts = installedPartsByCar[activeCar] || emptySlots()
      
      const next = { ...carParts }
      for (const slot of slots) {
        next[slot] = null
      }
      
      const nextByCar = { ...installedPartsByCar, [activeCar]: next }
      
      set({ 
        installedPartsByCar: nextByCar, 
        installedParts: next,
        computed: recompute(activeCar, next) 
      })
    },

    getActiveCar() {
      return carsData.find(c => c.id === get().activeCar) ?? null
    },

    initCarBuild(carId) {
      const { installedPartsByCar } = get()
      if (installedPartsByCar[carId]) return
      const car = carsData.find(c => c.id === carId)
      if (!car) return
      const parts = defaultInstalled(car)
      const { activeCar } = get()
      const update = { installedPartsByCar: { ...installedPartsByCar, [carId]: parts } }
      if (activeCar === carId) {
        update.installedParts = parts
        update.computed = recompute(carId, parts)
      }
      set(update)
    },
  }
}
