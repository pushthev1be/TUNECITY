import { useGameStore } from '../../stores/useGameStore.js'
import { IgnitionButton } from '../ignition/IgnitionButton.jsx'
import { barSpriteStyle } from '../../utils/barSprite.js'
import { RotatingSprite } from '../shared/RotatingSprite.jsx'
import { CAR_ROTATION_KEYS, dollar_stack } from '../../assets/spriteMap.js'

const DIFF_STARS = ['', '★', '★★', '★★★', '★★★★', '★★★★★']

function statLabel(stat) {
  const MAP = {
    hp: 'HP', torque: 'Torque', reliability: 'Reliability',
    zero_to_sixty: '0–60', top_speed: 'Top Speed', quarter_mile: '¼ Mile',
    grip: 'Grip', heat_output: 'Heat',
  }
  return MAP[stat] ?? stat
}

function statUnit(stat) {
  const MAP = {
    hp: 'hp', torque: 'lb-ft', reliability: '%',
    zero_to_sixty: 's', top_speed: 'mph', quarter_mile: 's',
    grip: 'g', heat_output: '',
  }
  return MAP[stat] ?? ''
}

function meetsTarget(stat, op, target, stats) {
  const val = stats?.[stat]
  if (val == null) return false
  if (op === 'gte') return val >= target
  if (op === 'lte') return val <= target
  return false
}

function meetsConstraint(constraint, computed, currency) {
  if (constraint.type === 'no_catastrophic_tag') {
    return !(computed?.activeTags ?? []).some(t => t.category === 'catastrophic')
  }
  if (constraint.type === 'budget') {
    return (computed?.stats?.total_parts_cost ?? 0) <= constraint.max
  }
  if (constraint.type === 'required_tag') {
    return (computed?.activeTags ?? []).some(t => t.id === constraint.tag)
  }
  return true
}

function constraintLabel(c) {
  if (c.type === 'no_catastrophic_tag') return 'No engine failure'
  if (c.type === 'budget') return `Budget ≤ $${c.max.toLocaleString()}`
  if (c.type === 'required_tag') return `Tag: ${c.tag.replace(/_/g, ' ')}`
  return c.type
}

function StatBar({ label, value, max }) {
  const pct = Math.min(1, (value ?? 0) / max)
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs">
        <span className="text-[var(--text-muted)]">{label}</span>
        <span className="text-[var(--text-primary)] font-mono">{typeof value === 'number' ? value.toFixed(value % 1 ? 1 : 0) : '—'}</span>
      </div>
      <div className="h-4 rounded overflow-hidden">
        <div className="w-full h-full" style={barSpriteStyle(pct)} />
      </div>
    </div>
  )
}

function TuneNotes({ stats, prediction }) {
  const notes = []
  const heat    = stats.heat_output ?? 0
  const cooling = stats.cooling_capacity ?? 100

  if (heat > cooling * 1.1)
    notes.push({ text: 'Heat exceeds cooling — add radiator', color: 'var(--accent-red)' })
  else if (heat > cooling * 0.85)
    notes.push({ text: 'Thermal margin is tight', color: 'var(--accent-yellow)' })

  if ((stats.reliability ?? 100) < 55)
    notes.push({ text: 'Reliability critical — swap worn parts', color: 'var(--accent-red)' })
  else if ((stats.reliability ?? 100) < 75)
    notes.push({ text: 'Reliability below target', color: 'var(--accent-yellow)' })

  if ((stats.hp ?? 0) > 600 && (stats.grip ?? 0) < 0.9)
    notes.push({ text: 'Power may exceed grip — tires recommended', color: 'var(--accent-yellow)' })

  if (notes.length === 0) {
    if (prediction?.state === 'stable' || prediction?.state === 'clean_run')
      notes.push({ text: 'Build is nominal — ready to run', color: 'var(--tag-positive)' })
    else if (prediction?.state === 'detonation_risk' || prediction?.state === 'unstable')
      notes.push({ text: 'Unstable build — check heat & reliability', color: 'var(--accent-yellow)' })
    else if (prediction?.state === 'dead' || prediction?.state === 'catastrophic')
      notes.push({ text: 'Engine will not hold idle — fix critical issues', color: 'var(--accent-red)' })
    else
      notes.push({ text: 'Install missing parts to run', color: 'var(--text-muted)' })
  }

  return (
    <div className="space-y-1.5">
      {notes.map((n, i) => (
        <p key={i} className="text-xs leading-snug" style={{ color: n.color }}>
          <span className="mr-1 opacity-60">▸</span>{n.text}
        </p>
      ))}
    </div>
  )
}

