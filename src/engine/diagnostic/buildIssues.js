/**
 * buildIssues — pure function.
 * Converts active tags into human-readable issue objects for the UI.
 */
export function buildIssues(activeTags) {
  return activeTags
    .filter(tag => tag.category === 'catastrophic' || tag.category === 'penalty')
    .map(tag => ({
      tag: tag.id,
      label: tag.label,
      category: tag.category,
      severity: tag.severity ?? (tag.category === 'catastrophic' ? 'critical' : 'low'),
      text: tag.description,
      sub_causes: tag.sub_causes ?? [],
      consequences: tag.consequences ?? [],
    }))
}

const GRENADE_SEVERITY_ORDER = ['grenaded', 'hydrolocked', 'overheated', 'fuel_starved', 'no_compression', 'no_spark']

const CATASTROPHIC_CONFIDENCE = {
  grenaded:       0.98,
  hydrolocked:    0.99,
  overheated:     0.96,
  fuel_starved:   0.93,
  no_compression: 0.95,
  no_spark:       0.97,
}

/**
 * predictIgnition — pure function.
 * Returns an 8-state object: { state, label, confidence, color, primary_tag? }
 *
 * States (low → high risk):
 *   dyno_ready → stable → startup_likely → rough_idle → unstable →
 *   detonation_risk → catastrophic → dead
 */
export function predictIgnition(activeTags, stats = {}) {
  const catastrophic = activeTags.filter(t => t.category === 'catastrophic')
  const penalties    = activeTags.filter(t => t.category === 'penalty')

  // ── State: dead ─────────────────────────────────────────────────────────────
  if (catastrophic.some(t => t.id === 'wont_turn_over')) {
    return { state: 'dead', label: "Won't Turn Over", confidence: 1.0, color: '#ef4444' }
  }

  // ── State: catastrophic ──────────────────────────────────────────────────────
  if (catastrophic.length > 0) {
    const primary = [...catastrophic].sort(
      (a, b) => GRENADE_SEVERITY_ORDER.indexOf(a.id) - GRENADE_SEVERITY_ORDER.indexOf(b.id)
    )[0]
    return {
      state: 'catastrophic',
      label: primary.label,
      confidence: CATASTROPHIC_CONFIDENCE[primary.id] ?? 0.95,
      color: '#ef4444',
      primary_tag: primary.id,
    }
  }

  // ── State: detonation_risk ───────────────────────────────────────────────────
  const hp         = stats.hp ?? 0
  const drivetrain = stats.drivetrain_rating ?? 1
  const proximity  = hp / (drivetrain * 1.3)
  if (proximity >= 0.80 && proximity < 1.0) {
    const confidence = 0.55 + (proximity - 0.80) * 2.0
    return {
      state: 'detonation_risk',
      label: 'High Detonation Risk',
      confidence: Math.min(0.95, confidence),
      color: '#f97316',
    }
  }

  // ── State: unstable ──────────────────────────────────────────────────────────
  const hasBlown      = penalties.some(t => t.id === 'blown')
  const hasOverheat   = penalties.some(t => t.id === 'overheating')
  const hasNosStress  = penalties.some(t => t.id === 'nos_stress')

  if (hasBlown && penalties.length >= 3) {
    return { state: 'unstable', label: 'Unstable Combustion', confidence: 0.65, color: '#eab308' }
  }

  // ── State: rough_idle ────────────────────────────────────────────────────────
  if (hasOverheat || (hasBlown && hasNosStress)) {
    return { state: 'rough_idle', label: 'Rough Idle Expected', confidence: 0.72, color: '#f59e0b' }
  }

  // ── State: startup_likely ────────────────────────────────────────────────────
  if (penalties.length > 0) {
    return { state: 'startup_likely', label: 'Startup Likely', confidence: 0.78, color: '#84cc16' }
  }

  // ── State: dyno_ready ────────────────────────────────────────────────────────
  const reliability = stats.reliability ?? 50
  if (reliability >= 85) {
    return { state: 'dyno_ready', label: 'Dyno Ready', confidence: 0.95, color: '#10b981' }
  }

  // ── State: stable ────────────────────────────────────────────────────────────
  return { state: 'stable', label: 'Stable Ignition', confidence: 0.88, color: '#22c55e' }
}
