import { useGameStore } from '../../stores/useGameStore.js'
import { TagBadges } from './TagBadges.jsx'
import { StatBars } from './StatBars.jsx'
import { IssuesList } from './IssuesList.jsx'
import { PartsList } from './PartsList.jsx'
import { ContributionBreakdown } from './ContributionBreakdown.jsx'
import { Section, CountBadge } from '../shared/Section.jsx'
import { Gauge } from '../gauges/Gauge.jsx'
import { WarningLights } from '../gauges/WarningLights.jsx'

const SMOKE_LABEL = {
  white: { text: 'White smoke', sub: 'coolant burning — overheating', color: 'text-gray-200' },
  blue:  { text: 'Blue smoke',  sub: 'oil burning — heat stress',      color: 'text-blue-400' },
  black: { text: 'Black smoke', sub: 'rich mix / drivetrain stress',   color: 'text-gray-400' },
  grey:  { text: 'Grey smoke',  sub: 'incomplete combustion',          color: 'text-gray-500' },
}

// Left panel: the car's health. Most urgent first: will it start, the dash,
// what to fix, then the parts to fix it with. The rest folds away under Details.
export function DiagnosticPanel({ onSlotClick }) {
  const computed  = useGameStore(s => s.computed)
  const prediction = computed?.prediction
  const smokeColor = computed?.smokeColor
  const stats      = computed?.stats ?? {}
  const issues     = computed?.issues ?? []
  const tags       = computed?.activeTags ?? []
  const heatRatio  = (stats.heat_output ?? 0) / Math.max(1, stats.cooling_capacity ?? 1)
  const critical   = issues.filter(i => i.severity === 'critical' || i.severity === 'severe').length

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto pr-0.5">

      {/* Will it start? */}
      {prediction && (
        <section className="rounded-lg p-3 border" style={{ borderColor: prediction.color + '66', background: prediction.color + '14' }}>
          <p className="text-[10px] tracking-[0.18em] uppercase text-[var(--text-muted)]">Will it start?</p>
          <p className="font-bold text-base leading-tight mt-0.5" style={{ color: prediction.color }}>{prediction.label}</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1.5 rounded-full bg-black/50 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.round((prediction.confidence ?? 0) * 100)}%`, background: prediction.color }} />
            </div>
            <span className="text-[10px] text-[var(--text-muted)] tabular-nums">{Math.round((prediction.confidence ?? 0) * 100)}% sure</span>
          </div>
          {smokeColor && SMOKE_LABEL[smokeColor] && (
            <p className="text-xs mt-2">
              <span className={`font-bold ${SMOKE_LABEL[smokeColor].color}`}>{SMOKE_LABEL[smokeColor].text}</span>
              <span className="text-[var(--text-muted)]"> — {SMOKE_LABEL[smokeColor].sub}</span>
            </p>
          )}
        </section>
      )}

      {/* The dash: warning lights and the two health gauges */}
      <Section title="Dash" accent="#7CFFB2">
        <WarningLights activeTags={tags} smokeColor={smokeColor} />
        <div className="flex justify-around mt-2 -mb-1">
          <Gauge label="TEMP" faceText="C        H" value={Math.min(heatRatio, 1.6)} min={0} max={1.6} majors={4}
            scaleLabel={() => ''} red={[1.0, 1.6]} readout={`${Math.round(heatRatio * 100)}%`} size={112} accent="#ff8a1f" />
          <Gauge label="RELIAB" faceText="%" value={stats.reliability ?? null} min={0} max={100} majors={5}
            red={[0, 40]} unit="%" size={112} accent="#7CFFB2" />
        </div>
      </Section>

      <Section title="Problems to fix" accent="var(--accent-red)" badge={<CountBadge n={issues.length} color={critical ? 'var(--accent-red)' : 'var(--accent-yellow)'} />}>
        {issues.length ? <IssuesList issues={issues} /> : <p className="text-xs text-[var(--text-muted)]">Nothing wrong with this build.</p>}
      </Section>

      <Section title="Installed parts" accent="var(--accent-yellow)" badge={<span className="text-[10px] text-[var(--text-muted)]">tap a slot to shop</span>}>
        <PartsList onSlotClick={onSlotClick} />
      </Section>

      <Section title="Details" accent="var(--text-muted)" collapsible defaultOpen={false}>
        <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">Build identity</p>
        <TagBadges activeTags={tags} />
        <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mt-3 mb-1">All stats</p>
        <StatBars stats={stats} />
        <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] mt-3 mb-1">Part contributions</p>
        <ContributionBreakdown />
      </Section>
    </div>
  )
}
