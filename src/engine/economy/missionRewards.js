const OPS = {
  gte: (a, b) => a >= b,
  lte: (a, b) => a <= b,
  eq:  (a, b) => a === b,
}

/**
 * Returns true if all objective targets are met.
 * benchmark_results takes priority; falls back to stats for non-benchmark stats.
 */
export function checkObjective(benchmarkResults, stats, objective) {
  if (!objective) return false

  const combined = { ...stats, ...benchmarkResults }

  return objective.targets.every(target => {
    const fn = OPS[target.op]
    if (!fn) return false
    const actual = combined[target.stat]
    if (actual === undefined) return false
    return fn(actual, target.value)
  })
}

export function calculateRefund(destroyedParts) {
  return destroyedParts.reduce((sum, part) => {
    const scrap = part.scrap_value ?? Math.floor((part.cost ?? 0) * 0.18)
    return sum + scrap
  }, 0)
}
