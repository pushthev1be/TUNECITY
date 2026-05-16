/**
 * computeStats — pure function, no side effects.
 * Takes a build + car definition, returns a stats object.
 * Tag penalties are NOT applied here; evaluateTags calls this first then overlays them.
 */
export function computeStats(build, car) {
  const p = build.installed_parts ?? {}

  const engine        = p.engine          ?? null
  const intake        = p.intake          ?? null
  const forcedInduct  = p.forced_induction ?? null
  const exhaust       = p.exhaust         ?? null
  const transmission  = p.transmission    ?? null
  const differential  = p.differential    ?? null
  const tires         = p.tires           ?? null
  const wheels        = p.wheels          ?? null
  const suspension    = p.suspension      ?? null
  const ecu           = p.ecu             ?? null
  const cooling       = p.cooling         ?? null
  const battery         = p.battery           ?? null
  const ignitionCoil    = p.ignition_coil     ?? null
  const sparkPlugs      = p.spark_plugs       ?? null
  const headGasket      = p.head_gasket       ?? null
  const fuelPump        = p.fuel_pump         ?? null
  const weightReduction   = p.weight_reduction   ?? null
  const nitrous           = p.nitrous             ?? null
  const engineInternals   = p.engine_internals    ?? null
  const brakes            = p.brakes              ?? null

  // ── Horsepower ───────────────────────────────────────────────────────────
  const baseHp =
    (engine?.stats.hp_bonus ?? 0) +
    (forcedInduct?.stats.hp_bonus ?? 0) +
    (nitrous?.stats.hp_bonus ?? 0) +
    (cooling?.stats.hp_bonus ?? 0)

  const hp = baseHp
    * (intake?.stats.hp_multiplier ?? 1.0)
    * (exhaust?.stats.hp_multiplier ?? 1.0)
    * (ecu?.stats.hp_multiplier ?? 1.0)
    * (engineInternals?.stats.hp_multiplier ?? 1.0)

  // ── Torque ────────────────────────────────────────────────────────────────
  const torque =
    (engine?.stats.torque_bonus ?? 0) +
    (forcedInduct?.stats.torque_bonus ?? 0) +
    (nitrous?.stats.torque_bonus ?? 0)

  // ── Weight ────────────────────────────────────────────────────────────────
  const partsWeight = Object.values(p)
    .filter(Boolean)
    .reduce((sum, part) => sum + (part.stats?.weight ?? 0), 0)

  const weight = car.stock_stats.weight + partsWeight

  // ── Heat output ───────────────────────────────────────────────────────────
  const lagActive = forcedInduct && (forcedInduct.stats.lag ?? 0) > 0.4
  const heat_output =
    (engine?.stats.heat_output ?? 0) +
    (forcedInduct?.stats.heat_output ?? 0) +
    (nitrous?.stats.heat_output ?? 0) +
    (lagActive ? 20 : 0)

  // ── Cooling capacity ──────────────────────────────────────────────────────
  const cooling_capacity =
    car.stock_stats.cooling_capacity +
    (cooling?.stats.cooling_bonus ?? 0) +
    (intake?.stats.cooling_bonus ?? 0)

  // ── Grip ──────────────────────────────────────────────────────────────────
  const grip =
    car.stock_stats.grip
    * (tires?.stats.grip_multiplier ?? 1.0)
    + (suspension?.stats.grip_bonus ?? 0)
    + (differential?.stats.grip_bonus ?? 0)

  // ── Drag ──────────────────────────────────────────────────────────────────
  const drag_coefficient = car.stock_stats.drag_coefficient

  // ── Drivetrain effective rating ───────────────────────────────────────────
  const drivetrain_rating =
    car.limits.drivetrain_rating +
    (transmission?.stats.drivetrain_rating_bonus ?? 0)

  // ── 0–60 ──────────────────────────────────────────────────────────────────
  const power_to_weight = hp / weight
  const launch_traction = grip * (car.driveline === 'AWD' ? 1.15 : 1.0)
  const zero_to_sixty = Math.min(15.0, Math.max(1.2,
    8.5 / (power_to_weight * 100 * launch_traction)
  ))

  // ── Top speed ─────────────────────────────────────────────────────────────
  const top_speed = Math.min(300, Math.max(50,
    Math.sqrt(hp / (drag_coefficient * car.stock_stats.frontal_area)) * 11
  ))

  // ── Quarter mile ──────────────────────────────────────────────────────────
  const quarter_mile = Math.min(20, Math.max(8,
    4.2 * Math.pow(weight / hp, 0.34)
  ))

  // ── Reliability (pre-tag) ─────────────────────────────────────────────────
  const effective_chassis_rating =
    car.limits.chassis_rating +
    (weightReduction?.stats.chassis_rating_bonus ?? 0) +
    (engineInternals?.stats.chassis_rating_bonus ?? 0)
  const overheat_penalty  = Math.max(0, (heat_output - cooling_capacity) * 0.5)
  const chassis_penalty   = Math.max(0, (hp - effective_chassis_rating) / effective_chassis_rating * 30)
  const brakes_bonus      = brakes?.stats.reliability_bonus ?? 0
  const reliability = Math.min(100, Math.max(0,
    100 - overheat_penalty - chassis_penalty + brakes_bonus
  ))

  // ── Total parts cost ──────────────────────────────────────────────────────
  const total_parts_cost = Object.values(p)
    .filter(Boolean)
    .reduce((sum, part) => sum + (part.cost ?? 0), 0)

  return {
    hp,
    torque,
    weight,
    heat_output,
    cooling_capacity,
    grip,
    drag_coefficient,
    drivetrain_rating,
    zero_to_sixty,
    top_speed,
    quarter_mile,
    reliability,
    total_parts_cost,
    effective_chassis_rating,
    // pass-through context for tag evaluation
    _parts: {
      engine, intake, forcedInduct, exhaust, transmission, differential,
      tires, wheels, suspension, ecu, cooling,
      battery, ignitionCoil, sparkPlugs, headGasket, fuelPump,
      weightReduction, nitrous, engineInternals, brakes
    }
  }
}
