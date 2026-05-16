import { motion } from 'framer-motion'
import { useGameStore } from '../../stores/useGameStore.js'

function deriveNickname(activeTags = []) {
  const tagId = activeTags.find(t => t.category === 'character')?.id
  const NICKNAMES = {
    widowmaker:     'The Widowmaker',
    sleeper:        'The Sleeper',
    garage_queen:   'The Garage Queen',
    rat_rod:        'The Rat Rod',
    grocery_getter: 'The Grocery Getter',
    riceburner:     'The Riceburner',
  }
  const positive = activeTags.find(t => t.category === 'positive')?.id
  const POSITIVE_NICKNAMES = {
    all_motor:    'The Naturally Aspirated',
    track_prepped: 'The Track Machine',
    balanced:     'The Balanced Build',
    oem_spec:     'The Pure Stock Build',
  }
  return NICKNAMES[tagId] ?? POSITIVE_NICKNAMES[positive] ?? 'The Build'
}

export function MissionCompleteCard() {
  const data        = useGameStore(s => s.missionCompleteData)
  const clear       = useGameStore(s => s.clearMissionComplete)
  const activeTags  = useGameStore(s => s.computed?.activeTags ?? [])

  if (!data) return null

  const { objective, result } = data
  const br = result?.benchmark_results ?? {}
  const nickname = deriveNickname(activeTags)

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', duration: 0.6 }}
        className="bg-[var(--panel-bg)] border-2 border-[var(--accent-yellow)] rounded-2xl w-full max-w-md p-8 space-y-6 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
          className="text-6xl"
        >
          🏁
        </motion.div>

        <div>
          <p className="text-[var(--text-muted)] text-xs uppercase tracking-widest">Mission Complete</p>
          <h1 className="text-[var(--accent-yellow)] text-2xl font-bold mt-1">{objective?.name}</h1>
          <p className="text-[var(--text-primary)] text-lg mt-2 italic">"{nickname}"</p>
        </div>

        {/* Benchmarks snapshot */}
        <div className="grid grid-cols-3 gap-3 py-2">
          {[
            { label: 'HP',      value: br.peak_hp,         unit: 'hp'  },
            { label: '0–60',    value: br.zero_to_sixty,   unit: 's'   },
            { label: 'Top',     value: br.top_speed,       unit: 'mph' },
          ].map(({ label, value, unit }) => (
            <div key={label}>
              <div className="text-2xl font-bold text-[var(--accent-yellow)]">
                {typeof value === 'number' ? value.toFixed(value % 1 ? 2 : 0) : '—'}
                <span className="text-xs text-[var(--text-muted)] ml-0.5">{unit}</span>
              </div>
              <div className="text-xs text-[var(--text-muted)]">{label}</div>
            </div>
          ))}
        </div>

        {/* Rewards */}
        <div className="text-left space-y-1">
          <p className="text-[var(--text-muted)] text-xs uppercase">Rewards</p>
          {objective?.rewards.currency > 0 && (
            <p className="text-[var(--tag-positive)] text-sm font-bold">
              +${objective.rewards.currency.toLocaleString()}
            </p>
          )}
          {objective?.rewards.parts?.map(pid => (
            <p key={pid} className="text-[var(--tag-character)] text-xs">+ {pid.replace(/_/g, ' ')}</p>
          ))}
          {objective?.rewards.car_added_to_garage && (
            <p className="text-[var(--tag-positive)] text-xs">Car added to garage</p>
          )}
        </div>

        <button
          onClick={clear}
          className="w-full py-3 bg-[var(--accent-yellow)] text-black font-bold rounded-lg hover:brightness-110 transition-all"
        >
          Continue
        </button>
      </motion.div>
    </div>
  )
}
