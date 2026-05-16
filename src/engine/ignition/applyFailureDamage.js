// Maps catastrophic tag → base parts destroyed (by slot key)
const FAILURE_MAP = {
  wont_turn_over: [],
  no_spark:       ['spark_plugs'],
  no_compression: ['head_gasket'],
  fuel_starved:   [],
  grenaded:       ['engine', 'transmission'],
  overheated:     ['cooling', 'head_gasket'],
  hydrolocked:    ['engine'],
}

// Slots adjacent to the engine bay — destroyed by blast radius overflow
const ENGINE_BAY_NEIGHBORS = ['intake', 'ecu', 'cooling', 'exhaust', 'forced_induction']

/**
 * Returns an array of slot keys whose installed parts are destroyed.
 * radius = Math.ceil(car.tier * overdrive)
 */
export function applyFailureDamage(tagId, car, build) {
  const hp = build.computed?.stats?.hp ?? 0
  const overdrive = Math.max(1.0, hp / car.limits.chassis_rating)
  const radius = Math.ceil(car.tier * overdrive)

  const primary = (FAILURE_MAP[tagId] ?? []).filter(slot => build.installed_parts[slot])

  const destroyed = new Set(primary)

  if (destroyed.size < radius) {
    for (const neighbor of ENGINE_BAY_NEIGHBORS) {
      if (destroyed.size >= radius) break
      if (build.installed_parts[neighbor] && !destroyed.has(neighbor)) {
        destroyed.add(neighbor)
      }
    }
  }

  return [...destroyed]
}
