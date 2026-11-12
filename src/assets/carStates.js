// Layered car-state sprites rendered from Blender (art/blender/tunecity_cars.py).
//
// Each visible part is its own sprite sheet on a shared canvas, so any build is
// drawn by stacking the sheets that match its installed parts. Sheets are one
// horizontal strip of frames; manifest.json says how many frames each has.

// Every car rendered so far: one folder per car under sprites/car_states/, each
// with a manifest naming the game car it belongs to.
const MANIFESTS = import.meta.glob('/src/assets/sprites/car_states/*/manifest.json', { eager: true, import: 'default' })
const SHEETS = import.meta.glob('/src/assets/sprites/car_states/*/**/*.png', { eager: true, import: 'default' })

const PACKS = Object.fromEntries(Object.entries(MANIFESTS).map(([path, manifest]) => [
  manifest.game_id,
  { manifest, sheets: SHEETS, root: path.slice(0, path.lastIndexOf('/')) },
]))

export function statePack(carId) {
  return PACKS[carId] ?? null
}

/** { url, frames } for one layer variant of a view, or null when the pack has none. */
export function sheet(pack, view, layer, variant) {
  const frames = pack?.manifest.views[view]?.layers[layer]?.[variant]
  if (!frames) return null
  const url = pack.sheets[`${pack.root}/${view}/${layer}/${variant}.png`]
  return url ? { url, frames } : null
}

/** 'front' engines open a hood; 'mid' and 'rear' ones open an engine lid at the back. */
export function lidName(pack) {
  return pack?.manifest.engine_at === 'front' ? 'hood' : 'engine lid'
}

export function viewSize(pack, view) {
  const v = pack.manifest.views[view]
  return { w: v.w, h: v.h }
}

// ── installed parts → which sheet each layer uses ────────────────────────────

const ENGINE_FAMILY = {
  engine_b18_stock: 'i4_honda', engine_k20_built: 'i4_honda',
  engine_m4_s55: 'i6_bmw',
  engine_subaru_ej25: 'flat_subaru', engine_porsche_flat6: 'flat_porsche',
  engine_hemi_426_stroker: 'v8_hemi', engine_ram_hemi: 'v8_hemi',
  engine_ls3: 'v8_ls',
  engine_hellcat_hemi: 'v8_blower',
  engine_mercedes_amg_v8: 'v8_twin_turbo', engine_lamborghini_urus_v8: 'v8_twin_turbo',
  engine_billet_v8_twin_turbo: 'v8_twin_turbo',
}
const INTAKE = {
  intake_stock_airbox: 'stock', intake_cone: 'cone', intake_velocity_stacks: 'stacks',
  intake_twin_cone: 'twin_cone', intake_carbon_cold_air: 'carbon',
}
const FORCED = {
  turbo_single: 'turbo_single', turbo_twin: 'turbo_twin', turbo_sequential: 'turbo_sequential',
  turbo_compound: 'turbo_compound', turbo_hybrid: 'turbo_hybrid', turbo_antilag: 'turbo_antilag',
  turbo_stage4_race: 'turbo_stage4', supercharger_roots: 'supercharger',
}
const TIRES = {
  tires_street_basic: 'street', tires_performance: 'performance', tires_305_slick: 'slick',
  tires_drift: 'drift', tires_semi_slick_r888: 'r888',
}
const WHEELS = { wheels_steel_15: 'steel_15', wheels_alloy_enkei: 'enkei_17', wheels_work_meister_18: 'work_18' }
const RIM_SIZE = { steel_15: 'r15', enkei_17: 'r17', work_18: 'r18' }
const BRAKES = { brakes_stock: 'stock', brakes_big_brake_kit: 'big_kit', brakes_carbon_ceramic: 'carbon' }
// Ride height drop in canvas pixels (one pixel is about 2 cm)
const DROP_PX = { suspension_stock: 0, suspension_lowered: 1, suspension_coilovers: 2, suspension_active_race: 3 }

const idOf = part => (typeof part === 'string' ? part : part?.id) ?? null

/** Which variant every layer shows for this build. Missing parts fall back to stock looks. */
export function buildLook(installed = {}) {
  const id = slot => idOf(installed[slot])
  const wheels = WHEELS[id('wheels')] ?? 'steel_15'
  const exhaust = id('exhaust')
  return {
    body:     id('weight_reduction') === 'weight_fiberglass_panels' ? 'body_fg' : 'body',
    engine:   ENGINE_FAMILY[id('engine')] ?? null,
    intake:   INTAKE[id('intake')] ?? null,
    fi:       FORCED[id('forced_induction')] ?? null,
    headers:  exhaust === 'exhaust_long_tube_headers',
    exhaust:  exhaust === 'exhaust_straight_pipe' ? 'straight' : exhaust === 'exhaust_side_exits' ? 'side' : 'stock',
    smokeFrom: exhaust === 'exhaust_side_exits' ? 'side' : 'rear',
    tires:    `${TIRES[id('tires')] ?? 'street'}_${RIM_SIZE[wheels]}`,
    rims:     wheels,
    brakes:   BRAKES[id('brakes')] ?? 'stock',
    fmic:     id('cooling') === 'cooling_intercooler',
    dropPx:   DROP_PX[id('suspension')] ?? 0,
  }
}
