import { useGameStore } from '../../stores/useGameStore.js'
import { TagBadges } from './TagBadges.jsx'
import { StatBars } from './StatBars.jsx'
import { IssuesList } from './IssuesList.jsx'
import { PartsList } from './PartsList.jsx'
import { ContributionBreakdown } from './ContributionBreakdown.jsx'
import { RotatingSprite } from '../shared/RotatingSprite.jsx'
import { CAR_ROTATION_KEYS } from '../../assets/spriteMap.js'
import carsData from '../../data/cars.json'

const SMOKE_LABEL = {
  white: { text: 'White Smoke',  sub: 'Coolant burning — overheating',  color: 'text-gray-200' },
  blue:  { text: 'Blue Smoke',   sub: 'Oil burning — heat stress',       color: 'text-blue-400' },
  black: { text: 'Black Smoke',  sub: 'Rich mix / drivetrain stress',    color: 'text-gray-400' },
  grey:  { text: 'Grey Smoke',   sub: 'Incomplete combustion',           color: 'text-gray-500' },
}

const CONDITION_COLOR = {
  'Running':         'text-[var(--tag-positive)]',
  'Good':            'text-[var(--tag-positive)]',
  'Worn':            'text-[var(--accent-yellow)]',
  'Fair':            'text-[var(--accent-yellow)]',
  'Poor':            'text-[var(--accent-red)]',
  'Project Car':     'text-[var(--tag-character)]',
  'Rough':           'text-[var(--accent-red)]',
}

export function DiagnosticPanel({ onSlotClick }) {
  const computed   = useGameStore(s => s.computed)
  const currency   = useGameStore(s => s.currency)
  const activeCar  = useGameStore(s => s.activeCar)

  const prediction  = computed?.prediction
  const smokeColor  = computed?.smokeColor
  const car         = carsData.find(c => c.id === activeCar)

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto">

      {/* Active Vehicle card */}
      {car && (
        <div className="flex items-center gap-3 px-2 py-2 rounded bg-[var(--garage-bg)] border border-[var(--panel-border)]">
          <div className="shrink-0">
            {CAR_ROTATION_KEYS[activeCar]
              ? <RotatingSprite spriteKey={CAR_ROTATION_KEYS[activeCar]} size={52} fps={4} />
              : <div className="w-[52px] h-[52px] bg-[var(--panel-border)] rounded opacity-30" />
            }
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[var(--text-primary)] font-bold text-xs truncate leading-tight">{car.name}</p>
            <p className="text-[var(--text-muted)] text-xs mt-0.5">{car.driveline} · Tier {car.tier}</p>
            <p className={`text-xs mt-0.5 font-semibold ${CONDITION_COLOR[car.starting_condition] ?? 'text-[var(--text-muted)]'}`}>
              {car.starting_condition}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[var(--accent-yellow)] font-bold tracking-widest uppercase text-sm">
          Diagnostic
        </h2>
        <span className="text-[var(--tag-positive)] font-bold text-sm">
          ${currency.toLocaleString()}
        </span>
      </div>

      {/* Ignition prediction */}
      {prediction && (
        <div
          className="flex items-center justify-between px-2 py-1.5 rounded text-xs font-bold"
          style={{
            backgroundColor: prediction.color + '18',
            borderLeft: `3px solid ${prediction.color}`,
            color: prediction.color,
          }}
        >
          <span className="uppercase tracking-wide">{prediction.label}</span>
          <span className="font-normal text-[var(--text-muted)]">
            {Math.round((prediction.confidence ?? 0) * 100)}% confidence
          </span>
        </div>
      )}

      {/* Smoke color indicator */}
      {smokeColor && SMOKE_LABEL[smokeColor] && (
        <div className="flex items-center gap-2 px-2 py-1 rounded bg-[var(--panel-bg)] border border-[var(--panel-border)] text-xs">
          <span className="text-base">🌫</span>
          <span>
            <span className={`font-bold ${SMOKE_LABEL[smokeColor].color}`}>
              {SMOKE_LABEL[smokeColor].text}
            </span>
            <span className="text-[var(--text-muted)] ml-1">— {SMOKE_LABEL[smokeColor].sub}</span>
          </span>
        </div>
      )}

      {/* Tags */}
      <section>
        <p className="text-[var(--text-muted)] text-xs uppercase mb-1">Build Identity</p>
        <TagBadges activeTags={computed?.activeTags ?? []} />
      </section>

      {/* Issues */}
      <section>
        <p className="text-[var(--text-muted)] text-xs uppercase mb-1">Issues</p>
        <IssuesList issues={computed?.issues ?? []} />
      </section>

      {/* Stats */}
      <section>
        <p className="text-[var(--text-muted)] text-xs uppercase mb-1">Stats</p>
        <StatBars stats={computed?.stats ?? {}} />
      </section>

      {/* Contribution Breakdown */}
      <section>
        <p className="text-[var(--text-muted)] text-xs uppercase mb-1">Part Contributions</p>
        <ContributionBreakdown />
      </section>

      {/* Parts */}
      <section>
        <p className="text-[var(--text-muted)] text-xs uppercase mb-2">Installed Parts</p>
        <PartsList onSlotClick={onSlotClick} />
      </section>
    </div>
  )
}
