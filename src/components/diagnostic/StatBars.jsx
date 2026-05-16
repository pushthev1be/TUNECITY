const STATS = [
  { key: 'hp',            label: 'HP',           max: 1200, unit: 'hp',  decimals: 0 },
  { key: 'torque',        label: 'Torque',        max: 900,  unit: 'lb-ft', decimals: 0 },
  { key: 'reliability',   label: 'Reliability',   max: 100,  unit: '%',  decimals: 0 },
  { key: 'zero_to_sixty', label: '0–60',          max: 15,   unit: 's',  decimals: 2, invert: true },
  { key: 'quarter_mile',  label: '¼ Mile',        max: 20,   unit: 's',  decimals: 2, invert: true },
  { key: 'top_speed',     label: 'Top Speed',     max: 300,  unit: 'mph', decimals: 0 },
  { key: 'weight',        label: 'Weight',        max: 6000, unit: 'lbs', decimals: 0, invert: true },
  { key: 'grip',          label: 'Grip',          max: 1.5,  unit: '',   decimals: 2 },
]

import { barSpriteStyle } from '../../utils/barSprite.js'

export function StatBars({ stats }) {
  if (!stats || Object.keys(stats).length === 0) return null

  return (
    <div className="space-y-2">
      {STATS.map(({ key, label, max, unit, decimals, invert }) => {
        const raw = stats[key] ?? 0
        const pct = invert ? Math.max(0, 1 - raw / max) : Math.min(1, raw / max)
        const displayVal = typeof raw === 'number' ? raw.toFixed(decimals) : '—'

        return (
          <div key={key} className="flex items-center gap-2">
            <span className="text-[var(--text-muted)] text-xs w-20 shrink-0">{label}</span>
            <div className="flex-1 h-4 rounded overflow-hidden">
              <div className="w-full h-full" style={barSpriteStyle(pct)} />
            </div>
            <span className="text-[var(--text-primary)] text-xs w-20 text-right shrink-0">
              {displayVal}{unit}
            </span>
          </div>
        )
      })}
    </div>
  )
}
