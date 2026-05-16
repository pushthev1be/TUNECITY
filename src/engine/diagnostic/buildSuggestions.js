/**
 * buildSuggestions — pure function.
 * Returns an ordered array of { slot, part_id, reason } suggestions
 * based on the current build's active tags and stats.
 * Results are ranked by impact: catastrophic fixes first, then penalties, then gains.
 */
export function buildSuggestions(activeTags, stats, installedParts, car) {
  const suggestions = []
  const tagIds = new Set(activeTags.map(t => t.id))
  const p = stats._parts ?? {}

  // ── Fix catastrophics first ───────────────────────────────────────────────

  if (tagIds.has('wont_turn_over')) {
    if (!p.battery)      suggestions.push({ slot: 'battery',      part_id: 'battery_basic',      reason: 'No battery — car is completely dead.' })
    if (!p.ignitionCoil) suggestions.push({ slot: 'ignition_coil', part_id: 'ignition_coil_stock', reason: 'No ignition coil — nothing to fire the spark.' })
    if (!p.engine)       suggestions.push({ slot: 'engine',        part_id: 'engine_b18_stock',    reason: 'No engine installed.' })
  }

  if (tagIds.has('no_spark')) {
    if (!p.sparkPlugs)   suggestions.push({ slot: 'spark_plugs', part_id: 'spark_plugs_stock', reason: 'No spark plugs — fuel won\'t ignite.' })
  }

  if (tagIds.has('no_compression')) {
    suggestions.push({ slot: 'head_gasket', part_id: 'head_gasket_stock', reason: 'No head gasket — combustion chamber can\'t hold pressure.' })
  }

  if (tagIds.has('fuel_starved')) {
    if (!p.fuelPump) {
      suggestions.push({ slot: 'fuel_pump', part_id: 'fuel_pump_stock', reason: 'No fuel pump — engine is starving.' })
    } else {
      suggestions.push({ slot: 'fuel_pump', part_id: 'fuel_pump_high_flow', reason: 'Fuel pump can\'t keep up with this HP. Upgrade to high-flow.' })
    }
  }

  if (tagIds.has('grenaded')) {
    const overDrive = stats.hp / stats.drivetrain_rating
    if (overDrive > 1.3) {
      suggestions.push({ slot: 'transmission', part_id: 'trans_race_6spd', reason: `HP is ${Math.round(overDrive * 100 - 100)}% over drivetrain rating — upgrade the transmission.` })
    }
  }

  if (tagIds.has('overheated')) {
    if (p.forcedInduct && !p.cooling) {
      suggestions.push({ slot: 'cooling', part_id: 'cooling_intercooler', reason: 'Turbo build with no intercooler. Heat is destroying the engine.' })
    } else {
      suggestions.push({ slot: 'cooling', part_id: 'cooling_race', reason: 'Heat output is critically over cooling capacity.' })
    }
  }

  // ── Fix penalties ─────────────────────────────────────────────────────────

  if (tagIds.has('overheating')) {
    if (p.forcedInduct && !installedParts.cooling_intercooler) {
      suggestions.push({ slot: 'cooling', part_id: 'cooling_intercooler', reason: 'Running hot — an intercooler would drop charge temps significantly.' })
    } else if (!p.cooling || p.cooling.id === 'cooling_stock') {
      suggestions.push({ slot: 'cooling', part_id: 'cooling_race', reason: 'Running hot — the stock radiator isn\'t coping.' })
    }
  }

  if (tagIds.has('blown')) {
    const needed = Math.ceil(stats.hp * 1.1)
    suggestions.push({ slot: 'transmission', part_id: 'trans_t56_6spd', reason: `Drivetrain is near its limit at ${stats.hp}hp. A T56 handles up to ~450hp.` })
    if (stats.hp > 450) {
      suggestions.push({ slot: 'transmission', part_id: 'trans_race_6spd', reason: `At ${stats.hp}hp you need the race sequential — T56 won't hold it long.` })
    }
  }

  if (tagIds.has('nos_stress')) {
    suggestions.push({ slot: 'transmission', part_id: 'trans_race_6spd', reason: 'Nitrous is stressing the drivetrain — upgrade to a race transmission.' })
  }

  if (tagIds.has('turbo_lag')) {
    suggestions.push({ slot: 'forced_induction', part_id: 'turbo_single', reason: 'Twin turbo has heavy lag. Single T3/T4 spools faster for street use.' })
  }

  if (tagIds.has('bogs_down')) {
    const peakRpm  = p.engine?.stats?.peak_hp_rpm ?? 0
    const shiftRpm = p.transmission?.stats?.shift_rpm ?? 0
    suggestions.push({
      slot: 'transmission',
      part_id: peakRpm > 8000 ? 'trans_race_6spd' : 'trans_t56_6spd',
      reason: `Engine peaks at ${peakRpm}rpm but trans shifts at ${shiftRpm}rpm — losing power every gear change.`
    })
  }

  if (tagIds.has('rubs')) {
    suggestions.push({ slot: 'suspension', part_id: 'suspension_coilovers', reason: 'Tires are rubbing fenders. Coilovers let you dial in proper clearance.' })
  }

  if (tagIds.has('topped_out')) {
    suggestions.push({ slot: 'differential', part_id: 'diff_lsd', reason: 'Diff ratio is too tall — swapping to a Torsen LSD changes the final drive ratio.' })
  }

  // ── Performance gains ─────────────────────────────────────────────────────

  if (!tagIds.has('overheated') && !tagIds.has('overheating') && p.forcedInduct && !p.cooling?.id?.includes('intercooler')) {
    suggestions.push({ slot: 'cooling', part_id: 'cooling_intercooler', reason: 'Forced induction without an intercooler is leaving power on the table.' })
  }

  if (stats.grip < 0.75 && !p.suspension) {
    suggestions.push({ slot: 'suspension', part_id: 'suspension_lowered', reason: 'Grip is low. Lowering springs are a cheap first step.' })
  }

  if (stats.weight > car.stock_stats.weight * 1.05 && !p.weightReduction) {
    suggestions.push({ slot: 'weight_reduction', part_id: 'weight_stripped_interior', reason: 'Car is heavy from all the parts. Stripping the interior helps power-to-weight.' })
  }

  if (stats.zero_to_sixty > 5.0 && stats.hp > 250 && (!p.tires || p.tires.id === 'tires_street_basic')) {
    suggestions.push({ slot: 'tires', part_id: 'tires_performance', reason: 'More grip would convert this HP into a better 0-60.' })
  }

  if (!p.ecu || p.ecu.id === 'ecu_stock') {
    suggestions.push({ slot: 'ecu', part_id: 'ecu_street_tune', reason: 'Stock ECU is leaving power on the table. A custom map is cheap HP.' })
  }

  // Deduplicate by slot — keep first (highest priority) suggestion per slot
  const seen = new Set()
  return suggestions.filter(s => {
    if (seen.has(s.slot)) return false
    seen.add(s.slot)
    return true
  })
}
