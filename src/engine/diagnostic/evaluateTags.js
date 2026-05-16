import tagsData from '../../data/tags.json'

/**
 * evaluateTags — pure function.
 * Returns active tags with their effects applied to a copy of stats.
 * Iterates up to 3 times to stabilise tag interactions.
 */
export function evaluateTags(build, car, baseStats) {
  let stats = { ...baseStats }
  let activeTags = []

  for (let iteration = 0; iteration < 3; iteration++) {
    const newTags = checkAllTags(build, car, stats)
    const tagIds = newTags.map(t => t.id).sort().join(',')
    const prevIds = activeTags.map(t => t.id).sort().join(',')
    if (tagIds === prevIds) break

    activeTags = newTags
    stats = applyTagEffects(baseStats, activeTags)
  }

  return { activeTags, stats }
}

function checkAllTags(build, car, stats) {
  const active = []
  const s = stats
  const p = s._parts
  const limits = car.limits

  // ── Catastrophic ──────────────────────────────────────────────────────────
  if (!p.battery || !p.ignitionCoil || !p.engine) {
    active.push(getTag('wont_turn_over'))
  }

  if (p.engine && (!p.ignitionCoil || !p.sparkPlugs)) {
    active.push(getTag('no_spark'))
  }

  if (p.engine && !p.headGasket) {
    active.push(getTag('no_compression'))
  }

  if (p.fuelPump && p.engine) {
    const capacity = p.fuelPump.stats?.capacity ?? 0
    if (capacity < s.hp * 0.6) {
      active.push(getTag('fuel_starved'))
    }
  } else if (!p.fuelPump && p.engine) {
    // No fuel pump at all means car can't run
    active.push(getTag('fuel_starved'))
  }

  const chassisRating = s.effective_chassis_rating ?? car.limits.chassis_rating
  if (s.hp > s.drivetrain_rating * 1.3 || s.hp > chassisRating * 1.5) {
    active.push(getTag('grenaded'))
  }

  if (s.heat_output > s.cooling_capacity * 1.3) {
    active.push(getTag('overheated'))
  }

  // ── Penalty ───────────────────────────────────────────────────────────────
  if (s.hp > s.drivetrain_rating * 1.1 && s.hp <= s.drivetrain_rating * 1.3) {
    active.push(getTag('blown'))
  }

  if (p.nitrous && (p.nitrous.stats?.drivetrain_stress ?? 1) > 1.2 && s.hp > s.drivetrain_rating * 0.85) {
    active.push(getTag('nos_stress'))
  }

  if (s.heat_output > s.cooling_capacity * 1.1 && s.heat_output <= s.cooling_capacity * 1.3) {
    active.push(getTag('overheating'))
  }

  if (p.forcedInduct && (p.forcedInduct.stats?.lag ?? 0) > 0.4) {
    active.push(getTag('turbo_lag'))
  }

  const peakRpm   = p.engine?.stats?.peak_hp_rpm ?? 0
  const shiftRpm  = p.transmission?.stats?.shift_rpm ?? 0
  if (peakRpm > shiftRpm + 1500) {
    active.push(getTag('bogs_down'))
  }

  const tireWidth = p.tires?.stats?.width ?? 0
  if (tireWidth > limits.fender_clearance * 25.4 + 30) {
    // fender_clearance is in inches; tire width is in mm
    active.push(getTag('rubs'))
  }

  const diffRatio = p.differential?.stats?.ratio ?? 0
  if (diffRatio > 4.5 && s.top_speed < 150) {
    active.push(getTag('topped_out'))
  }

  // ── Positive ──────────────────────────────────────────────────────────────
  if (s.hp >= 500 && !p.forcedInduct) {
    active.push(getTag('all_motor'))
  }

  if (s.hp >= 500) {
    active.push(getTag('sleeper'))
  }

  const hpNorm   = s.hp / 800
  const gripNorm = s.grip / 1.0
  if (Math.abs(hpNorm - gripNorm) <= 0.15) {
    active.push(getTag('balanced'))
  }

  const hasRaceSuspension = p.suspension?.tier >= 3
  const hasPerformanceTires = (p.tires?.tier ?? 0) >= 2
  const targetWeight = car.stock_stats.weight * 0.95
  if (hasRaceSuspension && hasPerformanceTires && s.weight < targetWeight) {
    active.push(getTag('track_prepped'))
  }

  // oem_spec: engine, trans, diff from same family
  const engineFamily = p.engine?.stats?.oem_family
  const transFamily  = p.transmission?.stats?.oem_family
  const diffFamily   = p.differential?.stats?.oem_family
  if (engineFamily && engineFamily === transFamily && engineFamily === diffFamily) {
    active.push(getTag('oem_spec'))
  }

  // ── Character ─────────────────────────────────────────────────────────────
  if (s.hp >= 600 && s.grip < 0.55 && car.driveline === 'RWD') {
    active.push(getTag('widowmaker'))
  }

  if (s.total_parts_cost > 80000 && s.weight > 3500) {
    active.push(getTag('garage_queen'))
  }

  // grocery getter: all tier-1 parts
  const installedParts = Object.values(build.installed_parts ?? {}).filter(Boolean)
  if (installedParts.length > 0 && installedParts.every(pt => pt.tier === 1)) {
    active.push(getTag('grocery_getter'))
  }

  // rat_rod: project-condition car with high power and no suspension upgrade
  if (
    car.starting_condition === 'project' &&
    s.hp >= 400 &&
    (!p.suspension || p.suspension.tier <= 1)
  ) {
    active.push(getTag('rat_rod'))
  }

  // Deduplicate (a tag can only be active once)
  const seen = new Set()
  return active.filter(t => {
    if (seen.has(t.id)) return false
    seen.add(t.id)
    return true
  })
}

function applyTagEffects(baseStats, activeTags) {
  const s = { ...baseStats }
  for (const tag of activeTags) {
    const fx = tag.effects ?? {}
    if (fx.reliability !== undefined) s.reliability = Math.min(100, Math.max(0, s.reliability + fx.reliability))
    if (fx.heat_output  !== undefined) s.heat_output  += fx.heat_output
    if (fx.grip         !== undefined) s.grip         += fx.grip
    if (fx.top_speed    !== undefined) s.top_speed    += fx.top_speed
    // zero_to_sixty and quarter_mile penalties handled in benchmark layer
  }
  return s
}

function getTag(id) {
  return tagsData.find(t => t.id === id) ?? { id, label: id, category: 'penalty', effects: {}, blocks_ignition: false }
}
