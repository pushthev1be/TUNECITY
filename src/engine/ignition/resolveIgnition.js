import { applyFailureDamage } from './applyFailureDamage.js'
import { simulateBenchmarks } from '../benchmarks/simulateDrag.js'
import { checkObjective } from '../economy/missionRewards.js'

const SEVERITY_ORDER = ['grenaded', 'hydrolocked', 'overheated', 'fuel_starved', 'no_compression', 'no_spark', 'wont_turn_over']

// Maps penalty tag IDs to the slots they wear most
const PENALTY_WEAR_MAP = {
  blown:       { transmission: 18, differential: 12 },
  nos_stress:  { transmission: 15, differential: 10, engine: 5 },
  overheating: { engine: 12, cooling: 8 },
  turbo_lag:   { forced_induction: 10 },
  bogs_down:   { transmission: 6, engine: 4 },
  rubs:        { tires: 14, wheels: 6 },
  scrapes:     { suspension: 10 },
  topped_out:  { differential: 5 },
}

function computeWearReport(penalties, stats) {
  const wear = {}

  for (const tag of penalties) {
    const slotWear = PENALTY_WEAR_MAP[tag.id]
    if (!slotWear) continue
    for (const [slot, amount] of Object.entries(slotWear)) {
      wear[slot] = (wear[slot] ?? 0) + amount
    }
  }

  // Heat-based engine wear even without penalty tags
  const heatRatio = (stats.heat_output ?? 0) / Math.max(1, stats.cooling_capacity ?? 1)
  if (heatRatio > 0.7) {
    wear.engine = (wear.engine ?? 0) + Math.round((heatRatio - 0.7) * 30)
  }

  // Only return slots with meaningful wear (>= 5%)
  return Object.fromEntries(
    Object.entries(wear).filter(([, v]) => v >= 5).map(([k, v]) => [k, Math.min(100, v)])
  )
}

export function resolveIgnition(build, car, activeObjective) {
  const activeTags  = build.computed?.activeTags ?? []
  const catastrophic = activeTags.filter(t => t.category === 'catastrophic')

  if (catastrophic.length > 0) {
    const primary = [...catastrophic].sort(
      (a, b) => SEVERITY_ORDER.indexOf(a.id) - SEVERITY_ORDER.indexOf(b.id)
    )[0]

    const destroyed_slots = applyFailureDamage(primary.id, car, build)

    return {
      outcome: 'catastrophic_failure',
      tag: primary.id,
      tag_label: primary.label,
      animation: primary.ignition_animation ?? 'explosion',
      destroyed_slots,
    }
  }

  const penalties = activeTags.filter(t => t.category === 'penalty')
  const stats = build.computed?.stats ?? {}
  const benchmark_results = simulateBenchmarks(stats, car, penalties)

  const objective_met = activeObjective
    ? checkObjective(benchmark_results, stats, activeObjective)
    : false

  const wear_report = computeWearReport(penalties, stats)

  return {
    outcome: 'success',
    benchmark_results,
    penalty_tags: penalties,
    objective_met,
    wear_report,
  }
}