export function ObjectivePanel() {
  const computed   = useGameStore(s => s.computed)
  const currency   = useGameStore(s => s.currency)
  const getObj     = useGameStore(s => s.getActiveObjective)
  const objective  = getObj()
  const stats      = computed?.stats ?? {}
  const prediction = computed?.prediction
  const predFail = prediction?.state === 'dead' || prediction?.state === 'catastrophic'

  return (
    <div className="h-full overflow-y-auto flex flex-col gap-4 p-4">

      {/* Objective card */}
      {objective ? (
        <section>
          <div className="flex items-start justify-between mb-1">
            <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider">Active Mission</p>
            <span className="text-[var(--accent-yellow)] text-xs">{DIFF_STARS[objective.difficulty]}</span>
          </div>
          <p className="text-[var(--text-primary)] font-bold text-sm leading-tight">{objective.name}</p>
          <p className="text-[var(--text-muted)] text-xs mt-1 leading-snug">{objective.description}</p>
        </section>
      ) : (
        <p className="text-[var(--text-muted)] text-xs">No active mission</p>
      )}

      {/* Mission car preview */}
      {objective && CAR_ROTATION_KEYS[objective.car_id] && (
        <div className="flex justify-center py-1 border-b border-[var(--panel-border)]">
          <RotatingSprite
            spriteKey={CAR_ROTATION_KEYS[objective.car_id]}
            size={72}
            fps={4}
          />
        </div>
      )}

      {/* Requirements */}
      {objective?.targets?.length > 0 && (
        <section>
          <p className="text-[var(--text-muted)] text-xs uppercase mb-2">Requirements</p>
          <div className="space-y-1.5">
            {objective.targets.map((t, i) => {
              const met = meetsTarget(t.stat, t.op, t.value, stats)
              const cur = stats[t.stat]
              const op  = t.op === 'gte' ? '≥' : '≤'
              return (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className={`text-xs ${met ? 'text-[var(--tag-positive)]' : 'text-[var(--text-muted)]'}`}>
                    {statLabel(t.stat)} {op} {t.value}{statUnit(t.stat)}
                  </span>
                  <span className={`text-xs font-mono shrink-0 ${met ? 'text-[var(--tag-positive)]' : 'text-[var(--accent-red)]'}`}>
                    {cur != null ? `${cur.toFixed(cur % 1 ? 1 : 0)} ${met ? '✓' : '✗'}` : '— ✗'}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Constraints */}
      {objective?.constraints?.length > 0 && (
        <section>
          <p className="text-[var(--text-muted)] text-xs uppercase mb-2">Constraints</p>
          <div className="space-y-1">
            {objective.constraints.map((c, i) => {
              const met = meetsConstraint(c, computed, currency)
              return (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className={`text-xs ${met ? 'text-[var(--tag-positive)]' : 'text-[var(--text-muted)]'}`}>
                    {constraintLabel(c)}
                  </span>
                  <span className={`text-xs shrink-0 ${met ? 'text-[var(--tag-positive)]' : 'text-[var(--accent-red)]'}`}>
                    {met ? '✓' : '✗'}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <hr className="border-[var(--panel-border)]" />

      {/* Live stats */}
      <section className="space-y-2">
        <p className="text-[var(--text-muted)] text-xs uppercase">Build Stats</p>
        <StatBar label="Power" value={stats.hp} max={1200} />
        <StatBar
          label="Heat / Cooling"
          value={stats.heat_output}
          max={Math.max(stats.cooling_capacity ?? 100, stats.heat_output ?? 0) * 1.4}
          color={stats.heat_output > (stats.cooling_capacity ?? 100) * 1.1 ? 'var(--accent-red)' : 'var(--accent-yellow)'}
        />
        <StatBar label="Reliability" value={stats.reliability} max={100}
          color={stats.reliability > 70 ? 'var(--tag-positive)' : stats.reliability > 40 ? 'var(--accent-yellow)' : 'var(--accent-red)'}
        />
        <StatBar label="Grip" value={Math.round((stats.grip ?? 0) * 100)} max={100} color="var(--tag-character)" />
      </section>

      {/* Prediction */}
      <section>
        <p className="text-[var(--text-muted)] text-xs uppercase mb-1">Ignition Prediction</p>
        <div className={`text-xs font-bold px-2 py-1 rounded text-center ${
          predFail
            ? 'bg-[var(--accent-red)]/20 text-[var(--accent-red)]'
            : 'bg-[var(--tag-positive)]/20 text-[var(--tag-positive)]'
        }`}>
          {prediction?.label?.toUpperCase() ?? (predFail ? 'WON\'T START' : 'LOOKS GOOD TO GO')}
        </div>
      </section>

      {/* Tune Notes */}
      <section>
        <p className="text-[var(--text-muted)] text-xs uppercase mb-1.5">Tune Notes</p>
        <TuneNotes stats={stats} prediction={prediction} />
      </section>

      {/* Spend */}
      <section className="mt-auto pt-2 border-t border-[var(--panel-border)]">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-[var(--text-muted)]">Parts spend</span>
          <span className="text-[var(--text-primary)] font-mono">${(stats.total_parts_cost ?? 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center text-xs mb-4">
          <div className="flex items-center gap-1.5">
            <img src={dollar_stack} alt="" className="w-5 h-5 object-contain pixelated" />
            <span className="text-[var(--text-muted)]">Available</span>
          </div>
          <span className="text-[var(--tag-positive)] font-mono">${currency.toLocaleString()}</span>
        </div>
        <IgnitionButton />
      </section>

    </div>
  )
}
