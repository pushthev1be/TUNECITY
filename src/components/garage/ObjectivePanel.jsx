import { useGameStore } from '../../stores/useGameStore.js'
import { IgnitionButton } from '../ignition/IgnitionButton.jsx'
import { Section } from '../shared/Section.jsx'
import { Gauge } from '../gauges/Gauge.jsx'
import { DynoMonitor } from '../gauges/DynoMonitor.jsx'
import { meetsConstraint } from '../../engine/economy/missionRewards.js'
import { Money } from '../shared/Money.jsx'
import { statLabel, statUnit } from '../../data/statLabels.js'
import objectivesData from '../../data/objectives.json'

const DIFF_STARS = ['', '★', '★★', '★★★', '★★★★', '★★★★★']

function meetsTarget(stat, op, target, stats) {
  const val = stats?.[stat]
  if (val == null) return false
  if (op === 'gte') return val >= target
  if (op === 'lte') return val <= target
  return false
}

function constraintLabel(c) {
  if (c.type === 'no_catastrophic_tag') return 'No engine failure'
  if (c.type === 'budget') return `Budget ≤ $${c.max.toLocaleString()}`
  if (c.type === 'required_tag') return `Tag: ${c.tag.replace(/_/g, ' ')}`
  return c.type
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

// Right panel: what you are building toward, how the build performs, and the
// ignition button. The mission is the headline; performance reads off a
// cluster of real dash instruments.
// compact: phone layout — money already shows in the header, keep the pinned ignite bar short
export function ObjectivePanel({ compact = false }) {
  const computed   = useGameStore(s => s.computed)
  const currency   = useGameStore(s => s.currency)
  const getObj     = useGameStore(s => s.getActiveObjective)
  const objective  = getObj()
  const stats      = computed?.stats ?? {}
  const prediction = computed?.prediction

  const targets = objective?.targets ?? []
  const constraints = objective?.constraints ?? []
  const done = targets.filter(t => meetsTarget(t.stat, t.op, t.value, stats)).length
    + constraints.filter(c => meetsConstraint(c, computed?.stats, computed?.activeTags ?? [])).length
  const total = targets.length + constraints.length
  // Tach scale grows with the build; the redline starts at what the chassis can take
  const chassis = stats.effective_chassis_rating
  const hpMax = Math.max(600, Math.ceil(((stats.hp ?? 0) * 1.25) / 200) * 200, chassis ? Math.ceil((chassis * 1.2) / 200) * 200 : 0)
  const big = compact ? 108 : 124, small = compact ? 84 : 96

  return (
    <div className="h-full overflow-y-auto flex flex-col gap-3 p-3">

      {/* Mission: the headline */}
      {objective ? (
        <section className="rounded-lg p-3 border-2 border-[var(--accent-yellow)]/70 bg-[var(--accent-yellow)]/[0.07] shadow-[0_0_18px_rgba(255,200,0,0.08)]">
          <div className="flex items-center justify-between">
            <p className="text-[10px] tracking-[0.18em] uppercase text-[var(--accent-yellow)] font-bold">
              Mission {objectivesData.findIndex(o => o.id === objective.id) + 1} / {objectivesData.length}
            </p>
            <span className="text-[var(--accent-yellow)] text-xs">{DIFF_STARS[objective.difficulty]}</span>
          </div>
          <p className="text-[var(--text-primary)] font-bold text-sm leading-tight mt-1">{objective.name}</p>
          {!compact && <p className="text-[var(--text-muted)] text-xs mt-1 leading-snug">{objective.description}</p>}
          {total > 0 && (
            <>
              <div className="flex items-center gap-2 mt-2.5">
                <div className="flex-1 h-1.5 rounded-full bg-black/50 overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--tag-positive)] transition-all duration-500" style={{ width: `${(done / total) * 100}%` }} />
                </div>
                <span className="text-[10px] font-bold text-[var(--text-muted)] tabular-nums">{done}/{total} done</span>
              </div>
              <ul className="mt-2 space-y-1">
                {targets.map((t, i) => {
                  const met = meetsTarget(t.stat, t.op, t.value, stats)
                  const cur = stats[t.stat]
                  return (
                    <li key={`t${i}`} className="flex items-center justify-between gap-2 text-xs">
                      <span className={met ? 'text-[var(--tag-positive)]' : 'text-[var(--text-primary)]'}>
                        {met ? '✓' : '○'} {statLabel(t.stat)} {t.op === 'gte' ? '≥' : '≤'} {t.value}{statUnit(t.stat)}
                      </span>
                      <span className={`font-mono shrink-0 ${met ? 'text-[var(--tag-positive)]' : 'text-[var(--accent-red)]'}`}>
                        {cur != null ? cur.toFixed(cur % 1 ? 1 : 0) : '—'}
                      </span>
                    </li>
                  )
                })}
                {constraints.map((c, i) => {
                  const met = meetsConstraint(c, computed?.stats, computed?.activeTags ?? [])
                  return (
                    <li key={`c${i}`} className={`text-xs ${met ? 'text-[var(--tag-positive)]' : 'text-[var(--accent-red)]'}`}>
                      {met ? '✓' : '✗'} {constraintLabel(c)}
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </section>
      ) : (
        <section className="rounded-lg p-3 border border-dashed border-[var(--panel-border)]">
          <p className="text-[10px] tracking-[0.18em] uppercase text-[var(--text-muted)]">Mission</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">No mission for this car. Free build: tune it however you like.</p>
        </section>
      )}

      {/* Performance: the instrument cluster */}
      <Section title="Performance" accent="#ff8a1f">
        <div className="flex justify-around -mt-1">
          <Gauge label="POWER" faceText="x100 HP" value={stats.hp ?? null} min={0} max={hpMax} majors={hpMax / 200}
            scaleLabel={v => Math.round(v / 100)} red={chassis && chassis < hpMax ? [chassis, hpMax] : null}
            unit="hp" size={big} accent="#ff8a1f" />
          <Gauge label="SPEED" faceText="MPH" value={stats.top_speed ?? null} min={0} max={300} majors={6}
            readout={stats.top_speed != null ? `${Math.round(stats.top_speed)} mph` : '—'} size={big} accent="#5ac8fa" />
        </div>
        <div className="flex justify-around -mt-1">
          <Gauge label="TORQUE" faceText="LB-FT" value={stats.torque ?? null} min={0} max={900} majors={3}
            readout={stats.torque != null ? `${Math.round(stats.torque)}` : '—'} size={small} accent="#ffd60a" />
          <Gauge label="GRIP" faceText="G" value={stats.grip ?? null} min={0} max={1.5} majors={3}
            scaleLabel={v => v.toFixed(1)} readout={stats.grip != null ? stats.grip.toFixed(2) : '—'} size={small} accent="#bf5af2" />
        </div>
        <div className="grid grid-cols-3 gap-1.5 mt-1">
          {[['0–60', stats.zero_to_sixty, 's', 2], ['¼ mile', stats.quarter_mile, 's', 2], ['Weight', stats.weight, ' lb', 0]].map(([l, v, u, d]) => (
            <div key={l} className="rounded bg-[#050607] border border-[#2c2e34] px-1.5 py-1 text-center">
              <p className="text-[9px] uppercase tracking-widest text-[var(--text-muted)]">{l}</p>
              <p className="text-xs font-bold font-mono text-[#7CFFB2]">{v != null ? `${Number(v).toFixed(d)}${u}` : '—'}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Advice" accent="var(--tag-character)">
        <TuneNotes stats={stats} prediction={prediction} />
      </Section>

      {/* The dyno computer: start-up log, results and failures print here, never over the car */}
      <DynoMonitor />

      {/* Budget and the button, pinned to the bottom */}
      <section className={`mt-auto sticky -bottom-3 -mx-3 -mb-3 px-3 border-t border-[var(--panel-border)] bg-[var(--panel-bg)] ${compact ? 'py-2' : 'pb-3 pt-2.5'}`}>
        {!compact && (
          <div className="flex justify-between items-center text-xs mb-2.5">
            <span className="text-[var(--text-muted)]">Parts spend <span className="text-[var(--text-primary)] font-mono">${(stats.total_parts_cost ?? 0).toLocaleString()}</span></span>
            <Money amount={currency} iconSize={14} className="text-[var(--tag-positive)] font-normal" />
          </div>
        )}
        <IgnitionButton compact={compact} />
      </section>

    </div>
  )
}
