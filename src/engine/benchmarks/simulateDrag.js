/**
 * simulateBenchmarks — applies penalty tag modifiers then computes all benchmarks.
 * Returns the full benchmark result object.
 */
export function simulateBenchmarks(stats, car, penaltyTags = []) {
  let { hp, torque, weight, grip, drag_coefficient, zero_to_sixty, top_speed, quarter_mile, reliability } = stats

  for (const tag of penaltyTags) {
    const fx = tag.effects ?? {}
    if (fx.zero_to_sixty) zero_to_sixty = Math.min(15, zero_to_sixty + fx.zero_to_sixty)
    if (fx.quarter_mile)  quarter_mile  = Math.min(20, quarter_mile  + fx.quarter_mile)
    if (fx.top_speed)     top_speed     = Math.max(50, top_speed     + fx.top_speed)
  }

  return {
    peak_hp: Math.round(hp),
    peak_torque: Math.round(torque),
    zero_to_sixty: parseFloat(zero_to_sixty.toFixed(2)),
    quarter_mile: parseFloat(quarter_mile.toFixed(2)),
    top_speed: Math.round(top_speed),
    reliability_score: Math.round(reliability),
    dyno_curve: buildDynoCurve(hp, torque),
  }
}

function buildDynoCurve(peakHp, peakTorque) {
  const points = []
  for (let rpm = 1000; rpm <= 8000; rpm += 500) {
    const t = rpm / 8000
    // Simple bell-curve approximation centered at 65% of rev range
    const hpFactor  = Math.sin(Math.PI * Math.pow(t, 0.6))
    const tqFactor  = Math.sin(Math.PI * Math.pow(t, 0.3))
    points.push({
      rpm,
      hp: Math.round(peakHp * hpFactor),
      torque: Math.round(peakTorque * tqFactor),
    })
  }
  return points
}
